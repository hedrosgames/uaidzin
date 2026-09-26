import { CatmullRomCurve3, DataTexture, DoubleSide, EquirectangularReflectionMapping, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, RGBAFormat, RingGeometry, SRGBColorSpace, TubeGeometry, Vector3 } from "three";
import { CITY_SURFACE_GLSL } from "../../world/CitySurface";

const LOWER_BASIN = { inner: 0.116, outer: 0.331, height: 0.247 };
const UPPER_BASIN = { inner: 0.046, outer: 0.144, height: 0.697 };

function makeWaterReflection(): DataTexture {
  const width = 128;
  const height = 64;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const elevation = y / (height - 1);
    for (let x = 0; x < width; x++) {
      const sky = Math.max(0, (elevation - 0.42) / 0.58);
      const horizon = Math.exp(-Math.pow((elevation - 0.48) / 0.09, 2));
      const opening = Math.pow(Math.max(0, Math.cos(x / width * Math.PI * 2 - 0.7)), 12);
      const pixel = (y * width + x) * 4;
      pixels[pixel] = 46 + sky * 100 + horizon * 38 + opening * sky * 55;
      pixels[pixel + 1] = 47 + sky * 116 + horizon * 43 + opening * sky * 48;
      pixels[pixel + 2] = 44 + sky * 146 + horizon * 49 + opening * sky * 35;
      pixels[pixel + 3] = 255;
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function removeOldWaterSurface(mesh: Mesh): void {
  const geometry = mesh.geometry.clone();
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const index = geometry.getIndex();
  if (!position || !normal || !index) return;
  const retained: number[] = [];
  let removed = 0;
  for (let face = 0; face < index.count; face += 3) {
    const a = index.getX(face);
    const b = index.getX(face + 1);
    const c = index.getX(face + 2);
    const y = (position.getY(a) + position.getY(b) + position.getY(c)) / 3;
    const x = (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
    const z = (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3;
    const radius = Math.hypot(x, z);
    const upward = (normal.getY(a) + normal.getY(b) + normal.getY(c)) / 3 > 0.65;
    const lower = y > 0.225 && y < 0.25 && radius > LOWER_BASIN.inner && radius < LOWER_BASIN.outer;
    const upper = y > 0.678 && y < 0.701 && radius > UPPER_BASIN.inner && radius < UPPER_BASIN.outer;
    const oldFall = y > 0.27 && y < 0.445 && radius > 0.18;
    if ((upward && (lower || upper)) || oldFall) removed++;
    else retained.push(a, b, c);
  }
  geometry.setIndex(retained);
  geometry.computeBoundingSphere();
  mesh.geometry = geometry;
  mesh.userData.removedWaterTriangles = removed;
}

export class FountainWater {
  private readonly time = { value: 0 };
  private readonly reflection = makeWaterReflection();
  private root: Group | null = null;

  attach(root: Object3D): void {
    if (this.root) return;
    root.traverse((object) => {
      if (object instanceof Mesh) removeOldWaterSurface(object);
    });
    const water = new Group();
    water.name = "fountain-water";
    water.userData.occlusionIgnore = true;
    const material = this.makeWaterMaterial();
    for (const [index, basin] of [LOWER_BASIN, UPPER_BASIN].entries()) {
      const bottom = new Mesh(new RingGeometry(basin.inner, basin.outer, 72), new MeshStandardMaterial({ color: 0x59645b, roughness: 0.98, side: DoubleSide }));
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.y = basin.height - 0.012;
      bottom.name = `fountain-basin-bed-${index}`;
      water.add(bottom);
      const surface = new Mesh(new RingGeometry(basin.inner, basin.outer, 96, 8), material);
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = basin.height;
      surface.name = `fountain-water-surface-${index}`;
      surface.renderOrder = 2;
      water.add(surface);
    }
    const streamMaterial = this.makeStreamMaterial();
    for (let stream = 0; stream < 7; stream++) {
      const angle = stream / 7 * Math.PI * 2 + 0.17;
      const point = (radius: number, height: number) => new Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      const path = new CatmullRomCurve3([
        point(0.145, 0.692), point(0.181, 0.656),
        point(0.237, 0.495), point(0.28, LOWER_BASIN.height),
      ]);
      const falling = new Mesh(new TubeGeometry(path, 24, 0.0023 + stream % 3 * 0.0005, 5, false), streamMaterial);
      falling.name = `fountain-water-fall-${stream}`;
      falling.renderOrder = 3;
      water.add(falling);
    }
    root.add(water);
    this.root = water;
  }

  update(dt: number): void {
    this.time.value += dt;
  }

  dispose(): void {
    this.root = null;
    this.time.value = 0;
    this.reflection.dispose();
  }

  private makeWaterMaterial(): MeshPhysicalMaterial {
    const material = new MeshPhysicalMaterial({
      color: 0x637c78, roughness: 0.12, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.13, transparent: true,
      opacity: 0.74, depthWrite: false, side: DoubleSide,
      envMap: this.reflection, envMapIntensity: 1.25,
    });
    material.name = "fountain-independent-water";
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFountainTime = this.time;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vWaterSurface;");
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWaterSurface = position.xy;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
uniform float uFountainTime;
varying vec2 vWaterSurface;
${CITY_SURFACE_GLSL}`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
vec2 waterPosition = vWaterSurface;
float ripple = sin(length(waterPosition) * 170.0 - uFountainTime * 4.2) * 0.0012;
float crossWave = sin(dot(waterPosition, vec2(95.0, 61.0)) + uFountainTime * 2.2) * 0.0011;
float flow = cityFbm(waterPosition * 85.0 + vec2(uFountainTime * 0.32, -uFountainTime * 0.21)) * 0.003;
float impactRipples = 0.0;
for (int impact = 0; impact < 7; impact++) {
  float angle = float(impact) / 7.0 * 6.283185 + 0.17;
  float distanceToImpact = length(waterPosition - vec2(cos(angle), -sin(angle)) * 0.28);
  impactRipples += sin(distanceToImpact * 370.0 - uFountainTime * 8.0) * exp(-distanceToImpact * 48.0) * 0.0018;
}
normal = cityRelief(normal, -vViewPosition, ripple + crossWave + flow + impactRipples);`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <clearcoat_normal_fragment_maps>", "#include <clearcoat_normal_fragment_maps>\nclearcoatNormal = normal;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
float fresnel = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
totalEmissiveRadiance += vec3(0.025, 0.06, 0.08) * fresnel;
float waveCrest = smoothstep(0.92, 1.0, sin(length(vWaterSurface) * 170.0 - uFountainTime * 4.2));
totalEmissiveRadiance += vec3(0.015, 0.023, 0.024) * waveCrest;`);
    };
    material.customProgramCacheKey = () => "city-fountain-water-separated-1";
    return material;
  }

  private makeStreamMaterial(): MeshPhysicalMaterial {
    const material = new MeshPhysicalMaterial({
      color: 0x91bbb6, roughness: 0.2, transparent: true,
      opacity: 0.58, depthWrite: false, metalness: 0, side: DoubleSide,
    });
    material.name = "fountain-falling-water";
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFountainTime = this.time;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWaterFall;");
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWaterFall = position;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uFountainTime;\nvarying vec3 vWaterFall;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
float flow = sin(vWaterFall.y * 220.0 + uFountainTime * 13.0);
diffuseColor.a *= 0.68 + flow * 0.22;
diffuseColor.rgb *= 0.9 + flow * 0.1;`);
    };
    material.customProgramCacheKey = () => "city-fountain-stream-1";
    return material;
  }
}

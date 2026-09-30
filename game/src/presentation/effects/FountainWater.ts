import { CatmullRomCurve3, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, RingGeometry, TubeGeometry, Vector3 } from "three";
import { CITY_SURFACE_GLSL } from "../../world/CitySurface";

const LOWER_BASIN = { inner: 0.116, outer: 0.331, height: 0.247 };
const UPPER_BASIN = { inner: 0.046, outer: 0.144, height: 0.697 };

function removeOldWaterSurface(mesh: Mesh): void {
  const geometry = mesh.geometry.clone();
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const index = geometry.getIndex();
  if (!position || !normal || !index) return;
  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial;
  const sourceImage = material.map?.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement("canvas");
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(sourceImage, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const uv = geometry.getAttribute("uv");
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
    const u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3;
    const v = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
    const pixel = (Math.min(canvas.height - 1, Math.max(0, Math.floor(v * canvas.height))) * canvas.width
      + Math.min(canvas.width - 1, Math.max(0, Math.floor(u * canvas.width)))) * 4;
    const waterPaint = pixels[pixel + 1]! > pixels[pixel]! * 1.04 && pixels[pixel + 2]! > pixels[pixel]! * 1.11;
    const oldFall = y > 0.26 && y < 0.684 && radius > 0.14 && radius < 0.32 && waterPaint;
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
      const bottom = new Mesh(new RingGeometry(basin.inner, basin.outer, 48), this.makeBasinMaterial());
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.y = basin.height - 0.012;
      bottom.name = `fountain-basin-bed-${index}`;
      water.add(bottom);
      const surface = new Mesh(new RingGeometry(basin.inner, basin.outer, 64, 3), material);
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
      const falling = new Mesh(new TubeGeometry(path, 16, 0.004 + stream % 3 * 0.0006, 4, false), streamMaterial);
      falling.name = `fountain-water-fall-${stream}`;
      falling.renderOrder = 3;
      water.add(falling);
      const splash = new Mesh(new RingGeometry(0.022, 0.028, 32), this.makeImpactMaterial(stream / 7));
      splash.name = `fountain-impact-${stream}`;
      splash.rotation.x = -Math.PI / 2;
      splash.position.copy(point(0.28, LOWER_BASIN.height + 0.001));
      splash.renderOrder = 4;
      water.add(splash);
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

  }

  private makeBasinMaterial(): MeshStandardMaterial {
    const material = new MeshStandardMaterial({ color: 0x728f99, roughness: 1, side: DoubleSide });
    material.name = "fountain-painted-basin";
    return material;
  }
  private makeImpactMaterial(offset: number): MeshBasicMaterial {
    const material = new MeshBasicMaterial({ color: 0xd4f3ed, transparent: true, opacity: 0.65, depthWrite: false, side: DoubleSide });
    material.name = "fountain-impact-ripple";
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFountainTime = this.time;
      shader.uniforms.uRippleOffset = { value: offset };
      const uniforms = "uniform float uFountainTime;\nuniform float uRippleOffset;";
      shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\n${uniforms}`);
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
transformed.xy *= 0.2 + fract(uFountainTime * 1.1 + uRippleOffset) * 1.4;`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${uniforms}`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.a *= pow(1.0 - fract(uFountainTime * 1.1 + uRippleOffset), 1.5);`);
    };
    material.customProgramCacheKey = () => "city-fountain-impact-1";
    return material;
  }

  private makeWaterMaterial(): MeshStandardMaterial {
    const material = new MeshStandardMaterial({
      color: 0x62a4b2, roughness: 0.38, metalness: 0,
      transparent: true, opacity: 0.78, depthWrite: false, side: DoubleSide,
      emissive: 0x244d64, emissiveIntensity: 0.18,
    });
    material.name = "fountain-painted-water";
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFountainTime = this.time;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vWaterSurface;");
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWaterSurface = position.xy;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
uniform float uFountainTime;
varying vec2 vWaterSurface;
${CITY_SURFACE_GLSL}`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
float ripple = sin(length(vWaterSurface) * 95.0 - uFountainTime * 2.8);
float drift = sin(dot(vWaterSurface, vec2(48.0, 29.0)) + uFountainTime * 1.7);
normal = cityRelief(normal, -vViewPosition, ripple * 0.0007 + drift * 0.001);`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
float crest = smoothstep(0.83, 0.97, ripple) * smoothstep(-0.15, 0.5, drift);
totalEmissiveRadiance += vec3(0.30, 0.46, 0.43) * crest;`);
    };
    material.customProgramCacheKey = () => "city-fountain-painted-water-1";
    return material;
  }
  private makeStreamMaterial(): MeshBasicMaterial {
    const material = new MeshBasicMaterial({
      color: 0xb8ece6, transparent: true,
      opacity: 0.78, depthWrite: false, side: DoubleSide,
    });
    material.name = "fountain-falling-water";
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFountainTime = this.time;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWaterFall;");
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWaterFall = position;");
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uFountainTime;");
      shader.vertexShader = shader.vertexShader.replace("vWaterFall = position;", "vWaterFall = position;\ntransformed += normal * sin(position.y * 140.0 + uFountainTime * 11.0) * 0.0005;");
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

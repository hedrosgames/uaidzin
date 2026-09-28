import {
  CylinderGeometry,
  Group,
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
  PointLight,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
} from "three";
import { createFireBurstFlameTexture } from "./fireBurst/FireBurstFlameTexture";
import { makeCitySolidMaterial } from "../../world/CityMaterialTextures";
import { CITY_SURFACE_GLSL } from "../../world/CitySurface";

export interface BrazierHandle {
  group: Group;
  update(dt: number): void;
  dispose(): void;
}

export const BRAZIER_RADIUS = 0.4;

const LIGHT_COLOR = 0xff8a3c;
const LIGHT_INTENSITY = 16;
const LIGHT_DISTANCE = 12;
const MAX_BRAZIER_LIGHTS = 4;
let activeBrazierLights = 0;
let flameAtlas: ReturnType<typeof createFireBurstFlameTexture> | null = null;

const ironGeo = {
  post: new CylinderGeometry(0.09, 0.13, 1.25, 8),
  base: new CylinderGeometry(0.34, 0.4, 0.12, 10),
  bowl: new CylinderGeometry(0.42, 0.24, 0.32, 10, 1, true),
  coals: new IcosahedronGeometry(0.085, 0),
};

export function createBrazier(
  id: string,
  x: number,
  z: number,
  withLight?: boolean,
): BrazierHandle {
  const group = new Group();
  group.name = id;
  group.position.set(x, 0, z);

  const iron = makeCitySolidMaterial("iron", 0xaaa6a0);
  const coals = new MeshStandardMaterial({
    color: 0x080707,
    emissive: 0x110400,
    emissiveIntensity: 0.1,
    roughness: 1,
  });
  coals.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vCoalPosition;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCoalPosition = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vCoalPosition;\n${CITY_SURFACE_GLSL}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
float fissure = 1.0 - smoothstep(0.018, 0.07, abs(cityNoise(vCoalPosition.xy * 55.0 + vCoalPosition.z * 13.0) - 0.5));
totalEmissiveRadiance += vec3(0.35, 0.025, 0.002) * fissure;`);
  };
  coals.customProgramCacheKey = () => "city-charcoal-fissures-1";
  flameAtlas ??= createFireBurstFlameTexture();
  const flameTexture = flameAtlas.clone();
  flameTexture.repeat.set(0.25, 0.25);
  const flame = new SpriteMaterial({
    map: flameTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    toneMapped: false,
  });

  const base = new Mesh(ironGeo.base, iron);
  base.position.y = 0.06;
  base.castShadow = true;
  group.add(base);

  const post = new Mesh(ironGeo.post, iron);
  post.position.y = 0.72;
  post.castShadow = true;
  group.add(post);

  const bowl = new Mesh(ironGeo.bowl, iron);
  bowl.position.y = 1.45;
  bowl.castShadow = true;
  group.add(bowl);

  const coalMesh = new InstancedMesh(ironGeo.coals, coals, 23);
  const coalTransform = new Object3D();
  for (let coal = 0; coal < 23; coal++) {
    const angle = coal * 2.399963;
    const radius = Math.sqrt(coal / 23) * 0.27;
    coalTransform.position.set(Math.cos(angle) * radius, 1.46 + Math.sin(coal * 3.7) * 0.024, Math.sin(angle) * radius);
    coalTransform.rotation.set(coal * 0.6, angle, coal * 0.31);
    coalTransform.scale.set(0.85 + coal % 3 * 0.1, 0.55, 1);
    coalTransform.updateMatrix();
    coalMesh.setMatrixAt(coal, coalTransform.matrix);
  }
  coalMesh.name = `${id}-charcoal`;
  group.add(coalMesh);

  const flameMesh = new Sprite(flame);
  flameMesh.name = `${id}-flame`;
  flameMesh.position.y = 1.86;
  flameMesh.scale.set(0.8, 1.05, 1);
  flameMesh.userData.occlusionIgnore = true;
  flameMesh.raycast = () => {};
  group.add(flameMesh);

  const sideFlames = [-1, 1].map((side) => {
    const texture = flameAtlas!.clone();
    texture.repeat.set(0.25, 0.25);
    const material = flame.clone();
    material.map = texture;
    material.opacity = 0.65;
    const sprite = new Sprite(material);
    sprite.position.set(side * 0.16, 1.7, side * 0.11);
    sprite.scale.set(0.42, 0.65, 1);
    sprite.userData.occlusionIgnore = true;
    sprite.raycast = () => {};
    group.add(sprite);
    return sprite;
  });

  const sparkPositions = new Float32Array(24);
  const sparkGeometry = new BufferGeometry();
  sparkGeometry.setAttribute("position", new Float32BufferAttribute(sparkPositions, 3));
  const sparkMaterial = new PointsMaterial({ color: 0xffa342, size: 0.026, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
  const sparks = new Points(sparkGeometry, sparkMaterial);
  sparks.name = `${id}-sparks`;
  sparks.frustumCulled = false;
  sparks.userData.occlusionIgnore = true;
  group.add(sparks);

  const attachLight = withLight ?? (activeBrazierLights < MAX_BRAZIER_LIGHTS);
  let light: PointLight | null = null;
  if (attachLight) {
    activeBrazierLights++;
    light = new PointLight(LIGHT_COLOR, LIGHT_INTENSITY, LIGHT_DISTANCE, 2);
    light.position.y = 1.95;
    group.add(light);
  }

  let time = Math.random() * 100;

  return {
    group,
    update(dt: number) {
      time += dt;
      const n =
        Math.sin(time * 11.3) * 0.5 +
        Math.sin(time * 17.7 + 1.3) * 0.3 +
        Math.sin(time * 29.1 + 2.1) * 0.2;
      if (light) {
        light.intensity = LIGHT_INTENSITY * (1 + n * 0.22);
      }
      const frame = Math.floor(time * 19) % 16;
      flameTexture.offset.set((frame % 4) * 0.25, (3 - Math.floor(frame / 4)) * 0.25);
      flameMesh.scale.set(0.8 + n * 0.07, 1.05 + n * 0.1, 1);
      flameMesh.position.x = Math.sin(time * 2.7) * 0.025;
      sideFlames.forEach((sprite, index) => {
        const sideFrame = (frame + 5 + index * 7) % 16;
        sprite.material.map!.offset.set((sideFrame % 4) * 0.25, (3 - Math.floor(sideFrame / 4)) * 0.25);
        sprite.scale.y = 0.65 + Math.sin(time * 7.1 + index * 2.1) * 0.1;
      });
      for (let i = 0; i < 8; i++) {
        const life = (time * (0.48 + i * 0.021) + i * 0.137) % 1;
        sparkPositions[i * 3] = Math.sin(time * 1.2 + i * 5) * life * 0.19;
        sparkPositions[i * 3 + 1] = 1.65 + life * 0.95;
        sparkPositions[i * 3 + 2] = Math.cos(time * 0.8 + i * 3) * life * 0.15;
      }
      (sparkGeometry.getAttribute("position") as Float32BufferAttribute).array.set(sparkPositions);
      sparkGeometry.getAttribute("position").needsUpdate = true;
    },
    dispose() {
      iron.dispose();
      coals.dispose();
      flame.dispose();
      flameTexture.dispose();
      for (const sprite of sideFlames) {
        sprite.material.map!.dispose();
        sprite.material.dispose();
      }
      sparkGeometry.dispose();
      sparkMaterial.dispose();
      if (light) {
        activeBrazierLights = Math.max(0, activeBrazierLights - 1);
        light.dispose();
      }
    },
  };
}

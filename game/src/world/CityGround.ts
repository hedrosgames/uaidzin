import {
  MeshStandardMaterial,
  MirroredRepeatWrapping,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from "three";
import { CITY_SURFACE_GLSL } from "./CitySurface";
import { loadCitySurfaceTextures } from "./CityMaterialTextures";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";
import { bakeCityFloor } from "./GroundBake";
import { trackWorldVisual } from "./WorldVisuals";

let graniteTexture: Texture | null = null;
const graniteClones: Texture[] = [];
const floorBakes: Array<() => void> = [];

function getGraniteTexture(): Texture {
  if (!graniteTexture) {
    const flushBakes = () => {
      for (const t of graniteClones) {
        t.needsUpdate = true;
      }
      graniteClones.length = 0;
      for (const bake of floorBakes) bake();
      floorBakes.length = 0;
    };
    graniteTexture = new TextureLoader().load(
      "/textures/city-granite-albedo.png",
      flushBakes,
      undefined,
      flushBakes,
    );
    graniteTexture.colorSpace = SRGBColorSpace;
    stampAnisotropy(graniteTexture);
  }
  return graniteTexture;
}

export function makeCityFloorMaterial(halfSize: number, plazaRadius = 5.5): MeshStandardMaterial {
  const base = getGraniteTexture();
  const texture = base.clone();
  texture.wrapS = MirroredRepeatWrapping;
  texture.wrapT = MirroredRepeatWrapping;
  texture.repeat.setScalar(halfSize * 2 / 4.8);
  if (!base.image) {
    texture.version = 0;
    graniteClones.push(texture);
  } else {
    texture.needsUpdate = true;
  }
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.94, metalness: 0 });
  material.name = "city-granite-earth";
  const applyBake = () => {
    const image = base.image as (HTMLImageElement & { width: number; height: number }) | undefined;
    if (!image?.width) return;
    const baked = bakeCityFloor(image, halfSize, plazaRadius);
    if (!baked) return;
    material.map = baked;
    material.needsUpdate = true;
  };
  trackWorldVisual(new Promise<void>((resolve) => {
    const finish = () => {
      applyBake();
      resolve();
    };
    if (base.image) finish();
    else floorBakes.push(finish);
  }));
  return material;
}

export function makeCityPlazaMaterial(plazaRadius: number): MeshStandardMaterial {
  let markPlaza: () => void = () => {};
  const plazaReady = new Promise<void>((resolve) => {
    markPlaza = resolve;
  });
  const detail = new TextureLoader().load(
    "/textures/city-materials/rock_04-diffuse.jpg",
    () => markPlaza(),
    undefined,
    () => markPlaza(),
  );
  if (detail.image) markPlaza();
  trackWorldVisual(plazaReady);
  detail.colorSpace = SRGBColorSpace;
  detail.wrapS = detail.wrapT = RepeatWrapping;
  stampAnisotropy(detail);
  const material = new MeshStandardMaterial({ color: 0xffffff, map: detail, roughness: 0.96 });
  material.name = "city-radial-slate";
  trackWorldVisual(loadCitySurfaceTextures("stone").then((maps) => {
    material.normalMap = maps.normal.clone();
    material.roughnessMap = maps.roughness.clone();
    material.normalMap.channel = material.roughnessMap.channel = 0;
    material.normalScale = new Vector2(0.24, 0.24);
    material.needsUpdate = true;
  }));
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCityPlaza;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCityPlaza = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_NORMALMAP
vNormalMapUv = (modelMatrix * vec4(position, 1.0)).xz * 0.65;
#endif
#ifdef USE_ROUGHNESSMAP
vRoughnessMapUv = (modelMatrix * vec4(position, 1.0)).xz * 0.65;
#endif`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec2 vCityPlaza;
float cityPlazaHeight;
${CITY_SURFACE_GLSL}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
float radius = length(vCityPlaza) + (cityNoise(vCityPlaza * 7.0) - 0.5) * 0.024;
float course = floor(radius / 0.72);
float sectors = max(8.0, floor((course + 0.5) * 6.28318));
float angle = atan(vCityPlaza.y, vCityPlaza.x) / 6.283185 + 0.5;
float slot = angle * sectors + mod(course, 2.0) * 0.5;
float radialEdge = min(fract(radius / 0.72), 1.0 - fract(radius / 0.72)) * 0.72;
float lateralEdge = min(fract(slot), 1.0 - fract(slot)) * max(radius, 0.2) * 6.283185 / sectors;
float irregularity = (cityNoise(vCityPlaza * 26.0) - 0.5) * 0.017;
float edgeDistance = min(radialEdge, lateralEdge) + irregularity;
float edgeAntialias = fwidth(edgeDistance) * 0.65;
float joint = smoothstep(0.003 - edgeAntialias, 0.025 + edgeAntialias, edgeDistance);
float stone = cityHash(vec2(course, floor(slot)));
float grain = cityFbm(vCityPlaza * 23.0);
vec3 slab = mix(vec3(0.19, 0.21, 0.215), vec3(0.33, 0.335, 0.31), stone);
slab *= mix(0.81, 1.1, cityFbm(vCityPlaza * 2.4)) * mix(0.92, 1.06, grain);
vec3 jointColor = vec3(0.085, 0.083, 0.061);
diffuseColor.rgb *= mix(jointColor, slab, joint);
cityPlazaHeight = joint * 0.012 + grain * 0.002;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
vec2 mineralUv = vCityPlaza * 0.65;
vec3 mineral = texture2D(map, mineralUv).rgb;
float mineralDetail = clamp(dot(mineral, vec3(0.2126, 0.7152, 0.0722)) * 3.2, 0.7, 1.3);
diffuseColor.rgb *= mix(1.0, mineralDetail, 0.48);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, 0.82);");
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
normal = cityRelief(normal, -vViewPosition, cityPlazaHeight);`);
  };
  material.customProgramCacheKey = () => `city-plaza-stone-2-${plazaRadius}`;
  return material;
}

export { makeCemeteryGroundMaterial as makeDungeon2FloorMaterial } from "./CemeteryGround";

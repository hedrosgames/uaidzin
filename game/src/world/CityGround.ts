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
import { getCityGardenGlsl } from "./CityLandscape";
import { loadCitySurfaceTextures } from "./CityMaterialTextures";
import { isCheapShaders } from "../presentation/rendering/GraphicsQuality";

let graniteTexture: Texture | null = null;
const graniteClones: Texture[] = [];

function getGraniteTexture(): Texture {
  if (!graniteTexture) {
    graniteTexture = new TextureLoader().load(
      "/textures/city-granite-albedo.png",
      () => {
        for (const t of graniteClones) {
          t.needsUpdate = true;
        }
        graniteClones.length = 0;
      },
    );
    graniteTexture.colorSpace = SRGBColorSpace;
    graniteTexture.anisotropy = 8;
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
  material.onBeforeCompile = (shader) => {
    if (isCheapShaders()) return;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCityGround;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCityGround = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec2 vCityGround;
float cityGroundHeight;
${CITY_SURFACE_GLSL}
${getCityGardenGlsl()}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
float bed = cityGarden(vCityGround);
float edge = smoothstep(${(halfSize - 3.4).toFixed(2)}, ${(halfSize - 0.8).toFixed(2)}, max(abs(vCityGround.x), abs(vCityGround.y)));
float grain = cityFbm(vCityGround * 19.0);
float broad = cityFbm(vCityGround * 0.42);
float soil = max(bed * 0.9, edge * 0.85);
soil *= smoothstep(${(plazaRadius + 0.3).toFixed(2)}, ${(plazaRadius + 1.8).toFixed(2)}, length(vCityGround));
vec3 earth = mix(vec3(0.095, 0.065, 0.037), vec3(0.19, 0.14, 0.085), grain);
vec3 moss = mix(vec3(0.064, 0.08, 0.029), vec3(0.12, 0.14, 0.055), grain);
earth = mix(earth, moss, bed * smoothstep(0.48, 0.72, cityFbm(vCityGround * 3.2)) * 0.65);
float stoneHeight = smoothstep(0.07, 0.24, dot(texture2D(map, vMapUv, 2.0).rgb, vec3(0.2126, 0.7152, 0.0722)));
float stoneTone = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(stoneTone) * vec3(0.96, 0.99, 1.02), 0.38);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18, 0.17, 0.145), 0.12);
cityGroundHeight = mix(stoneHeight * 0.004, grain * 0.003, soil);
diffuseColor.rgb *= mix(0.83, 1.04, broad);
diffuseColor.rgb = mix(diffuseColor.rgb, earth, soil);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
normal = cityRelief(normal, -vViewPosition, cityGroundHeight);`);
  };
  material.customProgramCacheKey = () => `${isCheapShaders() ? "cheap" : "natural"}-city-ground-1-${halfSize}-${plazaRadius}`;
  return material;
}

export function makeCityPlazaMaterial(plazaRadius: number): MeshStandardMaterial {
  const detail = new TextureLoader().load("/textures/city-materials/rock_04-diffuse.jpg");
  detail.colorSpace = SRGBColorSpace;
  detail.wrapS = detail.wrapT = RepeatWrapping;
  detail.anisotropy = 8;
  const material = new MeshStandardMaterial({ color: 0xffffff, map: detail, roughness: 0.96 });
  material.name = "city-radial-slate";
  void loadCitySurfaceTextures("stone").then((maps) => {
    material.normalMap = maps.normal.clone();
    material.roughnessMap = maps.roughness.clone();
    material.normalMap.channel = material.roughnessMap.channel = 0;
    material.normalScale = new Vector2(0.24, 0.24);
    material.needsUpdate = true;
  });
  material.onBeforeCompile = (shader) => {
    if (isCheapShaders()) return;
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
  material.customProgramCacheKey = () => `${isCheapShaders() ? "cheap" : "natural"}-city-plaza-stone-2-${plazaRadius}`;
  return material;
}

export { makeCemeteryGroundMaterial as makeDungeon2FloorMaterial } from "./CemeteryGround";

import { MeshStandardMaterial, MirroredRepeatWrapping, SRGBColorSpace, TextureLoader } from "three";
import { CITY_SURFACE_GLSL } from "./CitySurface";
import { CITY_GARDEN_GLSL } from "./CityLandscape";

export function makeCityFloorMaterial(halfSize: number, plazaRadius = 5.5): MeshStandardMaterial {
  const texture = new TextureLoader().load("/textures/city-granite-albedo.png");
  texture.wrapS = MirroredRepeatWrapping;
  texture.wrapT = MirroredRepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.repeat.setScalar(halfSize * 2 / 4.8);
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.94, metalness: 0 });
  material.name = "city-granite-earth";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCityGround;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCityGround = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec2 vCityGround;
float cityGroundHeight;
${CITY_SURFACE_GLSL}
${CITY_GARDEN_GLSL}`);
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
float stoneHeight = smoothstep(0.07, 0.24, dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)));
cityGroundHeight = mix(stoneHeight * 0.024, grain * 0.009, soil);
diffuseColor.rgb *= mix(0.83, 1.04, broad);
diffuseColor.rgb = mix(diffuseColor.rgb, earth, soil);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
normal = cityRelief(normal, -vViewPosition, cityGroundHeight);`);
  };
  material.customProgramCacheKey = () => `city-ground-natural-1-${halfSize}-${plazaRadius}`;
  return material;
}

export function makeCityPlazaMaterial(plazaRadius: number): MeshStandardMaterial {
  const detail = new TextureLoader().load("/textures/city-granite-albedo.png");
  detail.colorSpace = SRGBColorSpace;
  detail.anisotropy = 8;
  const material = new MeshStandardMaterial({ color: 0xffffff, map: detail, roughness: 0.96 });
  material.name = "city-radial-slate";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCityPlaza;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCityPlaza = (modelMatrix * vec4(position, 1.0)).xz;");
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
vec2 mineralUv = vec2(0.524, 0.51) + (abs(fract(vCityPlaza * 0.75) * 2.0 - 1.0) - 0.5) * 0.032;
vec3 mineral = texture2D(map, mineralUv).rgb;
float mineralDetail = clamp(dot(mineral, vec3(0.2126, 0.7152, 0.0722)) * 3.2, 0.6, 1.3);
diffuseColor.rgb *= mix(1.0, mineralDetail, 0.55);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
normal = cityRelief(normal, -vViewPosition, cityPlazaHeight);`);
  };
  material.customProgramCacheKey = () => `city-plaza-stone-1-${plazaRadius}`;
  return material;
}

export function makeDungeon2FloorMaterial(halfSize: number): MeshStandardMaterial {
  const texture = new TextureLoader().load("/textures/dungeon-cemetery-albedo.png");
  texture.wrapS = MirroredRepeatWrapping;
  texture.wrapT = MirroredRepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.repeat.setScalar(halfSize * 2 / 4.8);
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0 });
  material.name = "dungeon-cemetery-ground";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCityGround;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCityGround = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec2 vCityGround;
float cityGroundHeight;
${CITY_SURFACE_GLSL}
${CITY_GARDEN_GLSL}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
float bed = cityGarden(vCityGround);
float edge = smoothstep(${(halfSize - 3.4).toFixed(2)}, ${(halfSize - 0.8).toFixed(2)}, max(abs(vCityGround.x), abs(vCityGround.y)));
float grain = cityFbm(vCityGround * 19.0);
float broad = cityFbm(vCityGround * 0.42);
float soil = max(bed * 0.85, edge * 0.8);
vec3 earth = mix(vec3(0.065, 0.055, 0.045), vec3(0.14, 0.12, 0.095), grain);
vec3 ash = mix(vec3(0.08, 0.08, 0.085), vec3(0.13, 0.13, 0.14), grain);
earth = mix(earth, ash, smoothstep(0.4, 0.7, cityFbm(vCityGround * 2.8)) * 0.5);
float stoneHeight = smoothstep(0.07, 0.24, dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)));
cityGroundHeight = mix(stoneHeight * 0.024, grain * 0.009, soil);
diffuseColor.rgb *= mix(0.86, 1.02, broad);
diffuseColor.rgb = mix(diffuseColor.rgb, earth, soil * 0.65);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
normal = cityRelief(normal, -vViewPosition, cityGroundHeight);`);
  };
  material.customProgramCacheKey = () => `dungeon-2-cemetery-ground-${halfSize}`;
  return material;
}

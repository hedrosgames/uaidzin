import { MeshStandardMaterial, MirroredRepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from "three";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";
import { bakeCityGardenMask } from "./GroundBake";
import { trackWorldVisual } from "./WorldVisuals";

const CITY_FLOOR_TILE_SIZE = 6.4;

function loadPaintedGroundTexture(name: string): Texture {
  let finish: () => void = () => {};
  trackWorldVisual(new Promise<void>((resolve) => { finish = resolve; }));
  const texture = new TextureLoader().load(`/textures/city-painted/${name}.webp`, finish, undefined, finish);
  texture.colorSpace = SRGBColorSpace;
  stampAnisotropy(texture);
  return texture;
}

function makePaintedGroundMaterial(map: Texture, color = 0xf2e6da): MeshStandardMaterial {
  return new MeshStandardMaterial({ map, color, roughness: 1, metalness: 0 });
}

export function makeCityFloorMaterial(halfSize: number, plazaRadius = 5.5): MeshStandardMaterial {
  const texture = loadPaintedGroundTexture("earth");
  texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
  texture.repeat.setScalar(halfSize * 2 / CITY_FLOOR_TILE_SIZE);
  const material = makePaintedGroundMaterial(texture, 0xe2cbb0);
  material.name = "city-painted-earth-floor";
  const gardenMask = bakeCityGardenMask(halfSize, plazaRadius);
  if (!gardenMask) return material;
  material.addEventListener("dispose", () => gardenMask.dispose());
  material.onBeforeCompile = (shader) => {
    shader.uniforms.cityGardenMask = { value: gardenMask };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCityGroundUv;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCityGroundUv = uv;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vCityGroundUv;\nuniform sampler2D cityGardenMask;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
vec3 garden = texture2D(cityGardenMask, vCityGroundUv).rgb;
vec3 earth = mix(vec3(0.22, 0.16, 0.12), vec3(0.36, 0.27, 0.18), garden.b);
vec3 moss = mix(vec3(0.12, 0.17, 0.075), vec3(0.24, 0.29, 0.12), garden.b);
diffuseColor.rgb = mix(diffuseColor.rgb, earth, garden.g * 0.68);
diffuseColor.rgb = mix(diffuseColor.rgb, moss, garden.r * 0.78);`);
  };
  material.customProgramCacheKey = () => "city-painted-earth-floor-1";
  return material;
}

export function makeCityPlazaMaterial(outerRadius: number): MeshStandardMaterial {
  const material = makePaintedGroundMaterial(loadPaintedGroundTexture("plaza"));
  material.name = "city-painted-plaza";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.cityPlazaDiameter = { value: outerRadius * 2 };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float cityPlazaDiameter;");
    shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_MAP
vMapUv = (modelMatrix * vec4(position, 1.0)).xz / cityPlazaDiameter + 0.5;
#endif`);
  };
  material.customProgramCacheKey = () => "city-painted-plaza-1";
  return material;
}

export { makeCemeteryGroundMaterial as makeDungeon2FloorMaterial } from "./CemeteryGround";

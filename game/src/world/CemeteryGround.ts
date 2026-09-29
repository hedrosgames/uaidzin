import { MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader } from "three";
import { CITY_SURFACE_GLSL } from "./CitySurface";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";
import { trackWorldVisual } from "./WorldVisuals";

export function cemeteryPathDistance(x: number, z: number): number {
  const perimeter = Math.abs(Math.max(Math.abs(x), Math.abs(z)) - 4.6);
  return Math.min(perimeter, Math.abs(x), Math.abs(z + 4.6));
}

export const CEMETERY_PATH_GLSL = `
float cemeteryPath(vec2 p) {
  float perimeter = abs(max(abs(p.x), abs(p.y)) - 4.6);
  float distanceToPath = min(perimeter, min(abs(p.x), abs(p.y + 4.6)));
  return 1.0 - smoothstep(0.6, 1.3, distanceToPath + (cityFbm(p * 1.9) - 0.5) * 0.5);
}
`;

export function makeCemeteryGroundMaterial(size: number): MeshStandardMaterial {
  let markGround: () => void = () => {};
  const groundReady = new Promise<void>((resolve) => {
    markGround = resolve;
  });
  const texture = new TextureLoader().load(
    "/textures/dungeon-cemetery-albedo.png",
    () => markGround(),
    undefined,
    () => markGround(),
  );
  if (texture.image) markGround();
  trackWorldVisual(groundReady);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  stampAnisotropy(texture);
  texture.repeat.setScalar(size / 5.4);
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.97 });
  material.name = "cemetery-ground";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCemeteryGround;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCemeteryGround = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec2 vCemeteryGround;
float cemeteryHeight;
${CITY_SURFACE_GLSL}
${CEMETERY_PATH_GLSL}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
vec2 p = vCemeteryGround;
vec3 otherGravel = texture2D(map, mat2(0.8, -0.6, 0.6, 0.8) * vMapUv * 0.71 + 0.173).rgb;
diffuseColor.rgb = mix(diffuseColor.rgb, otherGravel, 0.38);
float gray = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(gray) * vec3(0.88, 0.97, 1.08), 0.55);
float broad = cityFbm(p * 0.33);
diffuseColor.rgb *= mix(0.92, 1.12, broad);
float edge = smoothstep(11.5, 17.0, max(abs(p.x), abs(p.y)));
vec3 soil = mix(vec3(0.32, 0.26, 0.16), vec3(0.42, 0.34, 0.2), broad);
diffuseColor.rgb = mix(diffuseColor.rgb, soil, edge * 0.28);
float path = cemeteryPath(p);
vec2 warp = vec2(cityNoise(p * 3.4), cityNoise(p * 3.4 + 13.0)) - 0.5;
vec2 paving = (p + warp * 0.065) / vec2(0.72, 0.58);
paving.x += mod(floor(paving.y), 2.0) * 0.5;
vec2 cell = floor(paving);
vec2 joint = min(fract(paving), 1.0 - fract(paving));
float stone = cityHash(cell);
float jointDistance = min(joint.x, joint.y) + (cityNoise(p * 28.0) - 0.5) * 0.025;
float aa = fwidth(jointDistance);
float slab = smoothstep(0.018 - aa, 0.055 + aa, jointDistance);
slab *= smoothstep(0.1, 0.29, stone);
float erosion = smoothstep(0.27, 0.5, cityFbm(p * 4.3 + cell * 0.7));
slab *= mix(0.5, 1.0, erosion);
float wear = cityFbm(p * 3.5);
vec3 slabColor = mix(vec3(0.28, 0.3, 0.28), vec3(0.4, 0.4, 0.36), stone);
slabColor *= mix(0.88, 1.06, wear);
slabColor *= mix(0.87, 1.12, cityFbm(p * 24.0));
vec3 pathColor = mix(diffuseColor.rgb * 1.12, slabColor, slab * 0.82);
diffuseColor.rgb = mix(diffuseColor.rgb, pathColor, path);
cemeteryHeight = path * slab * 0.007 + cityNoise(p * 17.0) * 0.0015;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nnormal = cityRelief(normal, -vViewPosition, cemeteryHeight);");
  };
  material.customProgramCacheKey = () => "cemetery-ground-2";
  return material;
}

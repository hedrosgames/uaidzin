import { MeshStandardMaterial } from "three";
import { loadCityPaintedTexture } from "./CityPaintedMaterials";
import { trackWorldVisual } from "./WorldVisuals";

export function makePaintedTerrainMaterial(kind: "field" | "cemetery" | "exterior" | "paving"): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
  material.name = `painted-terrain-${kind}`;
  trackWorldVisual(Promise.all([
    loadCityPaintedTexture("meadow"),
    loadCityPaintedTexture("paving"),
    loadCityPaintedTexture("earth"),
  ]).then(([field, paving, earth]) => {
    material.map = field;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.terrainPaving = { value: paving };
      shader.uniforms.terrainEarth = { value: earth };
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vTerrainWorld;");
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvTerrainWorld = (modelMatrix * vec4(position, 1.0)).xz;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vTerrainWorld;\nuniform sampler2D terrainPaving;\nuniform sampler2D terrainEarth;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
diffuseColor *= texture2D(map, vTerrainWorld / 8.0);
vec2 terrainPoint = vTerrainWorld;
float terrainLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
${kind === "paving" ? `
diffuseColor.rgb = texture2D(terrainPaving, terrainPoint / 4.8).rgb * vec3(0.88, 0.82, 0.78);` : kind === "cemetery" ? `
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(terrainLuma) * vec3(0.78, 0.89, 1.02), 0.52);
float pathDistance = min(abs(max(abs(terrainPoint.x), abs(terrainPoint.y)) - 4.6), min(abs(terrainPoint.x), abs(terrainPoint.y + 4.6)));
float pathBlend = 1.0 - smoothstep(0.65, 1.3, pathDistance + sin(terrainPoint.x * 0.8 + terrainPoint.y * 0.6) * 0.12);
vec3 pathPaint = texture2D(terrainPaving, terrainPoint / 4.8).rgb * vec3(0.72, 0.77, 0.94);
diffuseColor.rgb = mix(diffuseColor.rgb, pathPaint, pathBlend);` : kind === "field" ? `
float trail = 1.0 - smoothstep(1.8, 3.2, abs(terrainPoint.x) + sin(terrainPoint.y * 0.38) * 0.3 + sin(terrainPoint.y * 1.2) * 0.12);
vec3 earthPaint = texture2D(terrainEarth, terrainPoint / 7.0).rgb;
diffuseColor.rgb = mix(diffuseColor.rgb, earthPaint, trail);` : `
diffuseColor.rgb *= vec3(0.78, 0.86, 0.91);`}`);
    };
    material.customProgramCacheKey = () => `painted-terrain-${kind}-3`;
    material.needsUpdate = true;
  }));
  return material;
}

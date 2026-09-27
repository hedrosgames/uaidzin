import { Vector3 } from "three";
import { getArmorReflection, polishThegnKnight } from "./tk-materials.mjs";

const FINISHES = {
  FM_Material: {
    name: "fm-satin-gold", metalness: 0.60, roughness: 0.46, variation: 0.05,
    desaturation: 0.30, tint: [0.96, 0.99, 1.02], fabricTint: [0.83, 0.88, 0.96],
    fabricDesaturation: 0.16, fabricRoughness: 0.86, reflection: 0.82,
    goldThreshold: [0.43, 0.64],
  },
  BM_Material: {
    name: "bm-weathered-brass", metalness: 0.68, roughness: 0.53, variation: 0.09,
    desaturation: 0.24, tint: [0.96, 0.94, 0.85], fabricTint: [0.79, 0.78, 0.82],
    fabricDesaturation: 0.20, fabricRoughness: 0.94, reflection: 0.82,
    goldThreshold: [0.43, 0.64],
  },
  HT_Material: {
    name: "ht-soft-gold", metalness: 0.56, roughness: 0.49, variation: 0.05,
    desaturation: 0.22, tint: [0.99, 0.97, 0.92], fabricTint: [0.83, 0.86, 0.89],
    fabricDesaturation: 0.18, fabricRoughness: 0.87, reflection: 0.78,
    goldThreshold: [0.49, 0.70],
  },
};

const SURFACE_GLSL = `
varying vec3 vCharacterRestPosition;
uniform vec3 characterMetalTint;
uniform vec3 characterFabricTint;
uniform vec3 characterMetalFinish;
uniform vec3 characterFabricFinish;
uniform vec3 characterGoldThreshold;
float characterHash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}
float characterNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 blend = fract(point);
  blend = blend * blend * (3.0 - 2.0 * blend);
  return mix(mix(characterHash(cell), characterHash(cell + vec2(1.0, 0.0)), blend.x),
    mix(characterHash(cell + vec2(0.0, 1.0)), characterHash(cell + vec2(1.0)), blend.x), blend.y);
}
`;

const FINISH_GLSL = `
vec3 characterPaint = diffuseColor.rgb;
float characterLightness = dot(characterPaint, vec3(0.2126, 0.7152, 0.0722));
float characterGold = smoothstep(0.43, 0.59, characterPaint.g / max(characterPaint.r, 0.015))
  * smoothstep(0.10, 0.23, (characterPaint.g - characterPaint.b) / max(characterPaint.r, 0.015))
  * (1.0 - smoothstep(characterGoldThreshold.x, characterGoldThreshold.y, characterPaint.b / max(characterPaint.g, 0.015)))
  * smoothstep(0.025, 0.09, characterLightness);
float characterSkin = (1.0 - characterGold) * smoothstep(0.065, 0.19, characterLightness)
  * smoothstep(0.24, 0.48, characterPaint.b / max(characterPaint.r, 0.015));
vec2 characterSurface = vCharacterRestPosition.xz + vCharacterRestPosition.y * vec2(0.37, 0.73);
float characterMottle = characterNoise(characterSurface * 95.0);
float characterDetailFade = 1.0 - smoothstep(0.0008, 0.003, max(fwidth(characterSurface.x), fwidth(characterSurface.y)));
float characterGrain = (characterNoise(characterSurface * 1700.0) - 0.5) * characterDetailFade;
float characterWear = smoothstep(0.75, 0.9, characterNoise(characterSurface * vec2(2300.0, 120.0))) * characterDetailFade;
vec3 characterGoldColor = mix(characterPaint, vec3(characterLightness), characterMetalFinish.z) * characterMetalTint;
characterGoldColor *= 0.94 + characterMottle * 0.06 + characterGrain * 0.018 + characterWear * 0.025;
vec3 characterFabric = mix(characterPaint, vec3(characterLightness), characterFabricFinish.y) * characterFabricTint;
characterFabric *= 0.98 + characterMottle * 0.04 + characterGrain * 0.018;
vec3 characterSkinColor = mix(characterPaint, vec3(characterLightness), 0.08) * vec3(1.02, 0.99, 0.97);
diffuseColor.rgb = mix(mix(characterFabric, characterSkinColor, characterSkin), characterGoldColor, characterGold);
`;

export function polishCharacterMaterial(material, sourceName) {
  if (sourceName === "TK_Material") {
    polishThegnKnight(material, sourceName);
    return;
  }
  const finish = FINISHES[sourceName];
  if (!finish || !material.map) return;
  material.name = sourceName;
  material.metalness = finish.metalness;
  material.envMap = getArmorReflection();
  material.envMapIntensity = finish.reflection;
  material.userData.artProfile = finish.name;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.characterMetalTint = { value: new Vector3(...finish.tint) };
    shader.uniforms.characterFabricTint = { value: new Vector3(...finish.fabricTint) };
    shader.uniforms.characterMetalFinish = { value: new Vector3(finish.roughness, finish.variation, finish.desaturation) };
    shader.uniforms.characterFabricFinish = { value: new Vector3(finish.fabricRoughness, finish.fabricDesaturation, 0) };
    shader.uniforms.characterGoldThreshold = { value: new Vector3(...finish.goldThreshold, 0) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCharacterRestPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCharacterRestPosition = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${SURFACE_GLSL}`)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${FINISH_GLSL}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(characterFabricFinish.x, 0.72, characterSkin),
          characterMetalFinish.x + characterMottle * characterMetalFinish.y - characterWear * 0.04, characterGold);
        roughnessFactor += characterGrain * 0.025;
      `)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
        metalnessFactor *= characterGold;
      `);
  };
  material.customProgramCacheKey = () => `${finish.name}-v1`;
  material.needsUpdate = true;
}

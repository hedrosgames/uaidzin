import { DataTexture, EquirectangularReflectionMapping, RGBAFormat, SRGBColorSpace } from "three";

let armorReflection = null;

export function getArmorReflection() {
  if (armorReflection) return armorReflection;
  const width = 128;
  const height = 64;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const elevation = y / (height - 1);
    const sky = Math.max(0, (elevation - 0.4) / 0.6);
    const horizon = Math.exp(-Math.pow((elevation - 0.52) / 0.12, 2));
    for (let x = 0; x < width; x++) {
      const opening = Math.pow(Math.max(0, Math.cos(x / width * Math.PI * 2 - 0.8)), 8) * sky;
      const pixel = (y * width + x) * 4;
      pixels[pixel] = 28 + sky * 93 + horizon * 31 + opening * 84;
      pixels[pixel + 1] = 29 + sky * 103 + horizon * 34 + opening * 80;
      pixels[pixel + 2] = 33 + sky * 121 + horizon * 37 + opening * 69;
      pixels[pixel + 3] = 255;
    }
  }
  armorReflection = new DataTexture(pixels, width, height, RGBAFormat);
  armorReflection.mapping = EquirectangularReflectionMapping;
  armorReflection.colorSpace = SRGBColorSpace;
  armorReflection.needsUpdate = true;
  return armorReflection;
}

const SURFACE_GLSL = `
varying vec3 vTkRestPosition;
float tkHash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}
float tkNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 blend = fract(point);
  blend = blend * blend * (3.0 - 2.0 * blend);
  return mix(mix(tkHash(cell), tkHash(cell + vec2(1.0, 0.0)), blend.x),
    mix(tkHash(cell + vec2(0.0, 1.0)), tkHash(cell + vec2(1.0)), blend.x), blend.y);
}
`;

const FINISH_GLSL = `
vec3 tkPaint = diffuseColor.rgb;
float tkLightness = dot(tkPaint, vec3(0.2126, 0.7152, 0.0722));
float tkGreenRatio = tkPaint.g / max(tkPaint.r, 0.015);
float tkGold = smoothstep(0.43, 0.59, tkGreenRatio)
  * smoothstep(0.10, 0.23, (tkPaint.g - tkPaint.b) / max(tkPaint.r, 0.015))
  * (1.0 - smoothstep(0.43, 0.62, tkPaint.b / max(tkPaint.g, 0.015)))
  * smoothstep(0.025, 0.09, tkLightness);
float tkSkin = (1.0 - tkGold) * smoothstep(0.06, 0.19, tkLightness)
  * smoothstep(0.20, 0.42, tkPaint.b / max(tkPaint.r, 0.015));
vec2 tkSurface = vTkRestPosition.xz + vTkRestPosition.y * vec2(0.37, 0.73);
float tkMottle = tkNoise(tkSurface * 95.0);
float tkDetailFade = 1.0 - smoothstep(0.0008, 0.003, max(fwidth(tkSurface.x), fwidth(tkSurface.y)));
float tkGrain = (tkNoise(tkSurface * 1700.0) - 0.5) * tkDetailFade;
float tkWear = smoothstep(0.75, 0.9, tkNoise(tkSurface * vec2(2300.0, 120.0))) * tkDetailFade;
vec3 tkGoldColor = mix(tkPaint, vec3(tkLightness), 0.21) * vec3(0.98, 0.97, 0.91);
tkGoldColor *= 0.94 + tkMottle * 0.06 + tkGrain * 0.018;
tkGoldColor = mix(tkGoldColor, tkGoldColor * 1.12, tkWear * 0.24);
vec3 tkUnderlayer = mix(tkPaint, vec3(tkLightness), 0.18) * vec3(0.83, 0.86, 0.92);
vec3 tkSkinColor = mix(tkPaint, vec3(tkLightness), 0.10) * vec3(1.03, 0.99, 0.97);
diffuseColor.rgb = mix(mix(tkUnderlayer, tkSkinColor, tkSkin), tkGoldColor, tkGold);
`;

export function polishThegnKnight(material, sourceName) {
  if (sourceName !== "TK_Material" || !material.map) return;
  material.name = sourceName;
  material.roughness = 0.76;
  material.metalness = 0.68;
  material.envMap = getArmorReflection();
  material.envMapIntensity = 0.85;
  material.userData.artProfile = "tk-aged-gold";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTkRestPosition;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTkRestPosition = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${SURFACE_GLSL}`)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${FINISH_GLSL}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(0.88, 0.72, tkSkin), 0.46 + tkMottle * 0.07 - tkWear * 0.04, tkGold);
        roughnessFactor += tkGrain * 0.035;
      `)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
        metalnessFactor *= tkGold;
      `);
  };
  material.customProgramCacheKey = () => "tk-aged-gold-v1";
  material.needsUpdate = true;
}

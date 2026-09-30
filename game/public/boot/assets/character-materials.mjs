export function polishCharacterMaterial(material, sourceName, originalAtlas = null) {
  const goldArmor = material.map?.userData.armorAppearance === "gold";
  material.name = sourceName || material.name;
  material.roughness = 0.86;
  material.metalness = 0.06;
  material.normalMap = null;
  material.roughnessMap = null;
  material.aoMap = null;
  material.envMap = null;
  material.userData.artProfile = "painted-character";
  if (originalAtlas) material.userData.originalAtlas = originalAtlas;
  material.onBeforeCompile = (shader) => {
    if (originalAtlas) {
      shader.uniforms.paintOriginal = { value: originalAtlas };
      shader.uniforms.paintTexel = { value: [1 / (originalAtlas.image?.width || 1024), 1 / (originalAtlas.image?.height || 1024)] };
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D paintOriginal;\nuniform vec2 paintTexel;");
    }
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
${originalAtlas ? `
vec3 originalPaint = texture2D(paintOriginal, vMapUv).rgb;
vec3 nearbyPaint = (texture2D(paintOriginal, vMapUv + vec2(paintTexel.x, 0.0)).rgb
  + texture2D(paintOriginal, vMapUv - vec2(paintTexel.x, 0.0)).rgb
  + texture2D(paintOriginal, vMapUv + vec2(0.0, paintTexel.y)).rgb
  + texture2D(paintOriginal, vMapUv - vec2(0.0, paintTexel.y)).rgb) * 0.25;
originalPaint = clamp(originalPaint + clamp((originalPaint - nearbyPaint) * 1.35, vec3(-0.055), vec3(0.055)), 0.0, 1.0);
float originalLuma = dot(originalPaint, vec3(0.2126, 0.7152, 0.0722));
float originalGold = smoothstep(0.43, 0.59, originalPaint.g / max(originalPaint.r, 0.015))
  * (1.0 - smoothstep(0.43, 0.67, originalPaint.b / max(originalPaint.g, 0.015)))
  * smoothstep(0.025, 0.09, originalLuma);
vec3 armorPigment = ${goldArmor ? "mix(vec3(0.095, 0.035, 0.017), vec3(1.0, 0.59, 0.12), smoothstep(0.06, 0.62, originalLuma)) * diffuse" : "diffuseColor.rgb"};
diffuseColor.rgb = mix(originalPaint * diffuse, armorPigment, originalGold);` : ""}
float pigmentLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(pigmentLuma), 0.025);`);
    if (originalAtlas) {
      shader.fragmentShader = shader.fragmentShader.replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor *= originalGold;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.96, 0.78, originalGold);");
    }
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
float paintedDaylight = clamp(dot(reflectedLight.directDiffuse, vec3(0.333)) / max(pigmentLuma, 0.02), 0.0, 1.0);
outgoingLight *= mix(vec3(0.93, 0.92, 1.04), vec3(1.055, 1.015, 0.96), smoothstep(0.06, 0.55, paintedDaylight));
#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => originalAtlas ? `painted-character-armor-v8-${goldArmor}` : "painted-character-v4";
  material.needsUpdate = true;
}

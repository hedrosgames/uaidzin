import { Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace, type Texture } from "three";
import { loadCityPaintedTexture } from "./CityPaintedMaterials";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";
import type { CemeteryPropId } from "./CemeteryProps";

function finishMaterial(source: MeshStandardMaterial, id: CemeteryPropId, paint: Texture): MeshStandardMaterial {
  const material = source.clone();
  material.name = `cemetery-painted-${id}`;
  material.metalness = 0;
  material.roughness = 1;
  material.normalMap = null;
  material.roughnessMap = null;
  material.metalnessMap = null;
  if (material.map) {
    material.map.colorSpace = SRGBColorSpace;
    stampAnisotropy(material.map);
  }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.cemeteryPaint = { value: paint };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCemeteryPaintUv;\nvarying vec3 vCemeteryLocal;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCemeteryPaintUv = uv * 2.0;\nvCemeteryLocal = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D cemeteryPaint;\nvarying vec2 vCemeteryPaintUv;\nvarying vec3 vCemeteryLocal;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
float originalTone = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
vec3 pigment = texture2D(cemeteryPaint, vCemeteryPaintUv).rgb;
float tone = clamp(pow(max(originalTone, 0.001), 0.28) * 1.35, 0.48, 1.04);
vec3 paintedSurface = pigment * tone * ${id === "tree" ? "vec3(0.61, 0.60, 0.72)" : "vec3(0.72, 0.78, 0.95)"};
diffuseColor.rgb = mix(diffuseColor.rgb, paintedSurface, 0.82);
float contact = smoothstep(0.01, 0.19, vCemeteryLocal.y);
diffuseColor.rgb *= mix(vec3(0.78, 0.82, 0.74), vec3(1.0), contact);`);
    if (id === "wall" || id === "mausoleum") {
      const mask = id === "wall"
        ? "step(0.386, vCemeteryLocal.y) * (1.0 - step(0.33, abs(vCemeteryLocal.x)))"
        : "step(0.41, vCemeteryLocal.z) * (1.0 - step(0.17, abs(vCemeteryLocal.x))) * (1.0 - step(0.55, vCemeteryLocal.y))";
      shader.fragmentShader = shader.fragmentShader.replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
float iron = ${mask};
metalnessFactor = iron * 0.28;
roughnessFactor = mix(roughnessFactor, 0.76, iron);`);
    }
  };
  material.customProgramCacheKey = () => `cemetery-painted-${id}-1`;
  return material;
}

export async function applyCemeteryMaterials(root: Object3D, id: CemeteryPropId): Promise<void> {
  const paint = await loadCityPaintedTexture(id === "tree" ? "wood" : "stone");
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const source = node.material as MeshStandardMaterial;
    node.material = finishMaterial(source, id, paint);
    source.dispose();
    node.castShadow = node.receiveShadow = true;
  });
}

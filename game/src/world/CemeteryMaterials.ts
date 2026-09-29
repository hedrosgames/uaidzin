import { Mesh, MeshStandardMaterial, Object3D, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2 } from "three";
import { loadCitySurfaceTextures, type CitySurfaceTextures } from "./CityMaterialTextures";
import { CITY_SURFACE_GLSL } from "./CitySurface";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";
import type { CemeteryPropId } from "./CemeteryProps";

let barkTextures: Promise<CitySurfaceTextures> | null = null;

function loadBarkTextures(): Promise<CitySurfaceTextures> {
  barkTextures ??= Promise.all(["diffuse", "nor_gl", "rough"].map(async (suffix) => {
    const texture = await new TextureLoader().loadAsync(`/textures/cemetery-materials/bark_brown_01-${suffix}.jpg`);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    stampAnisotropy(texture);
    texture.channel = 1;
    if (suffix === "diffuse") texture.colorSpace = SRGBColorSpace;
    return texture;
  })).then(([albedo, normal, roughness]) => ({ albedo: albedo!, normal: normal!, roughness: roughness! }));
  return barkTextures;
}

function finishMaterial(source: MeshStandardMaterial, id: CemeteryPropId, maps: CitySurfaceTextures): MeshStandardMaterial {
  const material = source.clone();
  material.name = `cemetery-${id}-${id === "tree" ? "bark" : "stone"}`;
  material.metalness = 0;
  material.roughness = 1;
  material.normalMap = maps.normal;
  material.roughnessMap = maps.roughness;
  material.normalScale = new Vector2(id === "tree" ? 0.48 : 0.27, id === "tree" ? 0.48 : 0.27);
  if (material.map) {
    material.map.colorSpace = SRGBColorSpace;
    stampAnisotropy(material.map);
  }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCemeteryDetail = { value: maps.albedo };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vCemeteryLocal;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCemeteryLocal = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vCemeteryLocal;
uniform sampler2D uCemeteryDetail;
${CITY_SURFACE_GLSL}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
vec3 detail = texture2D(uCemeteryDetail, vNormalMapUv).rgb;
float originalTone = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float detailTone = dot(detail, vec3(0.2126, 0.7152, 0.0722));
${id === "tree" ? `
vec3 bark = mix(detail, vec3(detailTone) * vec3(0.92, 0.95, 1.0), 0.72);
diffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.8, 0.87, 0.94), bark * 0.9, 0.58);
diffuseColor.rgb *= mix(0.7, 1.0, smoothstep(0.015, 0.19, vCemeteryLocal.y));` : `
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(originalTone) * vec3(0.85, 0.94, 1.04), 0.76);
diffuseColor.rgb *= mix(0.82, 1.18, clamp(detailTone * 3.0, 0.0, 1.0));
float damp = (1.0 - smoothstep(0.025, 0.2, vCemeteryLocal.y)) * cityFbm(vCemeteryLocal.xz * 28.0);
float lichen = smoothstep(0.59, 0.73, cityFbm(vCemeteryLocal.xy * 32.0 + vCemeteryLocal.z * 6.0));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(originalTone) * vec3(0.66, 0.73, 0.56), damp * 0.5);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28, 0.30, 0.25), lichen * 0.15);`}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor, 0.82, 1.0);");
    if (id === "wall" || id === "mausoleum") {
      const mask = id === "wall"
        ? "step(0.386, vCemeteryLocal.y) * (1.0 - step(0.33, abs(vCemeteryLocal.x)))"
        : "step(0.41, vCemeteryLocal.z) * (1.0 - step(0.17, abs(vCemeteryLocal.x))) * (1.0 - step(0.55, vCemeteryLocal.y))";
      shader.fragmentShader = shader.fragmentShader.replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
float iron = ${mask};
metalnessFactor = iron * 0.35;
roughnessFactor = mix(roughnessFactor, 0.7, iron);`);
    }
  };
  material.customProgramCacheKey = () => `cemetery-surface-${id}-1`;
  return material;
}

export async function applyCemeteryMaterials(root: Object3D, id: CemeteryPropId): Promise<void> {
  const maps = await (id === "tree" ? loadBarkTextures() : loadCitySurfaceTextures("stone"));
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.geometry = node.geometry.clone();
    const detailUv = node.geometry.getAttribute("uv").clone();
    const scale = id === "tree" ? 2.3 : id === "mausoleum" ? 5 : 2.5;
    for (let vertex = 0; vertex < detailUv.count; vertex++) detailUv.setXY(vertex, detailUv.getX(vertex) * scale, detailUv.getY(vertex) * scale);
    node.geometry.setAttribute("uv1", detailUv);
    const source = node.material as MeshStandardMaterial;
    node.material = finishMaterial(source, id, maps);
    source.dispose();
    node.castShadow = node.receiveShadow = true;
  });
}

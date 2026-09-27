import { MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader, Vector2 } from "three";

export type CitySurfaceKind = "stone" | "wood" | "cloth" | "iron";

export interface CitySurfaceTextures {
  albedo: Texture;
  normal: Texture;
  roughness: Texture;
}

const assets: Record<CitySurfaceKind, string> = {
  stone: "rock_04",
  wood: "rough_wood",
  cloth: "rough_linen",
  iron: "rust_coarse_01",
};

const pending = new Map<CitySurfaceKind, Promise<CitySurfaceTextures>>();
const loader = new TextureLoader();

export function loadCitySurfaceTextures(kind: CitySurfaceKind): Promise<CitySurfaceTextures> {
  const cached = pending.get(kind);
  if (cached) return cached;
  const loaded = Promise.all(["diffuse", "nor_gl", "rough"].map(async (suffix) => {
    const texture = await loader.loadAsync(`/textures/city-materials/${assets[kind]}-${suffix}.jpg`);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8;
    texture.channel = 1;
    if (suffix === "diffuse") texture.colorSpace = SRGBColorSpace;
    return texture;
  })).then(([albedo, normal, roughness]) => ({ albedo: albedo!, normal: normal!, roughness: roughness! }));
  pending.set(kind, loaded);
  return loaded;
}

export function makeCitySolidMaterial(kind: CitySurfaceKind, color: number): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color, roughness: kind === "iron" ? 0.68 : 0.92, metalness: kind === "iron" ? 0.35 : 0 });
  material.name = `city-crafted-${kind}`;
  if (kind === "iron") {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
float ironTone = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(ironTone) * vec3(0.9, 0.95, 1.0), 0.8);
diffuseColor.rgb = max(diffuseColor.rgb, vec3(0.055));`);
    };
    material.customProgramCacheKey = () => "city-crafted-iron-1";
  }
  void loadCitySurfaceTextures(kind).then((maps) => {
    material.map = maps.albedo.clone();
    material.normalMap = maps.normal.clone();
    material.roughnessMap = maps.roughness.clone();
    for (const texture of [material.map, material.normalMap, material.roughnessMap]) texture.channel = 0;
    material.normalScale = new Vector2(0.3, 0.3);
    material.needsUpdate = true;
  });
  return material;
}

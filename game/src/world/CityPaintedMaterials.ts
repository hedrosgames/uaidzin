import { MeshStandardMaterial, MirroredRepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from "three";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";
import { trackWorldVisual } from "./WorldVisuals";

const paintedTextures = new Map<string, Promise<Texture>>();

export function loadCityPaintedTexture(kind: "stone" | "wood" | "field" | "meadow" | "earth" | "paving" | "grass"): Promise<Texture> {
  const cached = paintedTextures.get(kind);
  if (cached) return cached;
  const loaded = new TextureLoader().loadAsync(`/textures/city-painted/${kind}.webp`).then((texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
    stampAnisotropy(texture);
    return texture;
  });
  paintedTextures.set(kind, loaded);
  return loaded;
}

export function makeCityPaintedSolidMaterial(kind: "wood" | "stone" | "iron", color: number): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color,
    roughness: kind === "iron" ? 0.72 : 1,
    metalness: kind === "iron" ? 0.28 : 0,
  });
  material.name = `city-painted-${kind}`;
  if (kind !== "iron") {
    trackWorldVisual(loadCityPaintedTexture(kind).then((texture) => {
      material.map = texture;
      material.needsUpdate = true;
    }));
  }
  return material;
}

import { SRGBColorSpace, TextureLoader, type Texture } from "three";
import { stampAnisotropy } from "./GraphicsQuality";
import { armorAtlasUrl, type ArmorAppearance } from "../../../public/boot/assets/armor-appearance.mjs";

const atlases = new Map<string, Promise<Texture>>();

export function loadPaintedCharacterAtlas(classId: string, appearance: ArmorAppearance = "gold"): Promise<Texture> {
  const url = armorAtlasUrl(classId, appearance);
  const key = `${classId}:${appearance}`;
  const existing = atlases.get(key);
  if (existing) return existing;
  const pending = new TextureLoader().loadAsync(url).then((texture) => {
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.userData.paintedAtlas = true;
    texture.userData.armorAppearance = appearance;
    stampAnisotropy(texture);
    return texture;
  });
  atlases.set(key, pending);
  return pending;
}

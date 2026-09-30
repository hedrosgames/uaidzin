import { MeshStandardMaterial, type Texture } from "three";
import { polishCharacterMaterial } from "../../../public/boot/assets/character-materials.mjs";

export function makePaintedCharacterMaterial(source: MeshStandardMaterial, atlas?: Texture | null): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    name: source.name,
    map: source.map ? atlas ?? source.map : null,
    color: source.color.clone(),
    roughness: 0.82,
    metalness: 0.12,
    side: source.side,
  });
  polishCharacterMaterial(material, source.name, atlas && source.map ? source.map : null);
  return material;
}

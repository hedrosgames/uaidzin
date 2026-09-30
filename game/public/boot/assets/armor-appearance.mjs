export const ARMOR_APPEARANCES = ["gold", "silver", "adamant"];

export function normalizeArmorAppearance(value) {
  return ARMOR_APPEARANCES.includes(value) ? value : "gold";
}

export function resolveArmorAppearance(classId, defId) {
  const match = /^armor_chest_(tk|fm|bm|ht)_(silver|gold|adamant)$/.exec(defId || "");
  return match && match[1].toUpperCase() === classId ? match[2] : "gold";
}

export function armorAtlasUrl(classId, appearance = "gold") {
  const id = ["TK", "FM", "BM", "HT"].includes(classId) ? classId : "TK";
  return `/textures/armor-painted/${id}/${normalizeArmorAppearance(appearance)}.webp`;
}

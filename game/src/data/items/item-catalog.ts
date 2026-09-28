import rawItems from "./items.json";

export type ItemCatalogKind =
  | "weapon"
  | "head"
  | "armor"
  | "ring1"
  | "ring2"
  | "neck"
  | "ear"
  | "material"
  | "entry"
  | "misc";

export type ItemCatalogDef = {
  id: string;
  name: string;
  slot: ItemCatalogKind;
  rarity: string;
  desc: string;
  icon: string;
  sellValue?: number;
  attackBonus?: number;
  defenseBonus?: number;
  stackable?: boolean;
  weaponSet?: string;
};

export const ITEM_CATALOG: Record<string, ItemCatalogDef> = {};

for (const item of (rawItems as ItemCatalogDef[])) {
  ITEM_CATALOG[item.id] = item;
}

export function isStackable(
  itemOrDefId: string | { defId?: string; id?: string; stackable?: boolean } | null | undefined,
): boolean {
  if (!itemOrDefId) return false;
  if (typeof itemOrDefId === "string") {
    return ITEM_CATALOG[itemOrDefId]?.stackable === true;
  }
  if (typeof itemOrDefId.stackable === "boolean") {
    return itemOrDefId.stackable;
  }
  const id = itemOrDefId.defId || itemOrDefId.id;
  if (id && ITEM_CATALOG[id]) {
    return ITEM_CATALOG[id].stackable === true;
  }
  return false;
}

const NAME_ICON: Record<string, string> = {
  "Espada Curta": "/assets/icons/items/espada_curta.svg",
  "Machado Leve": "/assets/icons/items/machado_leve.svg",
  "Cajado Rústico": "/assets/icons/items/cajado_rustico.svg",
  "Arco Curto": "/assets/icons/items/arco_curto.svg",
  Capacete: "/assets/icons/items/capacete.svg",
  "Touca de Couro": "/assets/icons/items/touca_couro.svg",
  "Armadura Leve": "/assets/icons/items/armadura_leve.svg",
  Túnica: "/assets/icons/items/tunica.svg",
  "Anel de Cobre": "/assets/icons/items/anel_cobre.svg",
  "Anel de Ferro": "/assets/icons/items/anel_ferro.svg",
  "Colar Simples": "/assets/icons/items/colar_simples.svg",
  "Brinco de Osso": "/assets/icons/items/brinco_osso.svg",
  "Poeira de Ori": "/assets/icons/items/ori.svg",
  "Poeira de Lac": "/assets/icons/items/lac.svg",
  "Poção Menor": "/assets/icons/items/potion.svg",
  "Selo D4": "/assets/icons/items/seal.svg",
  "Selo D5": "/assets/icons/items/seal.svg",
  "Selo D6": "/assets/icons/items/seal.svg",
  "Selo D7": "/assets/icons/items/seal.svg",
  "Selo D8": "/assets/icons/items/seal.svg",
};

const DEFAULT_SLOT_ICONS: Record<string, string> = {
  weapon: "/assets/icons/eq/weapon.svg",
  head: "/assets/icons/eq/crown.svg",
  armor: "/assets/icons/eq/armor.svg",
  ring1: "/assets/icons/eq/ring.svg",
  ring2: "/assets/icons/eq/ring.svg",
  neck: "/assets/icons/eq/neck.svg",
  ear: "/assets/icons/eq/ear.svg",
  material: "/assets/icons/eq/material.svg",
  misc: "/assets/icons/items/gem.svg",
  entry: "/assets/icons/items/seal.svg",
};

export function itemHasIcon(defId: string, slot?: string, name?: string): boolean {
  return !!resolveItemIcon(defId, slot, name);
}

export function resolveItemIcon(defId: string, slot?: string, name?: string): string | null {
  const byId = ITEM_CATALOG[defId];
  if (byId?.icon) return byId.icon;
  if (name) {
    const bare = name.replace(/^(Comum|Incomum|Raro|Épico|Lendário)\s+/u, "");
    if (NAME_ICON[bare]) return NAME_ICON[bare];
    if (NAME_ICON[name]) return NAME_ICON[name];
  }
  if (defId.startsWith("entry_")) return "/assets/icons/items/seal.svg";
  if (defId === "mat_ori" || defId === "poeira_ori") return "/assets/icons/items/ori.svg";
  if (defId === "mat_lac" || defId === "poeira_lac") return "/assets/icons/items/lac.svg";
  const slotKey = slot || defId.split("_")[0];
  if (slotKey && DEFAULT_SLOT_ICONS[slotKey]) return DEFAULT_SLOT_ICONS[slotKey];
  return null;
}

export function listCatalogItemsWithIcons(): ItemCatalogDef[] {
  return Object.values(ITEM_CATALOG).filter((d) => !!d.icon);
}

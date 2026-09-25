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
};

export const ITEM_CATALOG: Record<string, ItemCatalogDef> = {};

for (const item of (rawItems as ItemCatalogDef[])) {
  ITEM_CATALOG[item.id] = item;
}

const NAME_ICON: Record<string, string> = {
  "Espada Curta": "items/espada_curta.svg",
  "Machado Leve": "items/machado_leve.svg",
  "Cajado Rústico": "items/cajado_rustico.svg",
  "Arco Curto": "items/arco_curto.svg",
  Capacete: "items/capacete.svg",
  "Touca de Couro": "items/touca_couro.svg",
  "Armadura Leve": "items/armadura_leve.svg",
  Túnica: "items/tunica.svg",
  "Anel de Cobre": "items/anel_cobre.svg",
  "Anel de Ferro": "items/anel_ferro.svg",
  "Colar Simples": "items/colar_simples.svg",
  "Brinco de Osso": "items/brinco_osso.svg",
  "Poeira de Ori": "items/ori.svg",
  "Poeira de Lac": "items/lac.svg",
  "Selo D4": "items/seal.svg",
  "Selo D5": "items/seal.svg",
  "Selo D6": "items/seal.svg",
  "Selo D7": "items/seal.svg",
  "Selo D8": "items/seal.svg",
};

const DEFAULT_SLOT_ICONS: Record<string, string> = {
  weapon: "eq/weapon.svg",
  head: "eq/crown.svg",
  armor: "eq/armor.svg",
  ring1: "eq/ring.svg",
  ring2: "eq/ring.svg",
  neck: "eq/neck.svg",
  ear: "eq/ear.svg",
  material: "eq/material.svg",
  misc: "items/gem.svg",
  entry: "items/seal.svg",
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
  if (defId.startsWith("entry_")) return "items/seal.svg";
  if (defId === "mat_ori" || defId === "poeira_ori") return "items/ori.svg";
  if (defId === "mat_lac" || defId === "poeira_lac") return "items/lac.svg";
  const slotKey = slot || defId.split("_")[0];
  if (slotKey && DEFAULT_SLOT_ICONS[slotKey]) return DEFAULT_SLOT_ICONS[slotKey];
  return null;
}

export function listCatalogItemsWithIcons(): ItemCatalogDef[] {
  return Object.values(ITEM_CATALOG).filter((d) => !!d.icon);
}

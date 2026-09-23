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

const ICON = {
  ori: "items/ori.svg",
  lac: "items/lac.svg",
  seal: "items/seal.svg",
  gem: "items/gem.svg",
  potion: "items/potion.svg",
  book: "items/book.svg",
  espada: "items/espada_curta.svg",
  machado: "items/machado_leve.svg",
  cajado: "items/cajado_rustico.svg",
  arco: "items/arco_curto.svg",
  armadura: "items/armadura_leve.svg",
  tunica: "items/tunica.svg",
  capacete: "items/capacete.svg",
  touca: "items/touca_couro.svg",
  anel_cobre: "items/anel_cobre.svg",
  anel_ferro: "items/anel_ferro.svg",
  colar: "items/colar_simples.svg",
  brinco: "items/brinco_osso.svg",
  weapon: "eq/weapon.svg",
  armor: "eq/armor.svg",
  head: "eq/crown.svg",
  ring: "eq/ring.svg",
  neck: "eq/neck.svg",
  ear: "eq/ear.svg",
  material: "eq/material.svg",
} as const;

const SLOT_ICON: Record<string, string> = {
  weapon: ICON.weapon,
  head: ICON.head,
  armor: ICON.armor,
  ring1: ICON.ring,
  ring2: ICON.ring,
  neck: ICON.neck,
  ear: ICON.ear,
  material: ICON.material,
  misc: ICON.gem,
  entry: ICON.seal,
};

export const ITEM_CATALOG: Record<string, ItemCatalogDef> = {
  mat_ori: {
    id: "mat_ori",
    name: "Poeira de Ori",
    slot: "material",
    rarity: "Comum",
    desc: "Material de reforço até +5.",
    icon: ICON.ori,
    sellValue: 2,
  },
  mat_lac: {
    id: "mat_lac",
    name: "Poeira de Lac",
    slot: "material",
    rarity: "Comum",
    desc: "Material de reforço de +6 a +10.",
    icon: ICON.lac,
    sellValue: 8,
  },
  poeira_ori: {
    id: "poeira_ori",
    name: "Poeira de Ori",
    slot: "material",
    rarity: "Comum",
    desc: "Material de reforço até +5.",
    icon: ICON.ori,
    sellValue: 2,
  },
  poeira_lac: {
    id: "poeira_lac",
    name: "Poeira de Lac",
    slot: "material",
    rarity: "Comum",
    desc: "Material de reforço de +6 a +10.",
    icon: ICON.lac,
    sellValue: 8,
  },
  entry_d4: {
    id: "entry_d4",
    name: "Selo D4",
    slot: "entry",
    rarity: "Comum",
    desc: "Consome ao entrar na Dungeon 4.",
    icon: ICON.seal,
    sellValue: 20,
  },
  entry_d5: {
    id: "entry_d5",
    name: "Selo D5",
    slot: "entry",
    rarity: "Comum",
    desc: "Consome ao entrar na Dungeon 5.",
    icon: ICON.seal,
    sellValue: 35,
  },
  entry_d6: {
    id: "entry_d6",
    name: "Selo D6",
    slot: "entry",
    rarity: "Comum",
    desc: "Consome ao entrar na Dungeon 6.",
    icon: ICON.seal,
    sellValue: 50,
  },
  entry_d7: {
    id: "entry_d7",
    name: "Selo D7",
    slot: "entry",
    rarity: "Comum",
    desc: "Consome ao entrar na Dungeon 7.",
    icon: ICON.seal,
    sellValue: 75,
  },
  entry_d8: {
    id: "entry_d8",
    name: "Selo D8",
    slot: "entry",
    rarity: "Comum",
    desc: "Consome ao entrar na Dungeon 8.",
    icon: ICON.seal,
    sellValue: 100,
  },
  espada_curta: {
    id: "espada_curta",
    name: "Espada Curta",
    slot: "weapon",
    rarity: "Comum",
    desc: "Ataque +4",
    icon: ICON.espada,
    attackBonus: 4,
    defenseBonus: 0,
    sellValue: 20,
  },
  machado_leve: {
    id: "machado_leve",
    name: "Machado Leve",
    slot: "weapon",
    rarity: "Comum",
    desc: "Ataque +5",
    icon: ICON.machado,
    attackBonus: 5,
    defenseBonus: 0,
    sellValue: 24,
  },
  armadura_leve: {
    id: "armadura_leve",
    name: "Armadura Leve",
    slot: "armor",
    rarity: "Comum",
    desc: "Defesa +3",
    icon: ICON.armadura,
    attackBonus: 0,
    defenseBonus: 3,
    sellValue: 18,
  },
  capacete: {
    id: "capacete",
    name: "Capacete",
    slot: "head",
    rarity: "Comum",
    desc: "Defesa +2",
    icon: ICON.capacete,
    attackBonus: 0,
    defenseBonus: 2,
    sellValue: 14,
  },
  anel_cobre: {
    id: "anel_cobre",
    name: "Anel de Cobre",
    slot: "ring1",
    rarity: "Comum",
    desc: "Ataque +1 · Defesa +1",
    icon: ICON.anel_cobre,
    attackBonus: 1,
    defenseBonus: 1,
    sellValue: 10,
  },
  anel_ferro: {
    id: "anel_ferro",
    name: "Anel de Ferro",
    slot: "ring2",
    rarity: "Incomum",
    desc: "Ataque +2 · Defesa +2",
    icon: ICON.anel_ferro,
    attackBonus: 2,
    defenseBonus: 2,
    sellValue: 40,
  },
  colar_simples: {
    id: "colar_simples",
    name: "Colar Simples",
    slot: "neck",
    rarity: "Comum",
    desc: "Ataque +1 · Defesa +1",
    icon: ICON.colar,
    attackBonus: 1,
    defenseBonus: 1,
    sellValue: 12,
  },
  brinco_osso: {
    id: "brinco_osso",
    name: "Brinco de Osso",
    slot: "ear",
    rarity: "Comum",
    desc: "Ataque +1",
    icon: ICON.brinco,
    attackBonus: 1,
    defenseBonus: 0,
    sellValue: 8,
  },
};

const NAME_ICON: Record<string, string> = {
  "Espada Curta": ICON.espada,
  "Machado Leve": ICON.machado,
  "Cajado Rústico": ICON.cajado,
  "Arco Curto": ICON.arco,
  Capacete: ICON.capacete,
  "Touca de Couro": ICON.touca,
  "Armadura Leve": ICON.armadura,
  Túnica: ICON.tunica,
  "Anel de Cobre": ICON.anel_cobre,
  "Anel de Ferro": ICON.anel_ferro,
  "Colar Simples": ICON.colar,
  "Brinco de Osso": ICON.brinco,
  "Poeira de Ori": ICON.ori,
  "Poeira de Lac": ICON.lac,
  "Selo D4": ICON.seal,
  "Selo D5": ICON.seal,
  "Selo D6": ICON.seal,
  "Selo D7": ICON.seal,
  "Selo D8": ICON.seal,
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
  if (defId.startsWith("entry_")) return ICON.seal;
  if (defId === "mat_ori" || defId === "poeira_ori") return ICON.ori;
  if (defId === "mat_lac" || defId === "poeira_lac") return ICON.lac;
  const slotKey = slot || defId.split("_")[0];
  if (slotKey && SLOT_ICON[slotKey]) return SLOT_ICON[slotKey];
  return null;
}

export function listCatalogItemsWithIcons(): ItemCatalogDef[] {
  return Object.values(ITEM_CATALOG).filter((d) => !!d.icon);
}

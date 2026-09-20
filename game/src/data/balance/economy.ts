export const ECONOMY_BALANCE = {
  inventorySlots: 40,
  bagCount: 4,
  accountVaultCapacity: 120,
  materialStack: 999,
  goldCap: 2_000_000_000,
  goldPerKill: { fixed: 3, chaser: 4, ranged: 4, boss: 25 },
  equipDropChance: 0.22,
  materialDropChance: 0.18,
  oriShare: 0.75,
  oriUntilDungeon: 4,
  equipStatLevelDivisor: 8,
  weaponAttackMultiplier: 2,
  rarities: ["Comum", "Incomum", "Raro", "Épico", "Lendário"] as const,
  rarityWeights: [50, 28, 14, 6, 2] as const,
  refine: {
    maxLevel: 10,
    
    successByLevel: [1, 1, 0.95, 0.9, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35],
    goldCost: [10, 20, 40, 70, 110, 160, 230, 320, 430, 560],
    
    materialTierSwitchAt: 6,
  },
  sellValueByRarity: [5, 12, 28, 60, 120],
  equipBaseStat(level: number, rarityIndex: number): number {
    return 1 + Math.floor(level / ECONOMY_BALANCE.equipStatLevelDivisor) + rarityIndex;
  },
  equipDefenseBonus(base: number, rarityIndex: number): number {
    return base + rarityIndex;
  },
} as const;

export type Rarity = (typeof ECONOMY_BALANCE.rarities)[number];

export type ShopItemDef = {
  id: string;
  name: string;
  slot: string;
  rarity: string;
  desc: string;
};

export type ShopSlotDef = {
  itemId: string;
  qty: number;
  price: number;
};

export const SHOP_CATALOG: {
  items: Record<string, ShopItemDef>;
  shops: Record<string, { id: string; label: string; slots: ShopSlotDef[] }>;
} = {
  items: {
    espada_curta: { id: "espada_curta", name: "Espada Curta", slot: "weapon", rarity: "Comum", desc: "Ataque +4" },
    machado_leve: { id: "machado_leve", name: "Machado Leve", slot: "weapon", rarity: "Comum", desc: "Ataque +5" },
    armadura_leve: { id: "armadura_leve", name: "Armadura Leve", slot: "armor", rarity: "Comum", desc: "Defesa +3" },
    capacete: { id: "capacete", name: "Capacete", slot: "head", rarity: "Comum", desc: "Defesa +2" },
    anel_cobre: { id: "anel_cobre", name: "Anel de Cobre", slot: "ring1", rarity: "Comum", desc: "Ataque +1 · Defesa +1" },
    anel_ferro: { id: "anel_ferro", name: "Anel de Ferro", slot: "ring2", rarity: "Incomum", desc: "Ataque +2 · Defesa +2" },
    colar_simples: { id: "colar_simples", name: "Colar Simples", slot: "neck", rarity: "Comum", desc: "Ataque +1 · Defesa +1" },
    brinco_osso: { id: "brinco_osso", name: "Brinco de Osso", slot: "ear", rarity: "Comum", desc: "Ataque +1" },
    poeira_ori: { id: "poeira_ori", name: "Poeira de Ori", slot: "material", rarity: "Comum", desc: "Material de reforço até +5." },
    poeira_lac: { id: "poeira_lac", name: "Poeira de Lac", slot: "material", rarity: "Comum", desc: "Material de reforço de +6 a +10." },
  },
  shops: {
    merchant: {
      id: "merchant",
      label: "Mercador",
      slots: [
        { itemId: "poeira_ori", qty: 50, price: 25 },
        { itemId: "poeira_lac", qty: 10, price: 120 },
        { itemId: "espada_curta", qty: 5, price: 80 },
        { itemId: "machado_leve", qty: 5, price: 95 },
        { itemId: "armadura_leve", qty: 5, price: 75 },
        { itemId: "capacete", qty: 5, price: 55 },
        { itemId: "anel_cobre", qty: 8, price: 40 },
        { itemId: "colar_simples", qty: 8, price: 45 },
        { itemId: "brinco_osso", qty: 8, price: 35 },
      ],
    },
    blacksmith: {
      id: "blacksmith",
      label: "Ferreiro",
      slots: [
        { itemId: "poeira_ori", qty: 99, price: 20 },
        { itemId: "poeira_lac", qty: 20, price: 100 },
        { itemId: "espada_curta", qty: 3, price: 70 },
        { itemId: "machado_leve", qty: 3, price: 85 },
        { itemId: "armadura_leve", qty: 3, price: 70 },
        { itemId: "capacete", qty: 3, price: 50 },
        { itemId: "anel_ferro", qty: 4, price: 160 },
      ],
    },
  },
};

export const SKILL_TRAINING = {
  pointsCost: 1,
  goldPerTier: 250,
  goldCost(index: number): number {
    return (index + 1) * SKILL_TRAINING.goldPerTier;
  },
  upCost(index: number): number {
    return Math.max(1, index);
  },
  canAfford(skillPoints: number, gold: number, pointsCost: number, goldCost: number): boolean {
    return skillPoints >= pointsCost && gold >= goldCost;
  },
};

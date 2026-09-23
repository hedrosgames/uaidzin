import { ITEM_CATALOG, resolveItemIcon, type ItemCatalogDef } from "../items/item-catalog";

export const ECONOMY_BALANCE = {
  inventorySlots: 40,
  bagCount: 4,
  accountVaultCapacity: 120,
  materialStack: 999,
  goldCap: 2_000_000_000,
  goldPerKill: { fixed: 3, chaser: 4, ranged: 4, boss: 25 },
  equipDropChance: 0.22,
  bossEquipDropChance: 0.4,
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
  icon: string;
};

export type ShopSlotDef = {
  itemId: string;
  qty: number;
  price: number;
};

function shopItemFromCatalog(id: string): ShopItemDef {
  const def = ITEM_CATALOG[id];
  if (!def || !def.icon) {
    throw new Error(`SHOP_CATALOG: item sem ícone ou def: ${id}`);
  }
  return {
    id: def.id,
    name: def.name,
    slot: def.slot,
    rarity: def.rarity,
    desc: def.desc,
    icon: def.icon,
  };
}

function shopItems(ids: string[]): Record<string, ShopItemDef> {
  const out: Record<string, ShopItemDef> = {};
  for (const id of ids) out[id] = shopItemFromCatalog(id);
  return out;
}

const SHOP_ITEM_IDS = [
  "mat_ori",
  "mat_lac",
  "entry_d4",
  "entry_d5",
  "entry_d6",
  "entry_d7",
  "entry_d8",
  "espada_curta",
  "machado_leve",
  "armadura_leve",
  "capacete",
  "anel_cobre",
  "anel_ferro",
  "colar_simples",
  "brinco_osso",
] as const;

export const SHOP_CATALOG: {
  items: Record<string, ShopItemDef>;
  shops: Record<string, { id: string; label: string; slots: ShopSlotDef[] }>;
} = {
  items: shopItems([...SHOP_ITEM_IDS]),
  shops: {
    merchant: {
      id: "merchant",
      label: "Mercador",
      slots: [
        { itemId: "entry_d4", qty: 20, price: 200 },
        { itemId: "entry_d5", qty: 15, price: 350 },
        { itemId: "entry_d6", qty: 12, price: 500 },
        { itemId: "entry_d7", qty: 10, price: 750 },
        { itemId: "entry_d8", qty: 8, price: 1000 },
        { itemId: "mat_ori", qty: 50, price: 25 },
        { itemId: "mat_lac", qty: 10, price: 120 },
      ],
    },
    blacksmith: {
      id: "blacksmith",
      label: "Ferreiro",
      slots: [
        { itemId: "mat_ori", qty: 99, price: 20 },
        { itemId: "mat_lac", qty: 20, price: 100 },
        { itemId: "espada_curta", qty: 3, price: 70 },
        { itemId: "machado_leve", qty: 3, price: 85 },
        { itemId: "armadura_leve", qty: 3, price: 70 },
        { itemId: "capacete", qty: 3, price: 50 },
        { itemId: "anel_cobre", qty: 4, price: 40 },
        { itemId: "anel_ferro", qty: 4, price: 160 },
        { itemId: "colar_simples", qty: 4, price: 45 },
        { itemId: "brinco_osso", qty: 4, price: 35 },
      ],
    },
  },
};

export function shopCatalogForUi(): typeof SHOP_CATALOG {
  const items: Record<string, ShopItemDef> = {};
  for (const [id, item] of Object.entries(SHOP_CATALOG.items)) {
    if (item.icon) items[id] = item;
  }
  const shops: typeof SHOP_CATALOG.shops = {};
  for (const [shopId, shop] of Object.entries(SHOP_CATALOG.shops)) {
    shops[shopId] = {
      ...shop,
      slots: shop.slots.filter((slot) => !!items[slot.itemId]?.icon),
    };
  }
  return { items, shops };
}

export function catalogDef(id: string): ItemCatalogDef | undefined {
  return ITEM_CATALOG[id];
}

export { resolveItemIcon };

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

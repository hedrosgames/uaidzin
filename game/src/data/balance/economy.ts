import { ITEM_CATALOG, resolveItemIcon, type ItemCatalogDef } from "../items/item-catalog";
import rawShops from "./shops.json";

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
  xpChaliceDropChance: 0.1,
  oriShare: 0.75,
  oriUntilDungeon: 4,
  equipStatLevelDivisor: 8,
  weaponAttackMultiplier: 2,
  rarities: ["Comum", "Incomum", "Raro", "Épico", "Lendário"] as const,
  rarityWeights: [50, 28, 14, 6, 2] as const,
  refine: {
    maxLevel: 15,
    successByLevel: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.25, 0.1, 0.2, 0.15, 0.1, 0.1, 0.05, 0.01],
    goldCost: [10, 20, 40, 70, 110, 160, 230, 320, 430, 560, 700, 900, 1200, 1600, 2200],
    bonusBySlot: {
      weapon: { stat: "attack" as const, perLevel: 2 },
      head: { stat: "defense" as const, perLevel: 1 },
      armor: { stat: "defense" as const, perLevel: 1 },
      ring1: { stat: "defense" as const, perLevel: 1 },
      ring2: { stat: "defense" as const, perLevel: 1 },
      neck: { stat: "defense" as const, perLevel: 1 },
      ear: { stat: "defense" as const, perLevel: 1 },
    },
  },
  life: {
    maxTier: 10,
    materialId: "gema_life",
    stepByRarity: [2, 4, 6, 8, 10],
    successByTier: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
  },
  sellValueByRarity: [5, 12, 28, 60, 120],
  equipBaseStat(level: number, rarityIndex: number): number {
    return 1 + Math.floor(level / ECONOMY_BALANCE.equipStatLevelDivisor) + rarityIndex;
  },
  equipDefenseBonus(base: number, rarityIndex: number): number {
    return base + rarityIndex;
  },
} as const;

export const WEAPON_SET_BY_ITEM: Record<string, string> = {
  espada_curta: "sword-shield",
  machado_leve: "axe-shield",
};

export const CLASS_DEFAULT_WEAPON_SET: Record<string, string> = {
  TK: "axe-shield",
  FM: "greatstaff",
  BM: "dual-gloves",
  HT: "dual-sword",
};

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
  price: number;
};

function shopItemFromCatalog(id: string): ShopItemDef {
  const def = ITEM_CATALOG[id];
    if (!def || !def.icon || def.available === false) {
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

function shopItems(): Record<string, ShopItemDef> {
  const out: Record<string, ShopItemDef> = {};
  for (const [id, def] of Object.entries(ITEM_CATALOG)) {
    if (def && def.icon && def.available !== false) {
      out[id] = shopItemFromCatalog(id);
    }
  }
  return out;
}

export const SHOP_CATALOG: {
  items: Record<string, ShopItemDef>;
  shops: Record<string, { id: string; label: string; slots: ShopSlotDef[] }>;
} = {
  items: shopItems(),
  shops: rawShops as Record<string, { id: string; label: string; slots: ShopSlotDef[] }>,
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
  goldPerTier: 28,
  goldCost(index: number): number {
    return (index + 1) * SKILL_TRAINING.goldPerTier;
  },
  canAfford(skillPoints: number, gold: number, pointsCost: number, goldCost: number): boolean {
    return skillPoints >= pointsCost && gold >= goldCost;
  },
};

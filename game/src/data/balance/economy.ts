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


export const PROGRESSION_BALANCE = {
  attributesPerLevel: 5,
  resetAttributePoints: 1000,
  baseAttributes: { FOR: 5, DES: 5, CONS: 5, INT: 5 },
  evolutions: {
    Mortal: { minLevel: 1, maxLevel: 400 },
    Arch: { minLevel: 1, maxLevel: 400 },
    Cele: { minLevel: 1, maxLevel: 200 },
  },
  
  xpToLevel(level: number): number {
    if (level < 20) return 28 + level * 14;
    return 40 + level * 18;
  },
  
  attackFromFor(for_: number): number {
    return 8 + for_;
  },
  maxHpFromCons(cons: number): number {
    return 80 + cons * 4;
  },
  defenseFromCons(cons: number): number {
    return 2 + Math.floor(cons / 4);
  },
  maxMpFromLevelInt(level: number, int: number): number {
    return 50 + level * 8 + int;
  },
} as const;

export type EvolutionId = keyof typeof PROGRESSION_BALANCE.evolutions;

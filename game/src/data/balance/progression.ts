import { xpToLevel as computeXpToLevel } from "./xp-progression";

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
    return computeXpToLevel(level);
  },
  
  attackFromFor(for_: number): number {
    return 8 + for_;
  },
  maxHpFromCons(cons: number): number {
    return 80 + cons * 4;
  },
  defenseFromDes(des: number): number {
    return 2 + Math.floor(des / 4);
  },
  levelGrowthBands: [
    [50, 0.03],
    [100, 0.02],
    [200, 0.01],
    [400, 0.005],
  ] as ReadonlyArray<readonly [number, number]>,
  levelGrowth(level: number): number {
    let growth = 1;
    let from = 1;
    for (const [to, rate] of this.levelGrowthBands) {
      growth += Math.max(0, Math.min(level, to) - from) * rate;
      from = to;
    }
    return growth;
  },
  maxMpFromLevelInt(level: number, int: number): number {
    return 50 + level * 8 + int;
  },
} as const;

export type EvolutionId = keyof typeof PROGRESSION_BALANCE.evolutions;

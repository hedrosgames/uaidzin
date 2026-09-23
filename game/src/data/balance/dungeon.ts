export const DUNGEON_BALANCE = {
  defaultDurationSeconds: 600,
  debugDurationSecondsOverride: null as number | null,
  boss: {
    hpMultiplier: 4,
    attackMultiplier: 1.6,
    defenseBonus: 4,
    respawnSeconds: 180,
  },
  xpPerKill: { fixed: 8, chaser: 12, ranged: 10, boss: 40 },
  d1Ease: {
    hpMultiplier: 0.45,
    attackMultiplier: 0.4,
    defenseMultiplier: 0.5,
  },
} as const;

export function dungeonCombatScale(dungeonId: string): {
  hpMultiplier: number;
  attackMultiplier: number;
  defenseMultiplier: number;
} {
  if (dungeonId === "dungeon-1") {
    return {
      hpMultiplier: DUNGEON_BALANCE.d1Ease.hpMultiplier,
      attackMultiplier: DUNGEON_BALANCE.d1Ease.attackMultiplier,
      defenseMultiplier: DUNGEON_BALANCE.d1Ease.defenseMultiplier,
    };
  }
  return { hpMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1 };
}

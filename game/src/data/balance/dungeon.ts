
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
} as const;

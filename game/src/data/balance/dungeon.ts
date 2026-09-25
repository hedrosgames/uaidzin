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

function mulScale(
  base: { hpMultiplier: number; attackMultiplier: number; defenseMultiplier: number },
  arena: { hpMultiplier: number; attackMultiplier: number; defenseMultiplier: number },
): { hpMultiplier: number; attackMultiplier: number; defenseMultiplier: number } {
  return {
    hpMultiplier: base.hpMultiplier * arena.hpMultiplier,
    attackMultiplier: base.attackMultiplier * arena.attackMultiplier,
    defenseMultiplier: base.defenseMultiplier * arena.defenseMultiplier,
  };
}

export function dungeonArenaScale(
  dungeonId: string,
  arenaIndex: number,
): { hpMultiplier: number; attackMultiplier: number; defenseMultiplier: number } {
  const base = dungeonCombatScale(dungeonId);
  if (dungeonId === "dungeon-1") {
    if (arenaIndex <= 0) return base;
    if (arenaIndex === 1) {
      return mulScale(base, { hpMultiplier: 1.24, attackMultiplier: 1.72, defenseMultiplier: 1.14 });
    }
    return mulScale(base, { hpMultiplier: 1.65, attackMultiplier: 1.55, defenseMultiplier: 1.35 });
  }
  if (dungeonId === "dungeon-2") {
    if (arenaIndex <= 0) return mulScale(base, { hpMultiplier: 0.62, attackMultiplier: 0.58, defenseMultiplier: 0.68 });
    if (arenaIndex === 1) return mulScale(base, { hpMultiplier: 0.82, attackMultiplier: 0.78, defenseMultiplier: 0.8 });
    return mulScale(base, { hpMultiplier: 1.05, attackMultiplier: 1.0, defenseMultiplier: 0.95 });
  }
  if (arenaIndex <= 0) return base;
  if (arenaIndex === 1) return mulScale(base, { hpMultiplier: 1.08, attackMultiplier: 1.06, defenseMultiplier: 1.04 });
  return mulScale(base, { hpMultiplier: 1.22, attackMultiplier: 1.18, defenseMultiplier: 1.12 });
}

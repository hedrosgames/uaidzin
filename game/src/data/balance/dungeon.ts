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
  gateKey: {
    dropChance: 0.2,
    openRadiusZ: 2.6,
    openRadiusX: 3.2,
  },
} as const;

const NO_SCALE = { hpMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1 };

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
  const base = NO_SCALE;
  if (dungeonId === "dungeon-1") return base;
  if (dungeonId === "dungeon-2") {
    if (arenaIndex <= 0) return mulScale(base, { hpMultiplier: 0.62, attackMultiplier: 0.58, defenseMultiplier: 0.68 });
    if (arenaIndex === 1) return mulScale(base, { hpMultiplier: 0.82, attackMultiplier: 0.78, defenseMultiplier: 0.8 });
    return mulScale(base, { hpMultiplier: 1.05, attackMultiplier: 1.0, defenseMultiplier: 0.95 });
  }
  if (arenaIndex <= 0) return base;
  if (arenaIndex === 1) return mulScale(base, { hpMultiplier: 1.08, attackMultiplier: 1.06, defenseMultiplier: 1.04 });
  return mulScale(base, { hpMultiplier: 1.22, attackMultiplier: 1.18, defenseMultiplier: 1.12 });
}

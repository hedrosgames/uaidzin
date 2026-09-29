export const D1_XP_PER_KILL_UNIT = 10;
export const D2_XP_PER_KILL_UNIT = 10;
export const D1_REFERENCE_MOB_XP = D1_XP_PER_KILL_UNIT;
export const D2_REFERENCE_MOB_XP = D2_XP_PER_KILL_UNIT;
export const D1_KILLS_BASE = 4;
export const D2_KILLS_BASE = 100;
export const D2_LEVEL_START = 35;

export const D1_GATE_Z: readonly number[] = [-8, -26];

export function d1BandOffset(level: number): number {
  if (level < 10) return level - 1;
  if (level < 20) return level - 10;
  return level - 20;
}

export function d1KillsForLevelUp(level: number): number {
  return D1_KILLS_BASE * 2 ** d1BandOffset(level);
}

export function d1OptimalArenaForLevel(level: number): number {
  if (level < 10) return 0;
  if (level < 20) return 1;
  return 2;
}

export function dungeon1ArenaFromZ(z: number): number {
  if (z > -8) return 0;
  if (z > -26) return 1;
  return 2;
}

export function d2KillsForLevelUp(level: number): number {
  const step = Math.max(0, level - D2_LEVEL_START);
  return D2_KILLS_BASE * 2 ** step;
}

const D2_CHALICE_PER_LEVEL = [5, 8, 12, 17] as const;

export function d2ChalicesForLevelUp(level: number): number {
  const step = Math.max(0, level - D2_LEVEL_START);
  if (step < D2_CHALICE_PER_LEVEL.length) return D2_CHALICE_PER_LEVEL[step]!;
  let inc = D2_CHALICE_PER_LEVEL[D2_CHALICE_PER_LEVEL.length - 1]!;
  for (let s = D2_CHALICE_PER_LEVEL.length; s <= step; s++) {
    inc += 4 + s;
  }
  return inc;
}

export function xpToLevel(level: number): number {
  if (level >= D2_LEVEL_START) {
    return d2KillsForLevelUp(level) * D2_XP_PER_KILL_UNIT;
  }
  return d1KillsForLevelUp(level) * D1_XP_PER_KILL_UNIT;
}

export function d2ChaliceGrantXp(playerLevel: number): number {
  const need = xpToLevel(playerLevel);
  const chalices = d2ChalicesForLevelUp(playerLevel);
  return Math.max(1, Math.ceil(need / chalices));
}

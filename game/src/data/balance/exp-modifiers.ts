export const GLOBAL_KILL_XP_MULTIPLIER_PRESETS = [0.5, 1, 2, 4] as const;

export type GlobalKillXpMultiplierPreset = (typeof GLOBAL_KILL_XP_MULTIPLIER_PRESETS)[number];

export function applyGlobalKillXpMultiplier(baseXp: number, multiplier: number): number {
  const mul = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return Math.max(0, Math.round(baseXp * mul));
}

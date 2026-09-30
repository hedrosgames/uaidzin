export const GLOBAL_KILL_GOLD_MULTIPLIER_MAX = 2;

export function clampGlobalKillGoldMultiplier(multiplier: number): number {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return 1;
  return Math.min(GLOBAL_KILL_GOLD_MULTIPLIER_MAX, multiplier);
}

export function applyGlobalKillGoldMultiplier(baseGold: number, multiplier: number): number {
  const mul = clampGlobalKillGoldMultiplier(multiplier);
  return Math.max(0, Math.round(baseGold * mul));
}

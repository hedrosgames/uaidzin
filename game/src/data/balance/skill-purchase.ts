import { SKILL_BALANCE } from "./skills";

export const SKILL_PURCHASE_COST_BY_INDEX = [1, 3, 6, 10, 16, 27, 45, 141] as const;

export const SKILL_PURCHASE_SLOT_COUNT = SKILL_PURCHASE_COST_BY_INDEX.length;

export function skillPointsEarnedByLevel(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 0;
  return Math.max(0, Math.floor(level) - 1) * SKILL_BALANCE.pointsPerLevel;
}

export function skillPurchasePointCost(index: number): number {
  if (!Number.isFinite(index) || index < 0 || index >= SKILL_PURCHASE_SLOT_COUNT) return Number.POSITIVE_INFINITY;
  return SKILL_PURCHASE_COST_BY_INDEX[index];
}

export function totalSkillPurchaseCostForTree(): number {
  return SKILL_PURCHASE_COST_BY_INDEX.reduce((sum, n) => sum + n, 0);
}

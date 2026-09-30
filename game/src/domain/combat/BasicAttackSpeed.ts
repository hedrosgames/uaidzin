import { COMBAT_BALANCE } from "../../data/balance/combat";

export function attackSpeedMultiplierToPercent(speedMul: number): number {
  if (!Number.isFinite(speedMul)) return 100;
  return Math.max(0, speedMul * 100);
}

export function basicAttackHitCount(speedPercent: number, random: () => number = Math.random): number {
  const spd = Math.max(0, speedPercent);
  const guaranteed = Math.max(1, Math.floor(spd / 100));
  const remainder = spd % 100;
  const bonus = remainder >= 50 && random() < COMBAT_BALANCE.basicAttackBonusHitChance ? 1 : 0;
  return guaranteed + bonus;
}

export function basicAttackAnimTimeScale(speedMul: number): number {
  const floor = COMBAT_BALANCE.basicAttackSpeedFloor;
  const cap = COMBAT_BALANCE.attackAnimSpeedMax;
  if (!Number.isFinite(speedMul)) return 1;
  return Math.min(cap, Math.max(floor, speedMul));
}

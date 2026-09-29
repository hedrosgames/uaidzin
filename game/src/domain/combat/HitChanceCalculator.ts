import { COMBAT_BALANCE } from "../../data/balance/combat";
import { clampEnemyEvasion } from "../../data/balance/combat-ratings";

export function rollHitSimple(random: () => number = Math.random): boolean {
  return random() >= COMBAT_BALANCE.dodgeChance;
}

export function rollPlayerAttackHits(targetEvasion: number, random: () => number = Math.random): boolean {
  if (!rollHitSimple(random)) return false;
  const evasion = clampEnemyEvasion(targetEvasion);
  if (evasion <= 0) return true;
  return random() >= evasion;
}

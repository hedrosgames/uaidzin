import { COMBAT_BALANCE } from "../../data/balance/combat";

export function rollEnemyStrikeDamage(
  baseDamage: number,
  critChance: number,
  random: () => number = Math.random,
): { damage: number; crit: boolean } {
  const base = Math.max(COMBAT_BALANCE.minDamage, Math.round(baseDamage));
  if (critChance <= 0 || random() >= critChance) {
    return { damage: base, crit: false };
  }
  return {
    damage: Math.max(COMBAT_BALANCE.minDamage, Math.round(base * COMBAT_BALANCE.enemyCritMultiplier)),
    crit: true,
  };
}

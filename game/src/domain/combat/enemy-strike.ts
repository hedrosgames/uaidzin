import { rollCritStrike } from "./crit-strike";

export function rollEnemyStrikeDamage(
  baseDamage: number,
  critChance: number,
  random: () => number = Math.random,
): { damage: number; crit: boolean } {
  return rollCritStrike(baseDamage, critChance, random);
}

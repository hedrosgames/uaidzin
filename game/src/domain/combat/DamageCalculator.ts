import { COMBAT_BALANCE } from "../../data/balance/combat";

export function armorDamageMultiplier(armor: number): number {
  if (!Number.isFinite(armor)) return 1;
  if (armor >= 0) return 100 / (100 + armor);
  return 2 - 100 / (100 - armor);
}

export function mitigatedDamage(rawDamage: number, defense: number): number {
  if (!Number.isFinite(rawDamage) || rawDamage <= 0) return COMBAT_BALANCE.minDamage;
  const scaled = rawDamage * armorDamageMultiplier(defense);
  return Math.max(COMBAT_BALANCE.minDamage, Math.round(scaled));
}

export function calculateDamage(attack: number, defense: number): number {
  return mitigatedDamage(attack, defense);
}

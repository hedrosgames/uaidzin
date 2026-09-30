import { COMBAT_BALANCE } from "../../data/balance/combat";
import { applyElementalResistToDamage } from "../../data/balance/elemental-resistance";
import type { SkillElement } from "../../data/classes/skill-types";

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

export function mitigatedSkillDamage(input: {
  rawDamage: number;
  defense: number;
  defensePierce?: number;
  isMagic: boolean;
  element?: SkillElement;
  elementResist?: number;
}): number {
  const defense = Math.max(0, input.defense * (1 - (input.defensePierce ?? 0)));
  let damage = mitigatedDamage(input.rawDamage, defense);
  if (input.isMagic && (input.elementResist ?? 0) > 0) {
    damage = applyElementalResistToDamage(damage, input.elementResist ?? 0);
  }
  return damage;
}

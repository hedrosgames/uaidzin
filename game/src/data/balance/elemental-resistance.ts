import type { SkillElement } from "../classes/skill-types";

export const ELEMENTAL_RESIST_MAX = 0.5;

export const ELEMENTAL_RESIST_TYPES: readonly SkillElement[] = [
  "holy",
  "fire",
  "ice",
  "lightning",
  "poison",
  "shadow",
  "earth",
  "water",
  "mixed",
];

export type ElementalResistProfile = Partial<Record<SkillElement, number>>;

export function clampElementalResist(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(ELEMENTAL_RESIST_MAX, Math.max(0, value));
}

export function resolveSkillElement(element?: SkillElement): SkillElement | null {
  if (!element || element === "physical") return null;
  return element;
}

export function totalElementalResist(
  element: SkillElement | undefined,
  profile: ElementalResistProfile | undefined,
  allElementsBonus = 0,
): number {
  const key = resolveSkillElement(element);
  if (!key) return 0;
  const specific = profile?.[key] ?? 0;
  return clampElementalResist(allElementsBonus + specific);
}

export function applyElementalResistToDamage(damage: number, resist: number): number {
  const r = clampElementalResist(resist);
  if (r <= 0) return damage;
  return Math.max(1, Math.round(damage * (1 - r)));
}

import { SKILL_BALANCE } from "../../data/balance/skills";
import type { TreeId } from "../../data/classes/class-definitions";

export function specializationEffectiveness(specPoints: number): number {
  const cap = SKILL_BALANCE.specializationPerTreeCap;
  const capped = Math.min(Math.max(0, specPoints), cap);
  const maxBonus = SKILL_BALANCE.specializationEffectivenessMaxBonus;
  return 1 + (capped / cap) * maxBonus;
}

export function specializationEffectivenessForTree(
  tree: TreeId,
  specialization: Record<"controle" | "magia" | "fisica", number>,
): number {
  if (tree === "livro") return 1;
  return specializationEffectiveness(specialization[tree]);
}

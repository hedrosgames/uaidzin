import { describe, expect, it } from "vitest";
import { SKILL_BALANCE } from "../../data/balance/skills";
import { specializationEffectiveness } from "./specialization-power";

describe("specializationEffectiveness", () => {
  it("sem pontos mantém 100% de efetividade", () => {
    expect(specializationEffectiveness(0)).toBe(1);
  });

  it("no cap aplica +300% (4× dano/cura/buff)", () => {
    const cap = SKILL_BALANCE.specializationPerTreeCap;
    expect(specializationEffectiveness(cap)).toBe(1 + SKILL_BALANCE.specializationEffectivenessMaxBonus);
    expect(Math.round(100 * specializationEffectiveness(cap))).toBe(400);
  });

  it("escala linearmente até o cap", () => {
    const half = SKILL_BALANCE.specializationPerTreeCap / 2;
    expect(specializationEffectiveness(half)).toBe(1 + SKILL_BALANCE.specializationEffectivenessMaxBonus / 2);
  });
});

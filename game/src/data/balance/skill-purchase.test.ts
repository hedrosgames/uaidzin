import { describe, expect, it } from "vitest";
import {
  skillPointsEarnedByLevel,
  skillPurchasePointCost,
  SKILL_PURCHASE_COST_BY_INDEX,
  totalSkillPurchaseCostForTree,
} from "./skill-purchase";

describe("skill-purchase", () => {
  it("oito slots somam os pontos do nivel 250", () => {
    expect(totalSkillPurchaseCostForTree()).toBe(skillPointsEarnedByLevel(250));
    expect(SKILL_PURCHASE_COST_BY_INDEX.reduce((a, b) => a + b, 0)).toBe(249);
  });

  it("primeira skill custa 1 ponto", () => {
    expect(skillPurchasePointCost(0)).toBe(1);
  });

  it("oitava skill custa o restante da arvore", () => {
    const firstSeven = SKILL_PURCHASE_COST_BY_INDEX.slice(0, 7).reduce((a, b) => a + b, 0);
    expect(skillPurchasePointCost(7)).toBe(249 - firstSeven);
  });
});

import { describe, expect, it } from "vitest";
import { mitigatedSkillDamage } from "./DamageCalculator";

describe("mitigatedSkillDamage", () => {
  it("magia usa defesa e depois resistência elemental", () => {
    const noRes = mitigatedSkillDamage({
      rawDamage: 200,
      defense: 100,
      isMagic: true,
      element: "fire",
      elementResist: 0,
    });
    const halfRes = mitigatedSkillDamage({
      rawDamage: 200,
      defense: 100,
      isMagic: true,
      element: "fire",
      elementResist: 0.5,
    });
    expect(halfRes).toBe(Math.round(noRes * 0.5));
  });

  it("skill física ignora resistência elemental", () => {
    const dmg = mitigatedSkillDamage({
      rawDamage: 100,
      defense: 0,
      isMagic: false,
      element: "fire",
      elementResist: 0.5,
    });
    expect(dmg).toBe(100);
  });
});

import { describe, expect, it } from "vitest";
import { COMBAT_RATING_CAPS } from "../../data/balance/combat-ratings";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import { rollPlayerAttackHits } from "./HitChanceCalculator";

describe("rollPlayerAttackHits", () => {
  it("respeita evasão do monstro após o miss global", () => {
    let i = 0;
    const seq = [1, 0.05, 0.05];
    const random = () => seq[Math.min(i++, seq.length - 1)];
    expect(rollPlayerAttackHits(0.1, random)).toBe(true);
    i = 0;
    const missGlobal = () => (i++ === 0 ? COMBAT_BALANCE.dodgeChance - 0.01 : 0);
    expect(rollPlayerAttackHits(0, missGlobal)).toBe(false);
  });

  it("evasão acima do teto de monstro é tratada no clamp", () => {
    let calls = 0;
    const random = () => {
      calls += 1;
      if (calls === 1) return 1;
      return 0.05;
    };
    expect(rollPlayerAttackHits(0.5, random)).toBe(true);
    expect(COMBAT_RATING_CAPS.enemyEvasion).toBe(0.1);
  });
});

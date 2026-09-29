import { describe, expect, it } from "vitest";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import { rollCritStrike } from "./crit-strike";

describe("rollCritStrike", () => {
  it("crítico dobra o dano", () => {
    let i = 0;
    const random = () => (i++ === 0 ? 0 : 1);
    const hit = rollCritStrike(11, 0.25, random);
    expect(hit.crit).toBe(true);
    expect(hit.damage).toBe(11 * COMBAT_BALANCE.critMultiplier);
  });
});

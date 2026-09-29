import { describe, expect, it } from "vitest";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import { rollCritStrike } from "./crit-strike";

describe("rollCritStrike no golpe do monstro", () => {
  it("crítico dobra o dano", () => {
    let i = 0;
    const random = () => (i++ === 0 ? 0 : 1);
    const hit = rollCritStrike(10, 0.5, random);
    expect(hit.crit).toBe(true);
    expect(hit.damage).toBe(10 * COMBAT_BALANCE.critMultiplier);
  });

  it("sem crítico mantém o dano base", () => {
    const hit = rollCritStrike(12, 0.1, () => 0.5);
    expect(hit.crit).toBe(false);
    expect(hit.damage).toBe(12);
  });
});

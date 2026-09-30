import { describe, expect, it } from "vitest";
import { applyGlobalKillXpMultiplier } from "./exp-modifiers";

describe("applyGlobalKillXpMultiplier", () => {
  it("aplica presets sem alterar o XP base do mob", () => {
    expect(applyGlobalKillXpMultiplier(10, 1)).toBe(10);
    expect(applyGlobalKillXpMultiplier(10, 0.5)).toBe(5);
    expect(applyGlobalKillXpMultiplier(10, 2)).toBe(20);
    expect(applyGlobalKillXpMultiplier(10, 4)).toBe(40);
  });

  it("ignora multiplicador inválido", () => {
    expect(applyGlobalKillXpMultiplier(10, 0)).toBe(10);
    expect(applyGlobalKillXpMultiplier(10, Number.NaN)).toBe(10);
  });
});

import { describe, expect, it } from "vitest";
import {
  GLOBAL_KILL_GOLD_MULTIPLIER_MAX,
  applyGlobalKillGoldMultiplier,
  clampGlobalKillGoldMultiplier,
} from "./gold-modifiers";

describe("gold-modifiers", () => {
  it("limita multiplicador em 2x", () => {
    expect(clampGlobalKillGoldMultiplier(1)).toBe(1);
    expect(clampGlobalKillGoldMultiplier(2)).toBe(2);
    expect(clampGlobalKillGoldMultiplier(4)).toBe(GLOBAL_KILL_GOLD_MULTIPLIER_MAX);
  });

  it("escala ouro de kill sem alterar a tabela base", () => {
    expect(applyGlobalKillGoldMultiplier(15, 1)).toBe(15);
    expect(applyGlobalKillGoldMultiplier(15, 2)).toBe(30);
  });
});

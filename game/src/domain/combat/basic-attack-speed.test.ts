import { describe, expect, it } from "vitest";
import {
  attackSpeedMultiplierToPercent,
  basicAttackAnimTimeScale,
  basicAttackHitCount,
} from "./BasicAttackSpeed";

describe("basicAttackHitCount", () => {
  it("100% = 1 golpe de dano", () => {
    expect(basicAttackHitCount(100, () => 0)).toBe(1);
  });

  it("150% = 1 golpe + 20% de +1", () => {
    expect(basicAttackHitCount(150, () => 1)).toBe(1);
    expect(basicAttackHitCount(150, () => 0.1)).toBe(2);
  });

  it("200% = 2 golpes", () => {
    expect(basicAttackHitCount(200, () => 0)).toBe(2);
  });

  it("250% = 2 golpes + chance de +1", () => {
    expect(basicAttackHitCount(250, () => 1)).toBe(2);
    expect(basicAttackHitCount(250, () => 0.1)).toBe(3);
  });

  it("400% = 4 golpes", () => {
    expect(basicAttackHitCount(400, () => 0)).toBe(4);
  });
});

describe("basicAttackAnimTimeScale", () => {
  it("limita animação em 150%", () => {
    expect(basicAttackAnimTimeScale(1)).toBe(1);
    expect(basicAttackAnimTimeScale(2)).toBe(1.5);
    expect(basicAttackAnimTimeScale(4)).toBe(1.5);
  });

  it("converte multiplicador em percentual", () => {
    expect(attackSpeedMultiplierToPercent(2)).toBe(200);
  });
});

import { describe, expect, it } from "vitest";
import {
  ELEMENTAL_RESIST_MAX,
  applyElementalResistToDamage,
  totalElementalResist,
} from "./elemental-resistance";

describe("elemental-resistance", () => {
  it("limita redução em 50%", () => {
    expect(totalElementalResist("fire", { fire: 0.8 })).toBe(ELEMENTAL_RESIST_MAX);
    expect(applyElementalResistToDamage(100, 0.5)).toBe(50);
    expect(applyElementalResistToDamage(100, 0.9)).toBe(50);
  });

  it("soma bônus global e por elemento", () => {
    expect(totalElementalResist("ice", { ice: 0.2 }, 0.15)).toBe(0.35);
  });

  it("físico não usa resistência elemental", () => {
    expect(totalElementalResist("physical", { fire: 1 })).toBe(0);
  });
});

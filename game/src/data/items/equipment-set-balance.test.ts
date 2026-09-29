import { describe, expect, it } from "vitest";
import {
  armorPrimaryDefense,
  gearPowerTier,
  refineSuccessMultiplier,
  weaponPrimaryAttack,
} from "./equipment-set-balance";

describe("equivalência entre sets", () => {
  it("set 2 comum = set 1 épico", () => {
    const t1 = gearPowerTier(1, "Épico");
    const t2 = gearPowerTier(2, "Comum");
    expect(t2).toBe(t1);
    expect(weaponPrimaryAttack(t2)).toBe(weaponPrimaryAttack(t1));
  });

  it("set 3 comum = set 2 épico", () => {
    const t2 = gearPowerTier(2, "Épico");
    const t3 = gearPowerTier(3, "Comum");
    expect(t3).toBe(t2);
    expect(armorPrimaryDefense(t3)).toBe(armorPrimaryDefense(t2));
  });
});

describe("refino por set", () => {
  it("set 2 é 20% mais difícil e set 3 50% mais difícil", () => {
    expect(refineSuccessMultiplier(1)).toBe(1);
    expect(refineSuccessMultiplier(2)).toBe(0.8);
    expect(refineSuccessMultiplier(3)).toBe(0.5);
  });
});

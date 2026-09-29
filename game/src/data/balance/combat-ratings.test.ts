import { describe, expect, it } from "vitest";
import { emptyMods } from "../../domain/combat/CombatMods";
import {
  COMBAT_RATING_CAPS,
  FULL_DES_AT_MAX_LEVEL,
  applyPlayerCombatRatings,
  critChanceFromDes,
  evasionFromDes,
} from "./combat-ratings";
import { PROGRESSION_BALANCE } from "./progression";

describe("combat-ratings", () => {
  const baseDes = PROGRESSION_BALANCE.baseAttributes.DES;

  it("DES base não dá crítico nem evasão", () => {
    expect(critChanceFromDes(baseDes)).toBe(0);
    expect(evasionFromDes(baseDes)).toBe(0);
  });

  it("full DES no nível 400 atinge tetos de atributo", () => {
    expect(FULL_DES_AT_MAX_LEVEL).toBe(2000);
    expect(critChanceFromDes(FULL_DES_AT_MAX_LEVEL)).toBeCloseTo(COMBAT_RATING_CAPS.critFromDes, 5);
    expect(evasionFromDes(FULL_DES_AT_MAX_LEVEL)).toBeCloseTo(COMBAT_RATING_CAPS.evasionFromDes, 5);
  });

  it("crítico de DES sobe devagar no meio da curva", () => {
    const midDes = baseDes + (FULL_DES_AT_MAX_LEVEL - baseDes) / 2;
    const linearHalf = COMBAT_RATING_CAPS.critFromDes * 0.5;
    expect(critChanceFromDes(midDes)).toBeLessThan(linearHalf);
    expect(critChanceFromDes(midDes)).toBeGreaterThan(linearHalf * 0.5);
  });

  it("aplica cap global de crítico e evasão", () => {
    const mods = emptyMods();
    mods.critChance = 0.9;
    mods.evasion = 0.35;
    applyPlayerCombatRatings(mods, { des: FULL_DES_AT_MAX_LEVEL, equipCritPercent: 30 });
    expect(mods.critChance).toBe(COMBAT_RATING_CAPS.critChance);
    expect(mods.evasion).toBe(COMBAT_RATING_CAPS.evasion);
  });

  it("equip crítico soma antes do cap", () => {
    const mods = emptyMods();
    applyPlayerCombatRatings(mods, { des: baseDes, equipCritPercent: 15 });
    expect(mods.critChance).toBe(0.15);
  });
});

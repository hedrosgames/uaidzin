import { describe, expect, it } from "vitest";
import {
  attackFromAttributes,
  defenseFromAttributes,
  magicAttackFromInt,
  attackSpeedFromDes,
  maxHpFromCons,
} from "./attribute-stats";
import { PROGRESSION_BALANCE } from "./progression";

describe("atributos iguais para todas as classes", () => {
  it("FOR +1 atk, DES +0.5 atk/def e +0.25 spd, INT +1 mg, CON +3 HP", () => {
    expect(attackFromAttributes(10, 0)).toBe(10);
    expect(attackFromAttributes(0, 10)).toBe(5);
    expect(defenseFromAttributes(10)).toBe(5);
    expect(magicAttackFromInt(12)).toBe(12);
    expect(attackSpeedFromDes(8)).toBe(2);
    expect(maxHpFromCons(5)).toBe(85 + 15);
  });

  it("progression delega às mesmas regras", () => {
    expect(PROGRESSION_BALANCE.attackFromAttributes(7, 4)).toBe(9);
    expect(PROGRESSION_BALANCE.defenseFromAttributes(6)).toBe(3);
    expect(PROGRESSION_BALANCE.magicAttackFromInt(9)).toBe(9);
    expect(PROGRESSION_BALANCE.maxHpFromCons(10)).toBe(115);
  });
});

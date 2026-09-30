import { describe, expect, it } from "vitest";
import { refinePrimaryBonus, itemSecondaryBonuses } from "./equip-stat-rules";
import type { ItemInstance } from "./ItemModel";

function item(partial: Partial<ItemInstance>): ItemInstance {
  return {
    uid: "x",
    defId: "test",
    name: "Test",
    rarity: "Comum",
    slot: "weapon",
    refine: 3,
    attackBonus: 8,
    defenseBonus: 0,
    stack: 1,
    sellValue: 1,
    critBonus: 5,
    speedBonus: 3,
    ...partial,
  };
}

describe("refino só em atributo primário", () => {
  it("arma: refino soma ataque, não crit/vel", () => {
    const w = item({ slot: "weapon", refine: 2 });
    expect(refinePrimaryBonus(w).attack).toBe(4);
    expect(refinePrimaryBonus(w).defense).toBe(0);
    const sec = itemSecondaryBonuses(w);
    expect(sec.crit).toBe(5);
    expect(sec.speed).toBe(3);
  });

  it("anel: refino em defesa primária não mexe em secundário", () => {
    const ring = item({
      slot: "ring1",
      attackBonus: 0,
      defenseBonus: 4,
      secondaryAttack: 2,
      refine: 1,
    });
    expect(refinePrimaryBonus(ring).defense).toBe(1);
    expect(itemSecondaryBonuses(ring).attack).toBe(2);
  });
});

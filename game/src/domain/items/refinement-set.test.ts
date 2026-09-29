import { describe, expect, it } from "vitest";
import { InventoryService } from "../inventory/InventoryService";
import { RefinementService } from "./RefinementService";
import type { ItemInstance } from "./ItemModel";

function weapon(gearSet: 1 | 2 | 3): ItemInstance {
  return {
    uid: "w",
    defId: `weapon_gear${gearSet}_comum`,
    name: "Arma",
    rarity: "Comum",
    slot: "weapon",
    refine: 0,
    attackBonus: 8,
    defenseBonus: 0,
    stack: 1,
    sellValue: 1,
    gearSet,
  };
}

describe("RefinementService gear set", () => {
  it("set 3 falha mais que set 1 no mesmo roll", () => {
    const inv = new InventoryService();
    inv.gold = 1_000_000;
    inv.items.push({ uid: "m", defId: "mat_ori", name: "Ori", rarity: "Comum", slot: "material", refine: 0, attackBonus: 0, defenseBonus: 0, stack: 99, sellValue: 1 });
    const refine = new RefinementService(inv);
    const s1 = weapon(1);
    const s3 = weapon(3);
    let ok1 = 0;
    let ok3 = 0;
    for (let i = 0; i < 200; i++) {
      s1.refine = 0;
      s3.refine = 0;
      inv.gold = 1_000_000;
      if (refine.refine(s1, () => 0.5).ok) ok1++;
      if (refine.refine(s3, () => 0.5).ok) ok3++;
    }
    expect(ok1).toBeGreaterThan(ok3);
  });
});

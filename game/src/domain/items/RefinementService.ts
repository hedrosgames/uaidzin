import { ECONOMY_BALANCE } from "../../data/balance/economy";
import type { InventoryService } from "../inventory/InventoryService";
import type { ItemInstance } from "./ItemModel";


export class RefinementService {
  constructor(private readonly inventory: InventoryService) {}

  canRefine(item: ItemInstance): boolean {
    const next = item.refine + 1;
    if (next > ECONOMY_BALANCE.refine.maxLevel) return false;
    const gold = ECONOMY_BALANCE.refine.goldCost[item.refine];
    const mat = next >= ECONOMY_BALANCE.refine.materialTierSwitchAt ? "mat_lac" : "mat_ori";
    return this.inventory.gold >= gold && this.inventory.countMaterial(mat) >= 1;
  }

  refine(item: ItemInstance, random: () => number = Math.random): { ok: boolean; costGold: number; mat: string } {
    const next = item.refine + 1;
    if (next > ECONOMY_BALANCE.refine.maxLevel) return { ok: false, costGold: 0, mat: "" };
    const costGold = ECONOMY_BALANCE.refine.goldCost[item.refine];
    const mat = next >= ECONOMY_BALANCE.refine.materialTierSwitchAt ? "mat_lac" : "mat_ori";
    if (this.inventory.gold < costGold || this.inventory.countMaterial(mat) < 1) {
      return { ok: false, costGold, mat };
    }
    this.inventory.gold -= costGold;
    this.inventory.consumeMaterial(mat, 1);
    const chance = ECONOMY_BALANCE.refine.successByLevel[item.refine];
    if (random() <= chance) {
      item.refine = next;
      item.attackBonus += 1;
      item.defenseBonus += 1;
      return { ok: true, costGold, mat };
    }

    return { ok: false, costGold, mat };
  }
}

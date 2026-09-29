import { ECONOMY_BALANCE } from "../../data/balance/economy";
import type { InventoryService } from "../inventory/InventoryService";
import type { ItemInstance } from "./ItemModel";

export class RefinementService {
  constructor(private readonly inventory: InventoryService) {}

  private isValidRefinementTarget(item: ItemInstance): boolean {
    return ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"].includes(item.slot) &&
      Number.isInteger(item.refine) && item.refine >= 0;
  }

  private materialForNextLevel(nextLevel: number): string {
    if (nextLevel <= 6) return "mat_ori";
    if (nextLevel <= 9) return "mat_lac";
    if (nextLevel <= 12) return "gema_bless";
    return "gema_soul";
  }

  canRefine(item: ItemInstance): boolean {
    if (!this.isValidRefinementTarget(item)) return false;
    const next = item.refine + 1;
    if (next > ECONOMY_BALANCE.refine.maxLevel) return false;
    const gold = ECONOMY_BALANCE.refine.goldCost[item.refine];
    if (!Number.isFinite(gold) || gold < 0) return false;
    const mat = this.materialForNextLevel(next);
    return this.inventory.gold >= gold && this.inventory.countMaterial(mat) >= 1;
  }

  refine(item: ItemInstance, random: () => number = Math.random): { ok: boolean; costGold: number; mat: string } {
    if (!this.isValidRefinementTarget(item)) return { ok: false, costGold: 0, mat: "" };
    const next = item.refine + 1;
    if (next > ECONOMY_BALANCE.refine.maxLevel) return { ok: false, costGold: 0, mat: "" };
    const costGold = ECONOMY_BALANCE.refine.goldCost[item.refine];
    if (!Number.isFinite(costGold) || costGold < 0) return { ok: false, costGold: 0, mat: "" };
    const mat = this.materialForNextLevel(next);
    if (this.inventory.gold < costGold || this.inventory.countMaterial(mat) < 1) {
      return { ok: false, costGold, mat };
    }
    this.inventory.gold -= costGold;
    this.inventory.consumeMaterial(mat, 1);
    const chance = ECONOMY_BALANCE.refine.successByLevel[item.refine];
    if (random() <= chance) {
      item.refine = next;
      return { ok: true, costGold, mat };
    }

    return { ok: false, costGold, mat };
  }
}

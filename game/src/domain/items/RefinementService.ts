import { ECONOMY_BALANCE } from "../../data/balance/economy";
import { refineSuccessMultiplier } from "../../data/items/equipment-set-balance";
import { gearSetForItem } from "./equip-stat-rules";
import { lifeSuccessChance } from "./item-life";
import type { InventoryService } from "../inventory/InventoryService";
import type { ItemInstance } from "./ItemModel";

export class RefinementService {
  constructor(private readonly inventory: InventoryService) {}

  private isValidRefinementTarget(item: ItemInstance): boolean {
    return ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"].includes(item.slot) &&
      Number.isInteger(item.refine) && item.refine >= 0;
  }

  materialForNextLevel(nextLevel: number): string {
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
    const chance = this.refineChance(item);
    if (random() <= chance) {
      item.refine = next;
      return { ok: true, costGold, mat };
    }

    return { ok: false, costGold, mat };
  }

  private refineChance(item: ItemInstance): number {
    const base = ECONOMY_BALANCE.refine.successByLevel[item.refine];
    return Math.min(1, base * refineSuccessMultiplier(gearSetForItem(item)));
  }

  refineWithMaterial(
    item: ItemInstance,
    materialDefId: string,
    random: () => number = Math.random,
    options?: { skipGold?: boolean },
  ): { ok: boolean; mat: string; kind: "refine" | "life" | "none" } {
    if (materialDefId === ECONOMY_BALANCE.life.materialId) {
      const lifeRes = this.applyLife(item, random);
      return { ok: lifeRes.ok, mat: materialDefId, kind: lifeRes.ok || lifeRes.consumed ? "life" : "none" };
    }
    if (!this.isValidRefinementTarget(item)) return { ok: false, mat: materialDefId, kind: "none" };
    const next = item.refine + 1;
    if (next > ECONOMY_BALANCE.refine.maxLevel) return { ok: false, mat: materialDefId, kind: "none" };
    const expected = this.materialForNextLevel(next);
    if (materialDefId !== expected) return { ok: false, mat: materialDefId, kind: "none" };
    if (this.inventory.countMaterial(materialDefId) < 1) return { ok: false, mat: materialDefId, kind: "none" };
    const skipGold = options?.skipGold === true;
    const costGold = ECONOMY_BALANCE.refine.goldCost[item.refine];
    if (!skipGold) {
      if (!Number.isFinite(costGold) || costGold < 0 || this.inventory.gold < costGold) {
        return { ok: false, mat: materialDefId, kind: "none" };
      }
      this.inventory.gold -= costGold;
    }
    this.inventory.consumeMaterial(materialDefId, 1);
    const chance = this.refineChance(item);
    if (random() <= chance) {
      item.refine = next;
      return { ok: true, mat: materialDefId, kind: "refine" };
    }
    return { ok: false, mat: materialDefId, kind: "refine" };
  }

  applyLife(item: ItemInstance, random: () => number = Math.random): { ok: boolean; consumed: boolean } {
    if (!this.isValidRefinementTarget(item)) return { ok: false, consumed: false };
    const life = item.life || 0;
    if (life >= ECONOMY_BALANCE.life.maxTier) return { ok: false, consumed: false };
    const mat = ECONOMY_BALANCE.life.materialId;
    if (this.inventory.countMaterial(mat) < 1) return { ok: false, consumed: false };
    this.inventory.consumeMaterial(mat, 1);
    const chance = lifeSuccessChance(life) * refineSuccessMultiplier(gearSetForItem(item));
    if (random() <= chance) {
      item.life = life + 1;
      return { ok: true, consumed: true };
    }
    return { ok: false, consumed: true };
  }
}

import { getComposeRecipe, type ComposeRecipeDef } from "../../data/composer/compose-formulas";
import type { InventoryService } from "../inventory/InventoryService";
import type { EquipmentService } from "./EquipmentService";
import type { ItemInstance } from "./ItemModel";

export type ComposeAttempt = {
  attempted: boolean;
  success: boolean;
  message: string;
  recipeId: string;
};

const EQUIP_SLOTS = new Set([
  "weapon",
  "head",
  "armor",
  "ring1",
  "ring2",
  "neck",
  "ear",
]);

export class CompositionService {
  constructor(
    private readonly inventory: InventoryService,
    private readonly equipment: EquipmentService,
  ) {}

  listEligible(recipeId: string): ItemInstance[] {
    const recipe = getComposeRecipe(recipeId);
    if (!recipe) return [];
    return this.allEquipItems().filter((it) => this.isEligible(it, recipe));
  }

  canAttempt(recipeId: string, itemUid: string): { ok: boolean; message: string } {
    const recipe = getComposeRecipe(recipeId);
    if (!recipe) return { ok: false, message: "Receita desconhecida." };
    const item = this.findItem(itemUid);
    if (!item) return { ok: false, message: "Item não encontrado." };
    if (!this.isEligible(item, recipe)) {
      return { ok: false, message: "Item não elegível para esta composição." };
    }
    if (this.inventory.countMaterial(recipe.materialId) < recipe.materialQty) {
      return { ok: false, message: "Material insuficiente." };
    }
    if (!Number.isFinite(recipe.goldCost) || recipe.goldCost < 0 || this.inventory.gold < recipe.goldCost) {
      return { ok: false, message: "Ouro insuficiente." };
    }
    return { ok: true, message: "" };
  }

  compose(
    recipeId: string,
    itemUid: string,
    random: () => number = Math.random,
  ): ComposeAttempt {
    const recipe = getComposeRecipe(recipeId);
    if (!recipe) {
      return { attempted: false, success: false, message: "Receita desconhecida.", recipeId };
    }
    const gate = this.canAttempt(recipeId, itemUid);
    if (!gate.ok) {
      return { attempted: false, success: false, message: gate.message, recipeId };
    }
    const item = this.findItem(itemUid);
    if (!item) {
      return { attempted: false, success: false, message: "Item não encontrado.", recipeId };
    }

    this.inventory.gold -= recipe.goldCost;
    this.inventory.consumeMaterial(recipe.materialId, recipe.materialQty);

    if (random() < recipe.successChance) {
      item.refine = recipe.targetRefine;
      this.equipment.onItemRefined(item);
      return {
        attempted: true,
        success: true,
        message: `${item.name} ficou +${recipe.targetRefine}.`,
        recipeId,
      };
    }

    return {
      attempted: true,
      success: false,
      message: "Composição falhou. Materiais e ouro consumidos.",
      recipeId,
    };
  }

  private isEligible(item: ItemInstance, recipe: ComposeRecipeDef): boolean {
    if (!EQUIP_SLOTS.has(item.slot)) return false;
    return item.refine < recipe.maxCurrentRefineExclusive;
  }

  private findItem(uid: string): ItemInstance | null {
    const bag = this.inventory.items.find((i) => i.uid === uid);
    if (bag) return bag;
    for (const item of Object.values(this.equipment.equipped)) {
      if (item && item.uid === uid) return item;
    }
    return null;
  }

  private allEquipItems(): ItemInstance[] {
    const out: ItemInstance[] = [];
    for (const it of this.inventory.items) {
      if (EQUIP_SLOTS.has(it.slot)) out.push(it);
    }
    for (const it of Object.values(this.equipment.equipped)) {
      if (it) out.push(it);
    }
    return out;
  }
}

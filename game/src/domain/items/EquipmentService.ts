import type { ItemInstance } from "./ItemModel";
import type { InventoryService } from "../inventory/InventoryService";
import type { CharacterModel } from "../character/CharacterModel";

export type EquipSlot = "weapon" | "head" | "armor" | "ring1" | "ring2" | "neck" | "ear";

export class EquipmentService {
  readonly equipped: Partial<Record<EquipSlot, ItemInstance>> = {};

  constructor(
    private readonly inventory: InventoryService,
    private readonly character: CharacterModel,
  ) {}

  equip(uid: string): boolean {
    const item = this.inventory.items.find((i) => i.uid === uid);
    if (!item) return false;
    const slot = item.slot as EquipSlot;
    if (!this.isEquipSlot(item.slot)) return false;

    const current = this.equipped[slot];

    if (current) {
      const ok = this.inventory.add(current);
      if (!ok) return false;
      delete this.equipped[slot];
    }

    this.inventory.remove(uid);
    this.equipped[slot] = item;
    this.recalcEquipBonus();
    return true;
  }

  unequip(slot: EquipSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;
    const ok = this.inventory.add(item);
    if (!ok) return false;
    delete this.equipped[slot];
    this.recalcEquipBonus();
    return true;
  }

  private isEquipSlot(slot: string): slot is EquipSlot {
    return ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"].includes(slot);
  }

  /**
   * Recalcula o bônus total a partir do que está equipado agora.
   * Declarar o total (em vez de somar/subtrair incrementos) impede que um
   * remove sem o apply correspondente deixe o personagem abaixo do base.
   */
  private recalcEquipBonus(): void {
    let attack = 0;
    let defense = 0;
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      const item = this.equipped[slot];
      if (!item) continue;
      attack += item.attackBonus + item.refine;
      defense += item.defenseBonus + item.refine;
    }
    this.character.equipAttack = attack;
    this.character.equipDefense = defense;
  }

  onItemRefined(_item: ItemInstance): void {
    this.recalcEquipBonus();
  }

  restoreEquipped(equipped: Partial<Record<EquipSlot, ItemInstance>>): void {
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      delete this.equipped[slot];
    }
    for (const slot of Object.keys(equipped) as EquipSlot[]) {
      const item = equipped[slot];
      if (!item) continue;
      this.equipped[slot] = { ...item };
    }
    this.recalcEquipBonus();
  }

  snapshotEquipped(): Partial<Record<EquipSlot, ItemInstance>> {
    const out: Partial<Record<EquipSlot, ItemInstance>> = {};
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      const item = this.equipped[slot];
      if (item) out[slot] = { ...item };
    }
    return out;
  }
}

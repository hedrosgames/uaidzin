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
      this.removeBonus(current);
      const ok = this.inventory.add(current);
      if (!ok) return false;
      delete this.equipped[slot];
    }

    this.inventory.remove(uid);
    this.equipped[slot] = item;
    this.applyBonus(item);
    return true;
  }

  unequip(slot: EquipSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;
    const ok = this.inventory.add(item);
    if (!ok) return false;
    this.removeBonus(item);
    delete this.equipped[slot];
    return true;
  }

  private isEquipSlot(slot: string): slot is EquipSlot {
    return ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"].includes(slot);
  }

  private applyBonus(item: ItemInstance): void {
    const refineBonus = item.refine;
    this.character.attack += item.attackBonus + refineBonus;
    this.character.defense += item.defenseBonus + refineBonus;
  }

  private removeBonus(item: ItemInstance): void {
    const refineBonus = item.refine;
    this.character.attack -= item.attackBonus + refineBonus;
    this.character.defense -= item.defenseBonus + refineBonus;
  }

  onItemRefined(item: ItemInstance): void {
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      if (this.equipped[slot]?.uid === item.uid) {
        this.character.attack += 1;
        this.character.defense += 1;
      }
    }
  }

  restoreEquipped(equipped: Partial<Record<EquipSlot, ItemInstance>>): void {
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      const item = this.equipped[slot];
      if (item) this.removeBonus(item);
      delete this.equipped[slot];
    }
    for (const slot of Object.keys(equipped) as EquipSlot[]) {
      const item = equipped[slot];
      if (!item) continue;
      this.equipped[slot] = { ...item };
      this.applyBonus(this.equipped[slot]!);
    }
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

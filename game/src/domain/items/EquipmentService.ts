import {
  CLASS_DEFAULT_WEAPON_SET,
  ECONOMY_BALANCE,
  WEAPON_SET_BY_ITEM,
} from "../../data/balance/economy";
import type { ItemInstance } from "./ItemModel";
import type { InventoryService } from "../inventory/InventoryService";
import type { CharacterModel } from "../character/CharacterModel";

export type EquipSlot = "weapon" | "head" | "armor" | "ring1" | "ring2" | "neck" | "ear";

export class EquipmentService {
  readonly equipped: Partial<Record<EquipSlot, ItemInstance>> = {};
  weaponSet = "axe-shield";

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

    this.inventory.remove(uid);
    if (current) {
      const res = this.inventory.add(current);
      if (!res.ok) {
        this.inventory.add(item);
        return false;
      }
      delete this.equipped[slot];
    }

    this.equipped[slot] = item;
    this.recalcEquipBonus();
    return true;
  }

  unequip(slot: EquipSlot): { ok: boolean; reason?: "inventory_full" | "slot_empty" } {
    const item = this.equipped[slot];
    if (!item) return { ok: false, reason: "slot_empty" };
    const res = this.inventory.add(item);
    if (!res.ok) {
      return { ok: false, reason: "inventory_full" };
    }
    delete this.equipped[slot];
    this.recalcEquipBonus();
    return { ok: true };
  }

  discardEquipped(slot: EquipSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;
    delete this.equipped[slot];
    this.recalcEquipBonus();
    return true;
  }

  swapSlots(slotA: EquipSlot, slotB: EquipSlot): boolean {
    if (!this.isEquipSlot(slotA) || !this.isEquipSlot(slotB)) return false;
    const itemA = this.equipped[slotA];
    const itemB = this.equipped[slotB];
    if (!itemA && !itemB) return false;
    if (itemA && itemA.slot !== slotB && !(itemA.slot.startsWith("ring") && slotB.startsWith("ring"))) return false;
    if (itemB && itemB.slot !== slotA && !(itemB.slot.startsWith("ring") && slotA.startsWith("ring"))) return false;
    if (itemA) this.equipped[slotB] = itemA;
    else delete this.equipped[slotB];
    if (itemB) this.equipped[slotA] = itemB;
    else delete this.equipped[slotA];
    this.recalcEquipBonus();
    return true;
  }

  private isEquipSlot(slot: string): slot is EquipSlot {
    return ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"].includes(slot);
  }

  getWeaponSet(classId?: string): string {
    const weapon = this.equipped.weapon;
    if (weapon) {
      if (weapon.weaponSet) return weapon.weaponSet;
      if (WEAPON_SET_BY_ITEM[weapon.defId]) return WEAPON_SET_BY_ITEM[weapon.defId];
    }
    const cid = classId || "TK";
    return CLASS_DEFAULT_WEAPON_SET[cid] || "axe-shield";
  }

  recalcEquipBonus(classId?: string): void {
    let attack = 0;
    let defense = 0;
    const rules = ECONOMY_BALANCE.refine.bonusBySlot;
    for (const slot of Object.keys(this.equipped) as EquipSlot[]) {
      const item = this.equipped[slot];
      if (!item) continue;
      attack += item.attackBonus || 0;
      defense += item.defenseBonus || 0;
      const rule = rules[slot];
      if (rule && item.refine > 0) {
        if (rule.stat === "attack") {
          attack += item.refine * rule.perLevel;
        } else if (rule.stat === "defense") {
          defense += item.refine * rule.perLevel;
        }
      }
    }
    this.character.equipAttack = attack;
    this.character.equipDefense = defense;
    this.weaponSet = this.getWeaponSet(classId);
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

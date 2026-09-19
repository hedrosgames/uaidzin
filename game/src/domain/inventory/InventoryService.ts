import { ECONOMY_BALANCE } from "../../data/balance/economy";
import type { ItemInstance } from "../items/ItemModel";

export class InventoryService {
  readonly items: ItemInstance[] = [];
  private _gold = 0;
  readonly capacity = ECONOMY_BALANCE.inventorySlots;

  get gold(): number {
    return this._gold;
  }

  set gold(value: number) {
    const n = Number.isFinite(value) ? Math.floor(value) : 0;
    this._gold = Math.min(ECONOMY_BALANCE.goldCap, Math.max(0, n));
  }

  
  add(item: ItemInstance): boolean {
    if (item.slot === "material") {
      const stack = this.items.find((i) => i.defId === item.defId);
      if (stack) {
        stack.stack = Math.min(ECONOMY_BALANCE.materialStack, stack.stack + item.stack);
        return true;
      }
    }
    if (this.items.length >= this.capacity) return false;
    this.items.push(item);
    return true;
  }

  remove(uid: string): ItemInstance | null {
    const idx = this.items.findIndex((i) => i.uid === uid);
    if (idx < 0) return null;
    return this.items.splice(idx, 1)[0];
  }

  sell(uid: string): number {
    const item = this.remove(uid);
    if (!item) return 0;
    const value = item.sellValue * item.stack;
    this.gold += value;
    return value;
  }

  countMaterial(defId: string): number {
    return this.items.filter((i) => i.defId === defId).reduce((n, i) => n + i.stack, 0);
  }

  consumeMaterial(defId: string, qty: number): boolean {
    if (this.countMaterial(defId) < qty) return false;
    let left = qty;
    for (let i = this.items.length - 1; i >= 0 && left > 0; i--) {
      const it = this.items[i];
      if (it.defId !== defId) continue;
      const take = Math.min(it.stack, left);
      it.stack -= take;
      left -= take;
      if (it.stack <= 0) this.items.splice(i, 1);
    }
    return true;
  }

  usedSlots(): number {
    return this.items.length;
  }
}

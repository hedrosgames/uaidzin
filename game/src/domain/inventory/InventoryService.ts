import { ECONOMY_BALANCE } from "../../data/balance/economy";
import { isStackable } from "../../data/items/item-catalog";
import { nextItemUid, type ItemInstance } from "../items/ItemModel";

export type AddItemResult = {
  ok: boolean;
  added: number;
  rejected: number;
  reason?: "inventory_full" | "vault_full" | "invalid_item";
};

export class InventoryService {
  readonly items: ItemInstance[] = [];
  private _gold = 0;
  readonly capacity = ECONOMY_BALANCE.inventorySlots;

  get gold(): number {
    return this._gold;
  }

  set gold(value: number) {
    if (!Number.isFinite(value)) {
      if (import.meta.env?.DEV) {
        throw new Error("Invalid gold amount: " + value);
      }
      return;
    }
    const n = Math.floor(value);
    this._gold = Math.min(ECONOMY_BALANCE.goldCap, Math.max(0, n));
  }

  add(item: ItemInstance): AddItemResult {
    if (!item || item.stack <= 0) {
      return { ok: false, added: 0, rejected: 0, reason: "invalid_item" };
    }
    if (this.items.some((i) => i.uid === item.uid)) {
      item = { ...item, uid: nextItemUid() };
    }
    if (isStackable(item)) {
      let remaining = item.stack;
      let added = 0;
      for (const stack of this.items) {
        if (stack.defId !== item.defId) continue;
        if (stack.stack >= 999) continue;
        const space = 999 - stack.stack;
        const take = Math.min(space, remaining);
        stack.stack += take;
        remaining -= take;
        added += take;
        if (remaining <= 0) break;
      }
      while (remaining > 0 && this.items.length < this.capacity) {
        const take = Math.min(999, remaining);
        this.items.push({
          ...item,
          uid: nextItemUid(),
          stack: take,
        });
        remaining -= take;
        added += take;
      }
      const rejected = remaining;
      return {
        ok: rejected === 0,
        added,
        rejected,
        ...(rejected > 0 ? { reason: "inventory_full" } : {}),
      };
    }

    if (this.items.length >= this.capacity) {
      return { ok: false, added: 0, rejected: item.stack, reason: "inventory_full" };
    }
    this.items.push({ ...item });
    return { ok: true, added: item.stack, rejected: 0 };
  }

  remove(uid: string): ItemInstance | null {
    const idx = this.items.findIndex((i) => i.uid === uid);
    if (idx < 0) return null;
    return this.items.splice(idx, 1)[0];
  }

  sell(uid: string, qty?: number): number {
    const item = this.items.find((i) => i.uid === uid);
    if (!item) return 0;
    const count = qty == null || qty <= 0 || qty >= item.stack ? item.stack : Math.floor(qty);
    const value = Math.max(0, item.sellValue) * count;
    if (count >= item.stack) {
      this.remove(uid);
    } else {
      item.stack -= count;
    }
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

import { ECONOMY_BALANCE } from "../../data/balance/economy";
import { isStackable } from "../../data/items/item-catalog";
import { nextItemUid, type ItemInstance } from "../items/ItemModel";
import type { AddItemResult } from "../inventory/InventoryService";

export type AccountVaultState = {
  gold: number;
  items: ItemInstance[];
};

export class AccountVaultService {
  private _gold = 0;
  readonly items: ItemInstance[] = [];
  readonly capacity = ECONOMY_BALANCE.accountVaultCapacity;

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

  snapshot(): AccountVaultState {
    return {
      gold: this.gold,
      items: this.items.map((i) => ({ ...i })),
    };
  }

  apply(state: AccountVaultState | null | undefined): void {
    this.gold = Math.min(
      ECONOMY_BALANCE.goldCap,
      Math.max(0, Math.floor(Number(state?.gold) || 0)),
    );
    this.items.length = 0;
    for (const raw of state?.items || []) {
      this.items.push({ ...raw });
    }
  }

  clear(): void {
    this._gold = 0;
    this.items.length = 0;
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
        ...(rejected > 0 ? { reason: "vault_full" } : {}),
      };
    }

    if (this.items.length >= this.capacity) {
      return { ok: false, added: 0, rejected: item.stack, reason: "vault_full" };
    }
    this.items.push({ ...item });
    return { ok: true, added: item.stack, rejected: 0 };
  }

  remove(uid: string): ItemInstance | null {
    const idx = this.items.findIndex((i) => i.uid === uid);
    if (idx < 0) return null;
    return this.items.splice(idx, 1)[0];
  }

  reorder(uids: string[]): boolean {
    const map = new Map(this.items.map((i) => [i.uid, i]));
    const reordered: ItemInstance[] = [];
    for (const uid of uids) {
      const it = map.get(uid);
      if (it) {
        reordered.push(it);
        map.delete(uid);
      }
    }
    for (const it of map.values()) {
      reordered.push(it);
    }
    this.items.length = 0;
    this.items.push(...reordered);
    return true;
  }
}

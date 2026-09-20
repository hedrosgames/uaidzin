import { ECONOMY_BALANCE } from "../../data/balance/economy";
import type { ItemInstance } from "../items/ItemModel";

export type AccountVaultState = {
  gold: number;
  items: ItemInstance[];
};

export class AccountVaultService {
  gold = 0;
  readonly items: ItemInstance[] = [];
  readonly capacity = ECONOMY_BALANCE.accountVaultCapacity;

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
    this.gold = 0;
    this.items.length = 0;
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
}

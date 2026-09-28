import { ECONOMY_BALANCE } from "../../data/balance/economy";
import type { InventoryService } from "../../domain/inventory/InventoryService";
import type { AccountVaultService } from "../../domain/account/AccountVaultService";
import type { SaveCoordinator } from "../../persistence/SaveCoordinator";

export interface VaultTransferDeps {
  inventory: InventoryService;
  accountVault: AccountVaultService;
  saves: SaveCoordinator;
}

function isValidGoldAmount(amount: unknown): amount is number {
  return typeof amount === "number" && Number.isFinite(amount) && Number.isInteger(amount) && amount > 0;
}

export class VaultTransfer {
  constructor(private readonly deps: VaultTransferDeps) {}

  depositGold(amount: number): number {
    if (!isValidGoldAmount(amount)) return 0;
    if (amount > this.deps.inventory.gold) return 0;
    if (this.deps.accountVault.gold + amount > ECONOMY_BALANCE.goldCap) return 0;

    this.deps.inventory.gold -= amount;
    this.deps.accountVault.gold += amount;
    this.deps.saves.markDirty(["vault", "inventory"], "critical");
    void this.deps.saves.checkpoint();
    return amount;
  }

  withdrawGold(amount: number): number {
    if (!isValidGoldAmount(amount)) return 0;
    if (amount > this.deps.accountVault.gold) return 0;
    if (this.deps.inventory.gold + amount > ECONOMY_BALANCE.goldCap) return 0;

    this.deps.accountVault.gold -= amount;
    this.deps.inventory.gold += amount;
    this.deps.saves.markDirty(["vault", "inventory"], "critical");
    void this.deps.saves.checkpoint();
    return amount;
  }

  moveItemToVault(uid: string): boolean {
    const item = this.deps.inventory.remove(uid);
    if (!item) return false;
    const res = this.deps.accountVault.add(item);
    if (!res.ok) {
      if (res.rejected > 0) {
        this.deps.inventory.add({ ...item, stack: res.rejected, uid: item.uid });
      }
      if (res.added === 0) {
        return false;
      }
    }
    this.deps.saves.markDirty(["vault", "inventory"], "critical");
    void this.deps.saves.checkpoint();
    return true;
  }

  moveItemFromVault(uid: string): boolean {
    const item = this.deps.accountVault.remove(uid);
    if (!item) return false;
    const res = this.deps.inventory.add(item);
    if (!res.ok) {
      if (res.rejected > 0) {
        this.deps.accountVault.add({ ...item, stack: res.rejected, uid: item.uid });
      }
      if (res.added === 0) {
        return false;
      }
    }
    this.deps.saves.markDirty(["vault", "inventory"], "critical");
    void this.deps.saves.checkpoint();
    return true;
  }

  moveAllToVault(): { movedGold: number; movedItems: number } {
    let movedGold = 0;
    const room = Math.max(0, ECONOMY_BALANCE.goldCap - this.deps.accountVault.gold);
    const goldToMove = Math.min(this.deps.inventory.gold, room);
    if (goldToMove > 0) {
      this.deps.inventory.gold -= goldToMove;
      this.deps.accountVault.gold += goldToMove;
      movedGold = goldToMove;
    }

    let movedItems = 0;
    const items = [...this.deps.inventory.items];
    for (const it of items) {
      const removed = this.deps.inventory.remove(it.uid);
      if (!removed) continue;
      const res = this.deps.accountVault.add(removed);
      if (!res.ok) {
        if (res.rejected > 0) {
          this.deps.inventory.add({ ...removed, stack: res.rejected, uid: removed.uid });
        }
        if (res.added > 0) movedItems += 1;
      } else {
        movedItems += 1;
      }
    }

    if (movedGold > 0 || movedItems > 0) {
      this.deps.saves.markDirty(["vault", "inventory"], "critical");
      void this.deps.saves.checkpoint();
    }

    return { movedGold, movedItems };
  }
}

import { SHOP_CATALOG, type ShopSlotDef } from "../../data/balance/economy";
import { createFromCatalog } from "../items/ItemFactory";
import type { InventoryService } from "../inventory/InventoryService";

export type ShopBuyResult =
  | { ok: true }
  | { ok: false; reason: "unknown_item" | "unknown_shop" | "no_gold" | "inventory_full" };

export type SellItemResult = {
  ok: boolean;
  goldEarned: number;
  qtySold: number;
  reason?: "not_found" | "invalid_qty";
};

function findSlot(shopId: string, itemId: string): ShopSlotDef | undefined {
  const shop = SHOP_CATALOG.shops[shopId];
  if (!shop) return undefined;
  return shop.slots.find((s) => s.itemId === itemId);
}

export function buyFromShop(
  inventory: InventoryService,
  shopId: string,
  itemId: string,
): ShopBuyResult {
  const slot = findSlot(shopId, itemId);
  if (!slot) {
    const shop = SHOP_CATALOG.shops[shopId];
    if (!shop) return { ok: false, reason: "unknown_shop" };
    return { ok: false, reason: "unknown_item" };
  }
  const price = Math.max(0, slot.price);
  if (!Number.isFinite(price) || inventory.gold < price) {
    return { ok: false, reason: "no_gold" };
  }
  const item = createFromCatalog(itemId, 1);
  if (!item) return { ok: false, reason: "unknown_item" };
  const addRes = inventory.add(item);
  if (!addRes.ok) return { ok: false, reason: "inventory_full" };
  inventory.gold -= price;
  return { ok: true };
}

export function sellItem(
  inventory: InventoryService,
  uid: string,
  qty?: number,
): SellItemResult {
  const item = inventory.items.find((i) => i.uid === uid);
  if (!item) {
    return { ok: false, goldEarned: 0, qtySold: 0, reason: "not_found" };
  }
  const count = qty == null || qty <= 0 || qty >= item.stack ? item.stack : Math.floor(qty);
  if (count <= 0) {
    return { ok: false, goldEarned: 0, qtySold: 0, reason: "invalid_qty" };
  }
  const unitValue = Math.max(0, item.sellValue);
  const total = unitValue * count;
  if (count >= item.stack) {
    inventory.remove(uid);
  } else {
    item.stack -= count;
  }
  inventory.gold += total;
  return { ok: true, goldEarned: total, qtySold: count };
}

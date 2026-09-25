import { SHOP_CATALOG, type ShopSlotDef } from "../../data/balance/economy";
import { createFromCatalog } from "../items/ItemFactory";
import type { InventoryService } from "../inventory/InventoryService";

export type ShopBuyResult =
  | { ok: true }
  | { ok: false; reason: "unknown_item" | "unknown_shop" | "no_stock" | "no_gold" | "inventory_full" };

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
  if (slot.qty <= 0) return { ok: false, reason: "no_stock" };
  const price = Math.max(0, slot.price);
  if (inventory.gold < price) return { ok: false, reason: "no_gold" };
  const item = createFromCatalog(itemId, 1);
  if (!item) return { ok: false, reason: "unknown_item" };
  if (!inventory.add(item)) return { ok: false, reason: "inventory_full" };
  inventory.gold -= price;
  return { ok: true };
}

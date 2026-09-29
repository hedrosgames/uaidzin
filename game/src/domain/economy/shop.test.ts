import { describe, expect, it } from "vitest";
import { buyFromShop, sellItem } from "./ShopService";
import { InventoryService } from "../inventory/InventoryService";
import { SHOP_CATALOG } from "../../data/balance/economy";
import { createFromCatalog } from "../items/ItemFactory";
import type { ItemInstance } from "../items/ItemModel";

describe("ShopService", () => {
  it("compra sem estoque permite comprar multiplas vezes", () => {
    const inv = new InventoryService();
    inv.gold = 100000;
    const res1 = buyFromShop(inv, "merchant", "mat_ori");
    const res2 = buyFromShop(inv, "merchant", "mat_ori");
    expect(res1).toEqual({ ok: true });
    expect(res2).toEqual({ ok: true });
    expect(inv.items.length).toBeGreaterThan(0);
  });

  it("compra que nao cabe nao cobra ouro", () => {
    const inv = new InventoryService();
    inv.gold = 10000;
    const initialGold = inv.gold;
    for (let i = 0; i < 40; i++) {
      inv.items.push({
        uid: `filler-${i}`,
        defId: `item-${i}`,
        name: "Item",
        rarity: "Comum",
        slot: "weapon",
        refine: 0,
        attackBonus: 0,
        defenseBonus: 0,
        stack: 1,
        sellValue: 1,
      });
    }
    const res = buyFromShop(inv, "blacksmith", "espada_curta");
    expect(res).toEqual({ ok: false, reason: "inventory_full" });
    expect(inv.gold).toBe(initialGold);
  });

  it("venda parcial de stack", () => {
    const inv = new InventoryService();
    const potion: ItemInstance = {
      uid: "pot1",
      defId: "pocao_menor",
      name: "Poção Menor",
      rarity: "Comum",
      slot: "misc",
      refine: 0,
      attackBonus: 0,
      defenseBonus: 0,
      stack: 10,
      sellValue: 5,
    };
    inv.items.push(potion);
    const res = sellItem(inv, "pot1", 4);
    expect(res).toEqual({ ok: true, goldEarned: 20, qtySold: 4 });
    expect(potion.stack).toBe(6);
    expect(inv.gold).toBe(20);
    expect(inv.items.length).toBe(1);
  });

  it("venda nunca da lucro para itens de loja", () => {
    for (const shop of Object.values(SHOP_CATALOG.shops)) {
      for (const slot of shop.slots) {
        const item = createFromCatalog(slot.itemId, 1);
        if (item) {
          expect(item.sellValue).toBeLessThanOrEqual(slot.price);
        }
      }
    }
  });

  it("ouro NaN ignorado mantendo valor anterior", () => {
    const inv = new InventoryService();
    inv.gold = 500;
    try {
      inv.gold = NaN;
    } catch {
    }
    expect(inv.gold).toBe(500);

    try {
      inv.gold = Infinity;
    } catch {
    }
    expect(inv.gold).toBe(500);
  });
});

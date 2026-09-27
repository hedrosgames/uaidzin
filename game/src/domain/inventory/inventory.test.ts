import { describe, expect, it } from "vitest";
import { InventoryService } from "./InventoryService";
import { AccountVaultService } from "../account/AccountVaultService";
import { EquipmentService } from "../items/EquipmentService";
import { CharacterModel } from "../character/CharacterModel";
import type { ItemInstance } from "../items/ItemModel";

function createItem(overrides: Partial<ItemInstance> = {}): ItemInstance {
  return {
    uid: crypto.randomUUID(),
    defId: "espada_curta",
    name: "Espada Curta",
    rarity: "Comum",
    slot: "weapon",
    refine: 0,
    attackBonus: 10,
    defenseBonus: 0,
    stack: 1,
    sellValue: 10,
    ...overrides,
  };
}

describe("InventoryService and EquipmentService", () => {
  it("bolsa cheia + equip troca sem perder item", () => {
    const inv = new InventoryService();
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 5 });
    const eq = new EquipmentService(inv, character);

    const sword1 = createItem({ uid: "s1", defId: "espada_curta", name: "Espada 1" });
    const sword2 = createItem({ uid: "s2", defId: "machado_leve", name: "Machado 2" });

    inv.add(sword1);
    expect(eq.equip("s1")).toBe(true);
    expect(eq.equipped.weapon?.uid).toBe("s1");
    expect(inv.items.length).toBe(0);

    for (let i = 0; i < 40; i++) {
      inv.items.push(createItem({ uid: `filler-${i}`, defId: "misc_item", slot: "misc" }));
    }
    expect(inv.items.length).toBe(40);

    inv.items[0] = sword2;

    expect(eq.equip("s2")).toBe(true);
    expect(eq.equipped.weapon?.uid).toBe("s2");
    expect(inv.items.length).toBe(40);
    expect(inv.items.some((i) => i.uid === "s1")).toBe(true);
    expect(inv.items.some((i) => i.uid === "s2")).toBe(false);
  });

  it("unequip com bolsa cheia devolve inventory_full", () => {
    const inv = new InventoryService();
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 5 });
    const eq = new EquipmentService(inv, character);

    const sword = createItem({ uid: "s1" });
    inv.add(sword);
    eq.equip("s1");
    expect(eq.equipped.weapon?.uid).toBe("s1");

    for (let i = 0; i < 40; i++) {
      inv.items.push(createItem({ uid: `filler-${i}`, defId: "misc_item", slot: "misc" }));
    }
    expect(inv.items.length).toBe(40);

    const res = eq.unequip("weapon");
    expect(res).toEqual({ ok: false, reason: "inventory_full" });
    expect(eq.equipped.weapon?.uid).toBe("s1");
  });

  it("uid inexistente devolve false ao equipar", () => {
    const inv = new InventoryService();
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 5 });
    const eq = new EquipmentService(inv, character);
    expect(eq.equip("nao_existe")).toBe(false);
  });

  it("slot vazio devolve slot_empty ao desequipar", () => {
    const inv = new InventoryService();
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 5 });
    const eq = new EquipmentService(inv, character);
    expect(eq.unequip("weapon")).toEqual({ ok: false, reason: "slot_empty" });
  });

  it("add recusa excedente com rejected quando inventario esta cheio", () => {
    const inv = new InventoryService();
    for (let i = 0; i < 40; i++) {
      inv.items.push(createItem({ uid: `item-${i}` }));
    }
    const extra = createItem({ uid: "extra" });
    const res = inv.add(extra);
    expect(res).toEqual({ ok: false, added: 0, rejected: 1, reason: "inventory_full" });
  });

  it("stack maximo de 999 em itens empilhaveis", () => {
    const inv = new InventoryService();
    const potion1 = createItem({ defId: "pocao_menor", slot: "misc", stack: 998 });
    const res1 = inv.add(potion1);
    expect(res1.ok).toBe(true);

    const potion2 = createItem({ defId: "pocao_menor", slot: "misc", stack: 3 });
    const res2 = inv.add(potion2);
    expect(res2.ok).toBe(true);
    expect(res2.added).toBe(3);
    expect(inv.items.length).toBe(2);
    expect(inv.items[0].stack).toBe(999);
    expect(inv.items[1].stack).toBe(2);
  });

  it("cofre cheio recusa adicao", () => {
    const vault = new AccountVaultService();
    for (let i = 0; i < 120; i++) {
      vault.items.push(createItem({ uid: `vault-${i}` }));
    }
    const res = vault.add(createItem({ uid: "extra" }));
    expect(res).toEqual({ ok: false, added: 0, rejected: 1, reason: "vault_full" });
  });

  it("998+2 no cofre quando cheio adiciona 1 e rejeita 1", () => {
    const vault = new AccountVaultService();
    vault.items.push(createItem({ defId: "pocao_menor", slot: "misc", stack: 998 }));
    for (let i = 1; i < 120; i++) {
      vault.items.push(createItem({ uid: `vault-${i}` }));
    }
    expect(vault.items.length).toBe(120);

    const res = vault.add(createItem({ defId: "pocao_menor", slot: "misc", stack: 2 }));
    expect(res).toEqual({ ok: false, added: 1, rejected: 1, reason: "vault_full" });
    expect(vault.items[0].stack).toBe(999);
    expect(vault.items.length).toBe(120);
  });
});

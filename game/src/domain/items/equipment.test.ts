import { describe, expect, it } from "vitest";
import { EquipmentService } from "./EquipmentService";
import { CompositionService } from "./CompositionService";
import { InventoryService } from "../inventory/InventoryService";
import { CharacterModel } from "../character/CharacterModel";
import type { ItemInstance } from "./ItemModel";

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

describe("EquipmentService and CompositionService", () => {
  it("refino +1 soma uma vez pela regra do slot", () => {
    const inv = new InventoryService();
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 5 });
    const eq = new EquipmentService(inv, character);

    const weapon = createItem({ uid: "w1", slot: "weapon", attackBonus: 10, defenseBonus: 0, refine: 1 });
    const armor = createItem({ uid: "a1", slot: "armor", defId: "armadura_couro", attackBonus: 0, defenseBonus: 8, refine: 1 });

    inv.add(weapon);
    inv.add(armor);
    eq.equip("w1");
    eq.equip("a1");

    expect(character.equipAttack).toBe(12);
    expect(character.equipDefense).toBe(9);
  });

  it("compositor +7, +8 e +9 atualiza refino e bonus do equipamento", () => {
    const inv = new InventoryService();
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 5 });
    const eq = new EquipmentService(inv, character);
    const comp = new CompositionService(inv, eq);

    const sword = createItem({ uid: "w1", slot: "weapon", attackBonus: 10, refine: 6 });
    inv.add(sword);
    eq.equip("w1");
    expect(character.equipAttack).toBe(10 + 6 * 2);

    inv.gold = 50000000;
    inv.items.push(createItem({ uid: "lac1", defId: "mat_lac", slot: "material", stack: 20 }));

    const r7 = comp.compose("compose_plus7_lac", "w1", () => 0.1);
    expect(r7.success).toBe(true);
    expect(eq.equipped.weapon?.refine).toBe(7);
    expect(character.equipAttack).toBe(10 + 7 * 2);

    const r8 = comp.compose("compose_plus8_lac", "w1", () => 0.1);
    expect(r8.success).toBe(true);
    expect(eq.equipped.weapon?.refine).toBe(8);
    expect(character.equipAttack).toBe(10 + 8 * 2);

    const r9 = comp.compose("compose_plus9_lac", "w1", () => 0.1);
    expect(r9.success).toBe(true);
    expect(eq.equipped.weapon?.refine).toBe(9);
    expect(character.equipAttack).toBe(10 + 9 * 2);
  });

  it("set de arma segue a peca equipada e machado na bolsa nao conta", () => {
    const inv = new InventoryService();
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 5 });
    const eq = new EquipmentService(inv, character);

    const axeInBag = createItem({ uid: "axe1", defId: "machado_leve", weaponSet: "axe-shield" });
    inv.add(axeInBag);

    expect(eq.getWeaponSet("TK")).toBe("axe-shield");

    const sword = createItem({ uid: "sw1", defId: "espada_curta", weaponSet: "sword-shield" });
    inv.add(sword);
    eq.equip("sw1");

    expect(eq.getWeaponSet("TK")).toBe("sword-shield");
    expect(eq.weaponSet).toBe("sword-shield");

    eq.unequip("weapon");
    expect(eq.getWeaponSet("TK")).toBe("axe-shield");
  });
});

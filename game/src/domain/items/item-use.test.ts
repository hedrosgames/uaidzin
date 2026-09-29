import { describe, expect, it } from "vitest";
import { CharacterModel } from "../character/CharacterModel";
import { BuffService } from "../character/BuffService";
import { InventoryService } from "../inventory/InventoryService";
import { createFromCatalog } from "./ItemFactory";
import { ItemUseService } from "./ItemUseService";
import { ITEM_CATALOG } from "../../data/items/item-catalog";
import { ECONOMY_BALANCE } from "../../data/balance/economy";
import { RefinementService } from "./RefinementService";

describe("catalog items and item use", () => {
  it("registers requested set counts and stable icon paths", () => {
    const defs = Object.values(ITEM_CATALOG);
    expect(defs.filter((item) => item.slot === "weapon").length).toBe(11);
    expect(defs.filter((item) => item.slot === "offhand").length).toBe(1);
    expect(defs.filter((item) => item.id.startsWith("armor_chest_")).length).toBe(12);
    expect(defs.filter((item) => item.id.startsWith("ring_")).length).toBe(8);
    expect(defs.filter((item) => item.id.startsWith("earring_")).length).toBe(4);
    expect(defs.filter((item) => item.id.startsWith("necklace_")).length).toBe(4);
    expect(defs.filter((item) => item.id.startsWith("gema_") && /^gema_\d/.test(item.id)).length).toBe(12);
    expect(defs.filter((item) => item.id.startsWith("rune_")).length).toBe(24);
    expect(defs.filter((item) => item.id.startsWith("chalice_xp_")).length).toBe(12);
    expect(defs.filter((item) => item.available !== false).every((item) => item.icon === `/assets/icons/items/${item.id}.png`)).toBe(true);
  });

  it("restores up to 500 HP and MP and consumes one stacked potion", () => {
    const inventory = new InventoryService();
    const character = new CharacterModel({ maxHp: 1200, attack: 10, defense: 5 });
    const buffs = new BuffService();
    character.hp = 100;
    character.maxMp = 1200;
    character.mp = 100;
    const potion = createFromCatalog("pocao_vida_mana", 3)!;
    inventory.add(potion);
    const use = new ItemUseService(inventory, character, buffs, () => {});
    const potionUid = inventory.items[0]!.uid;

    expect(use.use(potionUid).ok).toBe(true);
    expect(character.hp).toBe(600);
    expect(character.mp).toBe(600);
    expect(inventory.items[0].stack).toBe(2);
  });

  it("credits gold stacks without using bag slots", () => {
    const inventory = new InventoryService();
    const gold = createFromCatalog("ouro", 50)!;
    inventory.add(gold);
    expect(inventory.gold).toBe(50);
    expect(inventory.items).toHaveLength(0);
  });

  it("revives a dead character and starts cooldown", () => {
    const inventory = new InventoryService();
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 5 });
    const buffs = new BuffService();
    let cooldown = 0;
    character.isDead = true;
    character.hp = 0;
    const feather = createFromCatalog("pena_fenix")!;
    inventory.add(feather);
    const use = new ItemUseService(inventory, character, buffs, () => {}, {
      remainingSec: () => cooldown,
      start: (sec) => {
        cooldown = sec;
      },
    });
    expect(use.use(inventory.items[0]!.uid).ok).toBe(true);
    expect(character.isDead).toBe(false);
    expect(character.hp).toBe(character.maxHp);
    expect(cooldown).toBe(600);
  });

  it("applies persistent duration buffs and only doubles kill XP once", () => {
    const inventory = new InventoryService();
    const character = new CharacterModel({ maxHp: 1200, attack: 10, defense: 5 });
    const buffs = new BuffService();
    const chest = createFromCatalog("bau_xp")!;
    inventory.add(chest);
    const use = new ItemUseService(inventory, character, buffs, () => {});

    expect(use.use(inventory.items[0]!.uid).ok).toBe(true);
    expect(buffs.active[0]).toMatchObject({ stat: "xpMultiplier", magnitude: 1, remainingSec: 14400 });
    const restoredBuffs = new BuffService();
    restoredBuffs.apply(buffs.snapshot());
    restoredBuffs.add({ id: "bau_xp", stat: "xpMultiplier", magnitude: 1, remainingSec: 14400, stacks: 1 });
    restoredBuffs.tick(3600);
    expect(restoredBuffs.active).toHaveLength(1);
    expect(restoredBuffs.active[0]?.remainingSec).toBe(10800);
    expect(ECONOMY_BALANCE.refine.maxLevel).toBe(15);
  });

  it("uses Ori through +6, Lac through +9, Bless through +12 and Soul through +15", () => {
    const inventory = new InventoryService();
    inventory.add(createFromCatalog("mat_ori", 6)!);
    inventory.add(createFromCatalog("mat_lac", 3)!);
    inventory.add(createFromCatalog("gema_bless", 3)!);
    inventory.add(createFromCatalog("gema_soul", 3)!);
    const refine = new RefinementService(inventory);
    const item = { uid: "weapon", defId: "weapon_greatsword", name: "Espadão", rarity: "Comum" as const, slot: "weapon" as const, refine: 0, attackBonus: 0, defenseBonus: 0, stack: 1, sellValue: 0 };
    const materials: string[] = [];
    for (let level = 1; level <= 15; level++) {
      item.refine = level - 1;
      materials.push(refine.refine(item, () => 0).mat);
    }
    expect(materials).toEqual(["mat_ori", "mat_ori", "mat_ori", "mat_ori", "mat_ori", "mat_ori", "mat_lac", "mat_lac", "mat_lac", "gema_bless", "gema_bless", "gema_bless", "gema_soul", "gema_soul", "gema_soul"]);
    expect(refine.refine(createFromCatalog("mat_ori")!).ok).toBe(false);
    item.refine = -1;
    expect(refine.refine(item).ok).toBe(false);
  });
});

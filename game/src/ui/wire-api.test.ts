import { describe, expect, it, vi } from "vitest";
import { createWireGameApi } from "./WireGameBridge";
import type { CityGameSession } from "../app/CityGameSession";

function createMockSession(): CityGameSession {
  const inventoryItems: Array<{
    uid: string;
    defId: string;
    name: string;
    slot: string;
    rarity: string;
    refine: number;
    attackBonus: number;
    defenseBonus: number;
    stack: number;
    sellValue: number;
  }> = [
    {
      uid: "u-sword",
      defId: "sword-1",
      name: "Espada de Teste",
      slot: "weapon",
      rarity: "Comum",
      refine: 0,
      attackBonus: 10,
      defenseBonus: 0,
      stack: 1,
      sellValue: 50,
    },
    {
      uid: "u-shield",
      defId: "shield-1",
      name: "Escudo de Teste",
      slot: "armor",
      rarity: "Comum",
      refine: 0,
      attackBonus: 0,
      defenseBonus: 10,
      stack: 1,
      sellValue: 40,
    },
    {
      uid: "u-ring",
      defId: "ring-1",
      name: "Anel de Teste",
      slot: "ring1",
      rarity: "Comum",
      refine: 0,
      attackBonus: 2,
      defenseBonus: 2,
      stack: 1,
      sellValue: 20,
    },
  ];

  return {
    character: {
      name: "Hero",
      level: 10,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      attack: 20,
      defense: 10,
      attributes: { FOR: 10, DES: 8, CONS: 9, INT: 5 },
      equipAttack: 10,
      equipDefense: 0,
    },
    progression: {
      state: {
        evolution: "Mortal",
        level: 10,
        resetsInEvolution: 0,
        unspentAttributePoints: 5,
        xp: 100,
        xpToNext: 500,
      },
      spendAttribute: vi.fn().mockReturnValue(true),
      recomputeCombatStats: vi.fn(),
      canReset: vi.fn().mockReturnValue(true),
      canEvolve: vi.fn().mockReturnValue(false),
    },
    skillTree: {
      state: {
        classId: "TK",
        skillPoints: 4,
        specPoints: 2,
        specialization: { controle: 0, magia: 0, fisica: 1 },
      },
      hasSkill: vi.fn().mockReturnValue(false),
      spendSpec: vi.fn().mockReturnValue(true),
    },
    skillLoadout: {
      slots: [
        {
          skill: { id: "caca-1", name: "Golpe", kind: "active" },
          tree: "fisica",
          auto: false,
          cooldown: 5,
          cd: 0,
        },
      ],
      assignToSlot: vi.fn().mockReturnValue(true),
      clearSlot: vi.fn(),
      toggleAuto: vi.fn(),
      swapSlots: vi.fn().mockReturnValue(true),
    },
    inventory: {
      gold: 1000,
      capacity: 40,
      items: inventoryItems,
      usedSlots: vi.fn().mockReturnValue(1),
      remove: vi.fn().mockImplementation((uid: string) => {
        const idx = inventoryItems.findIndex((i) => i.uid === uid);
        if (idx >= 0) return inventoryItems.splice(idx, 1)[0];
        return null;
      }),
      reorder: vi.fn().mockReturnValue(true),
    },
    equipment: {
      equipped: {},
      equip: vi.fn().mockReturnValue(true),
      unequip: vi.fn().mockReturnValue({ ok: true }),
      swapSlots: vi.fn().mockReturnValue(true),
      discardEquipped: vi.fn().mockReturnValue(true),
      snapshotEquipped: vi.fn().mockReturnValue({}),
      onItemRefined: vi.fn(),
    },
    accountVault: {
      gold: 500,
      capacity: 120,
      items: [],
      reorder: vi.fn().mockReturnValue(true),
      remove: vi.fn().mockReturnValue(null),
    },
    vaultTransfer: {
      depositGold: vi.fn().mockReturnValue(100),
      withdrawGold: vi.fn().mockReturnValue(100),
      moveItemToVault: vi.fn().mockReturnValue(true),
      moveItemFromVault: vi.fn().mockReturnValue(true),
      moveAllToVault: vi.fn().mockReturnValue({ movedGold: 0, movedItems: 1 }),
    },
    refinement: {
      refine: vi.fn().mockReturnValue({ ok: true, costGold: 100, mat: "mat_ori" }),
    },
    composition: {
      listEligible: vi.fn().mockReturnValue([]),
      canAttempt: vi.fn().mockReturnValue({ ok: true, message: "" }),
    },
    quests: {
      listForUi: vi.fn().mockReturnValue([]),
    },
    bags: {
      snapshot: vi.fn().mockReturnValue([true, false, false, false]),
      unlock: vi.fn(),
    },
    saves: {
      markDirty: vi.fn(),
      checkpoint: vi.fn().mockResolvedValue(undefined),
    },
    saveService: {
      getProfileId: vi.fn().mockReturnValue("slot-1"),
      setProfileId: vi.fn(),
    },
    tryLearnSkill: vi.fn().mockReturnValue(true),
    tryReset: vi.fn().mockReturnValue(true),
    tryEvolve: vi.fn().mockReturnValue({ ok: true }),
    tryUseConsumable: vi.fn().mockReturnValue(true),
    getPotionBar: vi.fn().mockReturnValue([null, null, null]),
    setPotionSlot: vi.fn().mockReturnValue(true),
    usePotionSlot: vi.fn().mockReturnValue(true),
    getCombatAutos: vi.fn().mockReturnValue({ attackMode: "physical", moveMode: "off", potion: false }),
    toggleCombatAuto: vi.fn().mockReturnValue(true),
    sellItem: vi.fn().mockReturnValue({ ok: true, goldEarned: 50 }),
    tryCompose: vi.fn().mockReturnValue({ attempted: true, success: true, message: "OK", recipeId: "r1" }),
    acceptQuest: vi.fn().mockReturnValue({ ok: true, message: "OK" }),
    entryItemCounts: vi.fn().mockReturnValue({}),
    eligibleDungeons: vi.fn().mockReturnValue([]),
    tryEnterDungeon: vi.fn().mockReturnValue({ ok: true }),
    refreshWeaponSetFromGear: vi.fn(),
    reloadAccountVault: vi.fn().mockResolvedValue(undefined),
    loadSave: vi.fn().mockResolvedValue({ status: "found" }),
  } as unknown as CityGameSession;
}

describe("WireGameBridge createWireGameApi", () => {
  it("delegates skill operations through domain session without direct mutation", () => {
    const session = createMockSession();
    const changed = vi.fn();
    const api = createWireGameApi(session, changed);

    expect(api.learnSkill("fisica", 0)).toBe(true);
    expect(session.tryLearnSkill).toHaveBeenCalledWith("fisica", 0);
    expect(changed).toHaveBeenCalled();

    expect(api.equipSkill(0, "caca-1")).toBe(true);
    expect(session.skillLoadout.assignToSlot).toHaveBeenCalledWith(0, "caca-1");
    expect(session.saves.markDirty).toHaveBeenCalledWith("skillLoadout", "deferred");

    expect(api.clearSkillSlot(0)).toBe(true);
    expect(session.skillLoadout.clearSlot).toHaveBeenCalledWith(0);

    expect(api.toggleSkillAuto(0)).toBe(true);
    expect(session.skillLoadout.toggleAuto).toHaveBeenCalledWith(0);

    expect(api.swapSkillSlots(0, 1)).toBe(true);
    expect(session.skillLoadout.swapSlots).toHaveBeenCalledWith(0, 1);
  });

  it("delegates equipment and inventory operations through domain without direct mutation", () => {
    const session = createMockSession();
    const changed = vi.fn();
    const api = createWireGameApi(session, changed);

    expect(api.equipUid("u-sword")).toBe(true);
    expect(session.equipment.equip).toHaveBeenCalledWith("u-sword");
    expect(session.saves.markDirty).toHaveBeenCalledWith(["equipment", "inventory"], "deferred");

    expect(api.unequipSlot("weapon")).toBe(true);
    expect(session.equipment.unequip).toHaveBeenCalledWith("weapon");

    expect(api.swapSlots("ring1", "ring2")).toBe(true);
    expect(session.equipment.swapSlots).toHaveBeenCalledWith("ring1", "ring2");

    expect(api.discardEquipped("weapon")).toBe(true);
    expect(session.equipment.discardEquipped).toHaveBeenCalledWith("weapon");
    expect(session.saves.markDirty).toHaveBeenCalledWith("equipment", "critical");

    expect(api.sellItem("u-sword", 1)).toEqual({ ok: true, goldEarned: 50, qtySold: 1 });
    expect(session.saves.markDirty).toHaveBeenCalledWith("inventory", "critical");

    expect(api.discardItem("u-shield")).toBe(true);
    expect(session.inventory.remove).toHaveBeenCalledWith("u-shield");
    expect(session.saves.markDirty).toHaveBeenCalledWith("inventory", "critical");

    expect(api.reorderBag(["u-ring"])).toBe(true);
    expect(session.inventory.reorder).toHaveBeenCalledWith(["u-ring"]);
    expect(session.saves.markDirty).toHaveBeenCalledWith("inventory", "deferred");
  });

  it("delegates vault, reset, evolve and refine operations through domain", () => {
    const session = createMockSession();
    const changed = vi.fn();
    const api = createWireGameApi(session, changed);

    expect(api.depositGold(100)).toBe(100);
    expect(session.vaultTransfer.depositGold).toHaveBeenCalledWith(100);

    expect(api.withdrawGold(100)).toBe(100);
    expect(session.vaultTransfer.withdrawGold).toHaveBeenCalledWith(100);

    expect(api.moveToVault("u-sword")).toBe(true);
    expect(session.vaultTransfer.moveItemToVault).toHaveBeenCalledWith("u-sword");

    expect(api.moveFromVault("u-sword")).toBe(true);
    expect(session.vaultTransfer.moveItemFromVault).toHaveBeenCalledWith("u-sword");

    expect(api.moveAllToVault()).toEqual({ movedGold: 0, movedItems: 1 });
    expect(session.vaultTransfer.moveAllToVault).toHaveBeenCalled();

    expect(api.tryReset()).toBe(true);
    expect(session.tryReset).toHaveBeenCalled();

    expect(api.tryEvolve()).toEqual({ ok: true });
    expect(session.tryEvolve).toHaveBeenCalled();

    const refineRes = api.refineItem("u-sword");
    expect(refineRes.ok).toBe(true);
    expect(session.refinement.refine).toHaveBeenCalled();
    expect(session.saves.markDirty).toHaveBeenCalledWith(["inventory", "equipment"], "critical");
  });
});

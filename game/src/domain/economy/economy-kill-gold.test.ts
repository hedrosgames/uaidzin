import { describe, expect, it, vi } from "vitest";
import { EconomyService } from "./EconomyService";

describe("EconomyService kill gold", () => {
  it("aplica multiplicador global ao ouro do mob", () => {
    const inventory = { gold: 0, add: vi.fn(() => ({ ok: true, added: 1 })) };
    const economy = new EconomyService(inventory as never, () => 1);
    economy.dungeonIndex = 2;

    const base = economy.grantKillLoot("fixed", false, undefined, 1);
    inventory.gold = 0;
    const doubled = economy.grantKillLoot("fixed", false, undefined, 2);

    expect(base.gold).toBe(3);
    expect(doubled.gold).toBe(6);
    expect(inventory.gold).toBe(6);
  });

  it("dungeon 1 não dropa ouro nem item", () => {
    const inventory = { gold: 0, add: vi.fn(() => ({ ok: true, added: 1 })) };
    const economy = new EconomyService(inventory as never, () => 0);
    economy.dungeonIndex = 1;

    const loot = economy.grantKillLoot("boss", true, "cogumelo", 2);

    expect(loot).toEqual({ gold: 0, droppedItem: null, lostItem: null });
    expect(inventory.gold).toBe(0);
    expect(inventory.add).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { EconomyService } from "./EconomyService";

describe("EconomyService kill gold", () => {
  it("aplica multiplicador global ao ouro do mob", () => {
    const inventory = { gold: 0, add: vi.fn(() => ({ ok: true, added: 1 })) };
    const economy = new EconomyService(inventory as never, () => 1);
    economy.dungeonIndex = 1;

    const base = economy.grantKillLoot("fixed", false, undefined, 1);
    inventory.gold = 0;
    const doubled = economy.grantKillLoot("fixed", false, undefined, 2);

    expect(base.gold).toBe(30);
    expect(doubled.gold).toBe(60);
    expect(inventory.gold).toBe(60);
  });
});

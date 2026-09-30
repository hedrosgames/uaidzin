import { describe, expect, it } from "vitest";
import { D1_GATE_Z, dungeon1ArenaFromZ } from "../../data/balance/xp-progression";
import { DUNGEON1_FENCE_LINES, dungeon1ZoneIndex } from "../../world/Dungeon1Layout";
import { canEngageEnemy, sameDungeonArena } from "./CombatSpace";

describe("combate nas zonas ampliadas da dungeon 1", () => {
  it("posiciona abertura dos portões nos mesmos limites das cercas", () => {
    expect(D1_GATE_Z).toEqual([-16, -52]);
    expect(D1_GATE_Z).toEqual(DUNGEON1_FENCE_LINES.slice(1, -1));
  });

  it("mantém HUD e combate na mesma zona ao atravessar cada portão", () => {
    for (const z of [20, -15.99, -16, -16.01, -51.99, -52, -52.01, -92]) {
      expect(dungeon1ArenaFromZ(z)).toBe(dungeon1ZoneIndex(z));
    }
    expect(dungeon1ArenaFromZ(-12)).toBe(0);
    expect(dungeon1ArenaFromZ(-42)).toBe(1);
  });

  it("bloqueia inimigos da outra zona e libera combate na zona atual", () => {
    expect(canEngageEnemy("dungeon-1", 0, -12, 0, -8, 0)).toBe(true);
    expect(canEngageEnemy("dungeon-1", 0, -12, 0, -26, 1)).toBe(false);
    expect(canEngageEnemy("dungeon-1", 0, -42, 0, -26, 1)).toBe(true);
    expect(canEngageEnemy("dungeon-1", 0, -42, 0, -62, 2)).toBe(false);
    expect(canEngageEnemy("dungeon-1", 0, -52, 0, -62, 2)).toBe(true);
    expect(sameDungeonArena("dungeon-2", -42, 2)).toBe(true);
  });
});

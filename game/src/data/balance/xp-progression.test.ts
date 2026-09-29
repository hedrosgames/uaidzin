import { describe, expect, it } from "vitest";
import {
  D1_XP_PER_KILL_UNIT,
  D2_LEVEL_START,
  d1KillsForLevelUp,
  d1KillXp,
  d2ChaliceGrantXp,
  d2ChalicesForLevelUp,
  d2KillXp,
  d2KillsForLevelUp,
  xpToLevel,
} from "./xp-progression";
import { PROGRESSION_BALANCE } from "./progression";

describe("curva XP dungeon 1", () => {
  it("nível 1→2 exige 4 mortes na zona ideal", () => {
    expect(d1KillsForLevelUp(1)).toBe(4);
    expect(d1KillXp(1)).toBe(D1_XP_PER_KILL_UNIT);
    expect(xpToLevel(1)).toBe(4 * D1_XP_PER_KILL_UNIT);
  });

  it("dobra kills por nível até 10 e reinicia banda em 10", () => {
    expect(d1KillsForLevelUp(2)).toBe(8);
    expect(d1KillsForLevelUp(9)).toBe(4 * 2 ** 8);
    expect(d1KillsForLevelUp(10)).toBe(4);
    expect(d1KillsForLevelUp(19)).toBe(4 * 2 ** 9);
    expect(d1KillsForLevelUp(20)).toBe(4);
  });

  it("xp por kill acompanha xpToNext", () => {
    for (const level of [1, 5, 12, 25]) {
      expect(d1KillXp(level) * d1KillsForLevelUp(level)).toBe(xpToLevel(level));
    }
  });
});

describe("curva XP dungeon 2", () => {
  it("a partir do 35 usa 100 kills com dobro por nível", () => {
    expect(d2KillsForLevelUp(35)).toBe(100);
    expect(d2KillsForLevelUp(36)).toBe(200);
    expect(d2KillXp(35) * d2KillsForLevelUp(35)).toBe(xpToLevel(35));
  });

  it("cálices por nível 5, 8, 12, 17…", () => {
    expect(d2ChalicesForLevelUp(35)).toBe(5);
    expect(d2ChalicesForLevelUp(36)).toBe(8);
    expect(d2ChalicesForLevelUp(37)).toBe(12);
    expect(d2ChalicesForLevelUp(38)).toBe(17);
  });

  it("xp do cálice fecha o nível", () => {
    for (const level of [35, 36, 40]) {
      const need = xpToLevel(level);
      const cups = d2ChalicesForLevelUp(level);
      expect(d2ChaliceGrantXp(level) * cups).toBeGreaterThanOrEqual(need);
    }
  });

  it("progression usa a mesma xpToLevel", () => {
    expect(PROGRESSION_BALANCE.xpToLevel(D2_LEVEL_START)).toBe(xpToLevel(D2_LEVEL_START));
  });
});

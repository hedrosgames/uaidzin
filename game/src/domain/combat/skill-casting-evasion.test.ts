import { describe, expect, it, vi } from "vitest";
import { resolveSkill } from "./SkillCasting";
import type { SkillDef } from "../../data/classes/skill-types";
import { emptyMods } from "./CombatMods";

const physicalSkill: SkillDef = {
  id: "test_phys",
  name: "Test",
  kind: "damage",
  shape: "single",
  range: 5,
  mp: 1,
  cooldown: 1,
  damageMultiplier: 1,
  power: "weapon",
  auto: "damage",
  weaponAny: [],
};

const magicSkill: SkillDef = {
  ...physicalSkill,
  id: "test_magic",
  power: "magic",
};

describe("resolveSkill evasion", () => {
  it("ataque mágico pode errar por evasão do monstro", () => {
    const roll = vi.spyOn(Math, "random").mockReturnValue(0.08);
    const resolved = resolveSkill({
      skill: magicSkill,
      attack: 20,
      magicAttack: 30,
      maxHp: 100,
      px: 0,
      pz: 0,
      facing: 0,
      targets: [{ id: "m1", x: 1, z: 0, alive: true }],
      defenseOf: () => 0,
      evasionOf: () => 0.1,
      hpOf: () => ({ hp: 50, maxHp: 50 }),
      mods: emptyMods(),
      transformed: false,
      treeColor: 0xffffff,
      specEffectiveness: 1,
    });
    roll.mockRestore();
    expect(resolved?.hits.length).toBe(0);
  });

  it("ataque físico por skill aplica o mesmo roll de evasão", () => {
    const roll = vi.spyOn(Math, "random").mockReturnValue(0.08);
    const resolved = resolveSkill({
      skill: physicalSkill,
      attack: 20,
      magicAttack: 10,
      maxHp: 100,
      px: 0,
      pz: 0,
      facing: 0,
      targets: [{ id: "m1", x: 1, z: 0, alive: true }],
      defenseOf: () => 0,
      evasionOf: () => 0.1,
      hpOf: () => ({ hp: 50, maxHp: 50 }),
      mods: emptyMods(),
      transformed: false,
      treeColor: 0xffffff,
      specEffectiveness: 1,
    });
    roll.mockRestore();
    expect(resolved?.hits.length).toBe(0);
  });
});

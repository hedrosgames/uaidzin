import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BM_MAGIA } from "../../data/classes/skills/bm";
import { CharacterModel } from "../character/CharacterModel";
import { BuffService } from "../character/BuffService";
import { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { buildCombatMods } from "./CombatMods";
import { FormState } from "./FormState";
import { SkillController } from "./SkillController";
import { SkillLoadout } from "./SkillLoadout";
import { SummonRuntime } from "./SummonRuntime";

function setup(skillId: string) {
  const tree = new SkillTreeService();
  tree.setClass("BM");
  tree.grantSkillPoints(1000);
  BM_MAGIA.forEach((_skill, index) => expect(tree.learn("magia", index)).toBe(true));
  const loadout = new SkillLoadout(tree);
  loadout.assign(skillId, 0);
  const character = new CharacterModel({ maxHp: 1000, attack: 100, defense: 100 });
  character.baseMagicAttack = 80;
  character.maxMp = 1000;
  character.mp = 1000;
  const buffs = new BuffService();
  const form = new FormState();
  const summons = new SummonRuntime();
  const controller = new SkillController(loadout, character, tree);
  const targets: AttackTarget[] = [{ id: "front", x: 0, z: 2, alive: true }];
  const cast = (dt = 0, manual = -1, foes = targets, moving = false, resist = 0) =>
    controller.tick(dt, moving, manual, true, foes, 0, 0, 0, () => 0, () => 0,
      () => resist, () => ({ hp: 10000, maxHp: 10000 }), buffs, form, summons, null);
  return { tree, loadout, character, buffs, form, summons, controller, cast };
}

describe("BM magia comprado no runtime", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it.each(BM_MAGIA.filter(skill => skill.kind !== "passive"))(
    "$name usa MP, cooldown, auto e ativação manual",
    skill => {
      const s = setup(skill.id);
      expect(s.cast()?.slot.skill.id).toBe(skill.id);
      expect(s.character.mp).toBe(1000 - skill.mp);
      expect(s.loadout.slots[0]?.cd).toBe(skill.cooldown);
      expect(s.cast(skill.cooldown / 2, 0)).toBeNull();
      expect(s.character.mp).toBe(1000 - skill.mp);
      s.buffs.clear();
      s.form.clear();
      s.summons.clear();
      expect(s.cast(skill.cooldown / 2)?.slot.skill.id).toBe(skill.id);
      s.controller.reset();
      s.loadout.toggleAuto(0);
      expect(s.cast()).toBeNull();
      expect(s.cast(0, 0)?.slot.skill.id).toBe(skill.id);
      s.controller.reset();
      s.character.mp = skill.mp - 1;
      expect(s.cast(0, 0)).toBeNull();
      expect(s.character.mp).toBe(skill.mp - 1);
      expect(s.loadout.slots[0]?.cd).toBe(0);
    },
  );

  it("compra apenas uma oitava árvore e mantém a ordem de aquisição", () => {
    const tree = new SkillTreeService();
    tree.setClass("BM");
    tree.grantSkillPoints(1000);
    expect(tree.learn("magia", 1)).toBe(false);
    BM_MAGIA.forEach((_skill, index) => expect(tree.learn("magia", index)).toBe(true));
    expect(tree.state.eighthTree).toBe("magia");
    expect(tree.learn("magia", 0)).toBe(false);
    for (const other of ["fisica", "magia", "controle"] as const) {
      if (other !== "magia") expect(tree.canLearnEighthInTree(other)).toBe(false);
    }
  });

  it.each(BM_MAGIA.filter(skill => skill.kind === "damage"))(
    "$name usa poder mágico, alcance e resistência elemental",
    skill => {
      const s = setup(skill.id);
      const range = skill.radius ?? skill.range;
      const foes = [
        { id: "edge", x: 0, z: range, alive: true },
        { id: "back", x: 0, z: -range, alive: true },
        { id: "outside", x: 0, z: range + 0.01, alive: true },
        { id: "dead", x: 0, z: 1, alive: false },
      ];
      const resolved = s.cast(0, -1, foes)?.resolved;
      expect(resolved?.hits).toHaveLength(skill.shape === "aoe" ? 2 : 1);
      expect(resolved?.hits.every(hit => hit.id !== "outside" && hit.id !== "dead")).toBe(true);
      const rawDamage = Math.round(80 * skill.damageMultiplier);
      expect(resolved?.hits[0]?.damage).toBe(rawDamage);
      s.controller.reset();
      expect(s.cast(0, -1, foes, false, 0.5)?.resolved.hits[0]?.damage).toBe(Math.round(rawDamage * 0.5));
      s.controller.reset();
      expect(s.cast(0, -1, [foes[2]])).toBeNull();
    },
  );

  it("gelo, água e raio carregam seus efeitos de controle", () => {
    const ice = setup("bm_mag_fenda_glacial").cast()?.resolved.enemyEffects[0]?.effect;
    expect(ice).toEqual({ slow: 0.5, slowSec: 3.2 });
    const water = setup("bm_mag_corrente_agua").cast()?.resolved.enemyEffects[0]?.effect;
    expect(water).toEqual({ slow: 0.55, slowSec: 3 });
    const lightning = setup("bm_mag_voz_trovao").cast()?.resolved.enemyEffects[0]?.effect;
    expect(lightning).toEqual({ stunSec: 1.2, stunChance: 0.35 });
  });

  it("Manto Elemental e Muralha de Rocha aplicam seus buffs por 12 s", () => {
    const mantle = setup("bm_mag_manto");
    mantle.cast(0, 0, []);
    const mantleMods = buildCombatMods(mantle.buffs.active, [], null, mantle.form);
    expect(mantleMods.magicPower).toBeCloseTo(0.22);
    expect(mantleMods.magicResist).toBeCloseTo(0.2);
    mantle.buffs.tick(12);
    expect(mantle.buffs.active).toHaveLength(0);
    const wall = setup("bm_mag_muralha");
    wall.cast(0, 0, []);
    const wallMods = buildCombatMods(wall.buffs.active, [], null, wall.form);
    expect(wallMods.defenseMul).toBeCloseTo(1.28);
    expect(wallMods.reflect).toBeCloseTo(0.22);
    wall.buffs.tick(12);
    expect(wall.buffs.active).toHaveLength(0);
  });

  it("movimento bloqueia auto, ativação manual vazia consome mana", () => {
    const s = setup("bm_mag_dardo_igneo");
    expect(s.cast(0, -1, [], true)).toBeNull();
    expect(s.character.mp).toBe(1000);
    expect(s.cast(0, 0, [], true)?.resolved.hits).toEqual([]);
    expect(s.character.mp).toBe(994);
  });
});

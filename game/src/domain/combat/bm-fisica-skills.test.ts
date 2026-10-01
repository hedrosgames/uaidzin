import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BM_FISICA } from "../../data/classes/skills/bm";
import { CharacterModel } from "../character/CharacterModel";
import { BuffService } from "../character/BuffService";
import { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { buildCombatMods } from "./CombatMods";
import { FormState } from "./FormState";
import { learnedPassives, SkillController } from "./SkillController";
import { SkillLoadout } from "./SkillLoadout";
import { SummonRuntime } from "./SummonRuntime";

function setup(skillId: string) {
  const tree = new SkillTreeService();
  tree.setClass("BM");
  tree.grantSkillPoints(1000);
  BM_FISICA.forEach((_skill, index) => expect(tree.learn("fisica", index)).toBe(true));
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

describe("BM fisica comprado no runtime", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it.each(BM_FISICA.filter(skill => skill.kind !== "passive"))(
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
    expect(tree.learn("fisica", 1)).toBe(false);
    BM_FISICA.forEach((_skill, index) => expect(tree.learn("fisica", index)).toBe(true));
    expect(tree.state.eighthTree).toBe("fisica");
    expect(tree.learn("fisica", 0)).toBe(false);
    for (const other of ["fisica", "magia", "controle"] as const) {
      if (other !== "fisica") expect(tree.canLearnEighthInTree(other)).toBe(false);
    }
  });

  it.each(BM_FISICA.filter(skill => skill.kind === "transform"))(
    "$name aplica a forma, seus atributos e expira",
    skill => {
      const s = setup(skill.id);
      expect(s.cast(0, 0, [])).not.toBeNull();
      const transform = skill.transform!;
      expect(s.form.id).toBe(transform.id);
      const mods = buildCombatMods([], [], null, s.form);
      expect(mods.attackMul).toBeCloseTo(transform.attack);
      expect(mods.defenseMul).toBeCloseTo(transform.defense);
      expect(mods.maxHpMul).toBeCloseTo(transform.hp - 1);
      expect(mods.attackSpeed).toBeCloseTo(transform.attackSpeed ?? 0);
      s.form.advance(transform.sec);
      expect(s.form.active).toBe(false);
      expect(buildCombatMods([], [], null, s.form).attackMul).toBe(1);
    },
  );

  it("Couro de Fera e Fúria Selvagem aplicam e removem seus dois buffs", () => {
    const hide = setup("bm_fis_couro_fera");
    hide.cast(0, 0, []);
    const hideMods = buildCombatMods(hide.buffs.active, [], null, hide.form);
    expect(hideMods.defenseMul).toBeCloseTo(1.22);
    expect(hideMods.maxHpMul).toBeCloseTo(0.18);
    hide.buffs.tick(14);
    expect(hide.buffs.active).toHaveLength(0);
    const fury = setup("bm_fis_furia_selvagem");
    fury.cast(0, 0, []);
    const furyMods = buildCombatMods(fury.buffs.active, [], null, fury.form);
    expect(furyMods.attackMul).toBeCloseTo(1.22);
    expect(furyMods.attackSpeed).toBeCloseTo(0.24);
    fury.buffs.tick(12);
    expect(fury.buffs.active).toHaveLength(0);
  });

  it.each(BM_FISICA.filter(skill => skill.kind === "damage"))(
    "$name respeita alcance e causa dano da arma",
    skill => {
      const s = setup(skill.id);
      const foes = [
        { id: "edge", x: 0, z: skill.range, alive: true },
        { id: "outside", x: 0, z: skill.range + 0.01, alive: true },
      ];
      const resolved = s.cast(0, -1, foes, false, 0.9)?.resolved;
      expect(resolved?.hits).toEqual([{ id: "edge", x: 0, z: skill.range, damage: Math.round(100 * skill.damageMultiplier) }]);
      if (skill.enemy) expect(resolved?.enemyEffects[0]?.effect.knock).toBe(1.8);
      s.controller.reset();
      expect(s.cast(0, -1, [foes[1]])).toBeNull();
    },
  );

  it("Presas de Aço só aumenta crítico transformado e fica fora da barra", () => {
    const s = setup("bm_fis_lobo_guerreiro");
    const passives = learnedPassives(s.tree);
    expect(passives.map(skill => skill.id)).toEqual(["bm_fis_presas_aco"]);
    expect(s.loadout.assign("bm_fis_presas_aco", 1)).toBe(false);
    expect(buildCombatMods([], passives, null, s.form).transformedCrit).toBe(0);
    s.cast(0, 0);
    expect(buildCombatMods([], passives, null, s.form).transformedCrit).toBeCloseTo(0.18);
    s.form.advance(18);
    expect(buildCombatMods([], passives, null, s.form).transformedCrit).toBe(0);
  });
});

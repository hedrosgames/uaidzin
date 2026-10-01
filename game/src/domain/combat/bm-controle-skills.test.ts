import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BM_CONTROLE } from "../../data/classes/skills/bm";
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
  BM_CONTROLE.forEach((_skill, index) => expect(tree.learn("controle", index)).toBe(true));
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

describe("BM controle comprado no runtime", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it.each(BM_CONTROLE.filter(skill => skill.kind !== "passive"))(
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
    expect(tree.learn("controle", 1)).toBe(false);
    BM_CONTROLE.forEach((_skill, index) => expect(tree.learn("controle", index)).toBe(true));
    expect(tree.state.eighthTree).toBe("controle");
    expect(tree.learn("controle", 0)).toBe(false);
    for (const other of ["fisica", "magia", "controle"] as const) {
      if (other !== "controle") expect(tree.canLearnEighthInTree(other)).toBe(false);
    }
  });

  it.each(BM_CONTROLE.filter(skill => skill.kind === "summon"))(
    "$name cria as criaturas esperadas e evita reinvocação automática",
    skill => {
      const s = setup(skill.id);
      s.cast();
      const specs = skill.pack ?? [skill.summon!];
      expect(s.summons.actors.map(actor => actor.kind)).toEqual(specs.map(spec => spec.id));
      expect(s.summons.actors.map(actor => actor.attack)).toEqual(specs.map(spec => 100 * spec.attackMul));
      s.controller.reset();
      expect(s.cast()).toBeNull();
      s.summons.actors[0].hp = 1;
      expect(s.cast(0, 0)?.slot.skill.id).toBe(skill.id);
      expect(s.summons.actors).toHaveLength(specs.length);
      expect(s.summons.actors[0].hp).toBe(s.summons.actors[0].maxHp);
    },
  );

  it("Chamado do Boss fortalece criaturas já invocadas e expira", () => {
    const s = setup("bm_ctrl_chamado_boss");
    const wolf = BM_CONTROLE.find(skill => skill.id === "bm_ctrl_lobo")!.summon!;
    s.summons.spawn(wolf, 100, 0, 0, 0);
    const baseAttack = s.summons.actors[0].attack;
    const baseHp = s.summons.actors[0].maxHp;
    s.cast(0, 0, []);
    const mods = buildCombatMods(s.buffs.active, [], null, s.form);
    expect(mods.summonPower).toBeCloseTo(0.35);
    s.summons.tick(0, [], { x: 0, z: 0 }, mods.summonPower);
    expect(s.summons.actors[0].attack).toBeCloseTo(baseAttack * 1.35);
    expect(s.summons.actors[0].maxHp).toBe(Math.round(70 * wolf.hpMul * 1.175));
    s.buffs.tick(14);
    s.summons.tick(0, [], { x: 0, z: 0 }, buildCombatMods(s.buffs.active, [], null, s.form).summonPower);
    expect(s.summons.actors[0].attack).toBe(baseAttack);
    expect(s.summons.actors[0].maxHp).toBe(baseHp);
  });

  it("Vínculo Vital fica fora da barra e divide o dano recebido pela invocação", () => {
    const s = setup("bm_ctrl_lobo");
    expect(s.loadout.assign("bm_ctrl_vinculo", 1)).toBe(false);
    const passives = learnedPassives(s.tree);
    expect(passives.map(skill => skill.id)).toEqual(["bm_ctrl_vinculo"]);
    const mods = buildCombatMods([], passives, null, s.form);
    expect(mods.summonLink).toBe(0.5);
    s.cast();
    const actor = s.summons.actors[0];
    expect(s.summons.damage(actor.uid, 20, mods.summonLink)).toEqual({ summon: 10, player: 10 });
    expect(actor.hp).toBe(actor.maxHp - 10);
  });

  it("Dragão preserva alcance, intervalo e raio de dano secundário", () => {
    const s = setup("bm_ctrl_dragao");
    s.cast();
    const actor = s.summons.actors[0];
    expect(actor.range).toBe(4.6);
    expect(actor.interval).toBe(1.35);
    expect(s.summons.tick(0.5, [{ id: "foe", x: actor.x, z: actor.z + 3, alive: true, defense: 0 }])[0]?.splash).toBe(2.2);
  });
});

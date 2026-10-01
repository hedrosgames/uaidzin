import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { totalSkillPurchaseCostForTree } from "../../data/balance/skill-purchase";
import { FM_CONTROLE } from "../../data/classes/skills/fm";
import { normalizeSavePayload } from "../../persistence/migrations";
import { BuffService } from "../character/BuffService";
import { CharacterModel } from "../character/CharacterModel";
import { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { buildCombatMods } from "./CombatMods";
import { FormState } from "./FormState";
import { SkillController } from "./SkillController";
import { SkillLoadout } from "./SkillLoadout";
import { SummonRuntime } from "./SummonRuntime";

function setup(skillId: string) {
  const tree = new SkillTreeService();
  tree.setClass("FM");
  tree.grantSkillPoints(totalSkillPurchaseCostForTree());
  FM_CONTROLE.forEach((_skill, index) => expect(tree.learn("controle", index)).toBe(true));
  const loadout = new SkillLoadout(tree);
  loadout.assign(skillId, 0);
  const character = new CharacterModel({ maxHp: 1000, attack: 100, defense: 100 });
  character.baseMagicAttack = 200;
  character.hp = 500;
  character.maxMp = 1000;
  character.mp = 1000;
  const buffs = new BuffService();
  const form = new FormState();
  const controller = new SkillController(loadout, character, tree);
  const summons = new SummonRuntime();
  const cast = (options: { dt?: number; manual?: number; targets?: AttackTarget[]; resist?: number; enemyHp?: number } = {}) =>
    controller.tick(options.dt ?? 0, false, options.manual ?? -1, true,
      options.targets ?? [{ id: "alvo", x: 0, z: 2, alive: true }], 0, 0, 0,
      () => 0, () => 0, () => options.resist ?? 0,
      () => ({ hp: options.enemyHp ?? 1000, maxHp: 1000 }), buffs, form, summons, null);
  return { tree, loadout, character, buffs, form, controller, cast };
}

describe("FM White Mage comprada no runtime", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it("exige pré-requisito, compra as oito skills e migra IDs de save antigos", () => {
    const empty = new SkillTreeService();
    empty.setClass("FM");
    empty.grantSkillPoints(1000);
    expect(empty.learn("controle", 1)).toBe(false);
    const s = setup("fm_ctrl_cura");
    expect(s.tree.state.skillPoints).toBe(0);
    expect(s.tree.state.eighthTree).toBe("controle");
    const saved = normalizeSavePayload({
      saveVersion: 4,
      character: { classId: "FM" },
      skills: { classId: "FM", learned: ["fm_ctrl_1", "fm_ctrl_4", "fm_ctrl_8"] },
      skillLoadout: { slots: [
        { skillId: "fm_ctrl_1", tree: "controle", index: 0, auto: false },
        { skillId: "fm_ctrl_8", tree: "controle", index: 9, auto: true },
      ] },
    }, "admin:slot:2");
    expect(saved.skills.learned).toEqual(["fm_ctrl_cura", "fm_ctrl_purificacao", "fm_ctrl_graca_ceu"]);
    const restoredTree = new SkillTreeService();
    restoredTree.setClass("FM");
    saved.skills.learned.forEach(id => restoredTree.state.learned.add(id));
    const restored = new SkillLoadout(restoredTree);
    restored.applySaved(saved.skillLoadout.slots);
    restored.refresh();
    expect(restored.slots[0]?.skill.id).toBe("fm_ctrl_cura");
    expect(restored.slots[0]?.auto).toBe(false);
    expect(restored.slots[9]?.skill.id).toBe("fm_ctrl_graca_ceu");
  });

  it.each(FM_CONTROLE)("$name usa mana, cooldown e mantém cast manual com auto desligado", skill => {
    const s = setup(skill.id);
    s.loadout.toggleAuto(0);
    expect(s.cast()).toBeNull();
    expect(s.character.mp).toBe(1000);
    expect(s.cast({ manual: 0 })?.slot.skill.id).toBe(skill.id);
    expect(s.character.mp).toBe(1000 - skill.mp);
    expect(s.loadout.slots[0]?.cd).toBe(skill.cooldown);
    expect(s.cast({ manual: 0 })).toBeNull();
    s.buffs.clear();
    expect(s.cast({ dt: skill.cooldown, manual: 0, targets: [] })).not.toBeNull();
    s.controller.reset();
    s.character.mp = skill.mp - 1;
    expect(s.cast({ manual: 0 })).toBeNull();
    expect(s.loadout.slots[0]?.cd).toBe(0);
  });

  it("Cura automática respeita 62% de HP e o manual funciona sem alvo", () => {
    const s = setup("fm_ctrl_cura");
    s.character.hp = 621;
    expect(s.cast({ targets: [] })).toBeNull();
    s.character.hp = 620;
    expect(s.cast({ targets: [] })?.resolved.heal).toBe(220);
    s.controller.reset();
    s.character.hp = 1000;
    const cast = s.cast({ manual: 0, targets: [] });
    expect(cast?.resolved.heal).toBe(220);
    s.character.heal(cast!.resolved.heal);
    expect(s.character.hp).toBe(1000);
  });

  it("Purificação cura e remove somente os efeitos negativos", () => {
    const s = setup("fm_ctrl_purificacao");
    s.buffs.add({ id: "veneno", stat: "defense", magnitude: -0.2, remainingSec: 10, stacks: 1, harmful: true });
    s.buffs.add({ id: "bencao", stat: "defense", magnitude: 0.2, remainingSec: 10, stacks: 1 });
    const cast = s.cast({ manual: 0, targets: [] });
    expect(cast?.resolved.heal).toBe(160);
    expect(cast?.resolved.cleanse).toBe(true);
    expect(s.buffs.active.map(buff => buff.id)).toEqual(["bencao"]);
  });

  it("Bênção aplica defesa e resistência mágica durante 14 s", () => {
    const s = setup("fm_ctrl_bencao");
    s.cast({ targets: [] });
    const mods = buildCombatMods(s.buffs.active, [], null, s.form);
    expect(mods.defenseMul).toBeCloseTo(1.2);
    expect(mods.magicResist).toBeCloseTo(0.15);
    s.buffs.tick(14);
    expect(s.buffs.active).toHaveLength(0);
  });

  it("Vontade Divina aumenta magia e cura, e expira após 12 s", () => {
    const s = setup("fm_ctrl_vontade_divina");
    s.cast({ targets: [] });
    const mods = buildCombatMods(s.buffs.active, [], null, s.form);
    expect(mods.magicPower).toBeCloseTo(0.24);
    expect(mods.healPower).toBeCloseTo(0.25);
    s.loadout.assign("fm_ctrl_cura", 0);
    expect(s.cast({ targets: [] })?.resolved.heal).toBe(275);
    s.loadout.assign("fm_ctrl_julgamento", 0);
    expect(s.cast()?.resolved.hits[0]?.damage).toBe(322);
    s.buffs.tick(12);
    expect(s.buffs.active).toHaveLength(0);
  });

  it.each([
    ["fm_ctrl_julgamento", 260],
    ["fm_ctrl_lanca_luz", 380],
  ] as const)("%s usa ataque mágico, defesa e resistência sagrada", (id, baseDamage) => {
    const s = setup(id);
    expect(s.cast({ targets: [{ id: "fora", x: 0, z: 8.01, alive: true }] })).toBeNull();
    expect(s.cast({ resist: 0.5, targets: [{ id: "borda", x: 0, z: 8, alive: true }] })?.resolved.hits[0]?.damage).toBe(baseDamage / 2);
    s.controller.reset();
    vi.mocked(Math.random).mockReturnValue(0);
    expect(s.cast()?.resolved.hits).toEqual([]);
  });

  it("Castigo Celestial ganha 65% de dano somente a partir de 40% de HP", () => {
    const s = setup("fm_ctrl_castigo");
    expect(s.cast({ enemyHp: 401 })?.resolved.hits[0]?.damage).toBe(340);
    s.controller.reset();
    expect(s.cast({ enemyHp: 400 })?.resolved.hits[0]?.damage).toBe(561);
  });

  it("Graça do Céu cura sem alvo e atinge somente inimigos dentro do raio", () => {
    const s = setup("fm_ctrl_graca_ceu");
    expect(s.cast({ manual: 0, targets: [] })?.resolved.heal).toBe(200);
    s.controller.reset();
    const cast = s.cast({ targets: [
      { id: "centro", x: 0, z: 0, alive: true },
      { id: "borda", x: 4.2, z: 0, alive: true },
      { id: "fora", x: 4.21, z: 0, alive: true },
    ] });
    expect(cast?.resolved.hits.map(hit => [hit.id, hit.damage])).toEqual([["centro", 320], ["borda", 320]]);
    expect(cast?.resolved.heal).toBe(200);
  });

  it("especialização White Mage aumenta dano, cura e buffs sem alterar recarga", () => {
    const s = setup("fm_ctrl_cura");
    s.tree.spendSpec("controle", 40);
    expect(s.cast({ targets: [] })?.resolved.heal).toBe(880);
    expect(s.loadout.slots[0]?.cooldown).toBe(2.4);
    s.loadout.assign("fm_ctrl_julgamento", 0);
    expect(s.cast()?.resolved.hits[0]?.damage).toBe(1040);
    s.loadout.assign("fm_ctrl_bencao", 0);
    const buffs = s.cast({ targets: [] })?.resolved.buffs;
    expect(buffs?.map(buff => buff.magnitude)).toEqual([0.8, 0.6]);
    expect(buffs?.map(buff => buff.remainingSec)).toEqual([14, 14]);
  });
});

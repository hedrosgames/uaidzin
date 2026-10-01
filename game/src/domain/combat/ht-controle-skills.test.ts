import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HT_CONTROLE } from "../../data/classes/skills/ht";
import { totalSkillPurchaseCostForTree } from "../../data/balance/skill-purchase";
import { migrateSave } from "../../persistence/migrations";
import { CharacterModel } from "../character/CharacterModel";
import { BuffService } from "../character/BuffService";
import { EnemyModel } from "../enemies/EnemyModel";
import { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { buildCombatMods } from "./CombatMods";
import { FormState } from "./FormState";
import { learnedPassives, SkillController } from "./SkillController";
import { SkillLoadout } from "./SkillLoadout";
import { SummonRuntime } from "./SummonRuntime";

const skills = HT_CONTROLE;
const treeId = "controle";
const nearbyTargets: AttackTarget[] = [
  { id: "near", x: 0, z: 2, alive: true },
  { id: "companion", x: 0, z: 4, alive: true },
];

function setup(skillId = skills[0].id) {
  const tree = new SkillTreeService();
  tree.setClass("HT");
  tree.grantSkillPoints(totalSkillPurchaseCostForTree());
  skills.forEach((_skill, index) => expect(tree.learn(treeId, index)).toBe(true));
  const loadout = new SkillLoadout(tree);
  loadout.assign(skillId, 0);
  const character = new CharacterModel({ maxHp: 1000, attack: 100, defense: 100 });
  character.baseMagicAttack = 200;
  character.maxMp = 1000;
  character.mp = 1000;
  const buffs = new BuffService();
  const form = new FormState();
  const summons = new SummonRuntime();
  const controller = new SkillController(loadout, character, tree);
  const cast = (options: {
    dt?: number; manual?: number; targets?: AttackTarget[]; defense?: number;
    evasion?: number; resist?: number; weapon?: string | null; hpRatio?: number;
    moving?: boolean; auto?: boolean;
  } = {}) => controller.tick(
    options.dt ?? 0, options.moving ?? false, options.manual ?? -1,
    options.auto ?? true, options.targets ?? nearbyTargets, 0, 0, 0,
    () => options.defense ?? 0, () => options.evasion ?? 0,
    () => options.resist ?? 0,
    () => ({ hp: 10000 * (options.hpRatio ?? 1), maxHp: 10000 }),
    buffs, form, summons, options.weapon ?? null,
  );
  return { tree, loadout, character, buffs, form, summons, controller, cast };
}

describe("HT controle adquirida e usada", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it("compra os oito slots em sequência, cobra pontos e bloqueia recompra", () => {
    const tree = new SkillTreeService();
    tree.setClass("HT");
    tree.grantSkillPoints(totalSkillPurchaseCostForTree());
    expect(tree.learn(treeId, 1)).toBe(false);
    skills.forEach((skill, index) => {
      expect(tree.learn(treeId, index)).toBe(true);
      expect(tree.hasSkill(skill.id)).toBe(true);
      expect(tree.learn(treeId, index)).toBe(false);
    });
    expect(tree.state.skillPoints).toBe(0);
    expect(tree.state.eighthTree).toBe(treeId);
  });

  it("preserva IDs, posições, auto e passivas ao normalizar save e restaurar barra", () => {
    const state = setup();
    state.loadout.clearSlot(0);
    const actives = skills.filter(skill => skill.kind !== "passive");
    actives.forEach((skill, index) => expect(state.loadout.assign(skill.id, index)).toBe(true));
    state.loadout.toggleAuto(0);
    for (const skill of skills.filter(skill => skill.kind === "passive")) {
      expect(state.loadout.assign(skill.id, 9)).toBe(false);
    }
    const payload = migrateSave(JSON.parse(JSON.stringify({
      saveVersion: 4,
      character: { name: "Caçadora", classId: "HT", level: 250 },
      skills: {
        ...state.tree.state,
        learned: Array.from(state.tree.state.learned),
      },
      skillLoadout: { slots: state.loadout.snapshot() },
    })), "admin:slot:3")!;
    expect(payload.skills.learned).toEqual(skills.map(skill => skill.id));
    const restoredTree = new SkillTreeService();
    restoredTree.setClass("HT");
    restoredTree.state.learned = new Set(payload.skills.learned);
    const restored = new SkillLoadout(restoredTree);
    restored.applySaved(payload.skillLoadout.slots);
    restored.refresh();
    expect(restored.snapshot()).toEqual(state.loadout.snapshot());
    expect(restored.slots[0]?.auto).toBe(false);
    expect(learnedPassives(restoredTree).map(skill => skill.id))
      .toEqual(skills.filter(skill => skill.kind === "passive").map(skill => skill.id));
  });

  it.each(skills.filter(skill => skill.kind !== "passive"))(
    "$name gasta MP, inicia recarga e aceita uso manual vazio",
    skill => {
      const state = setup(skill.id);
      expect(state.cast({ manual: 0, targets: [] })?.slot.skill.id).toBe(skill.id);
      expect(state.character.mp).toBe(1000 - skill.mp);
      expect(state.loadout.slots[0]?.cd).toBe(skill.cooldown);
      expect(state.cast({ dt: skill.cooldown / 2, manual: 0, targets: [] })).toBeNull();
      expect(state.character.mp).toBe(1000 - skill.mp);
      state.buffs.clear();
      expect(state.cast({ dt: skill.cooldown / 2, manual: 0, targets: [] })?.slot.skill.id).toBe(skill.id);
    },
  );

  it.each(skills.filter(skill => skill.kind !== "passive"))(
    "$name respeita auto desligado, movimento e mana insuficiente",
    skill => {
      const state = setup(skill.id);
      state.loadout.toggleAuto(0);
      expect(state.cast()).toBeNull();
      expect(state.cast({ auto: false })).toBeNull();
      expect(state.character.mp).toBe(1000);
      state.loadout.toggleAuto(0);
      expect(state.cast({ moving: true })).toBeNull();
      state.character.mp = skill.mp - 1;
      expect(state.cast({ manual: 0 })).toBeNull();
      expect(state.loadout.slots[0]?.cd).toBe(0);
      state.character.mp = skill.mp;
      expect(state.cast({ manual: 0, moving: true })?.slot.skill.id).toBe(skill.id);
      expect(state.character.mp).toBe(0);
    },
  );

  it.each(skills.filter(skill => skill.kind === "damage"))(
    "$name usa auto com alvo vivo no alcance e bloqueia ausência de alvo",
    skill => {
      const state = setup(skill.id);
      const edge = { id: "edge", x: 0, z: skill.range, alive: true };
      expect(state.cast({ targets: [{ ...edge, z: skill.range + 0.01 }] })).toBeNull();
      expect(state.cast({ targets: [{ ...edge, alive: false }] })).toBeNull();
      expect(state.cast({ targets: [] })).toBeNull();
      expect(state.character.mp).toBe(1000);
      expect(state.cast({ targets: [edge] })?.resolved.hits.length).toBeGreaterThan(0);
      expect(state.character.mp).toBe(1000 - skill.mp);
    },
  );

  it.each(skills.filter(skill => skill.kind === "damage"))(
    "$name não aplica dano nem status quando todos os acertos falham",
    skill => {
      const state = setup(skill.id);
      vi.mocked(Math.random).mockReturnValue(0);
      const cast = state.cast({ manual: 0 });
      expect(cast?.resolved.hits).toEqual([]);
      expect(cast?.resolved.enemyEffects).toEqual([]);
      expect(cast?.resolved.lifesteal).toBe(0);
      expect(state.character.mp).toBe(1000 - skill.mp);
    },
  );


  it("Presa Ferida aplica cinco segundos de sangramento no inimigo", () => {
    const state = setup("ht_ctrl_presa_ferida");
    const plan = state.cast()!.resolved.enemyEffects[0];
    const enemy = new EnemyModel({
      id: "near", archetype: "chaser", x: 0, z: 2, homeX: 0, homeZ: 2,
      maxHp: 1000, attack: 10, defense: 0, range: 2, attackInterval: 1, respawnSeconds: 5,
    });
    enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, 0, 0);
    expect(enemy.dotTimer).toBe(5);
    let damage = 0;
    for (let second = 0; second < 5; second++) damage += enemy.tickStatus(1);
    expect(damage).toBe(290);
    expect(enemy.dotTimer).toBe(0);
    expect(enemy.dotDps).toBe(0);
  });

  it("Garra Cortante usa arma e alcança apenas um alvo", () => {
    const state = setup("ht_ctrl_garra");
    expect(state.cast()?.resolved.hits).toEqual([{ id: "near", x: 0, z: 2, damage: 125 }]);
  });

  it.each([
    ["ht_ctrl_mais_um_golpe", "attackSpeed", 0.3, 10],
    ["ht_ctrl_rugido", "attackMul", 1.2, 12],
  ] as const)("%s mantém o buff até expirar", (id, stat, expected, duration) => {
    const state = setup(id);
    expect(state.cast({ targets: [] })).not.toBeNull();
    expect(buildCombatMods(state.buffs.active, [], null, state.form)[stat]).toBeCloseTo(expected);
    state.controller.reset();
    expect(state.cast({ targets: [] })).toBeNull();
    state.buffs.tick(duration + 0.01);
    const baseline = stat === "attackMul" ? 1 : 0;
    expect(buildCombatMods(state.buffs.active, [], null, state.form)[stat]).toBe(baseline);
    expect(state.cast({ targets: [] })).not.toBeNull();
  });

  it("Rugido aplica ataque e velocidade de ataque juntos", () => {
    const state = setup("ht_ctrl_rugido");
    const cast = state.cast({ targets: [] });
    expect(cast?.resolved.buffs).toHaveLength(2);
    const mods = buildCombatMods(state.buffs.active, [], null, state.form);
    expect(mods.attackMul).toBeCloseTo(1.2);
    expect(mods.attackSpeed).toBeCloseTo(0.18);
    state.buffs.tick(12.01);
    expect(state.buffs.active).toEqual([]);
  });

  it("Presa Ferida vincula sangramento ao golpe que acertou", () => {
    const state = setup("ht_ctrl_presa_ferida");
    const cast = state.cast();
    expect(cast?.resolved.hits[0].damage).toBe(145);
    expect(cast?.resolved.enemyEffects).toEqual([
      { id: "near", effect: { dotRatio: 0.4, dotSec: 5 }, dotDps: 58 },
    ]);
  });

  it("Roubo Vital devolve 45 % do dano mitigado", () => {
    const state = setup("ht_ctrl_roubo_vital");
    const cast = state.cast({ defense: 100 });
    expect(cast?.resolved.hits[0].damage).toBe(100);
    expect(cast?.resolved.lifesteal).toBe(45);
    expect(cast?.resolved.heal).toBe(0);
  });

  it("Dodge soma esquiva sem equipamento e não entra na barra", () => {
    const state = setup();
    const passives = learnedPassives(state.tree);
    expect(buildCombatMods([], passives, null, state.form).evasion).toBeCloseTo(0.1);
    expect(state.loadout.assign("ht_ctrl_dodge", 1)).toBe(false);
  });

  it.each(["greatsword", "greatstaff", "dual-sword", "bow", null])(
    "Poder das Duas Mãos verifica arma %s",
    weapon => {
      const state = setup("ht_ctrl_garra");
      const isTwoHand = weapon === "greatsword" || weapon === "greatstaff";
      const mods = buildCombatMods([], learnedPassives(state.tree), weapon, state.form);
      expect(mods.attackMul).toBeCloseTo(isTwoHand ? 1.24 : 1);
      expect(state.cast({ weapon })?.resolved.hits[0].damage).toBe(isTwoHand ? 155 : 125);
    },
  );

  it("Invisibilidade dura 5 s, amplifica o próximo acerto e é consumida", () => {
    const state = setup("ht_ctrl_invisibilidade");
    expect(state.cast({ manual: 0, targets: [] })).not.toBeNull();
    expect(state.buffs.active[0].remainingSec).toBe(5);
    expect(buildCombatMods(state.buffs.active, [], null, state.form).stealth).toBe(true);
    state.loadout.assign("ht_ctrl_garra", 0);
    expect(state.cast({ manual: 0 })?.resolved.hits[0].damage).toBe(213);
    expect(state.buffs.has("ht_stealth")).toBe(false);
    state.controller.reset();
    expect(state.cast({ manual: 0 })?.resolved.hits[0].damage).toBe(125);
  });

  it("Invisibilidade permanece se o golpe falhar e desaparece ao expirar", () => {
    const state = setup("ht_ctrl_invisibilidade");
    state.cast({ manual: 0, targets: [] });
    state.loadout.assign("ht_ctrl_garra", 0);
    vi.mocked(Math.random).mockReturnValue(0);
    expect(state.cast({ manual: 0 })?.resolved.hits).toEqual([]);
    expect(state.buffs.has("ht_stealth")).toBe(true);
    state.buffs.tick(5.01);
    expect(buildCombatMods(state.buffs.active, [], null, state.form).stealth).toBe(false);
    expect(state.buffs.consumeStealth()).toBe(1);
  });

  it("esquiva do inimigo impede sangramento e roubo de vida", () => {
    for (const id of ["ht_ctrl_presa_ferida", "ht_ctrl_roubo_vital"]) {
      const state = setup(id);
      vi.mocked(Math.random).mockReturnValue(0.08);
      const cast = state.cast({ evasion: 0.1 });
      expect(cast?.resolved.hits).toEqual([]);
      expect(cast?.resolved.enemyEffects).toEqual([]);
      expect(cast?.resolved.lifesteal).toBe(0);
    }
  });
});

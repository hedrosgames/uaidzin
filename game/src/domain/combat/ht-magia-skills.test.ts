import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HT_MAGIA } from "../../data/classes/skills/ht";
import { totalSkillPurchaseCostForTree } from "../../data/balance/skill-purchase";
import { migrateSave } from "../../persistence/migrations";
import { CharacterModel } from "../character/CharacterModel";
import { BuffService } from "../character/BuffService";
import { EnemyModel } from "../enemies/EnemyModel";
import { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { FormState } from "./FormState";
import { learnedPassives, SkillController } from "./SkillController";
import { SkillLoadout } from "./SkillLoadout";
import { SummonRuntime } from "./SummonRuntime";

const skills = HT_MAGIA;
const treeId = "magia";
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

describe("HT magia adquirida e usada", () => {
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


  it("Trovão atordoa com sorteio abaixo de 30 % e expira em um segundo", () => {
    const state = setup("ht_mag_flecha_trovao");
    const plan = state.cast()!.resolved.enemyEffects[0];
    const enemy = new EnemyModel({
      id: "near", archetype: "chaser", x: 0, z: 2, homeX: 0, homeZ: 2,
      maxHp: 1000, attack: 10, defense: 0, range: 2, attackInterval: 1, respawnSeconds: 5,
    });
    vi.mocked(Math.random).mockReturnValue(0.3);
    enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, 0, 0);
    expect(enemy.stunTimer).toBe(0);
    vi.mocked(Math.random).mockReturnValue(0.299);
    enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, 0, 0);
    expect(enemy.stunTimer).toBe(1);
    enemy.tickStatus(1.01);
    expect(enemy.stunTimer).toBe(0);
  });

  it("Glacial aplica lentidão real por três segundos", () => {
    const state = setup("ht_mag_flecha_glacial");
    const plan = state.cast()!.resolved.enemyEffects[0];
    const enemy = new EnemyModel({
      id: "near", archetype: "chaser", x: 0, z: 2, homeX: 0, homeZ: 2,
      maxHp: 1000, attack: 10, defense: 0, range: 2, attackInterval: 1, respawnSeconds: 5,
    });
    enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, 0, 0);
    expect(enemy.slowFactor).toBe(0.5);
    expect(enemy.slowTimer).toBe(3);
    enemy.tickStatus(3.01);
    expect(enemy.slowFactor).toBe(1);
  });

  it("Flecha Arcana usa ataque mágico contra um único alvo", () => {
    const state = setup("ht_mag_flecha_arcana");
    expect(state.cast()?.resolved.hits).toEqual([{ id: "near", x: 0, z: 2, damage: 230 }]);
  });

  it.each([
    ["ht_mag_flecha_ignea", "fire", 260],
    ["ht_mag_flecha_glacial", "ice", 290],
    ["ht_mag_flecha_trovao", "lightning", 320],
    ["ht_mag_flecha_espectral", "shadow", 370],
    ["ht_mag_vagalume", "fire", 440],
    ["ht_mag_tempestade", "mixed", 520],
  ] as const)("%s aplica resistência do elemento %s", (id, _element, fullDamage) => {
    const state = setup(id);
    expect(state.cast()?.resolved.hits[0].damage).toBe(fullDamage);
    state.controller.reset();
    expect(state.cast({ resist: 0.5 })?.resolved.hits[0].damage).toBe(fullDamage / 2);
  });

  it("Flecha Glacial aplica lentidão depois de acertar", () => {
    const state = setup("ht_mag_flecha_glacial");
    expect(state.cast()?.resolved.enemyEffects).toEqual([
      { id: "near", effect: { slow: 0.5, slowSec: 3 }, dotDps: 0 },
    ]);
  });

  it("Flecha de Trovão preserva duração e probabilidade de atordoamento", () => {
    const state = setup("ht_mag_flecha_trovao");
    expect(state.cast()?.resolved.enemyEffects).toEqual([
      { id: "near", effect: { stunSec: 1, stunChance: 0.3 }, dotDps: 0 },
    ]);
  });

  it("Flecha Espectral ignora 35 % da defesa antes da resistência", () => {
    const state = setup("ht_mag_flecha_espectral");
    expect(state.cast({ defense: 100 })?.resolved.hits[0].damage).toBe(224);
    state.controller.reset();
    expect(state.cast({ defense: 100, resist: 0.5 })?.resolved.hits[0].damage).toBe(112);
  });

  it.each([
    ["ht_mag_chuva_mistica", 3.8, 360],
    ["ht_mag_vagalume", 3.6, 440],
    ["ht_mag_tempestade", 4.6, 520],
  ] as const)("%s atinge todos em volta do personagem até %s m", (id, radius, damage) => {
    const state = setup(id);
    const targets = [
      { id: "front", x: 0, z: radius, alive: true },
      { id: "back", x: 0, z: -radius, alive: true },
      { id: "outside", x: radius + 0.01, z: 0, alive: true },
      { id: "dead", x: 0, z: 1, alive: false },
    ];
    const hits = state.cast({ targets })?.resolved.hits;
    expect(hits?.map(hit => hit.id)).toEqual(["front", "back"]);
    expect(hits?.map(hit => hit.damage)).toEqual([damage, damage]);
  });

  it("esquiva do inimigo impede lentidão e atordoamento", () => {
    for (const id of ["ht_mag_flecha_glacial", "ht_mag_flecha_trovao"]) {
      const state = setup(id);
      vi.mocked(Math.random).mockReturnValue(0.08);
      const cast = state.cast({ evasion: 0.1 });
      expect(cast?.resolved.hits).toEqual([]);
      expect(cast?.resolved.enemyEffects).toEqual([]);
    }
  });
});

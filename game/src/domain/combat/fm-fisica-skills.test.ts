import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { totalSkillPurchaseCostForTree } from "../../data/balance/skill-purchase";
import { FM_FISICA } from "../../data/classes/skills/fm";
import { normalizeSavePayload } from "../../persistence/migrations";
import { BuffService } from "../character/BuffService";
import { CharacterModel } from "../character/CharacterModel";
import { EnemyModel } from "../enemies/EnemyModel";
import { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { buildCombatMods } from "./CombatMods";
import { FormState } from "./FormState";
import { learnedPassives, SkillController } from "./SkillController";
import { SkillLoadout } from "./SkillLoadout";
import { SummonRuntime } from "./SummonRuntime";

function setup(skillId: string) {
  const tree = new SkillTreeService();
  tree.setClass("FM");
  tree.grantSkillPoints(totalSkillPurchaseCostForTree());
  FM_FISICA.forEach((_skill, index) => expect(tree.learn("fisica", index)).toBe(true));
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
  const cast = (options: { dt?: number; manual?: number; targets?: AttackTarget[]; resist?: number; weapon?: string } = {}) =>
    controller.tick(options.dt ?? 0, false, options.manual ?? -1, true,
      options.targets ?? [{ id: "alvo", x: 0, z: 2, alive: true }], 0, 0, 0,
      () => 0, () => 0, () => options.resist ?? 0,
      () => ({ hp: 10000, maxHp: 10000 }), buffs, form, summons, options.weapon ?? null);
  return { tree, loadout, character, buffs, form, controller, cast };
}

describe("FM física comprada no runtime", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it("compra a árvore em sequência e restaura barra com passiva fora dos slots", () => {
    const s = setup("fm_fis_impacto_longinquo");
    expect(s.tree.state.skillPoints).toBe(0);
    expect(s.tree.state.eighthTree).toBe("fisica");
    expect(s.tree.learn("fisica", 0)).toBe(false);
    expect(s.loadout.assign("fm_fis_mestre_arco", 1)).toBe(false);
    expect(s.loadout.assign("fm_fis_negacao_vida", 9)).toBe(true);
    s.loadout.toggleAuto(9);
    const saved = normalizeSavePayload({
      saveVersion: 4,
      character: { classId: "FM" },
      skills: { ...s.tree.state, learned: [...s.tree.state.learned] },
      skillLoadout: { slots: s.loadout.snapshot() },
    }, "admin:slot:1");
    const restoredTree = new SkillTreeService();
    restoredTree.setClass("FM");
    saved.skills.learned.forEach(id => restoredTree.state.learned.add(id));
    const restored = new SkillLoadout(restoredTree);
    restored.applySaved(saved.skillLoadout.slots);
    restored.refresh();
    expect(restored.slots).toHaveLength(10);
    expect(restored.slots[0]?.skill.id).toBe("fm_fis_impacto_longinquo");
    expect(restored.slots[9]?.skill.id).toBe("fm_fis_negacao_vida");
    expect(restored.slots[9]?.auto).toBe(false);
    expect(learnedPassives(restoredTree).map(skill => skill.id)).toEqual(["fm_fis_mestre_arco"]);
  });

  it("Mestre do Arco aplica ataque somente ao arco equipado", () => {
    const s = setup("fm_fis_impacto_longinquo");
    const passives = learnedPassives(s.tree);
    expect(buildCombatMods([], passives, "bow", s.form).attackMul).toBeCloseTo(1.28);
    for (const weapon of [null, "greatstaff", "dual-sword"]) {
      expect(buildCombatMods([], passives, weapon, s.form).attackMul).toBe(1);
    }
    expect(s.cast({ weapon: "bow" })?.resolved.hits[0]?.damage).toBe(186);
  });

  it.each(FM_FISICA.filter(skill => skill.kind !== "passive"))("$name gasta mana, inicia recarga e permite manual vazio", skill => {
    const s = setup(skill.id);
    s.loadout.toggleAuto(0);
    expect(s.cast({ targets: [] })).toBeNull();
    const first = s.cast({ manual: 0, targets: [] });
    expect(first?.slot.skill.id).toBe(skill.id);
    expect(first?.resolved.hits).toEqual([]);
    expect(s.character.mp).toBe(1000 - skill.mp);
    expect(s.loadout.slots[0]?.cd).toBe(skill.cooldown);
    expect(s.cast({ manual: 0, targets: [] })).toBeNull();
    expect(s.cast({ dt: skill.cooldown, manual: 0, targets: [] })).not.toBeNull();
    s.controller.reset();
    s.character.mp = skill.mp - 1;
    expect(s.cast({ manual: 0, targets: [] })).toBeNull();
    expect(s.loadout.slots[0]?.cd).toBe(0);
  });

  it("Impacto Longínquo escolhe um alvo a até 8 m e ignora resistência elemental", () => {
    const s = setup("fm_fis_impacto_longinquo");
    expect(s.cast({ targets: [{ id: "fora", x: 0, z: 8.01, alive: true }] })).toBeNull();
    expect(s.character.mp).toBe(1000);
    const hits = s.cast({ resist: 0.5, targets: [
      { id: "fora", x: 0, z: 8.01, alive: true },
      { id: "borda", x: 0, z: 8, alive: true },
      { id: "morto", x: 0, z: 1, alive: false },
    ] })?.resolved.hits;
    expect(hits).toEqual([{ id: "borda", x: 0, z: 8, damage: 145 }]);
  });

  it.each([
    ["fm_fis_olho_falcao", "evasion", 0.14, 12],
    ["fm_fis_furia_combate", "attackMul", 1.26, 12],
    ["fm_fis_guarda_solida", "defenseMul", 1.3, 12],
    ["fm_fis_conversao_vital", "mpToHp", 0.55, 14],
    ["fm_fis_ponto_critico", "critChance", 0.16, 12],
  ] as const)("%s aplica modificador e expira", (id, stat, expected, duration) => {
    const s = setup(id);
    expect(s.cast({ targets: [] })).not.toBeNull();
    expect(buildCombatMods(s.buffs.active, [], null, s.form)[stat]).toBeCloseTo(expected);
    if (id === "fm_fis_olho_falcao") {
      expect(buildCombatMods(s.buffs.active, [], null, s.form).moveSpeed).toBeCloseTo(0.22);
    }
    expect(s.cast({ dt: FM_FISICA.find(skill => skill.id === id)!.cooldown, targets: [] })).toBeNull();
    s.buffs.tick(duration);
    expect(s.buffs.active).toHaveLength(0);
    expect(s.cast({ targets: [] })).not.toBeNull();
  });

  it("Conversão Vital cura conforme a mana efetivamente gasta pela skill seguinte", () => {
    const s = setup("fm_fis_conversao_vital");
    s.cast({ manual: 0, targets: [] });
    s.loadout.assign("fm_fis_impacto_longinquo", 0);
    expect(s.cast()?.resolved.heal).toBe(3);
    s.buffs.tick(14);
    s.controller.reset();
    expect(s.cast()?.resolved.heal).toBe(0);
  });

  it("Negação de Vida usa ataque da arma e aplica anticura apenas aos alvos atingidos", () => {
    const s = setup("fm_fis_negacao_vida");
    const cast = s.cast({ resist: 0.5, targets: [
      { id: "alvo", x: 0, z: 4.2, alive: true },
      { id: "fora", x: 0, z: 4.21, alive: true },
    ] });
    expect(cast?.resolved.hits).toEqual([{ id: "alvo", x: 0, z: 4.2, damage: 180 }]);
    const plan = cast!.resolved.enemyEffects[0]!;
    expect(plan.effect.antiHealSec).toBe(6);
    const enemy = new EnemyModel({ id: "alvo", archetype: "chaser", x: 0, z: 4.2,
      homeX: 0, homeZ: 4.2, maxHp: 1000, attack: 10, defense: 0, range: 2,
      attackInterval: 1, respawnSeconds: 0 });
    enemy.applyDamage(180);
    enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, 0, 0);
    expect(enemy.antiHealTimer).toBe(6);
    expect(enemy.heal(100)).toBe(0);
    expect(enemy.hp).toBe(820);
    enemy.tickStatus(5.9);
    expect(enemy.heal(100)).toBe(0);
    enemy.tickStatus(0.2);
    expect(enemy.antiHealTimer).toBe(0);
    expect(enemy.heal(300)).toBe(180);
    expect(enemy.hp).toBe(1000);
    s.controller.reset();
    vi.mocked(Math.random).mockReturnValue(0);
    const missed = s.cast();
    expect(missed?.resolved.hits).toEqual([]);
    expect(missed?.resolved.enemyEffects).toEqual([]);
  });

  it("especialização física aumenta dano e magnitude dos buffs sem mudar a duração", () => {
    const s = setup("fm_fis_impacto_longinquo");
    expect(s.tree.spendSpec("fisica", 40)).toBe(true);
    expect(s.cast()?.resolved.hits[0]?.damage).toBe(580);
    s.loadout.assign("fm_fis_guarda_solida", 0);
    const buff = s.cast({ manual: 0, targets: [] })?.resolved.buffs[0];
    expect(buff?.magnitude).toBeCloseTo(1.2);
    expect(buff?.remainingSec).toBe(12);
  });
});

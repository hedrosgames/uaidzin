import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { totalSkillPurchaseCostForTree } from "../../data/balance/skill-purchase";
import { FM_MAGIA } from "../../data/classes/skills/fm";
import { normalizeSavePayload } from "../../persistence/migrations";
import { getSkillVfxProfile } from "../../presentation/effects/skill/SkillVfxCatalog";
import { BuffService } from "../character/BuffService";
import { CharacterModel } from "../character/CharacterModel";
import { EnemyModel } from "../enemies/EnemyModel";
import { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { FormState } from "./FormState";
import { SkillController } from "./SkillController";
import { SkillLoadout } from "./SkillLoadout";
import { SummonRuntime } from "./SummonRuntime";

function setup(skillId: string) {
  const tree = new SkillTreeService();
  tree.setClass("FM");
  tree.grantSkillPoints(totalSkillPurchaseCostForTree());
  FM_MAGIA.forEach((_skill, index) => expect(tree.learn("magia", index)).toBe(true));
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
  const cast = (options: { dt?: number; manual?: number; targets?: AttackTarget[]; defense?: number; resist?: number; evasion?: number } = {}) =>
    controller.tick(options.dt ?? 0, false, options.manual ?? -1, true,
      options.targets ?? [{ id: "alvo", x: 0, z: 2, alive: true }], 0, 0, 0,
      () => options.defense ?? 0, () => options.evasion ?? 0, () => options.resist ?? 0,
      () => ({ hp: 10000, maxHp: 10000 }), buffs, form, summons, null);
  return { tree, loadout, character, buffs, controller, cast };
}

function enemyAt(x = 0, z = 2): EnemyModel {
  return new EnemyModel({ id: "alvo", archetype: "chaser", x, z, homeX: x, homeZ: z,
    maxHp: 10000, attack: 10, defense: 0, range: 2, attackInterval: 1, respawnSeconds: 0 });
}

describe("FM Maga negra comprada no runtime", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it("compra somente uma oitava e restaura IDs e slots da árvore mágica", () => {
    const s = setup("fm_mag_esfera_ignea");
    expect(s.tree.state.skillPoints).toBe(0);
    expect(s.tree.state.eighthTree).toBe("magia");
    expect(s.tree.canLearnEighthInTree("fisica")).toBe(false);
    expect(s.tree.canLearnEighthInTree("controle")).toBe(false);
    s.loadout.assign("fm_mag_colapso", 9);
    const saved = normalizeSavePayload({
      saveVersion: 4,
      character: { classId: "FM" },
      skills: { ...s.tree.state, learned: [...s.tree.state.learned] },
      skillLoadout: { slots: s.loadout.snapshot() },
    }, "admin:slot:3");
    const restoredTree = new SkillTreeService();
    restoredTree.setClass("FM");
    saved.skills.learned.forEach(id => restoredTree.state.learned.add(id));
    const restored = new SkillLoadout(restoredTree);
    restored.applySaved(saved.skillLoadout.slots);
    restored.refresh();
    expect(restored.snapshot()).toEqual(s.loadout.snapshot());
  });

  it.each(FM_MAGIA)("$name respeita alcance, mana, recarga, auto e cast manual vazio", skill => {
    const s = setup(skill.id);
    expect(s.cast({ targets: [] })).toBeNull();
    expect(s.character.mp).toBe(1000);
    const radius = skill.radius ?? skill.range;
    expect(s.cast({ targets: [{ id: "fora", x: 0, z: radius + 0.01, alive: true }] })).toBeNull();
    const cast = s.cast({ targets: [{ id: "borda", x: 0, z: radius, alive: true }] });
    expect(cast?.resolved.hits[0]?.damage).toBe(Math.round(200 * skill.damageMultiplier));
    expect(s.character.mp).toBe(1000 - skill.mp);
    expect(s.loadout.slots[0]?.cd).toBe(skill.cooldown);
    expect(s.cast()).toBeNull();
    s.loadout.toggleAuto(0);
    expect(s.cast({ dt: skill.cooldown })).toBeNull();
    const empty = s.cast({ manual: 0, targets: [] });
    expect(empty?.resolved.hits).toEqual([]);
    expect(s.character.mp).toBe(1000 - 2 * skill.mp);
    s.controller.reset();
    s.character.mp = skill.mp - 1;
    expect(s.cast({ manual: 0 })).toBeNull();
    expect(s.loadout.slots[0]?.cd).toBe(0);
    expect(getSkillVfxProfile(skill.id)?.family).toBe(skill.shape === "aoe" ? "aoe" : "projectile");
  });

  it.each(FM_MAGIA)("$name usa resistência elemental e especialização mágica", skill => {
    const s = setup(skill.id);
    const baseDamage = Math.round(200 * skill.damageMultiplier);
    expect(s.cast({ resist: 0.5 })?.resolved.hits[0]?.damage).toBe(Math.round(baseDamage / 2));
    s.controller.reset();
    s.tree.spendSpec("magia", 40);
    expect(s.cast()?.resolved.hits[0]?.damage).toBe(baseDamage * 4);
    expect(s.loadout.slots[0]?.cooldown).toBe(skill.cooldown);
  });

  it.each(FM_MAGIA)("$name não aplica efeitos quando o inimigo esquiva", skill => {
    const s = setup(skill.id);
    vi.mocked(Math.random).mockReturnValue(0.08);
    const cast = s.cast({ evasion: 0.1 });
    expect(cast?.resolved.hits).toEqual([]);
    expect(cast?.resolved.enemyEffects).toEqual([]);
    expect(s.character.mp).toBe(1000 - skill.mp);
  });

  it("Lança Glacial reduz movimento pela metade e expira em 3,2 s", () => {
    const s = setup("fm_mag_lanca_glacial");
    const plan = s.cast()!.resolved.enemyEffects[0]!;
    const enemy = enemyAt();
    enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, 0, 0);
    expect(enemy.slowFactor).toBe(0.5);
    expect(enemy.slowTimer).toBe(3.2);
    enemy.tickStatus(3.2);
    expect(enemy.slowFactor).toBe(1);
    expect(enemy.slowTimer).toBe(0);
  });

  it("Picada Peçonhenta aplica cinco segundos de dano periódico após resistência", () => {
    const s = setup("fm_mag_picada");
    const cast = s.cast({ resist: 0.5 })!;
    expect(cast.resolved.hits[0]?.damage).toBe(160);
    const plan = cast.resolved.enemyEffects[0]!;
    expect(plan.dotDps).toBe(64);
    const enemy = enemyAt();
    enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, 0, 0);
    let damage = 0;
    for (let step = 0; step < 20; step++) damage += enemy.tickStatus(0.25);
    expect(damage).toBeCloseTo(320);
    expect(enemy.tickStatus(1)).toBe(0);
    expect(enemy.dotTimer).toBe(0);
  });

  it("Sombra Corrosiva ignora 30% da defesa antes da resistência", () => {
    const s = setup("fm_mag_sombra_corrosiva");
    expect(s.cast({ defense: 100, resist: 0.5 })?.resolved.hits[0]?.damage).toBe(118);
  });

  it.each(FM_MAGIA.filter(skill => skill.shape === "aoe"))("$name atinge todos dentro do raio sem incluir mortos", skill => {
    const s = setup(skill.id);
    const radius = skill.radius!;
    const cast = s.cast({ targets: [
      { id: "centro", x: 0, z: 0, alive: true },
      { id: "borda", x: radius, z: 0, alive: true },
      { id: "fora", x: radius + 0.01, z: 0, alive: true },
      { id: "morto", x: 0, z: 1, alive: false },
    ] });
    expect(cast?.resolved.hits.map(hit => hit.id)).toEqual(["centro", "borda"]);
    if (skill.id === "fm_mag_nevasca") {
      expect(cast?.resolved.enemyEffects).toHaveLength(2);
      const plan = cast!.resolved.enemyEffects[0]!;
      const enemy = enemyAt();
      enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, 0, 0);
      expect(enemy.slowFactor).toBe(0.45);
      expect(enemy.slowTimer).toBe(3.5);
      enemy.tickStatus(3.5);
      expect(enemy.slowFactor).toBe(1);
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLASSES, type ClassId, type SkillDef } from "../../data/classes/class-definitions";
import { CharacterModel } from "../../domain/character/CharacterModel";
import { BuffService } from "../../domain/character/BuffService";
import { SkillController } from "../../domain/combat/SkillController";
import { SkillLoadout } from "../../domain/combat/SkillLoadout";
import { FormState } from "../../domain/combat/FormState";
import { SummonRuntime } from "../../domain/combat/SummonRuntime";
import { EnemyModel } from "../../domain/enemies/EnemyModel";
import { SkillTreeService } from "../../domain/skills/SkillTreeService";
import { CombatOrchestrator, type CombatOrchestratorDeps } from "./CombatOrchestrator";

const classIds: ClassId[] = ["BM", "HT", "FM"];
const entries = classIds.flatMap(classId => ["fisica", "controle", "magia"].flatMap(tree =>
  CLASSES[classId].trees[tree as "fisica"].filter(skill => skill.kind !== "passive")
    .map(skill => ({ classId, skill }))));

function setup(classId: ClassId, skill: SkillDef) {
  const tree = new SkillTreeService();
  tree.setClass(classId);
  tree.state.learned.add(skill.id);
  const skillLoadout = new SkillLoadout(tree);
  skillLoadout.assign(skill.id, 0);
  const character = new CharacterModel({ maxHp: 1000, attack: 100, defense: 100 });
  character.baseMagicAttack = 100;
  character.maxMp = 1000;
  character.mp = 1000;
  character.hp = 500;
  const enemy = new EnemyModel({ id: "target", archetype: "fixed", x: 0, z: 1.8,
    homeX: 0, homeZ: 1.8, maxHp: 10000, attack: 1, defense: 0, range: 0,
    attackInterval: 10, respawnSeconds: 10 });
  const buffs = new BuffService();
  const form = new FormState();
  const summons = new SummonRuntime();
  const player = { x: 0, z: 0, facing: 0, isMoving: false };
  const skillController = new SkillController(skillLoadout, character, tree);
  const emit = vi.fn();
  const dispatch = vi.fn();
  let manual = 0;
  let lock = 0;
  const world = { id: "dungeon-test", collision: { boxes: [], circles: [] } };
  const deps = {
    enemies: { enemies: [enemy], updateRespawns: vi.fn(), findById: (id: string) => id === enemy.id ? enemy : undefined,
      aliveTargets: () => [{ id: enemy.id, x: enemy.x, z: enemy.z, alive: enemy.alive }], onEnemyDeath: vi.fn() },
    enemyView: { playHit: vi.fn(), playDeath: vi.fn(), playAttack: vi.fn(), getMesh: vi.fn() },
    attack: { setReach: vi.fn(), tick: () => null, tryManual: () => null },
    skill: skillController, skillLoadout, skillTree: tree, buffs, form, summons,
    summonView: { sync: vi.fn() }, character, progression: { state: { classId } },
    equipment: { getWeaponSet: () => null },
    effects: { dispatchSkillVfx: dispatch, playSkillVfx: vi.fn(), spawnDamageNumber: vi.fn(),
      playHitFlash: vi.fn(), playAttackPulse: vi.fn(), playDeath: vi.fn(), hideHpBar: vi.fn(),
      cameraPunch: vi.fn(), spawnHpBar: vi.fn(), enemyFireball: vi.fn() },
    renderer: { playerView: { playAttack: vi.fn(() => "attack"), playCast: vi.fn(), getWeaponSet: () => null,
      getAnimDurationSec: () => 1 } },
    bus: { emit }, player, rewards: { grantKillXp: vi.fn(), flushFrameCheckpoint: vi.fn() },
    enemyAi: { update: () => ({ wantsAttack: false }) }, worlds: { getCurrent: () => world },
    lockFromAnim: () => { lock = 1; }, skillSlotPressed: () => { const value = manual; manual = -1; return value; },
    getWeaponReach: () => ({ attackRange: 2, attackInterval: 1 }),
    onCombatMiss: vi.fn(), onPlayerDeath: vi.fn(), getMoveLock: () => lock,
    triggerHitStop: vi.fn(), onAutoAttackSwing: vi.fn(), isAutoAttackEnabled: () => false,
    isAutoSkillBarEnabled: () => false, consumeClickAttack: () => null,
  } as unknown as CombatOrchestratorDeps;
  const combat = new CombatOrchestrator(deps);
  const update = (dt: number) => { lock = Math.max(0, lock - dt); combat.updateCombat(dt); };
  return { combat, character, enemy, buffs, form, summons, deps, dispatch, emit, update, world,
    press: () => { manual = 0; } };
}

describe("Disparo das skills de BM, HT e FM no runtime", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it.each(entries)("$classId $skill.name espera a animação e conclui efeito e VFX", ({ classId, skill }) => {
    const s = setup(classId, skill);
    s.update(0);
    expect(s.character.mp).toBe(1000 - skill.mp);
    expect(s.enemy.hp).toBe(10000);
    expect(s.buffs.active).toHaveLength(0);
    expect(s.form.active).toBe(false);
    expect(s.summons.actors).toHaveLength(0);
    expect(s.character.hp).toBe(500);
    expect(s.dispatch).not.toHaveBeenCalled();
    s.update(0.44);
    expect(s.dispatch).not.toHaveBeenCalled();
    s.update(0.02);
    expect(s.dispatch).toHaveBeenCalledOnce();
    s.update(0.8);
    expect(s.emit.mock.calls.filter(call => call[0] === "skill:used")).toHaveLength(1);
    if (skill.kind === "damage") expect(s.enemy.hp).toBeLessThan(10000);
    if (skill.buff) expect(s.buffs.has(skill.buff.id)).toBe(true);
    if (skill.transform) expect(s.form.id).toBe(skill.transform.id);
    if (skill.summon) expect(s.summons.hasKind(skill.summon.id)).toBe(true);
    if (skill.pack) expect(s.summons.actors).toHaveLength(skill.pack.length);
    if (skill.healRatio) expect(s.character.hp).toBeGreaterThan(500);
    expect(s.character.mp).toBe(1000 - skill.mp);
  });

  it("mudança de mundo cancela impactos e invocações pendentes", () => {
    const skill = CLASSES.BM.trees.controle[0];
    const s = setup("BM", skill);
    s.update(0);
    s.combat.clearPendingActions();
    s.update(2);
    expect(s.dispatch).not.toHaveBeenCalled();
    expect(s.summons.actors).toHaveLength(0);
    expect(s.emit.mock.calls.filter(call => call[0] === "skill:used")).toHaveLength(0);
  });

  it("impacto avança enquanto um painel impede novos ataques", () => {
    const s = setup("FM", CLASSES.FM.trees.magia[0]);
    s.update(0);
    s.combat.advancePendingActions(0.46);
    expect(s.dispatch).toHaveBeenCalledOnce();
    s.combat.advancePendingActions(0.8);
    expect(s.enemy.hp).toBeLessThan(10000);
    expect(s.character.mp).toBe(994);
  });

  it("Tiro Certeiro causa dano quando a flecha chega, após o disparo", () => {
    const s = setup("HT", CLASSES.HT.trees.fisica[0]);
    s.update(0);
    s.update(0.45);
    expect(s.dispatch).toHaveBeenCalledOnce();
    s.update(0.49);
    expect(s.enemy.hp).toBe(10000);
    s.update(0.02);
    expect(s.enemy.hp).toBeLessThan(10000);
  });

  it("mudança de arena durante o voo impede o dano", () => {
    const s = setup("HT", CLASSES.HT.trees.fisica[0]);
    s.update(0);
    s.world.collision.boxes.push({ minX: -1, maxX: 1, minZ: 0.5, maxZ: 1 } as never);
    s.update(2);
    expect(s.enemy.hp).toBe(10000);
  });

  it("resistência mágica reduz a bola de fogo e preserva ataque físico", () => {
    const damage = (magic: boolean, resistance: number) => {
      const s = setup("BM", CLASSES.BM.trees.magia[4]);
      Object.defineProperties(s.enemy, { archetype: { value: "ranged" }, attack: { value: 200 },
        modelUrl: { value: magic ? "/models/skeleton-special.glb" : "/models/archer.glb" } });
      s.buffs.add({ id: "resist", remainingSec: 10, stacks: 1, stat: "magicResist", magnitude: resistance });
      s.deps.enemyAi.update = () => ({ wantsAttack: true });
      s.update(0);
      return 500 - s.character.hp;
    };
    const magical = damage(true, 0);
    expect(damage(true, 0.2)).toBe(Math.max(1, Math.round(magical * 0.8)));
    expect(damage(false, 0.2)).toBe(damage(false, 0));
  });

  it("morte cancela impacto e cura pendentes", () => {
    const s = setup("FM", CLASSES.FM.trees.controle[0]);
    s.update(0);
    s.character.applyDamage(1000);
    s.combat.advancePendingActions(2);
    expect(s.character.hp).toBe(0);
    expect(s.dispatch).not.toHaveBeenCalled();
  });

  it("alvo morto durante o voo não gera roubo de vida", () => {
    const skill = CLASSES.HT.trees.controle.find(skill => skill.lifesteal)!;
    const s = setup("HT", skill);
    s.update(0);
    s.enemy.applyDamage(10000);
    s.update(2);
    expect(s.character.hp).toBe(500);
  });

  it("tecla manual não interrompe uma animação já bloqueada", () => {
    const s = setup("FM", CLASSES.FM.trees.magia[0]);
    s.update(0);
    s.deps.skillLoadout.resetCooldowns();
    s.press();
    s.update(0.1);
    expect(s.character.mp).toBe(994);
  });

  it("expiração de forma e mudança de magnitude invalidam os modificadores", () => {
    const s = setup("BM", CLASSES.BM.trees.fisica[0]);
    s.form.apply(CLASSES.BM.trees.fisica[0].transform!);
    expect(s.combat.getCombatMods().attackMul).toBeCloseTo(1.18);
    s.form.advance(19);
    expect(s.combat.getCombatMods().attackMul).toBe(1);
    s.buffs.add({ id: "power", remainingSec: 1, stacks: 1, stat: "attack", magnitude: 0.2 });
    expect(s.combat.getCombatMods().attackMul).toBeCloseTo(1.2);
    s.buffs.add({ id: "power", remainingSec: 1, stacks: 1, stat: "attack", magnitude: 0.5 });
    expect(s.combat.getCombatMods().attackMul).toBeCloseTo(1.5);
  });
});

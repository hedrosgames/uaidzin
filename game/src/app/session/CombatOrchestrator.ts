import { Vector3 } from "three";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import { applyPlayerCombatRatings } from "../../data/balance/combat-ratings";
import { buildCombatMods, type CombatMods } from "../../domain/combat/CombatMods";
import { learnedPassives, type SkillCast, type SkillController } from "../../domain/combat/SkillController";
import { calculateDamage } from "../../domain/combat/DamageCalculator";
import { rollHitSimple, rollPlayerAttackHits } from "../../domain/combat/HitChanceCalculator";
import { getSkillVfxProfile } from "../../presentation/effects/skill/SkillVfxCatalog";
import type { SkillVfxRequest } from "../../presentation/effects/skill/SkillVfxTypes";
import type { EnemyService } from "../../domain/enemies/EnemyService";
import type { EnemyRuntimeView } from "../../presentation/enemies/EnemyRuntimeView";
import type { AttackController } from "../../domain/combat/AttackController";
import type { SkillLoadout } from "../../domain/combat/SkillLoadout";
import type { SkillTreeService } from "../../domain/skills/SkillTreeService";
import type { BuffService } from "../../domain/character/BuffService";
import type { FormState } from "../../domain/combat/FormState";
import type { SummonRuntime } from "../../domain/combat/SummonRuntime";
import type { SummonView } from "../../presentation/combat/SummonView";
import type { CharacterModel } from "../../domain/character/CharacterModel";
import type { ProgressionService } from "../../domain/progression/ProgressionService";
import type { EquipmentService } from "../../domain/items/EquipmentService";
import type { EffectManager } from "../../presentation/effects/EffectManager";
import type { SceneRenderer } from "../../presentation/rendering/SceneRenderer";
import type { EventBus } from "../../core/events/EventBus";
import type { PlayerRuntime } from "../../gameplay/PlayerRuntime";
import type { RewardService } from "./RewardService";
import type { EnemyAI } from "../../domain/enemies/EnemyAI";
import type { WorldManager } from "../../world/WorldManager";
import {
  attackSpeedMultiplierToPercent,
  basicAttackAnimTimeScale,
  basicAttackHitCount,
} from "../../domain/combat/BasicAttackSpeed";
import { totalElementalResist } from "../../data/balance/elemental-resistance";
import type { SkillElement } from "../../data/classes/skill-types";
import { rollCritStrike } from "../../domain/combat/crit-strike";
import { canEngageEnemy } from "../../domain/combat/CombatSpace";
import { dungeon1ArenaFromZ } from "../../data/balance/xp-progression";
import type { AttackTarget } from "../../domain/combat/AttackController";
import type { ResolvedSkill } from "../../domain/combat/SkillCasting";
import { skillVfxImpactDelay } from "../../presentation/effects/skill/SkillVfxTiming";
import { positionBlocked, segmentBlocked } from "../../world/collision";

export interface CombatOrchestratorDeps {
  enemies: EnemyService;
  enemyView: EnemyRuntimeView;
  attack: AttackController;
  skill: SkillController;
  skillLoadout: SkillLoadout;
  skillTree: SkillTreeService;
  buffs: BuffService;
  form: FormState;
  summons: SummonRuntime;
  summonView: SummonView;
  character: CharacterModel;
  progression: ProgressionService;
  equipment: EquipmentService;
  effects: EffectManager;
  renderer: SceneRenderer;
  bus: EventBus;
  player: PlayerRuntime;
  rewards: RewardService;
  enemyAi: EnemyAI;
  worlds: WorldManager;
  lockFromAnim: (anim: "attack" | "cast" | "hit_gut" | "hit_right", fallback: number) => void;
  skillSlotPressed: () => number;
  getWeaponReach: () => { attackRange: number; attackInterval: number };
  onCombatMiss: () => void;
  onPlayerDeath: () => void;
  getMoveLock: () => number;
  triggerHitStop: (duration: number) => void;
  onAutoAttackSwing: () => void;
  isAutoAttackEnabled: () => boolean;
  isAutoSkillBarEnabled: () => boolean;
  consumeClickAttack: () => string | null;
}

export class CombatOrchestrator {
  private cachedMods: CombatMods | null = null;
  private cachedPassives: ReturnType<typeof learnedPassives> | null = null;
  private modsStamp = "";
  private pendingBasicAttack: { targetId: string; delay: number } | null = null;
  private readonly pendingSkillImpacts: Array<{
    skillId: string;
    resolved: ResolvedSkill;
    request: SkillVfxRequest | null;
    dispatchVfx: boolean;
    delay: number;
    impactDelayAfterVfx: number;
    cast?: SkillCast;
  }> = [];
  private readonly vOrigin = new Vector3();
  private readonly vTarget = new Vector3();
  private readonly vAim = new Vector3();

  constructor(private readonly deps: CombatOrchestratorDeps) {}

  invalidateMods(): void {
    this.cachedMods = null;
  }

  clearPendingActions(): void {
    this.pendingBasicAttack = null;
    this.pendingSkillImpacts.length = 0;
    this.invalidateMods();
  }

  invalidatePassives(): void {
    this.cachedPassives = null;
    this.cachedMods = null;
  }

  getLearnedPassives(): ReturnType<typeof learnedPassives> {
    if (!this.cachedPassives) {
      this.cachedPassives = learnedPassives(this.deps.skillTree);
    }
    return this.cachedPassives;
  }

  getCombatMods(): CombatMods {
    const character = this.deps.character;
    const buffStamp = this.deps.buffs.active.map(buff => `${buff.id}:${buff.stat}:${buff.magnitude}`).join("|");
    const stamp = `${buffStamp}|${this.deps.form.active}:${this.deps.form.id}|${this.deps.equipment.getWeaponSet(this.deps.progression.state.classId)}|${character.attributes.DES}|${character.equipCrit}|${character.equipSpeed}|${character.baseAttackSpeed}`;
    if (stamp !== this.modsStamp) {
      this.modsStamp = stamp;
      this.cachedMods = null;
    }
    if (!this.cachedMods) {
      const mods = buildCombatMods(
        this.deps.buffs.active,
        this.getLearnedPassives(),
        this.deps.equipment.getWeaponSet(this.deps.progression.state.classId),
        this.deps.form,
      );
      applyPlayerCombatRatings(mods, {
        des: this.deps.character.attributes.DES,
        equipCritPercent: this.deps.character.equipCrit,
      });
      mods.attackSpeed += Math.max(0, this.deps.character.baseAttackSpeed);
      mods.attackSpeed += Math.max(0, this.deps.character.equipSpeed || 0) * 0.01;
      this.cachedMods = mods;
    }
    return this.cachedMods;
  }

  private combatTargets(worldId: string): AttackTarget[] {
    const collision = this.deps.worlds.getCurrent()?.collision;
    const playerZ = this.deps.player.z;
    const playerX = this.deps.player.x;
    return this.deps.enemies.aliveTargets().filter((t) => {
      const enemy = this.deps.enemies.findById(t.id);
      if (!enemy) return false;
      return canEngageEnemy(worldId, playerX, playerZ, enemy.x, enemy.z, enemy.arenaIndex, collision);
    });
  }

  advancePendingActions(dt: number): void {
    if (this.deps.character.isDead) {
      this.clearPendingActions();
      return;
    }
    if (this.pendingBasicAttack) {
      this.pendingBasicAttack.delay -= dt;
      if (this.pendingBasicAttack.delay <= 0) {
        const targetId = this.pendingBasicAttack.targetId;
        this.pendingBasicAttack = null;
        this.resolveBasicAttack(targetId, this.getCombatMods());
      }
    }

    for (let i = this.pendingSkillImpacts.length - 1; i >= 0; i--) {
      const pending = this.pendingSkillImpacts[i]!;
      pending.delay -= dt;
      if (pending.delay > 0) continue;
      if (pending.dispatchVfx && pending.request) {
        this.deps.effects.dispatchSkillVfx(pending.request);
      }
      if (pending.impactDelayAfterVfx > 0) {
        pending.dispatchVfx = false;
        pending.delay += pending.impactDelayAfterVfx;
        pending.impactDelayAfterVfx = 0;
        if (pending.delay > 0) continue;
      }
      this.pendingSkillImpacts.splice(i, 1);
      if (pending.cast) {
        this.deps.skill.applyCasterEffects(pending.cast, this.deps.buffs, this.deps.form,
          this.deps.summons, this.deps.player.x, this.deps.player.z);
        if (pending.resolved.summons) {
          for (const actor of this.deps.summons.actors) {
            if (!pending.resolved.summons.some(spec => spec.id === actor.kind)) continue;
            const point = this.safeDisplacement(this.deps.player.x, this.deps.player.z, actor.x, actor.z, 0.28);
            actor.x = point.x;
            actor.z = point.z;
          }
        }
        this.invalidateMods();
      }
      this.applySkillImpact(pending.resolved, pending.skillId);
    }
  }

  updateCombat(dt: number, blockDamage = false, advanceActions = true): void {
    this.deps.enemies.updateRespawns(dt);
    if (advanceActions) this.advancePendingActions(dt);
    const worldId = this.deps.worlds.getCurrent()?.id ?? "";
    const playerArena = worldId === "dungeon-1" ? dungeon1ArenaFromZ(this.deps.player.z) : undefined;
    const targets = this.combatTargets(worldId);
    const reach = this.deps.getWeaponReach();
    const frameMods = this.getCombatMods();
    const speedMul = Math.max(COMBAT_BALANCE.basicAttackSpeedFloor, 1 + frameMods.attackSpeed);
    this.deps.attack.setReach(reach.attackRange, reach.attackInterval / speedMul);

    let hitTarget: AttackTarget | null = null;
    const clickId = this.deps.consumeClickAttack();
    if (clickId && this.deps.getMoveLock() <= 0 && !this.deps.player.isMoving) {
      const clicked = this.deps.enemies.findById(clickId);
      if (clicked?.alive) {
        hitTarget = this.deps.attack.tryManual(
          { id: clicked.id, x: clicked.x, z: clicked.z, alive: true },
          this.deps.player.x,
          this.deps.player.z,
        );
      }
    }
    if (!hitTarget) hitTarget = this.deps.attack.tick(
      dt,
      this.deps.player.isMoving || this.deps.getMoveLock() > 0 || !this.deps.isAutoAttackEnabled(),
      targets,
      this.deps.player.x,
      this.deps.player.z,
    );

    if (hitTarget) {
      const enemy = this.deps.enemies.findById(hitTarget.id);
      if (enemy) {
        const dx = enemy.x - this.deps.player.x;
        const dz = enemy.z - this.deps.player.z;
        this.deps.player.facing = Math.atan2(dx, dz);
        const animSpeed = basicAttackAnimTimeScale(speedMul);
        const atkAnim = this.deps.renderer.playerView.playAttack(animSpeed);
        this.deps.onAutoAttackSwing();
        this.deps.lockFromAnim(atkAnim, COMBAT_BALANCE.moveLock.attackFallback);
        this.pendingBasicAttack = {
          targetId: enemy.id,
          delay: Math.max(0.08, this.deps.renderer.playerView.getAnimDurationSec(atkAnim) * 0.45),
        };
      }
    }

    const manual = this.deps.skillSlotPressed();
    const cast = this.deps.skill.tick(
      dt,
      this.deps.player.isMoving || this.deps.getMoveLock() > 0,
      manual,
      this.deps.isAutoSkillBarEnabled(),
      targets,
      this.deps.player.x,
      this.deps.player.z,
      this.deps.player.facing,
      (id) => this.deps.enemies.findById(id)?.defense ?? 0,
      (id) => this.deps.enemies.findById(id)?.evasion ?? 0,
      (id, element?: SkillElement) => {
        const enemy = this.deps.enemies.findById(id);
        return totalElementalResist(element, enemy?.elementResists);
      },
      (id) => {
        const enemy = this.deps.enemies.findById(id);
        return { hp: enemy?.hp ?? 0, maxHp: enemy?.maxHp ?? 1 };
      },
      this.deps.buffs,
      this.deps.form,
      this.deps.summons,
      this.deps.renderer.playerView.getWeaponSet(),
      this.deps.isAutoAttackEnabled(),
      blockDamage,
      { deferEffects: this.deps.progression.state.classId !== "TK", actionLocked: this.deps.getMoveLock() > 0 },
    );

    if (cast) {
      const resolved = cast.resolved;
      const skill = cast.slot.skill;
      this.vOrigin.set(this.deps.player.x, 0, this.deps.player.z);
      const target = resolved.aim ? this.vTarget.set(resolved.aim.x, 0, resolved.aim.z) : null;
      const weaponAttackSkill = skill.kind === "damage" && skill.power === "weapon";
      if (target && (weaponAttackSkill || this.deps.progression.state.classId !== "TK")) {
        const dx = target.x - this.deps.player.x;
        const dz = target.z - this.deps.player.z;
        if (dx * dx + dz * dz > 1e-8) {
          this.deps.player.facing = Math.atan2(dx, dz);
        }
      }
      const facing = this.deps.player.facing;
      const aimPoint = target ?? this.vAim.set(
        this.deps.player.x + Math.sin(facing) * Math.max(1, skill.range),
        0,
        this.deps.player.z + Math.cos(facing) * Math.max(1, skill.range),
      );
      const center = skill.shape === "aoe" || skill.shape === "self" || !target ? this.vOrigin : aimPoint;
      const profile = getSkillVfxProfile(skill.id);
      let request: SkillVfxRequest | null = null;
      if (profile) {
        request = {
          profile,
          origin: this.vOrigin.clone(),
          target: aimPoint.clone(),
          center: center.clone(),
          colorHex: profile.colorHex,
          facing: this.deps.player.facing,
          range: skill.range,
          radius: skill.radius ?? (skill.shape === "aoe" ? skill.range : 0),
          hits: resolved.hits.map((hit, hitIndex) => ({ ...hit, hitIndex })),
          hasHeal: resolved.heal > 0,
          hasBuff: resolved.buffs.length > 0,
          hasTransform: resolved.transform != null,
          hasSummon: resolved.summons != null,
        };
      }
      if (this.deps.progression.state.classId !== "TK") {
        let anim: "attack" | "cast";
        if (weaponAttackSkill) anim = this.deps.renderer.playerView.playAttack(1);
        else {
          this.deps.renderer.playerView.playCast(1);
          anim = "cast";
        }
        this.deps.lockFromAnim(anim, COMBAT_BALANCE.moveLock.skillFallback);
        this.pendingSkillImpacts.push({
          skillId: skill.id,
          resolved,
          request,
          dispatchVfx: request !== null,
          delay: Math.max(0.08, this.deps.renderer.playerView.getAnimDurationSec(anim) * 0.45),
          impactDelayAfterVfx: request ? skillVfxImpactDelay(request) : 0,
          cast,
        });
      } else if (weaponAttackSkill) {
        const attackSpeed = skill.id === "tk_fis_force_wave" ? 1.5 : 1;
        const anim = this.deps.renderer.playerView.playAttack(attackSpeed);
        this.deps.lockFromAnim(anim, COMBAT_BALANCE.moveLock.attackFallback);
        this.pendingSkillImpacts.push({
          skillId: skill.id,
          resolved,
          request,
          dispatchVfx: request !== null,
          delay: Math.max(0.08, this.deps.renderer.playerView.getAnimDurationSec(anim) * 0.45),
          impactDelayAfterVfx: skill.id === "tk_fis_fire_burst" ? 0.5 : 0,
        });
      } else {
        if (request) {
          this.deps.effects.dispatchSkillVfx(request);
        } else {
          const aim = resolved.aim ?? { x: this.deps.player.x, z: this.deps.player.z + 1 };
          this.vAim.set(aim.x, 0, aim.z);
          this.deps.effects.playSkillVfx(
            resolved.vfx,
            this.vOrigin.clone(),
            this.vAim.clone(),
            resolved.color,
            skill.id,
          );
        }
        const anim = this.deps.renderer.playerView.playAttack(1);
        this.deps.lockFromAnim(anim, COMBAT_BALANCE.moveLock.skillFallback);
        this.applySkillImpact(resolved, skill.id);
      }
    }

    const strikes = this.deps.summons.tick(
      dt,
      targets.map((target) => this.deps.enemies.findById(target.id)!).map((enemy) => ({
        id: enemy.id,
        x: enemy.x,
        z: enemy.z,
        alive: enemy.alive,
        defense: enemy.defense,
      })),
      this.deps.player,
      this.getCombatMods().summonPower,
      this.deps.worlds.getCurrent()?.collision
        ? (fromX, fromZ, toX, toZ) => !segmentBlocked(fromX, fromZ, toX, toZ, this.deps.worlds.getCurrent()!.collision!, 0.28)
        : undefined,
    );
    for (const strike of strikes) {
      const enemy = this.deps.enemies.findById(strike.id);
      if (!enemy?.alive) continue;
      if (!rollPlayerAttackHits(enemy.evasion)) {
        this.deps.effects.spawnDamageNumber(enemy.x, 1.5, enemy.z, 0, "miss");
        continue;
      }
      const killed = enemy.applyDamage(strike.damage);
      this.deps.effects.spawnDamageNumber(enemy.x, 1.5, enemy.z, strike.damage, "skill");
      if (killed) {
        this.deps.rewards.grantKillXp(enemy);
        this.deps.enemyView.playDeath(enemy.id);
        this.deps.effects.playDeath(this.deps.enemyView.getMesh(enemy.id), 1.4);
        this.deps.effects.hideHpBar(enemy.id);
        this.deps.enemies.onEnemyDeath(enemy);
      }
      if (strike.splash > 0) {
        for (const other of this.deps.enemies.enemies) {
          if (!other.alive || other.id === enemy.id || !targets.some(target => target.id === other.id)) continue;
          if (Math.hypot(other.x - enemy.x, other.z - enemy.z) > strike.splash) continue;
          const splashDmg = Math.max(1, Math.round(strike.damage * 0.55));
          if (!rollPlayerAttackHits(other.evasion)) {
            this.deps.effects.spawnDamageNumber(other.x, 1.5, other.z, 0, "miss");
            continue;
          }
          const splashKill = other.applyDamage(splashDmg);
          if (splashKill) {
            this.deps.rewards.grantKillXp(other);
            this.deps.enemyView.playDeath(other.id);
            this.deps.effects.playDeath(this.deps.enemyView.getMesh(other.id), 1.4);
            this.deps.effects.hideHpBar(other.id);
            this.deps.enemies.onEnemyDeath(other);
          }
        }
      }
    }
    this.deps.summonView.sync(this.deps.summons.actors);

    const world = this.deps.worlds.getCurrent();
    const collision = world?.collision;

    for (const enemy of this.deps.enemies.enemies) {
      if (!enemy.alive) continue;
      const dot = enemy.tickStatus(dt);
      if (dot > 0) {
        const dotDamage = Math.max(1, Math.round(dot));
        const killed = enemy.applyDamage(dotDamage);
        this.deps.effects.spawnDamageNumber(enemy.x, 1.5, enemy.z, dotDamage, "skill");
        if (killed) {
          this.deps.rewards.grantKillXp(enemy);
          this.deps.enemyView.playDeath(enemy.id);
          this.deps.effects.playDeath(this.deps.enemyView.getMesh(enemy.id), 1.4);
          this.deps.effects.hideHpBar(enemy.id);
          this.deps.enemies.onEnemyDeath(enemy);
          continue;
        }
      }
      const enemyScale = enemy.modelScale > 0 ? enemy.modelScale : 1.0;
      const enemyHpY = (enemy.isBoss ? 2.4 : 1.85) * enemyScale;
      this.deps.effects.spawnHpBar(
        enemy.id,
        enemy.x,
        enemyHpY,
        enemy.z,
        enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0,
      );
      const { wantsAttack } = this.deps.enemyAi.update(enemy, {
        playerX: this.deps.player.x,
        playerZ: this.deps.player.z,
        playerAlive: !this.deps.character.isDead && !frameMods.stealth,
        dt,
        collision,
        playerArena,
        enemyArena: enemy.arenaIndex,
      });
      if (!wantsAttack) continue;
      if (
        !canEngageEnemy(
          worldId,
          this.deps.player.x,
          this.deps.player.z,
          enemy.x,
          enemy.z,
          enemy.arenaIndex,
          collision,
        )
      ) {
        continue;
      }
      this.deps.enemyView.playAttack(enemy.id);
      if (enemy.archetype === "ranged" && enemy.modelUrl?.includes("skeleton-special")) {
        this.deps.effects.enemyFireball(enemy.x, enemy.z, this.deps.player.x, this.deps.player.z);
      }
      const summon = this.deps.summons.nearest(enemy.x, enemy.z, enemy.range);
      const summonDist = summon ? Math.hypot(summon.x - enemy.x, summon.z - enemy.z) : Number.POSITIVE_INFINITY;
      const playerDist = Math.hypot(this.deps.player.x - enemy.x, this.deps.player.z - enemy.z);
      enemy.attackCooldown = enemy.attackInterval;
      if (summon && summonDist <= playerDist) {
        const incoming = calculateDamage(enemy.attack, summon.defense);
        const struck = rollCritStrike(incoming, enemy.critChance);
        const split = this.deps.summons.damage(summon.uid, struck.damage, frameMods.summonLink);
        if (split.player > 0) this.hurtPlayer(split.player, struck.crit);
        continue;
      }
      if (!rollHitSimple() || Math.random() < frameMods.evasion || frameMods.stealth) {
        this.deps.effects.spawnDamageNumber(this.deps.player.x, 1.8, this.deps.player.z, 0, "miss");
        this.deps.bus.emit("combat:miss", { targetId: "player" });
        this.deps.onCombatMiss();
        continue;
      }
      let dmg = calculateDamage(enemy.attack, this.deps.character.defense * frameMods.defenseMul);
      if (enemy.archetype === "ranged" && enemy.modelUrl?.includes("skeleton-special")) dmg *= 1 - frameMods.magicResist;
      dmg = Math.max(1, Math.round(dmg * (1 - frameMods.damageReduction)));
      const struck = rollCritStrike(dmg, enemy.critChance);
      this.hurtPlayer(struck.damage, struck.crit);
      if (this.deps.character.isDead) break;
      if (frameMods.reflect > 0 && enemy.alive) {
        const reflected = Math.max(1, Math.round(struck.damage * frameMods.reflect));
        const killed = enemy.applyDamage(reflected);
        if (killed) {
          this.deps.rewards.grantKillXp(enemy);
          this.deps.enemyView.playDeath(enemy.id);
          this.deps.effects.playDeath(this.deps.enemyView.getMesh(enemy.id), 1.4);
          this.deps.effects.hideHpBar(enemy.id);
          this.deps.enemies.onEnemyDeath(enemy);
        }
      }
    }

    this.deps.rewards.flushFrameCheckpoint();
  }

  private applySkillImpact(resolved: ResolvedSkill, skillId: string): void {
    const worldId = this.deps.worlds.getCurrent()?.id ?? "";
    const liveTargets = new Set(this.combatTargets(worldId).map(target => target.id));
    const plannedDamage = resolved.hits.reduce((sum, hit) => sum + hit.damage, 0);
    let dealt = 0;
    const deathDuration = skillId === "tk_fis_fire_burst" ? 0.5 : 1.4;
    const seen = new Set<string>();
    for (const hit of resolved.hits) {
      const enemy = this.deps.enemies.findById(hit.id);
      if (!enemy?.alive || !liveTargets.has(enemy.id)) continue;
      dealt += Math.min(enemy.hp, hit.damage);
      const killed = enemy.applyDamage(hit.damage);
      const mesh = this.deps.enemyView.getMesh(enemy.id);
      if (!seen.has(enemy.id)) {
        seen.add(enemy.id);
        this.deps.effects.playHitFlash(mesh);
        this.deps.enemyView.playHit(enemy.id);
        if (resolved.vfx === "burst") this.deps.effects.playAttackPulse(mesh);
      }
      this.deps.effects.spawnDamageNumber(enemy.x, 1.6, enemy.z, hit.damage, "skill");
      if (killed) {
        this.deps.rewards.grantKillXp(enemy);
        this.deps.enemyView.playDeath(enemy.id);
        this.deps.effects.playDeath(mesh, deathDuration);
        this.deps.effects.hideHpBar(enemy.id);
        this.deps.effects.spawnDamageNumber(enemy.x, 1.8, enemy.z, 0, "kill");
        this.deps.effects.cameraPunch(0.08);
        this.deps.triggerHitStop(0.04);
        this.deps.enemies.onEnemyDeath(enemy);
      }
      this.deps.bus.emit("combat:hit", { targetId: enemy.id, damage: hit.damage, killed });
    }
    for (const plan of resolved.enemyEffects) {
      const enemy = this.deps.enemies.findById(plan.id);
      if (!enemy?.alive || !liveTargets.has(enemy.id)) continue;
      const fromX = enemy.x;
      const fromZ = enemy.z;
      enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, this.deps.player.x, this.deps.player.z);
      if (plan.effect.knock && this.deps.progression.state.classId !== "TK") {
        const point = this.safeDisplacement(fromX, fromZ, enemy.x, enemy.z, 0.5);
        enemy.x = point.x;
        enemy.z = point.z;
      }
    }
    const cap = Math.round(this.deps.character.maxHp * (1 + Math.max(0, this.getCombatMods().maxHpMul)));
    const lifesteal = plannedDamage > 0 ? Math.round(resolved.lifesteal * dealt / plannedDamage) : 0;
    this.deps.character.heal(resolved.heal + lifesteal, cap);
    this.deps.bus.emit("skill:used", {
      skillId,
      targetId: resolved.hits[0]?.id ?? "self",
    });
    this.invalidateMods();
  }

  hurtPlayer(amount: number, crit = false): void {
    if (this.deps.character.isDead || amount <= 0) return;
    this.deps.character.applyDamage(amount);
    this.deps.effects.spawnDamageNumber(
      this.deps.player.x,
      1.8,
      this.deps.player.z,
      amount,
      crit ? "playerCrit" : "player",
    );
    this.deps.effects.playHitFlash(this.deps.renderer.playerMesh);
    this.deps.bus.emit("combat:damage", { amount, hp: this.deps.character.hp });
    if (this.deps.character.isDead) {
      this.deps.onPlayerDeath();
    }
  }

  private safeDisplacement(fromX: number, fromZ: number, toX: number, toZ: number, radius: number): { x: number; z: number } {
    const collision = this.deps.worlds.getCurrent()?.collision;
    if (!collision || !segmentBlocked(fromX, fromZ, toX, toZ, collision, radius)) return { x: toX, z: toZ };
    const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toZ - fromZ) / 0.12));
    const point = { x: fromX, z: fromZ };
    for (let i = 1; i <= steps; i++) {
      const x = fromX + (toX - fromX) * i / steps;
      const z = fromZ + (toZ - fromZ) * i / steps;
      if (positionBlocked(x, z, radius, collision)) break;
      point.x = x;
      point.z = z;
    }
    return point;
  }

  private resolveBasicAttack(targetId: string, frameMods: CombatMods): void {
    const enemy = this.deps.enemies.findById(targetId);
    if (!enemy?.alive) return;
    if (rollPlayerAttackHits(enemy.evasion)) {
      let atk = this.deps.character.attack * frameMods.attackMul;
      if (frameMods.stealth) atk *= this.deps.buffs.consumeStealth();
      const critChance = frameMods.critChance + (this.deps.form.active ? frameMods.transformedCrit : 0);
      const speedMul = Math.max(COMBAT_BALANCE.basicAttackSpeedFloor, 1 + frameMods.attackSpeed);
      const hitCount = basicAttackHitCount(attackSpeedMultiplierToPercent(speedMul));
      const mesh = this.deps.enemyView.getMesh(enemy.id);
      let killed = false;
      let totalDamage = 0;
      this.deps.effects.playAttackPulse(mesh);
      for (let i = 0; i < hitCount; i++) {
        let dmg = calculateDamage(atk, enemy.defense);
        const struck = rollCritStrike(dmg, critChance);
        dmg = struck.damage + frameMods.damageFlat;
        totalDamage += dmg;
        killed = enemy.applyDamage(dmg);
        const floatY = 1.4 + i * 0.18;
        this.deps.effects.spawnDamageNumber(
          enemy.x,
          floatY,
          enemy.z,
          dmg,
          struck.crit ? "enemyCrit" : "enemy",
        );
        if (killed) break;
      }
      this.deps.effects.playHitFlash(mesh);
      this.deps.enemyView.playHit(enemy.id);
      if (killed) {
        this.deps.rewards.grantKillXp(enemy);
        this.deps.enemyView.playDeath(enemy.id);
        this.deps.effects.playDeath(mesh, 1.4);
        this.deps.effects.hideHpBar(enemy.id);
        this.deps.effects.spawnDamageNumber(enemy.x, 1.7, enemy.z, 0, "kill");
        this.deps.enemies.onEnemyDeath(enemy);
      }
      this.deps.bus.emit("combat:hit", { targetId: enemy.id, damage: totalDamage, killed });
    } else {
      this.deps.effects.spawnDamageNumber(enemy.x, 1.4, enemy.z, 0, "miss");
      this.deps.bus.emit("combat:miss", { targetId: enemy.id });
      this.deps.onCombatMiss();
    }
  }
}

import { Vector3 } from "three";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import { applyPlayerCombatRatings } from "../../data/balance/combat-ratings";
import { buildCombatMods, type CombatMods } from "../../domain/combat/CombatMods";
import { learnedPassives, type SkillController } from "../../domain/combat/SkillController";
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
import { rollEnemyStrikeDamage } from "../../domain/combat/enemy-strike";
import { canEngageEnemy } from "../../domain/combat/CombatSpace";
import { dungeon1ArenaFromZ } from "../../data/balance/xp-progression";
import type { AttackTarget } from "../../domain/combat/AttackController";

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
}

export class CombatOrchestrator {
  private cachedMods: CombatMods | null = null;
  private cachedPassives: ReturnType<typeof learnedPassives> | null = null;
  private lastBuffCount = -1;
  private readonly vOrigin = new Vector3();
  private readonly vTarget = new Vector3();
  private readonly vAim = new Vector3();

  constructor(private readonly deps: CombatOrchestratorDeps) {}

  invalidateMods(): void {
    this.cachedMods = null;
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
    if (this.deps.buffs.active.length !== this.lastBuffCount) {
      this.lastBuffCount = this.deps.buffs.active.length;
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

  updateCombat(dt: number): void {
    this.deps.enemies.updateRespawns(dt);
    const worldId = this.deps.worlds.getCurrent()?.id ?? "";
    const playerArena = worldId === "dungeon-1" ? dungeon1ArenaFromZ(this.deps.player.z) : undefined;
    const targets = this.combatTargets(worldId);
    const reach = this.deps.getWeaponReach();
    const frameMods = this.getCombatMods();
    const speedMul = Math.max(0.4, 1 + frameMods.attackSpeed);
    this.deps.attack.setReach(reach.attackRange, reach.attackInterval / speedMul);

    const hitTarget = this.deps.attack.tick(
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
        this.deps.effects.playAttackPulse(this.deps.renderer.playerMesh);
        const animSpeed = basicAttackAnimTimeScale(speedMul);
        const atkAnim = this.deps.renderer.playerView.playAttack(animSpeed);
        this.deps.onAutoAttackSwing();
        this.deps.lockFromAnim(atkAnim, COMBAT_BALANCE.moveLock.attackFallback);

        if (enemy.alive && rollPlayerAttackHits(enemy.evasion)) {
          let atk = this.deps.character.attack * frameMods.attackMul;
          if (frameMods.stealth) atk *= this.deps.buffs.consumeStealth();
          const critChance = frameMods.critChance + (this.deps.form.active ? frameMods.transformedCrit : 0);
          const hitCount = basicAttackHitCount(attackSpeedMultiplierToPercent(speedMul));
          const mesh = this.deps.enemyView.getMesh(enemy.id);
          let killed = false;
          let totalDamage = 0;
          for (let i = 0; i < hitCount; i++) {
            let dmg = calculateDamage(atk, enemy.defense);
            if (Math.random() < critChance) {
              dmg = Math.max(1, Math.round(dmg * 1.5));
            }
            dmg += frameMods.damageFlat;
            totalDamage += dmg;
            killed = enemy.applyDamage(dmg);
            const floatY = 1.4 + i * 0.18;
            this.deps.effects.spawnDamageNumber(enemy.x, floatY, enemy.z, dmg, "enemy");
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
        } else if (enemy.alive) {
          this.deps.effects.spawnDamageNumber(enemy.x, 1.4, enemy.z, 0, "miss");
          this.deps.bus.emit("combat:miss", { targetId: enemy.id });
          this.deps.onCombatMiss();
        }
      }
    }

    const manual = this.deps.skillSlotPressed();
    const cast = this.deps.skill.tick(
      dt,
      this.deps.player.isMoving || this.deps.getMoveLock() > 0,
      manual,
      targets,
      this.deps.player.x,
      this.deps.player.z,
      this.deps.player.facing,
      (id) => this.deps.enemies.findById(id)?.defense ?? 0,
      (id) => this.deps.enemies.findById(id)?.evasion ?? 0,
      (id) => {
        const enemy = this.deps.enemies.findById(id);
        return { hp: enemy?.hp ?? 0, maxHp: enemy?.maxHp ?? 1 };
      },
      this.deps.buffs,
      this.deps.form,
      this.deps.summons,
      this.deps.renderer.playerView.getWeaponSet(),
    );

    if (cast) {
      const resolved = cast.resolved;
      const skill = cast.slot.skill;
      this.vOrigin.set(this.deps.player.x, 0, this.deps.player.z);
      const target = resolved.aim ? this.vTarget.set(resolved.aim.x, 0, resolved.aim.z) : null;
      const center = skill.shape === "aoe" || !target ? this.vOrigin : target;
      const profile = getSkillVfxProfile(skill.id);
      if (profile) {
        const request: SkillVfxRequest = {
          profile,
          origin: this.vOrigin.clone(),
          target: target ? target.clone() : null,
          center: center.clone(),
          colorHex: resolved.color,
          facing: this.deps.player.facing,
          range: skill.range,
          radius: skill.radius ?? (skill.shape === "aoe" ? skill.range : 0),
          hits: resolved.hits.map((hit, hitIndex) => ({ ...hit, hitIndex })),
          hasHeal: resolved.heal > 0,
          hasBuff: resolved.buffs.length > 0,
          hasTransform: resolved.transform != null,
          hasSummon: resolved.summons != null,
        };
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
      this.deps.renderer.playerView.playCast();
      this.deps.lockFromAnim("cast", COMBAT_BALANCE.moveLock.skillFallback);
      const hpCap = Math.round(this.deps.character.maxHp * (1 + Math.max(0, frameMods.maxHpMul)));
      this.deps.character.heal(resolved.heal + resolved.lifesteal, hpCap);
      const fireBurstDeathDuration = cast.slot.skill.id === "tk_fis_fire_burst" ? 0.5 : undefined;
      const seen = new Set<string>();
      for (const hit of resolved.hits) {
        const enemy = this.deps.enemies.findById(hit.id);
        if (!enemy?.alive) continue;
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
          this.deps.effects.playDeath(mesh, fireBurstDeathDuration ?? 1.4);
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
        if (!enemy?.alive) continue;
        enemy.applySkillStatus(plan.effect, plan.dotDps, plan.effect.dotSec, this.deps.player.x, this.deps.player.z);
      }
      this.deps.bus.emit("skill:used", {
        skillId: cast.slot.skill.id,
        targetId: resolved.hits[0]?.id ?? "self",
      });
      this.invalidateMods();
    }

    const strikes = this.deps.summons.tick(
      dt,
      this.deps.enemies.enemies.map((enemy) => ({
        id: enemy.id,
        x: enemy.x,
        z: enemy.z,
        alive: enemy.alive,
        defense: enemy.defense,
      })),
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
          if (!other.alive || other.id === enemy.id) continue;
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
        const struck = rollEnemyStrikeDamage(incoming, enemy.critChance);
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
      dmg = Math.max(1, Math.round(dmg * (1 - frameMods.damageReduction)));
      if (enemy.archetype === "ranged") {
        dmg = Math.max(1, Math.round(dmg * (1 - frameMods.magicResist)));
      }
      const struck = rollEnemyStrikeDamage(dmg, enemy.critChance);
      this.hurtPlayer(struck.damage, struck.crit);
      this.deps.lockFromAnim("hit_gut", COMBAT_BALANCE.moveLock.hitFallback);
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
    this.deps.effects.cameraPunch(0.1);
    this.deps.effects.playHitFlash(this.deps.renderer.playerMesh);
    this.deps.renderer.playerView.playHit();
    this.deps.bus.emit("combat:damage", { amount, hp: this.deps.character.hp });
    if (this.deps.character.isDead) {
      this.deps.onPlayerDeath();
    }
  }
}

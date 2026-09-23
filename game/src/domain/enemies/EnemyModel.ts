import { COMBAT_BALANCE, type EnemyArchetype } from "../../data/balance/combat";

export interface EnemyInit {
  id: string;
  archetype: EnemyArchetype;
  x: number;
  z: number;
  maxHp: number;
  attack: number;
  defense: number;
  range: number;
  attackInterval: number;
  speed?: number;
  minApproach?: number;
  preferred?: number;
  retreatIfCloserThan?: number;
  leashRadius?: number;
  homeX: number;
  homeZ: number;
  respawnSeconds: number;
  isBoss?: boolean;
}

export class EnemyModel {
  readonly id: string;
  readonly archetype: EnemyArchetype;
  readonly homeX: number;
  readonly homeZ: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly range: number;
  readonly attackInterval: number;
  readonly speed: number;
  readonly minApproach: number;
  readonly preferred: number;
  readonly retreatIfCloserThan: number;
  readonly leashRadius: number;
  readonly respawnSeconds: number;
  readonly isBoss: boolean;

  x: number;
  z: number;
  hp: number;
  alive = true;
  attackCooldown = 0;
  respawnTimer = 0;
  facing = 0;
  slowTimer = 0;
  slowFactor = 1;
  stunTimer = 0;
  dotDps = 0;
  dotTimer = 0;
  antiHealTimer = 0;
  tauntTimer = 0;

  constructor(init: EnemyInit) {
    this.id = init.id;
    this.archetype = init.archetype;
    this.homeX = init.homeX;
    this.homeZ = init.homeZ;
    this.x = init.x;
    this.z = init.z;
    this.maxHp = init.maxHp;
    this.hp = init.maxHp;
    this.attack = init.attack;
    this.defense = init.defense;
    this.range = init.range;
    this.attackInterval = init.attackInterval;
    this.speed = init.speed ?? 0;
    this.minApproach = init.minApproach ?? 1.2;
    this.preferred = init.preferred ?? init.range * COMBAT_BALANCE.enemy.preferredRangeFactor;
    this.retreatIfCloserThan = init.retreatIfCloserThan ?? 2;
    this.leashRadius = init.leashRadius ?? 99;
    this.respawnSeconds = init.respawnSeconds;
    this.isBoss = !!init.isBoss;
  }

  applyDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      this.respawnTimer = this.respawnSeconds;
      return true;
    }
    return false;
  }

  respawn(): void {
    this.alive = true;
    this.hp = this.maxHp;
    this.x = this.homeX;
    this.z = this.homeZ;
    this.attackCooldown = COMBAT_BALANCE.enemy.respawnAttackCooldown;
    this.clearStatus();
  }

  clearStatus(): void {
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.stunTimer = 0;
    this.dotDps = 0;
    this.dotTimer = 0;
    this.antiHealTimer = 0;
    this.tauntTimer = 0;
  }

  tickStatus(dt: number): number {
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.tauntTimer = Math.max(0, this.tauntTimer - dt);
    this.antiHealTimer = Math.max(0, this.antiHealTimer - dt);
    if (this.slowTimer <= 0) this.slowFactor = 1;
    if (this.dotTimer <= 0 || !this.alive) return 0;
    this.dotTimer -= dt;
    const damage = this.dotDps * dt;
    if (this.dotTimer <= 0) this.dotDps = 0;
    return damage;
  }

  applySkillStatus(
    effect: {
      slow?: number;
      slowSec?: number;
      stunSec?: number;
      stunChance?: number;
      antiHealSec?: number;
      tauntSec?: number;
      knock?: number;
    },
    dotDps: number,
    dotSec: number | undefined,
    fromX: number,
    fromZ: number,
  ): void {
    if (effect.slowSec) {
      this.slowTimer = Math.max(this.slowTimer, effect.slowSec);
      this.slowFactor = effect.slow ?? 0.55;
    }
    if (effect.stunSec && (effect.stunChance == null || Math.random() < effect.stunChance)) {
      this.stunTimer = Math.max(this.stunTimer, effect.stunSec);
    }
    if (dotSec && dotDps > 0) {
      this.dotDps = Math.max(this.dotDps, dotDps);
      this.dotTimer = Math.max(this.dotTimer, dotSec);
    }
    if (effect.antiHealSec) this.antiHealTimer = Math.max(this.antiHealTimer, effect.antiHealSec);
    if (effect.tauntSec) this.tauntTimer = Math.max(this.tauntTimer, effect.tauntSec);
    if (effect.knock) {
      const dx = this.x - fromX;
      const dz = this.z - fromZ;
      const len = Math.hypot(dx, dz) || 1;
      this.x += (dx / len) * effect.knock;
      this.z += (dz / len) * effect.knock;
    }
  }
}

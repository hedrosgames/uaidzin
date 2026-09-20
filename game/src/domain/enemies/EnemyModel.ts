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

  x: number;
  z: number;
  hp: number;
  alive = true;
  attackCooldown = 0;
  respawnTimer = 0;
  facing = 0;

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
  }
}

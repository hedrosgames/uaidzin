import type { SummonSpec } from "../../data/classes/skill-types";
import { calculateDamage } from "./DamageCalculator";

export interface SummonActor {
  uid: string;
  kind: string;
  role: SummonSpec["role"];
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  attack: number;
  baseAttack: number;
  baseMaxHp: number;
  defense: number;
  range: number;
  interval: number;
  cd: number;
  splash: number;
  alive: boolean;
}

export interface SummonFoe {
  id: string;
  x: number;
  z: number;
  alive: boolean;
  defense: number;
}

export interface SummonStrike {
  id: string;
  damage: number;
  x: number;
  z: number;
  splash: number;
}

export class SummonRuntime {
  readonly actors: SummonActor[] = [];
  private seq = 1;

  spawn(spec: SummonSpec, ownerAttack: number, x: number, z: number, powerMul: number): void {
    const baseAttack = Math.max(1, ownerAttack * spec.attackMul);
    const baseMaxHp = 70 * spec.hpMul;
    const attack = Math.max(1, baseAttack * (1 + powerMul));
    const maxHp = Math.max(12, Math.round(baseMaxHp * (1 + powerMul * 0.5)));
    const existing = this.actors.find((actor) => actor.alive && actor.kind === spec.id);
    if (existing) {
      existing.x = x;
      existing.z = z;
      existing.attack = attack;
      existing.baseAttack = baseAttack;
      existing.baseMaxHp = baseMaxHp;
      existing.maxHp = maxHp;
      existing.hp = maxHp;
      existing.range = spec.range;
      existing.interval = spec.interval;
      existing.splash = spec.splash ?? 0;
      return;
    }
    const alive = this.actors.filter((actor) => actor.alive);
    if (alive.length >= 5) {
      alive[0].alive = false;
    }
    this.actors.push({
      uid: `summon-${this.seq++}`,
      kind: spec.id,
      role: spec.role,
      x,
      z,
      hp: maxHp,
      maxHp,
      attack,
      baseAttack,
      baseMaxHp,
      defense: spec.role === "tank" ? 8 : 3,
      range: spec.range,
      interval: spec.interval,
      cd: 0.4,
      splash: spec.splash ?? 0,
      alive: true,
    });
  }

  hasKind(kind: string): boolean {
    return this.actors.some((actor) => actor.alive && actor.kind === kind);
  }

  nearest(x: number, z: number, range: number): SummonActor | null {
    let best: SummonActor | null = null;
    let bestDist = range;
    for (const actor of this.actors) {
      if (!actor.alive) continue;
      const dist = Math.hypot(actor.x - x, actor.z - z);
      if (dist <= bestDist) {
        best = actor;
        bestDist = dist;
      }
    }
    return best;
  }

  damage(uid: string, amount: number, link: number): { summon: number; player: number } {
    const actor = this.actors.find((item) => item.uid === uid && item.alive);
    if (!actor) return { summon: 0, player: 0 };
    const share = link > 0 ? Math.round(amount * link) : 0;
    const toSummon = Math.max(1, amount - share);
    actor.hp -= toSummon;
    if (actor.hp <= 0) actor.alive = false;
    return { summon: toSummon, player: share };
  }

  tick(dt: number, foes: SummonFoe[], owner?: { x: number; z: number }, powerMul?: number, canMove?: (fromX: number, fromZ: number, toX: number, toZ: number) => boolean): SummonStrike[] {
    const strikes: SummonStrike[] = [];
    for (const actor of this.actors) {
      if (!actor.alive) continue;
      if (powerMul != null) this.updatePower(actor, powerMul);
      actor.cd = Math.max(0, actor.cd - dt);
      let target: SummonFoe | null = null;
      let best = Number.POSITIVE_INFINITY;
      for (const foe of foes) {
        if (!foe.alive) continue;
        const dist = Math.hypot(foe.x - actor.x, foe.z - actor.z);
        if (dist <= best) {
          target = foe;
          best = dist;
        }
      }
      if (!target) {
        if (owner) this.moveToward(actor, owner.x, owner.z, 1.4, dt, canMove);
        continue;
      }
      this.moveToward(actor, target.x, target.z, actor.range * 0.85, dt, canMove);
      const dist = Math.hypot(target.x - actor.x, target.z - actor.z);
      if (actor.cd > 0 || dist > actor.range) continue;
      if (canMove && !canMove(actor.x, actor.z, target.x, target.z)) continue;
      actor.cd = actor.interval;
      const damage = calculateDamage(actor.attack, target.defense);
      strikes.push({
        id: target.id,
        damage,
        x: target.x,
        z: target.z,
        splash: actor.splash,
      });
    }
    this.actors.splice(0, this.actors.length, ...this.actors.filter((actor) => actor.alive));
    return strikes;
  }

  clear(): void {
    this.actors.length = 0;
  }

  private updatePower(actor: SummonActor, powerMul: number): void {
    const maxHp = Math.max(12, Math.round(actor.baseMaxHp * (1 + powerMul * 0.5)));
    if (maxHp !== actor.maxHp) {
      const ratio = actor.maxHp > 0 ? actor.hp / actor.maxHp : 0;
      actor.hp = Math.max(1, Math.min(maxHp, Math.round(maxHp * ratio)));
      actor.maxHp = maxHp;
    }
    actor.attack = Math.max(1, actor.baseAttack * (1 + powerMul));
  }

  private moveToward(actor: SummonActor, x: number, z: number, stoppingDistance: number, dt: number, canMove?: (fromX: number, fromZ: number, toX: number, toZ: number) => boolean): void {
    const dx = x - actor.x;
    const dz = z - actor.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= stoppingDistance) return;
    const step = Math.min(2.4 * Math.max(0, dt), distance - stoppingDistance);
    const nextX = actor.x + (dx / distance) * step;
    const nextZ = actor.z + (dz / distance) * step;
    if (!canMove || canMove(actor.x, actor.z, nextX, nextZ)) {
      actor.x = nextX;
      actor.z = nextZ;
      return;
    }
    if (canMove(actor.x, actor.z, nextX, actor.z)) actor.x = nextX;
    if (canMove(actor.x, actor.z, actor.x, nextZ)) actor.z = nextZ;
  }
}

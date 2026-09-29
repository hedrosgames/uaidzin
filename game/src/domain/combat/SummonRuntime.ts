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
    const attack = Math.max(1, ownerAttack * spec.attackMul * (1 + powerMul));
    const maxHp = Math.max(12, Math.round(70 * spec.hpMul * (1 + powerMul * 0.5)));
    const existing = this.actors.find((actor) => actor.alive && actor.kind === spec.id);
    if (existing) {
      existing.x = x;
      existing.z = z;
      existing.attack = attack;
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

  tick(dt: number, foes: SummonFoe[]): SummonStrike[] {
    const strikes: SummonStrike[] = [];
    for (const actor of this.actors) {
      if (!actor.alive) continue;
      actor.cd = Math.max(0, actor.cd - dt);
      let target: SummonFoe | null = null;
      let best = actor.range;
      for (const foe of foes) {
        if (!foe.alive) continue;
        const dist = Math.hypot(foe.x - actor.x, foe.z - actor.z);
        if (dist <= best) {
          target = foe;
          best = dist;
        }
      }
      if (!target) continue;
      const dx = target.x - actor.x;
      const dz = target.z - actor.z;
      const dist = Math.hypot(dx, dz) || 1;
      if (dist > actor.range * 0.85) {
        actor.x += (dx / dist) * 2.4 * dt;
        actor.z += (dz / dist) * 2.4 * dt;
      }
      if (actor.cd > 0 || dist > actor.range) continue;
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
}

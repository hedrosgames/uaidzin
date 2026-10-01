import { COMBAT_BALANCE } from "../../data/balance/combat";

export interface AttackTarget {
  id: string;
  x: number;
  z: number;
  alive: boolean;
}



export class AttackController {
  private cooldown = 0;
  private range = COMBAT_BALANCE.player.attackRange;
  private interval = COMBAT_BALANCE.player.attackInterval;

  setReach(range: number, interval: number): void {
    this.range = range;
    this.interval = interval;
  }

  tick(dt: number, moving: boolean, targets: AttackTarget[], playerX: number, playerZ: number): AttackTarget | null {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (moving) return null;
    if (this.cooldown > 0) return null;

    let best: AttackTarget | null = null;
    let bestDist = this.range;
    for (const t of targets) {
      if (!t.alive) continue;
      const d = Math.hypot(t.x - playerX, t.z - playerZ);
      if (d <= bestDist) {
        best = t;
        bestDist = d;
      }
    }
    if (best) {
      this.cooldown = this.interval;
      return best;
    }
    return null;
  }

  tryManual(target: AttackTarget, playerX: number, playerZ: number): AttackTarget | null {
    if (this.cooldown > 0 || !target.alive) return null;
    const d = Math.hypot(target.x - playerX, target.z - playerZ);
    if (d > this.range) return null;
    this.cooldown = this.interval;
    return target;
  }

  reset(): void {
    this.cooldown = 0;
  }
}

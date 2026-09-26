import { MathUtils } from "three";
import { COMBAT_BALANCE } from "../data/balance/combat";
import { positionBlocked, type WorldCollision } from "../world/collision";

export interface PlayerRuntimeOptions {
  speed?: number;
  radius?: number;
}

const ARRIVE_EPS = 0.08;
const PROGRESS_EPS = 0.01;
const STUCK_MOVING_SEC = 0.35;
const MIN_STEP_RATIO = 0.35;
const DIVERT_BLENDS = [1, 0.7, 0.4] as const;

export class PlayerRuntime {
  readonly speed: number;
  readonly radius: number;

  x = 0;
  z = 0;

  moveTarget: { x: number; z: number } | null = null;
  facing = 0;
  isMoving = false;
  speedScale = 1;

  private noProgressTime = 0;
  private bestDistToTarget = Infinity;
  private divertSign: -1 | 0 | 1 = 0;

  constructor(options: PlayerRuntimeOptions = {}) {
    this.speed = options.speed ?? COMBAT_BALANCE.player.speed;
    this.radius = options.radius ?? 0.35;
  }

  setPosition(x: number, z: number): void {
    this.x = x;
    this.z = z;
    this.clearMoveTarget();
  }

  setMoveTarget(x: number, z: number): void {
    this.moveTarget = { x, z };
    this.noProgressTime = 0;
    this.bestDistToTarget = Infinity;
    this.divertSign = 0;
  }

  clearMoveTarget(): void {
    this.moveTarget = null;
    this.noProgressTime = 0;
    this.bestDistToTarget = Infinity;
    this.divertSign = 0;
  }

  private clampBounds(
    x: number,
    z: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  ): { x: number; z: number } {
    return {
      x: MathUtils.clamp(x, bounds.minX + this.radius, bounds.maxX - this.radius),
      z: MathUtils.clamp(z, bounds.minZ + this.radius, bounds.maxZ - this.radius),
    };
  }

  private isFree(
    x: number,
    z: number,
    collision: WorldCollision | undefined,
  ): boolean {
    return !collision || !positionBlocked(x, z, this.radius, collision);
  }

  private resolveSlide(
    nx: number,
    nz: number,
    step: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    collision: WorldCollision | undefined,
  ): { x: number; z: number } {
    const full = this.clampBounds(this.x + nx * step, this.z + nz * step, bounds);
    if (this.isFree(full.x, full.z, collision)) return full;

    let next = { x: this.x, z: this.z };
    const onlyX = this.clampBounds(this.x + nx * step, this.z, bounds);
    if (this.isFree(onlyX.x, onlyX.z, collision)) next = onlyX;
    const onlyZ = this.clampBounds(next.x, this.z + nz * step, bounds);
    if (this.isFree(onlyZ.x, onlyZ.z, collision)) next = onlyZ;
    return next;
  }

  private displacement(next: { x: number; z: number }): number {
    return Math.hypot(next.x - this.x, next.z - this.z);
  }

  private tryDivert(
    nx: number,
    nz: number,
    step: number,
    minStep: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    collision: WorldCollision | undefined,
    target: { x: number; z: number },
  ): { x: number; z: number } | null {
    const distNow = Math.hypot(target.x - this.x, target.z - this.z);
    const perpX = -nz;
    const perpZ = nx;
    const signs: Array<-1 | 1> =
      this.divertSign === 0 ? [1, -1] : [this.divertSign, this.divertSign === 1 ? -1 : 1];

    let best: { x: number; z: number } | null = null;
    let bestScore = -Infinity;
    let bestSign: -1 | 1 = 1;

    for (const sign of signs) {
      for (const blend of DIVERT_BLENDS) {
        const dx = nx + perpX * sign * blend;
        const dz = nz + perpZ * sign * blend;
        const len = Math.hypot(dx, dz);
        if (len < 1e-6) continue;
        const next = this.resolveSlide(dx / len, dz / len, step, bounds, collision);
        if (this.displacement(next) < minStep) continue;
        const distAfter = Math.hypot(target.x - next.x, target.z - next.z);
        const score = distNow - distAfter;
        if (score > bestScore) {
          bestScore = score;
          best = next;
          bestSign = sign;
        }
      }
      if (this.divertSign !== 0 && best) break;
    }

    if (!best || bestScore <= PROGRESS_EPS) return null;
    this.divertSign = bestSign;
    return best;
  }

  update(
    dt: number,
    inputX: number,
    inputZ: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    collision?: WorldCollision,
  ): void {
    let dirX = 0;
    let dirZ = 0;
    let fromClick = false;

    if (inputX !== 0 || inputZ !== 0) {
      dirX = inputX;
      dirZ = inputZ;
      this.clearMoveTarget();
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dz = this.moveTarget.z - this.z;
      const dist = Math.hypot(dx, dz);
      if (dist < ARRIVE_EPS) {
        this.clearMoveTarget();
      } else {
        dirX = dx / dist;
        dirZ = dz / dist;
        fromClick = true;
      }
    }

    const len = Math.hypot(dirX, dirZ);
    if (len <= 0.0001) {
      this.isMoving = false;
      return;
    }

    const nx = dirX / len;
    const nz = dirZ / len;
    const step = this.speed * this.speedScale * dt;
    const minStep = step * MIN_STEP_RATIO;
    let next = this.resolveSlide(nx, nz, step, bounds, collision);

    if (fromClick && this.moveTarget) {
      const distNow = Math.hypot(this.moveTarget.x - this.x, this.moveTarget.z - this.z);
      let movedDist = this.displacement(next);
      const distPrimary = Math.hypot(this.moveTarget.x - next.x, this.moveTarget.z - next.z);
      const primaryStrong =
        movedDist >= minStep && distPrimary < distNow - PROGRESS_EPS;

      if (!primaryStrong) {
        const diverted = this.tryDivert(
          nx,
          nz,
          step,
          minStep,
          bounds,
          collision,
          this.moveTarget,
        );
        if (!diverted) {
          this.clearMoveTarget();
          this.isMoving = false;
          return;
        }
        const distDivert = Math.hypot(
          this.moveTarget.x - diverted.x,
          this.moveTarget.z - diverted.z,
        );
        if (distDivert < distPrimary - PROGRESS_EPS || movedDist < minStep) {
          next = diverted;
          movedDist = this.displacement(next);
        } else {
          this.clearMoveTarget();
          this.isMoving = false;
          return;
        }
      } else {
        this.divertSign = 0;
      }

      if (movedDist < minStep) {
        this.clearMoveTarget();
        this.isMoving = false;
        return;
      }

      const distAfter = Math.hypot(this.moveTarget.x - next.x, this.moveTarget.z - next.z);
      if (distAfter < this.bestDistToTarget - PROGRESS_EPS) {
        this.bestDistToTarget = distAfter;
        this.noProgressTime = 0;
      } else {
        this.noProgressTime += dt;
      }

      if (this.noProgressTime >= STUCK_MOVING_SEC) {
        this.clearMoveTarget();
        this.isMoving = false;
        return;
      }
    }

    const movedDist = this.displacement(next);
    if (movedDist >= minStep) {
      this.facing = Math.atan2(next.x - this.x, next.z - this.z);
      this.x = next.x;
      this.z = next.z;
      this.isMoving = true;
    } else {
      this.facing = Math.atan2(nx, nz);
      this.isMoving = false;
      if (fromClick) this.clearMoveTarget();
    }
  }

  distanceTo(x: number, z: number): number {
    return Math.hypot(this.x - x, this.z - z);
  }
}

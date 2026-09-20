import { MathUtils } from "three";
import { COMBAT_BALANCE } from "../data/balance/combat";
import { positionBlocked, type WorldCollision } from "../world/collision";

export interface PlayerRuntimeOptions {
  speed?: number;
  radius?: number;
}

export class PlayerRuntime {
  readonly speed: number;
  readonly radius: number;

  x = 0;
  z = 0;

  moveTarget: { x: number; z: number } | null = null;
  facing = 0;
  isMoving = false;

  constructor(options: PlayerRuntimeOptions = {}) {
    this.speed = options.speed ?? COMBAT_BALANCE.player.speed;
    this.radius = options.radius ?? 0.35;
  }

  setPosition(x: number, z: number): void {
    this.x = x;
    this.z = z;
    this.moveTarget = null;
  }

  setMoveTarget(x: number, z: number): void {
    this.moveTarget = { x, z };
  }

  clearMoveTarget(): void {
    this.moveTarget = null;
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

  update(
    dt: number,
    inputX: number,
    inputZ: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    collision?: WorldCollision,
  ): void {
    let dirX = 0;
    let dirZ = 0;

    if (inputX !== 0 || inputZ !== 0) {
      dirX = inputX;
      dirZ = inputZ;
      this.moveTarget = null;
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dz = this.moveTarget.z - this.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        this.moveTarget = null;
      } else {
        dirX = dx / dist;
        dirZ = dz / dist;
      }
    }

    const len = Math.hypot(dirX, dirZ);
    if (len > 0.0001) {
      const nx = dirX / len;
      const nz = dirZ / len;
      const step = this.speed * dt;
      const full = this.clampBounds(this.x + nx * step, this.z + nz * step, bounds);
      let next = { x: this.x, z: this.z };
      if (this.isFree(full.x, full.z, collision)) {
        next = full;
      } else {
        const onlyX = this.clampBounds(this.x + nx * step, this.z, bounds);
        if (this.isFree(onlyX.x, onlyX.z, collision)) next = onlyX;
        const onlyZ = this.clampBounds(next.x, this.z + nz * step, bounds);
        if (this.isFree(onlyZ.x, onlyZ.z, collision)) next = onlyZ;
      }
      const moved = next.x !== this.x || next.z !== this.z;
      if (moved) {
        this.facing = Math.atan2(next.x - this.x, next.z - this.z);
      } else {
        this.facing = Math.atan2(nx, nz);
      }
      this.x = next.x;
      this.z = next.z;
      this.isMoving = moved || inputX !== 0 || inputZ !== 0 || !!this.moveTarget;
      if (this.moveTarget && !moved) this.moveTarget = null;
    } else {
      this.isMoving = false;
    }
  }

  distanceTo(x: number, z: number): number {
    return Math.hypot(this.x - x, this.z - z);
  }
}

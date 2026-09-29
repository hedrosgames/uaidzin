import { COMBAT_BALANCE } from "../../data/balance/combat";
import type { EnemyModel } from "./EnemyModel";
import { positionBlocked, type WorldCollision } from "../../world/collision";

export interface AiContext {
  playerX: number;
  playerZ: number;
  playerAlive: boolean;
  dt: number;
  collision?: WorldCollision;
  playerArena?: number;
  enemyArena?: number;
}

function tryMove(
  enemy: EnemyModel,
  dx: number,
  dz: number,
  collision?: WorldCollision,
): void {
  const targetX = enemy.x + dx;
  const targetZ = enemy.z + dz;
  const radius = 0.5;
  if (!collision || !positionBlocked(targetX, targetZ, radius, collision)) {
    enemy.x = targetX;
    enemy.z = targetZ;
    return;
  }
  if (!positionBlocked(targetX, enemy.z, radius, collision)) {
    enemy.x = targetX;
    return;
  }
  if (!positionBlocked(enemy.x, targetZ, radius, collision)) {
    enemy.z = targetZ;
  }
}

export class EnemyAI {
  update(enemy: EnemyModel, ctx: AiContext): { wantsAttack: boolean } {
    if (!enemy.alive) return { wantsAttack: false };
    if (
      ctx.playerArena != null &&
      ctx.enemyArena != null &&
      ctx.playerArena !== ctx.enemyArena
    ) {
      return { wantsAttack: false };
    }
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - ctx.dt);

    const dx = ctx.playerX - enemy.x;
    const dz = ctx.playerZ - enemy.z;
    const dist = Math.hypot(dx, dz) || 0.0001;
    const nx = dx / dist;
    const nz = dz / dist;

    if (enemy.stunTimer > 0) {
      enemy.facing = Math.atan2(dx, dz);
      return { wantsAttack: false };
    }

    const slow = enemy.slowTimer > 0 ? enemy.slowFactor : 1;
    const homeDist = Math.hypot(enemy.x - enemy.homeX, enemy.z - enemy.homeZ);

    if (enemy.tauntTimer > 0) {
      const step = Math.max(enemy.speed, 2.4) * slow * ctx.dt;
      if (dist > enemy.minApproach) {
        tryMove(enemy, nx * step, nz * step, ctx.collision);
      }
      enemy.facing = Math.atan2(dx, dz);
      return { wantsAttack: ctx.playerAlive && dist <= enemy.range && enemy.attackCooldown <= 0 };
    }

    if (enemy.archetype === "fixed") {
      if (homeDist > enemy.leashRadius) {
        const toHomeX = enemy.homeX - enemy.x;
        const toHomeZ = enemy.homeZ - enemy.z;
        const rate = Math.min(1, ctx.dt * COMBAT_BALANCE.enemy.leashReturnRate);
        tryMove(enemy, toHomeX * rate, toHomeZ * rate, ctx.collision);
      }
      enemy.facing = Math.atan2(dx, dz);
      return { wantsAttack: ctx.playerAlive && dist <= enemy.range && enemy.attackCooldown <= 0 };
    }

    if (homeDist > enemy.leashRadius) {
      const toHomeX = enemy.homeX - enemy.x;
      const toHomeZ = enemy.homeZ - enemy.z;
      const dHome = Math.hypot(toHomeX, toHomeZ) || 0.0001;
      const speed = Math.max(enemy.speed, 2.4) * slow;
      const step = Math.min(speed * ctx.dt, dHome);
      tryMove(enemy, (toHomeX / dHome) * step, (toHomeZ / dHome) * step, ctx.collision);
      enemy.facing = Math.atan2(toHomeX, toHomeZ);
      return { wantsAttack: false };
    }

    if (!ctx.playerAlive) {
      if (homeDist > 0.05 && enemy.speed > 0) {
        const toHomeX = enemy.homeX - enemy.x;
        const toHomeZ = enemy.homeZ - enemy.z;
        const dHome = Math.hypot(toHomeX, toHomeZ) || 0.0001;
        const step = Math.min(enemy.speed * slow * ctx.dt, dHome);
        tryMove(enemy, (toHomeX / dHome) * step, (toHomeZ / dHome) * step, ctx.collision);
        enemy.facing = Math.atan2(toHomeX, toHomeZ);
      }
      return { wantsAttack: false };
    }

    if (enemy.aggroRadius != null && dist > enemy.aggroRadius) {
      if (homeDist > 0.05 && enemy.speed > 0) {
        const toHomeX = enemy.homeX - enemy.x;
        const toHomeZ = enemy.homeZ - enemy.z;
        const dHome = Math.hypot(toHomeX, toHomeZ) || 0.0001;
        const step = Math.min(enemy.speed * slow * ctx.dt, dHome);
        tryMove(enemy, (toHomeX / dHome) * step, (toHomeZ / dHome) * step, ctx.collision);
        enemy.facing = Math.atan2(toHomeX, toHomeZ);
      }
      return { wantsAttack: false };
    }

    if (enemy.archetype === "chaser") {
      if (dist > enemy.minApproach) {
        const step = enemy.speed * slow * ctx.dt;
        tryMove(enemy, nx * step, nz * step, ctx.collision);
      }
      enemy.facing = Math.atan2(dx, dz);
      return { wantsAttack: dist <= enemy.range && enemy.attackCooldown <= 0 };
    }

    if (dist < enemy.retreatIfCloserThan) {
      const step = enemy.speed * slow * ctx.dt;
      tryMove(enemy, -nx * step, -nz * step, ctx.collision);
    } else if (dist > enemy.preferred + 0.4) {
      const step = enemy.speed * slow * COMBAT_BALANCE.enemy.approachSpeedFactor * ctx.dt;
      tryMove(enemy, nx * step, nz * step, ctx.collision);
    }
    enemy.facing = Math.atan2(dx, dz);
    return { wantsAttack: dist <= enemy.range && enemy.attackCooldown <= 0 };
  }
}

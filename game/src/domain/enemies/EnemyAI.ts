import { COMBAT_BALANCE } from "../../data/balance/combat";
import type { EnemyModel } from "./EnemyModel";

export interface AiContext {
  playerX: number;
  playerZ: number;
  playerAlive: boolean;
  dt: number;
}



export class EnemyAI {
  update(enemy: EnemyModel, ctx: AiContext): { wantsAttack: boolean } {
    if (!enemy.alive) return { wantsAttack: false };
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - ctx.dt);

    const dx = ctx.playerX - enemy.x;
    const dz = ctx.playerZ - enemy.z;
    const dist = Math.hypot(dx, dz) || 0.0001;
    const nx = dx / dist;
    const nz = dz / dist;

    if (enemy.archetype === "fixed") {

      const homeDist = Math.hypot(enemy.x - enemy.homeX, enemy.z - enemy.homeZ);
      if (homeDist > enemy.leashRadius) {
        enemy.x += (enemy.homeX - enemy.x) * Math.min(1, ctx.dt * COMBAT_BALANCE.enemy.leashReturnRate);
        enemy.z += (enemy.homeZ - enemy.z) * Math.min(1, ctx.dt * COMBAT_BALANCE.enemy.leashReturnRate);
      }
      enemy.facing = Math.atan2(dx, dz);
      return { wantsAttack: ctx.playerAlive && dist <= enemy.range && enemy.attackCooldown <= 0 };
    }

    if (enemy.archetype === "chaser") {
      if (dist > enemy.minApproach) {
        enemy.x += nx * enemy.speed * ctx.dt;
        enemy.z += nz * enemy.speed * ctx.dt;
      }
      enemy.facing = Math.atan2(dx, dz);
      return { wantsAttack: ctx.playerAlive && dist <= enemy.range && enemy.attackCooldown <= 0 };
    }


    if (dist < enemy.retreatIfCloserThan) {
      enemy.x -= nx * enemy.speed * ctx.dt;
      enemy.z -= nz * enemy.speed * ctx.dt;
    } else if (dist > enemy.preferred + 0.4) {
      enemy.x += nx * enemy.speed * COMBAT_BALANCE.enemy.approachSpeedFactor * ctx.dt;
      enemy.z += nz * enemy.speed * COMBAT_BALANCE.enemy.approachSpeedFactor * ctx.dt;
    }
    enemy.facing = Math.atan2(dx, dz);
    return { wantsAttack: ctx.playerAlive && dist <= enemy.range && enemy.attackCooldown <= 0 };
  }
}

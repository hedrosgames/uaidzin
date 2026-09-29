import { dungeon1ArenaFromZ } from "../../data/balance/xp-progression";
import { segmentBlocked, type WorldCollision } from "../../world/collision";

export function sameDungeonArena(dungeonId: string, playerZ: number, enemyArena: number): boolean {
  if (dungeonId !== "dungeon-1") return true;
  return dungeon1ArenaFromZ(playerZ) === enemyArena;
}

export function hasCombatLoS(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  collision?: WorldCollision,
): boolean {
  if (!collision) return true;
  return !segmentBlocked(ax, az, bx, bz, collision);
}

export function canEngageEnemy(
  dungeonId: string,
  playerX: number,
  playerZ: number,
  enemyX: number,
  enemyZ: number,
  enemyArena: number,
  collision?: WorldCollision,
): boolean {
  if (!sameDungeonArena(dungeonId, playerZ, enemyArena)) return false;
  return hasCombatLoS(playerX, playerZ, enemyX, enemyZ, collision);
}

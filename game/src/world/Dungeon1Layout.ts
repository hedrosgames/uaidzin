import { findDungeon } from "../data/dungeons/dungeons-mortal";

const arenas = findDungeon("dungeon-1")!.arenas;

export const DUNGEON1_HALF_WIDTH = arenas[0]!.halfSize;
export const DUNGEON1_FENCE_LINES = [
  arenas[0]!.centerZ + arenas[0]!.halfSize,
  ...arenas.map((arena) => arena.centerZ - arena.halfSize),
];
export const DUNGEON1_ISLAND = {
  minX: -DUNGEON1_HALF_WIDTH - 8,
  maxX: DUNGEON1_HALF_WIDTH + 8,
  minZ: DUNGEON1_FENCE_LINES[3]! - 8,
  maxZ: DUNGEON1_FENCE_LINES[0]! + 8,
};

export function dungeon1ZoneIndex(z: number): number {
  const index = DUNGEON1_FENCE_LINES.slice(1).findIndex((line) => z > line);
  return index < 0 ? arenas.length - 1 : index;
}

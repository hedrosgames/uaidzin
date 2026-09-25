import type { DungeonDef } from "./dungeon-definitions";
import rawDungeons from "./dungeons.json";

export const DUNGEONS_MORTAL: DungeonDef[] = rawDungeons as DungeonDef[];

export function findDungeon(id: string): DungeonDef | undefined {
  return DUNGEONS_MORTAL.find((d) => d.id === id);
}

export function dungeonsAllowedForLevel(level: number): DungeonDef[] {
  return DUNGEONS_MORTAL.filter((d) => level >= d.minLevel && level <= d.maxLevel);
}

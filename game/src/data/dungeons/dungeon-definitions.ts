import type { EnemyArchetype } from "../balance/combat";

export interface ArenaSpawnDef {
  id: string;
  archetype: EnemyArchetype;
  x: number;
  z: number;
  isBoss?: boolean;
}

export interface ArenaDef {
  id: string;
  
  centerX: number;
  centerZ: number;
  halfSize: number;
  spawns: ArenaSpawnDef[];
}

export interface DungeonDef {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  entryItemId?: string | null;
  durationSeconds: number;
  arenas: ArenaDef[];
}



export const DUNGEON_TEST: DungeonDef = {
  id: "dungeon-test",
  name: "Dungeon de Teste",
  minLevel: 1,
  maxLevel: 20,
  durationSeconds: 600,
  arenas: [
    {
      id: "arena-1",
      centerX: 0,
      centerZ: 0,
      halfSize: 9,
      spawns: [
        { id: "a1-fixed-1", archetype: "fixed", x: 5, z: -5 },
        { id: "a1-fixed-2", archetype: "fixed", x: -5, z: -5 },
        { id: "a1-chaser-1", archetype: "chaser", x: 4, z: 4 },
      ],
    },
    {
      id: "arena-2",
      centerX: 0,
      centerZ: -24,
      halfSize: 9,
      spawns: [
        { id: "a2-fixed-1", archetype: "fixed", x: 5, z: -29 },
        { id: "a2-chaser-1", archetype: "chaser", x: -5, z: -27 },
        { id: "a2-chaser-2", archetype: "chaser", x: 5, z: -22 },
        { id: "a2-ranged-1", archetype: "ranged", x: -4, z: -31 },
      ],
    },
    {
      id: "arena-3",
      centerX: 0,
      centerZ: -48,
      halfSize: 10,
      spawns: [
        { id: "a3-chaser-1", archetype: "chaser", x: 5, z: -46 },
        { id: "a3-chaser-2", archetype: "chaser", x: -5, z: -46 },
        { id: "a3-ranged-1", archetype: "ranged", x: 0, z: -55 },
        { id: "a3-ranged-2", archetype: "ranged", x: 6, z: -52 },
        { id: "a3-boss", archetype: "chaser", x: 0, z: -50, isBoss: true },
      ],
    },
  ],
};

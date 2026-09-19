import type { DungeonDef } from "./dungeon-definitions";

function makeDungeon(
  index: number,
  minLevel: number,
  maxLevel: number,
  needsItem: boolean,
): DungeonDef {
  const z0 = 0;
  const z1 = -24;
  const z2 = -48;
  const tag = `d${index}`;
  return {
    id: `dungeon-${index}`,
    name: `Dungeon ${index}`,
    minLevel,
    maxLevel,
    durationSeconds: 600,
    entryItemId: needsItem ? `entry_${tag}` : null,
    arenas: [
      {
        id: `${tag}-a1`,
        centerX: 0,
        centerZ: z0,
        halfSize: 9,
        spawns: [
          { id: `${tag}-a1-f1`, archetype: "fixed", x: 5, z: -5 },
          { id: `${tag}-a1-f2`, archetype: "fixed", x: -5, z: -5 },
          { id: `${tag}-a1-c1`, archetype: "chaser", x: 4, z: 4 },
        ],
      },
      {
        id: `${tag}-a2`,
        centerX: 0,
        centerZ: z1,
        halfSize: 9,
        spawns: [
          { id: `${tag}-a2-f1`, archetype: "fixed", x: 5, z: z1 - 5 },
          { id: `${tag}-a2-c1`, archetype: "chaser", x: -5, z: z1 - 3 },
          { id: `${tag}-a2-r1`, archetype: "ranged", x: -4, z: z1 - 7 },
        ],
      },
      {
        id: `${tag}-a3`,
        centerX: 0,
        centerZ: z2,
        halfSize: 10,
        spawns: [
          { id: `${tag}-a3-c1`, archetype: "chaser", x: 5, z: z2 + 2 },
          { id: `${tag}-a3-r1`, archetype: "ranged", x: 0, z: z2 - 7 },
          { id: `${tag}-a3-boss`, archetype: "chaser", x: 0, z: z2 - 2, isBoss: true },
        ],
      },
    ],
  };
}


export const DUNGEONS_MORTAL: DungeonDef[] = [
  makeDungeon(1, 1, 40, false),
  makeDungeon(2, 35, 90, false),
  makeDungeon(3, 80, 150, false),
  makeDungeon(4, 140, 220, true),
  makeDungeon(5, 200, 280, true),
  makeDungeon(6, 260, 330, true),
  makeDungeon(7, 310, 370, true),
  makeDungeon(8, 350, 400, true),
];

export function findDungeon(id: string): DungeonDef | undefined {
  return DUNGEONS_MORTAL.find((d) => d.id === id);
}

export function dungeonsAllowedForLevel(level: number): DungeonDef[] {
  return DUNGEONS_MORTAL.filter((d) => level >= d.minLevel && level <= d.maxLevel);
}

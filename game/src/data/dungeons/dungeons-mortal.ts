import type { ArenaDef, DungeonDef } from "./dungeon-definitions";

function arenasIntro(tag: string): ArenaDef[] {
  const z0 = 0;
  const z1 = -24;
  const z2 = -48;
  return [
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
  ];
}

function arenasRanged(tag: string): ArenaDef[] {
  const z0 = 0;
  const z1 = -24;
  const z2 = -48;
  return [
    {
      id: `${tag}-a1`,
      centerX: 0,
      centerZ: z0,
      halfSize: 8,
      spawns: [
        { id: `${tag}-a1-r1`, archetype: "ranged", x: 6, z: -6 },
        { id: `${tag}-a1-r2`, archetype: "ranged", x: -6, z: -6 },
        { id: `${tag}-a1-f1`, archetype: "fixed", x: 0, z: 3 },
      ],
    },
    {
      id: `${tag}-a2`,
      centerX: 2,
      centerZ: z1,
      halfSize: 10,
      spawns: [
        { id: `${tag}-a2-r1`, archetype: "ranged", x: 7, z: z1 - 6 },
        { id: `${tag}-a2-c1`, archetype: "chaser", x: -4, z: z1 },
        { id: `${tag}-a2-f1`, archetype: "fixed", x: 0, z: z1 - 4 },
        { id: `${tag}-a2-r2`, archetype: "ranged", x: -7, z: z1 - 7 },
      ],
    },
    {
      id: `${tag}-a3`,
      centerX: 0,
      centerZ: z2,
      halfSize: 11,
      spawns: [
        { id: `${tag}-a3-r1`, archetype: "ranged", x: 6, z: z2 - 6 },
        { id: `${tag}-a3-r2`, archetype: "ranged", x: -6, z: z2 - 6 },
        { id: `${tag}-a3-boss`, archetype: "fixed", x: 0, z: z2 - 2, isBoss: true },
      ],
    },
  ];
}

function arenasChase(tag: string): ArenaDef[] {
  const z0 = 0;
  const z1 = -26;
  const z2 = -50;
  return [
    {
      id: `${tag}-a1`,
      centerX: 0,
      centerZ: z0,
      halfSize: 10,
      spawns: [
        { id: `${tag}-a1-c1`, archetype: "chaser", x: 5, z: 4 },
        { id: `${tag}-a1-c2`, archetype: "chaser", x: -5, z: 4 },
        { id: `${tag}-a1-f1`, archetype: "fixed", x: 0, z: -6 },
      ],
    },
    {
      id: `${tag}-a2`,
      centerX: -2,
      centerZ: z1,
      halfSize: 9,
      spawns: [
        { id: `${tag}-a2-c1`, archetype: "chaser", x: 4, z: z1 + 3 },
        { id: `${tag}-a2-c2`, archetype: "chaser", x: -6, z: z1 - 2 },
        { id: `${tag}-a2-r1`, archetype: "ranged", x: 0, z: z1 - 8 },
      ],
    },
    {
      id: `${tag}-a3`,
      centerX: 0,
      centerZ: z2,
      halfSize: 10,
      spawns: [
        { id: `${tag}-a3-c1`, archetype: "chaser", x: 6, z: z2 + 2 },
        { id: `${tag}-a3-c2`, archetype: "chaser", x: -6, z: z2 + 2 },
        { id: `${tag}-a3-boss`, archetype: "fixed", x: 0, z: z2 - 3, isBoss: true },
      ],
    },
  ];
}

function arenasDense(tag: string): ArenaDef[] {
  const z0 = 0;
  const z1 = -22;
  const z2 = -46;
  return [
    {
      id: `${tag}-a1`,
      centerX: 0,
      centerZ: z0,
      halfSize: 8,
      spawns: [
        { id: `${tag}-a1-f1`, archetype: "fixed", x: 4, z: -4 },
        { id: `${tag}-a1-f2`, archetype: "fixed", x: -4, z: -4 },
        { id: `${tag}-a1-c1`, archetype: "chaser", x: 5, z: 3 },
        { id: `${tag}-a1-c2`, archetype: "chaser", x: -5, z: 3 },
      ],
    },
    {
      id: `${tag}-a2`,
      centerX: 0,
      centerZ: z1,
      halfSize: 8,
      spawns: [
        { id: `${tag}-a2-f1`, archetype: "fixed", x: 5, z: z1 - 4 },
        { id: `${tag}-a2-r1`, archetype: "ranged", x: -5, z: z1 - 6 },
        { id: `${tag}-a2-c1`, archetype: "chaser", x: 0, z: z1 + 3 },
        { id: `${tag}-a2-r2`, archetype: "ranged", x: 6, z: z1 - 6 },
      ],
    },
    {
      id: `${tag}-a3`,
      centerX: 0,
      centerZ: z2,
      halfSize: 9,
      spawns: [
        { id: `${tag}-a3-c1`, archetype: "chaser", x: 5, z: z2 + 1 },
        { id: `${tag}-a3-r1`, archetype: "ranged", x: -5, z: z2 - 6 },
        { id: `${tag}-a3-boss`, archetype: "fixed", x: 0, z: z2 - 2, isBoss: true },
      ],
    },
  ];
}

function makeDungeon(
  index: number,
  minLevel: number,
  maxLevel: number,
  layout: (tag: string) => ArenaDef[],
): DungeonDef {
  const tag = `d${index}`;
  return {
    id: `dungeon-${index}`,
    name: `Dungeon ${index}`,
    minLevel,
    maxLevel,
    durationSeconds: 600,
    arenas: layout(tag),
  };
}

export const DUNGEONS_MORTAL: DungeonDef[] = [
  makeDungeon(1, 1, 40, arenasIntro),
  makeDungeon(2, 35, 90, arenasRanged),
  makeDungeon(3, 80, 150, arenasChase),
  makeDungeon(4, 140, 220, arenasDense),
  makeDungeon(5, 200, 280, arenasRanged),
  makeDungeon(6, 260, 330, arenasChase),
  makeDungeon(7, 310, 370, arenasDense),
  makeDungeon(8, 350, 400, arenasChase),
];

export function findDungeon(id: string): DungeonDef | undefined {
  return DUNGEONS_MORTAL.find((d) => d.id === id);
}

export function dungeonsAllowedForLevel(level: number): DungeonDef[] {
  return DUNGEONS_MORTAL.filter((d) => level >= d.minLevel && level <= d.maxLevel);
}

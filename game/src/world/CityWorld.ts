import {
  BoxGeometry,
  CylinderGeometry,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import { CITY_INTERACTABLES, CITY_PORTAL_PROP, type InteractableDef } from "./definitions";
import { boxBoundary, type WorldBoundary } from "./WorldBoundary";
import { boxFromCenter, emptyCollision, type WorldCollision } from "./collision";
import { DUNGEON_TEST } from "../data/dungeons/dungeon-definitions";
import { createPortalVfx, PORTAL_COLLISION_DEPTH, PORTAL_GATE_W, type PortalVfxHandle } from "../presentation/effects/PortalVfx";
import { FountainWater } from "../presentation/effects/FountainWater";
import { BRAZIER_RADIUS, createBrazier } from "../presentation/effects/Brazier";
import { createAmbientEmbers } from "../presentation/effects/AmbientEmbers";
import { cityPropFootprint, cityPropScale, spawnCityProp, type CityPropId } from "./CityProps";
import { makeCityFloorMaterial } from "./CityGround";
import { buildCityScenery } from "./CityScenery";

const FOUNTAIN_HEIGHT = 2.8;
const STALL_HEIGHT = 2.6;
const WALL_HEIGHT = 2.2;
const BULLETIN_HEIGHT = 2.3;
const BULLETIN_POS = { x: 3.6, z: -13.2, quarterTurns: 0 };
const PLAZA_RADIUS = 5.5;
const PLAZA_CURB = 0.55;
const BRAZIER_SPOTS: Array<[number, number]> = [
  [-6.8, -6.8],
  [6.8, -6.8],
  [-6.8, 6.8],
  [6.8, 6.8],
];
const EMBER_COUNT = 110;

const CITY_STALLS: Array<[CityPropId, number, number, number]> = [
  ["stall-1", -12, 10, 1],
  ["weapon-rack", 12, 10, 3],
  ["stall-bakery", -14, 0, 1],
  ["stall-1", 14, 0, 3],
  ["stall-2", -10, -12, 0],
  ["stall-bakery", 10, -12, 0],
  ["wagon", 0, 12, 2],
];

export interface WorldTickable {
  update(dt: number): void;
  dispose(): void;
}

export interface BuiltWorld {
  id: string;
  group: Group;
  boundary: WorldBoundary;
  collision: WorldCollision;
  interactables: InteractableDef[];
  spawn: { x: number; z: number };
  tickables: WorldTickable[];
}

function makeNpcMarker(def: InteractableDef): Group {
  const g = new Group();
  g.name = def.id;
  g.position.set(def.x, 0, def.z);

  const body = new Mesh(
    new CylinderGeometry(0.35, 0.4, 1.4, 12),
    new MeshStandardMaterial({ color: def.color, roughness: 0.55 }),
  );
  body.position.y = 0.7;
  body.castShadow = true;
  body.userData.interactableId = def.id;
  g.add(body);

  const head = new Mesh(
    new CylinderGeometry(0.22, 0.22, 0.35, 10),
    new MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.7 }),
  );
  head.position.y = 1.55;
  head.castShadow = true;
  head.userData.interactableId = def.id;
  g.add(head);

  return g;
}

function makeChest(def: InteractableDef): Group {
  const g = new Group();
  g.name = def.id;
  g.position.set(def.x, 0, def.z);

  const wood = new MeshStandardMaterial({
    color: def.color,
    roughness: 0.85,
    metalness: 0.05,
  });
  const darkWood = new MeshStandardMaterial({
    color: 0x5a3d22,
    roughness: 0.9,
    metalness: 0.05,
  });
  const iron = new MeshStandardMaterial({
    color: 0x8a7340,
    roughness: 0.45,
    metalness: 0.55,
  });

  const base = new Mesh(new BoxGeometry(1.15, 0.55, 0.75), wood);
  base.position.y = 0.28;
  base.castShadow = true;
  base.userData.interactableId = def.id;
  g.add(base);

  const lid = new Mesh(new BoxGeometry(1.18, 0.18, 0.78), darkWood);
  lid.position.set(0, 0.64, -0.02);
  lid.rotation.x = -0.18;
  lid.castShadow = true;
  lid.userData.interactableId = def.id;
  g.add(lid);

  const bandA = new Mesh(new BoxGeometry(1.2, 0.08, 0.78), iron);
  bandA.position.y = 0.22;
  bandA.userData.interactableId = def.id;
  g.add(bandA);

  const bandB = new Mesh(new BoxGeometry(1.2, 0.08, 0.78), iron);
  bandB.position.y = 0.42;
  bandB.userData.interactableId = def.id;
  g.add(bandB);

  const lock = new Mesh(new BoxGeometry(0.16, 0.18, 0.1), iron);
  lock.position.set(0, 0.4, 0.4);
  lock.userData.interactableId = def.id;
  g.add(lock);

  return g;
}

function makePortal(def: InteractableDef, interactive = true): PortalVfxHandle {
  return createPortalVfx(def.id, def.x, def.z, def.color, interactive);
}

export function buildCityWorld(): BuiltWorld {
  const size = 36;
  const group = new Group();
  group.name = "world-city";
  const floorMat = makeCityFloorMaterial(size / 2);
  const ground = new Mesh(new PlaneGeometry(size, size), floorMat);
  ground.rotation.x = -Math.PI / 2;
  ground.name = "ground";
  ground.receiveShadow = true;
  group.add(ground);
  group.add(buildCityScenery(size / 2));
  const collision = emptyCollision();

  const curb = new Mesh(
    new CylinderGeometry(PLAZA_RADIUS + PLAZA_CURB, PLAZA_RADIUS + PLAZA_CURB, 0.1, 48),
    new MeshStandardMaterial({ color: 0x6f665c, roughness: 0.95, metalness: 0 }),
  );
  curb.position.y = 0.05;
  curb.receiveShadow = true;
  curb.castShadow = true;
  group.add(curb);

  const plaza = new Mesh(new CylinderGeometry(PLAZA_RADIUS, PLAZA_RADIUS, 0.06, 48), floorMat);
  plaza.position.y = 0.1;
  plaza.receiveShadow = true;
  group.add(plaza);

  const fountainWater = new FountainWater();
  const fountainScale = cityPropScale("fountain", FOUNTAIN_HEIGHT);
  spawnCityProp(group, { id: "fountain", x: 0, z: 0, scale: fountainScale, quarterTurns: 0 }, (root) => {
    fountainWater.attach(root);
  });
  const fountainFoot = cityPropFootprint("fountain", fountainScale, 0);
  collision.circles.push({ x: 0, z: 0, r: Math.max(fountainFoot.width, fountainFoot.depth) / 2 });

  for (const [id, x, z, quarterTurns] of CITY_STALLS) {
    const scale = cityPropScale(id, STALL_HEIGHT);
    spawnCityProp(group, { id, x, z, scale, quarterTurns });
    const foot = cityPropFootprint(id, scale, quarterTurns);
    collision.boxes.push(boxFromCenter(x, z, foot.width, foot.depth));
  }

  const bulletinScale = cityPropScale("bulletin-board", BULLETIN_HEIGHT);
  spawnCityProp(group, { id: "bulletin-board", ...BULLETIN_POS, scale: bulletinScale });
  const bulletinFoot = cityPropFootprint("bulletin-board", bulletinScale, BULLETIN_POS.quarterTurns);
  collision.boxes.push(boxFromCenter(BULLETIN_POS.x, BULLETIN_POS.z, bulletinFoot.width, bulletinFoot.depth));

  const wallScale = cityPropScale("wall", WALL_HEIGHT);
  const wallSegment = cityPropFootprint("wall", wallScale, 0);
  const wallT = wallSegment.depth;
  const half = size / 2;
  const segments = Math.max(1, Math.round(size / wallSegment.width));
  const segmentLength = size / segments;
  const wallScaleX = wallScale * (segmentLength / wallSegment.width);
  const sides: Array<[number, number, number]> = [
    [0, half - wallT / 2, 0],
    [0, -half + wallT / 2, 2],
    [half - wallT / 2, 0, 1],
    [-half + wallT / 2, 0, 3],
  ];
  for (const [cx, cz, quarterTurns] of sides) {
    const alongX = quarterTurns % 2 === 0;
    for (let i = 0; i < segments; i++) {
      const offset = -half + segmentLength * (i + 0.5);
      spawnCityProp(group, {
        id: "wall",
        x: alongX ? offset : cx,
        z: alongX ? cz : offset,
        scale: wallScale,
        scaleX: wallScaleX,
        quarterTurns,
      });
    }
    collision.boxes.push(
      alongX ? boxFromCenter(cx, cz, size, wallT) : boxFromCenter(cx, cz, wallT, size),
    );
  }

  for (const def of CITY_INTERACTABLES) {
    group.add(def.kind === "chest" ? makeChest(def) : makeNpcMarker(def));
    collision.circles.push({ x: def.x, z: def.z, r: def.kind === "chest" ? 0.55 : 0.4 });
  }
  const tickables: WorldTickable[] = [fountainWater];
  BRAZIER_SPOTS.forEach(([bx, bz], i) => {
    const brazier = createBrazier(`brazier-${i}`, bx, bz);
    group.add(brazier.group);
    tickables.push(brazier);
    collision.circles.push({ x: bx, z: bz, r: BRAZIER_RADIUS });
  });
  const embers = createAmbientEmbers(EMBER_COUNT, size / 2 - 2);
  group.add(embers.points);
  tickables.push(embers);

  const cityPortal = makePortal(CITY_PORTAL_PROP, false);
  group.add(cityPortal.group);
  tickables.push(cityPortal);
  collision.boxes.push(
    boxFromCenter(CITY_PORTAL_PROP.x, CITY_PORTAL_PROP.z, PORTAL_GATE_W * 0.9, PORTAL_COLLISION_DEPTH),
  );

  return {
    id: "city",
    group,
    boundary: boxBoundary(size - 2),
    collision,
    interactables: CITY_INTERACTABLES,
    spawn: { x: 0, z: 4 },
    tickables,
  };
}

export function buildTestDungeonWorld(): BuiltWorld {

  const width = 28;
  const depth = 78;
  const group = new Group();
  group.name = "world-dungeon-test";
  const collision = emptyCollision();

  const plane = new Mesh(
    new PlaneGeometry(width, depth),
    new MeshStandardMaterial({ color: 0x161b24, roughness: 1 }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.z = -depth / 2 + 6;
  group.add(plane);

  const grid = new GridHelper(width, 14, 0x2a3140, 0x222833);
  grid.position.set(0, 0.01, -depth / 2 + 6);
  group.add(grid);

  const wallMat = new MeshStandardMaterial({ color: 0x252b36, roughness: 1 });

  for (const x of [-width / 2, width / 2]) {
    const wall = new Mesh(new BoxGeometry(0.5, 1.4, depth), wallMat);
    wall.position.set(x, 0.7, -depth / 2 + 6);
    group.add(wall);
    collision.boxes.push(boxFromCenter(x, -depth / 2 + 6, 0.5, depth));
  }

  for (const arena of DUNGEON_TEST.arenas) {
    const disc = new Mesh(
      new CylinderGeometry(arena.halfSize, arena.halfSize, 0.05, 28),
      new MeshStandardMaterial({ color: 0x1c2330, roughness: 1 }),
    );
    disc.position.set(arena.centerX, 0.03, arena.centerZ);
    group.add(disc);

    const next = DUNGEON_TEST.arenas[DUNGEON_TEST.arenas.indexOf(arena) + 1];
    if (next) {
      const midZ = (arena.centerZ + next.centerZ) / 2;
      const len = Math.abs(arena.centerZ - next.centerZ) - arena.halfSize - next.halfSize;
      const corridor = new Mesh(
        new BoxGeometry(4, 0.04, Math.max(len, 2)),
        new MeshStandardMaterial({ color: 0x222833, roughness: 1 }),
      );
      corridor.position.set(0, 0.04, midZ);
      group.add(corridor);
    }

  }

  const tickables: WorldTickable[] = [];
  const exitPortal = makePortal(
    {
      id: "portal-exit",
      label: "Portal de saída",
      kind: "portal-exit",
      x: 0,
      z: 7,
      color: 0x44c0ff,
      body: "",
    },
    true,
  );
  group.add(exitPortal.group);
  tickables.push(exitPortal);
  collision.boxes.push(
    boxFromCenter(0, 7, PORTAL_GATE_W * 0.9, PORTAL_COLLISION_DEPTH),
  );

  return {
    id: "dungeon-test",
    group,
    boundary: {
      minX: -width / 2 + 1,
      maxX: width / 2 - 1,
      minZ: -depth + 8,
      maxZ: 8,
    },
    collision,
    interactables: [
      {
        id: "portal-exit",
        label: "Portal de saída",
        kind: "portal-exit",
        x: 0,
        z: 7,
        color: 0x44c0ff,
        body: "",
      },
    ],
    spawn: { x: 0, z: 2 },
    tickables,
  };
}

import {
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  TorusGeometry,
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
import { makeCityFloorMaterial, makeCityPlazaMaterial, makeDungeon2FloorMaterial } from "./CityGround";
import { buildCityScenery } from "./CityScenery";
import { buildCityVegetation } from "./CityLandscape";
import { addCemeteryEnclosure } from "./CemeteryDressing";

const FOUNTAIN_HEIGHT = 2.8;
const STALL_HEIGHT = 2.6;
const WALL_HEIGHT = 2.2;
const BULLETIN_HEIGHT = 2.3;
const BULLETIN_POS = { x: 3.6, z: -13.2, quarterTurns: 0 };
export const CITY_PLAZA_RADIUS = 5.8;
const PLAZA_CURB = 0.62;
const FOUNTAIN_RING_R = 2.15;
export const CITY_PLAZA_DECK_Y = 0.16;
export const CITY_PLAZA_CURB_Y = 0.13;
export const CITY_PLAZA_OUTER_R = CITY_PLAZA_RADIUS + PLAZA_CURB;

export function sampleCityGroundY(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r <= CITY_PLAZA_RADIUS) return CITY_PLAZA_DECK_Y;
  if (r >= CITY_PLAZA_OUTER_R) return 0;
  const t = (r - CITY_PLAZA_RADIUS) / PLAZA_CURB;
  return CITY_PLAZA_CURB_Y * (1 - t);
}
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
  groundY: (x: number, z: number) => number;
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
  const floorMat = makeCityFloorMaterial(size / 2, CITY_PLAZA_RADIUS);
  const plazaMat = makeCityPlazaMaterial(CITY_PLAZA_RADIUS);
  const ground = new Mesh(new PlaneGeometry(size, size), floorMat);
  ground.rotation.x = -Math.PI / 2;
  ground.name = "ground";
  ground.receiveShadow = true;
  ground.userData.occlusionIgnore = true;
  group.add(ground);
  group.add(buildCityScenery(size / 2));
  const collision = emptyCollision();

  const curb = new Mesh(
    new CylinderGeometry(CITY_PLAZA_OUTER_R, CITY_PLAZA_OUTER_R, 0.14, 48),
    makeCityPlazaMaterial(CITY_PLAZA_OUTER_R),
  );
  curb.position.y = 0.06;
  curb.receiveShadow = true;
  curb.castShadow = true;
  curb.userData.occlusionIgnore = true;
  group.add(curb);

  const plaza = new Mesh(new CylinderGeometry(CITY_PLAZA_RADIUS, CITY_PLAZA_RADIUS, 0.08, 48), plazaMat);
  plaza.position.y = 0.12;
  plaza.receiveShadow = true;
  plaza.userData.occlusionIgnore = true;
  group.add(plaza);

  const fountainPlinth = new Mesh(
    new CylinderGeometry(FOUNTAIN_RING_R, FOUNTAIN_RING_R + 0.15, 0.18, 36),
    new MeshStandardMaterial({ color: 0x65665d, roughness: 0.96 }),
  );
  fountainPlinth.position.y = 0.18;
  fountainPlinth.receiveShadow = true;
  fountainPlinth.castShadow = true;
  fountainPlinth.userData.occlusionIgnore = true;
  group.add(fountainPlinth);

  const fountainWater = new FountainWater();
  const fountainScale = cityPropScale("fountain", FOUNTAIN_HEIGHT);
  spawnCityProp(group, { id: "fountain", x: 0, z: 0, scale: fountainScale, quarterTurns: 0 }, (root) => {
    fountainWater.attach(root);
  });
  const fountainFoot = cityPropFootprint("fountain", fountainScale, 0);
  const fountainPad = 0.08;
  collision.boxes.push(
    boxFromCenter(0, 0, fountainFoot.width + fountainPad * 2, fountainFoot.depth + fountainPad * 2),
  );
  collision.circles.push({
    x: 0,
    z: 0,
    r: Math.hypot(fountainFoot.width / 2, fountainFoot.depth / 2) + fountainPad,
  });
  collision.circles.push({ x: 0, z: 0, r: FOUNTAIN_RING_R + 0.12 });

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
  group.add(buildCityVegetation(collision, CITY_INTERACTABLES));
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
    interactables: [...CITY_INTERACTABLES, CITY_PORTAL_PROP],
    spawn: { x: 0, z: 4 },
    tickables,
    groundY: sampleCityGroundY,
  };
}

const DUNGEON_BRAZIER_SPOTS: Array<[number, number]> = [
  [-7.2, 4.2],
  [7.2, 4.2],
  [-8.2, -2],
  [8.2, -2],
  [-8.2, -24],
  [8.2, -24],
  [-8.8, -48],
  [8.8, -48],
];

function addCampoFence(group: Group, collision: WorldCollision, x: number, z: number, alongZ: boolean, length: number): void {
  const wood = new MeshStandardMaterial({ color: 0x5a3d22, roughness: 0.92, metalness: 0.02 });
  const postMat = new MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.95, metalness: 0 });
  const posts = Math.max(2, Math.round(length / 2.4));
  for (let i = 0; i < posts; i++) {
    const t = posts === 1 ? 0.5 : i / (posts - 1);
    const px = alongZ ? x : x - length / 2 + t * length;
    const pz = alongZ ? z - length / 2 + t * length : z;
    const post = new Mesh(new CylinderGeometry(0.12, 0.14, 1.35, 6), postMat);
    post.position.set(px, 0.68, pz);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);
  }
  const rail = new Mesh(new BoxGeometry(alongZ ? 0.12 : length, 0.1, alongZ ? length : 0.12), wood);
  rail.position.set(x, 0.95, z);
  rail.castShadow = true;
  rail.receiveShadow = true;
  group.add(rail);
  const railLow = new Mesh(new BoxGeometry(alongZ ? 0.1 : length, 0.08, alongZ ? length : 0.1), wood);
  railLow.position.set(x, 0.45, z);
  railLow.castShadow = true;
  group.add(railLow);
  collision.boxes.push(alongZ ? boxFromCenter(x, z, 0.35, length) : boxFromCenter(x, z, length, 0.35));
}

export function buildTestDungeonWorld(): BuiltWorld {
  const width = 28;
  const depth = 78;
  const group = new Group();
  group.name = "world-dungeon-test";
  const collision = emptyCollision();
  const tickables: WorldTickable[] = [];

  group.add(new AmbientLight(0xd8c8a8, 0.72));

  const floorMat = new MeshStandardMaterial({
    color: 0x5a6a3e,
    roughness: 0.95,
    metalness: 0.02,
    emissive: 0x243018,
    emissiveIntensity: 0.18,
  });
  const plane = new Mesh(new PlaneGeometry(width, depth), floorMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.z = -depth / 2 + 6;
  plane.receiveShadow = true;
  plane.userData.occlusionIgnore = true;
  group.add(plane);

  const pathMat = new MeshStandardMaterial({
    color: 0x6e5a3e,
    roughness: 0.92,
    metalness: 0.03,
    emissive: 0x2a2214,
    emissiveIntensity: 0.16,
  });
  const path = new Mesh(new BoxGeometry(5.2, 0.05, depth - 4), pathMat);
  path.position.set(0, 0.03, -depth / 2 + 6);
  path.receiveShadow = true;
  path.userData.occlusionIgnore = true;
  group.add(path);

  const wallMat = new MeshStandardMaterial({
    color: 0x4a5540,
    roughness: 0.9,
    metalness: 0.04,
    emissive: 0x1a2014,
    emissiveIntensity: 0.1,
  });

  for (const x of [-width / 2, width / 2]) {
    const wall = new Mesh(new BoxGeometry(0.55, 1.55, depth), wallMat);
    wall.position.set(x, 0.78, -depth / 2 + 6);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
    collision.boxes.push(boxFromCenter(x, -depth / 2 + 6, 0.55, depth));
  }

  for (const arena of DUNGEON_TEST.arenas) {
    const berm = new Mesh(
      new CylinderGeometry(arena.halfSize + 0.55, arena.halfSize + 0.75, 0.28, 28),
      new MeshStandardMaterial({
        color: 0x4a3e2c,
        roughness: 0.94,
        metalness: 0.02,
        emissive: 0x1e1810,
        emissiveIntensity: 0.12,
      }),
    );
    berm.position.set(arena.centerX, 0.1, arena.centerZ);
    berm.receiveShadow = true;
    berm.castShadow = true;
    berm.userData.occlusionIgnore = true;
    group.add(berm);

    const disc = new Mesh(
      new CylinderGeometry(arena.halfSize, arena.halfSize, 0.06, 28),
      new MeshStandardMaterial({
        color: 0x6a7a48,
        roughness: 0.9,
        metalness: 0.03,
        emissive: 0x2c3820,
        emissiveIntensity: 0.22,
      }),
    );
    disc.position.set(arena.centerX, 0.2, arena.centerZ);
    disc.receiveShadow = true;
    disc.userData.occlusionIgnore = true;
    group.add(disc);

    const ring = new Mesh(
      new TorusGeometry(arena.halfSize * 0.92, 0.07, 6, 36),
      new MeshStandardMaterial({ color: 0x8a7340, roughness: 0.55, metalness: 0.4 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(arena.centerX, 0.24, arena.centerZ);
    ring.userData.occlusionIgnore = true;
    group.add(ring);

    const fill = new PointLight(0xffd2a0, 8.5, 24, 1.45);
    fill.position.set(arena.centerX, 5.8, arena.centerZ);
    group.add(fill);

    const cool = new PointLight(0xa8c8e8, 2.4, 18, 1.8);
    cool.position.set(arena.centerX + 3.5, 4.2, arena.centerZ - 2);
    group.add(cool);

    const next = DUNGEON_TEST.arenas[DUNGEON_TEST.arenas.indexOf(arena) + 1];
    if (next) {
      const midZ = (arena.centerZ + next.centerZ) / 2;
      const len = Math.abs(arena.centerZ - next.centerZ) - arena.halfSize - next.halfSize;
      const corridor = new Mesh(
        new BoxGeometry(4.4, 0.05, Math.max(len, 2)),
        pathMat,
      );
      corridor.position.set(0, 0.06, midZ);
      corridor.receiveShadow = true;
      corridor.userData.occlusionIgnore = true;
      group.add(corridor);
      addCampoFence(group, collision, -3.2, midZ, true, Math.max(len * 0.85, 2));
      addCampoFence(group, collision, 3.2, midZ, true, Math.max(len * 0.85, 2));
    }
  }

  const rackScale = cityPropScale("weapon-rack", 2.2);
  spawnCityProp(group, { id: "weapon-rack", x: -5.5, z: 4.5, scale: rackScale, quarterTurns: 1 });
  const rackFoot = cityPropFootprint("weapon-rack", rackScale, 1);
  collision.boxes.push(boxFromCenter(-5.5, 4.5, rackFoot.width, rackFoot.depth));

  const boardScale = cityPropScale("bulletin-board", 2.1);
  spawnCityProp(group, { id: "bulletin-board", x: 5.2, z: 4.2, scale: boardScale, quarterTurns: 3 });
  const boardFoot = cityPropFootprint("bulletin-board", boardScale, 3);
  collision.boxes.push(boxFromCenter(5.2, 4.2, boardFoot.width, boardFoot.depth));

  addCampoFence(group, collision, -10, 0, false, 8);
  addCampoFence(group, collision, 10, 0, false, 8);

  DUNGEON_BRAZIER_SPOTS.forEach(([bx, bz], i) => {
    const brazier = createBrazier(`dungeon-brazier-${i}`, bx, bz);
    group.add(brazier.group);
    tickables.push(brazier);
    collision.circles.push({ x: bx, z: bz, r: BRAZIER_RADIUS });
  });

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
    groundY: () => 0,
  };
}

export function buildDungeon2World(): BuiltWorld {
  const size = 36;
  const group = new Group();
  group.name = "world-dungeon-2";
  const floorMat = makeDungeon2FloorMaterial(size / 2);
  const ground = new Mesh(new PlaneGeometry(size, size), floorMat);
  ground.rotation.x = -Math.PI / 2;
  ground.name = "ground";
  ground.receiveShadow = true;
  ground.userData.occlusionIgnore = true;
  group.add(ground);
  group.add(buildCityScenery(size / 2));
  const collision = emptyCollision();
  addCemeteryEnclosure(group, collision, size);

  const tickables: WorldTickable[] = [];
  group.add(buildCityVegetation(collision, []));
  BRAZIER_SPOTS.forEach(([bx, bz], i) => {
    const brazier = createBrazier(`d2-brazier-${i}`, bx, bz);
    group.add(brazier.group);
    tickables.push(brazier);
    collision.circles.push({ x: bx, z: bz, r: BRAZIER_RADIUS });
  });
  const embers = createAmbientEmbers(EMBER_COUNT, size / 2 - 2);
  group.add(embers.points);
  tickables.push(embers);

  const exitPortal = makePortal(
    {
      id: "portal-exit",
      label: "Portal de saída",
      kind: "portal-exit",
      x: CITY_PORTAL_PROP.x,
      z: CITY_PORTAL_PROP.z,
      color: 0x44c0ff,
      body: "",
    },
    true,
  );
  group.add(exitPortal.group);
  tickables.push(exitPortal);
  collision.boxes.push(
    boxFromCenter(CITY_PORTAL_PROP.x, CITY_PORTAL_PROP.z, PORTAL_GATE_W * 0.9, PORTAL_COLLISION_DEPTH),
  );

  return {
    id: "dungeon-2",
    group,
    boundary: boxBoundary(size - 2),
    collision,
    interactables: [
      {
        id: "portal-exit",
        label: "Portal de saída",
        kind: "portal-exit",
        x: CITY_PORTAL_PROP.x,
        z: CITY_PORTAL_PROP.z,
        color: 0x44c0ff,
        body: "",
      },
    ],
    spawn: { x: 0, z: -10.5 },
    tickables,
    groundY: () => 0,
  };
}

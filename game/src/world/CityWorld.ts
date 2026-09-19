import {
  BoxGeometry,
  CylinderGeometry,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import { CITY_INTERACTABLES, CITY_PORTAL_PROP, type InteractableDef } from "./definitions";
import { boxBoundary, type WorldBoundary } from "./WorldBoundary";
import { boxFromCenter, emptyCollision, type WorldCollision } from "./collision";
import { DUNGEON_TEST } from "../data/dungeons/dungeon-definitions";
import { createPortalVfx, PORTAL_COLLISION_DEPTH, PORTAL_GATE_W, type PortalVfxHandle } from "../presentation/effects/PortalVfx";

export interface BuiltWorld {
  id: string;
  group: Group;
  boundary: WorldBoundary;
  collision: WorldCollision;
  interactables: InteractableDef[];
  spawn: { x: number; z: number };
  tickables: PortalVfxHandle[];
}

function makeCityFloorMaterial(): MeshStandardMaterial {
  const texture = new TextureLoader().load("/textures/city-floor.webp");
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.repeat.set(6, 6);
  return new MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
}

function makeBuilding(w: number, h: number, d: number, color: number): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(w, h, d),
    new MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }),
  );
  mesh.position.y = h / 2;
  return mesh;
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
  body.userData.interactableId = def.id;
  g.add(body);

  const head = new Mesh(
    new CylinderGeometry(0.22, 0.22, 0.35, 10),
    new MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.7 }),
  );
  head.position.y = 1.55;
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
  base.userData.interactableId = def.id;
  g.add(base);

  const lid = new Mesh(new BoxGeometry(1.18, 0.18, 0.78), darkWood);
  lid.position.set(0, 0.64, -0.02);
  lid.rotation.x = -0.18;
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
  const floorMat = makeCityFloorMaterial();
  const ground = new Mesh(new PlaneGeometry(size, size), floorMat);
  ground.rotation.x = -Math.PI / 2;
  ground.name = "ground";
  group.add(ground);
  const collision = emptyCollision();

  const plaza = new Mesh(new CylinderGeometry(5.5, 5.5, 0.06, 32), floorMat);
  plaza.position.y = 0.03;
  group.add(plaza);

  const buildings: Array<[number, number, number, number, number, number]> = [
    [-12, 10, 4, 3.2, 4, 0x2f3848],
    [12, 10, 4, 2.8, 4, 0x2f3848],
    [-14, 0, 3, 4.5, 5, 0x384254],
    [14, 0, 3, 3.5, 5, 0x384254],
    [-10, -12, 5, 2.4, 3, 0x2a3344],
    [10, -12, 5, 2.4, 3, 0x2a3344],
    [0, 12, 6, 3.6, 4, 0x323c4c],
  ];
  for (const [x, z, w, h, d, color] of buildings) {
    const b = makeBuilding(w, h, d, color);
    b.position.x = x;
    b.position.z = z;
    group.add(b);
    collision.boxes.push(boxFromCenter(x, z, w, d));
  }

  const wallMat = new MeshStandardMaterial({ color: 0x252b36, roughness: 1 });
  const wallH = 1.6;
  const wallT = 0.6;
  const half = size / 2;
  const walls: Array<[number, number, number, number]> = [
    [0, half - wallT / 2, size, wallT],
    [0, -half + wallT / 2, size, wallT],
    [half - wallT / 2, 0, wallT, size],
    [-half + wallT / 2, 0, wallT, size],
  ];
  for (const [x, z, w, d] of walls) {
    const wall = new Mesh(new BoxGeometry(w, wallH, d), wallMat);
    wall.position.set(x, wallH / 2, z);
    group.add(wall);
    collision.boxes.push(boxFromCenter(x, z, w, d));
  }

  for (const def of CITY_INTERACTABLES) {
    group.add(def.kind === "chest" ? makeChest(def) : makeNpcMarker(def));
    collision.circles.push({ x: def.x, z: def.z, r: def.kind === "chest" ? 0.55 : 0.4 });
  }
  const tickables: PortalVfxHandle[] = [];
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

  const tickables: PortalVfxHandle[] = [];
  const exitPortal = makePortal(
    {
      id: "portal-exit",
      label: "Portal de saída",
      kind: "portal-exit",
      x: 0,
      z: 7,
      color: 0x44c0ff,
      body: "Encerra a expedição e retorna a Aurelion. [E]",
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
        body: "Encerra a expedição e retorna a Aurelion. [E]",
      },
    ],
    spawn: { x: 0, z: 2 },
    tickables,
  };
}

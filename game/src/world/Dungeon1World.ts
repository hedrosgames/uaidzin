import {
  BoxGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { BuiltWorld, WorldGates, WorldTickable } from "./CityWorld";
import { boxFromCenter, emptyCollision, positionBlocked, type SolidBox, type WorldCollision } from "./collision";
import { makePaintedTerrainMaterial } from "./PaintedTerrain";
import { splitInstancedSectors } from "./InstancedSectors";
import { grassCount } from "../presentation/rendering/GraphicsQuality";
import { trackWorldVisual } from "./WorldVisuals";
import { makePaintedGrassGeometry, makePaintedGrassMaterial } from "./PaintedGrass";
import { makeCityPaintedSolidMaterial } from "./CityPaintedMaterials";
import { DUNGEON1_HALF_WIDTH as HALF_W, DUNGEON1_FENCE_LINES as FENCE_LINES, DUNGEON1_ISLAND as ISLAND } from "./Dungeon1Layout";
import { cityPropFootprint, cityPropScale, spawnCityProp } from "./CityProps";
import { DUNGEON_EXIT, type InteractableDef } from "./definitions";
import { BRAZIER_RADIUS, createBrazier } from "../presentation/effects/Brazier";
import { createPortalVfx, PORTAL_COLLISION_DEPTH, PORTAL_GATE_W } from "../presentation/effects/PortalVfx";

const KIT_URL = "/models/props/campo/fences.glb";
const KIT_SCALE = 0.72;
const FENCE_STEP = 3.6 * KIT_SCALE;
const LEAF_W = 1.98 * KIT_SCALE;
const HINGE_X = 0.21 * KIT_SCALE;
const GATE_POST_X = LEAF_W + HINGE_X;
const FENCE_T = 0.36;

const OPEN_ANGLE = Math.PI * 0.47;
const OPEN_SPEED = 1.6;

const BRAZIERS: Array<[number, number]> = [
  [-17, 18], [17, 18], [-17, -14], [17, -14],
  [-17, -50], [17, -50], [-17, -90], [17, -90],
];

let kitPromise: Promise<Object3D | null> | null = null;

export function preloadCampoKit(): Promise<Object3D | null> {
  return loadKit();
}

function loadKit(): Promise<Object3D | null> {
  if (!kitPromise) {
    kitPromise = new GLTFLoader().loadAsync(KIT_URL).then((gltf) => {
      const wood = makeCityPaintedSolidMaterial("wood", 0x977252);
      gltf.scene.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh) return;
        mesh.material = wood;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
      });
      return gltf.scene;
    }).catch(() => null);
  }
  return kitPromise;
}

function placeKitPiece(parent: Object3D, name: string): void {
  trackWorldVisual(loadKit().then((kit) => {
    const source = kit?.getObjectByName(name);
    if (!source) return;
    const clone = source.clone(true);
    clone.position.set(0, source.position.y, 0);
    parent.add(clone);
  }));
}

function kitAnchor(parent: Group, name: string, x: number, z: number, yaw: number, scaleX = 1): Group {
  const anchor = new Group();
  anchor.position.set(x, 0, z);
  anchor.rotation.y = yaw;
  anchor.scale.set(KIT_SCALE * scaleX, KIT_SCALE, KIT_SCALE);
  anchor.userData.occlusionIgnore = true;
  parent.add(anchor);
  placeKitPiece(anchor, name);
  return anchor;
}

function addFenceRun(group: Group, collision: WorldCollision, ax: number, az: number, bx: number, bz: number): void {
  const alongZ = ax === bx;
  const length = alongZ ? Math.abs(bz - az) : Math.abs(bx - ax);
  if (length < 0.5) return;
  const count = Math.max(1, Math.round(length / FENCE_STEP));
  const step = length / count;
  const scaleX = step / FENCE_STEP;
  for (let i = 0; i < count; i++) {
    const x = alongZ ? ax : Math.min(ax, bx) + step * i;
    const z = alongZ ? Math.min(az, bz) + step * i : az;
    kitAnchor(group, "FenceType_1", x, z, alongZ ? -Math.PI / 2 : 0, scaleX);
  }
  collision.boxes.push(alongZ
    ? boxFromCenter(ax, (az + bz) / 2, FENCE_T, length)
    : boxFromCenter((ax + bx) / 2, az, length, FENCE_T));
}

interface GateLeaf {
  pivot: Group;
  closed: number;
  open: number;
}

function addGate(group: Group, z: number): GateLeaf[] {
  kitAnchor(group, "Beam001", -GATE_POST_X, z, 0);
  kitAnchor(group, "Beam005", GATE_POST_X, z, Math.PI);
  const left = kitAnchor(group, "DoorType_1", -LEAF_W, z, 0);
  const right = kitAnchor(group, "DoorType_2", LEAF_W, z, Math.PI);
  return [
    { pivot: left, closed: 0, open: OPEN_ANGLE },
    { pivot: right, closed: Math.PI, open: Math.PI - OPEN_ANGLE },
  ];
}

class KeyGates implements WorldGates, WorldTickable {
  private readonly opened: boolean[];

  constructor(
    private readonly leaves: GateLeaf[][],
    private readonly blockers: SolidBox[],
    private readonly collision: WorldCollision,
  ) {
    this.opened = leaves.map(() => false);
  }

  get count(): number {
    return this.leaves.length;
  }

  isOpen(index: number): boolean {
    return this.opened[index] ?? true;
  }

  open(index: number): void {
    if (this.isOpen(index)) return;
    this.opened[index] = true;
    const at = this.collision.boxes.indexOf(this.blockers[index]!);
    if (at >= 0) this.collision.boxes.splice(at, 1);
  }

  reset(): void {
    this.leaves.forEach((pair, i) => {
      this.opened[i] = false;
      for (const leaf of pair) leaf.pivot.rotation.y = leaf.closed;
      if (!this.collision.boxes.includes(this.blockers[i]!)) this.collision.boxes.push(this.blockers[i]!);
    });
  }

  update(dt: number): void {
    this.leaves.forEach((pair, i) => {
      if (!this.opened[i]) return;
      for (const leaf of pair) {
        const delta = leaf.open - leaf.pivot.rotation.y;
        const step = Math.sign(delta) * Math.min(Math.abs(delta), OPEN_SPEED * dt);
        leaf.pivot.rotation.y += step;
      }
    });
  }

  dispose(): void {}
}

function makeGroundMaterial(): MeshStandardMaterial {
  return makePaintedTerrainMaterial("field");
}

function makeWater(): { mesh: Mesh; tick: WorldTickable } {
  const uniforms = { uTime: { value: 0 } };
  const material = new MeshStandardMaterial({ color: 0x2c6a80, roughness: 0.74, metalness: 0 });
  material.name = "campo-water";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vWater;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWater = (modelMatrix * vec4(position, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec2 vWater;
uniform float uTime;
`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
vec2 p = vWater;
vec2 drift = vec2(uTime * 0.22, uTime * 0.13);
float w1 = 0.5 + sin(p.x * 0.9 + p.y * 0.5 + drift.x) * 0.5;
float w2 = 0.5 + sin(p.x * 1.7 - p.y * 0.8 - drift.y) * 0.5;
vec2 q = max(vec2(${ISLAND.minX.toFixed(1)}, ${ISLAND.minZ.toFixed(1)}) - p, p - vec2(${ISLAND.maxX.toFixed(1)}, ${ISLAND.maxZ.toFixed(1)}));
float shore = length(max(q, 0.0));
if (max(q.x, q.y) < 0.0) discard;
float foam = (1.0 - smoothstep(0.0, 1.1, shore + (w2 - 0.5) * 0.7)) * (0.55 + 0.45 * sin(uTime * 1.6 - shore * 5.0));
float depth = smoothstep(0.0, 14.0, shore);
diffuseColor.rgb = mix(vec3(0.2, 0.46, 0.5), vec3(0.07, 0.2, 0.3), depth);
diffuseColor.rgb *= mix(0.96, 1.04, w1 * w2);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.86), clamp(foam, 0.0, 1.0) * 0.75);`);
  };
  material.customProgramCacheKey = () => "campo-water-2";
  const centerZ = (ISLAND.minZ + ISLAND.maxZ) / 2;
  const mesh = new Mesh(new PlaneGeometry(160, 260), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.22, centerZ);
  mesh.receiveShadow = true;
  mesh.userData.occlusionIgnore = true;
  mesh.raycast = () => {};
  return {
    mesh,
    tick: {
      update(dt: number) {
        uniforms.uTime.value += dt;
      },
      dispose() {},
    },
  };
}

function buildUnderstory(collision: WorldCollision): Group {
  const group = new Group();
  group.name = "campo-understory";
  const grass = new InstancedMesh(makePaintedGrassGeometry(), makePaintedGrassMaterial(), 6800);
  grass.name = "campo-grass";
  const stones = new InstancedMesh(new IcosahedronGeometry(1, 0), new MeshStandardMaterial({ color: 0x8a8272, roughness: 0.96 }), 220);
  stones.name = "campo-stones";
  const transform = new Object3D();
  const color = new Color();
  let seed = 51287;
  const random = () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
  const width = ISLAND.maxX - ISLAND.minX - 0.6;
  const depth = ISLAND.maxZ - ISLAND.minZ - 0.6;
  for (const mesh of [grass, stones]) {
    let count = 0;
    for (let attempt = 0; attempt < 60000 && count < mesh.instanceMatrix.count; attempt++) {
      const x = ISLAND.minX + 0.3 + random() * width;
      const z = ISLAND.minZ + 0.3 + random() * depth;
      const inside = Math.abs(x) < HALF_W && z < FENCE_LINES[0]! && z > FENCE_LINES[3]!;
      const nearFence = Math.abs(Math.abs(x) - HALF_W) < 1.1 || FENCE_LINES.some((line) => Math.abs(z - line) < 1.1);
      if (Math.abs(x) < 2.6 && inside) continue;
      if (positionBlocked(x, z, 0.1, collision)) continue;
      const patch = Math.sin(x * 0.48 + Math.sin(z * 0.23)) * Math.cos(z * 0.36 - x * 0.1);
      const keep = inside ? (nearFence ? 0.8 : 0.05 + Math.max(0, patch) * 0.9) : 0.65;
      if (random() > keep) continue;
      const tall = mesh === grass && !inside;
      transform.position.set(x, mesh === grass ? 0.012 : 0.02, z);
      transform.rotation.set(mesh === stones ? random() * 2 : 0, random() * Math.PI * 2, 0);
      const scale = mesh === grass ? (tall ? 0.95 + random() * 0.5 : 0.85 + random() * 0.4) : 0.05 + random() * 0.1;
      transform.scale.set(scale, scale * (mesh === stones ? 0.4 : 1), scale);
      transform.updateMatrix();
      mesh.setMatrixAt(count, transform.matrix);
      if (mesh === grass) color.setRGB(0.85 + random() * 0.15, 0.88 + random() * 0.12, 0.8 + random() * 0.15);
      else color.setHSL(0.1, 0.06, 0.5 + random() * 0.2);
      mesh.setColorAt(count, color);
      count++;
    }
    mesh.count = count;
    mesh.receiveShadow = mesh !== grass;
    if (mesh === grass) {
      mesh.userData.budgetKind = "grass";
      mesh.userData.fullCount = count;
      mesh.count = grassCount(count);
    }
    mesh.userData.occlusionIgnore = true;
    mesh.raycast = () => {};
    mesh.computeBoundingSphere();
    group.add(splitInstancedSectors(mesh));
  }
  return group;
}

export function buildDungeon1World(): BuiltWorld {
  const group = new Group();
  group.name = "world-dungeon-1";
  const collision = emptyCollision();
  const occluders: Object3D[] = [];
  const tickables: WorldTickable[] = [];

  const islandW = ISLAND.maxX - ISLAND.minX;
  const islandD = ISLAND.maxZ - ISLAND.minZ;
  const island = new Mesh(new BoxGeometry(islandW, 0.6, islandD), makeCityPaintedSolidMaterial("wood", 0x776451));
  island.position.set((ISLAND.minX + ISLAND.maxX) / 2, -0.3, (ISLAND.minZ + ISLAND.maxZ) / 2);
  island.name = "island-bank";
  island.receiveShadow = true;
  island.userData.occlusionIgnore = true;
  group.add(island);

  const ground = new Mesh(new PlaneGeometry(islandW, islandD), makeGroundMaterial());
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0.002, (ISLAND.minZ + ISLAND.maxZ) / 2);
  ground.name = "ground";
  ground.receiveShadow = true;
  ground.userData.occlusionIgnore = true;
  group.add(ground);

  const water = makeWater();
  group.add(water.mesh);
  tickables.push(water.tick);

  const top = FENCE_LINES[0]!;
  const bottom = FENCE_LINES[FENCE_LINES.length - 1]!;
  addFenceRun(group, collision, -HALF_W, bottom, -HALF_W, top);
  addFenceRun(group, collision, HALF_W, bottom, HALF_W, top);
  addFenceRun(group, collision, -HALF_W, top, HALF_W, top);
  addFenceRun(group, collision, -HALF_W, bottom, HALF_W, bottom);

  const leaves: GateLeaf[][] = [];
  const blockers: SolidBox[] = [];
  for (const z of FENCE_LINES.slice(1, -1)) {
    addFenceRun(group, collision, -HALF_W, z, -GATE_POST_X - 0.2, z);
    addFenceRun(group, collision, GATE_POST_X + 0.2, z, HALF_W, z);
    leaves.push(addGate(group, z));
    const blocker = boxFromCenter(0, z, GATE_POST_X * 2 + 0.4, FENCE_T);
    blockers.push(blocker);
    collision.boxes.push(blocker);
  }
  const gates = new KeyGates(leaves, blockers, collision);
  tickables.push(gates);

  BRAZIERS.forEach(([bx, bz], i) => {
    const brazier = createBrazier(`d1-brazier-${i}`, bx, bz, i % 2 === 0);
    group.add(brazier.group);
    tickables.push(brazier);
    collision.circles.push({ x: bx, z: bz, r: BRAZIER_RADIUS });
  });

  const rackScale = cityPropScale("weapon-rack", 2.1);
  occluders.push(spawnCityProp(group, { id: "weapon-rack", x: -13.2, z: 12.8, scale: rackScale, quarterTurns: 1 }));
  const rackFoot = cityPropFootprint("weapon-rack", rackScale, 1);
  collision.boxes.push(boxFromCenter(-13.2, 12.8, rackFoot.width, rackFoot.depth));

  const exit: InteractableDef = { ...DUNGEON_EXIT, x: 0, z: 16.6 };
  const portal = createPortalVfx(exit.id, exit.x, exit.z, exit.color, true);
  group.add(portal.group);
  tickables.push(portal);
  collision.boxes.push(boxFromCenter(exit.x, exit.z, PORTAL_GATE_W * 0.9, PORTAL_COLLISION_DEPTH));

  group.add(buildUnderstory(collision));

  return {
    id: "dungeon-1",
    group,
    boundary: { minX: -HALF_W + 0.3, maxX: HALF_W - 0.3, minZ: bottom + 0.3, maxZ: top - 0.3 },
    collision,
    interactables: [exit],
    spawn: { x: 0, z: 10 },
    tickables,
    groundY: () => 0,
    occluders,
    gates,
  };
}

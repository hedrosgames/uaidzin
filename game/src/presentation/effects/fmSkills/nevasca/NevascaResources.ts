import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  type CanvasTexture,
} from "three";
import { NevascaTextures } from "./NevascaTextures";

type Point = readonly [x: number, y: number, z: number];

const CRYSTAL_SIDES = 6;
const CRYSTAL_RINGS = 6;
const CRYSTAL_HEIGHT = 0.78;
const CRYSTAL_RADIUS = 0.135;
const ARC_SEGMENTS = 26;
const ARC_SIDES = 7;
const CONE_SIDES = 30;
const CONE_RINGS = 9;

const ICE_DEEP = new Color(0x235b9e);
const ICE_BODY = new Color(0x7dbce9);
const ICE_TIP = new Color(0xf2fdff);
const ARC_EDGE = new Color(0x7fb6e4);
const ARC_CORE = new Color(0xf2fdff);
const CONE_BASE = new Color(0x86bce4);
const CONE_TIP = new Color(0xf4feff);

function jitter(seed: number, spread: number): number {
  return (Math.sin(seed * 12.9898) * 43758.5453 % 1) * spread;
}

function pushVertex(
  positions: number[],
  uvs: number[],
  colors: number[],
  point: Point,
  u: number,
  v: number,
  color: Color,
): void {
  positions.push(point[0], point[1], point[2]);
  uvs.push(u, v);
  colors.push(color.r, color.g, color.b);
}

function pushTriangle(
  positions: number[],
  uvs: number[],
  colors: number[],
  a: Point,
  b: Point,
  c: Point,
  ua: readonly [number, number],
  ub: readonly [number, number],
  uc: readonly [number, number],
  colorA: Color,
  colorB: Color,
  colorC: Color,
): void {
  pushVertex(positions, uvs, colors, a, ua[0], ua[1], colorA);
  pushVertex(positions, uvs, colors, b, ub[0], ub[1], colorB);
  pushVertex(positions, uvs, colors, c, uc[0], uc[1], colorC);
}

function finish(name: string, positions: number[], uvs: number[], colors: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.name = `Nevasca.${name}`;
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function crystalRadius(t: number): number {
  const belly = Math.pow(Math.sin(Math.PI * Math.min(0.99, t * 0.86 + 0.14)), 0.42);
  const tip = Math.pow(Math.max(0, 1 - t), 0.22);
  return CRYSTAL_RADIUS * belly * tip;
}

function createCrystalGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (ringIndex: number, side: number): { point: Point; color: Color } => {
    const t = ringIndex / CRYSTAL_RINGS;
    const angle = side / CRYSTAL_SIDES * Math.PI * 2;
    const facet = 0.82 + jitter(side * 4.1, 0.3);
    const radius = crystalRadius(t) * facet;
    const point: Point = [
      Math.cos(angle) * radius,
      t * CRYSTAL_HEIGHT - CRYSTAL_HEIGHT * 0.12,
      Math.sin(angle) * radius,
    ];
    const edge = Math.pow(Math.abs(Math.cos(angle)) * 0.5 + 0.5, 3);
    const color = ICE_DEEP.clone()
      .lerp(ICE_BODY, Math.pow(Math.min(1, t * 1.4), 0.7))
      .lerp(ICE_TIP, Math.pow(t, 2.2) * 0.7 + edge * 0.35);
    return { point, color };
  };
  for (let ringIndex = 0; ringIndex < CRYSTAL_RINGS; ringIndex += 1) {
    for (let side = 0; side < CRYSTAL_SIDES; side += 1) {
      const next = (side + 1) % CRYSTAL_SIDES;
      const a = ring(ringIndex, side);
      const b = ring(ringIndex, next);
      const c = ring(ringIndex + 1, side);
      const d = ring(ringIndex + 1, next);
      const v0 = ringIndex / CRYSTAL_RINGS;
      const v1 = (ringIndex + 1) / CRYSTAL_RINGS;
      const u0 = side / CRYSTAL_SIDES;
      const u1 = next / CRYSTAL_SIDES;
      pushTriangle(positions, uvs, colors, a.point, c.point, b.point, [u0, v0], [u0, v1], [u1, v0], a.color, c.color, b.color);
      pushTriangle(positions, uvs, colors, b.point, c.point, d.point, [u1, v0], [u0, v1], [u1, v1], b.color, c.color, d.color);
    }
  }
  const tip: Point = [0, CRYSTAL_HEIGHT * 1.16, 0];
  for (let side = 0; side < CRYSTAL_SIDES; side += 1) {
    const next = (side + 1) % CRYSTAL_SIDES;
    const a = ring(CRYSTAL_RINGS, side);
    const b = ring(CRYSTAL_RINGS, next);
    pushTriangle(positions, uvs, colors, a.point, tip, b.point, [side / CRYSTAL_SIDES, 1], [0.5, 1], [next / CRYSTAL_SIDES, 1], a.color, ICE_TIP, b.color);
  }
  const base: Point = [0, -CRYSTAL_HEIGHT * 0.12, 0];
  for (let side = 0; side < CRYSTAL_SIDES; side += 1) {
    const next = (side + 1) % CRYSTAL_SIDES;
    const a = ring(0, next);
    const b = ring(0, side);
    pushTriangle(positions, uvs, colors, base, a.point, b.point, [0.5, 0], [next / CRYSTAL_SIDES, 0], [side / CRYSTAL_SIDES, 0], ICE_DEEP, a.color, b.color);
  }
  return finish("crystal", positions, uvs, colors);
}

function createArcGeometry(radius: number, span: number, thickness: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (segment: number, side: number): { point: Point; color: Color } => {
    const t = segment / ARC_SEGMENTS;
    const angle = -span * 0.5 + span * t;
    const cross = side / ARC_SIDES * Math.PI * 2;
    const taper = Math.pow(Math.sin(Math.PI * Math.min(0.999, t + 0.001)), 0.4);
    const local = thickness * taper * (0.6 + Math.sin(cross) * 0.4);
    const lift = thickness * 0.5 + Math.sin(cross) * thickness * 0.55;
    const wobble = 1 + Math.sin(t * 8.1) * 0.028;
    const radial = radius * wobble + Math.cos(cross) * local;
    return {
      point: [
        Math.cos(angle) * radial,
        Math.max(0.025, lift * taper),
        Math.sin(angle) * radial,
      ],
      color: ARC_EDGE.clone().lerp(ARC_CORE, Math.pow(taper, 1.5)),
    };
  };
  for (let segment = 0; segment < ARC_SEGMENTS; segment += 1) {
    for (let side = 0; side < ARC_SIDES; side += 1) {
      const next = (side + 1) % ARC_SIDES;
      const a = ring(segment, side);
      const b = ring(segment, next);
      const c = ring(segment + 1, side);
      const d = ring(segment + 1, next);
      const u0 = segment / ARC_SEGMENTS;
      const u1 = (segment + 1) / ARC_SEGMENTS;
      const v0 = side / ARC_SIDES;
      const v1 = next / ARC_SIDES;
      pushTriangle(positions, uvs, colors, a.point, c.point, b.point, [u0, v0], [u1, v0], [u0, v1], a.color, c.color, b.color);
      pushTriangle(positions, uvs, colors, b.point, c.point, d.point, [u0, v1], [u1, v0], [u1, v1], b.color, c.color, d.color);
    }
  }
  return finish("arc", positions, uvs, colors);
}

function createConeShellGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (ringIndex: number, side: number): { point: Point; color: Color } => {
    const t = ringIndex / CONE_RINGS;
    const angle = side / CONE_SIDES * Math.PI * 2 + t * 1.4;
    const radius = Math.pow(1 - t, 0.82);
    const ripple = 1 + Math.sin(angle * 5 + t * 6.4) * 0.045;
    const point: Point = [
      Math.cos(angle) * radius * ripple,
      t,
      Math.sin(angle) * radius * ripple,
    ];
    const edge = Math.pow(Math.abs(Math.cos(angle)) * 0.5 + 0.5, 2);
    return {
      point,
      color: CONE_BASE.clone().lerp(CONE_TIP, Math.pow(t, 0.72) * 0.8 + edge * 0.2),
    };
  };
  for (let ringIndex = 0; ringIndex < CONE_RINGS; ringIndex += 1) {
    for (let side = 0; side < CONE_SIDES; side += 1) {
      if (side % 5 === 0) continue;
      const next = (side + 1) % CONE_SIDES;
      const a = ring(ringIndex, side);
      const b = ring(ringIndex, next);
      const c = ring(ringIndex + 1, side);
      const d = ring(ringIndex + 1, next);
      const u0 = side / CONE_SIDES;
      const u1 = next / CONE_SIDES;
      const v0 = ringIndex / CONE_RINGS;
      const v1 = (ringIndex + 1) / CONE_RINGS;
      pushTriangle(positions, uvs, colors, a.point, c.point, b.point, [u0, v0], [u0, v1], [u1, v0], a.color, c.color, b.color);
      pushTriangle(positions, uvs, colors, b.point, c.point, d.point, [u1, v0], [u0, v1], [u1, v1], b.color, c.color, d.color);
    }
  }
  const apex: Point = [0, 1.06, 0];
  for (let side = 0; side < CONE_SIDES; side += 1) {
    const next = (side + 1) % CONE_SIDES;
    const a = ring(CONE_RINGS, side);
    const b = ring(CONE_RINGS, next);
    pushTriangle(positions, uvs, colors, a.point, apex, b.point, [side / CONE_SIDES, 1], [0.5, 1], [next / CONE_SIDES, 1], a.color, CONE_TIP, b.color);
  }
  return finish("coneShell", positions, uvs, colors);
}

function createPlane(name: string, size: number, horizontal: boolean): PlaneGeometry {
  const geometry = new PlaneGeometry(size, size);
  geometry.name = `Nevasca.${name}`;
  if (horizontal) geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function particleMaterial(
  name: string,
  map: CanvasTexture,
  opacity: number,
  additive: boolean,
): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    name: `Nevasca.${name}`,
    map,
    color: 0xffffff,
    transparent: true,
    opacity,
    alphaTest: 0.006,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: additive ? AdditiveBlending : NormalBlending,
    toneMapped: false,
  });
  material.forceSinglePass = true;
  return material;
}

function emissiveMaterial(
  name: string,
  map: CanvasTexture | null,
  color: number,
  opacity: number,
  additive: boolean,
): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    name: `Nevasca.${name}`,
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: additive ? AdditiveBlending : NormalBlending,
    toneMapped: false,
    vertexColors: map === null,
  });
  material.forceSinglePass = true;
  return material;
}

export class NevascaResources {
  readonly textures: NevascaTextures = new NevascaTextures();
  readonly crystalGeometry: BufferGeometry = createCrystalGeometry();
  readonly arcGeometry: BufferGeometry = createArcGeometry(3.8, 2.15, 0.068);
  readonly arcSmallGeometry: BufferGeometry = createArcGeometry(2.62, 3.05, 0.046);
  readonly coneShellGeometry: BufferGeometry = createConeShellGeometry();
  readonly billboardGeometry: PlaneGeometry = createPlane("billboard", 1, false);
  readonly groundGeometry: PlaneGeometry = createPlane("ground", 1, true);
  readonly materials = {
    frost: particleMaterial("frost", this.textures.frost, 0.95, false),
    crystal: particleMaterial("crystal", this.textures.crystal, 0.92, false),
    flake: particleMaterial("flake", this.textures.flake, 0.9, false),
    flash: particleMaterial("flash", this.textures.flash, 0.5, true),
    ground: particleMaterial("ground", this.textures.ground, 0.72, false),
    streak: particleMaterial("streak", this.textures.streak, 0.88, true),
  };
  readonly crystalMaterial: MeshBasicMaterial = emissiveMaterial("crystalMesh", null, 0xe4f4ff, 0.9, false);
  readonly shardMaterial: MeshBasicMaterial = emissiveMaterial("shard", null, 0xdaf1ff, 0.94, false);
  readonly arcMaterial: MeshBasicMaterial = emissiveMaterial("arc", null, 0xa9d8f6, 0.7, true);
  readonly arcCoreMaterial: MeshBasicMaterial = emissiveMaterial("arcCore", null, 0xf0fbff, 0.58, true);
  readonly coneMaterial: MeshBasicMaterial = emissiveMaterial("cone", null, 0xffffff, 0.42, false);

  dispose(): void {
    this.crystalGeometry.dispose();
    this.arcGeometry.dispose();
    this.arcSmallGeometry.dispose();
    this.coneShellGeometry.dispose();
    this.billboardGeometry.dispose();
    this.groundGeometry.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    this.crystalMaterial.dispose();
    this.shardMaterial.dispose();
    this.arcMaterial.dispose();
    this.arcCoreMaterial.dispose();
    this.coneMaterial.dispose();
    this.textures.dispose();
  }
}

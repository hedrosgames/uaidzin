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
import { ColapsoElementalTextures } from "./ColapsoElementalTextures";

type Point = readonly [x: number, y: number, z: number];

const SHARD_SIDES = 7;
const SHARD_RINGS = 6;
const SHARD_HEIGHT = 0.46;
const SHARD_RADIUS = 0.14;
const DISC_SEGMENTS = 30;
const DISC_SIDES = 6;
const CORE_SIDES = 14;
const CORE_RINGS = 8;

const EMBER_DEEP = new Color(0x8a2f12);
const EMBER_BODY = new Color(0xff8f3c);
const EMBER_TIP = new Color(0xffe6a8);
const FROST_DEEP = new Color(0x2f6b96);
const FROST_BODY = new Color(0x9fd6f2);
const FROST_TIP = new Color(0xf0fbff);
const SHADOW_DEEP = new Color(0x2c1140);
const SHADOW_BODY = new Color(0x8a4fc4);
const SHADOW_TIP = new Color(0xe0b6f5);
const GOLD_DEEP = new Color(0x8a6212);
const GOLD_BODY = new Color(0xf0c256);
const GOLD_TIP = new Color(0xfff4cf);

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
  geometry.name = `ColapsoElemental.${name}`;
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function shardRadius(t: number): number {
  const belly = Math.pow(Math.sin(Math.PI * Math.min(0.99, t * 0.82 + 0.18)), 0.38);
  const tip = Math.pow(Math.max(0, 1 - t), 0.24);
  return SHARD_RADIUS * belly * tip;
}

function shardPalette(variant: number): readonly [Color, Color, Color] {
  if (variant === 0) return [EMBER_DEEP, EMBER_BODY, EMBER_TIP];
  if (variant === 1) return [FROST_DEEP, FROST_BODY, FROST_TIP];
  if (variant === 2) return [SHADOW_DEEP, SHADOW_BODY, SHADOW_TIP];
  return [GOLD_DEEP, GOLD_BODY, GOLD_TIP];
}

function createShardGeometry(variant: number): BufferGeometry {
  const [deep, body, tip] = shardPalette(variant);
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (ringIndex: number, side: number): { point: Point; color: Color } => {
    const t = ringIndex / SHARD_RINGS;
    const angle = side / SHARD_SIDES * Math.PI * 2 + variant * 0.24;
    const facet = 0.78 + jitter(side * 3.9 + variant * 7.3, 0.34);
    const radius = shardRadius(t) * facet;
    const point: Point = [
      Math.cos(angle) * radius,
      t * SHARD_HEIGHT - SHARD_HEIGHT * 0.1,
      Math.sin(angle) * radius,
    ];
    const edge = Math.pow(Math.abs(Math.cos(angle)) * 0.5 + 0.5, 2.6);
    const color = deep.clone()
      .lerp(body, Math.pow(Math.min(1, t * 1.5), 0.65))
      .lerp(tip, Math.pow(t, 2) * 0.62 + edge * 0.3);
    return { point, color };
  };
  for (let ringIndex = 0; ringIndex < SHARD_RINGS; ringIndex += 1) {
    for (let side = 0; side < SHARD_SIDES; side += 1) {
      const next = (side + 1) % SHARD_SIDES;
      const a = ring(ringIndex, side);
      const b = ring(ringIndex, next);
      const c = ring(ringIndex + 1, side);
      const d = ring(ringIndex + 1, next);
      const v0 = ringIndex / SHARD_RINGS;
      const v1 = (ringIndex + 1) / SHARD_RINGS;
      const u0 = side / SHARD_SIDES;
      const u1 = next / SHARD_SIDES;
      pushTriangle(positions, uvs, colors, a.point, c.point, b.point, [u0, v0], [u0, v1], [u1, v0], a.color, c.color, b.color);
      pushTriangle(positions, uvs, colors, b.point, c.point, d.point, [u1, v0], [u0, v1], [u1, v1], b.color, c.color, d.color);
    }
  }
  const apex: Point = [0, SHARD_HEIGHT * 1.12, 0];
  for (let side = 0; side < SHARD_SIDES; side += 1) {
    const next = (side + 1) % SHARD_SIDES;
    const a = ring(SHARD_RINGS, side);
    const b = ring(SHARD_RINGS, next);
    pushTriangle(positions, uvs, colors, a.point, apex, b.point, [side / SHARD_SIDES, 1], [0.5, 1], [next / SHARD_SIDES, 1], a.color, tip, b.color);
  }
  const base: Point = [0, -SHARD_HEIGHT * 0.1, 0];
  for (let side = 0; side < SHARD_SIDES; side += 1) {
    const next = (side + 1) % SHARD_SIDES;
    const a = ring(0, next);
    const b = ring(0, side);
    pushTriangle(positions, uvs, colors, base, a.point, b.point, [0.5, 0], [next / SHARD_SIDES, 0], [side / SHARD_SIDES, 0], deep, a.color, b.color);
  }
  return finish(`shard${variant}`, positions, uvs, colors);
}

function createCoreGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (ringIndex: number, side: number): { point: Point; color: Color } => {
    const t = ringIndex / CORE_RINGS;
    const angle = side / CORE_SIDES * Math.PI * 2;
    const bulge = Math.pow(Math.sin(Math.PI * Math.min(0.99, t * 0.9 + 0.08)), 0.46);
    const crack = 1 + Math.sin(angle * 4 + t * 7) * 0.09 + jitter(side * 2.3 + ringIndex * 3.1, 0.12);
    const radius = 0.5 * bulge * crack;
    const point: Point = [
      Math.cos(angle) * radius,
      (t - 0.5) * 1.02,
      Math.sin(angle) * radius,
    ];
    const heat = Math.pow(1 - Math.abs(t - 0.5) * 1.8, 1.6);
    const color = EMBER_DEEP.clone()
      .lerp(GOLD_BODY, Math.pow(t, 0.7) * 0.75 + heat * 0.25)
      .lerp(GOLD_TIP, heat * 0.5);
    return { point, color };
  };
  for (let ringIndex = 0; ringIndex < CORE_RINGS; ringIndex += 1) {
    for (let side = 0; side < CORE_SIDES; side += 1) {
      const next = (side + 1) % CORE_SIDES;
      const a = ring(ringIndex, side);
      const b = ring(ringIndex, next);
      const c = ring(ringIndex + 1, side);
      const d = ring(ringIndex + 1, next);
      const v0 = ringIndex / CORE_RINGS;
      const v1 = (ringIndex + 1) / CORE_RINGS;
      const u0 = side / CORE_SIDES;
      const u1 = next / CORE_SIDES;
      pushTriangle(positions, uvs, colors, a.point, c.point, b.point, [u0, v0], [u0, v1], [u1, v0], a.color, c.color, b.color);
      pushTriangle(positions, uvs, colors, b.point, c.point, d.point, [u1, v0], [u0, v1], [u1, v1], b.color, c.color, d.color);
    }
  }
  const top: Point = [0, 0.58, 0];
  const bottom: Point = [0, -0.58, 0];
  for (let side = 0; side < CORE_SIDES; side += 1) {
    const next = (side + 1) % CORE_SIDES;
    const a = ring(CORE_RINGS, side);
    const b = ring(CORE_RINGS, next);
    pushTriangle(positions, uvs, colors, a.point, top, b.point, [side / CORE_SIDES, 1], [0.5, 1], [next / CORE_SIDES, 1], a.color, GOLD_TIP, b.color);
    const e = ring(0, next);
    const f = ring(0, side);
    pushTriangle(positions, uvs, colors, bottom, e.point, f.point, [0.5, 0], [next / CORE_SIDES, 0], [side / CORE_SIDES, 0], EMBER_DEEP, e.color, f.color);
  }
  return finish("core", positions, uvs, colors);
}

function createDiscGeometry(inner: number, outer: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (segment: number, side: number): { point: Point; color: Color } => {
    const t = segment / DISC_SEGMENTS;
    const angle = t * Math.PI * 2;
    const cross = side / DISC_SIDES * Math.PI * 2;
    const taper = Math.pow(Math.sin(Math.PI * Math.min(0.999, t + 0.001)), 0.36);
    const radius = inner + (outer - inner) * t;
    const thickness = 0.06 * taper * (0.5 + Math.sin(cross) * 0.5);
    const lift = 0.04 + Math.sin(cross) * thickness;
    const glow = Math.pow(taper, 1.4);
    const color = EMBER_BODY.clone()
      .lerp(FROST_BODY, t)
      .lerp(GOLD_TIP, glow * 0.55);
    return {
      point: [
        Math.cos(angle) * radius,
        Math.max(0.01, lift * taper + 0.012),
        Math.sin(angle) * radius,
      ],
      color,
    };
  };
  for (let segment = 0; segment < DISC_SEGMENTS; segment += 1) {
    for (let side = 0; side < DISC_SIDES; side += 1) {
      const next = (side + 1) % DISC_SIDES;
      const a = ring(segment, side);
      const b = ring(segment, next);
      const c = ring(segment + 1, side);
      const d = ring(segment + 1, next);
      const u0 = segment / DISC_SEGMENTS;
      const u1 = (segment + 1) / DISC_SEGMENTS;
      const v0 = side / DISC_SIDES;
      const v1 = next / DISC_SIDES;
      pushTriangle(positions, uvs, colors, a.point, c.point, b.point, [u0, v0], [u1, v0], [u0, v1], a.color, c.color, b.color);
      pushTriangle(positions, uvs, colors, b.point, c.point, d.point, [u0, v1], [u1, v0], [u1, v1], b.color, c.color, d.color);
    }
  }
  return finish("disc", positions, uvs, colors);
}

function createPlane(name: string, size: number, horizontal: boolean): PlaneGeometry {
  const geometry = new PlaneGeometry(size, size);
  geometry.name = `ColapsoElemental.${name}`;
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
    name: `ColapsoElemental.${name}`,
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
    name: `ColapsoElemental.${name}`,
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

export class ColapsoElementalResources {
  readonly textures: ColapsoElementalTextures = new ColapsoElementalTextures();
  readonly shardGeometries: BufferGeometry[] = [0, 1, 2, 3].map(createShardGeometry);
  readonly coreGeometry: BufferGeometry = createCoreGeometry();
  readonly discGeometry: BufferGeometry = createDiscGeometry(1.1, 4.4);
  readonly discInnerGeometry: BufferGeometry = createDiscGeometry(0.6, 2.6);
  readonly billboardGeometry: PlaneGeometry = createPlane("billboard", 1, false);
  readonly groundGeometry: PlaneGeometry = createPlane("ground", 1, true);
  readonly materials = {
    core: particleMaterial("core", this.textures.core, 0.96, false),
    fragment: particleMaterial("fragment", this.textures.fragment, 0.94, false),
    flash: particleMaterial("flash", this.textures.flash, 0.94, true),
    ring: particleMaterial("ring", this.textures.ring, 0.86, true),
    dust: particleMaterial("dust", this.textures.dust, 0.58, false),
    streak: particleMaterial("streak", this.textures.streak, 0.9, true),
  };
  readonly shardMaterials: MeshBasicMaterial[] = [0, 1, 2, 3].map(variant => emissiveMaterial(
    `shardMesh${variant}`,
    null,
    [0xffd7a0, 0xd8f2ff, 0xe6c6ff, 0xffe9b8][variant]!,
    0.94,
    false,
  ));
  readonly discMaterial: MeshBasicMaterial = emissiveMaterial("disc", null, 0xffd6a2, 0.82, true);
  readonly discInnerMaterial: MeshBasicMaterial = emissiveMaterial("discInner", null, 0xf2f8ff, 0.68, true);
  readonly coreMeshMaterial: MeshBasicMaterial = emissiveMaterial("coreMesh", null, 0xffe0b0, 0.98, false);

  dispose(): void {
    for (const geometry of this.shardGeometries) geometry.dispose();
    this.coreGeometry.dispose();
    this.discGeometry.dispose();
    this.discInnerGeometry.dispose();
    this.billboardGeometry.dispose();
    this.groundGeometry.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    for (const material of this.shardMaterials) material.dispose();
    this.discMaterial.dispose();
    this.discInnerMaterial.dispose();
    this.coreMeshMaterial.dispose();
    this.textures.dispose();
  }
}

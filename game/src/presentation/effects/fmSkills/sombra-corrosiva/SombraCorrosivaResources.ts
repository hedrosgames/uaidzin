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
import { SombraCorrosivaTextures } from "./SombraCorrosivaTextures";

type Point = readonly [x: number, y: number, z: number];

const TEAR_SIDES = 12;
const TEAR_RINGS = 14;
const TEAR_HEIGHT = 0.52;
const TEAR_RADIUS = 0.15;
const EYE_SEGMENTS = 34;
const THREAD_SEGMENTS = 16;
const THREAD_SIDES = 5;

const TEAR_DEEP = new Color(0x0e0816);
const TEAR_MID = new Color(0x4a2a63);
const TEAR_RIM = new Color(0xa86fb8);
const EYE_VOID = new Color(0x120a1e);
const EYE_RIM = new Color(0xc084c8);
const THREAD_DARK = new Color(0x1a0f28);
const THREAD_RIM = new Color(0x8a5fae);

function wobble(seed: number, spread: number): number {
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

function finish(
  name: string,
  positions: number[],
  uvs: number[],
  colors: number[],
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.name = `SombraCorrosiva.${name}`;
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function tearRadius(t: number): number {
  const belly = Math.pow(Math.sin(Math.PI * Math.min(0.999, Math.pow(t, 0.62) * 0.92 + 0.06)), 0.72);
  const tip = Math.pow(Math.max(0, 1 - t), 0.34);
  return TEAR_RADIUS * belly * tip * 1.12;
}

function createTearGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (ringIndex: number, side: number) => {
    const t = ringIndex / TEAR_RINGS;
    const angle = side / TEAR_SIDES * Math.PI * 2;
    const ripple = 1 + wobble(side * 3.7 + ringIndex * 1.9, 0.18);
    const radius = tearRadius(t) * ripple;
    const point: Point = [
      Math.cos(angle) * radius,
      (t - 0.34) * TEAR_HEIGHT,
      Math.sin(angle) * radius * 0.86,
    ];
    const edge = Math.abs(Math.cos(angle)) * 0.5 + 0.5;
    const color = TEAR_DEEP.clone().lerp(TEAR_MID, Math.pow(1 - Math.abs(t - 0.4) * 1.4, 1.6) * 0.7);
    return { point, color: color.lerp(TEAR_RIM, Math.pow(edge, 3) * 0.55), t };
  };
  for (let ringIndex = 0; ringIndex < TEAR_RINGS; ringIndex += 1) {
    for (let side = 0; side < TEAR_SIDES; side += 1) {
      const next = (side + 1) % TEAR_SIDES;
      const a = ring(ringIndex, side);
      const b = ring(ringIndex, next);
      const c = ring(ringIndex + 1, side);
      const d = ring(ringIndex + 1, next);
      const v0 = a.t;
      const v1 = c.t;
      const u0 = side / TEAR_SIDES;
      const u1 = next / TEAR_SIDES;
      pushVertex(positions, uvs, colors, a.point, u0, v0, a.color);
      pushVertex(positions, uvs, colors, c.point, u0, v1, c.color);
      pushVertex(positions, uvs, colors, b.point, u1, v0, b.color);
      pushVertex(positions, uvs, colors, b.point, u1, v0, b.color);
      pushVertex(positions, uvs, colors, c.point, u0, v1, c.color);
      pushVertex(positions, uvs, colors, d.point, u1, v1, d.color);
    }
  }
  const tip: Point = [0, TEAR_HEIGHT * 0.66, 0];
  const top = ring(TEAR_RINGS, 0);
  for (let side = 0; side < TEAR_SIDES; side += 1) {
    const next = (side + 1) % TEAR_SIDES;
    const a = ring(TEAR_RINGS, side);
    const b = ring(TEAR_RINGS, next);
    pushVertex(positions, uvs, colors, a.point, side / TEAR_SIDES, 1, a.color);
    pushVertex(positions, uvs, colors, tip, 0.5, 1, TEAR_RIM);
    pushVertex(positions, uvs, colors, b.point, next / TEAR_SIDES, 1, b.color);
  }
  void top;
  const base: Point = [0, -TEAR_HEIGHT * 0.34, 0];
  for (let side = 0; side < TEAR_SIDES; side += 1) {
    const next = (side + 1) % TEAR_SIDES;
    const a = ring(0, next);
    const b = ring(0, side);
    pushVertex(positions, uvs, colors, base, 0.5, 0, TEAR_DEEP);
    pushVertex(positions, uvs, colors, a.point, next / TEAR_SIDES, 0, a.color);
    pushVertex(positions, uvs, colors, b.point, side / TEAR_SIDES, 0, b.color);
  }
  return finish("tear", positions, uvs, colors);
}

function eyeHalfWidth(t: number): number {
  const angle = Math.PI * (t - 0.5);
  return Math.pow(Math.cos(angle), 0.72);
}

function createEyeGeometry(band: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const loop = (t: number, side: number) => {
    const width = eyeHalfWidth(t);
    const height = width * 0.42;
    const angle = side / 6 * Math.PI * 2;
    const point: Point = [
      (t - 0.5) * 1.5,
      Math.sin(Math.PI * (t - 0.5)) * 0.24 + Math.sin(angle) * band * 0.5,
      Math.cos(angle) * band * 0.5,
    ];
    const glow = Math.pow(width, 1.4);
    const color = EYE_VOID.clone().lerp(EYE_RIM, glow * 0.85);
    return { point, color, height };
  };
  for (let segment = 0; segment < EYE_SEGMENTS; segment += 1) {
    for (let side = 0; side < 6; side += 1) {
      const next = (side + 1) % 6;
      const a = loop(segment / EYE_SEGMENTS, side);
      const b = loop(segment / EYE_SEGMENTS, next);
      const c = loop((segment + 1) / EYE_SEGMENTS, side);
      const d = loop((segment + 1) / EYE_SEGMENTS, next);
      const u0 = segment / EYE_SEGMENTS;
      const u1 = (segment + 1) / EYE_SEGMENTS;
      const v0 = side / 6;
      const v1 = next / 6;
      pushVertex(positions, uvs, colors, a.point, u0, v0, a.color);
      pushVertex(positions, uvs, colors, c.point, u1, v0, c.color);
      pushVertex(positions, uvs, colors, b.point, u0, v1, b.color);
      pushVertex(positions, uvs, colors, b.point, u0, v1, b.color);
      pushVertex(positions, uvs, colors, c.point, u1, v0, c.color);
      pushVertex(positions, uvs, colors, d.point, u1, v1, d.color);
    }
  }
  return finish(band > 0.1 ? "eyeLid" : "eyeVoid", positions, uvs, colors);
}

function createThreadGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const spine = (t: number): Point => {
    const sag = Math.pow(t, 1.6);
    const drift = Math.sin(t * 5.2) * 0.22 * t;
    return [drift, -sag * 1.5, Math.sin(t * 8.4) * 0.12 * t];
  };
  for (let segment = 0; segment < THREAD_SEGMENTS; segment += 1) {
    const t0 = segment / THREAD_SEGMENTS;
    const t1 = (segment + 1) / THREAD_SEGMENTS;
    const width0 = 0.05 * (1 - t0) + 0.008;
    const width1 = 0.05 * (1 - t1) + 0.008;
    const a = spine(t0);
    const b = spine(t1);
    const hot0 = THREAD_RIM.clone().lerp(THREAD_DARK, Math.pow(t0, 0.6));
    const hot1 = THREAD_RIM.clone().lerp(THREAD_DARK, Math.pow(t1, 0.6));
    for (let side = 0; side < THREAD_SIDES; side += 1) {
      const angle0 = side / THREAD_SIDES * Math.PI * 2;
      const angle1 = (side + 1) / THREAD_SIDES * Math.PI * 2;
      const ring = (point: Point, angle: number, width: number): Point => [
        point[0] + Math.cos(angle) * width,
        point[1],
        point[2] + Math.sin(angle) * width,
      ];
      const a0 = ring(a, angle0, width0);
      const a1 = ring(a, angle1, width0);
      const b0 = ring(b, angle0, width1);
      const b1 = ring(b, angle1, width1);
      pushVertex(positions, uvs, colors, a0, angle0 / (Math.PI * 2), t0, hot0);
      pushVertex(positions, uvs, colors, b0, angle0 / (Math.PI * 2), t1, hot1);
      pushVertex(positions, uvs, colors, a1, angle1 / (Math.PI * 2), t0, hot0);
      pushVertex(positions, uvs, colors, a1, angle1 / (Math.PI * 2), t0, hot0);
      pushVertex(positions, uvs, colors, b0, angle0 / (Math.PI * 2), t1, hot1);
      pushVertex(positions, uvs, colors, b1, angle1 / (Math.PI * 2), t1, hot1);
    }
  }
  const bead = spine(1);
  const tip: Point = [bead[0], bead[1] - 0.09, bead[2]];
  for (let side = 0; side < THREAD_SIDES; side += 1) {
    const angle0 = side / THREAD_SIDES * Math.PI * 2;
    const angle1 = (side + 1) / THREAD_SIDES * Math.PI * 2;
    const width = 0.035;
    const a0: Point = [bead[0] + Math.cos(angle0) * width, bead[1], bead[2] + Math.sin(angle0) * width];
    const a1: Point = [bead[0] + Math.cos(angle1) * width, bead[1], bead[2] + Math.sin(angle1) * width];
    pushVertex(positions, uvs, colors, a0, angle0 / (Math.PI * 2), 1, THREAD_DARK);
    pushVertex(positions, uvs, colors, tip, 0.5, 1, THREAD_RIM);
    pushVertex(positions, uvs, colors, a1, angle1 / (Math.PI * 2), 1, THREAD_DARK);
  }
  return finish("thread", positions, uvs, colors);
}

function createPlane(name: string, width: number, height: number, horizontal: boolean): PlaneGeometry {
  const geometry = new PlaneGeometry(width, height);
  geometry.name = `SombraCorrosiva.${name}`;
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
    name: `SombraCorrosiva.${name}`,
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

function bodyMaterial(
  name: string,
  map: CanvasTexture | null,
  color: number,
  opacity: number,
  additive: boolean,
): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    name: `SombraCorrosiva.${name}`,
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

export class SombraCorrosivaResources {
  readonly textures: SombraCorrosivaTextures = new SombraCorrosivaTextures();
  readonly tearGeometry: BufferGeometry = createTearGeometry();
  readonly eyeLidGeometry: BufferGeometry = createEyeGeometry(0.05);
  readonly eyeVoidGeometry: BufferGeometry = createEyeGeometry(0.012);
  readonly threadGeometry: BufferGeometry = createThreadGeometry();
  readonly billboardGeometry: PlaneGeometry = createPlane("billboard", 1, 1, false);
  readonly groundGeometry: PlaneGeometry = createPlane("ground", 1, 1, true);
  readonly materials = {
    body: particleMaterial("body", this.textures.voidBody, 0.94, false),
    trail: particleMaterial("trail", this.textures.voidBody, 0.82, false),
    haze: particleMaterial("haze", this.textures.haze, 0.6, false),
    flash: particleMaterial("flash", this.textures.flash, 0.9, true),
    streak: particleMaterial("streak", this.textures.streak, 0.9, true),
    iris: particleMaterial("iris", this.textures.iris, 0.9, false),
  };
  readonly tearMaterial: MeshBasicMaterial = bodyMaterial("tear", null, 0xffffff, 0.96, false);
  readonly eyeLidMaterial: MeshBasicMaterial = bodyMaterial("eyeLid", null, 0xffffff, 0.9, true);
  readonly eyeVoidMaterial: MeshBasicMaterial = bodyMaterial("eyeVoid", null, 0xffffff, 0.92, false);
  readonly threadMaterial: MeshBasicMaterial = bodyMaterial("thread", null, 0xffffff, 0.85, false);

  dispose(): void {
    this.tearGeometry.dispose();
    this.eyeLidGeometry.dispose();
    this.eyeVoidGeometry.dispose();
    this.threadGeometry.dispose();
    this.billboardGeometry.dispose();
    this.groundGeometry.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    this.tearMaterial.dispose();
    this.eyeLidMaterial.dispose();
    this.eyeVoidMaterial.dispose();
    this.threadMaterial.dispose();
    this.textures.dispose();
  }
}

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  type CanvasTexture,
} from "three";
import { TempestadeBrasaTextures } from "./TempestadeBrasaTextures";

type Point = readonly [x: number, y: number, z: number];

const COAL_SIDES = 9;
const COAL_RINGS = 5;
const RIM_SEGMENTS = 26;
const RIM_SIDES = 7;
const CRACK_SEGMENTS = 9;

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

function finish(
  name: string,
  positions: number[],
  uvs: number[],
  colors: number[],
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.name = `TempestadeBrasa.${name}`;
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

const COAL_CORE = new Color(0xffffff);
const COAL_EDGE = new Color(0x8a4520);
const RIM_CORE = new Color(0xffe9b8);
const RIM_EDGE = new Color(0xd8561c);
const CRACK_HOT = new Color(0xffd489);
const CRACK_COLD = new Color(0x7a2a12);

function createCoalGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (ringIndex: number, side: number): { point: Point; color: Color } => {
    const v = ringIndex / COAL_RINGS;
    const angle = side / COAL_SIDES * Math.PI * 2;
    const taper = Math.pow(Math.sin(Math.PI * Math.min(0.98, v * 0.94 + 0.05)), 0.5);
    const radius = 0.5 * taper * (0.78 + jitter(ringIndex * 7.1 + side * 3.3, 0.42));
    const height = v * 0.86 - 0.4;
    return {
      point: [
        Math.cos(angle) * radius,
        height + jitter(side * 2.7 + ringIndex * 5.9, 0.12),
        Math.sin(angle) * radius,
      ],
      color: COAL_EDGE.clone().lerp(COAL_CORE, Math.pow(1 - Math.abs(v - 0.35) * 1.5, 2) * 0.9 + 0.1),
    };
  };
  for (let ringIndex = 0; ringIndex < COAL_RINGS; ringIndex += 1) {
    for (let side = 0; side < COAL_SIDES; side += 1) {
      const next = (side + 1) % COAL_SIDES;
      const a = ring(ringIndex, side);
      const b = ring(ringIndex, next);
      const c = ring(ringIndex + 1, side);
      const d = ring(ringIndex + 1, next);
      const va = ringIndex / COAL_RINGS;
      const vb = (ringIndex + 1) / COAL_RINGS;
      const ua = side / COAL_SIDES;
      const ub = next / COAL_SIDES;
      pushTriangle(positions, uvs, colors, a.point, c.point, b.point, [ua, va], [ua, vb], [ub, va], a.color, c.color, b.color);
      pushTriangle(positions, uvs, colors, b.point, c.point, d.point, [ub, va], [ua, vb], [ub, vb], b.color, c.color, d.color);
    }
  }
  const top = ring(COAL_RINGS, 0);
  const tip: Point = [top.point[0] * 0.4, 0.56, top.point[2] * 0.4];
  for (let side = 0; side < COAL_SIDES; side += 1) {
    const next = (side + 1) % COAL_SIDES;
    const a = ring(COAL_RINGS, side);
    const b = ring(COAL_RINGS, next);
    pushTriangle(positions, uvs, colors, a.point, tip, b.point, [side / COAL_SIDES, 1], [0.5, 1], [next / COAL_SIDES, 1], a.color, COAL_CORE, b.color);
  }
  const base: Point = [0, -0.5, 0];
  for (let side = 0; side < COAL_SIDES; side += 1) {
    const next = (side + 1) % COAL_SIDES;
    const a = ring(0, next);
    const b = ring(0, side);
    pushTriangle(positions, uvs, colors, base, a.point, b.point, [0.5, 0], [next / COAL_SIDES, 0], [side / COAL_SIDES, 0], COAL_EDGE, a.color, b.color);
  }
  return finish("coal", positions, uvs, colors);
}

function createRimArcGeometry(radius: number, span: number, thickness: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const ring = (segment: number, side: number): { point: Point; color: Color } => {
    const t = segment / RIM_SEGMENTS;
    const angle = -span * 0.5 + span * t;
    const cross = side / RIM_SIDES * Math.PI * 2;
    const taper = Math.pow(Math.sin(Math.PI * Math.min(0.999, t + 0.001)), 0.42);
    const local = thickness * taper * (0.6 + Math.sin(cross) * 0.4);
    const lift = thickness * 0.55 + Math.sin(cross) * thickness * 0.5;
    const wobble = 1 + Math.sin(t * 7.4) * 0.035;
    const radial = radius * wobble + Math.cos(cross) * local;
    const glow = Math.pow(taper, 1.6);
    return {
      point: [
        Math.cos(angle) * radial,
        Math.max(0.03, lift * taper),
        Math.sin(angle) * radial,
      ],
      color: RIM_EDGE.clone().lerp(RIM_CORE, glow),
    };
  };
  for (let segment = 0; segment < RIM_SEGMENTS; segment += 1) {
    for (let side = 0; side < RIM_SIDES; side += 1) {
      const next = (side + 1) % RIM_SIDES;
      const a = ring(segment, side);
      const b = ring(segment, next);
      const c = ring(segment + 1, side);
      const d = ring(segment + 1, next);
      const u0 = segment / RIM_SEGMENTS;
      const u1 = (segment + 1) / RIM_SEGMENTS;
      const v0 = side / RIM_SIDES;
      const v1 = next / RIM_SIDES;
      pushTriangle(positions, uvs, colors, a.point, c.point, b.point, [u0, v0], [u1, v0], [u0, v1], a.color, c.color, b.color);
      pushTriangle(positions, uvs, colors, b.point, c.point, d.point, [u0, v1], [u1, v0], [u1, v1], b.color, c.color, d.color);
    }
  }
  return finish("rimArc", positions, uvs, colors);
}

function createCrackGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const spine = (t: number): Point => {
    const wobble = Math.sin(t * 9.1) * 0.16 + Math.sin(t * 21.7) * 0.06;
    return [t, 0.012 + t * 0.05, wobble * (0.2 + t)];
  };
  for (let segment = 0; segment < CRACK_SEGMENTS; segment += 1) {
    const t0 = segment / CRACK_SEGMENTS;
    const t1 = (segment + 1) / CRACK_SEGMENTS;
    const width0 = 0.075 * Math.pow(1 - t0, 0.7) + 0.004;
    const width1 = 0.075 * Math.pow(1 - t1, 0.7) + 0.004;
    const a = spine(t0);
    const b = spine(t1);
    const left0: Point = [a[0], a[1], a[2] - width0];
    const right0: Point = [a[0], a[1], a[2] + width0];
    const left1: Point = [b[0], b[1], b[2] - width1];
    const right1: Point = [b[0], b[1], b[2] + width1];
    const hot0 = CRACK_HOT.clone().lerp(CRACK_COLD, Math.pow(t0, 0.7));
    const hot1 = CRACK_HOT.clone().lerp(CRACK_COLD, Math.pow(t1, 0.7));
    pushTriangle(positions, uvs, colors, left0, left1, right0, [0, t0], [0, t1], [1, t0], hot0, hot1, hot0);
    pushTriangle(positions, uvs, colors, right0, left1, right1, [1, t0], [0, t1], [1, t1], hot0, hot1, hot1);
  }
  return finish("crack", positions, uvs, colors);
}

function createPlane(name: string, size: number, horizontal: boolean): PlaneGeometry {
  const geometry = new PlaneGeometry(size, size);
  geometry.name = `TempestadeBrasa.${name}`;
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
    name: `TempestadeBrasa.${name}`,
    map,
    color: 0xffffff,
    transparent: true,
    opacity,
    alphaTest: 0.006,
    depthWrite: false,
    depthTest: true,
    side: additive ? DoubleSide : FrontSide,
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
    name: `TempestadeBrasa.${name}`,
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

export class TempestadeBrasaResources {
  readonly textures: TempestadeBrasaTextures = new TempestadeBrasaTextures();
  readonly coalGeometry: BufferGeometry = createCoalGeometry();
  readonly rimArcGeometry: BufferGeometry = createRimArcGeometry(3.6, 1.32, 0.11);
  readonly rimArcSmallGeometry: BufferGeometry = createRimArcGeometry(2.35, 1.9, 0.07);
  readonly crackGeometry: BufferGeometry = createCrackGeometry();
  readonly horizontalGeometry: PlaneGeometry = createPlane("horizontal", 1, true);
  readonly materials = {
    ember: particleMaterial("ember", this.textures.ember, 0.96, false),
    coalRain: particleMaterial("coalRain", this.textures.ember, 0.9, false),
    cinder: particleMaterial("cinder", this.textures.spark, 0.92, true),
    flash: particleMaterial("flash", this.textures.flash, 0.94, true),
    dust: particleMaterial("dust", this.textures.smoke, 0.62, false),
    ash: particleMaterial("ash", this.textures.smoke, 0.5, false),
    scorch: particleMaterial("scorch", this.textures.scorch, 0.72, false),
  };
  readonly coalMaterial: MeshBasicMaterial = emissiveMaterial("coal", null, 0xffb257, 0.98, false);
  readonly coalHotMaterial: MeshBasicMaterial = emissiveMaterial("coalHot", null, 0xffe6b0, 1, true);
  readonly rimMaterial: MeshBasicMaterial = emissiveMaterial("rim", null, 0xff9a3c, 0.92, true);
  readonly rimCoreMaterial: MeshBasicMaterial = emissiveMaterial("rimCore", null, 0xffe2a6, 0.86, true);
  readonly crackMaterial: MeshBasicMaterial = emissiveMaterial("crack", null, 0xffb265, 0.85, true);

  dispose(): void {
    this.coalGeometry.dispose();
    this.rimArcGeometry.dispose();
    this.rimArcSmallGeometry.dispose();
    this.crackGeometry.dispose();
    this.horizontalGeometry.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    this.coalMaterial.dispose();
    this.coalHotMaterial.dispose();
    this.rimMaterial.dispose();
    this.rimCoreMaterial.dispose();
    this.crackMaterial.dispose();
    this.textures.dispose();
  }
}

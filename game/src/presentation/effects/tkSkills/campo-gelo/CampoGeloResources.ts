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
import { CampoGeloTextures } from "./CampoGeloTextures";

type Point = readonly [x: number, y: number, z: number];
type Vertex = { point: Point; u: number; v: number; color: Color };
type GeometryData = { positions: number[]; uv: number[]; colors: number[] };

const CRYSTAL_BASE: readonly Point[] = [
  [0.095, 0, 0.009],
  [0.032, 0, 0.103],
  [-0.083, 0, 0.069],
  [-0.102, 0, -0.046],
  [0.029, 0, -0.096],
];
const CRYSTAL_SHOULDER: readonly Point[] = [
  [0.136, 0.43, 0.013],
  [0.041, 0.35, 0.124],
  [-0.093, 0.48, 0.08],
  [-0.117, 0.32, -0.064],
  [0.034, 0.39, -0.133],
];
const CRYSTAL_TIP: Point = [0.025, 1, -0.021];
const CRYSTAL_FACETS = [1, 0.78, 0.91, 0.68, 0.86] as const;
const RIM_BOUNDARIES = [0, 43, 91, 136, 177, 226, 271, 318, 360] as const;
const RIM_GAPS = [5, 7, 4, 6, 5, 8, 4, 6] as const;
const RIM_FACETS = [0.48, 0.82, 1, 0.64] as const;

function triangle(data: GeometryData, a: Vertex, b: Vertex, c: Vertex): void {
  for (const { point, u, v, color } of [a, b, c]) {
    data.positions.push(...point);
    data.uv.push(u, v);
    data.colors.push(color.r, color.g, color.b);
  }
}

function finishGeometry(name: string, data: GeometryData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.name = `CampoGelo.${name}`;
  geometry.setAttribute("position", new Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(data.uv, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(data.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function crystalVertex(point: Point, facet: number): Vertex {
  const height = point[1];
  const color = new Color(0x38596f);
  const middle = new Color(0x62b8d4);
  const tip = new Color(0xe0f3f5);
  if (height < 0.43) color.lerp(middle, height / 0.43);
  else color.copy(middle).lerp(tip, (height - 0.43) / 0.57);
  color.multiplyScalar(facet + (1 - facet) * Math.pow(height, 3) * 0.8);
  return { point, u: 0.5 + point[0] / 0.28, v: height, color };
}

function crystalTriangle(
  data: GeometryData,
  a: Point,
  b: Point,
  c: Point,
  facet: number,
): void {
  triangle(data, crystalVertex(a, facet), crystalVertex(b, facet), crystalVertex(c, facet));
}

function createCrystalGeometry(): BufferGeometry {
  const data: GeometryData = { positions: [], uv: [], colors: [] };
  const baseCenter: Point = [0, 0, 0];
  for (let side = 0; side < CRYSTAL_BASE.length; side += 1) {
    const next = (side + 1) % CRYSTAL_BASE.length;
    const base = CRYSTAL_BASE[side];
    const baseNext = CRYSTAL_BASE[next];
    const shoulder = CRYSTAL_SHOULDER[side];
    const shoulderNext = CRYSTAL_SHOULDER[next];
    const facet = CRYSTAL_FACETS[side];
    crystalTriangle(data, baseCenter, base, baseNext, 0.54);
    crystalTriangle(data, base, shoulder, baseNext, facet * 0.9);
    crystalTriangle(data, baseNext, shoulder, shoulderNext, facet);
    crystalTriangle(data, shoulder, CRYSTAL_TIP, shoulderNext, facet);
  }
  return finishGeometry("crystal", data);
}

function rimVertex(sector: number, step: number, band: number): Vertex {
  const t = step / 8;
  const gap = RIM_GAPS[sector];
  const start = RIM_BOUNDARIES[sector] + gap * 0.5;
  const span = RIM_BOUNDARIES[sector + 1] - gap * 0.5 - start;
  const angle = (start + span * t) * Math.PI / 180;
  const envelope = Math.sin(t * Math.PI);
  const outer = 1 - (0.003 + 0.002 * Math.sin(sector * 1.7 + t * 5)) * envelope * envelope;
  const inner = 0.965 + 0.004 * Math.sin(sector * 2.1 + t * 7);
  const top = 0.043 + 0.012 * Math.sin(sector * 1.3 + t * 8) + 0.01 * Math.cos(t * 5 + sector);
  const radius = band === 0 || band === 3 ? inner : outer;
  const y = band < 2 ? 0.015 : band === 2 ? top : 0.015 + (top - 0.015) * 0.63;
  const color = new Color(0x589db7).lerp(new Color(0xdaeff2), band >= 2 ? 0.55 : 0.05);
  return {
    point: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
    u: t,
    v: band === 0 || band === 3 ? 0 : 1,
    color,
  };
}

function shade(vertex: Vertex, brightness: number): Vertex {
  return { ...vertex, color: vertex.color.clone().multiplyScalar(brightness) };
}

function createRimGeometry(): BufferGeometry {
  const data: GeometryData = { positions: [], uv: [], colors: [] };
  for (let sector = 0; sector < RIM_GAPS.length; sector += 1) {
    for (let band = 0; band < 4; band += 1) {
      const nextBand = (band + 1) % 4;
      const brightness = RIM_FACETS[band];
      for (let step = 0; step < 8; step += 1) {
        const a = shade(rimVertex(sector, step, band), brightness);
        const b = shade(rimVertex(sector, step + 1, band), brightness);
        const c = shade(rimVertex(sector, step, nextBand), brightness);
        const d = shade(rimVertex(sector, step + 1, nextBand), brightness);
        triangle(data, a, c, b);
        triangle(data, b, c, d);
      }
    }
    const start = [0, 1, 2, 3].map((band) => shade(rimVertex(sector, 0, band), 0.7));
    const end = [0, 1, 2, 3].map((band) => shade(rimVertex(sector, 8, band), 0.7));
    triangle(data, start[0], start[2], start[1]);
    triangle(data, start[0], start[3], start[2]);
    triangle(data, end[0], end[1], end[2]);
    triangle(data, end[0], end[2], end[3]);
  }
  return finishGeometry("rim", data);
}

function createGroundGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(2, 2);
  geometry.name = "CampoGelo.ground";
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function material(
  name: string,
  opacity: number,
  map: CanvasTexture | null = null,
  vertexColors = false,
  additive = false,
): MeshBasicMaterial {
  const result = new MeshBasicMaterial({
    name: `CampoGelo.${name}`,
    map,
    color: 0xffffff,
    transparent: true,
    opacity,
    blending: additive ? AdditiveBlending : NormalBlending,
    side: vertexColors ? FrontSide : DoubleSide,
    vertexColors,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.003,
    toneMapped: false,
  });
  result.forceSinglePass = true;
  return result;
}

export class CampoGeloResources {
  readonly textures: CampoGeloTextures = new CampoGeloTextures();
  readonly crystalGeometry: BufferGeometry = createCrystalGeometry();
  readonly rimGeometry: BufferGeometry = createRimGeometry();
  readonly groundGeometry: PlaneGeometry = createGroundGeometry();
  readonly materials: {
    crystal: MeshBasicMaterial;
    rim: MeshBasicMaterial;
    ground: MeshBasicMaterial;
    vapor: MeshBasicMaterial;
    flake: MeshBasicMaterial;
    flash: MeshBasicMaterial;
  } = {
    crystal: material("crystal", 0.76, null, true),
    rim: material("rim", 0.66, null, true),
    ground: material("ground", 0.42, this.textures.frost),
    vapor: material("vapor", 0.44, this.textures.vapor),
    flake: material("flake", 0.7, this.textures.flake),
    flash: material("flash", 0.62, this.textures.flash, false, true),
  };

  dispose(): void {
    this.crystalGeometry.dispose();
    this.rimGeometry.dispose();
    this.groundGeometry.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    this.textures.dispose();
  }
}

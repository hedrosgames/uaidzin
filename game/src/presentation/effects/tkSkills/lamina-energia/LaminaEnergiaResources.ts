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
import { LaminaEnergiaTextures } from "./LaminaEnergiaTextures";

type Vertex = readonly [x: number, y: number, z: number, u: number, v: number];
type CrossSection = readonly [depth: number, height: number];
type GeometryData = { positions: number[]; uv: number[]; colors: number[] };

const BLADE_SECTION: readonly CrossSection[] = [
  [0, 0],
  [0.36, 1],
  [1, 0.1],
  [0.46, -0.78],
];
const BLADE_FACETS = [0xffffff, 0xece0c8, 0xcdb992, 0xf6e9ce] as const;
const TEXEL_INSET = 2.5 / 256;
const TEXEL_RANGE = 1 - TEXEL_INSET * 2;

function triangle(data: GeometryData, a: Vertex, b: Vertex, c: Vertex, color: Color): void {
  for (const vertex of [a, b, c]) {
    data.positions.push(vertex[0], vertex[1], vertex[2]);
    data.uv.push(TEXEL_INSET + vertex[3] * TEXEL_RANGE, TEXEL_INSET + vertex[4] * TEXEL_RANGE);
    data.colors.push(color.r, color.g, color.b);
  }
}

function finishGeometry(name: string, data: GeometryData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.name = `LaminaEnergia.${name}`;
  geometry.setAttribute("position", new Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(data.uv, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(data.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function bladeVertex(t: number, section: number): Vertex {
  const [depth, height] = BLADE_SECTION[section];
  const envelope = Math.pow(Math.max(0, 1 - t * t), 0.7);
  const centerY = Math.sin(t * Math.PI) * 0.014 + t * 0.012;
  const span = 0.215 * envelope * (1 + Math.sin(t * Math.PI * 2) * 0.07);
  return [
    t * 0.72,
    centerY + height * 0.085 * envelope + t * 0.008 * depth * envelope,
    -0.58 * t * t - span * depth,
    (t + 1) * 0.5,
    1 - depth,
  ];
}

function createBladeGeometry(): BufferGeometry {
  const data: GeometryData = { positions: [], uv: [], colors: [] };
  const segments = 24;
  const color = new Color();
  for (let band = 0; band < BLADE_SECTION.length; band += 1) {
    color.setHex(BLADE_FACETS[band]);
    const nextBand = (band + 1) % BLADE_SECTION.length;
    for (let step = 0; step < segments; step += 1) {
      const t0 = step / segments * 2 - 1;
      const t1 = (step + 1) / segments * 2 - 1;
      const a = bladeVertex(t0, band);
      const b = bladeVertex(t1, band);
      const c = bladeVertex(t0, nextBand);
      const d = bladeVertex(t1, nextBand);
      if (step > 0) triangle(data, a, b, c, color);
      if (step < segments - 1) triangle(data, b, d, c, color);
    }
  }
  return finishGeometry("blade", data);
}

function trailVertex(t: number, section: number): Vertex {
  const width = 0.12 * Math.pow(t, 0.7);
  const height = 0.026 * Math.sin(t * Math.PI * 0.5);
  const bend = 0.025 * Math.sin(t * Math.PI);
  const centerX = 0.016 * Math.sin(t * Math.PI);
  const cross: readonly Vertex[] = [
    [centerX - width, bend, t - 1, 0, t],
    [centerX, bend + height, t - 1, 0.5, t],
    [centerX + width, bend, t - 1, 1, t],
    [centerX, bend - height * 0.55, t - 1, 0.5, t],
  ];
  return cross[section];
}

function createTrailGeometry(): BufferGeometry {
  const data: GeometryData = { positions: [], uv: [], colors: [] };
  const segments = 10;
  const color = new Color();
  for (let band = 0; band < 4; band += 1) {
    color.setHex(band < 2 ? 0xffffff : 0xd9c9a8);
    const nextBand = (band + 1) % 4;
    for (let step = 0; step < segments; step += 1) {
      const a = trailVertex(step / segments, band);
      const b = trailVertex((step + 1) / segments, band);
      const c = trailVertex(step / segments, nextBand);
      const d = trailVertex((step + 1) / segments, nextBand);
      if (step > 0) triangle(data, a, b, c, color);
      triangle(data, b, d, c, color);
    }
  }
  color.setHex(0xf7ead0);
  triangle(data, trailVertex(1, 0), trailVertex(1, 2), trailVertex(1, 1), color);
  triangle(data, trailVertex(1, 0), trailVertex(1, 3), trailVertex(1, 2), color);
  return finishGeometry("trail", data);
}

function createStreakGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  geometry.name = "LaminaEnergia.streak";
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index += 1) {
    const u = uv.getX(index);
    uv.setXY(index, uv.getY(index), 1 - u);
  }
  return geometry;
}

function material(
  map: CanvasTexture,
  opacity: number,
  volumetric = false,
  additive = false,
): MeshBasicMaterial {
  const result = new MeshBasicMaterial({
    name: map.name,
    map,
    color: 0xffffff,
    transparent: true,
    opacity,
    blending: additive ? AdditiveBlending : NormalBlending,
    side: volumetric ? FrontSide : DoubleSide,
    vertexColors: volumetric,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.003,
    toneMapped: false,
  });
  result.forceSinglePass = true;
  return result;
}

export class LaminaEnergiaResources {
  readonly textures: LaminaEnergiaTextures = new LaminaEnergiaTextures();
  readonly bladeGeometry: BufferGeometry = createBladeGeometry();
  readonly trailGeometry: BufferGeometry = createTrailGeometry();
  readonly streakGeometry: PlaneGeometry = createStreakGeometry();
  readonly materials = {
    blade: material(this.textures.blade, 0.96, true),
    trail: material(this.textures.trail, 0.48, true),
    release: material(this.textures.release, 0.72),
    spark: material(this.textures.spark, 0.58, false, true),
    impact: material(this.textures.impact, 0.7, false, true),
    residual: material(this.textures.residual, 0.5),
  };

  dispose(): void {
    this.bladeGeometry.dispose();
    this.trailGeometry.dispose();
    this.streakGeometry.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    this.textures.dispose();
  }
}

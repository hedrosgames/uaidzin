import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  PlaneGeometry,
  SphereGeometry,
  type CanvasTexture,
} from "three";
import { PicadaPeconhentaTextures } from "./PicadaPeconhentaTextures";

type Point = readonly [x: number, y: number, z: number];
type Vertex = { point: Point; u: number; v: number; color: Color };
type GeometryData = { positions: number[]; uv: number[]; colors: number[] };

const STINGER_LENGTH = 0.72;
const STINGER_SIDES = 8;
const STINGER_SEGMENTS = 12;
const STINGER_RADIUS = 0.095;
const BARB_ANGLES = [0.42, 2.51, 4.6] as const;
const BARB_SPANS = [0.5, 0.6, 0.7] as const;
const BARB_REACH = 2.7;
const BARB_LENGTH = 0.14;
const BASE_COLOR = new Color(0x286542);
const MID_COLOR = new Color(0x65c879);
const TIP_COLOR = new Color(0xc4ef8a);

function stingerRadius(t: number): number {
  const body = Math.pow(Math.max(0, 1 - t), 0.62);
  const bulge = 1 + 0.34 * Math.sin(Math.PI * Math.pow(t, 0.82));
  return STINGER_RADIUS * body * bulge;
}

function stingerColor(t: number, angle: number): Color {
  const color = t < 0.62
    ? BASE_COLOR.clone().lerp(MID_COLOR, t / 0.62)
    : MID_COLOR.clone().lerp(TIP_COLOR, (t - 0.62) / 0.38);
  const facing = Math.cos(angle - Math.PI * 0.78) * 0.5 + 0.5;
  return color.multiplyScalar(0.7 + facing * 0.55);
}

function ringVertex(t: number, angle: number, radiusScale: number): Vertex {
  const radius = stingerRadius(t) * radiusScale;
  return {
    point: [Math.cos(angle) * radius, Math.sin(angle) * radius, t * STINGER_LENGTH],
    u: angle / (Math.PI * 2),
    v: t,
    color: stingerColor(t, angle),
  };
}

function triangle(data: GeometryData, a: Vertex, b: Vertex, c: Vertex): void {
  for (const vertex of [a, b, c]) {
    data.positions.push(vertex.point[0], vertex.point[1], vertex.point[2]);
    data.uv.push(vertex.u, vertex.v);
    data.colors.push(vertex.color.r, vertex.color.g, vertex.color.b);
  }
}

function quad(data: GeometryData, a: Vertex, b: Vertex, c: Vertex, d: Vertex): void {
  triangle(data, a, b, c);
  triangle(data, b, d, c);
}

function finishGeometry(name: string, data: GeometryData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.name = `PicadaPeconhenta.${name}`;
  geometry.setAttribute("position", new Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(data.uv, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(data.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createStingerGeometry(): BufferGeometry {
  const data: GeometryData = { positions: [], uv: [], colors: [] };
  const step = Math.PI * 2 / STINGER_SIDES;
  for (let segment = 0; segment < STINGER_SEGMENTS; segment += 1) {
    const t0 = segment / STINGER_SEGMENTS;
    const t1 = (segment + 1) / STINGER_SEGMENTS;
    for (let side = 0; side < STINGER_SIDES; side += 1) {
      const angle0 = side * step;
      const angle1 = (side + 1) * step;
      quad(
        data,
        ringVertex(t0, angle0, 1),
        ringVertex(t1, angle0, 1),
        ringVertex(t0, angle1, 1),
        ringVertex(t1, angle1, 1),
      );
    }
  }
  const baseCenter: Vertex = { point: [0, 0, 0], u: 0.5, v: 0, color: BASE_COLOR.clone().multiplyScalar(0.5) };
  for (let side = 0; side < STINGER_SIDES; side += 1) {
    const angle0 = side * step;
    const angle1 = (side + 1) * step;
    triangle(data, baseCenter, ringVertex(0, angle1, 1), ringVertex(0, angle0, 1));
  }
  for (let index = 0; index < BARB_ANGLES.length; index += 1) {
    const angle = BARB_ANGLES[index]!;
    const span = BARB_SPANS[index]!;
    const root = ringVertex(span, angle, 1);
    const back = ringVertex(span - BARB_LENGTH, angle, 1);
    const tip = ringVertex(span - BARB_LENGTH * 0.45, angle, BARB_REACH);
    const lean = ringVertex(span + BARB_LENGTH * 0.25, angle, 1.16);
    triangle(data, root, tip, back);
    triangle(data, back, tip, root);
    triangle(data, root, lean, tip);
    triangle(data, tip, lean, root);
  }
  return finishGeometry("stinger", data);
}

function createGooGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  geometry.name = "PicadaPeconhenta.goo";
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createDecalGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  geometry.name = "PicadaPeconhenta.decal";
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createBeadGeometry(): SphereGeometry {
  const geometry = new SphereGeometry(1, 14, 10);
  geometry.name = "PicadaPeconhenta.bead";
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
    name: `PicadaPeconhenta.${name}`,
    map,
    color: 0xffffff,
    transparent: true,
    opacity,
    alphaTest: 0.008,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: additive ? AdditiveBlending : NormalBlending,
    toneMapped: false,
  });
  material.forceSinglePass = true;
  return material;
}

function decalMaterial(map: CanvasTexture, opacity: number): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    name: "PicadaPeconhenta.decal",
    map,
    color: 0xbdf58f,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: NormalBlending,
    toneMapped: false,
  });
  material.forceSinglePass = true;
  return material;
}

export class PicadaPeconhentaResources {
  readonly textures: PicadaPeconhentaTextures = new PicadaPeconhentaTextures();
  readonly stingerGeometry: BufferGeometry = createStingerGeometry();
  readonly gooGeometry: PlaneGeometry = createGooGeometry();
  readonly decalGeometry: PlaneGeometry = createDecalGeometry();
  readonly beadGeometry: SphereGeometry = createBeadGeometry();
  readonly stingerMaterial: MeshStandardMaterial = new MeshStandardMaterial({
    name: "PicadaPeconhenta.stinger",
    map: this.textures.chitin,
    color: 0xc0f2a2,
    emissive: 0x3d9a4c,
    emissiveIntensity: 0.36,
    roughness: 0.2,
    metalness: 0.04,
    vertexColors: true,
    flatShading: true,
  });
  readonly materials = {
    goo: particleMaterial("goo", this.textures.goo, 0.96, false),
    trail: particleMaterial("trail", this.textures.goo, 0.82, false),
    bubble: particleMaterial("bubble", this.textures.bubble, 0.86, false),
    splash: particleMaterial("splash", this.textures.splash, 0.68, false),
    droplet: particleMaterial("droplet", this.textures.bubble, 0.92, false),
    decal: decalMaterial(this.textures.drip, 0.84),
    bead: particleMaterial("bead", this.textures.bubble, 0.92, false),
  };

  dispose(): void {
    this.stingerGeometry.dispose();
    this.gooGeometry.dispose();
    this.decalGeometry.dispose();
    this.beadGeometry.dispose();
    this.stingerMaterial.dispose();
    for (const shared of Object.values(this.materials)) shared.dispose();
    this.textures.dispose();
  }
}

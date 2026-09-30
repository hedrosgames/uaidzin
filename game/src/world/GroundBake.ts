import { CanvasTexture, type Texture } from "three";
import { CITY_GARDEN_BEDS } from "./CityLandscape";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";

const MASK_SIZE = 256;

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise(x: number, y: number): number {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  const fx = x - cx;
  const fy = y - cy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(cx, cy);
  const b = hash(cx + 1, cy);
  const c = hash(cx, cy + 1);
  const d = hash(cx + 1, cy + 1);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}

function fbm(x: number, y: number): number {
  return noise(x, y) * 0.57 + noise(x * 2.03 + 7.1, y * 2.03 + 7.1) * 0.28 + noise(x * 4.07 + 19.3, y * 4.07 + 19.3) * 0.15;
}

function garden(x: number, z: number): number {
  let distance = 10;
  for (const bed of CITY_GARDEN_BEDS) {
    const dx = (x - bed[0]) / bed[2];
    const dz = (z - bed[1]) / bed[3];
    distance = Math.min(distance, Math.hypot(dx, dz));
  }
  const wobble = distance + (fbm(x * 1.4, z * 1.4) - 0.5) * 0.55;
  const t = Math.min(1, Math.max(0, (wobble - 0.5) / 1.15));
  const s = t * t * (3 - 2 * t);
  return 1 - s;
}

function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function bakeCityGardenMask(halfSize: number, plazaRadius: number): Texture | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = MASK_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const pixels = ctx.createImageData(MASK_SIZE, MASK_SIZE);
  const span = halfSize * 2;
  for (let py = 0; py < MASK_SIZE; py++) {
    for (let px = 0; px < MASK_SIZE; px++) {
      const x = (px / (MASK_SIZE - 1) - 0.5) * span;
      const z = (py / (MASK_SIZE - 1) - 0.5) * span;
      const bed = garden(x, z);
      const edge = smooth(halfSize - 3.4, halfSize - 0.8, Math.max(Math.abs(x), Math.abs(z)));
      const plazaClear = smooth(plazaRadius + 0.3, plazaRadius + 1.8, Math.hypot(x, z));
      const brush = Math.floor(fbm(x * 1.8, z * 1.8) * 5) / 4;
      const i = (py * MASK_SIZE + px) * 4;
      pixels.data[i] = Math.round(bed * plazaClear * 255);
      pixels.data[i + 1] = Math.round(Math.max(bed, edge * 0.6) * plazaClear * 255);
      pixels.data[i + 2] = Math.round(brush * 255);
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  stampAnisotropy(texture);
  return texture;
}

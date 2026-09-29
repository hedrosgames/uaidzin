import { CanvasTexture, SRGBColorSpace, type Texture } from "three";
import { CITY_GARDEN_BEDS } from "./CityLandscape";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";

const BAKE = 1024;

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

function sample(data: ImageData, u: number, v: number): [number, number, number] {
  const w = data.width;
  const h = data.height;
  const x = ((Math.floor(((u % 1) + 1) % 1 * w) % w) + w) % w;
  const y = ((Math.floor(((v % 1) + 1) % 1 * h) % h) + h) % h;
  const i = (y * w + x) * 4;
  return [data.data[i] ?? 0, data.data[i + 1] ?? 0, data.data[i + 2] ?? 0];
}

function readImage(image: CanvasImageSource & { width: number; height: number }): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || image.width < 1 || image.height < 1) return null;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height);
}

export function bakeCityFloor(image: CanvasImageSource & { width: number; height: number }, halfSize: number, plazaRadius: number): Texture | null {
  const source = readImage(image);
  if (!source) return null;
  const canvas = document.createElement("canvas");
  canvas.width = BAKE;
  canvas.height = BAKE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const pixels = ctx.createImageData(BAKE, BAKE);
  const span = halfSize * 2;
  const tile = 4.8;
  for (let py = 0; py < BAKE; py++) {
    for (let px = 0; px < BAKE; px++) {
      const u = px / (BAKE - 1);
      const v = py / (BAKE - 1);
      const x = (u - 0.5) * span;
      const z = (0.5 - v) * span;
      const granite = sample(source, x / tile + 0.5, z / tile + 0.5);
      let r = granite[0] / 255;
      let g = granite[1] / 255;
      let b = granite[2] / 255;
      const bed = garden(x, z);
      const edge = smooth(halfSize - 3.4, halfSize - 0.8, Math.max(Math.abs(x), Math.abs(z)));
      const grain = fbm(x * 19, z * 19);
      const broad = fbm(x * 0.42, z * 0.42);
      let soil = Math.max(bed * 0.42, edge * 0.28);
      soil *= smooth(plazaRadius + 0.3, plazaRadius + 1.8, Math.hypot(x, z));
      const earthR = 0.34 + (0.46 - 0.34) * grain;
      const earthG = 0.26 + (0.36 - 0.26) * grain;
      const earthB = 0.14 + (0.2 - 0.14) * grain;
      const mossMix = bed * smooth(0.48, 0.72, fbm(x * 3.2, z * 3.2)) * 0.45;
      const mossR = 0.28 + (0.38 - 0.28) * grain;
      const mossG = 0.34 + (0.46 - 0.34) * grain;
      const mossB = 0.16 + (0.22 - 0.16) * grain;
      const er = earthR + (mossR - earthR) * mossMix;
      const eg = earthG + (mossG - earthG) * mossMix;
      const eb = earthB + (mossB - earthB) * mossMix;
      const tone = r * 0.2126 + g * 0.7152 + b * 0.0722;
      r = r + (tone * 0.96 - r) * 0.38;
      g = g + (tone * 0.99 - g) * 0.38;
      b = b + (tone * 1.02 - b) * 0.38;
      r = r + (0.18 - r) * 0.12;
      g = g + (0.17 - g) * 0.12;
      b = b + (0.145 - b) * 0.12;
      const shade = 0.83 + (1.04 - 0.83) * broad;
      r *= shade;
      g *= shade;
      b *= shade;
      r = r + (er - r) * soil;
      g = g + (eg - g) * soil;
      b = b + (eb - b) * soil;
      const i = (py * BAKE + px) * 4;
      pixels.data[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
      pixels.data[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
      pixels.data[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  stampAnisotropy(texture);
  return texture;
}

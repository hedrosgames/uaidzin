import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  SRGBColorSpace,
} from 'three';

const ATLAS_SIZE = 512;
const FRAME_SIZE = 128;
const FRAME_COLUMNS = 4;
const FRAME_COUNT = 16;
const SAFE_MARGIN = 5;
const TAU = Math.PI * 2;
const ARMS = 6;

function saturate(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(start: number, end: number, value: number): number {
  const amount = saturate((value - start) / (end - start));
  return amount * amount * (3 - 2 * amount);
}

function latticeNoise(x: number, y: number): number {
  let seed = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
  return ((seed ^ (seed >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number): number {
  const left = Math.floor(x);
  const top = Math.floor(y);
  const horizontal = smoothstep(0, 1, x - left);
  const vertical = smoothstep(0, 1, y - top);
  const upperLeft = latticeNoise(left, top);
  const lowerLeft = latticeNoise(left, top + 1);
  const upper = upperLeft + (latticeNoise(left + 1, top) - upperLeft) * horizontal;
  const lower = lowerLeft + (latticeNoise(left + 1, top + 1) - lowerLeft) * horizontal;
  return upper + (lower - upper) * vertical;
}

function needleWidth(branch: number, distance: number, reach: number): number {
  const taper = 1 - distance / reach;
  const spine = (0.052 - branch * 0.014) * Math.pow(taper, 0.62);
  return Math.max(spine, 0.0035);
}

function writeFrostFrame(pixels: Uint8ClampedArray, frame: number): void {
  const originX = (frame % FRAME_COLUMNS) * FRAME_SIZE;
  const originY = Math.floor(frame / FRAME_COLUMNS) * FRAME_SIZE;
  const phase = (frame / FRAME_COUNT) * TAU;
  const grow = 0.62 + Math.sin(phase * 0.5 - 0.4) * 0.06 + (frame / FRAME_COUNT) * 0.16;
  const spin = phase * 0.22;

  for (let y = SAFE_MARGIN; y < FRAME_SIZE - SAFE_MARGIN; y += 1) {
    for (let x = SAFE_MARGIN; x < FRAME_SIZE - SAFE_MARGIN; x += 1) {
      const dx = (x - 63.5) / 52;
      const dy = (y - 63.5) / 52;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 1.02) continue;
      const angle = Math.atan2(dy, dx) - spin;
      const folded = ((angle % (TAU / ARMS)) + TAU / ARMS) % (TAU / ARMS);
      const armDistance = Math.abs(folded - TAU / ARMS / 2);
      const reach = grow;
      const along = distance / reach;

      let density = 0;
      if (along <= 1) {
        const width = needleWidth(0, along * reach, reach);
        density = Math.max(density, 1 - armDistance / width);
        for (let branch = 0; branch < 3; branch += 1) {
          const at = 0.3 + branch * 0.22;
          const branchAngle = (branch % 2 === 0 ? 1 : -1) * (0.42 + branch * 0.08);
          const branchDistance = Math.hypot(
            along - at,
            armDistance * (1 / Math.tan(branchAngle)),
          );
          const branchWidth = needleWidth(branch + 1, along, reach);
          if (along >= at - 0.02) {
            density = Math.max(density, (1 - branchDistance / branchWidth) * 0.92);
          }
        }
      }

      const frost = noise(dx * 7.4 + 3.1, dy * 7.4 - 1.7);
      const grain = noise(dx * 19.3 - 5.5, dy * 19.3 + 8.8);
      const edge = density + (frost - 0.5) * 0.3 + (grain - 0.5) * 0.14;
      const crystal = smoothstep(0.02, 0.5, edge) * (1 - smoothstep(0.86, 1, distance));
      const halo = Math.exp(-Math.pow(distance / 0.46, 2)) * 0.34;
      const inner = Math.exp(-Math.pow(distance / 0.2, 2)) * 0.42;
      const body = Math.max(crystal, halo);
      const core = saturate(crystal * 0.8 + inner);
      const alpha = saturate(body) * (1 - smoothstep(0.94, 1, distance));
      if (alpha < 1 / 255) continue;

      const borderFade = smoothstep(SAFE_MARGIN, SAFE_MARGIN + 4, x)
        * (1 - smoothstep(FRAME_SIZE - SAFE_MARGIN - 5, FRAME_SIZE - SAFE_MARGIN - 1, x))
        * smoothstep(SAFE_MARGIN, SAFE_MARGIN + 4, y)
        * (1 - smoothstep(FRAME_SIZE - SAFE_MARGIN - 5, FRAME_SIZE - SAFE_MARGIN - 1, y));
      const opacity = alpha * borderFade;
      const pixel = ((originY + y) * ATLAS_SIZE + originX + x) * 4;
      pixels[pixel] = 168 + core * 78;
      pixels[pixel + 1] = 208 + core * 47;
      pixels[pixel + 2] = 226 + core * 29;
      pixels[pixel + 3] = Math.round(opacity * 232);
    }
  }
}

export function createLancaGlacialFrostTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível criar o atlas de gelo da Lança Glacial.');

  const image = context.createImageData(ATLAS_SIZE, ATLAS_SIZE);
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    writeFrostFrame(image.data, frame);
  }
  context.putImageData(image, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.name = 'lanca-glacial-frost-atlas';
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  return texture;
}

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
const SAFE_MARGIN = 6;
const TAU = Math.PI * 2;

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

function turbulence(x: number, y: number): number {
  return noise(x, y) * 0.57
    + noise(x * 2.07 + 17.3, y * 2.07 + 9.2) * 0.28
    + noise(x * 4.19 + 31.7, y * 4.19 + 23.1) * 0.15;
}

function writeFlameFrame(pixels: Uint8ClampedArray, frame: number): void {
  const originX = (frame % FRAME_COLUMNS) * FRAME_SIZE;
  const originY = Math.floor(frame / FRAME_COLUMNS) * FRAME_SIZE;
  const phase = frame / FRAME_COUNT * TAU;
  const flowX = Math.cos(phase) * 1.15;
  const flowY = Math.sin(phase) * 1.15;

  for (let y = SAFE_MARGIN; y < FRAME_SIZE - SAFE_MARGIN; y += 1) {
    const height = (115 - y) / 105;
    if (height <= 0 || height >= 1) continue;

    const rootFade = smoothstep(0, 0.13, height);
    const tipFade = 1 - smoothstep(0.91, 1, height);
    const bend = Math.sin(height * 7.4 - phase) * height * 0.09
      + Math.sin(height * 14.2 + phase * 2) * height * height * 0.035;

    for (let x = SAFE_MARGIN; x < FRAME_SIZE - SAFE_MARGIN; x += 1) {
      const horizontal = (x - 63.5) / 49;
      const coarse = turbulence(
        horizontal * 3.6 + flowX + 18,
        height * 5.4 + flowY + 37,
      );
      const curl = turbulence(
        horizontal * 6.2 - flowY + 41,
        height * 8.5 + flowX + 11,
      );
      const warped = horizontal - bend - (coarse - 0.5) * (0.13 + height * 0.2);
      const bodyWidth = 0.38 * Math.pow(1 - height, 0.78) + 0.018;
      let density = 1 - Math.abs(warped) / bodyWidth - height * 0.32;

      for (let tongue = 0; tongue < 5; tongue += 1) {
        const offset = (tongue - 2) * 0.145;
        const length = 0.68 + 0.22 * noise(tongue * 7.1 + flowX, 4.7 + flowY);
        const progress = height / length;
        if (progress >= 1) continue;

        const sway = Math.sin(height * (8.2 + tongue * 0.9) - phase + tongue * 1.7);
        const center = offset * (1 - height * 0.38) + bend
          + sway * height * 0.1 + (curl - 0.5) * height * 0.15;
        const width = (0.105 + tongue % 2 * 0.021)
          * Math.pow(1 - progress, 0.82) + 0.009;
        const tongueDensity = (1 - Math.abs(horizontal - center) / width)
          * (1 - smoothstep(0.76, 1, progress));
        density = Math.max(density, tongueDensity);
      }

      const filaments = turbulence(
        warped * 19 + coarse * 2.8 + flowX,
        height * 11 + flowY + 61,
      );
      const edgeBreakup = (coarse - 0.46) * 0.38 + (filaments - 0.5) * 0.17;
      const flame = smoothstep(-0.12, 0.6, density + edgeBreakup);
      const channels = smoothstep(0.29, 0.73, filaments);
      const internalOpacity = 0.59 + channels * 0.41;
      const borderFade = smoothstep(SAFE_MARGIN, SAFE_MARGIN + 4, x)
        * (1 - smoothstep(FRAME_SIZE - SAFE_MARGIN - 5, FRAME_SIZE - SAFE_MARGIN - 1, x))
        * smoothstep(SAFE_MARGIN, SAFE_MARGIN + 4, y)
        * (1 - smoothstep(FRAME_SIZE - SAFE_MARGIN - 5, FRAME_SIZE - SAFE_MARGIN - 1, y));
      const alpha = flame * rootFade * tipFade * internalOpacity * borderFade;
      if (alpha < 1 / 255) continue;

      const core = Math.exp(-Math.pow((warped + 0.025) / 0.135, 2))
        * (1 - smoothstep(0.25, 0.68, height))
        * smoothstep(0.03, 0.22, height);
      const heat = saturate(flame * 0.36 + channels * 0.22 + core * 0.42);
      const amber = smoothstep(0.18, 0.65, heat);
      const cream = smoothstep(0.75, 1, heat) * 0.88;
      const pixel = ((originY + y) * ATLAS_SIZE + originX + x) * 4;
      pixels[pixel] = 223 + amber * 32;
      pixels[pixel + 1] = 57 + amber * 112 + cream * 72;
      pixels[pixel + 2] = 8 + amber * 18 + cream * 139;
      pixels[pixel + 3] = Math.round(alpha * 244);
    }
  }
}

export function createFireBurstFlameTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível criar o atlas de fogo do Fire Burst.');

  const image = context.createImageData(ATLAS_SIZE, ATLAS_SIZE);
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    writeFlameFrame(image.data, frame);
  }
  context.putImageData(image, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.name = 'fire-burst-flame-atlas';
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  return texture;
}

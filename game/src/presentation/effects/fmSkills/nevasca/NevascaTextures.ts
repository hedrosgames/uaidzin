import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  SRGBColorSpace,
} from "three";

const TAU = Math.PI * 2;
const FROST_ATLAS_SIZE = 1024;
const FROST_TILE_SIZE = 256;
const FROST_FRAMES = 16;

const FROST_GAIN: readonly number[] = [
  0.7, 0.82, 0.92, 0.98,
  1, 1, 1, 1,
  0.96, 0.9, 0.82, 0.72,
  0.58, 0.44, 0.3, 0.2,
];

const FROST_SCALE: readonly number[] = [
  0.44, 0.64, 0.83, 1,
  1, 1, 1, 1,
  1, 1.02, 0.95, 0.86,
  0.78, 0.64, 0.52, 0.42,
];

const FROST_STRETCH_X: readonly number[] = [
  1, 1, 1, 1,
  1, 1, 1, 1,
  1.07, 1.12, 1.05, 0.94,
  1, 1, 1, 1,
];

const FROST_STRETCH_Y: readonly number[] = [
  1, 1, 1, 1,
  1, 1, 1, 1,
  1.04, 1.08, 1.03, 1.06,
  1, 1, 1, 1,
];

type FrostLobe = readonly [x: number, y: number, radius: number];

function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function rgba(red: number, green: number, blue: number, alpha: number): string {
  return `rgba(${red},${green},${blue},${alpha})`;
}

function coreColor(alpha: number): string {
  return rgba(246, 252, 255, alpha);
}

function bodyColor(alpha: number): string {
  return rgba(206, 232, 248, alpha);
}

function iceColor(alpha: number): string {
  return rgba(150, 200, 232, alpha);
}

function shadowColor(alpha: number): string {
  return rgba(96, 140, 186, alpha);
}

function makeCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function makeContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponível para as texturas da Nevasca");
  return context;
}

function toTexture(id: string, canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.name = `Nevasca.${id}`;
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.premultiplyAlpha = false;
  return texture;
}

function frostLobes(seed: number, radius: number, count: number): FrostLobe[] {
  const lobes: FrostLobe[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU + (noise(seed + index) - 0.5) * 0.62;
    const distance = radius * (0.26 + 0.28 * noise(seed + 40 + index));
    const lobe = radius * (0.32 + 0.22 * noise(seed + 80 + index));
    lobes.push([Math.cos(angle) * distance, Math.sin(angle) * distance, lobe]);
  }
  return lobes;
}

function paintFrostShadow(context: CanvasRenderingContext2D, seed: number, radius: number): void {
  const lobes = frostLobes(seed + 900, radius * 0.98, 12);
  const offsetY = radius * 0.06;
  for (const [x, y, lobe] of lobes) {
    const centerY = y + offsetY;
    const gradient = context.createRadialGradient(x, centerY, lobe * 0.1, x, centerY, lobe);
    gradient.addColorStop(0, shadowColor(0.72));
    gradient.addColorStop(0.6, shadowColor(0.4));
    gradient.addColorStop(1, shadowColor(0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, centerY, lobe, 0, TAU);
    context.fill();
  }
}

function paintFrostBody(context: CanvasRenderingContext2D, seed: number, radius: number): void {
  const lobes = frostLobes(seed, radius, 14);
  for (let index = 0; index < lobes.length; index += 1) {
    const [x, y, lobe] = lobes[index];
    const gradient = context.createRadialGradient(x, y, lobe * 0.08, x, y, lobe);
    gradient.addColorStop(0, bodyColor(0.96));
    gradient.addColorStop(0.5, index % 2 === 0 ? iceColor(0.82) : bodyColor(0.8));
    gradient.addColorStop(0.8, iceColor(0.4));
    gradient.addColorStop(1, iceColor(0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, lobe, 0, TAU);
    context.fill();
  }
}

function paintFrostFacets(context: CanvasRenderingContext2D, seed: number, radius: number): void {
  for (let index = 0; index < 7; index += 1) {
    const base = noise(seed + 300 + index) * TAU;
    const centerDistance = radius * (0.16 + 0.4 * noise(seed + 320 + index));
    const centerX = Math.cos(base) * centerDistance;
    const centerY = Math.sin(base) * centerDistance;
    const facetRadius = radius * (0.24 + 0.26 * noise(seed + 340 + index));
    const sides = 4 + Math.floor(noise(seed + 360 + index) * 3);
    context.beginPath();
    for (let vertex = 0; vertex <= sides; vertex += 1) {
      const angle = base + (vertex / sides) * TAU + (noise(seed + 380 + index * 11 + vertex) - 0.5) * 0.4;
      const reach = facetRadius * (0.52 + 0.48 * noise(seed + 420 + index * 11 + vertex));
      const x = centerX + Math.cos(angle) * reach;
      const y = centerY + Math.sin(angle) * reach;
      if (vertex === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fillStyle = index % 2 === 0 ? bodyColor(0.48) : iceColor(0.42);
    context.fill();
    context.strokeStyle = coreColor(0.5);
    context.lineWidth = 1.2;
    context.stroke();
  }
}

function paintFrostCore(context: CanvasRenderingContext2D, seed: number, radius: number): void {
  for (let index = 0; index < 5; index += 1) {
    const angle = noise(seed + 500 + index) * TAU;
    const distance = radius * 0.24 * noise(seed + 520 + index);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const lobe = radius * (0.28 + 0.16 * noise(seed + 540 + index));
    const gradient = context.createRadialGradient(x, y, lobe * 0.05, x, y, lobe);
    gradient.addColorStop(0, coreColor(1));
    gradient.addColorStop(0.55, coreColor(0.76));
    gradient.addColorStop(1, coreColor(0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, lobe, 0, TAU);
    context.fill();
  }
  context.fillStyle = coreColor(1);
  context.beginPath();
  context.arc(radius * 0.05, -radius * 0.04, radius * 0.2, 0, TAU);
  context.fill();
}

function paintFrostGrit(context: CanvasRenderingContext2D, seed: number, radius: number): void {
  for (let index = 0; index < 52; index += 1) {
    const angle = noise(seed + 600 + index) * TAU;
    const distance = radius * (0.72 + 0.32 * noise(seed + 660 + index));
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * 0.94;
    const size = 0.8 + 1.7 * noise(seed + 720 + index);
    context.fillStyle = index % 3 === 0 ? coreColor(0.9) : bodyColor(0.72);
    context.beginPath();
    context.arc(x, y, size, 0, TAU);
    context.fill();
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = noise(seed + 780 + index) * TAU;
    const distance = radius * (0.8 + 0.2 * noise(seed + 840 + index));
    const size = 2 + 3.4 * noise(seed + 900 + index);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const point = angle + (noise(seed + 960 + index) - 0.5) * 0.8;
    context.beginPath();
    context.moveTo(x + Math.cos(point) * size, y + Math.sin(point) * size);
    context.lineTo(x + Math.cos(point + 2.5) * size * 0.68, y + Math.sin(point + 2.5) * size * 0.68);
    context.lineTo(x + Math.cos(point - 2.5) * size * 0.68, y + Math.sin(point - 2.5) * size * 0.68);
    context.closePath();
    context.fillStyle = index % 2 === 0 ? coreColor(0.85) : iceColor(0.68);
    context.fill();
  }
}

function paintFrostFragments(context: CanvasRenderingContext2D, seed: number, frame: number): void {
  const stage = (frame - 12) / 3;
  const count = 11 + Math.round(stage * 5);
  for (let index = 0; index < count; index += 1) {
    const angle = noise(seed + 1020 + index) * TAU + frame * 0.42;
    const distance = 60 + 40 * noise(seed + 1080 + index) + 6 * stage;
    const size = (2.6 + 3.6 * noise(seed + 1140 + index)) * (1 - 0.2 * stage);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * 0.92;
    context.save();
    context.translate(x, y);
    context.rotate(noise(seed + 1200 + index) * TAU + index);
    context.beginPath();
    context.moveTo(size, 0);
    context.lineTo(size * 0.1, size * 0.66);
    context.lineTo(-size * 0.88, size * 0.12);
    context.lineTo(-size * 0.18, -size * 0.72);
    context.closePath();
    context.fillStyle = noise(seed + 1260 + index) > 0.45 ? coreColor(0.9) : bodyColor(0.82);
    context.fill();
    context.restore();
  }
}

function paintFrostFrame(context: CanvasRenderingContext2D, frame: number): void {
  const seed = frame * 37 + 11;
  const radius = 92 * FROST_SCALE[frame];
  context.save();
  context.translate(FROST_TILE_SIZE / 2, FROST_TILE_SIZE / 2);
  context.rotate(frame * 0.045);
  context.scale(FROST_STRETCH_X[frame], FROST_STRETCH_Y[frame]);
  paintFrostShadow(context, seed, radius);
  paintFrostBody(context, seed, radius);
  paintFrostFacets(context, seed, radius);
  paintFrostCore(context, seed, radius);
  paintFrostGrit(context, seed, radius);
  if (frame >= 12) {
    paintFrostFragments(context, seed, frame);
  }
  context.restore();
}

function buildFrostCanvas(): HTMLCanvasElement {
  const canvas = makeCanvas(FROST_ATLAS_SIZE);
  const context = makeContext(canvas);
  for (let frame = 0; frame < FROST_FRAMES; frame += 1) {
    const tile = makeCanvas(FROST_TILE_SIZE);
    paintFrostFrame(makeContext(tile), frame);
    context.save();
    context.globalAlpha = FROST_GAIN[frame];
    context.drawImage(tile, (frame % 4) * FROST_TILE_SIZE, Math.floor(frame / 4) * FROST_TILE_SIZE);
    context.restore();
  }
  return canvas;
}

function paintCrystal(context: CanvasRenderingContext2D): void {
  const outline: ReadonlyArray<readonly [number, number]> = [
    [0, -232],
    [54, -142],
    [72, -26],
    [56, 92],
    [30, 172],
    [8, 220],
    [-40, 196],
    [-68, 104],
    [-70, -18],
    [-44, -148],
  ];
  context.save();
  context.translate(256, 256);
  context.rotate(-0.12);
  const trace = (): void => {
    context.beginPath();
    for (let index = 0; index < outline.length; index += 1) {
      const [x, y] = outline[index];
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
  };
  const facet = (points: ReadonlyArray<readonly [number, number]>, style: string): void => {
    context.beginPath();
    for (let index = 0; index < points.length; index += 1) {
      const [x, y] = points[index];
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fillStyle = style;
    context.fill();
  };
  trace();
  const bodyGradient = context.createLinearGradient(0, -232, 0, 220);
  bodyGradient.addColorStop(0, rgba(196, 226, 246, 0.88));
  bodyGradient.addColorStop(0.55, rgba(196, 226, 246, 0.82));
  bodyGradient.addColorStop(1, rgba(120, 168, 214, 0.8));
  context.fillStyle = bodyGradient;
  context.fill();
  facet([[0, -232], [-44, -148], [-70, -18], [-68, 104], [-40, 196], [0, 30]], rgba(232, 246, 255, 0.9));
  facet([[0, -232], [54, -142], [72, -26], [56, 92], [30, 172], [8, 220], [0, 40]], rgba(120, 168, 214, 0.42));
  facet([[-16, -190], [18, -176], [30, -40], [22, 120], [0, 200], [-22, 128], [-30, -30]], rgba(232, 246, 255, 0.95));
  facet([[-6, -170], [12, -160], [16, -20], [10, 130], [0, 178], [-12, 126], [-16, -24]], rgba(255, 255, 255, 1));
  facet([[8, 220], [-40, 196], [-32, 152], [14, 158]], rgba(120, 168, 214, 0.75));
  context.lineJoin = "round";
  trace();
  context.strokeStyle = rgba(255, 255, 255, 0.95);
  context.lineWidth = 3;
  context.stroke();
  context.strokeStyle = rgba(255, 255, 255, 0.55);
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(0, -232);
  context.lineTo(-44, -148);
  context.moveTo(-16, -190);
  context.lineTo(-30, -30);
  context.moveTo(-6, -170);
  context.lineTo(-12, 126);
  context.stroke();
  for (let index = 0; index < 4; index += 1) {
    const x = -26 + 18 * index;
    const y = -150 + index * 96;
    const size = 7 - index;
    context.beginPath();
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.6, y);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.6, y);
    context.closePath();
    context.fillStyle = rgba(255, 255, 255, index === 0 ? 1 : 0.8);
    context.fill();
  }
  context.restore();
}

function paintFlake(context: CanvasRenderingContext2D): void {
  const armLength = 104;
  context.save();
  context.translate(128, 128);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = rgba(206, 236, 252, 0.85);
  context.shadowBlur = 7;
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * TAU + 0.04;
    const tipX = Math.cos(angle) * armLength;
    const tipY = Math.sin(angle) * armLength;
    const gradient = context.createLinearGradient(0, 0, tipX, tipY);
    gradient.addColorStop(0, rgba(255, 255, 255, 1));
    gradient.addColorStop(1, rgba(206, 236, 252, 0.85));
    context.strokeStyle = gradient;
    context.lineWidth = 3.4;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(tipX, tipY);
    context.stroke();
  }
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * TAU + 0.04;
    for (let level = 0; level < 2; level += 1) {
      const along = level === 0 ? 0.46 : 0.72;
      const reach = level === 0 ? 20.8 : 14.6;
      const baseX = Math.cos(angle) * armLength * along;
      const baseY = Math.sin(angle) * armLength * along;
      for (let side = 0; side < 2; side += 1) {
        const branchAngle = angle + (side === 0 ? -0.62 : 0.62);
        context.strokeStyle = rgba(206, 236, 252, 0.85);
        context.lineWidth = 2.4;
        context.beginPath();
        context.moveTo(baseX, baseY);
        context.lineTo(baseX + Math.cos(branchAngle) * reach, baseY + Math.sin(branchAngle) * reach);
        context.stroke();
      }
    }
  }
  context.shadowBlur = 0;
  context.strokeStyle = rgba(255, 255, 255, 1);
  context.lineWidth = 2.6;
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * TAU + 0.04;
    const x = Math.cos(angle) * 12;
    const y = Math.sin(angle) * 12;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
  context.stroke();
  context.fillStyle = rgba(255, 255, 255, 1);
  context.beginPath();
  context.arc(0, 0, 5.2, 0, TAU);
  context.fill();
  context.restore();
}

function paintFlash(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(256, 256);
  const halo = context.createRadialGradient(0, 0, 0, 0, 0, 152);
  halo.addColorStop(0, rgba(255, 255, 255, 1));
  halo.addColorStop(0.16, rgba(226, 246, 255, 0.95));
  halo.addColorStop(0.4, rgba(150, 206, 240, 0.7));
  halo.addColorStop(0.68, rgba(80, 140, 200, 0.3));
  halo.addColorStop(1, rgba(80, 140, 200, 0));
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, 152, 0, TAU);
  context.fill();
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * TAU + (noise(index * 3.7 + 1.3) - 0.5) * 0.5;
    const length = 204 + 40 * noise(index * 5.1 + 8.9);
    const base = 16 + 22 * noise(index * 7.3 + 2.4);
    const spread = 0.1 + 0.08 * noise(index * 9.1 + 5.5);
    const gradient = context.createLinearGradient(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
    gradient.addColorStop(0, rgba(226, 246, 255, 0.95));
    gradient.addColorStop(0.35, rgba(150, 206, 240, 0.6));
    gradient.addColorStop(1, rgba(80, 140, 200, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(Math.cos(angle - spread) * base, Math.sin(angle - spread) * base);
    context.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    context.lineTo(Math.cos(angle + spread) * base, Math.sin(angle + spread) * base);
    context.closePath();
    context.fill();
  }
  for (let index = 0; index < 7; index += 1) {
    const angle = ((index + 0.5) / 7) * TAU + (noise(index * 4.9 + 21.6) - 0.5) * 0.7;
    const length = 132 + 56 * noise(index * 6.3 + 13.4);
    const base = 10 + 16 * noise(index * 8.7 + 30.1);
    const spread = 0.08 + 0.06 * noise(index * 10.3 + 17.2);
    const gradient = context.createLinearGradient(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
    gradient.addColorStop(0, rgba(226, 246, 255, 0.9));
    gradient.addColorStop(0.6, rgba(150, 206, 240, 0.45));
    gradient.addColorStop(1, rgba(80, 140, 200, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(Math.cos(angle - spread) * base, Math.sin(angle - spread) * base);
    context.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    context.lineTo(Math.cos(angle + spread) * base, Math.sin(angle + spread) * base);
    context.closePath();
    context.fill();
  }
  for (let index = 0; index < 9; index += 1) {
    const angle = noise(index * 7.7 + 44.4) * TAU;
    const distance = 120 + 96 * noise(index * 9.9 + 33.3);
    const size = 4 + 7 * noise(index * 11.5 + 55.5);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * 0.94;
    context.save();
    context.translate(x, y);
    context.rotate(angle + index);
    context.beginPath();
    context.moveTo(size, 0);
    context.lineTo(0, size * 0.36);
    context.lineTo(-size, 0);
    context.lineTo(0, -size * 0.36);
    context.closePath();
    context.fillStyle = rgba(226, 246, 255, 0.85);
    context.fill();
    context.restore();
  }
  context.fillStyle = rgba(255, 255, 255, 1);
  context.beginPath();
  context.arc(0, 0, 14, 0, TAU);
  context.fill();
  context.restore();
}

function paintGroundPatch(context: CanvasRenderingContext2D): void {
  const centerX = 252;
  const centerY = 250;
  for (let index = 0; index < 11; index += 1) {
    const angle = noise(index * 2.9 + 3.1) * TAU;
    const distance = 24 + 72 * noise(index * 4.3 + 7.7);
    const lobe = 44 + 44 * noise(index * 6.1 + 1.9);
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance * 0.9;
    const gradient = context.createRadialGradient(x, y, lobe * 0.08, x, y, lobe);
    gradient.addColorStop(0, rgba(226, 242, 252, 0.94));
    gradient.addColorStop(0.52, rgba(226, 242, 252, 0.62));
    gradient.addColorStop(0.8, rgba(150, 200, 232, 0.32));
    gradient.addColorStop(1, rgba(150, 200, 232, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, lobe, 0, TAU);
    context.fill();
  }
  context.fillStyle = rgba(226, 242, 252, 1);
  context.beginPath();
  context.arc(centerX - 6, centerY + 4, 36, 0, TAU);
  context.fill();
  for (let index = 0; index < 7; index += 1) {
    const angle = noise(index * 5.7 + 11.2) * TAU;
    const distance = 142 + 44 * noise(index * 3.3 + 4.4);
    const lobe = 16 + 30 * noise(index * 7.9 + 6.6);
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance * 0.86;
    const gradient = context.createRadialGradient(x, y, lobe * 0.05, x, y, lobe);
    gradient.addColorStop(0, rgba(206, 232, 248, 0.82));
    gradient.addColorStop(0.6, rgba(206, 232, 248, 0.42));
    gradient.addColorStop(1, rgba(150, 200, 232, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, lobe, 0, TAU);
    context.fill();
  }
  for (let index = 0; index < 160; index += 1) {
    const angle = noise(index * 8.1 + 13.7) * TAU;
    const distance = 132 * Math.sqrt(noise(index * 9.3 + 2.8));
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance * 0.9;
    const size = 0.7 + 1.8 * noise(index * 10.7 + 5.9);
    context.fillStyle = noise(index * 11.3 + 3.7) > 0.55 ? rgba(246, 252, 255, 0.85) : rgba(150, 200, 232, 0.5);
    context.beginPath();
    context.arc(x, y, size, 0, TAU);
    context.fill();
  }
  for (let index = 0; index < 6; index += 1) {
    const angle = noise(index * 6.7 + 27.3) * TAU;
    const distance = 30 + 66 * noise(index * 5.5 + 15.1);
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance * 0.9;
    const size = 12 + 16 * noise(index * 7.1 + 9.2);
    context.save();
    context.translate(x, y);
    context.rotate(angle + index * 0.7);
    context.beginPath();
    context.moveTo(size, 0);
    context.lineTo(size * 0.15, size * 0.7);
    context.lineTo(-size * 0.9, size * 0.25);
    context.lineTo(-size * 0.3, -size * 0.65);
    context.closePath();
    context.fillStyle = rgba(246, 252, 255, 0.6);
    context.fill();
    context.strokeStyle = rgba(226, 242, 252, 0.5);
    context.lineWidth = 1.1;
    context.stroke();
    context.restore();
  }
}

function paintStreak(context: CanvasRenderingContext2D): void {
  const startX = 5.5;
  const endX = 58.5;
  const gradient = context.createLinearGradient(0, 0, 63, 0);
  gradient.addColorStop(0, rgba(206, 238, 255, 0));
  gradient.addColorStop(1 / 6, rgba(206, 238, 255, 0.15));
  gradient.addColorStop(1 / 3, rgba(206, 238, 255, 0.62));
  gradient.addColorStop(0.425, rgba(255, 255, 255, 1));
  gradient.addColorStop(0.575, rgba(255, 255, 255, 1));
  gradient.addColorStop(2 / 3, rgba(206, 238, 255, 0.6));
  gradient.addColorStop(5 / 6, rgba(206, 238, 255, 0.09));
  gradient.addColorStop(1, rgba(206, 238, 255, 0));
  const steps = 26;
  const thicknessAt = (t: number): number => 0.55 + 4.5 * Math.pow(Math.sin(Math.PI * t), 0.8);
  context.beginPath();
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const x = startX + (endX - startX) * t;
    const y = 32 - thicknessAt(t);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  for (let index = steps; index >= 0; index -= 1) {
    const t = index / steps;
    const x = startX + (endX - startX) * t;
    context.lineTo(x, 32 + thicknessAt(t));
  }
  context.closePath();
  context.fillStyle = gradient;
  context.fill();
}

function buildCrystalCanvas(): HTMLCanvasElement {
  const canvas = makeCanvas(512);
  paintCrystal(makeContext(canvas));
  return canvas;
}

function buildFlakeCanvas(): HTMLCanvasElement {
  const canvas = makeCanvas(256);
  paintFlake(makeContext(canvas));
  return canvas;
}

function buildFlashCanvas(): HTMLCanvasElement {
  const canvas = makeCanvas(512);
  paintFlash(makeContext(canvas));
  return canvas;
}

function buildGroundCanvas(): HTMLCanvasElement {
  const canvas = makeCanvas(512);
  const context = makeContext(canvas);
  const patch = makeCanvas(512);
  paintGroundPatch(makeContext(patch));
  context.save();
  context.globalAlpha = 0.6;
  context.drawImage(patch, 0, 0);
  context.restore();
  return canvas;
}

function buildStreakCanvas(): HTMLCanvasElement {
  const canvas = makeCanvas(64);
  paintStreak(makeContext(canvas));
  return canvas;
}

export class NevascaTextures {
  readonly frost: CanvasTexture;
  readonly crystal: CanvasTexture;
  readonly flake: CanvasTexture;
  readonly flash: CanvasTexture;
  readonly ground: CanvasTexture;
  readonly streak: CanvasTexture;

  constructor() {
    this.frost = toTexture("frost", buildFrostCanvas());
    this.crystal = toTexture("crystal", buildCrystalCanvas());
    this.flake = toTexture("flake", buildFlakeCanvas());
    this.flash = toTexture("flash", buildFlashCanvas());
    this.ground = toTexture("ground", buildGroundCanvas());
    this.streak = toTexture("streak", buildStreakCanvas());
  }

  dispose(): void {
    this.frost.dispose();
    this.crystal.dispose();
    this.flake.dispose();
    this.flash.dispose();
    this.ground.dispose();
    this.streak.dispose();
  }
}

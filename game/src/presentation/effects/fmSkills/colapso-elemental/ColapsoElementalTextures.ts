import { ClampToEdgeWrapping, type CanvasTexture } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type Point = readonly [number, number];
type Stops = ReadonlyArray<readonly [number, string]>;
type ToneSpec = readonly [number, number, number];
type CoreFrameSpec = readonly [number, number, number, number, number, number, number, number];
type CorePlateSpec = readonly [number, number, number, number, number, number, number, number];
type CoreCrackSpec = readonly [number, number, number, number, number, number];
type RaySpec = readonly [number, number, number, number, number, number, number];
type ChipSpec = readonly [number, number, number, number, number, number, number];
type NotchSpec = readonly [number, number, number, number, number];
type RingArcSpec = readonly [number, number, number, number, number, number, number];
type DustBlobSpec = readonly [number, number, number, number, number];
type DustClumpSpec = readonly [number, number, number, number];

const TAU = Math.PI * 2;

const CORE_TILE = 256;
const CORE_PADDING = 8;
const CORE_COLUMNS = 4;
const CORE_FRAMES = 16;
const CORE_ATLAS = CORE_TILE * CORE_COLUMNS;
const CORE_CENTER = CORE_TILE * 0.5;
const CORE_REACH = 116;
const CORE_STEPS = 84;

const FRAGMENT_SIZE = 256;
const FRAGMENT_CENTER = FRAGMENT_SIZE * 0.5;

const FLASH_SIZE = 512;
const FLASH_CENTER = FLASH_SIZE * 0.5;

const RING_SIZE = 512;
const RING_CENTER = RING_SIZE * 0.5;

const DUST_SIZE = 512;
const DUST_CENTER = DUST_SIZE * 0.5;

const STREAK_SIZE = 64;
const STREAK_CENTER = STREAK_SIZE * 0.5;

const CORE_GAINS: readonly number[] = [
  0.7, 0.82, 0.92, 0.98, 1, 1, 1, 1, 0.96, 0.9, 0.82, 0.72, 0.58, 0.44, 0.3, 0.2,
];

const ELEMENT_TONES: readonly ToneSpec[] = [
  [255, 196, 92],
  [150, 214, 255],
  [172, 116, 232],
  [232, 116, 44],
  [255, 252, 240],
];

const FLASH_TONES: readonly ToneSpec[] = [
  [255, 236, 170],
  [255, 138, 60],
  [150, 90, 210],
  [150, 214, 255],
];

const DUST_TONES: readonly ToneSpec[] = [
  [214, 190, 160],
  [238, 222, 194],
  [232, 150, 100],
  [150, 96, 206],
  [146, 122, 100],
];

const CORE_FRAMES_SPEC: readonly CoreFrameSpec[] = [
  [40, 1.02, 0, 0.12, 0.1, 0, 0.42, 0.1],
  [44, 0.99, 0.45, 0.22, 0.14, 0.03, 0.52, 0.18],
  [47, 1.01, 0.9, 0.32, 0.18, 0.06, 0.62, 0.26],
  [50, 0.98, 1.35, 0.42, 0.22, 0.09, 0.72, 0.34],
  [52, 1.02, 1.8, 0.55, 0.26, 0.12, 0.82, 0.44],
  [53, 0.99, 2.25, 0.68, 0.3, 0.15, 0.9, 0.52],
  [54, 1.01, 2.7, 0.82, 0.34, 0.18, 0.96, 0.6],
  [54, 0.97, 3.15, 0.94, 0.38, 0.22, 1, 0.66],
  [53, 1.03, 3.6, 0.98, 0.46, 0.3, 0.92, 0.58],
  [51, 0.96, 4.05, 0.94, 0.56, 0.42, 0.84, 0.48],
  [49, 1.02, 4.5, 0.88, 0.66, 0.55, 0.74, 0.38],
  [46, 0.95, 4.95, 0.8, 0.76, 0.68, 0.66, 0.3],
  [41, 1.01, 5.4, 0.64, 0.86, 0.8, 0.54, 0.22],
  [35, 0.96, 5.85, 0.5, 0.92, 0.89, 0.42, 0.16],
  [28, 1.02, 6.3, 0.38, 0.96, 0.95, 0.32, 0.1],
  [21, 0.98, 6.75, 0.26, 1, 1, 0.24, 0.06],
];

const CORE_PLATES: readonly CorePlateSpec[] = [
  [0.34, 1.04, 15, 0.82, 0.6, 4, 0.82, 70],
  [1.02, 1.16, 11, 0.9, 2.2, 0, 0.72, 92],
  [1.68, 0.98, 17, 0.74, 1.1, 1, 0.78, 66],
  [2.34, 1.12, 12, 0.88, 3, 3, 0.64, 104],
  [2.98, 0.94, 14, 0.8, 1.7, 2, 0.86, 74],
  [3.62, 1.2, 13, 0.86, 0.4, 0, 0.68, 88],
  [4.26, 1, 16, 0.78, 2.6, 1, 0.74, 68],
  [4.92, 1.1, 11, 0.92, 1.4, 3, 0.62, 106],
  [5.56, 0.96, 15, 0.76, 3.3, 2, 0.8, 64],
  [6.08, 1.06, 12, 0.84, 0.9, 0, 0.7, 96],
];

const CORE_CRACKS: readonly CoreCrackSpec[] = [
  [0.55, 0.34, 0.92, 1.6, 0.9, 0.45],
  [1.35, 0.42, 0.8, 1.3, 0.8, -0.5],
  [2.15, 0.3, 0.96, 1.8, 0.95, 0.4],
  [2.95, 0.44, 0.72, 1.1, 0.7, -0.45],
  [3.75, 0.38, 0.88, 1.5, 0.85, 0.5],
  [4.55, 0.46, 0.78, 1.2, 0.75, -0.4],
  [5.35, 0.32, 0.94, 1.7, 0.92, 0.45],
  [6.05, 0.4, 0.82, 1.3, 0.8, -0.5],
];

const FLASH_RAYS: readonly RaySpec[] = [
  [-0.42, 34, 176, 17, 0.6, 0.55, 0],
  [0.52, 40, 150, 14, 0.52, -0.5, 1],
  [1.28, 30, 196, 19, 0.56, 0.6, 0],
  [1.96, 44, 132, 12, 0.44, -0.45, 2],
  [2.62, 36, 184, 16, 0.58, 0.5, 0],
  [3.18, 42, 118, 11, 0.38, -0.55, 3],
  [3.74, 32, 170, 15, 0.54, 0.65, 1],
  [4.36, 46, 140, 13, 0.48, -0.4, 2],
  [4.98, 34, 190, 18, 0.6, 0.5, 0],
  [5.58, 40, 126, 12, 0.42, -0.6, 3],
  [6.04, 36, 160, 14, 0.5, 0.55, 1],
];

const FLASH_CHIPS: readonly ChipSpec[] = [
  [-2.9, 176, 13, 0.7, 0.4, 0, 0.5],
  [-1.72, 204, 10, 0.85, 1.2, 2, 0.42],
  [-0.56, 168, 15, 0.62, 2.1, 1, 0.55],
  [0.48, 216, 9, 0.9, 0.7, 3, 0.38],
  [1.36, 190, 12, 0.72, 1.5, 0, 0.5],
  [2.24, 156, 14, 0.66, 2.6, 1, 0.55],
  [3.06, 208, 10, 0.88, 0.3, 2, 0.4],
  [3.82, 178, 13, 0.7, 1.8, 0, 0.48],
  [4.66, 200, 11, 0.8, 0.9, 3, 0.36],
  [5.5, 164, 14, 0.64, 2.4, 1, 0.52],
];

const FLASH_NOTCHES: readonly NotchSpec[] = [
  [-2.5, 150, 34, 0.6, 1.1],
  [-1.2, 182, 28, 0.5, 0.9],
  [0.1, 162, 38, 0.65, 1.15],
  [1.1, 196, 24, 0.45, 0.85],
  [2.3, 172, 32, 0.6, 1.05],
  [3.3, 154, 40, 0.7, 1.2],
  [4.3, 188, 26, 0.5, 0.9],
  [5.3, 166, 36, 0.62, 1.1],
  [-0.7, 210, 22, 0.4, 0.8],
];

const RING_ARCS: readonly RingArcSpec[] = [
  [0.1, 0.92, 203, 17, 1, 5, 1.6],
  [1.3, 2.02, 196, 15, 0.92, 4.5, 2.2],
  [2.44, 3.12, 210, 19, 1, 6, 1.5],
  [3.46, 4.24, 199, 14, 0.88, 4, 2.4],
  [4.5, 5.18, 207, 16, 0.96, 5.5, 1.8],
  [5.48, 6.08, 194, 15, 0.9, 4.5, 2.1],
];

const DUST_BLOBS: readonly DustBlobSpec[] = [
  [248, 262, 92, 0.76, 0],
  [206, 288, 74, 0.6, 0],
  [296, 278, 78, 0.62, 0],
  [242, 216, 70, 0.56, 1],
  [268, 330, 58, 0.44, 0],
  [186, 232, 56, 0.42, 1],
  [318, 226, 52, 0.38, 2],
  [160, 328, 46, 0.34, 0],
  [338, 332, 44, 0.33, 4],
  [224, 376, 46, 0.33, 0],
  [300, 178, 42, 0.3, 1],
  [130, 268, 40, 0.32, 0],
  [358, 262, 38, 0.28, 0],
  [276, 122, 40, 0.28, 1],
  [190, 168, 38, 0.28, 2],
  [132, 204, 32, 0.25, 0],
  [368, 190, 30, 0.23, 0],
  [110, 330, 30, 0.23, 4],
  [206, 424, 32, 0.23, 0],
  [330, 390, 30, 0.22, 0],
  [402, 310, 28, 0.2, 0],
  [398, 216, 26, 0.2, 3],
  [84, 238, 26, 0.2, 0],
  [238, 78, 30, 0.22, 1],
  [154, 122, 26, 0.18, 0],
  [340, 118, 26, 0.18, 2],
  [430, 260, 24, 0.18, 0],
  [452, 300, 20, 0.16, 0],
  [452, 196, 22, 0.16, 0],
  [96, 396, 24, 0.16, 4],
];

const DUST_CLUMPS: readonly DustClumpSpec[] = [
  [222, 286, 30, 0.14],
  [286, 262, 26, 0.12],
  [252, 236, 34, 0.13],
  [318, 300, 22, 0.11],
  [196, 322, 24, 0.12],
  [268, 344, 20, 0.11],
  [246, 190, 22, 0.1],
  [172, 262, 18, 0.1],
  [300, 210, 20, 0.1],
  [352, 296, 16, 0.09],
  [214, 356, 18, 0.09],
  [330, 240, 15, 0.08],
];

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function alphaText(value: number): string {
  return clamp01(value).toFixed(3);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function radial(
  context: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number,
  stops: Stops,
): CanvasGradient {
  const fill = context.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [offset, color] of stops) fill.addColorStop(offset, color);
  return fill;
}

function linear(
  context: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: Stops,
): CanvasGradient {
  const fill = context.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of stops) fill.addColorStop(offset, color);
  return fill;
}

function fillPath(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: string | CanvasGradient,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = clamp01(alpha);
  context.fillStyle = fill;
  context.beginPath();
  const first = points[0]!;
  context.moveTo(first[0], first[1]);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!;
    context.lineTo(point[0], point[1]);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function strokePath(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  color: string,
  width: number,
  closed: boolean,
): void {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();
  const first = points[0]!;
  context.moveTo(first[0], first[1]);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!;
    context.lineTo(point[0], point[1]);
  }
  if (closed) context.closePath();
  context.stroke();
  context.restore();
}

function fillEllipse(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
  alpha = 1,
  rotation = 0,
): void {
  context.save();
  context.globalAlpha = clamp01(alpha);
  context.fillStyle = fill;
  context.beginPath();
  context.ellipse(cx, cy, Math.max(0.2, rx), Math.max(0.2, ry), rotation, 0, TAU);
  context.fill();
  context.restore();
}

function widthRibbon(spine: readonly Point[], widths: readonly number[]): Point[] {
  const left: Point[] = [];
  const right: Point[] = [];
  for (let index = 0; index < spine.length; index += 1) {
    const current = spine[index]!;
    const previous = spine[Math.max(0, index - 1)]!;
    const next = spine[Math.min(spine.length - 1, index + 1)]!;
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy) || 1;
    const half = widths[index]! * 0.5;
    left.push([current[0] - (dy / length) * half, current[1] + (dx / length) * half]);
    right.push([current[0] + (dy / length) * half, current[1] - (dx / length) * half]);
  }
  return [...left, ...right.reverse()];
}

function fitPoints(
  points: readonly Point[],
  cx: number,
  cy: number,
  reach: number,
): Point[] {
  let extent = 0;
  for (const point of points) {
    extent = Math.max(extent, Math.abs(point[0] - cx), Math.abs(point[1] - cy));
  }
  const factor = extent > reach ? reach / extent : 1;
  return points.map((point): Point => [
    cx + (point[0] - cx) * factor,
    cy + (point[1] - cy) * factor,
  ]);
}

function shardPoints(
  cx: number,
  cy: number,
  size: number,
  stretch: number,
  seed: number,
  rotation: number,
): Point[] {
  const count = 6;
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = rotation + (index / count) * TAU;
    const ridge = 1 + 0.12 * Math.sin(index * 2.3 + seed * 1.9);
    const radius = size * (0.58 + 0.42 * Math.abs(Math.sin(index * 1.7 + seed))) * ridge;
    points.push([
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius * stretch,
    ]);
  }
  return points;
}

function limitOpacity(
  context: CanvasRenderingContext2D,
  size: number,
  opacity: number,
): void {
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = `rgba(255,255,255,${alphaText(opacity)})`;
  context.fillRect(0, 0, size, size);
  context.restore();
}

function maskRadial(
  context: CanvasRenderingContext2D,
  size: number,
  solid: number,
  fade: number,
): void {
  const center = size * 0.5;
  const mask = radial(context, center, center, 0, center, center, fade, [
    [0, "rgba(255,255,255,1)"],
    [Math.min(0.999, solid / fade), "rgba(255,255,255,1)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = mask;
  context.fillRect(0, 0, size, size);
  context.restore();
}

function coreRadius(base: number, phase: number, angle: number): number {
  const lump =
    0.32 * Math.sin(angle * 2 + 0.9 + phase * 0.5)
    + 0.39 * Math.sin(angle * 3 + 2.4 - phase * 0.4)
    + 0.28 * Math.sin(angle * 5 + 4.1 + phase * 0.7)
    + 0.22 * Math.sin(angle * 7 + 1.3 - phase * 0.3)
    + 0.08 * Math.sin(angle * 11 + 5 + phase * 0.9);
  return base * Math.max(0.34, 1 + lump);
}

function coreOutline(
  cx: number,
  cy: number,
  base: number,
  squash: number,
  phase: number,
): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < CORE_STEPS; index += 1) {
    const angle = (index / CORE_STEPS) * TAU;
    const facet = 1 + 0.03 * Math.sin(index * 2.399963 + phase * 1.7);
    const radius = coreRadius(base, phase, angle) * facet;
    points.push([
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius * squash,
    ]);
  }
  return fitPoints(points, cx, cy, CORE_REACH);
}

function drawCoreCrack(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  base: number,
  squash: number,
  phase: number,
  spec: CoreCrackSpec,
  strength: number,
  rim: number,
): void {
  const angle = spec[0];
  const inner = spec[1];
  const outer = spec[2];
  const width = spec[3];
  const power = clamp01(spec[4] * (0.25 + 0.75 * strength));
  if (power <= 0.03) return;
  const bend = spec[5];
  const steps = 7;
  const radius = coreRadius(base, phase, angle);
  const points: Point[] = [];
  for (let index = 0; index < steps; index += 1) {
    const u = index / (steps - 1);
    const travel = radius * (inner + (outer - inner) * u);
    const wobble = bend * Math.sin(u * Math.PI * 1.6 + angle * 1.9) * base * 0.18 * u;
    points.push([
      cx + Math.cos(angle) * travel - Math.sin(angle) * wobble,
      cy + (Math.sin(angle) * travel + Math.cos(angle) * wobble) * squash,
    ]);
  }
  const layers: ReadonlyArray<readonly [string, number]> = [
    [`rgba(96,44,140,${alphaText(power * (0.4 + rim * 0.35))})`, width * 2.2],
    [`rgba(232,116,44,${alphaText(power * 0.82)})`, width * 1.2],
    [`rgba(255,248,226,${alphaText(power * 0.45)})`, Math.max(0.7, width * 0.5)],
  ];
  for (const [color, lineWidth] of layers) {
    strokePath(context, points, color, lineWidth, false);
  }
  context.save();
  context.globalCompositeOperation = "lighter";
  strokePath(context, points, `rgba(255,236,180,${alphaText(power * 0.35)})`, Math.max(0.6, width * 0.35), false);
  context.restore();
}

function drawCorePlate(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  base: number,
  squash: number,
  phase: number,
  spec: CorePlateSpec,
  separation: number,
  gain: number,
  index: number,
): void {
  const plateAngle = spec[0];
  const hug = spec[1];
  const size = spec[2] * (1 - 0.16 * separation);
  const stretch = spec[3];
  const spin = spec[4];
  const tone = ELEMENT_TONES[spec[5]]!;
  const plateAlpha = clamp01(spec[6] * gain * (1 - 0.12 * separation));
  if (plateAlpha <= 0.03) return;
  const cosine = Math.cos(plateAngle);
  const sine = Math.sin(plateAngle);
  const bodyRadius = coreRadius(base, phase, plateAngle)
    * Math.sqrt(cosine * cosine + sine * sine * squash * squash);
  const hugDistance = Math.min(bodyRadius * hug + size * 0.42, 96);
  const targetDistance = spec[7];
  const distance = hugDistance + (targetDistance - hugDistance) * separation;
  const x = cx + cosine * distance;
  const y = cy + sine * distance * squash;
  const points = fitPoints(
    shardPoints(x, y, size, stretch, index * 1.37 + phase, spin + phase * 0.6),
    cx,
    cy,
    CORE_REACH,
  );
  const innerDistance = Math.max(6, distance - size * 0.5);
  const innerX = cx + cosine * innerDistance;
  const innerY = cy + sine * innerDistance * squash;
  fillPath(
    context,
    points,
    radial(context, innerX, innerY, size * 0.05, x, y, size * 1.3, [
      [0, `rgba(255,250,232,${alphaText(plateAlpha * 1.08)})`],
      [0.38, `rgba(${tone[0]},${tone[1]},${tone[2]},${alphaText(plateAlpha)})`],
      [
        1,
        `rgba(${Math.round(tone[0] * 0.52)},${Math.round(tone[1] * 0.46)},${Math.round(tone[2] * 0.62)},${alphaText(plateAlpha * 0.72)})`,
      ],
    ]),
    1,
  );
  strokePath(context, points, `rgba(96,44,140,${alphaText(plateAlpha * 0.62)})`, 1.2, true);
  if (plateAlpha > 0.2) {
    context.save();
    context.globalCompositeOperation = "lighter";
    fillEllipse(
      context,
      innerX,
      innerY,
      size * 0.24,
      size * 0.17,
      `rgba(255,252,240,${alphaText(plateAlpha * 0.8)})`,
      1,
      plateAngle,
    );
    context.restore();
  }
}

function drawCoreFrame(context: CanvasRenderingContext2D, frame: number): void {
  const spec = CORE_FRAMES_SPEC[frame]!;
  const base = spec[0];
  const squash = spec[1];
  const phase = spec[2];
  const crackStrength = spec[3];
  const rim = spec[4];
  const travel = spec[5];
  const plateGain = spec[6];
  const glow = spec[7];
  const center = CORE_CENTER;
  const separation = clamp01((travel - 0.68) / 0.32);
  const outline = coreOutline(center, center, base, squash, phase);

  fillPath(
    context,
    outline,
    radial(context, center - base * 0.3, center - base * 0.42, base * 0.06, center, center + base * 0.2, base * 1.72, [
      [0, "rgba(255,252,240,1)"],
      [0.16, "rgba(255,248,224,1)"],
      [0.34, "rgba(255,228,158,0.99)"],
      [0.54, "rgba(255,196,92,0.97)"],
      [0.76, "rgba(244,148,58,0.94)"],
      [1, "rgba(232,116,44,0.88)"],
    ]),
    1,
  );

  context.save();
  context.beginPath();
  const first = outline[0]!;
  context.moveTo(first[0], first[1]);
  for (let index = 1; index < outline.length; index += 1) {
    const point = outline[index]!;
    context.lineTo(point[0], point[1]);
  }
  context.closePath();
  context.clip();

  context.fillStyle = linear(
    context,
    center - base * 0.7,
    center - base * 0.7,
    center + base * 1.05,
    center + base * 1.05,
    [
      [0, "rgba(255,248,226,0)"],
      [0.42, `rgba(232,116,44,${alphaText(0.1 + rim * 0.1)})`],
      [1, `rgba(96,44,140,${alphaText(0.3 + rim * 0.38)})`],
    ],
  );
  context.fillRect(0, 0, CORE_TILE, CORE_TILE);

  for (const crackSpec of CORE_CRACKS) {
    drawCoreCrack(context, center, center, base, squash, phase, crackSpec, crackStrength, rim);
  }

  context.save();
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = clamp01(0.18 + 0.4 * glow);
  context.fillStyle = radial(context, center - base * 0.24, center - base * 0.3, 0, center - base * 0.24, center - base * 0.3, base * 0.8, [
    [0, "rgba(255,238,182,0.85)"],
    [1, "rgba(255,178,80,0)"],
  ]);
  context.fillRect(0, 0, CORE_TILE, CORE_TILE);
  context.globalAlpha = clamp01(0.45 + 0.5 * glow);
  fillEllipse(
    context,
    center - base * 0.26,
    center - base * 0.34,
    base * 0.2,
    base * 0.13,
    "rgba(255,252,242,1)",
    1,
    -0.5,
  );
  context.restore();
  context.restore();

  const rimColor = `rgba(${Math.round(lerp(232, 150, rim))},${Math.round(lerp(116, 96, rim))},${Math.round(lerp(44, 206, rim))},${alphaText((0.35 + 0.5 * rim) * (0.55 + 0.45 * glow))})`;
  strokePath(context, outline, rimColor, 2.4, true);

  for (let index = 0; index < CORE_PLATES.length; index += 1) {
    drawCorePlate(
      context,
      center,
      center,
      base,
      squash,
      phase,
      CORE_PLATES[index]!,
      separation,
      plateGain,
      index,
    );
  }
}

function drawCoreAtlas(context: CanvasRenderingContext2D): void {
  for (let frame = 0; frame < CORE_FRAMES; frame += 1) {
    context.save();
    context.translate(
      (frame % CORE_COLUMNS) * CORE_TILE,
      Math.floor(frame / CORE_COLUMNS) * CORE_TILE,
    );
    context.beginPath();
    context.rect(
      CORE_PADDING,
      CORE_PADDING,
      CORE_TILE - CORE_PADDING * 2,
      CORE_TILE - CORE_PADDING * 2,
    );
    context.clip();
    drawCoreFrame(context, frame);
    limitOpacity(context, CORE_TILE, CORE_GAINS[frame]!);
    context.restore();
  }
}

function drawFragment(context: CanvasRenderingContext2D): void {
  const cx = FRAGMENT_CENTER;
  const cy = FRAGMENT_CENTER;
  const hubX = cx + 4;
  const hubY = cy + 6;
  const shell: Point[] = [
    [cx, 15],
    [cx + 88, 88],
    [cx + 66, 212],
    [cx - 36, 226],
    [cx - 98, 152],
  ];
  const facets: readonly string[] = [
    "rgba(255,240,198,0.5)",
    "rgba(255,196,112,0.44)",
    "rgba(228,132,64,0.5)",
    "rgba(198,112,70,0.46)",
    "rgba(255,214,150,0.48)",
  ];

  fillPath(
    context,
    shell,
    linear(context, cx - 30, 12, cx + 40, 228, [
      [0, "rgba(255,248,226,0.99)"],
      [0.34, "rgba(255,214,140,0.95)"],
      [0.68, "rgba(255,178,80,0.9)"],
      [1, "rgba(226,120,52,0.86)"],
    ]),
    1,
  );

  for (let index = 0; index < shell.length; index += 1) {
    const from = shell[index]!;
    const to = shell[(index + 1) % shell.length]!;
    fillPath(context, [from, to, [hubX, hubY]], facets[index]!, 1);
    strokePath(context, [[hubX, hubY], from], "rgba(140,80,190,0.5)", 1.1, false);
  }

  fillEllipse(
    context,
    hubX,
    hubY,
    36,
    32,
    radial(context, hubX, hubY, 0, hubX, hubY, 36, [
      [0, "rgba(255,248,226,1)"],
      [0.42, "rgba(255,236,190,0.85)"],
      [1, "rgba(255,196,92,0)"],
    ]),
    1,
    -0.4,
  );

  strokePath(context, shell, "rgba(140,80,190,0.75)", 2.4, true);
  strokePath(context, [shell[0]!, shell[1]!], "rgba(255,214,140,0.8)", 1.6, false);
  strokePath(context, [shell[4]!, shell[0]!], "rgba(255,236,190,0.72)", 1.4, false);
}

function drawFlashRay(context: CanvasRenderingContext2D, spec: RaySpec): void {
  const angle = spec[0];
  const start = spec[1];
  const length = spec[2];
  const half = spec[3];
  const power = spec[4];
  const bend = spec[5];
  const tone = FLASH_TONES[spec[6]]!;
  const steps = 7;
  const spine: Point[] = [];
  const widths: number[] = [];
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  for (let index = 0; index < steps; index += 1) {
    const u = index / (steps - 1);
    const radius = start + length * u;
    const bow = bend * 26 * Math.sin(u * Math.PI);
    spine.push([
      FLASH_CENTER + dirX * radius - dirY * bow,
      FLASH_CENTER + dirY * radius + dirX * bow,
    ]);
    widths.push(half * (1 - 0.9 * u) * (0.42 + 0.58 * Math.sin(Math.PI * (0.14 + 0.86 * u))));
  }
  context.save();
  context.globalCompositeOperation = "lighter";
  fillPath(
    context,
    widthRibbon(spine, widths),
    linear(
      context,
      FLASH_CENTER + dirX * start,
      FLASH_CENTER + dirY * start,
      FLASH_CENTER + dirX * (start + length),
      FLASH_CENTER + dirY * (start + length),
      [
        [0, `rgba(${tone[0]},${tone[1]},${tone[2]},${alphaText(power * 0.5)})`],
        [0.3, `rgba(${tone[0]},${tone[1]},${tone[2]},${alphaText(power * 0.9)})`],
        [1, `rgba(${tone[0]},${tone[1]},${tone[2]},0)`],
      ],
    ),
    1,
  );
  context.restore();
}

function drawFlashChip(
  context: CanvasRenderingContext2D,
  spec: ChipSpec,
  index: number,
): void {
  const angle = spec[0];
  const distance = spec[1];
  const size = spec[2];
  const stretch = spec[3];
  const spin = spec[4];
  const tone = FLASH_TONES[spec[5]]!;
  const power = spec[6];
  const x = FLASH_CENTER + Math.cos(angle) * distance;
  const y = FLASH_CENTER + Math.sin(angle) * distance;
  const points = shardPoints(x, y, size, stretch, index * 1.71 + angle, spin + angle * 0.6);
  context.save();
  context.globalCompositeOperation = "lighter";
  fillPath(
    context,
    points,
    radial(context, x, y, size * 0.1, x, y, size * 1.25, [
      [0, `rgba(${tone[0]},${tone[1]},${tone[2]},${alphaText(power)})`],
      [0.6, `rgba(${tone[0]},${tone[1]},${tone[2]},${alphaText(power * 0.6)})`],
      [1, `rgba(${tone[0]},${tone[1]},${tone[2]},0)`],
    ]),
    1,
  );
  context.restore();
}

function drawFlashNotch(context: CanvasRenderingContext2D, spec: NotchSpec): void {
  const distance = spec[1];
  const size = spec[2];
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = clamp01(spec[3]);
  context.translate(
    FLASH_CENTER + Math.cos(spec[0]) * distance,
    FLASH_CENTER + Math.sin(spec[0]) * distance,
  );
  context.scale(size, size * spec[4]);
  context.fillStyle = radial(context, 0, 0, 0, 0, 0, 1, [
    [0, "rgba(255,255,255,1)"],
    [0.5, "rgba(255,255,255,0.66)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  context.beginPath();
  context.arc(0, 0, 1, 0, TAU);
  context.fill();
  context.restore();
}

function drawFlash(context: CanvasRenderingContext2D): void {
  context.fillStyle = radial(context, FLASH_CENTER, FLASH_CENTER, 0, FLASH_CENTER, FLASH_CENTER, 238, [
    [0, "rgba(255,255,255,1)"],
    [0.14, "rgba(255,255,255,0.99)"],
    [0.28, "rgba(255,214,140,0.95)"],
    [0.44, "rgba(255,138,60,0.75)"],
    [0.64, "rgba(150,90,210,0.5)"],
    [0.82, "rgba(128,76,190,0.24)"],
    [1, "rgba(112,66,178,0)"],
  ]);
  context.fillRect(0, 0, FLASH_SIZE, FLASH_SIZE);
  for (const ray of FLASH_RAYS) drawFlashRay(context, ray);
  for (let index = 0; index < FLASH_CHIPS.length; index += 1) {
    drawFlashChip(context, FLASH_CHIPS[index]!, index);
  }
  for (const notch of FLASH_NOTCHES) drawFlashNotch(context, notch);
  maskRadial(context, FLASH_SIZE, 200, 248);
}

function ringColor(t: number, strength: number): string {
  return `rgba(${Math.round(lerp(150, 255, t))},${Math.round(lerp(96, 206, t))},${Math.round(lerp(206, 132, t))},${alphaText(lerp(0.86, 1, t) * strength)})`;
}

function drawRingArc(
  context: CanvasRenderingContext2D,
  spec: RingArcSpec,
  phase: number,
): void {
  const start = spec[0];
  const end = spec[1];
  const radius = spec[2];
  const width = spec[3];
  const strength = spec[4];
  const wobble = spec[5];
  const freq = spec[6];
  const steps = 18;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const u = index / steps;
    const angle = start + (end - start) * u;
    const r = radius
      + wobble * Math.sin(u * Math.PI * freq + phase + radius * 0.05)
      + wobble * 0.42 * Math.sin(u * Math.PI * 3.3 + phase * 1.7 + angle);
    spine.push([RING_CENTER + Math.cos(angle) * r, RING_CENTER + Math.sin(angle) * r]);
    const taper = 0.5 + 0.5 * Math.pow(Math.sin(Math.PI * clamp01(0.04 + u * 0.92)), 0.62);
    widths.push(width * taper * (0.74 + 0.42 * Math.sin(u * Math.PI * 2.6 + phase * 1.3 + start)));
  }
  const segments = 6;
  for (let segment = 0; segment < segments; segment += 1) {
    const from = Math.floor((segment * steps) / segments);
    const to = Math.min(steps, Math.ceil(((segment + 1) * steps) / segments));
    const angleMid = start + (end - start) * (((from + to) * 0.5) / steps);
    const warm = 0.5 + 0.5 * Math.cos(angleMid - 0.7);
    fillPath(
      context,
      widthRibbon(spine.slice(from, to + 1), widths.slice(from, to + 1)),
      ringColor(warm, strength),
      1,
    );
  }
}

function drawRing(context: CanvasRenderingContext2D): void {
  for (let index = 0; index < RING_ARCS.length; index += 1) {
    drawRingArc(context, RING_ARCS[index]!, 0.6 + index * 0.7);
  }
  for (let index = 0; index < 56; index += 1) {
    const angle = index * 2.399963;
    const r = 184 + ((index * 37) % 48);
    const warm = 0.5 + 0.5 * Math.cos(angle - 0.7);
    context.fillStyle = ringColor(warm, 0.16 + (index % 5) * 0.03);
    context.beginPath();
    context.arc(
      RING_CENTER + Math.cos(angle) * r,
      RING_CENTER + Math.sin(angle) * r,
      0.9 + (index % 3) * 0.6,
      0,
      TAU,
    );
    context.fill();
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = index * 2.399963 + 0.4;
    const r = 202 + ((index * 29) % 36);
    const warm = 0.5 + 0.5 * Math.cos(angle - 0.7);
    const size = 4 + (index % 3) * 2.5;
    fillPath(
      context,
      shardPoints(
        RING_CENTER + Math.cos(angle) * r,
        RING_CENTER + Math.sin(angle) * r,
        size,
        0.68,
        index * 1.51,
        angle * 1.3,
      ),
      ringColor(warm, 0.2 + (index % 4) * 0.07),
      1,
    );
  }
  maskRadial(context, RING_SIZE, 226, 250);
  limitOpacity(context, RING_SIZE, 0.85);
}

function drawDustBlob(context: CanvasRenderingContext2D, spec: DustBlobSpec): void {
  const tone = DUST_TONES[spec[4]]!;
  const strength = spec[3];
  context.fillStyle = radial(context, spec[0], spec[1], 0, spec[0], spec[1], spec[2], [
    [0, `rgba(${tone[0]},${tone[1]},${tone[2]},${alphaText(strength)})`],
    [0.45, `rgba(${tone[0]},${tone[1]},${tone[2]},${alphaText(strength * 0.72)})`],
    [1, `rgba(${tone[0]},${tone[1]},${tone[2]},0)`],
  ]);
  context.fillRect(0, 0, DUST_SIZE, DUST_SIZE);
}

function drawDust(context: CanvasRenderingContext2D): void {
  for (const blob of DUST_BLOBS) drawDustBlob(context, blob);
  for (let index = 0; index < DUST_CLUMPS.length; index += 1) {
    const clump = DUST_CLUMPS[index]!;
    const tone = index % 5 === 4 ? DUST_TONES[3]! : index % 2 === 0 ? DUST_TONES[4]! : DUST_TONES[1]!;
    fillPath(
      context,
      shardPoints(clump[0], clump[1], clump[2], 0.78, index * 1.73, index * 0.9),
      `rgba(${tone[0]},${tone[1]},${tone[2]},${alphaText(clump[3])})`,
      1,
    );
  }
  for (let index = 0; index < 64; index += 1) {
    const angle = index * 2.399963;
    const r = 26 + ((index * 53) % 200);
    const pick = index % 9;
    context.fillStyle = pick === 3
      ? `rgba(232,150,100,${alphaText(0.14 + (index % 3) * 0.03)})`
      : pick === 6
        ? `rgba(150,96,206,${alphaText(0.08 + (index % 3) * 0.02)})`
        : `rgba(214,190,160,${alphaText(0.1 + (index % 4) * 0.03)})`;
    context.beginPath();
    context.arc(
      DUST_CENTER + Math.cos(angle) * r * 1.04,
      DUST_CENTER + Math.sin(angle) * r * 0.92,
      0.7 + (index % 4) * 0.5,
      0,
      TAU,
    );
    context.fill();
  }
  maskRadial(context, DUST_SIZE, 212, 254);
  limitOpacity(context, DUST_SIZE, 0.58);
}

function drawStreak(context: CanvasRenderingContext2D): void {
  const cy = STREAK_CENTER;
  const left = 7;
  const right = STREAK_SIZE - 7;
  const steps = 11;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index < steps; index += 1) {
    const u = index / (steps - 1);
    spine.push([left + (right - left) * u, cy]);
    widths.push(Math.max(1.1, 13.2 * Math.pow(Math.sin(Math.PI * Math.min(0.9995, u)), 0.62)));
  }
  fillPath(
    context,
    widthRibbon(spine, widths),
    linear(context, left, cy, right, cy, [
      [0.01, "rgba(255,178,96,0)"],
      [0.17, "rgba(255,178,96,0.15)"],
      [0.35, "rgba(255,204,146,0.62)"],
      [0.51, "rgba(255,248,226,1)"],
      [0.67, "rgba(255,196,120,0.6)"],
      [0.85, "rgba(255,178,96,0.09)"],
      [1, "rgba(255,178,96,0)"],
    ]),
    1,
  );
}

function createTexture(
  name: string,
  size: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const texture = createCanvasTexture(size, size, draw);
  texture.name = `ColapsoElemental.${name}`;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
}

export class ColapsoElementalTextures {
  readonly core: CanvasTexture;
  readonly fragment: CanvasTexture;
  readonly flash: CanvasTexture;
  readonly ring: CanvasTexture;
  readonly dust: CanvasTexture;
  readonly streak: CanvasTexture;

  constructor() {
    this.core = createTexture("core", CORE_ATLAS, drawCoreAtlas);
    this.fragment = createTexture("fragment", FRAGMENT_SIZE, drawFragment);
    this.flash = createTexture("flash", FLASH_SIZE, drawFlash);
    this.ring = createTexture("ring", RING_SIZE, drawRing);
    this.dust = createTexture("dust", DUST_SIZE, drawDust);
    this.streak = createTexture("streak", STREAK_SIZE, drawStreak);
  }

  dispose(): void {
    this.core.dispose();
    this.fragment.dispose();
    this.flash.dispose();
    this.ring.dispose();
    this.dust.dispose();
    this.streak.dispose();
  }
}

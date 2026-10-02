import { ClampToEdgeWrapping, type CanvasTexture } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type Point = readonly [number, number];
type Fill = string | CanvasGradient;
type Stops = ReadonlyArray<readonly [number, string]>;
type EmberPose = readonly [number, number, number, number, number, number, number, number];
type CrackSpec = readonly [number, number, number, number, number, number];
type ChannelSpec = readonly [number, number, number, number, number];
type ShardSpec = readonly [number, number, number, number, number];
type DustSpec = readonly [number, number, number, number, number];
type RaySpec = readonly [number, number, number, number, number];
type ChipSpec = readonly [number, number, number, number, number, number];
type NotchSpec = readonly [number, number, number, number, number];
type LobeSpec = readonly [number, number, number, number];
type SmokeBlobSpec = readonly [number, number, number, number, number];
type SmokeClumpSpec = readonly [number, number, number, number, number];
type FissureSpec = readonly [number, number, number, number, number, number];
type ChunkSpec = readonly [number, number, number, number, number];
type PatchSpec = readonly [number, number, number, number, number, number];

const TAU = Math.PI * 2;

const EMBER_TILE = 256;
const EMBER_PADDING = 8;
const EMBER_COLUMNS = 4;
const EMBER_FRAMES = 16;
const EMBER_ATLAS = EMBER_TILE * EMBER_COLUMNS;
const EMBER_CENTER = EMBER_TILE * 0.5;
const EMBER_STEPS = 30;
const EMBER_REACH = 116;
const EMBER_SHARD_BASE = 84;
const EMBER_DUST_BASE = 78;

const FLASH_SIZE = 512;
const FLASH_CENTER = FLASH_SIZE * 0.5;
const FLASH_REACH = 240;
const FLASH_MASK = 248;

const SMOKE_SIZE = 512;
const SMOKE_CENTER = SMOKE_SIZE * 0.5;

const SPARK_SIZE = 64;
const SPARK_CENTER = SPARK_SIZE * 0.5;

const SCORCH_SIZE = 512;
const SCORCH_CENTER = SCORCH_SIZE * 0.5;
const SCORCH_RADIUS = 128;

const SMOKE_TONES: readonly (readonly [number, number, number])[] = [
  [74, 58, 46],
  [96, 76, 60],
  [62, 48, 38],
  [58, 44, 36],
  [52, 40, 32],
  [120, 98, 80],
];

const EMBER_POSES: readonly EmberPose[] = [
  [46, 40, 0, 0.02, 0, 0, 0.7, 0.3],
  [56, 48, 2, 0.16, 0, 0, 0.82, 0.45],
  [64, 56, -1, 0.3, 0, 1, 0.92, 0.6],
  [70, 62, 4, 0.44, 0.05, 2, 0.98, 0.72],
  [78, 72, 3, 0.68, 0.1, 2, 1, 0.88],
  [84, 78, 6, 0.86, 0.12, 3, 1, 1.02],
  [86, 82, 2, 0.96, 0.14, 3, 1, 1.12],
  [88, 80, -5, 0.98, 0.18, 4, 1, 1.18],
  [92, 74, -7, 0.94, 0.3, 4, 0.96, 1.08],
  [94, 66, -9, 0.9, 0.42, 5, 0.9, 0.98],
  [86, 78, 8, 0.86, 0.52, 5, 0.82, 0.92],
  [78, 88, 10, 0.8, 0.6, 6, 0.72, 0.84],
  [64, 70, 11, 0.66, 0.72, 7, 0.58, 0.7],
  [52, 56, 7, 0.52, 0.84, 8, 0.44, 0.56],
  [40, 44, 3, 0.38, 0.94, 9, 0.3, 0.42],
  [30, 34, -3, 0.26, 1, 10, 0.2, 0.3],
];

const EMBER_CRACKS: readonly CrackSpec[] = [
  [-2.24, 0.1, 0.84, 2.6, 0.7, 0.4],
  [-1.36, 0.16, 0.9, 2.2, -0.6, 0.54],
  [-0.48, 0.08, 0.76, 2.9, 0.85, 0.26],
  [0.42, 0.2, 0.88, 2.1, -0.75, 0.34],
  [1.32, 0.12, 0.82, 2.5, 0.6, 0.48],
  [2.18, 0.18, 0.94, 2.3, -0.5, 0.6],
  [2.92, 0.1, 0.72, 2.7, 0.9, 0.44],
  [3.06, 0.22, 0.86, 1.9, -0.85, 0.7],
  [3.86, 0.14, 0.8, 2.4, 0.65, 0.66],
  [4.62, 0.18, 0.9, 2.2, -0.7, 0.36],
  [5.42, 0.09, 0.78, 2.8, 0.8, 0.52],
  [5.94, 0.2, 0.84, 2, -0.62, 0.64],
];

const EMBER_CHANNELS: readonly ChannelSpec[] = [
  [-1.18, -0.18, 0.86, 10, 0.5],
  [0.74, 0.22, 0.92, 8, -0.6],
  [2.36, -0.1, 0.78, 9, 0.45],
];

const EMBER_SHARDS: readonly ShardSpec[] = [
  [-0.42, 0.86, 15, 0.82, 0.92],
  [0.36, 0.94, 12, 0.9, 0.86],
  [1.18, 0.8, 14, 0.74, 0.9],
  [1.94, 1, 10, 0.96, 0.78],
  [2.62, 0.84, 13, 0.8, 0.84],
  [3.36, 0.92, 11, 0.88, 0.8],
  [4.12, 0.78, 15, 0.72, 0.88],
  [4.86, 0.98, 9.5, 0.94, 0.74],
  [5.52, 0.88, 12.5, 0.84, 0.82],
  [5.98, 0.74, 10.5, 0.78, 0.7],
];

const EMBER_CHIPS: readonly NotchSpec[] = [
  [-2.42, 0.94, 9, 0.5, 1.3],
  [-1.02, 1.02, 7.5, 0.44, 1.1],
  [0.36, 0.98, 8.5, 0.5, 1.25],
  [1.72, 0.92, 6.5, 0.4, 1.05],
  [2.84, 1, 9.5, 0.46, 1.35],
  [4.16, 0.9, 7, 0.42, 1.15],
  [5.24, 0.96, 8, 0.48, 1.2],
];

const EMBER_SPECKS: readonly DustSpec[] = [
  [-2.6, 1.06, 3.1, 0.8, 1],
  [-1.9, 1.12, 2.2, 0.6, 0],
  [-0.7, 1.1, 2.6, 0.7, 1],
  [0.24, 1.02, 2, 0.5, 0],
  [0.96, 1.12, 3.4, 0.75, 1],
  [1.86, 1.06, 2.4, 0.55, 0],
  [2.72, 1.1, 2.9, 0.65, 1],
  [3.54, 1.04, 2.1, 0.5, 0],
  [4.36, 1.12, 3.2, 0.7, 1],
  [5.18, 1.08, 2.5, 0.6, 0],
  [5.86, 1.1, 2.8, 0.62, 1],
];

const FLASH_RAYS: readonly RaySpec[] = [
  [-0.36, 96, 74, 16, 0.6],
  [0.48, 100, 92, 18, 0.52],
  [1.24, 92, 66, 13, 0.46],
  [2.02, 104, 98, 20, 0.56],
  [2.76, 94, 72, 14, 0.48],
  [3.44, 98, 86, 17, 0.54],
  [4.18, 90, 60, 12, 0.44],
  [4.94, 102, 84, 15, 0.5],
  [5.66, 94, 68, 13, 0.42],
];

const FLASH_LOBES: readonly LobeSpec[] = [
  [-2.28, 58, 120, 0.3],
  [0.86, 74, 104, 0.26],
  [2.62, 52, 132, 0.28],
  [4.26, 66, 96, 0.22],
  [-0.34, 34, 152, 0.2],
];

const FLASH_CHIPS: readonly ChipSpec[] = [
  [-2.86, 152, 13, 0.7, 0.62, 0.4],
  [-1.68, 176, 10, 0.84, 0.5, 1.1],
  [-0.52, 194, 8, 0.66, 0.44, 2.2],
  [0.62, 164, 12, 0.9, 0.58, 0.8],
  [1.74, 200, 9, 0.6, 0.48, 1.7],
  [2.9, 158, 14, 0.86, 0.66, 0.2],
  [3.72, 186, 10, 0.64, 0.52, 2.6],
  [4.58, 170, 12, 0.8, 0.6, 1.4],
  [5.44, 198, 9, 0.58, 0.46, 0.9],
];

const FLASH_NOTCHES: readonly NotchSpec[] = [
  [-2.62, 168, 36, 0.46, 1.6],
  [-1.14, 186, 30, 0.4, 1.3],
  [0.18, 174, 40, 0.48, 1.8],
  [1.42, 192, 26, 0.34, 1.2],
  [2.58, 180, 32, 0.44, 1.5],
  [3.86, 198, 24, 0.32, 1.1],
  [5.06, 172, 34, 0.42, 1.4],
  [-0.62, 154, 30, 0.36, 1.2],
  [4.44, 164, 28, 0.34, 1.3],
];

const SMOKE_BLOBS: readonly SmokeBlobSpec[] = [
  [254, 266, 104, 0.5, 0],
  [208, 248, 86, 0.44, 1],
  [304, 252, 94, 0.46, 2],
  [232, 318, 80, 0.42, 3],
  [294, 328, 76, 0.38, 3],
  [198, 300, 72, 0.36, 2],
  [330, 302, 68, 0.34, 1],
  [256, 212, 90, 0.42, 5],
  [288, 188, 72, 0.32, 5],
  [216, 196, 66, 0.3, 1],
  [252, 362, 64, 0.32, 4],
  [182, 258, 58, 0.28, 4],
  [340, 256, 56, 0.26, 3],
  [258, 160, 56, 0.22, 5],
  [222, 352, 54, 0.26, 4],
  [300, 214, 60, 0.28, 2],
  [176, 208, 40, 0.24, 2],
  [168, 312, 36, 0.26, 4],
  [214, 372, 42, 0.24, 4],
  [286, 376, 38, 0.22, 3],
  [346, 330, 34, 0.24, 3],
  [352, 200, 32, 0.2, 2],
  [310, 162, 38, 0.22, 5],
  [206, 166, 42, 0.24, 5],
  [166, 254, 34, 0.2, 4],
  [252, 138, 44, 0.2, 5],
  [318, 372, 30, 0.2, 4],
  [188, 366, 32, 0.2, 4],
  [415, 309, 40, 0.3, 3],
  [329, 416, 34, 0.26, 4],
  [201, 408, 38, 0.28, 4],
  [104, 332, 30, 0.24, 4],
  [104, 212, 36, 0.26, 2],
  [157, 115, 32, 0.22, 2],
  [281, 94, 40, 0.24, 5],
  [372, 161, 34, 0.22, 5],
  [371, 389, 28, 0.22, 3],
  [155, 388, 30, 0.24, 4],
];

const SMOKE_CLUMPS: readonly SmokeClumpSpec[] = [
  [222, 286, 22, 0.68, 2],
  [286, 300, 17, 0.62, 3],
  [258, 238, 26, 0.6, 0],
  [200, 320, 15, 0.58, 4],
  [312, 246, 19, 0.62, 1],
  [246, 342, 16, 0.56, 4],
  [296, 190, 15, 0.5, 5],
  [264, 268, 30, 0.55, 0],
  [214, 230, 13, 0.5, 2],
  [322, 316, 14, 0.5, 3],
  [176, 246, 18, 0.56, 4],
  [188, 342, 14, 0.5, 4],
  [306, 344, 13, 0.48, 3],
  [330, 216, 12, 0.46, 2],
  [238, 172, 16, 0.52, 5],
  [286, 152, 12, 0.44, 5],
  [392, 292, 16, 0.52, 4],
  [348, 388, 13, 0.46, 3],
  [222, 386, 15, 0.5, 4],
  [124, 296, 14, 0.48, 4],
  [130, 216, 12, 0.44, 2],
  [186, 140, 13, 0.46, 5],
  [298, 128, 15, 0.5, 5],
  [354, 186, 12, 0.42, 5],
];

const SCORCH_PATCHES: readonly PatchSpec[] = [
  [148, 372, 34, 26, 0.8, 0.06],
  [368, 356, 30, 24, 2.1, 0.05],
  [392, 206, 26, 20, 3.4, 0.05],
  [132, 176, 24, 18, 4.6, 0.04],
  [268, 132, 22, 17, 5.5, 0.04],
  [300, 402, 20, 16, 1.4, 0.04],
];

const SCORCH_FISSURES: readonly FissureSpec[] = [
  [-0.42, 0.12, 0.88, 3.2, 0.55, 0.8],
  [0.34, 0.2, 0.8, 2.6, 0.4, -0.7],
  [1.12, 0.08, 0.9, 3.6, 0.6, 0.6],
  [1.86, 0.24, 0.76, 2.2, 0.35, -0.9],
  [2.54, 0.1, 0.86, 3, 0.5, 0.75],
  [3.28, 0.18, 0.9, 2.8, 0.45, -0.65],
  [4.02, 0.06, 0.8, 3.4, 0.6, 0.85],
  [4.74, 0.16, 0.88, 2.4, 0.38, -0.8],
  [5.46, 0.22, 0.78, 2.6, 0.52, 0.7],
  [5.94, 0.14, 0.84, 2.9, 0.42, -0.75],
];

const SCORCH_CHUNKS: readonly ChunkSpec[] = [
  [214, 232, 17, 0.72, 0.8],
  [286, 244, 13, 0.86, 0.2],
  [252, 292, 19, 0.64, 0.75],
  [222, 306, 11, 0.8, 0.25],
  [300, 300, 15, 0.7, 0.85],
  [276, 206, 12, 0.92, 0.3],
  [236, 268, 21, 0.6, 0.7],
  [312, 268, 10, 0.84, 0.35],
  [268, 330, 14, 0.66, 0.8],
  [200, 280, 12, 0.78, 0.25],
  [290, 350, 9, 0.7, 0.7],
  [326, 236, 11, 0.62, 0.35],
  [246, 200, 10, 0.88, 0.75],
  [288, 316, 8, 0.74, 0.3],
];

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function radial(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  stops: Stops,
): CanvasGradient {
  const fill = context.createRadialGradient(cx, cy, inner, cx, cy, outer);
  for (const [offset, color] of stops) fill.addColorStop(offset, color);
  return fill;
}

function radialTilted(
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

function gradient(
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

function traceSmoothPath(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  move: boolean,
): void {
  const first = points[0]!;
  if (move) context.moveTo(first[0], first[1]);
  else context.lineTo(first[0], first[1]);
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)]!;
    const current = points[index]!;
    const next = points[index + 1]!;
    const following = points[Math.min(points.length - 1, index + 2)]!;
    context.bezierCurveTo(
      current[0] + (next[0] - previous[0]) / 6,
      current[1] + (next[1] - previous[1]) / 6,
      next[0] - (following[0] - current[0]) / 6,
      next[1] - (following[1] - current[1]) / 6,
      next[0],
      next[1],
    );
  }
}

function traceFacetPath(context: CanvasRenderingContext2D, points: readonly Point[]): void {
  const first = points[0]!;
  context.moveTo(first[0], first[1]);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!;
    context.lineTo(point[0], point[1]);
  }
}

function tracePolyline(context: CanvasRenderingContext2D, points: readonly Point[]): void {
  context.beginPath();
  traceFacetPath(context, points);
}

function paintShape(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: Fill,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = clamp01(alpha);
  context.fillStyle = fill;
  context.beginPath();
  traceSmoothPath(context, points, true);
  context.closePath();
  context.fill();
  context.restore();
}

function paintFacet(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: Fill,
  alpha = 1,
  edge: string | null = null,
  edgeWidth = 1.4,
): void {
  context.save();
  context.globalAlpha = clamp01(alpha);
  context.fillStyle = fill;
  context.beginPath();
  traceFacetPath(context, points);
  context.closePath();
  context.fill();
  if (edge !== null) {
    context.strokeStyle = edge;
    context.lineWidth = edgeWidth;
    context.lineJoin = "round";
    context.stroke();
  }
  context.restore();
}

function paintEllipse(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: Fill,
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

function strokeShape(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  color: string,
  width: number,
  smooth = true,
): void {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();
  if (smooth) traceSmoothPath(context, points, true);
  else traceFacetPath(context, points);
  context.closePath();
  context.stroke();
  context.restore();
}

function eraseShape(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  alpha: number,
): void {
  if (alpha <= 0.01) return;
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = clamp01(alpha);
  context.fillStyle = "#ffffff";
  context.beginPath();
  traceSmoothPath(context, points, true);
  context.closePath();
  context.fill();
  context.restore();
}

function eraseBlob(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha: number,
): void {
  if (alpha <= 0.01) return;
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = clamp01(alpha);
  context.translate(cx, cy);
  context.scale(Math.max(0.5, rx), Math.max(0.5, ry));
  context.fillStyle = radial(context, 0, 0, 0, 1, [
    [0, "rgba(255,255,255,1)"],
    [0.46, "rgba(255,255,255,0.72)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  context.beginPath();
  context.arc(0, 0, 1, 0, TAU);
  context.fill();
  context.restore();
}

function limitOpacity(
  context: CanvasRenderingContext2D,
  size: number,
  opacity: number,
): void {
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = `rgba(255,255,255,${clamp01(opacity)})`;
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
  const mask = radial(context, center, center, 0, fade, [
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
  const count = 5;
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = rotation + (index / count) * TAU;
    const radius = size * (0.6 + 0.55 * Math.abs(Math.sin(index * 1.7 + seed)));
    points.push([
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius * stretch,
    ]);
  }
  return points;
}

function emberOutline(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lean: number,
  phase: number,
  facet: number,
): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < EMBER_STEPS; index += 1) {
    const angle = (index / EMBER_STEPS) * TAU;
    const lobe = 1
      + 0.13 * Math.sin(angle * 2 + phase * 1.31 + 0.7)
      + 0.09 * Math.sin(angle * 3 - phase * 0.97 + 2.1)
      + 0.062 * Math.sin(angle * 5 + phase * 1.63 + 4.3)
      + 0.04 * Math.sin(angle * 7 - phase * 1.19 + 1.2);
    const facetWave = facet * 0.052 * Math.sin(angle * 11 + phase * 2.27 + 0.4);
    const notch = facet * 0.03 * Math.sin(index * 2.399963 + phase * 3.1);
    const radius = lobe + facetWave + notch;
    const lift = Math.pow(Math.max(0, -Math.sin(angle)), 1.4);
    points.push([
      cx + Math.cos(angle) * rx * radius + lean * lift,
      cy + Math.sin(angle) * ry * radius * (1 + 0.05 * Math.sin(angle * 3 - phase)),
    ]);
  }
  return fitPoints(points, cx, cy, EMBER_REACH);
}

function emberCrackPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  spec: CrackSpec,
): Point[] {
  const angle = spec[0];
  const start = spec[1] + 0.16;
  const reach = spec[2];
  const bend = spec[4];
  const steps = 7;
  const points: Point[] = [];
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  for (let step = 0; step <= steps; step += 1) {
    const u = step / steps;
    const radius = start + (reach - start) * u;
    const wobble = bend * Math.sin(u * Math.PI * 1.7 + angle * 2.1) * (0.25 + 0.75 * u);
    points.push([
      cx + dirX * radius * rx - dirY * wobble * rx * 0.26,
      cy + dirY * radius * ry + dirX * wobble * ry * 0.26,
    ]);
  }
  return points;
}

function drawEmberCrack(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  spec: CrackSpec,
  strength: number,
): void {
  const span = Math.max(0.001, 1 - spec[5]);
  const active = clamp01((strength - spec[5]) / span);
  if (active <= 0.02) return;
  const points = emberCrackPoints(cx, cy, rx, ry, spec);
  const width = spec[3];
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = `rgba(209,58,28,${clamp01(active * 0.55)})`;
  context.lineWidth = width * 2.6;
  tracePolyline(context, points);
  context.stroke();
  context.strokeStyle = `rgba(255,138,43,${clamp01(active * 0.82)})`;
  context.lineWidth = width * 1.35;
  tracePolyline(context, points);
  context.stroke();
  context.strokeStyle = `rgba(255,199,90,${clamp01((0.6 + 0.3 * strength) * active)})`;
  context.lineWidth = width * 0.7;
  tracePolyline(context, points);
  context.stroke();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = `rgba(255,244,214,${clamp01(active * 0.5)})`;
  context.lineWidth = Math.max(0.7, width * 0.34);
  tracePolyline(context, points);
  context.stroke();
  context.restore();
  const node = points[Math.floor(points.length * 0.62)]!;
  paintEllipse(
    context,
    node[0],
    node[1],
    width * 0.9,
    width * 0.74,
    `rgba(255,236,180,${clamp01(active * 0.8)})`,
    1,
    spec[0],
  );
}

function channelSpine(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  spec: ChannelSpec,
  phase: number,
): Point[] {
  const angle = spec[0];
  const offset = spec[1];
  const length = spec[2];
  const bow = spec[4];
  const steps = 7;
  const points: Point[] = [];
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  for (let index = 0; index < steps; index += 1) {
    const u = index / (steps - 1);
    const travel = (u - 0.5) * length * 2;
    const drift = offset + bow * Math.sin(u * Math.PI) * 0.24 + 0.05 * Math.sin(u * 4.1 + phase);
    points.push([
      cx + dirX * travel * rx - dirY * drift * rx,
      cy + dirY * travel * ry + dirX * drift * ry,
    ]);
  }
  return points;
}

function channelWidths(base: number, split: number): number[] {
  const steps = 7;
  const widths: number[] = [];
  for (let index = 0; index < steps; index += 1) {
    const u = index / (steps - 1);
    widths.push(
      base
        * (0.22 + 0.78 * Math.pow(Math.sin(Math.PI * clamp01(u)), 0.6))
        * (0.9 + split * 0.3),
    );
  }
  return widths;
}

function drawEmberChannels(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  split: number,
  phase: number,
): void {
  for (const spec of EMBER_CHANNELS) {
    const spine = channelSpine(cx, cy, rx, ry, spec, phase);
    const widths = channelWidths(spec[3], split);
    paintShape(
      context,
      widthRibbon(spine, widths),
      `rgba(26,18,14,${clamp01(0.3 + 0.5 * split)})`,
      1,
    );
    paintShape(
      context,
      widthRibbon(spine, widths.map((width) => width * 0.34)),
      `rgba(255,138,43,${clamp01(0.6 * split)})`,
      1,
    );
    if (split > 0.72) {
      eraseShape(
        context,
        widthRibbon(spine, widths.map((width) => width * 1.12)),
        clamp01((split - 0.72) * 3),
      );
    }
  }
}

function drawEmberEdgeChips(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  facet: number,
  phase: number,
): void {
  const rise = clamp01((facet - 0.35) / 0.65);
  for (const chip of EMBER_CHIPS) {
    const distance = chip[1] * (0.9 + 0.12 * Math.sin(phase + chip[0] * 1.7));
    eraseBlob(
      context,
      cx + Math.cos(chip[0]) * rx * distance,
      cy + Math.sin(chip[0]) * ry * distance,
      chip[2] * (0.8 + 0.4 * rise),
      chip[2] * chip[4],
      clamp01(chip[3] * rise),
    );
  }
}

function drawEmberSpecks(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  strength: number,
  split: number,
  phase: number,
): void {
  const travel = 0.94 + 0.2 * clamp01(split);
  for (const speck of EMBER_SPECKS) {
    const distance = speck[1] * travel * EMBER_DUST_BASE * (1 + 0.04 * Math.sin(phase * 1.7 + speck[0] * 2.3));
    const warm = speck[4] > 0.5;
    const alpha = clamp01(speck[3] * (warm ? strength : 0.6 + 0.4 * split));
    if (alpha <= 0.03) continue;
    paintEllipse(
      context,
      cx + Math.cos(speck[0]) * distance,
      cy + Math.sin(speck[0]) * distance,
      speck[2],
      speck[2] * 0.82,
      warm ? `rgba(255,199,90,${alpha})` : `rgba(58,42,32,${alpha})`,
      1,
      speck[0],
    );
  }
}

function drawEmberShard(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spec: ShardSpec,
  split: number,
  phase: number,
  index: number,
): void {
  const angle = spec[0];
  const separation = 0.88 + 0.3 * clamp01(split);
  const size = spec[2] * (0.85 + 0.2 * clamp01(split));
  const alpha = clamp01(spec[4] * (0.55 + 0.45 * clamp01(split * 1.5)));
  if (alpha <= 0.04) return;
  const x = cx + Math.cos(angle) * EMBER_SHARD_BASE * spec[1] * separation;
  const y = cy + Math.sin(angle) * EMBER_SHARD_BASE * spec[1] * separation;
  const points = shardPoints(
    x,
    y,
    size,
    spec[3],
    index * 1.37 + phase,
    angle * 1.9 + phase * 0.7,
  );
  paintFacet(
    context,
    points,
    radialTilted(
      context,
      x - size * 0.2,
      y - size * 0.26,
      size * 0.08,
      x,
      y,
      size * 1.2,
      [
        [0, `rgba(255,250,232,${alpha})`],
        [0.38, `rgba(255,236,196,${alpha * 0.98})`],
        [0.74, `rgba(255,199,90,${alpha * 0.88})`],
        [1, `rgba(255,138,43,${alpha * 0.5})`],
      ],
    ),
    1,
    `rgba(255,138,43,${clamp01(alpha * 0.7)})`,
    1.2,
  );
}

function drawEmberFrame(context: CanvasRenderingContext2D, frame: number): void {
  const pose = EMBER_POSES[frame]!;
  const rx = pose[0];
  const ry = pose[1];
  const lean = pose[2];
  const strength = pose[3];
  const split = pose[4];
  const shardCount = pose[5];
  const gain = pose[6];
  const facet = pose[7];
  const phase = frame * 0.61;
  const center = EMBER_CENTER;
  const outline = emberOutline(center, center, rx, ry, lean, phase, facet);
  const bodyAlpha = 0.92 + 0.06 * clamp01(strength);
  const shadeAlpha = 0.5 + 0.25 * clamp01(split * 1.4);

  paintShape(
    context,
    outline,
    radialTilted(
      context,
      center - rx * 0.28,
      center - ry * 0.42,
      rx * 0.1,
      center,
      center + ry * 0.2,
      rx * 1.44,
      [
        [0, `rgba(255,252,238,${bodyAlpha})`],
        [0.2, `rgba(255,245,216,${bodyAlpha})`],
        [0.45, `rgba(255,236,196,${bodyAlpha})`],
        [0.72, `rgba(255,221,170,${bodyAlpha * 0.96})`],
        [1, `rgba(246,196,138,${bodyAlpha * 0.9})`],
      ],
    ),
    1,
  );

  context.save();
  context.beginPath();
  traceSmoothPath(context, outline, true);
  context.closePath();
  context.clip();

  context.fillStyle = gradient(context, center, center, center, center + ry * 1.3, [
    [0, "rgba(58,42,32,0)"],
    [0.4, `rgba(58,42,32,${shadeAlpha * 0.5})`],
    [1, `rgba(44,32,24,${shadeAlpha})`],
  ]);
  context.fillRect(0, 0, EMBER_TILE, EMBER_TILE);

  for (const spec of EMBER_CRACKS) {
    drawEmberCrack(context, center, center, rx, ry, spec, strength);
  }

  context.globalCompositeOperation = "lighter";
  context.globalAlpha = clamp01(0.06 + 0.16 * strength);
  context.fillStyle = radial(context, center - rx * 0.2, center - ry * 0.3, 0, rx * 0.95, [
    [0, "rgba(255,196,110,1)"],
    [1, "rgba(255,138,43,0)"],
  ]);
  context.fillRect(0, 0, EMBER_TILE, EMBER_TILE);
  context.globalAlpha = clamp01(0.35 + 0.5 * strength);
  paintEllipse(
    context,
    center - rx * 0.26,
    center - ry * 0.36,
    rx * 0.17,
    ry * 0.12,
    "rgba(255,252,236,1)",
    1,
    -0.5,
  );
  paintEllipse(
    context,
    center - rx * 0.3,
    center - ry * 0.42,
    rx * 0.08,
    ry * 0.055,
    "rgba(255,255,250,1)",
    1,
    -0.5,
  );
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";

  if (split > 0.02) drawEmberChannels(context, center, center, rx, ry, split, phase);

  context.restore();

  if (facet > 0.35) drawEmberEdgeChips(context, center, center, rx, ry, facet, phase);

  const rimAlpha = clamp01((0.75 + 0.2 * clamp01(strength)) * clamp01(strength * 1.7));
  if (rimAlpha > 0.03) {
    strokeShape(context, outline, `rgba(255,138,43,${rimAlpha})`, 2.9);
  }

  drawEmberSpecks(context, center, center, strength, split, phase);

  const visible = Math.min(shardCount, EMBER_SHARDS.length);
  for (let index = 0; index < visible; index += 1) {
    drawEmberShard(
      context,
      center,
      center,
      EMBER_SHARDS[index]!,
      split,
      phase,
      index,
    );
  }

  limitOpacity(context, EMBER_TILE, gain);
}

function drawEmber(context: CanvasRenderingContext2D): void {
  for (let frame = 0; frame < EMBER_FRAMES; frame += 1) {
    context.save();
    context.translate(
      (frame % EMBER_COLUMNS) * EMBER_TILE,
      Math.floor(frame / EMBER_COLUMNS) * EMBER_TILE,
    );
    context.beginPath();
    context.rect(
      EMBER_PADDING,
      EMBER_PADDING,
      EMBER_TILE - EMBER_PADDING * 2,
      EMBER_TILE - EMBER_PADDING * 2,
    );
    context.clip();
    drawEmberFrame(context, frame);
    context.restore();
  }
}

function drawFlashRay(context: CanvasRenderingContext2D, spec: RaySpec): void {
  const angle = spec[0];
  const start = spec[1];
  const length = spec[2];
  const half = spec[3];
  const alpha = clamp01(spec[4]);
  const steps = 6;
  const spine: Point[] = [];
  const widths: number[] = [];
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  for (let index = 0; index < steps; index += 1) {
    const u = index / (steps - 1);
    const radius = start + length * u;
    const bow = 10 * Math.sin(u * Math.PI) * Math.sin(angle * 1.9 + 0.6);
    spine.push([
      FLASH_CENTER + dirX * radius - dirY * bow,
      FLASH_CENTER + dirY * radius + dirX * bow,
    ]);
    widths.push(half * (1 - 0.92 * u) * (0.4 + 0.6 * Math.sin(Math.PI * (0.16 + 0.84 * u))));
  }
  context.save();
  context.globalCompositeOperation = "lighter";
  paintShape(
    context,
    widthRibbon(spine, widths),
    gradient(
      context,
      FLASH_CENTER + dirX * start,
      FLASH_CENTER + dirY * start,
      FLASH_CENTER + dirX * (start + length),
      FLASH_CENTER + dirY * (start + length),
      [
        [0, `rgba(255,236,170,${alpha})`],
        [0.42, `rgba(255,199,90,${clamp01(alpha * 0.7)})`],
        [1, "rgba(255,138,43,0)"],
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
  const size = spec[2];
  const alpha = clamp01(spec[4]);
  const x = FLASH_CENTER + Math.cos(angle) * spec[1];
  const y = FLASH_CENTER + Math.sin(angle) * spec[1];
  const points = shardPoints(
    x,
    y,
    size,
    spec[3],
    index * 1.71 + angle,
    spec[5] + angle * 0.6,
  );
  context.save();
  context.globalCompositeOperation = "lighter";
  paintFacet(
    context,
    points,
    radial(context, x, y, size * 0.1, size * 1.2, [
      [0, `rgba(255,244,214,${alpha})`],
      [0.55, `rgba(255,199,90,${clamp01(alpha * 0.7)})`],
      [1, "rgba(255,138,43,0)"],
    ]),
    1,
  );
  context.restore();
}

function drawFlashNotch(context: CanvasRenderingContext2D, spec: NotchSpec): void {
  eraseBlob(
    context,
    FLASH_CENTER + Math.cos(spec[0]) * spec[1],
    FLASH_CENTER + Math.sin(spec[0]) * spec[1],
    spec[2],
    spec[2] * spec[4],
    spec[3],
  );
}

function drawFlash(context: CanvasRenderingContext2D): void {
  context.fillStyle = radialTilted(
    context,
    FLASH_CENTER - 24,
    FLASH_CENTER - 30,
    0,
    FLASH_CENTER,
    FLASH_CENTER,
    FLASH_REACH,
    [
      [0, "rgba(255,248,226,1)"],
      [0.09, "rgba(255,242,206,0.99)"],
      [0.2, "rgba(255,217,142,0.96)"],
      [0.33, "rgba(255,199,90,0.92)"],
      [0.5, "rgba(255,138,43,0.7)"],
      [0.68, "rgba(209,58,28,0.35)"],
      [0.85, "rgba(160,44,20,0.14)"],
      [1, "rgba(120,30,12,0)"],
    ],
  );
  context.fillRect(0, 0, FLASH_SIZE, FLASH_SIZE);
  context.save();
  context.globalCompositeOperation = "lighter";
  for (const lobe of FLASH_LOBES) {
    context.fillStyle = radial(
      context,
      FLASH_CENTER + Math.cos(lobe[0]) * lobe[1],
      FLASH_CENTER + Math.sin(lobe[0]) * lobe[1],
      0,
      lobe[2],
      [
        [0, `rgba(255,150,52,${lobe[3]})`],
        [1, "rgba(255,120,40,0)"],
      ],
    );
    context.fillRect(0, 0, FLASH_SIZE, FLASH_SIZE);
  }
  context.restore();
  for (const ray of FLASH_RAYS) drawFlashRay(context, ray);
  for (let index = 0; index < FLASH_CHIPS.length; index += 1) {
    drawFlashChip(context, FLASH_CHIPS[index]!, index);
  }
  for (const notch of FLASH_NOTCHES) drawFlashNotch(context, notch);
  maskRadial(context, FLASH_SIZE, 196, FLASH_MASK);
}

function drawSmokeBlob(context: CanvasRenderingContext2D, spec: SmokeBlobSpec): void {
  const tone = SMOKE_TONES[spec[4]]!;
  const alpha = clamp01(spec[3]);
  context.fillStyle = radial(context, spec[0], spec[1], 0, spec[2], [
    [0, `rgba(${tone[0]},${tone[1]},${tone[2]},${alpha})`],
    [0.44, `rgba(${tone[0]},${tone[1]},${tone[2]},${alpha * 0.74})`],
    [
      0.76,
      `rgba(${Math.max(0, tone[0] - 8)},${Math.max(0, tone[1] - 6)},${Math.max(0, tone[2] - 4)},${alpha * 0.3})`,
    ],
    [1, `rgba(${tone[0]},${tone[1]},${tone[2]},0)`],
  ]);
  context.fillRect(0, 0, SMOKE_SIZE, SMOKE_SIZE);
}

function drawSmokeClump(
  context: CanvasRenderingContext2D,
  spec: SmokeClumpSpec,
  index: number,
): void {
  const tone = SMOKE_TONES[spec[4]]!;
  const points = shardPoints(
    spec[0],
    spec[1],
    spec[2],
    spec[3],
    index * 1.93 + spec[0] * 0.05,
    index * 1.1 + spec[1] * 0.02,
  );
  paintFacet(
    context,
    points,
    `rgba(${tone[0]},${tone[1]},${tone[2]},0.2)`,
    1,
    `rgba(${Math.max(0, tone[0] - 16)},${Math.max(0, tone[1] - 14)},${Math.max(0, tone[2] - 10)},0.18)`,
    1.1,
  );
}

function drawSmokeGrit(context: CanvasRenderingContext2D): void {
  for (let index = 0; index < 52; index += 1) {
    const x = SMOKE_CENTER - 124 + ((index * 67) % 248);
    const y = SMOKE_CENTER - 118 + ((index * 109) % 240);
    const radius = 0.9 + (index % 4) * 0.75;
    context.fillStyle = index % 3 !== 0
      ? `rgba(30,22,17,${0.14 + (index % 5) * 0.02})`
      : `rgba(150,126,104,${0.08 + (index % 4) * 0.02})`;
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }
}

function drawSmoke(context: CanvasRenderingContext2D): void {
  for (const blob of SMOKE_BLOBS) drawSmokeBlob(context, blob);
  for (let index = 0; index < SMOKE_CLUMPS.length; index += 1) {
    drawSmokeClump(context, SMOKE_CLUMPS[index]!, index);
  }
  drawSmokeGrit(context);
  maskRadial(context, SMOKE_SIZE, 208, 250);
  limitOpacity(context, SMOKE_SIZE, 0.62);
}

function drawSpark(context: CanvasRenderingContext2D): void {
  const cy = SPARK_CENTER;
  const left = 5;
  const right = SPARK_SIZE - 5;
  const spine: Point[] = [];
  const widths: number[] = [];
  const steps = 9;
  for (let index = 0; index < steps; index += 1) {
    const u = index / (steps - 1);
    spine.push([left + (right - left) * u, cy]);
    widths.push(
      12.4 * Math.pow(Math.sin(Math.PI * Math.min(0.9995, u)), 0.62) * (1 - 0.1 * u),
    );
  }
  paintShape(
    context,
    widthRibbon(spine, widths),
    gradient(context, left, cy, right, cy, [
      [0, "rgba(255,138,43,0)"],
      [0.14, "rgba(255,138,43,0.4)"],
      [0.32, "rgba(255,186,96,0.72)"],
      [0.52, "rgba(255,244,214,1)"],
      [0.68, "rgba(255,206,116,0.74)"],
      [0.86, "rgba(255,138,43,0.38)"],
      [1, "rgba(255,138,43,0)"],
    ]),
    1,
  );
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = radial(context, SPARK_CENTER + 3, cy, 0, 15, [
    [0, "rgba(255,226,160,0.4)"],
    [0.55, "rgba(255,176,80,0.16)"],
    [1, "rgba(255,138,43,0)"],
  ]);
  context.fillRect(0, 0, SPARK_SIZE, SPARK_SIZE);
  context.restore();
  context.save();
  context.lineCap = "round";
  context.lineWidth = 1.9;
  context.strokeStyle = gradient(context, 8, cy, 56, cy, [
    [0, "rgba(255,244,214,0)"],
    [0.28, "rgba(255,246,222,0.5)"],
    [0.54, "rgba(255,252,240,0.94)"],
    [0.78, "rgba(255,238,190,0.44)"],
    [1, "rgba(255,238,190,0)"],
  ]);
  context.beginPath();
  context.moveTo(9, cy);
  context.lineTo(55, cy);
  context.stroke();
  context.restore();
}

function scorchPath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  phase: number,
  jitter: number,
): void {
  const steps = 46;
  const points: Point[] = [];
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * TAU;
    const ripple = 1
      + 0.14 * Math.sin(angle * 3 + 0.9 + phase)
      + 0.1 * Math.sin(angle * 5 + 2.6 - phase * 0.7)
      + 0.07 * Math.sin(angle * 7 + 4.2 + phase * 0.5)
      + 0.04 * Math.sin(angle * 11 + 1.4)
      + jitter * Math.sin(index * 2.399963 + phase * 3.7);
    points.push([
      cx + Math.cos(angle) * rx * ripple,
      cy + Math.sin(angle) * ry * ripple,
    ]);
  }
  traceSmoothPath(context, points, true);
  context.closePath();
}

function drawScorchFissure(context: CanvasRenderingContext2D, spec: FissureSpec): void {
  const angle = spec[0];
  const start = spec[1];
  const end = spec[2];
  const width = spec[3];
  const glow = clamp01(spec[4]);
  const bend = spec[5];
  const steps = 8;
  const spine: Point[] = [];
  const widths: number[] = [];
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  for (let index = 0; index < steps; index += 1) {
    const u = index / (steps - 1);
    const radius = (start + (end - start) * u) * SCORCH_RADIUS;
    const wobble = bend * Math.sin(u * Math.PI * 1.8 + angle * 2.4) * SCORCH_RADIUS * 0.16;
    spine.push([
      SCORCH_CENTER + dirX * radius - dirY * wobble,
      SCORCH_CENTER + dirY * radius + dirX * wobble,
    ]);
    widths.push(width * (0.5 + 0.7 * Math.sin(u * Math.PI)));
  }
  paintShape(context, widthRibbon(spine, widths), "rgba(14,9,7,0.62)", 1);
  if (glow > 0.05) {
    context.save();
    context.globalCompositeOperation = "lighter";
    paintShape(
      context,
      widthRibbon(spine, widths.map((value) => value * 0.46)),
      `rgba(255,138,43,${glow})`,
      1,
    );
    context.restore();
  }
}

function drawScorchChunk(
  context: CanvasRenderingContext2D,
  spec: ChunkSpec,
  index: number,
): void {
  const points = shardPoints(
    spec[0],
    spec[1],
    spec[2],
    spec[3],
    index * 1.61 + spec[0] * 0.05,
    index * 0.9 + spec[1] * 0.03,
  );
  const plate = spec[4] > 0.5;
  paintFacet(
    context,
    points,
    plate ? "rgba(88,70,54,0.24)" : "rgba(16,11,9,0.34)",
    1,
    plate ? "rgba(120,98,78,0.2)" : "rgba(10,7,5,0.36)",
    1.2,
  );
}

function drawScorchGrit(context: CanvasRenderingContext2D): void {
  for (let index = 0; index < 78; index += 1) {
    const angle = (index * 2.399963) % TAU;
    const distance = 12 + ((index * 53) % 128);
    const x = SCORCH_CENTER + Math.cos(angle) * distance;
    const y = SCORCH_CENTER + Math.sin(angle) * distance * 0.92;
    const radius = 0.8 + (index % 5) * 0.62;
    if (index % 13 === 5) {
      context.globalCompositeOperation = "lighter";
      context.fillStyle = `rgba(255,138,43,${0.34 + (index % 3) * 0.08})`;
    } else if (index % 4 === 0) {
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "rgba(150,128,104,0.14)";
    } else {
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "rgba(16,11,9,0.42)";
    }
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }
  context.globalCompositeOperation = "source-over";
}

function drawScorch(context: CanvasRenderingContext2D): void {
  context.fillStyle = "rgba(66,50,38,0.2)";
  for (const patch of SCORCH_PATCHES) {
    context.beginPath();
    scorchPath(context, patch[0], patch[1], patch[2], patch[3], patch[4], patch[5]);
    context.fill();
  }

  context.save();
  context.beginPath();
  scorchPath(
    context,
    SCORCH_CENTER,
    SCORCH_CENTER,
    SCORCH_RADIUS,
    SCORCH_RADIUS * 0.9,
    0.7,
    0.055,
  );
  context.fillStyle = radial(context, SCORCH_CENTER - 16, SCORCH_CENTER - 20, 0, SCORCH_RADIUS * 1.32, [
    [0, "rgba(28,20,16,0.92)"],
    [0.32, "rgba(34,24,19,0.86)"],
    [0.58, "rgba(48,35,27,0.68)"],
    [0.8, "rgba(66,50,38,0.4)"],
    [1, "rgba(84,66,50,0.12)"],
  ]);
  context.fill();
  context.clip();
  context.fillStyle = gradient(
    context,
    SCORCH_CENTER - 150,
    SCORCH_CENTER - 170,
    SCORCH_CENTER + 150,
    SCORCH_CENTER + 160,
    [
      [0, "rgba(104,82,62,0.22)"],
      [0.52, "rgba(52,38,29,0.05)"],
      [1, "rgba(14,9,7,0.26)"],
    ],
  );
  context.fillRect(0, 0, SCORCH_SIZE, SCORCH_SIZE);
  for (const fissure of SCORCH_FISSURES) drawScorchFissure(context, fissure);
  for (let index = 0; index < SCORCH_CHUNKS.length; index += 1) {
    drawScorchChunk(context, SCORCH_CHUNKS[index]!, index);
  }
  drawScorchGrit(context);
  context.restore();

  maskRadial(context, SCORCH_SIZE, 208, 250);
}

function createTempestadeTexture(
  name: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const texture = createCanvasTexture(width, height, draw);
  texture.name = `TempestadeBrasa.${name}`;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
}

export class TempestadeBrasaTextures {
  readonly ember: CanvasTexture;
  readonly flash: CanvasTexture;
  readonly smoke: CanvasTexture;
  readonly spark: CanvasTexture;
  readonly scorch: CanvasTexture;

  constructor() {
    this.ember = createTempestadeTexture("ember", EMBER_ATLAS, EMBER_ATLAS, drawEmber);
    this.flash = createTempestadeTexture("flash", FLASH_SIZE, FLASH_SIZE, drawFlash);
    this.smoke = createTempestadeTexture("smoke", SMOKE_SIZE, SMOKE_SIZE, drawSmoke);
    this.spark = createTempestadeTexture("spark", SPARK_SIZE, SPARK_SIZE, drawSpark);
    this.scorch = createTempestadeTexture("scorch", SCORCH_SIZE, SCORCH_SIZE, drawScorch);
  }

  dispose(): void {
    this.ember.dispose();
    this.flash.dispose();
    this.smoke.dispose();
    this.spark.dispose();
    this.scorch.dispose();
  }
}

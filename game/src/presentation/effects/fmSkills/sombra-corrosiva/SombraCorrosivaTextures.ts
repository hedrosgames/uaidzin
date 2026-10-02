import { ClampToEdgeWrapping, type CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type Point = readonly [number, number];
type Fill = string | CanvasGradient;
type Stops = ReadonlyArray<readonly [number, string]>;
type VoidShape = {
  tipY: number;
  rx: number;
  height: number;
  lean: number;
  phase: number;
  swirl: number;
};
type VoidPose = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
type CreaseSpec = readonly [number, number, number, number];
type SliceSpec = readonly [number, number, number];
type ShardSpec = readonly [number, number, number, number, number, number];
type FilamentSpec = readonly [number, number, number, number, number, number];
type BlobSpec = readonly [number, number, number, number, number, number];
type LashSpec = readonly [number, number, number, number, number];
type SpikeSpec = readonly [number, number, number, number, number];
type ArcSpec = readonly [number, number, number, number, number];
type NotchSpec = readonly [number, number, number, number];
type RingSpec = readonly [number, number, number, number, number];
type BristleSpec = readonly [number, number, number, number, number];

const TAU = Math.PI * 2;

const VOID_TILE = 256;
const VOID_PADDING = 8;
const VOID_COLUMNS = 4;
const VOID_FRAMES = 16;
const VOID_ATLAS = VOID_TILE * VOID_COLUMNS;
const VOID_CENTER = VOID_TILE * 0.5;
const VOID_PEAK_U = 0.7;
const VOID_LIMIT_LOW = 18;
const VOID_LIMIT_HIGH = 238;

const HAZE_SIZE = 512;
const HAZE_CENTER = HAZE_SIZE * 0.5;

const FLASH_SIZE = 512;
const FLASH_CENTER = FLASH_SIZE * 0.5;

const STREAK_SIZE = 64;
const STREAK_MID = STREAK_SIZE * 0.5;

const IRIS_SIZE = 512;
const IRIS_CENTER = IRIS_SIZE * 0.5;
const IRIS_BAND_RX = 168;
const IRIS_BAND_RY = 62;

const VOID_POSES: readonly VoidPose[] = [
  [126, 26, 30, 1.5, 0, 0, 0, 0, 0.34, 0.34],
  [112, 38, 42, 2.4, 0.62, 1, 0, 0, 0.46, 0.5],
  [96, 52, 56, -1.8, 1.24, 2, 0, 0, 0.6, 0.66],
  [78, 64, 68, -3.2, 1.86, 3, 0, 0, 0.72, 0.8],
  [62, 72, 76, 4.4, 2.48, 4, 0, 0, 0.8, 0.86],
  [54, 76, 82, 5.6, 3.1, 5, 0, 0, 0.87, 0.9],
  [50, 78, 86, -5, 3.72, 5, 0, 0, 0.9, 0.92],
  [52, 76, 84, -6.4, 4.34, 6, 0.05, 0, 0.86, 0.91],
  [56, 72, 86, 7.2, 4.96, 6, 0.34, 0.12, 0.78, 0.84],
  [60, 68, 86, 8.4, 5.58, 7, 0.56, 0.26, 0.7, 0.74],
  [62, 64, 84, -8.8, 6.2, 7, 0.74, 0.42, 0.6, 0.62],
  [64, 60, 82, -9.6, 6.82, 8, 0.88, 0.6, 0.5, 0.5],
  [68, 56, 78, 10.4, 7.44, 9, 1, 0.78, 0.4, 0.4],
  [72, 50, 72, -11, 8.06, 10, 1.05, 0.9, 0.3, 0.3],
  [76, 44, 64, 11.8, 8.68, 11, 1.1, 1, 0.22, 0.24],
  [80, 38, 56, -12.4, 9.3, 12, 1.14, 1.08, 0.16, 0.18],
];

const VOID_CREASES: readonly CreaseSpec[] = [
  [-0.4, 0.3, 0.66, 5.2],
  [0.34, 0.26, 0.72, 5.8],
  [-0.62, 0.34, 0.6, 4.2],
  [0.56, 0.3, 0.64, 4.8],
  [-0.16, 0.4, 0.78, 4.4],
  [0.14, 0.24, 0.58, 5.4],
  [-0.82, 0.42, 0.7, 3.6],
  [0.78, 0.38, 0.62, 3.8],
  [-0.3, 0.5, 0.82, 4.6],
  [0.44, 0.46, 0.76, 4],
  [0.02, 0.54, 0.86, 3.4],
  [-0.52, 0.52, 0.74, 4.2],
];

const VOID_SLICES: readonly SliceSpec[] = [
  [0.2, 0.4, -5.2],
  [0.33, 1.7, 4.6],
  [0.46, 3.1, -3.8],
  [0.59, 4.4, 6.2],
  [0.72, 5.6, -4.4],
  [0.86, 0.9, 5.4],
];

const VOID_SHARDS: readonly ShardSpec[] = [
  [-1.28, -0.78, 0, 30, 9, 0.78],
  [1.18, 0.84, -0.02, 38, 10.5, 0.7],
  [-0.66, -0.94, 0.42, 34, 8.4, 0.6],
  [0.6, 0.98, 0.5, 42, 9.6, 0.56],
  [-1.78, -0.42, 0.74, 32, 8.8, 0.5],
  [1.68, 0.48, 0.84, 30, 7.8, 0.46],
  [0.1, 0.14, 0.96, 40, 10, 0.4],
];

const VOID_FILAMENTS: readonly FilamentSpec[] = [
  [-0.44, 0.18, 0.92, 3.1, 2.2, 0.7],
  [0.28, 0.26, 1.02, -2.6, 1.8, 0.62],
  [-0.14, 0.44, 1.08, 3.4, 2.6, 0.54],
  [0.52, 0.34, 0.96, -3.2, 1.6, 0.5],
];

const HAZE_BLOBS: readonly BlobSpec[] = [
  [-52, -34, 118, 92, 0.3, 0.5],
  [46, -58, 104, 78, -0.5, 0.46],
  [72, 26, 96, 74, 0.7, 0.44],
  [-64, 42, 110, 84, -0.9, 0.42],
  [8, -8, 138, 108, 0.15, 0.5],
  [-14, 62, 92, 70, 0.4, 0.38],
  [26, 78, 84, 64, -0.3, 0.34],
  [-88, -6, 82, 66, 0.6, 0.36],
  [96, 66, 74, 58, -0.7, 0.3],
  [-36, -84, 78, 60, 0.25, 0.32],
  [64, -92, 70, 54, 0.5, 0.28],
  [-96, 74, 66, 52, -0.45, 0.26],
  [-30, 26, 96, 74, -0.2, 0.6],
  [38, 34, 84, 66, 0.35, 0.54],
];

const HAZE_LASHES: readonly LashSpec[] = [
  [-2.62, 96, 186, 30, 0.54],
  [0.46, 104, 194, 34, 0.5],
  [1.34, 92, 176, 28, 0.48],
  [2.18, 100, 188, 32, 0.46],
  [-1.18, 96, 180, 30, 0.46],
  [-3.02, 88, 170, 26, 0.42],
  [-0.34, 108, 190, 31, 0.42],
  [2.92, 94, 174, 27, 0.4],
  [0.94, 100, 166, 24, 0.38],
  [-1.86, 90, 162, 23, 0.36],
  [3.62, 98, 168, 25, 0.34],
  [-2.28, 86, 156, 22, 0.32],
];

const HAZE_NOTCHES: readonly NotchSpec[] = [
  [-118, -96, 54, 0.62],
  [126, -78, 46, 0.56],
  [-142, 62, 42, 0.52],
  [110, 118, 50, 0.48],
  [4, -136, 44, 0.5],
  [-76, 132, 40, 0.44],
];

const FLASH_SPIKES: readonly SpikeSpec[] = [
  [0.36, 26, 100, 15, 0.78],
  [1.18, 22, 76, 10, 0.66],
  [2.12, 30, 116, 17, 0.62],
  [3.04, 24, 82, 11, 0.68],
  [3.92, 28, 94, 14, 0.58],
  [0.88, 46, 48, 6.5, 0.5],
  [2.74, 52, 40, 6, 0.46],
];

const FLASH_ARCS: readonly ArcSpec[] = [
  [0.3, 1.5, 128, 6, 0.22],
  [1.9, 3.1, 112, 5, 0.2],
  [3.5, 4.8, 138, 6, 0.18],
  [5.1, 6.05, 104, 4, 0.16],
];

const STREAK_BRISTLES: readonly BristleSpec[] = [
  [18, -6.4, 15, -0.42, 0.44],
  [22, 6.8, 17, 0.36, 0.4],
  [14, 4.2, 11, 0.24, 0.3],
];

const IRIS_RINGS: readonly RingSpec[] = [
  [46, 30, 0.04, 0.5, 2.1],
  [68, 44, -0.03, 2.6, 4.1],
  [92, 58, 0.05, 4.4, 5.65],
  [116, 72, -0.04, 5.95, 0.75],
];

const IRIS_SHARDS: readonly SpikeSpec[] = [
  [0.02, 132, 62, 11, 0.62],
  [-0.36, 140, 46, 9, 0.54],
  [0.44, 124, 40, 8, 0.5],
  [-0.72, 148, 34, 7.5, 0.44],
  [0.76, 132, 30, 7, 0.4],
  [3.12, 132, 62, 11, 0.62],
  [2.68, 140, 46, 9, 0.54],
  [3.56, 124, 40, 8, 0.5],
  [2.4, 148, 34, 7.5, 0.44],
  [3.9, 132, 30, 7, 0.4],
];

const IRIS_WISPS: readonly BlobSpec[] = [
  [-54, 12, 96, 40, 0.08, 0.4],
  [64, -8, 108, 44, -0.06, 0.36],
  [12, 26, 132, 46, 0.03, 0.3],
];

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function limitPoint(value: number): number {
  if (value < VOID_LIMIT_LOW) return VOID_LIMIT_LOW;
  if (value > VOID_LIMIT_HIGH) return VOID_LIMIT_HIGH;
  return value;
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

function paintShape(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: Fill,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = fill;
  context.beginPath();
  traceSmoothPath(context, points, true);
  context.closePath();
  context.fill();
  context.restore();
}

function paintInside(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: Fill,
  alpha: number,
  span: number,
): void {
  context.save();
  context.beginPath();
  traceSmoothPath(context, points, true);
  context.closePath();
  context.clip();
  context.globalAlpha = alpha;
  context.fillStyle = fill;
  context.fillRect(0, 0, span, span);
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
  context.globalAlpha = alpha;
  context.fillStyle = fill;
  context.beginPath();
  context.ellipse(cx, cy, Math.max(0.4, rx), Math.max(0.4, ry), rotation, 0, TAU);
  context.fill();
  context.restore();
}

function paintSoftEllipse(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  stops: Stops,
): void {
  if (rx <= 0 || ry <= 0) return;
  context.save();
  context.translate(cx, cy);
  context.rotate(rotation);
  context.scale(1, ry / rx);
  const fill = context.createRadialGradient(0, 0, 0, 0, 0, rx);
  for (const [offset, color] of stops) fill.addColorStop(offset, color);
  context.fillStyle = fill;
  context.fillRect(-rx, -rx, rx * 2, rx * 2);
  context.restore();
}

function eraseShape(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  alpha: number,
): void {
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = alpha;
  context.fillStyle = "#ffffff";
  context.beginPath();
  traceSmoothPath(context, points, true);
  context.closePath();
  context.fill();
  context.restore();
}

function eraseSoft(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
  span: number,
): void {
  const hole = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(0.5, radius));
  hole.addColorStop(0, "rgba(255,255,255,1)");
  hole.addColorStop(0.55, "rgba(255,255,255,0.74)");
  hole.addColorStop(1, "rgba(255,255,255,0)");
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = alpha;
  context.fillStyle = hole;
  context.fillRect(0, 0, span, span);
  context.restore();
}

function limitOpacity(
  context: CanvasRenderingContext2D,
  span: number,
  opacity: number,
): void {
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = `rgba(255,255,255,${opacity})`;
  context.fillRect(0, 0, span, span);
  context.restore();
}

function maskEllipse(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  solid: number,
  fade: number,
  span: number,
): void {
  const scale = Math.max(rx, ry);
  const sx = rx / scale;
  const sy = ry / scale;
  const mask = context.createRadialGradient(0, 0, 0, 0, 0, scale);
  mask.addColorStop(0, "rgba(255,255,255,1)");
  mask.addColorStop(Math.min(0.999, solid / scale), "rgba(255,255,255,1)");
  mask.addColorStop(Math.max(0.001, Math.min(1, fade / scale)), "rgba(255,255,255,0)");
  mask.addColorStop(1, "rgba(255,255,255,0)");
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.translate(cx, cy);
  context.scale(sx, sy);
  context.fillStyle = mask;
  context.fillRect(-cx / sx, -cy / sy, span / sx, span / sy);
  context.restore();
}

function strokeOutlineSegments(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  segments: number,
  gap: number,
  lineWidth: number,
  strokeStyle: string,
): void {
  const total = points.length - 1;
  context.lineWidth = lineWidth;
  context.strokeStyle = strokeStyle;
  for (let index = 0; index < segments; index += 1) {
    const startT = index / segments;
    const endT = startT + 1 / segments - gap;
    if (endT <= startT) continue;
    const from = Math.min(total - 1, Math.round(startT * total));
    const to = Math.min(total, Math.round(endT * total));
    if (to <= from) continue;
    context.beginPath();
    traceSmoothPath(context, points.slice(from, to + 1), true);
    context.stroke();
  }
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
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const half = widths[index]! * 0.5;
    left.push([current[0] - (dy / length) * half, current[1] + (dx / length) * half]);
    right.push([current[0] + (dy / length) * half, current[1] - (dx / length) * half]);
  }
  return [...left, ...right.reverse()];
}

function voidProfile(u: number): number {
  if (u <= VOID_PEAK_U) {
    return Math.pow(Math.sin((u / VOID_PEAK_U) * Math.PI * 0.5), 1.3);
  }
  const s = (u - VOID_PEAK_U) / (1 - VOID_PEAK_U);
  return Math.pow(Math.max(0, Math.cos(s * Math.PI * 0.5)), 0.78);
}

function voidCenterAt(u: number, lean: number, phase: number, swirl: number): number {
  const t = clamp01(u);
  return VOID_CENTER
    + lean * Math.pow(t, 1.22)
    + swirl * Math.sin(Math.PI * t * 1.32 + phase) * (0.14 + 0.86 * t);
}

function voidOutline(shape: VoidShape): Point[] {
  const steps = 26;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const u = index / steps;
    const y = shape.tipY + shape.height * u
      + 1.7 * Math.sin(Math.PI * u) * Math.sin(u * 5.2 + shape.phase);
    const center = voidCenterAt(u, shape.lean, shape.phase, shape.swirl);
    const half = shape.rx * voidProfile(u);
    const wobbleLeft = 1
      + 0.05 * Math.sin(u * 4.3 + shape.phase * 1.7)
      - 0.03 * Math.sin(u * 7.1 + shape.phase * 0.6);
    const wobbleRight = 1
      + 0.045 * Math.sin(u * 3.6 + shape.phase * 1.3 + 1.1)
      + 0.028 * Math.sin(u * 6.4 + shape.phase * 0.8 + 2.3);
    left.push([center - half * wobbleLeft, y]);
    right.push([center + half * wobbleRight, y]);
  }
  return [...left, ...right.reverse()];
}

function drawVoidCrease(
  context: CanvasRenderingContext2D,
  spec: CreaseSpec,
  shape: VoidShape,
  outline: readonly Point[],
  open: number,
  rimGain: number,
  index: number,
): void {
  const offset = spec[0];
  const startU = spec[1];
  const endU = spec[2];
  const bow = spec[3];
  const count = 6;
  const spine: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const u = startU + (endU - startU) * t;
    const center = voidCenterAt(u, shape.lean, shape.phase, shape.swirl);
    const half = shape.rx * voidProfile(u) * (1 - 0.1 * open);
    spine.push([
      center + offset * half * 0.8
        + Math.sin(index * 1.7 + offset * 3.1 + shape.phase) * bow * (1 + 0.4 * open),
      shape.tipY + shape.height * u,
    ]);
  }

  context.save();
  context.lineCap = "round";
  context.beginPath();
  traceSmoothPath(context, spine, true);
  context.strokeStyle = `rgba(8,4,16,${0.45 + 0.35 * open})`;
  context.lineWidth = 1.4 + 5.2 * open;
  context.stroke();
  context.restore();

  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = Math.min(1, 0.24 + 0.52 * open);
  context.lineCap = "round";
  context.beginPath();
  traceSmoothPath(context, spine, true);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 0.8 + 3 * open;
  context.stroke();
  context.restore();

  context.save();
  context.beginPath();
  traceSmoothPath(context, outline, true);
  context.closePath();
  context.clip();
  context.lineCap = "round";
  context.beginPath();
  traceSmoothPath(context, spine.map((point): Point => [point[0] + 2.6, point[1] - 0.6]), true);
  context.strokeStyle = index % 3 === 0
    ? `rgba(187,106,159,${(0.44 + 0.16 * rimGain) * (1 - 0.5 * open)})`
    : `rgba(101,65,127,${0.4 + 0.2 * rimGain})`;
  context.lineWidth = index % 3 === 0 ? 0.9 + 0.9 * open : 1.1 + 1.2 * open;
  context.stroke();
  context.restore();
}

function drawVoidSlice(
  context: CanvasRenderingContext2D,
  spec: SliceSpec,
  shape: VoidShape,
  tear: number,
  index: number,
): void {
  const u = spec[0];
  const phaseOffset = spec[1];
  const tilt = spec[2] * tear * 1.4 * (1 + 0.22 * Math.sin(index * 2.1 + shape.phase));
  const center = voidCenterAt(u, shape.lean, shape.phase, shape.swirl);
  const half = shape.rx * voidProfile(u) * (0.8 + 0.52 * tear) + 2 + 6 * tear;
  const count = 5;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let step = 0; step < count; step += 1) {
    const t = step / (count - 1);
    spine.push([
      center - half + half * 2 * t,
      shape.tipY + shape.height * u
        + tilt * (t * 2 - 1)
        + 5.5 * tear * Math.sin(t * Math.PI + phaseOffset + shape.phase * 0.5),
    ]);
    const profile = 0.34
      + 0.66 * Math.pow(Math.sin(Math.PI * Math.min(0.999, 0.08 + 0.92 * t)), 0.6);
    widths.push((2 + 14 * tear) * profile * (1 + 0.16 * Math.sin(index * 1.3 + step * 0.9)));
  }
  eraseShape(context, widthRibbon(spine, widths), Math.min(1, 0.52 + 0.58 * tear));
}

function drawVoidShard(
  context: CanvasRenderingContext2D,
  spec: ShardSpec,
  shape: VoidShape,
  dispersion: number,
): void {
  const alpha = spec[5] * clamp01((dispersion - 0.04) * 1.2);
  if (alpha <= 0.02) return;
  const angle = spec[0];
  const length = spec[3] * (0.62 + 0.42 * dispersion);
  const thickness = spec[4] * (1.05 - 0.25 * dispersion);
  const cx = limitPoint(VOID_CENTER + shape.lean * 0.6 + spec[1] * shape.rx);
  const cy = limitPoint(shape.tipY + shape.height * spec[2] + 6 * Math.sin(angle * 2.3 + shape.phase));
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const count = 5;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const bow = 9 * Math.sin(t * Math.PI) * Math.sin(angle * 3.1 + shape.phase);
    spine.push([
      limitPoint(cx + dirX * length * t - dirY * bow),
      limitPoint(cy + dirY * length * t + dirX * bow),
    ]);
    widths.push(thickness * (0.22 + 0.78 * Math.sin(Math.PI * Math.pow(t, 0.72))) * (1 - 0.36 * t));
  }
  paintShape(context, widthRibbon(spine, widths), gradient(
    context,
    spine[0]![0],
    spine[0]![1],
    spine[count - 1]![0],
    spine[count - 1]![1],
    [
      [0, "rgba(101,65,127,0.62)"],
      [0.42, "rgba(48,28,68,0.7)"],
      [1, "rgba(14,8,22,0.28)"],
    ],
  ), alpha);

  context.save();
  context.globalAlpha = alpha * 0.7;
  context.strokeStyle = "rgba(138,95,174,0.45)";
  context.lineWidth = 0.9;
  context.beginPath();
  traceSmoothPath(context, spine, true);
  context.stroke();
  context.restore();
}

function drawVoidFilament(
  context: CanvasRenderingContext2D,
  spec: FilamentSpec,
  shape: VoidShape,
  tear: number,
): void {
  const alpha = spec[5] * clamp01((tear - 0.16) * 1.5);
  if (alpha <= 0.02) return;
  const startU = spec[1];
  const endU = Math.min(spec[2], (VOID_LIMIT_HIGH - shape.tipY) / shape.height);
  const count = 6;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const u = startU + (endU - startU) * t;
    const center = voidCenterAt(u, shape.lean, shape.phase, shape.swirl);
    spine.push([
      limitPoint(
        center
          + spec[0] * shape.rx * (0.6 + 0.5 * t)
          + spec[3] * Math.sin(u * 4.6 + spec[0] * 2.3) * t,
      ),
      limitPoint(shape.tipY + shape.height * u),
    ]);
    widths.push(spec[4] * (1 - 0.62 * t) * (0.7 + 0.3 * Math.sin(t * 3.1 + spec[0])));
  }
  paintShape(context, widthRibbon(spine, widths), gradient(
    context,
    spine[0]![0],
    spine[0]![1],
    spine[count - 1]![0],
    spine[count - 1]![1],
    [
      [0, "rgba(101,65,127,0.6)"],
      [0.5, "rgba(40,23,60,0.8)"],
      [1, "rgba(14,8,22,0.5)"],
    ],
  ), alpha);

  const bead = spine[count - 1]!;
  paintEllipse(
    context,
    bead[0],
    bead[1],
    Math.max(1.4, widths[count - 1]! * 0.62),
    Math.max(1.2, widths[count - 1]! * 0.5),
    `rgba(187,106,159,${0.34 * alpha})`,
    alpha * 0.9,
  );

  context.save();
  context.globalAlpha = alpha * 0.8;
  context.strokeStyle = "rgba(187,106,159,0.34)";
  context.lineWidth = 0.9;
  context.beginPath();
  traceSmoothPath(context, spine, true);
  context.stroke();
  context.restore();
}

function drawVoidFrame(context: CanvasRenderingContext2D, frame: number): void {
  const pose = VOID_POSES[frame]!;
  const tipY = pose[0];
  const rx = pose[1];
  const ry = pose[2];
  const lean = pose[3];
  const phase = pose[4];
  const creaseCount = pose[5];
  const tear = pose[6];
  const dispersion = pose[7];
  const rimGain = pose[8];
  const gain = pose[9];
  const height = ry * 2;
  const swirl = 7.5 * Math.sin(frame * 0.83 + 0.4) * (1 - dispersion * 0.3);
  const shape: VoidShape = { tipY, rx, height, lean, phase, swirl };
  const outline = voidOutline(shape);
  const anchorX = VOID_CENTER + lean * 0.5;
  const anchorY = tipY + height * 0.52;

  const body = context.createRadialGradient(
    VOID_CENTER - rx * 0.3 + lean * 0.4,
    tipY + height * 0.32,
    Math.max(2, rx * 0.12),
    anchorX,
    anchorY,
    Math.max(8, rx * 1.85),
  );
  body.addColorStop(0, "rgba(26,14,40,0.9)");
  body.addColorStop(0.46, "rgba(21,11,34,0.9)");
  body.addColorStop(0.78, "rgba(15,8,24,0.88)");
  body.addColorStop(1, "rgba(101,65,127,0.8)");
  paintShape(context, outline, body);

  const rimWash = context.createRadialGradient(
    anchorX,
    anchorY,
    Math.max(4, rx * 0.8),
    anchorX,
    anchorY,
    Math.max(10, rx * 1.5),
  );
  rimWash.addColorStop(0, "rgba(101,65,127,0)");
  rimWash.addColorStop(0.68, "rgba(101,65,127,0)");
  rimWash.addColorStop(0.88, `rgba(101,65,127,${0.3 + 0.3 * rimGain})`);
  rimWash.addColorStop(1, `rgba(138,95,174,${0.18 + 0.26 * rimGain})`);
  paintInside(context, outline, rimWash, 1, VOID_TILE);

  const nucleusX = voidCenterAt(0.62, lean, phase, swirl);
  const nucleus = context.createRadialGradient(
    nucleusX - rx * 0.16,
    tipY + height * 0.6,
    Math.max(2, rx * 0.06),
    nucleusX,
    tipY + height * 0.64,
    Math.max(8, rx * 0.98),
  );
  nucleus.addColorStop(0, "rgba(8,4,16,0.95)");
  nucleus.addColorStop(0.58, "rgba(8,4,16,0.78)");
  nucleus.addColorStop(1, "rgba(8,4,16,0)");
  paintInside(context, outline, nucleus, 1, VOID_TILE);

  const creaseTotal = Math.min(creaseCount, VOID_CREASES.length);
  for (let index = 0; index < creaseTotal; index += 1) {
    drawVoidCrease(
      context,
      VOID_CREASES[index]!,
      shape,
      outline,
      tear * 0.9 + 0.06 * index,
      rimGain,
      index,
    );
  }

  const rimColor = `rgba(101,65,127,${0.68 + 0.24 * rimGain})`;
  const rimInner = `rgba(138,95,174,${0.22 + 0.3 * rimGain})`;
  const magentaColor = `rgba(187,106,159,${0.45 + 0.18 * rimGain})`;
  const broken = tear >= 0.22;
  const rimSegments = 6;
  const rimGap = 0.07 + 0.19 * dispersion + 0.06 * clamp01(tear - 0.22);

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  if (broken) {
    strokeOutlineSegments(context, outline, rimSegments, rimGap, 3.1, rimColor);
    strokeOutlineSegments(context, outline, rimSegments, rimGap, 1.2, rimInner);
  } else {
    context.beginPath();
    traceSmoothPath(context, outline, true);
    context.closePath();
    context.strokeStyle = rimColor;
    context.lineWidth = 3.1;
    context.stroke();
    context.strokeStyle = rimInner;
    context.lineWidth = 1.2;
    context.stroke();
  }
  context.restore();

  context.save();
  context.translate(anchorX, anchorY);
  context.scale(0.93, 0.94);
  context.translate(-anchorX, -anchorY);
  context.lineCap = "round";
  if (broken) {
    strokeOutlineSegments(context, outline, rimSegments, rimGap + 0.06, 1.1, magentaColor);
  } else {
    context.beginPath();
    traceSmoothPath(context, outline, true);
    context.closePath();
    context.strokeStyle = magentaColor;
    context.lineWidth = 1.1;
    context.stroke();
  }
  context.restore();

  if (tear > 0) {
    const sliceTotal = Math.min(VOID_SLICES.length, Math.round(2 + tear * 4.4));
    for (let index = 0; index < sliceTotal; index += 1) {
      drawVoidSlice(context, VOID_SLICES[index]!, shape, tear, index);
    }
  }

  if (dispersion > 0.45) {
    eraseSoft(
      context,
      VOID_CENTER + lean * 0.8,
      tipY + height * 0.52,
      rx * (0.42 + 0.52 * dispersion),
      0.34 * dispersion,
      VOID_TILE,
    );
  }

  if (dispersion > 0.05) {
    for (const shard of VOID_SHARDS) drawVoidShard(context, shard, shape, dispersion);
  }

  if (tear > 0.2) {
    for (const filament of VOID_FILAMENTS) drawVoidFilament(context, filament, shape, tear);
  }

  limitOpacity(context, VOID_TILE, gain);
}

function drawVoidAtlas(context: CanvasRenderingContext2D): void {
  for (let frame = 0; frame < VOID_FRAMES; frame += 1) {
    context.save();
    context.translate(
      (frame % VOID_COLUMNS) * VOID_TILE,
      Math.floor(frame / VOID_COLUMNS) * VOID_TILE,
    );
    context.beginPath();
    context.rect(
      VOID_PADDING,
      VOID_PADDING,
      VOID_TILE - VOID_PADDING * 2,
      VOID_TILE - VOID_PADDING * 2,
    );
    context.clip();
    drawVoidFrame(context, frame);
    context.restore();
  }
}

function paintHazeBlob(context: CanvasRenderingContext2D, spec: BlobSpec): void {
  const alpha = spec[5];
  paintSoftEllipse(
    context,
    HAZE_CENTER + spec[0],
    HAZE_CENTER + spec[1] * 0.94,
    spec[2],
    spec[3],
    spec[4],
    [
      [0, `rgba(48,28,68,${alpha})`],
      [0.58, `rgba(24,13,38,${alpha * 0.9})`],
      [1, "rgba(14,8,22,0)"],
    ],
  );
}

function drawHazeLash(context: CanvasRenderingContext2D, spec: LashSpec): void {
  const angle = spec[0];
  const inner = spec[1];
  const outer = spec[2];
  const halfAngle = spec[3] / Math.max(24, inner);
  const alpha = spec[4];
  const mid = inner + (outer - inner) * 0.52;
  const points: Point[] = [
    [HAZE_CENTER + Math.cos(angle - halfAngle) * inner, HAZE_CENTER + Math.sin(angle - halfAngle) * inner * 0.92],
    [HAZE_CENTER + Math.cos(angle + halfAngle * 0.24) * mid, HAZE_CENTER + Math.sin(angle + halfAngle * 0.24) * mid * 0.92],
    [HAZE_CENTER + Math.cos(angle) * outer, HAZE_CENTER + Math.sin(angle) * outer * 0.92],
    [HAZE_CENTER + Math.cos(angle + halfAngle * 0.62) * (inner + (outer - inner) * 0.3), HAZE_CENTER + Math.sin(angle + halfAngle * 0.62) * (inner + (outer - inner) * 0.3) * 0.92],
    [HAZE_CENTER + Math.cos(angle + halfAngle) * inner, HAZE_CENTER + Math.sin(angle + halfAngle) * inner * 0.92],
  ];
  paintShape(context, points, gradient(
    context,
    HAZE_CENTER + Math.cos(angle) * inner,
    HAZE_CENTER + Math.sin(angle) * inner,
    HAZE_CENTER + Math.cos(angle) * outer,
    HAZE_CENTER + Math.sin(angle) * outer,
    [
      [0, `rgba(101,65,127,${alpha * 0.9})`],
      [0.45, `rgba(48,28,68,${alpha})`],
      [1, "rgba(14,8,22,0)"],
    ],
  ));
}

function drawHaze(context: CanvasRenderingContext2D): void {
  const wash = context.createRadialGradient(
    HAZE_CENTER,
    HAZE_CENTER,
    0,
    HAZE_CENTER,
    HAZE_CENTER,
    268,
  );
  wash.addColorStop(0, "rgba(48,28,68,0.98)");
  wash.addColorStop(0.36, "rgba(40,23,60,0.95)");
  wash.addColorStop(0.66, "rgba(24,13,38,0.9)");
  wash.addColorStop(0.86, "rgba(14,8,22,0.72)");
  wash.addColorStop(1, "rgba(14,8,22,0)");
  context.fillStyle = wash;
  context.fillRect(0, 0, HAZE_SIZE, HAZE_SIZE);

  for (const blob of HAZE_BLOBS) paintHazeBlob(context, blob);
  for (const spec of HAZE_LASHES) drawHazeLash(context, spec);
  for (const notch of HAZE_NOTCHES) {
    eraseSoft(
      context,
      HAZE_CENTER + notch[0],
      HAZE_CENTER + notch[1],
      notch[2],
      notch[3],
      HAZE_SIZE,
    );
  }

  limitOpacity(context, HAZE_SIZE, 0.5);
  maskEllipse(context, HAZE_CENTER, HAZE_CENTER, 232, 232, 132, 232, HAZE_SIZE);
}

function drawFlashSpike(context: CanvasRenderingContext2D, spec: SpikeSpec): void {
  const angle = spec[0];
  const start = spec[1];
  const length = spec[2];
  const halfWidth = spec[3];
  const alpha = spec[4];
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const count = 6;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const radius = start + length * t;
    const bow = 12 * Math.sin(t * Math.PI) * Math.sin(angle * 2.6 + 1.2)
      + 4 * Math.sin(t * 5.1 + angle * 1.7);
    spine.push([
      FLASH_CENTER + dirX * radius - dirY * bow,
      FLASH_CENTER + dirY * radius * 0.96 + dirX * bow * 0.6,
    ]);
    widths.push(
      halfWidth * 2 * Math.pow(1 - t, 0.72)
        * (0.56 + 0.44 * Math.sin(Math.PI * Math.pow(t, 0.85)))
        * (1 + 0.16 * Math.sin(t * 7.3 + angle * 3.1)),
    );
  }
  paintShape(context, widthRibbon(spine, widths), gradient(
    context,
    FLASH_CENTER + dirX * start,
    FLASH_CENTER + dirY * start,
    FLASH_CENTER + dirX * (start + length),
    FLASH_CENTER + dirY * (start + length),
    [
      [0, `rgba(236,222,255,${alpha})`],
      [0.22, `rgba(226,208,250,${alpha * 0.9})`],
      [0.58, `rgba(187,106,159,${alpha * 0.72})`],
      [1, "rgba(101,65,127,0)"],
    ],
  ));
}

function drawFlashArc(context: CanvasRenderingContext2D, spec: ArcSpec): void {
  const start = spec[0];
  const end = spec[1];
  const radius = spec[2];
  const half = spec[3];
  const alpha = spec[4];
  const count = 8;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const angle = start + (end - start) * t;
    const bow = radius + 5 * Math.sin(t * Math.PI + start);
    spine.push([
      FLASH_CENTER + Math.cos(angle) * bow,
      FLASH_CENTER + Math.sin(angle) * bow * 0.96,
    ]);
    widths.push(half * 2 * Math.sin(Math.PI * Math.pow(t, 0.9)) * (0.7 + 0.3 * Math.sin(t * 4.4 + start)));
  }
  paintShape(context, widthRibbon(spine, widths), `rgba(138,95,174,${alpha})`);
}

function drawFlash(context: CanvasRenderingContext2D): void {
  const core = context.createRadialGradient(
    FLASH_CENTER,
    FLASH_CENTER,
    0,
    FLASH_CENTER,
    FLASH_CENTER,
    152,
  );
  core.addColorStop(0, "rgba(236,222,255,1)");
  core.addColorStop(0.08, "rgba(226,208,250,0.96)");
  core.addColorStop(0.18, "rgba(187,106,159,0.85)");
  core.addColorStop(0.38, "rgba(138,95,174,0.62)");
  core.addColorStop(0.62, "rgba(101,65,127,0.55)");
  core.addColorStop(0.85, "rgba(48,28,68,0.2)");
  core.addColorStop(1, "rgba(14,8,22,0)");
  context.fillStyle = core;
  context.fillRect(0, 0, FLASH_SIZE, FLASH_SIZE);

  for (const spike of FLASH_SPIKES) drawFlashSpike(context, spike);
  for (const arc of FLASH_ARCS) drawFlashArc(context, arc);

  maskEllipse(context, FLASH_CENTER, FLASH_CENTER, 246, 246, 104, 246, FLASH_SIZE);
}

function drawStreakBristle(context: CanvasRenderingContext2D, spec: BristleSpec): void {
  const originX = spec[0];
  const originY = STREAK_MID + spec[1];
  const length = spec[2];
  const angle = spec[3];
  const alpha = spec[4];
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const count = 4;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    spine.push([originX + dirX * length * t, originY + dirY * length * t]);
    widths.push(3.4 * Math.pow(1 - t, 0.7) * (0.5 + 0.5 * Math.sin(Math.PI * t)));
  }
  paintShape(context, widthRibbon(spine, widths), gradient(
    context,
    originX,
    originY,
    originX + dirX * length,
    originY + dirY * length,
    [
      [0, `rgba(226,208,250,${alpha})`],
      [0.5, `rgba(187,106,159,${alpha * 0.7})`],
      [1, "rgba(101,65,127,0)"],
    ],
  ));
}

function drawStreak(context: CanvasRenderingContext2D): void {
  const y = STREAK_MID;
  const count = 9;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    spine.push([
      10 + 44 * t,
      y + 2.2 * Math.sin(Math.PI * t * 1.05 - 0.2) * (1 - 0.3 * t),
    ]);
    widths.push(10.6 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 1.35) * (0.55 + 0.45 * t));
  }

  paintShape(context, widthRibbon(spine, widths), gradient(context, 10, y, 54, y, [
    [0, "rgba(101,65,127,0)"],
    [0.16, "rgba(138,95,174,0.34)"],
    [0.44, "rgba(187,106,159,0.6)"],
    [0.64, "rgba(226,208,250,0.94)"],
    [0.8, "rgba(236,222,255,1)"],
    [0.9, "rgba(187,106,159,0.6)"],
    [1, "rgba(101,65,127,0)"],
  ]));

  for (const bristle of STREAK_BRISTLES) drawStreakBristle(context, bristle);

  paintEllipse(
    context,
    y,
    y,
    21,
    6.2,
    gradient(context, 11, y, 53, y, [
      [0, "rgba(101,65,127,0)"],
      [0.5, "rgba(101,65,127,0.24)"],
      [1, "rgba(101,65,127,0)"],
    ]),
    0.86,
  );

  context.save();
  context.lineCap = "round";
  context.beginPath();
  traceSmoothPath(context, [
    [24, y - 0.6],
    [34, y + 0.4],
    [45, y - 0.2],
  ], true);
  context.strokeStyle = "rgba(226,208,250,0.9)";
  context.lineWidth = 1.3;
  context.stroke();
  context.restore();
}

function irisAlmond(spread: number): Point[] {
  const count = 30;
  const upper: Point[] = [];
  const lower: Point[] = [];
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const width = Math.pow(Math.sin(Math.PI * t), 0.92);
    const x = IRIS_CENTER + (t - 0.5) * 2 * IRIS_BAND_RX;
    const ripple = 1 + 0.085 * Math.sin(t * 7.2 + 0.8) + 0.05 * Math.sin(t * 12.6 + 2.4);
    const ry = IRIS_BAND_RY * ripple * (1 + spread * 0.22);
    upper.push([x, IRIS_CENTER - ry * width]);
    lower.push([
      x,
      IRIS_CENTER + ry * Math.pow(width, 0.86) * (1 + 0.055 * Math.sin(t * 5.4 + 1.9)),
    ]);
  }
  return [...upper, ...lower.reverse()];
}

function drawIrisRing(context: CanvasRenderingContext2D, spec: RingSpec): void {
  const start = spec[3];
  const end = spec[4] <= start ? spec[4] + TAU : spec[4];
  context.save();
  context.strokeStyle = "rgba(101,65,127,0.35)";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(
    IRIS_CENTER + spec[0] * 0.05,
    IRIS_CENTER + spec[1] * 0.07,
    spec[0],
    spec[1],
    spec[2],
    start,
    end,
  );
  context.stroke();
  context.restore();
}

function drawIrisShard(context: CanvasRenderingContext2D, spec: SpikeSpec): void {
  const angle = spec[0];
  const start = spec[1];
  const length = spec[2];
  const halfWidth = spec[3];
  const alpha = spec[4];
  const cx = IRIS_CENTER + Math.cos(angle) * start;
  const cy = IRIS_CENTER + Math.sin(angle) * start * 0.8;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle) * 0.8;
  const count = 5;
  const spine: Point[] = [];
  const widths: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const bow = 5 * Math.sin(t * Math.PI) * Math.sin(angle * 2.4 + 0.7);
    spine.push([
      cx + dirX * length * t - dirY * bow,
      cy + dirY * length * t + dirX * bow * 0.7,
    ]);
    widths.push(halfWidth * 2 * Math.pow(1 - t, 0.66) * (0.58 + 0.42 * Math.sin(Math.PI * t)));
  }
  paintShape(context, widthRibbon(spine, widths), gradient(
    context,
    cx,
    cy,
    cx + dirX * length,
    cy + dirY * length,
    [
      [0, `rgba(101,65,127,${alpha})`],
      [0.4, `rgba(48,28,68,${alpha * 0.86})`],
      [0.76, `rgba(187,106,159,${alpha * 0.42})`],
      [1, "rgba(14,8,22,0)"],
    ],
  ));
}

function drawIrisHoop(context: CanvasRenderingContext2D): void {
  context.save();
  context.strokeStyle = "rgba(187,106,159,0.5)";
  context.lineWidth = 2.4;
  context.beginPath();
  context.ellipse(IRIS_CENTER + 2, IRIS_CENTER + 3, 80, 52, 0.03, -0.25, TAU - 0.55);
  context.stroke();
  context.strokeStyle = "rgba(187,106,159,0.3)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.ellipse(IRIS_CENTER - 3, IRIS_CENTER - 2, 62, 40, -0.04, 0.9, TAU - 1.4);
  context.stroke();
  context.restore();
}

function drawIris(context: CanvasRenderingContext2D): void {
  for (const wisp of IRIS_WISPS) {
    paintSoftEllipse(
      context,
      IRIS_CENTER + wisp[0],
      IRIS_CENTER + wisp[1],
      wisp[2],
      wisp[3],
      wisp[4],
      [
        [0, `rgba(26,14,40,${wisp[5]})`],
        [0.6, `rgba(14,8,22,${wisp[5] * 0.8})`],
        [1, "rgba(14,8,22,0)"],
      ],
    );
  }

  const almond = irisAlmond(0);
  const voidFill = context.createRadialGradient(
    IRIS_CENTER,
    IRIS_CENTER + 2,
    0,
    IRIS_CENTER,
    IRIS_CENTER + 2,
    190,
  );
  voidFill.addColorStop(0, "rgba(6,3,12,0.96)");
  voidFill.addColorStop(0.3, "rgba(8,4,16,0.94)");
  voidFill.addColorStop(0.58, "rgba(20,11,32,0.82)");
  voidFill.addColorStop(0.8, "rgba(48,28,68,0.46)");
  voidFill.addColorStop(1, "rgba(14,8,22,0)");
  paintInside(context, almond, voidFill, 1, IRIS_SIZE);

  for (const shard of IRIS_SHARDS) drawIrisShard(context, shard);
  for (const ring of IRIS_RINGS) drawIrisRing(context, ring);
  drawIrisHoop(context);

  context.save();
  context.beginPath();
  traceSmoothPath(context, almond, true);
  context.closePath();
  context.clip();
  const lidShadow = context.createLinearGradient(0, IRIS_CENTER - IRIS_BAND_RY, 0, IRIS_CENTER + IRIS_BAND_RY);
  lidShadow.addColorStop(0, "rgba(6,3,12,0.5)");
  lidShadow.addColorStop(0.36, "rgba(6,3,12,0)");
  lidShadow.addColorStop(1, "rgba(101,65,127,0.2)");
  context.fillStyle = lidShadow;
  context.fillRect(0, 0, IRIS_SIZE, IRIS_SIZE);
  context.restore();

  maskEllipse(context, IRIS_CENTER, IRIS_CENTER, 226, 118, 150, 226, IRIS_SIZE);
}

function createSombraTexture(
  name: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const texture = createCanvasTexture(width, height, draw);
  texture.name = `SombraCorrosiva.${name}`;
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
}

export class SombraCorrosivaTextures {
  readonly voidBody: CanvasTexture;
  readonly haze: CanvasTexture;
  readonly flash: CanvasTexture;
  readonly streak: CanvasTexture;
  readonly iris: CanvasTexture;

  constructor() {
    this.voidBody = createSombraTexture("voidBody", VOID_ATLAS, VOID_ATLAS, drawVoidAtlas);
    this.haze = createSombraTexture("haze", HAZE_SIZE, HAZE_SIZE, drawHaze);
    this.flash = createSombraTexture("flash", FLASH_SIZE, FLASH_SIZE, drawFlash);
    this.streak = createSombraTexture("streak", STREAK_SIZE, STREAK_SIZE, drawStreak);
    this.iris = createSombraTexture("iris", IRIS_SIZE, IRIS_SIZE, drawIris);
  }

  dispose(): void {
    this.voidBody.dispose();
    this.haze.dispose();
    this.flash.dispose();
    this.streak.dispose();
    this.iris.dispose();
  }
}

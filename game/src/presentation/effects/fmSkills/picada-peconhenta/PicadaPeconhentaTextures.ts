import { ClampToEdgeWrapping, type CanvasTexture } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type Point = readonly [number, number];
type Fill = string | CanvasGradient;
type Stops = ReadonlyArray<readonly [number, string]>;
type GooPose = readonly [
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
type SatelliteSpec = readonly [number, number, number, number, number];
type DropletSpec = readonly [number, number, number, number, number];
type RaySpec = readonly [number, number, number, number, number];
type BubbleSpec = readonly [number, number, number];
type TrailSpec = readonly [number, number, number, number];

const TAU = Math.PI * 2;

const GOO_TILE = 256;
const GOO_PADDING = 8;
const GOO_COLUMNS = 4;
const GOO_FRAMES = 16;
const GOO_ATLAS = GOO_TILE * GOO_COLUMNS;
const GOO_CENTER = 128;
const GOO_BASE = 236;
const GOO_THREAD_END = GOO_BASE - 8;

const CHITIN_SIZE = 256;
const CHITIN_BANDS = 6;

const BUBBLE_SIZE = 128;
const BUBBLE_CENTER = BUBBLE_SIZE * 0.5;
const BUBBLE_RADIUS = 52;

const SPLASH_SIZE = 512;
const SPLASH_CENTER = SPLASH_SIZE * 0.5;

const DRIP_SIZE = 256;
const DRIP_CENTER = DRIP_SIZE * 0.5;
const DRIP_RADIUS = 66;

const GOO_POSES: readonly GooPose[] = [
  [212, 9, 11, 2.2, 0.3, 15, 0, 0, 0, 0.36],
  [204, 15, 18, 3, 0.38, 16, 0, 0.06, 0, 0.52],
  [196, 21, 25, 4, 0.46, 17, 1, 0.12, 0, 0.68],
  [190, 25, 30, 5, 0.54, 17, 1, 0.18, 0, 0.8],
  [182, 28, 35, 6, 0.62, 18, 2, 0.24, 0, 0.88],
  [174, 30, 40, 7.2, 0.7, 18, 2, 0.3, 0, 0.92],
  [166, 32, 44, 8.4, 0.8, 19, 3, 0.36, 0, 0.92],
  [159, 33, 47, 9.4, 0.9, 19, 3, 0.42, 0, 0.91],
  [153, 34, 49, 10.4, 1, 20, 4, 0.5, 0, 0.92],
  [149, 35, 51, 11.2, 1, 20, 5, 0.6, 0.06, 0.92],
  [147, 36, 52, 11.8, 1, 20, 5, 0.72, 0.12, 0.9],
  [149, 34, 50, 11.2, 1, 19, 6, 0.84, 0.2, 0.88],
  [155, 31, 45, 10.2, 0.94, 17, 7, 0.94, 0.34, 0.82],
  [165, 26, 37, 8.6, 0.82, 13, 8, 1, 0.54, 0.66],
  [177, 20, 27, 6.6, 0.66, 8, 9, 1, 0.76, 0.44],
  [190, 13, 17, 4.6, 0.5, 5, 10, 1, 0.92, 0.24],
];

const GOO_SATELLITES: readonly SatelliteSpec[] = [
  [-2.44, 1.2, 8.4, 4.4, 0.6],
  [1.36, 1.26, 9.2, 4.8, 0.56],
  [-0.86, 1.34, 7.4, 3.9, 0.52],
  [2.62, 1.18, 8.6, 4.5, 0.48],
  [0.44, 1.44, 6.6, 3.5, 0.45],
  [-1.74, 1.38, 7, 3.7, 0.42],
  [3.04, 1.52, 5.8, 3.1, 0.38],
  [-0.3, 1.3, 6.2, 3.3, 0.35],
  [1.92, 1.46, 5.4, 2.9, 0.32],
  [-2.94, 1.34, 5, 2.7, 0.29],
];

const SPLASH_DROPS: readonly DropletSpec[] = [
  [-0.18, 150, 26, 11, 0.92],
  [0.34, 168, 22, 9.4, 0.88],
  [0.78, 142, 24, 10, 0.9],
  [1.24, 176, 20, 8.2, 0.8],
  [1.62, 154, 23, 9.6, 0.86],
  [2.06, 188, 18, 7.4, 0.72],
  [2.48, 146, 26, 10.6, 0.9],
  [2.96, 172, 21, 8.8, 0.78],
  [3.42, 152, 25, 10.2, 0.88],
  [3.86, 196, 17, 7, 0.68],
  [4.32, 158, 24, 9.8, 0.86],
  [4.78, 148, 26, 10.4, 0.9],
  [5.44, 184, 19, 7.8, 0.74],
];

const SPLASH_OUTER: readonly DropletSpec[] = [
  [0.12, 214, 11, 5.2, 0.3],
  [0.72, 204, 9, 4.4, 0.26],
  [1.48, 222, 10, 4.6, 0.24],
  [2.18, 208, 12, 5.6, 0.28],
  [2.62, 226, 9, 4.2, 0.22],
  [3.24, 212, 11, 5, 0.28],
  [3.94, 232, 8, 4, 0.2],
  [4.66, 206, 10, 4.8, 0.26],
  [5.28, 220, 9, 4.4, 0.22],
];

const SPLASH_RAYS: readonly RaySpec[] = [
  [-0.3, 44, 156, 13, 0.5],
  [0.62, 40, 148, 11, 0.46],
  [1.5, 46, 162, 12, 0.42],
  [2.36, 38, 142, 10, 0.44],
  [3.2, 42, 152, 12, 0.4],
  [4.06, 40, 146, 10, 0.42],
  [4.94, 44, 158, 11, 0.46],
  [5.68, 38, 140, 9, 0.38],
];

const DRIP_BUBBLES: readonly BubbleSpec[] = [
  [-0.42, 0.44, 9],
  [0.36, 0.62, 7],
  [1.18, 0.48, 10],
  [1.94, 0.68, 6],
  [2.52, 0.38, 8],
  [3.18, 0.56, 9.5],
  [3.86, 0.72, 6.5],
  [4.62, 0.5, 8.5],
  [5.36, 0.64, 7.5],
];

const DRIP_TRAILS: readonly TrailSpec[] = [
  [-2.36, 62, 104, 9],
  [0.58, 58, 98, 7.5],
  [2.14, 64, 102, 8],
  [4.32, 60, 108, 6.5],
];

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
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

function paintInside(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: Fill,
  alpha = 1,
): void {
  context.save();
  context.beginPath();
  traceSmoothPath(context, points, true);
  context.closePath();
  context.clip();
  context.globalAlpha = alpha;
  context.fillStyle = fill;
  context.fillRect(0, 0, GOO_TILE, GOO_TILE);
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
  context.ellipse(cx, cy, rx, ry, rotation, 0, TAU);
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
  context.fillStyle = `rgba(255,255,255,${opacity})`;
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
  const mask = context.createRadialGradient(center, center, 0, center, center, fade);
  mask.addColorStop(0, "rgba(255,255,255,1)");
  mask.addColorStop(Math.min(0.999, solid / fade), "rgba(255,255,255,1)");
  mask.addColorStop(1, "rgba(255,255,255,0)");
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = mask;
  context.fillRect(0, 0, size, size);
  context.restore();
}

function eraseGlow(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
): void {
  const hole = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(0.5, radius));
  hole.addColorStop(0, "rgba(255,255,255,1)");
  hole.addColorStop(0.58, "rgba(255,255,255,0.72)");
  hole.addColorStop(1, "rgba(255,255,255,0)");
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = alpha;
  context.fillStyle = hole;
  context.fillRect(0, 0, GOO_TILE, GOO_TILE);
  context.restore();
}

function ribbon(spine: readonly Point[], peak: number, bias = 0): Point[] {
  const left: Point[] = [];
  const right: Point[] = [];
  for (let index = 0; index < spine.length; index += 1) {
    const current = spine[index]!;
    const previous = spine[Math.max(0, index - 1)]!;
    const next = spine[Math.min(spine.length - 1, index + 1)]!;
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy) || 1;
    const u = index / (spine.length - 1);
    const half = peak
      * Math.pow(Math.sin(Math.PI * u), 0.55)
      * (1 - 0.3 * u)
      * (1 + bias * (1 - u));
    left.push([current[0] - (dy / length) * half, current[1] + (dx / length) * half]);
    right.push([current[0] + (dy / length) * half, current[1] - (dx / length) * half]);
  }
  return [...left, ...right.reverse()];
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

function headHalf(headRx: number, u: number): number {
  return headRx
    * Math.pow(Math.sin(Math.PI * Math.pow(u, 1.18)), 0.62)
    * (1 - 0.42 * Math.pow(u, 2.8));
}

function headCenterX(u: number, lean: number, deform: number, phase: number): number {
  return GOO_CENTER
    + lean * Math.pow(u, 1.5)
    + deform * 10 * Math.sin(Math.PI * u) * Math.sin(Math.PI * u * 1.7 + phase);
}

function headOutline(
  headY: number,
  headRy: number,
  headRx: number,
  lean: number,
  deform: number,
  phase: number,
): Point[] {
  const steps = 22;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const u = index / steps;
    const y = headY + headRy * (1 - 2 * u);
    const half = headHalf(headRx, u);
    const center = headCenterX(u, lean, deform, phase);
    left.push([center - half, y]);
    right.push([center + half, y]);
  }
  return [...left, ...right.reverse()];
}

function threadSpine(
  headBottom: number,
  endY: number,
  sway: number,
  phase: number,
): Point[] {
  const count = 9;
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const u = index / (count - 1);
    points.push([
      GOO_CENTER + sway * Math.sin(u * Math.PI * 1.4 + phase) * (0.2 + 0.8 * u),
      headBottom + (endY - headBottom) * u,
    ]);
  }
  return points;
}

function threadWidths(neck: number, count: number, rupture: number): number[] {
  const widths: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const u = index / (count - 1);
    const profile = 0.3 + 0.7 * Math.pow(1 - u, 1.15);
    const bead = 0.55 * Math.sin(Math.PI * clamp01((u - 0.5) / 0.5));
    widths.push(neck * (profile + bead) * (1 - 0.55 * rupture * u));
  }
  return widths;
}

function sliceSpine(
  index: number,
  slices: number,
  headY: number,
  headRy: number,
  headRx: number,
  rupture: number,
  phase: number,
  lean: number,
): Point[] {
  const u = 0.18 + 0.64 * ((index + 0.5) / slices);
  const y = headY + headRy * (1 - 2 * u);
  const half = headHalf(headRx, u);
  const tilt = 13 * Math.sin(index * 1.7 + 0.6) * rupture;
  const points: Point[] = [];
  const count = 5;
  for (let step = 0; step < count; step += 1) {
    const t = step / (count - 1);
    points.push([
      headCenterX(u, lean, rupture, phase) - half * 1.45 + half * 2.9 * t,
      y - tilt * (t * 2 - 1) - 4 * rupture * Math.sin(t * Math.PI + index + phase),
    ]);
  }
  return points;
}

function drawGooFrame(context: CanvasRenderingContext2D, frame: number): void {
  const pose = GOO_POSES[frame]!;
  const headY = pose[0];
  const headRx = pose[1];
  const headRy = pose[2];
  const neck = pose[3];
  const drip = pose[4];
  const reservoir = pose[5];
  const satelliteCount = pose[6];
  const spread = pose[7];
  const rupture = pose[8];
  const gain = pose[9];
  const phase = frame * 0.58;
  const lean = 6 * Math.sin(frame * 0.74 + 0.5) * (1 - rupture * 0.35);
  const headBottom = headY + headRy;
  const endY = headBottom + Math.max(5, GOO_THREAD_END - headBottom) * drip;
  const spine = threadSpine(headBottom - 5, endY, 2 + 5 * spread, phase);
  const widths = threadWidths(neck, spine.length, rupture);

  paintShape(context, widthRibbon(spine, widths), gradient(
    context,
    GOO_CENTER,
    headBottom,
    GOO_CENTER,
    endY + 8,
    [
      [0, "rgba(56,144,78,0.95)"],
      [0.36, "rgba(46,132,74,0.9)"],
      [0.72, "rgba(104,176,76,0.76)"],
      [1, "rgba(150,204,90,0.44)"],
    ],
  ));
  paintShape(context, widthRibbon(spine, widths.map((width) => width * 0.34)), gradient(
    context,
    GOO_CENTER,
    headBottom,
    GOO_CENTER,
    endY,
    [
      [0, "rgba(160,210,96,0.5)"],
      [1, "rgba(214,232,120,0.14)"],
    ],
  ));

  if (reservoir > 0.5) {
    const reservoirAlpha = Math.min(1, 0.42 + reservoir * 0.03) * (1 - rupture * 0.85);
    const ry = reservoir * 0.4;
    const cy = GOO_BASE - ry * 0.7;
    paintEllipse(context, GOO_CENTER, cy, reservoir, ry, gradient(
      context,
      GOO_CENTER,
      cy - ry,
      GOO_CENTER,
      cy + ry,
      [
        [0, "rgba(78,168,88,0.9)"],
        [0.55, "rgba(46,132,74,0.92)"],
        [1, "rgba(22,66,44,0.94)"],
      ],
    ), reservoirAlpha);
    paintEllipse(
      context,
      GOO_CENTER - reservoir * 0.22,
      cy - ry * 0.34,
      reservoir * 0.42,
      ry * 0.3,
      "rgba(158,212,98,0.5)",
      reservoirAlpha * 0.9,
      -0.3,
    );
  }

  const outline = headOutline(headY, headRy, headRx, lean, spread, phase);
  const body = context.createRadialGradient(
    GOO_CENTER - headRx * 0.34 + lean * 0.4,
    headY - headRy * 0.46,
    headRx * 0.12,
    GOO_CENTER + lean * 0.4,
    headY + headRy * 0.12,
    headRx * 1.7,
  );
  body.addColorStop(0, "rgba(118,190,96,0.97)");
  body.addColorStop(0.28, "rgba(46,132,74,0.95)");
  body.addColorStop(0.64, "rgba(30,96,58,0.92)");
  body.addColorStop(1, "rgba(22,66,44,0.84)");
  paintShape(context, outline, body);

  const inner = context.createRadialGradient(
    GOO_CENTER + lean * 0.4,
    headY + headRy * 0.52,
    headRx * 0.08,
    GOO_CENTER + lean * 0.4,
    headY + headRy * 0.52,
    headRx * 1.12,
  );
  inner.addColorStop(0, "rgba(22,66,44,0.66)");
  inner.addColorStop(0.58, "rgba(22,66,44,0.3)");
  inner.addColorStop(1, "rgba(22,66,44,0)");
  paintInside(context, outline, inner);

  context.save();
  context.strokeStyle = "rgba(132,196,74,0.6)";
  context.lineWidth = 2.2;
  context.beginPath();
  traceSmoothPath(context, outline, true);
  context.closePath();
  context.stroke();
  context.restore();

  paintEllipse(
    context,
    GOO_CENTER - headRx * 0.3 + lean * 0.34,
    headY - headRy * 0.5,
    headRx * 0.32,
    headRy * 0.19,
    "rgba(214,232,120,0.9)",
    0.92,
    -0.42,
  );
  paintEllipse(
    context,
    GOO_CENTER - headRx * 0.34 + lean * 0.34,
    headY - headRy * 0.54,
    headRx * 0.14,
    headRy * 0.08,
    "rgba(240,248,196,0.9)",
    0.88,
    -0.42,
  );

  const count = Math.min(satelliteCount, GOO_SATELLITES.length);
  for (let index = 0; index < count; index += 1) {
    const spec = GOO_SATELLITES[index]!;
    const reach = spec[1] * (1 + 0.22 * spread);
    paintDroplet(
      context,
      GOO_CENTER + lean * 0.5 + Math.cos(spec[0]) * headRx * reach,
      headY + Math.sin(spec[0]) * headRy * reach * (1 + 0.14 * spread),
      spec[0],
      spec[2] * (1 - 0.25 * rupture),
      spec[3],
      spec[4] * (1 - 0.3 * rupture),
      true,
    );
  }

  if (rupture > 0) {
    eraseGlow(context, GOO_CENTER, headBottom - 1, 4 + 22 * rupture, Math.min(1, rupture * 2.4));
    eraseGlow(
      context,
      GOO_CENTER + lean * 0.4,
      headY + headRy * 0.34,
      headRx * 0.62 * rupture,
      Math.min(1, rupture * 1.3),
    );
    const slices = 4;
    for (let index = 0; index < slices; index += 1) {
      eraseShape(
        context,
        ribbon(sliceSpine(index, slices, headY, headRy, headRx, rupture, phase, lean), 1.5 + 11 * rupture),
        Math.min(1, rupture * 1.4),
      );
    }
  }

  limitOpacity(context, GOO_TILE, gain);
}

function drawGoo(context: CanvasRenderingContext2D): void {
  for (let frame = 0; frame < GOO_FRAMES; frame += 1) {
    context.save();
    context.translate(
      (frame % GOO_COLUMNS) * GOO_TILE,
      Math.floor(frame / GOO_COLUMNS) * GOO_TILE,
    );
    context.beginPath();
    context.rect(
      GOO_PADDING,
      GOO_PADDING,
      GOO_TILE - GOO_PADDING * 2,
      GOO_TILE - GOO_PADDING * 2,
    );
    context.clip();
    drawGooFrame(context, frame);
    context.restore();
  }
}

function strokeBand(context: CanvasRenderingContext2D, y: number, band: number): void {
  context.beginPath();
  const steps = 18;
  for (let step = 0; step <= steps; step += 1) {
    const u = step / steps;
    const x = u * CHITIN_SIZE;
    const wobble = 4.5 * Math.sin(TAU * u + band * 0.9)
      + 2 * Math.sin(TAU * u * 2 + band * 1.7);
    if (step === 0) context.moveTo(x, y + wobble);
    else context.lineTo(x, y + wobble);
  }
  context.stroke();
}

function drawChitin(context: CanvasRenderingContext2D): void {
  const base = context.createLinearGradient(0, 0, CHITIN_SIZE, CHITIN_SIZE);
  base.addColorStop(0, "rgb(150,196,96)");
  base.addColorStop(0.14, "rgb(122,174,86)");
  base.addColorStop(0.32, "rgb(78,132,68)");
  base.addColorStop(0.52, "rgb(48,92,54)");
  base.addColorStop(0.74, "rgb(30,64,42)");
  base.addColorStop(1, "rgb(18,44,30)");
  context.fillStyle = base;
  context.fillRect(0, 0, CHITIN_SIZE, CHITIN_SIZE);

  context.save();
  context.lineCap = "butt";
  for (let band = 0; band < CHITIN_BANDS; band += 1) {
    const y = (band + 0.5) * (CHITIN_SIZE / CHITIN_BANDS);
    context.strokeStyle = "rgba(150,196,96,0.34)";
    context.lineWidth = 2.4;
    strokeBand(context, y - 4.4, band);
    context.globalAlpha = 0.62;
    context.strokeStyle = "rgb(10,26,18)";
    context.lineWidth = 3.4;
    strokeBand(context, y, band);
    context.globalAlpha = 0.3;
    context.lineWidth = 1.2;
    strokeBand(context, y + 4.2, band);
    context.globalAlpha = 1;
  }
  context.restore();

  context.save();
  for (let offset = -CHITIN_SIZE; offset <= CHITIN_SIZE * 2; offset += 13) {
    context.strokeStyle = "rgba(10,26,18,0.2)";
    context.lineWidth = 1.1;
    context.beginPath();
    context.moveTo(offset, CHITIN_SIZE);
    context.lineTo(offset + CHITIN_SIZE, 0);
    context.stroke();
    context.strokeStyle = "rgba(150,196,96,0.1)";
    context.beginPath();
    context.moveTo(offset + 1.8, CHITIN_SIZE);
    context.lineTo(offset + CHITIN_SIZE + 1.8, 0);
    context.stroke();
  }
  context.restore();

  context.save();
  for (let index = 0; index < 34; index += 1) {
    const x = ((index * 71) % 251) + 2;
    const y = ((index * 137) % 251) + 2;
    context.fillStyle = index % 3 === 0 ? "rgba(150,196,96,0.22)" : "rgba(8,22,16,0.3)";
    context.beginPath();
    context.arc(x, y, 1.1 + (index % 4) * 0.6, 0, TAU);
    context.fill();
  }
  context.restore();

  const lit = context.createLinearGradient(0, 0, 120, 120);
  lit.addColorStop(0, "rgba(150,196,96,0.5)");
  lit.addColorStop(0.5, "rgba(150,196,96,0.14)");
  lit.addColorStop(1, "rgba(150,196,96,0)");
  context.fillStyle = lit;
  context.fillRect(0, 0, CHITIN_SIZE, CHITIN_SIZE);

  const shadow = context.createLinearGradient(
    CHITIN_SIZE * 0.42,
    0,
    CHITIN_SIZE,
    CHITIN_SIZE * 0.9,
  );
  shadow.addColorStop(0, "rgba(6,20,14,0)");
  shadow.addColorStop(0.55, "rgba(6,20,14,0.26)");
  shadow.addColorStop(1, "rgba(6,20,14,0.6)");
  context.fillStyle = shadow;
  context.fillRect(0, 0, CHITIN_SIZE, CHITIN_SIZE);
}

function drawBubble(context: CanvasRenderingContext2D): void {
  const body = context.createRadialGradient(
    BUBBLE_CENTER,
    BUBBLE_CENTER - BUBBLE_RADIUS * 0.45,
    BUBBLE_RADIUS * 0.1,
    BUBBLE_CENTER,
    BUBBLE_CENTER - BUBBLE_RADIUS * 0.45,
    BUBBLE_RADIUS * 1.5,
  );
  body.addColorStop(0, "rgba(120,184,74,0.16)");
  body.addColorStop(0.3, "rgba(126,192,78,0.26)");
  body.addColorStop(0.62, "rgba(146,206,92,0.5)");
  body.addColorStop(0.85, "rgba(176,222,104,0.78)");
  body.addColorStop(1, "rgba(196,232,118,0.52)");
  context.fillStyle = body;
  context.beginPath();
  context.arc(BUBBLE_CENTER, BUBBLE_CENTER, BUBBLE_RADIUS, 0, TAU);
  context.fill();

  const hollow = context.createRadialGradient(
    BUBBLE_CENTER,
    BUBBLE_CENTER - BUBBLE_RADIUS * 0.1,
    BUBBLE_RADIUS * 0.06,
    BUBBLE_CENTER,
    BUBBLE_CENTER - BUBBLE_RADIUS * 0.1,
    BUBBLE_RADIUS * 0.82,
  );
  hollow.addColorStop(0, "rgba(24,72,44,0.26)");
  hollow.addColorStop(0.7, "rgba(24,72,44,0.1)");
  hollow.addColorStop(1, "rgba(24,72,44,0)");
  context.save();
  context.beginPath();
  context.arc(BUBBLE_CENTER, BUBBLE_CENTER, BUBBLE_RADIUS, 0, TAU);
  context.clip();
  context.fillStyle = hollow;
  context.fillRect(0, 0, BUBBLE_SIZE, BUBBLE_SIZE);
  context.restore();

  context.save();
  context.strokeStyle = "rgba(132,196,74,0.42)";
  context.lineWidth = 1.6;
  context.beginPath();
  context.arc(BUBBLE_CENTER, BUBBLE_CENTER, BUBBLE_RADIUS * 0.94, 0, TAU);
  context.stroke();
  context.strokeStyle = "rgba(180,226,108,0.62)";
  context.lineWidth = 3.2;
  context.beginPath();
  context.arc(BUBBLE_CENTER, BUBBLE_CENTER, BUBBLE_RADIUS * 0.88, Math.PI * 0.12, Math.PI * 0.88);
  context.stroke();
  context.restore();

  paintEllipse(
    context,
    BUBBLE_CENTER - BUBBLE_RADIUS * 0.42,
    BUBBLE_CENTER - BUBBLE_RADIUS * 0.46,
    BUBBLE_RADIUS * 0.3,
    BUBBLE_RADIUS * 0.19,
    "rgba(238,250,214,0.94)",
    1,
    -0.6,
  );
  paintEllipse(
    context,
    BUBBLE_CENTER - BUBBLE_RADIUS * 0.46,
    BUBBLE_CENTER - BUBBLE_RADIUS * 0.5,
    BUBBLE_RADIUS * 0.11,
    BUBBLE_RADIUS * 0.08,
    "rgba(255,255,255,0.95)",
    1,
    -0.6,
  );

  maskRadial(context, BUBBLE_SIZE, 50, 62);
  limitOpacity(context, BUBBLE_SIZE, 0.85);
}

function dropletPath(context: CanvasRenderingContext2D, length: number, width: number): void {
  context.beginPath();
  context.moveTo(-length, 0);
  context.bezierCurveTo(-length * 0.38, -width * 0.92, length * 0.42, -width * 1.12, length * 0.66, -width * 0.52);
  context.bezierCurveTo(length * 1.02, -width * 0.16, length * 1.02, width * 0.16, length * 0.66, width * 0.52);
  context.bezierCurveTo(length * 0.42, width * 1.12, -length * 0.38, width * 0.92, -length, 0);
  context.closePath();
}

function paintDroplet(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width: number,
  alpha: number,
  highlight: boolean,
): void {
  context.save();
  context.translate(cx, cy);
  context.rotate(angle);
  context.globalAlpha = alpha;
  context.fillStyle = gradient(context, -length, 0, length, 0, [
    [0, "rgba(24,78,46,0.86)"],
    [0.34, "rgba(46,132,74,0.92)"],
    [0.72, "rgba(112,182,80,0.94)"],
    [1, "rgba(150,204,90,0.9)"],
  ]);
  dropletPath(context, length, width);
  context.fill();
  context.lineWidth = 1.4;
  context.strokeStyle = "rgba(132,196,74,0.6)";
  context.stroke();
  if (highlight) {
    context.save();
    dropletPath(context, length, width);
    context.clip();
    context.globalAlpha = alpha * 0.7;
    context.fillStyle = "rgba(214,232,120,0.8)";
    context.beginPath();
    context.ellipse(length * 0.34, -width * 0.34, length * 0.3, width * 0.26, -0.3, 0, TAU);
    context.fill();
    context.restore();
  }
  context.restore();
}

function drawSplashRay(context: CanvasRenderingContext2D, spec: RaySpec): void {
  const angle = spec[0];
  const start = spec[1];
  const end = spec[2];
  const half = spec[3] * 0.5;
  const alpha = spec[4];
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const spine: Point[] = [];
  const widths: number[] = [];
  const count = 6;
  for (let index = 0; index < count; index += 1) {
    const u = index / (count - 1);
    const radius = start + (end - start) * u;
    const bow = 7 * Math.sin(u * Math.PI) * Math.sin(angle * 1.7);
    spine.push([
      SPLASH_CENTER + dirX * radius - dirY * bow,
      SPLASH_CENTER + dirY * radius + dirX * bow,
    ]);
    widths.push(half * (1 - 0.88 * u) * (0.32 + 0.68 * Math.sin(Math.PI * (0.12 + 0.86 * u))));
  }
  paintShape(context, widthRibbon(spine, widths), gradient(
    context,
    SPLASH_CENTER + dirX * start,
    SPLASH_CENTER + dirY * start,
    SPLASH_CENTER + dirX * end,
    SPLASH_CENTER + dirY * end,
    [
      [0, `rgba(186,228,116,${alpha})`],
      [0.45, `rgba(112,182,80,${alpha * 0.72})`],
      [1, "rgba(46,132,74,0)"],
    ],
  ));
}

function drawSplash(context: CanvasRenderingContext2D): void {
  for (const ray of SPLASH_RAYS) drawSplashRay(context, ray);

  const core = context.createRadialGradient(
    SPLASH_CENTER,
    SPLASH_CENTER,
    0,
    SPLASH_CENTER,
    SPLASH_CENTER,
    196,
  );
  core.addColorStop(0, "rgba(246,252,220,1)");
  core.addColorStop(0.08, "rgba(228,244,156,0.98)");
  core.addColorStop(0.2, "rgba(180,220,110,0.86)");
  core.addColorStop(0.34, "rgba(124,190,84,0.62)");
  core.addColorStop(0.52, "rgba(56,142,76,0.36)");
  core.addColorStop(0.72, "rgba(28,92,54,0.16)");
  core.addColorStop(1, "rgba(20,64,40,0)");
  context.fillStyle = core;
  context.fillRect(0, 0, SPLASH_SIZE, SPLASH_SIZE);

  const flare = context.createRadialGradient(
    SPLASH_CENTER - 20,
    SPLASH_CENTER - 22,
    2,
    SPLASH_CENTER - 20,
    SPLASH_CENTER - 22,
    96,
  );
  flare.addColorStop(0, "rgba(255,255,242,1)");
  flare.addColorStop(0.28, "rgba(238,248,196,0.72)");
  flare.addColorStop(0.66, "rgba(200,232,128,0.28)");
  flare.addColorStop(1, "rgba(180,220,110,0)");
  context.fillStyle = flare;
  context.fillRect(0, 0, SPLASH_SIZE, SPLASH_SIZE);

  for (const drop of SPLASH_DROPS) {
    paintDroplet(
      context,
      SPLASH_CENTER + Math.cos(drop[0]) * drop[1],
      SPLASH_CENTER + Math.sin(drop[0]) * drop[1],
      drop[0],
      drop[2],
      drop[3],
      drop[4],
      true,
    );
  }
  for (const drop of SPLASH_OUTER) {
    paintDroplet(
      context,
      SPLASH_CENTER + Math.cos(drop[0]) * drop[1],
      SPLASH_CENTER + Math.sin(drop[0]) * drop[1],
      drop[0],
      drop[2],
      drop[3],
      drop[4],
      false,
    );
  }

  maskRadial(context, SPLASH_SIZE, 232, 248);
}

function puddlePath(context: CanvasRenderingContext2D): void {
  const steps = 44;
  const points: Point[] = [];
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * TAU;
    const ripple = 1
      + 0.2 * Math.sin(angle * 3 + 0.7)
      + 0.12 * Math.sin(angle * 5 + 2.1)
      + 0.07 * Math.sin(angle * 7 + 4.3)
      + 0.04 * Math.sin(angle * 11 + 1.2);
    const radius = DRIP_RADIUS * ripple;
    points.push([
      DRIP_CENTER + Math.cos(angle) * radius * 1.06 + 3.5 * Math.sin(angle * 2 + 0.4),
      DRIP_CENTER + Math.sin(angle) * radius * 0.86 + 3 * Math.sin(angle * 3 + 1.9),
    ]);
  }
  traceSmoothPath(context, points, true);
  context.closePath();
}

function drawTrail(context: CanvasRenderingContext2D, spec: TrailSpec): void {
  const angle = spec[0];
  const start = spec[1];
  const end = spec[2];
  const half = spec[3] * 0.5;
  const spine: Point[] = [];
  const widths: number[] = [];
  const count = 7;
  for (let index = 0; index < count; index += 1) {
    const u = index / (count - 1);
    const radius = start + (end - start) * u;
    const drift = 7 * Math.sin(u * Math.PI) * Math.sin(angle * 2.1 + 1.3);
    spine.push([
      DRIP_CENTER + Math.cos(angle) * radius - Math.sin(angle) * drift,
      DRIP_CENTER + Math.sin(angle) * radius * 0.86 + Math.cos(angle) * drift * 0.62,
    ]);
    widths.push(half * 2 * (1 - 0.78 * Math.pow(u, 0.85)));
  }
  paintShape(context, widthRibbon(spine, widths), gradient(
    context,
    DRIP_CENTER + Math.cos(angle) * start,
    DRIP_CENTER + Math.sin(angle) * start,
    DRIP_CENTER + Math.cos(angle) * end,
    DRIP_CENTER + Math.sin(angle) * end,
    [
      [0, "rgba(30,92,52,0.9)"],
      [0.5, "rgba(24,74,44,0.7)"],
      [1, "rgba(16,54,34,0.42)"],
    ],
  ));
  const bead = end + widths[count - 1]! * 0.3;
  paintEllipse(
    context,
    DRIP_CENTER + Math.cos(angle) * bead,
    DRIP_CENTER + Math.sin(angle) * bead * 0.86,
    Math.max(2.4, half * 0.6),
    Math.max(2, half * 0.5),
    "rgba(26,80,46,0.7)",
    0.9,
  );
}

function drawDripBubble(context: CanvasRenderingContext2D, spec: BubbleSpec): void {
  const angle = spec[0];
  const distance = spec[1];
  const radius = spec[2];
  const cx = DRIP_CENTER + Math.cos(angle) * DRIP_RADIUS * distance;
  const cy = DRIP_CENTER + Math.sin(angle) * DRIP_RADIUS * distance * 0.82;
  const body = context.createRadialGradient(
    cx - radius * 0.4,
    cy - radius * 0.4,
    radius * 0.1,
    cx,
    cy,
    radius * 1.25,
  );
  body.addColorStop(0, "rgba(12,44,28,0.5)");
  body.addColorStop(0.45, "rgba(46,116,62,0.42)");
  body.addColorStop(1, "rgba(122,182,84,0.5)");
  paintEllipse(context, cx, cy, radius, radius * 0.92, body, 0.95);
  context.save();
  context.strokeStyle = "rgba(14,46,30,0.5)";
  context.lineWidth = 1.6;
  context.beginPath();
  context.arc(cx, cy, radius, 0, TAU);
  context.stroke();
  context.strokeStyle = "rgba(160,212,104,0.45)";
  context.lineWidth = 1.8;
  context.beginPath();
  context.arc(cx, cy, radius * 0.8, Math.PI * 0.06, Math.PI * 0.94);
  context.stroke();
  context.restore();
  paintEllipse(
    context,
    cx - radius * 0.34,
    cy - radius * 0.36,
    radius * 0.26,
    radius * 0.2,
    "rgba(214,232,120,0.62)",
    0.9,
    -0.5,
  );
}

function drawDrip(context: CanvasRenderingContext2D): void {
  for (const trail of DRIP_TRAILS) drawTrail(context, trail);

  context.save();
  puddlePath(context);
  context.clip();
  const body = context.createRadialGradient(
    DRIP_CENTER - 8,
    DRIP_CENTER - 10,
    DRIP_RADIUS * 0.08,
    DRIP_CENTER,
    DRIP_CENTER,
    DRIP_RADIUS * 1.45,
  );
  body.addColorStop(0, "rgba(52,126,68,0.96)");
  body.addColorStop(0.4, "rgba(30,92,52,0.94)");
  body.addColorStop(0.74, "rgba(20,66,40,0.88)");
  body.addColorStop(1, "rgba(16,54,34,0.72)");
  context.fillStyle = body;
  context.fillRect(0, 0, DRIP_SIZE, DRIP_SIZE);
  const sheen = context.createRadialGradient(
    DRIP_CENTER - 24,
    DRIP_CENTER - 26,
    2,
    DRIP_CENTER - 24,
    DRIP_CENTER - 26,
    DRIP_RADIUS * 0.8,
  );
  sheen.addColorStop(0, "rgba(150,206,96,0.34)");
  sheen.addColorStop(0.6, "rgba(132,196,74,0.12)");
  sheen.addColorStop(1, "rgba(132,196,74,0)");
  context.fillStyle = sheen;
  context.fillRect(0, 0, DRIP_SIZE, DRIP_SIZE);
  for (const bubble of DRIP_BUBBLES) drawDripBubble(context, bubble);
  context.restore();

  context.save();
  puddlePath(context);
  context.strokeStyle = "rgba(16,54,34,0.6)";
  context.lineWidth = 3.4;
  context.stroke();
  context.strokeStyle = "rgba(96,168,86,0.28)";
  context.lineWidth = 1.3;
  context.stroke();
  context.restore();

  maskRadial(context, DRIP_SIZE, 112, 124);
  limitOpacity(context, DRIP_SIZE, 0.6);
}

function createPicadaTexture(
  name: string,
  size: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const texture = createCanvasTexture(size, size, draw);
  texture.name = `PicadaPeconhenta.${name}`;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
}

export class PicadaPeconhentaTextures {
  readonly goo: CanvasTexture;
  readonly chitin: CanvasTexture;
  readonly bubble: CanvasTexture;
  readonly splash: CanvasTexture;
  readonly drip: CanvasTexture;

  constructor() {
    this.goo = createPicadaTexture("goo", GOO_ATLAS, drawGoo);
    this.chitin = createPicadaTexture("chitin", CHITIN_SIZE, drawChitin);
    this.bubble = createPicadaTexture("bubble", BUBBLE_SIZE, drawBubble);
    this.splash = createPicadaTexture("splash", SPLASH_SIZE, drawSplash);
    this.drip = createPicadaTexture("drip", DRIP_SIZE, drawDrip);
  }

  dispose(): void {
    this.goo.dispose();
    this.chitin.dispose();
    this.bubble.dispose();
    this.splash.dispose();
    this.drip.dispose();
  }
}

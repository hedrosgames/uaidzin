import { ClampToEdgeWrapping, type CanvasTexture } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type Fill = string | CanvasGradient;
type Stops = ReadonlyArray<readonly [number, string]>;
type Point = readonly [number, number];
type SurgePose = readonly [
  tip: number,
  spread: number,
  gain: number,
  tear: number,
  shatter: number,
];
type LobeSpec = readonly [
  side: number,
  lift: number,
  reach: number,
  curve: number,
  peak: number,
  alpha: number,
];
type VoidSpec = readonly [
  base: number,
  top: number,
  offset: number,
  curve: number,
  peak: number,
  strength: number,
];
type ShardSpec = readonly [
  x: number,
  y: number,
  angle: number,
  length: number,
  peak: number,
  drift: number,
  alpha: number,
];
type ArcSpec = readonly [
  start: number,
  sweep: number,
  radius: number,
  width: number,
  strength: number,
  wobble: number,
];
type NotchSpec = readonly [angle: number, radius: number, thickness: number];

const TILE_SIZE = 256;
const TILE_PADDING = 8;
const ATLAS_COLUMNS = 4;
const FRAME_COUNT = 16;
const ATLAS_SIZE = TILE_SIZE * ATLAS_COLUMNS;
const FLAME_CENTER = 128;
const FLAME_BASE = 236;
const FLAME_HALF = 74;
const SPARK_SIZE = 64;
const RING_SIZE = 512;
const RING_CENTER = 256;

const SURGE_POSES: readonly SurgePose[] = [
  [176, 0.42, 0.44, 0, 0],
  [162, 0.5, 0.53, 0, 0],
  [146, 0.58, 0.62, 0, 0],
  [126, 0.68, 0.72, 0, 0],
  [106, 0.78, 0.8, 0, 0],
  [88, 0.87, 0.85, 0.04, 0],
  [74, 0.94, 0.9, 0.08, 0],
  [60, 0.99, 0.94, 0.12, 0],
  [58, 1, 0.94, 0.16, 0],
  [62, 0.99, 0.92, 0.2, 0],
  [68, 0.97, 0.9, 0.24, 0],
  [76, 0.94, 0.86, 0.42, 0.08],
  [88, 0.9, 0.81, 0.66, 0.18],
  [100, 0.84, 0.73, 0.88, 0.32],
  [118, 0.74, 0.56, 1, 0.62],
  [140, 0.62, 0.34, 1, 0.88],
];

const SURGE_LOBES: readonly LobeSpec[] = [
  [-1, 0.58, 0.3, 0.55, 5.5, 0.5],
  [1, 0.76, 0.36, 0.95, 4.8, 0.46],
  [-1, 0.34, 0.42, 1.45, 4.2, 0.42],
  [1, 0.5, 0.24, 1.9, 3.6, 0.36],
];

const SURGE_VOIDS: readonly VoidSpec[] = [
  [0.05, 0.62, -17, 0.5, 4.6, 1],
  [0.04, 0.5, 15, -0.7, 3.8, 0.9],
  [0.1, 0.38, 1, 1.1, 2.6, 0.8],
  [0.16, 0.3, -8, 1.6, 1.8, 0.68],
];

const SURGE_SHARDS: readonly ShardSpec[] = [
  [96, 96, -0.5, 34, 4.6, 0.5, 0.62],
  [158, 78, 0.42, 30, 4, 0.62, 0.58],
  [112, 52, 0.8, 24, 3.4, 0.72, 0.5],
  [150, 132, -0.9, 30, 3.6, 0.42, 0.46],
  [82, 148, 0.3, 22, 2.8, 0.34, 0.4],
  [176, 168, -0.35, 20, 2.6, 0.3, 0.34],
];

const RING_ARCS: readonly ArcSpec[] = [
  [Math.PI * 0.6, Math.PI * 0.4, 187, 42, 1, 0.35],
  [Math.PI * 1.2, Math.PI * 0.34, 181, 38, 0.86, 1.9],
  [Math.PI * 1.8, Math.PI * 0.32, 190, 42, 0.78, 3.4],
  [Math.PI * 2.26, Math.PI * 0.24, 175, 37, 0.62, 4.8],
];

const RING_NOTCHES: readonly NotchSpec[] = [
  [Math.PI * 1.36, 183, 2.6],
  [Math.PI * 2.32, 178, 2.2],
];

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

function flameOutline(
  tip: number,
  spread: number,
  lean: number,
  phase: number,
): Point[] {
  const height = FLAME_BASE - tip;
  const steps = 20;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const u = index / steps;
    const y = FLAME_BASE - height * u;
    const half = spread * FLAME_HALF
      * (0.075 + 0.5 * Math.sin(Math.PI * Math.pow(u, 0.62)))
      * (0.5 + 0.5 * Math.pow(1 - u, 0.55))
      * (1 - 0.94 * Math.pow(u, 3.2));
    const center = FLAME_CENTER
      + lean * Math.pow(u, 1.35)
      + 7 * spread * Math.sin(u * Math.PI * 1.7 + phase);
    left.push([center - half, y]);
    right.push([center + half, y]);
  }
  return [...left, ...right.reverse()];
}

function lobeSpine(
  spec: LobeSpec,
  spread: number,
  height: number,
  phase: number,
): Point[] {
  const side = spec[0];
  const lift = spec[1];
  const reach = spec[2];
  const curve = spec[3];
  const points: Point[] = [];
  const count = 7;
  for (let index = 0; index < count; index += 1) {
    const u = index / (count - 1);
    const x = FLAME_CENTER + side * spread
      * (FLAME_HALF * reach * Math.pow(u, 0.82)
        + 5 * Math.sin(u * Math.PI * 1.25 + phase + curve));
    const y = FLAME_BASE - height * (lift * u + 0.18 * u * u);
    points.push([x, y]);
  }
  return points;
}

function voidSpine(
  spec: VoidSpec,
  spread: number,
  height: number,
  phase: number,
): Point[] {
  const base = spec[0];
  const top = spec[1];
  const offset = spec[2];
  const curve = spec[3];
  const points: Point[] = [];
  const count = 6;
  for (let index = 0; index < count; index += 1) {
    const u = index / (count - 1);
    points.push([
      FLAME_CENTER
        + spread * (offset + curve * 26 * Math.sin(u * Math.PI * 1.15 + phase + curve)),
      FLAME_BASE - height * (base + (top - base) * u),
    ]);
  }
  return points;
}

function ruptureSpine(
  tip: number,
  height: number,
  spread: number,
  lean: number,
  tear: number,
  phase: number,
): Point[] {
  const points: Point[] = [];
  const count = 7;
  for (let index = 0; index < count; index += 1) {
    const u = index / (count - 1);
    const x = FLAME_CENTER + lean * 0.6
      + spread * (tear * 26 * Math.sin(u * Math.PI * 2.1 + phase) - tear * 16 * u);
    points.push([x, tip + 4 + height * 0.68 * u]);
  }
  return points;
}

function sliceSpine(
  index: number,
  slices: number,
  height: number,
  spread: number,
  shatter: number,
): Point[] {
  const y = FLAME_BASE - height * (0.18 + 0.6 * ((index + 0.5) / slices));
  const tilt = 14 * Math.sin(index * 1.7 + 0.6) * shatter;
  const points: Point[] = [];
  const count = 5;
  for (let step = 0; step < count; step += 1) {
    const u = step / (count - 1);
    const x = FLAME_CENTER - 78 * spread + 156 * spread * u;
    points.push([x, y - tilt * (u * 2 - 1) - 6 * shatter * Math.sin(u * Math.PI + index)]);
  }
  return points;
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
      * Math.pow(Math.sin(Math.PI * u), 0.6)
      * (1 - 0.35 * u)
      * (1 + bias * (1 - u));
    const nx = -dy / length;
    const ny = dx / length;
    left.push([current[0] + nx * half, current[1] + ny * half]);
    right.push([current[0] - nx * half, current[1] - ny * half]);
  }
  return [...left, ...right.reverse()];
}

function fadeSurge(context: CanvasRenderingContext2D, top: number): void {
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = gradient(context, 0, top, 0, FLAME_BASE + 12, [
    [0, "rgba(255,255,255,0)"],
    [0.08, "rgba(255,255,255,0.4)"],
    [0.28, "#ffffff"],
    [0.92, "#ffffff"],
    [0.965, "rgba(255,255,255,0.55)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  context.restore();
}

function drawSurgeFrame(context: CanvasRenderingContext2D, frame: number): void {
  const pose = SURGE_POSES[frame]!;
  const tip = pose[0];
  const spread = pose[1];
  const gain = pose[2];
  const tear = pose[3];
  const shatter = pose[4];
  const height = FLAME_BASE - tip;
  const lean = 5 * Math.sin(frame * 0.86 + 0.4);
  const phase = frame * 0.62;

  paintShape(context, flameOutline(tip, spread, lean, phase), gradient(
    context,
    0,
    FLAME_BASE,
    0,
    tip,
    [
      [0, "rgba(250,247,238,0.34)"],
      [0.24, "rgba(252,249,241,0.48)"],
      [0.56, "rgba(255,253,247,0.56)"],
      [0.84, "rgba(255,254,250,0.44)"],
      [1, "rgba(255,255,252,0.2)"],
    ],
  ));

  const coreX = FLAME_CENTER + lean * 0.5;
  const coreY = FLAME_BASE - height * 0.44;
  const coreRadius = spread * 76 + 12;
  const core = context.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreRadius);
  core.addColorStop(0, "rgba(255,254,250,0.92)");
  core.addColorStop(0.4, "rgba(255,253,246,0.6)");
  core.addColorStop(0.76, "rgba(251,247,238,0.26)");
  core.addColorStop(1, "rgba(251,247,238,0)");
  paintShape(
    context,
    flameOutline(tip + height * 0.3, spread * 0.5, lean * 0.7, phase + 0.8),
    core,
  );

  for (const lobe of SURGE_LOBES) {
    const spine = lobeSpine(lobe, spread, height, phase);
    const start = spine[0]!;
    const end = spine[spine.length - 1]!;
    const alpha = lobe[5];
    paintShape(context, ribbon(spine, lobe[4] * spread), gradient(
      context,
      start[0],
      start[1],
      end[0],
      end[1],
      [
        [0, `rgba(252,249,241,${alpha})`],
        [0.5, `rgba(255,253,247,${alpha * 0.86})`],
        [1, "rgba(255,254,250,0)"],
      ],
    ));
  }

  if (shatter > 0) {
    for (const shard of SURGE_SHARDS) {
      const x = shard[0];
      const y = shard[1];
      const angle = shard[2];
      const length = shard[3];
      const driftX = (x - FLAME_CENTER) * 0.32 * shatter
        + Math.cos(angle) * shard[5] * shatter * 14;
      const driftY = -shard[5] * shatter * 36;
      const spine: Point[] = [];
      const count = 6;
      for (let index = 0; index < count; index += 1) {
        const u = index / (count - 1);
        const bow = 3 * Math.sin(u * Math.PI) * (1 - shatter * 0.4);
        spine.push([
          x + driftX + Math.cos(angle) * length * (u - 0.5) + Math.sin(angle) * bow,
          y + driftY + Math.sin(angle) * length * (u - 0.5) - Math.cos(angle) * bow,
        ]);
      }
      paintShape(
        context,
        ribbon(spine, shard[4] * (1 - 0.3 * shatter)),
        `rgba(253,250,243,${shard[6] * (1 - 0.45 * shatter)})`,
      );
    }
  }

  for (const voidSpec of SURGE_VOIDS) {
    eraseShape(
      context,
      ribbon(voidSpine(voidSpec, spread, height, phase), voidSpec[4] * spread * (1 + tear * 0.9)),
      voidSpec[5] * (1 - shatter * 0.35),
    );
  }

  if (tear > 0) {
    eraseShape(
      context,
      ribbon(ruptureSpine(tip, height, spread, lean, tear, phase), spread * (2 + 15 * tear), 1.6),
      Math.min(1, 0.5 + tear * 0.6),
    );
  }

  if (shatter > 0) {
    const slices = 4;
    for (let index = 0; index < slices; index += 1) {
      eraseShape(
        context,
        ribbon(sliceSpine(index, slices, height, spread, shatter), 2 + 13 * shatter),
        Math.min(1, shatter * 1.6),
      );
    }
  }

  fadeSurge(context, shatter > 0 ? Math.min(tip, 46) : tip);
  limitOpacity(context, TILE_SIZE, gain);
}

function drawSurge(context: CanvasRenderingContext2D): void {
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    context.save();
    context.translate(
      (frame % ATLAS_COLUMNS) * TILE_SIZE,
      Math.floor(frame / ATLAS_COLUMNS) * TILE_SIZE,
    );
    context.beginPath();
    context.rect(
      TILE_PADDING,
      TILE_PADDING,
      TILE_SIZE - TILE_PADDING * 2,
      TILE_SIZE - TILE_PADDING * 2,
    );
    context.clip();
    drawSurgeFrame(context, frame);
    context.restore();
  }
}

function drawSpark(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(32, 32);
  context.rotate(0.06);
  context.translate(-32, -32);
  paintShape(context, [
    [32, 3.5],
    [29.2, 11],
    [26.6, 21],
    [26.2, 31],
    [27.4, 41],
    [29.6, 51],
    [32, 60.5],
    [34.4, 51],
    [36.6, 41],
    [37.8, 31],
    [37.4, 21],
    [34.8, 11],
  ], gradient(context, 32, 3, 32, 61, [
    [0, "rgba(250,247,238,0)"],
    [0.16, "rgba(252,249,242,0.6)"],
    [0.5, "rgba(255,254,249,0.88)"],
    [0.84, "rgba(252,249,242,0.6)"],
    [1, "rgba(250,247,238,0)"],
  ]));
  paintShape(context, [
    [32, 11.5],
    [30.5, 20],
    [29.4, 31.5],
    [30.2, 41],
    [32, 52],
    [33.8, 41],
    [34.6, 31.5],
    [33.5, 20],
  ], gradient(context, 32, 12, 32, 52, [
    [0, "rgba(255,255,254,0)"],
    [0.22, "rgba(255,254,250,0.68)"],
    [0.5, "rgba(255,255,252,0.92)"],
    [0.8, "rgba(255,254,250,0.66)"],
    [1, "rgba(255,255,254,0)"],
  ]));
  context.restore();
  limitOpacity(context, SPARK_SIZE, 0.96);
}

function drawRingRibbon(
  context: CanvasRenderingContext2D,
  arc: ArcSpec,
  fill: Fill,
): void {
  const start = arc[0];
  const sweep = arc[1];
  const radius = arc[2];
  const width = arc[3];
  const wobble = arc[5];
  const outer: Point[] = [];
  const inner: Point[] = [];
  const samples = 24;
  for (let index = 0; index <= samples; index += 1) {
    const u = index / samples;
    const angle = start + sweep * u;
    const envelope = 0.52 + 0.48 * Math.pow(Math.sin(Math.PI * u), 0.35);
    const middle = radius + Math.sin(u * Math.PI * 2.7 + wobble) * 7;
    const half = width * envelope * (1 + 0.16 * Math.sin(u * Math.PI * 3.4 + wobble * 2.1));
    outer.push([
      RING_CENTER + Math.cos(angle) * (middle + half),
      RING_CENTER + Math.sin(angle) * (middle + half),
    ]);
    inner.push([
      RING_CENTER + Math.cos(angle) * (middle - half),
      RING_CENTER + Math.sin(angle) * (middle - half),
    ]);
  }
  context.save();
  context.globalAlpha = arc[4];
  context.fillStyle = fill;
  context.beginPath();
  traceSmoothPath(context, outer, true);
  traceSmoothPath(context, inner.reverse(), false);
  context.closePath();
  context.fill();
  context.restore();
}

function drawRing(context: CanvasRenderingContext2D): void {
  const band = context.createRadialGradient(
    RING_CENTER,
    RING_CENTER,
    116,
    RING_CENTER,
    RING_CENTER,
    250,
  );
  band.addColorStop(0, "rgba(246,242,230,0)");
  band.addColorStop(0.18, "rgba(248,244,234,0.3)");
  band.addColorStop(0.42, "rgba(253,250,242,0.78)");
  band.addColorStop(0.6, "rgba(255,253,247,0.88)");
  band.addColorStop(0.78, "rgba(252,248,238,0.6)");
  band.addColorStop(0.92, "rgba(248,243,232,0.2)");
  band.addColorStop(1, "rgba(248,243,232,0)");
  for (const arc of RING_ARCS) drawRingRibbon(context, arc, band);
  for (const notch of RING_NOTCHES) {
    const angle = notch[0];
    const radius = notch[1];
    const thickness = notch[2];
    context.save();
    context.translate(RING_CENTER, RING_CENTER);
    context.rotate(angle);
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.moveTo(radius - 64, -thickness);
    context.lineTo(radius + 64, -thickness * 0.35);
    context.lineTo(radius + 64, thickness * 0.35);
    context.lineTo(radius - 64, thickness);
    context.closePath();
    context.fill();
    context.restore();
  }
}

function createManaBurnTexture(
  name: string,
  size: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const texture = createCanvasTexture(size, size, draw);
  texture.name = `ManaBurn.${name}`;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
}

export class ManaBurnTextures {
  readonly surge: CanvasTexture;
  readonly spark: CanvasTexture;
  readonly ring: CanvasTexture;

  constructor() {
    this.surge = createManaBurnTexture("surge", ATLAS_SIZE, drawSurge);
    this.spark = createManaBurnTexture("spark", SPARK_SIZE, drawSpark);
    this.ring = createManaBurnTexture("ring", RING_SIZE, drawRing);
  }

  dispose(): void {
    this.surge.dispose();
    this.spark.dispose();
    this.ring.dispose();
  }
}

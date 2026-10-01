import { ClampToEdgeWrapping, type CanvasTexture } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type Point = readonly [number, number];

const TILE_SIZE = 256;
const TILE_PADDING = 8;
const ATLAS_COLUMNS = 4;
const FRAME_COUNT = 16;

function createFuryTexture(
  size: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const texture = createCanvasTexture(size, size, draw);
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
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

function drawShard(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  tilt: number,
): void {
  context.save();
  context.translate(x, y);
  context.rotate(tilt);
  context.scale(width, height);
  context.fillStyle = "rgba(214,214,214,0.52)";
  context.beginPath();
  context.moveTo(0.12, -0.5);
  context.bezierCurveTo(0.18, -0.18, 0.35, -0.03, 0.5, 0.04);
  context.bezierCurveTo(0.18, 0.12, -0.02, 0.3, -0.14, 0.5);
  context.bezierCurveTo(-0.18, 0.22, -0.32, 0.06, -0.5, -0.02);
  context.bezierCurveTo(-0.2, -0.1, 0.02, -0.34, 0.12, -0.5);
  context.closePath();
  context.fill();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(0.1, -0.38);
  context.bezierCurveTo(0.08, -0.08, 0.18, 0.01, 0.29, 0.04);
  context.bezierCurveTo(0.08, 0.09, -0.03, 0.25, -0.1, 0.34);
  context.bezierCurveTo(-0.08, 0.12, -0.19, 0.03, -0.27, -0.01);
  context.bezierCurveTo(-0.08, -0.06, 0.02, -0.24, 0.1, -0.38);
  context.closePath();
  context.fill();
  context.restore();
}

function drawRisingBrush(
  context: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  width: number,
  height: number,
  bend: number,
  tear: number,
): void {
  context.save();
  context.translate(x, baseY);
  context.scale(width * bend, height);
  context.fillStyle = "rgba(210,210,210,0.42)";
  context.beginPath();
  context.moveTo(-0.15, 0);
  context.bezierCurveTo(-0.76, -0.3, -0.28, -0.76, 0.55, -1);
  context.bezierCurveTo(0.1, -0.64, -0.06, -0.26, -0.15, 0);
  context.closePath();
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.28)";
  context.beginPath();
  context.moveTo(-0.19, -0.09);
  context.bezierCurveTo(-0.57, -0.36, -0.23, -0.72, 0.4, -0.92);
  context.bezierCurveTo(-0.01, -0.58, -0.13, -0.27, -0.19, -0.09);
  context.closePath();
  context.fill();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(-0.3, -0.24);
  context.bezierCurveTo(-0.41, -0.46, -0.18, -0.71, 0.22, -0.84);
  context.bezierCurveTo(-0.1, -0.62, -0.23, -0.4, -0.3, -0.24);
  context.closePath();
  context.fill();
  if (tear > 0) {
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = "#ffffff";
    for (let index = 0; index < 3; index += 1) {
      const y = -0.18 - index * 0.23 - tear * 0.025;
      const gap = tear * (0.045 + index * 0.012);
      context.beginPath();
      context.moveTo(-1, y);
      context.bezierCurveTo(-0.38, y - 0.07, 0.23, y + 0.02, 1, y - 0.1);
      context.lineTo(1, y - 0.1 - gap);
      context.bezierCurveTo(0.2, y - gap, -0.42, y - 0.07 - gap, -1, y - gap);
      context.closePath();
      context.fill();
    }
  }
  context.restore();
}

function drawSurgeFrame(
  context: CanvasRenderingContext2D,
  frame: number,
): void {
  if (frame >= 14) {
    const rise = (frame - 14) * 26;
    const shrink = frame === 14 ? 1 : 0.65;
    drawShard(context, 110, 88 - rise, 7 * shrink, 24 * shrink, -0.22);
    drawShard(context, 136, 56 - rise, 5 * shrink, 29 * shrink, 0.18);
    drawShard(context, 159, 111 - rise, 6 * shrink, 18 * shrink, 0.32);
    limitOpacity(context, TILE_SIZE, frame === 14 ? 0.27 : 0.1);
    return;
  }

  const growth = Math.min(frame / 5, 1);
  const expansion = growth * growth * (3 - 2 * growth);
  const release = Math.max(0, frame - 9);
  const baseY = 236 - Math.min(frame, 9) * 1.5 - release * 12;
  const height = 34 + expansion * 154 - release * 7;
  const spread = 0.45 + expansion * 0.55;
  const sway = Math.sin(frame * 0.63) * 2.5;
  const tear = release / 4;

  drawRisingBrush(
    context,
    128 - 31 * spread + sway,
    baseY - 3,
    25 * spread,
    height * 0.74,
    -1,
    tear,
  );
  drawRisingBrush(
    context,
    128 + 33 * spread - sway * 0.5,
    baseY - 7,
    23 * spread,
    height * 0.85,
    1,
    tear * 1.12,
  );
  drawRisingBrush(context, 128 + sway, baseY, 34 * spread, height, 1, tear);
  limitOpacity(context, TILE_SIZE, 0.9 * (1 - release * 0.14));
}

function drawSurge(context: CanvasRenderingContext2D): void {
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const x = (frame % ATLAS_COLUMNS) * TILE_SIZE;
    const y = Math.floor(frame / ATLAS_COLUMNS) * TILE_SIZE;
    context.save();
    context.translate(x, y);
    context.beginPath();
    context.rect(
      TILE_PADDING + 1,
      TILE_PADDING + 1,
      TILE_SIZE - (TILE_PADDING + 1) * 2,
      TILE_SIZE - (TILE_PADDING + 1) * 2,
    );
    context.clip();
    drawSurgeFrame(context, frame);
    context.restore();
  }
}

function drawSlash(context: CanvasRenderingContext2D): void {
  context.fillStyle = "rgba(212,212,212,0.42)";
  context.beginPath();
  context.moveTo(8, 91);
  context.bezierCurveTo(34, 40, 83, 22, 120, 46);
  context.bezierCurveTo(83, 37, 47, 64, 8, 91);
  context.closePath();
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.28)";
  context.beginPath();
  context.moveTo(17, 82);
  context.bezierCurveTo(43, 44, 82, 28, 113, 43);
  context.bezierCurveTo(80, 39, 48, 62, 17, 82);
  context.closePath();
  context.fill();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(26, 71);
  context.bezierCurveTo(49, 44, 85, 31, 111, 42);
  context.bezierCurveTo(81, 35, 51, 52, 26, 71);
  context.closePath();
  context.fill();
  limitOpacity(context, 128, 0.9);
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

function drawRingRibbon(
  context: CanvasRenderingContext2D,
  start: number,
  sweep: number,
  radius: number,
  width: number,
  color: string,
): void {
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let index = 0; index <= 8; index += 1) {
    const t = index / 8;
    const angle = start + sweep * t;
    const middle = radius + Math.sin(t * Math.PI * 3 + start) * 3;
    const envelope = Math.pow(Math.sin(t * Math.PI), 0.8);
    const halfWidth = width * envelope * (0.9 + 0.1 * Math.sin(t * 9 + start));
    outer.push([
      256 + Math.cos(angle) * (middle + halfWidth),
      256 + Math.sin(angle) * (middle + halfWidth),
    ]);
    inner.push([
      256 + Math.cos(angle) * (middle - halfWidth),
      256 + Math.sin(angle) * (middle - halfWidth),
    ]);
  }
  context.fillStyle = color;
  context.beginPath();
  traceSmoothPath(context, outer, true);
  traceSmoothPath(context, inner.reverse(), false);
  context.closePath();
  context.fill();
}

function drawRing(context: CanvasRenderingContext2D): void {
  const strokes = [
    [-0.22, 1.64, 188, 39],
    [1.94, 1.81, 190, 41],
    [4.23, 1.45, 185, 35],
  ] as const;
  for (const [start, sweep, radius, width] of strokes) {
    drawRingRibbon(context, start, sweep, radius, width, "rgba(210,210,210,0.42)");
    drawRingRibbon(
      context,
      start + 0.025,
      sweep - 0.05,
      radius,
      width * 0.78,
      "rgba(255,255,255,0.28)",
    );
    drawRingRibbon(
      context,
      start + sweep * 0.15,
      sweep * 0.69,
      radius + width * 0.2,
      width * 0.15,
      "#ffffff",
    );
  }
  limitOpacity(context, 512, 0.9);
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(256, 256, 148, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export class FuryTextures {
  readonly surge: CanvasTexture;
  readonly slash: CanvasTexture;
  readonly spark: CanvasTexture;
  readonly ring: CanvasTexture;

  constructor() {
    this.surge = createFuryTexture(1024, drawSurge);
    this.slash = createFuryTexture(128, drawSlash);
    this.spark = createFuryTexture(64, (context) => {
      drawShard(context, 32, 32, 15, 52, 0.08);
      limitOpacity(context, 64, 0.9);
    });
    this.ring = createFuryTexture(512, drawRing);
  }

  dispose(): void {
    this.surge.dispose();
    this.slash.dispose();
    this.spark.dispose();
    this.ring.dispose();
  }
}

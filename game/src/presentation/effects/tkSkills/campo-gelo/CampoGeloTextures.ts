import { ClampToEdgeWrapping, type CanvasTexture } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type Fill = string | CanvasGradient;
type Stops = ReadonlyArray<readonly [number, string]>;
type VaporPose = readonly [width: number, height: number, alpha: number, tear: number];

const PADDING = 2;
const TILE_SIZE = 256;
const FROST_ANGLES = [0.09, 0.71, 1.34, 1.91, 2.58, 3.23, 3.88, 4.51, 5.17, 5.83];
const VAPOR_POSES: readonly VaporPose[] = [
  [0.42, 0.3, 0, 0],
  [0.54, 0.44, 0.28, 0],
  [0.67, 0.63, 0.52, 0],
  [0.8, 0.81, 0.77, 0],
  [0.91, 0.95, 0.94, 0],
  [0.98, 1, 1, 0],
  [1, 0.99, 0.94, 0.06],
  [1, 0.96, 0.84, 0.16],
  [1.01, 0.93, 0.71, 0.3],
  [1.02, 0.88, 0.58, 0.45],
  [1.03, 0.81, 0.45, 0.61],
  [1.04, 0.74, 0.32, 0.78],
  [1.04, 0.68, 0.22, 0.93],
  [1.04, 0.61, 0.13, 1],
  [1.04, 0.55, 0.05, 1],
  [1.04, 0.5, 0, 1],
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

function fillPath(context: CanvasRenderingContext2D, path: string, fill: Fill, alpha = 1): void {
  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = fill;
  context.fill(new Path2D(path));
  context.restore();
}

function paintTile(
  context: CanvasRenderingContext2D,
  size: number,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  context.save();
  context.beginPath();
  context.rect(PADDING, PADDING, size - PADDING * 2, size - PADDING * 2);
  context.clip();
  context.translate(PADDING, PADDING);
  context.scale(size - PADDING * 2, size - PADDING * 2);
  draw(context);
  context.restore();
}

function configure(texture: CanvasTexture, name: string): CanvasTexture {
  texture.name = `CampoGelo.${name}`;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
}

function single(
  name: string,
  size: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  return configure(createCanvasTexture(size, size, (context) => paintTile(context, size, draw)), name);
}

function drawFrost(context: CanvasRenderingContext2D): void {
  context.translate(0.5, 0.5);
  context.lineCap = "butt";
  context.lineJoin = "bevel";
  for (let branch = 0; branch < FROST_ANGLES.length; branch += 1) {
    context.save();
    context.rotate(FROST_ANGLES[branch]);
    context.beginPath();
    context.arc(0, 0, 0.475, -0.18, 0.18);
    context.arc(0, 0, 0.125, 0.18, -0.18, true);
    context.closePath();
    context.clip();
    const bend = Math.sin(branch * 2.3) * 0.019;
    const path = new Path2D();
    path.moveTo(0.135 + (branch % 3) * 0.02, 0);
    path.lineTo(0.231, bend);
    path.lineTo(0.28, bend - 0.015);
    path.lineTo(0.332, bend + 0.009);
    path.lineTo(0.395, bend - 0.006);
    path.lineTo(0.464 - (branch % 4) * 0.012, bend * 0.3);
    context.strokeStyle = gradient(context, 0.125, 0, 0.475, 0, [
      [0, "rgba(100,157,181,0)"],
      [0.18, "rgba(126,193,215,0.4)"],
      [0.5, "rgba(201,240,249,0.8)"],
      [0.79, "rgba(225,249,255,0.86)"],
      [1, "rgba(156,216,234,0)"],
    ]);
    context.lineWidth = 0.006;
    context.stroke(path);
    context.strokeStyle = "rgba(237,253,255,0.71)";
    context.lineWidth = 0.0018;
    context.stroke(path);
    for (let twig = 0; twig < 5; twig += 1) {
      const x = 0.239 + twig * 0.041;
      const side = (twig + branch) % 2 === 0 ? 1 : -1;
      const length = 0.024 + twig * 0.006;
      context.beginPath();
      context.moveTo(x - 0.012, bend * 0.5);
      context.lineTo(x + 0.018, side * length);
      context.lineTo(x + 0.06, side * (length + 0.009));
      context.moveTo(x + 0.013, side * length * 0.84);
      context.lineTo(x + 0.006, side * (length + 0.014));
      context.lineTo(x + 0.026, side * (length + 0.026));
      context.strokeStyle = twig % 2 === 0 ? "rgba(174,225,240,0.66)" : "rgba(116,182,205,0.5)";
      context.lineWidth = 0.0024;
      context.stroke();
      context.beginPath();
      context.moveTo(x + 0.006, side * 0.009);
      context.lineTo(x + 0.037, side * 0.037);
      context.lineTo(x + 0.055, side * 0.041);
      context.lineTo(x + 0.031, side * 0.015);
      context.closePath();
      context.fillStyle = twig % 2 === 0 ? "rgba(169,224,240,0.24)" : "rgba(215,245,251,0.2)";
      context.fill();
    }
    if (branch % 3 !== 1) {
      context.beginPath();
      const radius = 0.404 + (branch % 3) * 0.018;
      context.moveTo(radius - 0.012, -0.058);
      context.lineTo(radius, -0.035);
      context.lineTo(radius - 0.005, -0.009);
      context.strokeStyle = "rgba(194,237,248,0.49)";
      context.lineWidth = 0.003;
      context.stroke();
    }
    context.restore();
  }
}

function drawVapor(context: CanvasRenderingContext2D, frame: number): void {
  const [width, height, alpha, tear] = VAPOR_POSES[frame];
  if (alpha === 0) return;
  context.save();
  context.translate(0.5, 0.59 - tear * 0.025);
  context.scale(width, height);
  context.translate(-0.5, -0.59);
  context.globalAlpha = alpha;
  const body = gradient(context, 0, 0.31, 0, 0.73, [
    [0, "rgba(216,247,254,0)"],
    [0.2, "rgba(203,240,250,0.24)"],
    [0.44, "rgba(181,224,239,0.64)"],
    [0.65, "rgba(159,209,228,0.71)"],
    [0.86, "rgba(122,174,200,0.35)"],
    [1, "rgba(104,151,182,0)"],
  ]);
  fillPath(context, `
    M .066 .636 Q .138 .591 .187 .559 Q .238 .532 .28 .542
    C .344 .551 .347 .457 .418 .431 Q .463 .413 .506 .449
    C .547 .48 .601 .436 .654 .403 Q .704 .372 .73 .337
    Q .747 .408 .689 .449 Q .661 .478 .707 .493
    C .787 .507 .84 .552 .929 .566 Q .88 .597 .803 .6
    Q .855 .642 .945 .647 C .805 .708 .682 .668 .584 .695
    C .475 .718 .388 .669 .302 .696 Q .196 .713 .066 .636 Z
  `, body);
  fillPath(context, `
    M .114 .616 C .251 .603 .263 .555 .335 .567
    Q .405 .578 .448 .518 Q .48 .48 .52 .496
    Q .614 .539 .664 .465 Q .655 .534 .576 .551
    Q .523 .568 .482 .552 C .398 .607 .263 .59 .114 .616 Z
  `, "#e1f7ff", 0.39);
  fillPath(context, `
    M .366 .493 Q .419 .438 .454 .458 Q .47 .463 .482 .485
    Q .461 .477 .44 .484 Q .419 .47 .366 .493 Z
  `, "#f0fcff", 0.29);
  fillPath(context, `
    M .506 .651 Q .603 .605 .685 .63 Q .73 .653 .855 .62
    Q .823 .674 .692 .654 Q .61 .637 .506 .651 Z
  `, "#bfe7f6", 0.31);
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = 1;
  fillPath(context, `
    M .158 .582 Q .264 .547 .344 .588 Q .303 .579 .249 .6 Z
  `, "#ffffff");
  if (tear > 0) {
    context.lineCap = "round";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 0.006 + tear * 0.077;
    for (let split = 0; split < 4; split += 1) {
      const x = 0.238 + split * 0.184;
      context.beginPath();
      context.moveTo(x - 0.062, 0.32);
      context.bezierCurveTo(x + 0.047, 0.43, x - 0.041, 0.57, x + 0.047, 0.77);
      context.stroke();
    }
  }
  context.restore();
  if (tear > 0.3) {
    context.save();
    context.translate(-tear * 0.033, -tear * 0.038);
    fillPath(context, "M .119 .541 Q .197 .465 .29 .501 Q .194 .5 .119 .541 Z", "#d6f2fc", 0.4);
    context.restore();
    context.save();
    context.translate(tear * 0.022, -tear * 0.031);
    fillPath(context, "M .731 .472 Q .82 .438 .894 .481 Q .813 .46 .731 .472 Z", "#c4e8f6", 0.32);
    context.restore();
  }
  context.restore();
}

function createVapor(): CanvasTexture {
  return configure(createCanvasTexture(1024, 1024, (context) => {
    for (let frame = 0; frame < VAPOR_POSES.length; frame += 1) {
      context.save();
      context.translate((frame % 4) * TILE_SIZE, Math.floor(frame / 4) * TILE_SIZE);
      paintTile(context, TILE_SIZE, (tile) => drawVapor(tile, frame));
      context.restore();
    }
  }), "vapor");
}

function drawFlake(context: CanvasRenderingContext2D): void {
  fillPath(context, "M .531 .058 L .585 .445 L .522 .914 L .408 .565 L .459 .329 Z",
    gradient(context, 0.47, 0.87, 0.54, 0.08, [
      [0, "rgba(81,128,155,0.18)"],
      [0.28, "rgba(114,186,211,0.79)"],
      [0.67, "rgba(193,237,250,0.95)"],
      [1, "rgba(245,254,255,0.98)"],
    ]));
  fillPath(context, "M .531 .058 L .511 .493 L .522 .914 L .585 .445 Z", "#b5e4f4", 0.56);
  fillPath(context, "M .531 .058 L .511 .493 L .468 .55 L .477 .319 Z", "#f3fdff", 0.84);
  fillPath(context, "M .447 .442 L .368 .336 L .439 .584 L .471 .614 Z", "#a2d7eb", 0.68);
  fillPath(context, "M .557 .613 L .65 .47 L .582 .699 L .535 .803 Z", "#d4f3fc", 0.65);
}

function drawFlash(context: CanvasRenderingContext2D): void {
  const glow = context.createRadialGradient(0.49, 0.51, 0, 0.49, 0.51, 0.19);
  glow.addColorStop(0, "rgba(211,244,255,0.36)");
  glow.addColorStop(0.35, "rgba(168,224,248,0.13)");
  glow.addColorStop(1, "rgba(120,194,228,0)");
  context.fillStyle = glow;
  context.fillRect(0.29, 0.31, 0.4, 0.4);
  fillPath(context, `
    M .49 .507 L .426 .374 L .449 .458 L .143 .406 L .429 .534
    L .284 .825 L .484 .582 L .541 .71 L .53 .561 L .918 .605
    L .595 .506 L .754 .231 L .535 .452 L .573 .097 Z
  `, gradient(context, 0.16, 0.81, 0.76, 0.16, [
    [0, "rgba(153,216,239,0.12)"],
    [0.36, "rgba(216,246,255,0.79)"],
    [0.56, "rgba(246,254,255,0.96)"],
    [1, "rgba(184,231,251,0.17)"],
  ]));
  fillPath(context, "M .455 .51 L .487 .478 L .529 .489 L .558 .524 L .501 .557 Z", "#f5fdff", 0.9);
  fillPath(context, "M .267 .304 L .381 .403 L .358 .343 Z", "#c5edff", 0.52);
  fillPath(context, "M .694 .66 L .783 .742 L .735 .648 Z", "#c2e8fc", 0.44);
}

export class CampoGeloTextures {
  readonly frost: CanvasTexture = single("frost", 512, drawFrost);
  readonly vapor: CanvasTexture = createVapor();
  readonly flake: CanvasTexture = single("flake", TILE_SIZE, drawFlake);
  readonly flash: CanvasTexture = single("flash", TILE_SIZE, drawFlash);

  dispose(): void {
    this.frost.dispose();
    this.vapor.dispose();
    this.flake.dispose();
    this.flash.dispose();
  }
}

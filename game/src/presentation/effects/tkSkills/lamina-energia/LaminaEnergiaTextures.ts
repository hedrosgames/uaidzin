import { ClampToEdgeWrapping, type CanvasTexture } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type Fill = string | CanvasGradient;
type Stops = ReadonlyArray<readonly [number, string]>;
type ReleasePose = readonly [scale: number, alpha: number, fracture: number];

const TEXTURE_SIZE = 256;
const PADDING = 2;
const RELEASE_POSES: readonly ReleasePose[] = [
  [0.22, 0, 0],
  [0.32, 0.3, 0],
  [0.49, 0.57, 0],
  [0.71, 0.82, 0],
  [0.9, 0.96, 0],
  [1, 1, 0],
  [1.02, 0.96, 0],
  [1.03, 0.88, 0.1],
  [1.04, 0.77, 0.23],
  [1.05, 0.64, 0.4],
  [1.06, 0.48, 0.61],
  [1.07, 0.35, 0.8],
  [1.08, 0.23, 1],
  [1.09, 0.14, 1],
  [1.1, 0.06, 1],
  [1.1, 0, 1],
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

function fillPath(
  context: CanvasRenderingContext2D,
  path: string,
  fill: Fill,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha *= alpha;
  context.fillStyle = fill;
  context.fill(new Path2D(path));
  context.restore();
}

function cutPath(context: CanvasRenderingContext2D, path: string): void {
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "#ffffff";
  context.fill(new Path2D(path));
  context.restore();
}

function paintTile(
  context: CanvasRenderingContext2D,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  context.save();
  context.beginPath();
  context.rect(PADDING, PADDING, TEXTURE_SIZE - PADDING * 2, TEXTURE_SIZE - PADDING * 2);
  context.clip();
  context.translate(PADDING, PADDING);
  context.scale(TEXTURE_SIZE - PADDING * 2, TEXTURE_SIZE - PADDING * 2);
  draw(context);
  context.restore();
}

function configure(texture: CanvasTexture, name: string): CanvasTexture {
  texture.name = `LaminaEnergia.${name}`;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
}

function single(
  name: string,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  return configure(createCanvasTexture(TEXTURE_SIZE, TEXTURE_SIZE, (context) => {
    paintTile(context, draw);
  }), name);
}

function drawBlade(context: CanvasRenderingContext2D): void {
  context.fillStyle = gradient(context, 0, 0, 0, 1, [
    [0, "rgba(255,252,240,0.96)"],
    [0.11, "rgba(255,248,223,0.98)"],
    [0.32, "rgba(255,244,212,0.97)"],
    [0.38, "rgba(255,252,237,0.98)"],
    [0.42, "rgba(244,222,171,0.92)"],
    [0.7, "rgba(234,203,146,0.78)"],
    [0.92, "rgba(216,178,106,0.48)"],
    [1, "rgba(216,178,106,0.08)"],
  ]);
  context.fillRect(0, 0, 1, 1);
  fillPath(context, `
    M 0 .018 Q .3 .054 .5 .022 Q .75 .056 1 .018
    L 1 .057 Q .75 .086 .5 .051 Q .3 .082 0 .052 Z
  `, "#fffdf5", 0.66);
  fillPath(context, `
    M .06 .35 Q .34 .32 .55 .358 Q .77 .372 .95 .344
    Q .76 .399 .55 .386 Q .33 .351 .06 .35 Z
  `, "#fff9e8", 0.42);
  fillPath(context, `
    M .08 .56 Q .27 .6 .4 .57 L .53 .603
    Q .3 .64 .08 .56 Z
  `, "#e2c68f", 0.32);
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = gradient(context, 0, 0, 1, 0, [
    [0, "rgba(255,255,255,0.18)"],
    [0.045, "rgba(255,255,255,0.75)"],
    [0.15, "#ffffff"],
    [0.85, "#ffffff"],
    [0.955, "rgba(255,255,255,0.75)"],
    [1, "rgba(255,255,255,0.18)"],
  ]);
  context.fillRect(0, 0, 1, 1);
}

function drawTrail(context: CanvasRenderingContext2D): void {
  context.fillStyle = gradient(context, 0, 0, 0, 1, [
    [0, "rgba(255,246,221,0.66)"],
    [0.2, "rgba(249,233,191,0.58)"],
    [0.47, "rgba(239,213,159,0.38)"],
    [0.74, "rgba(223,188,120,0.16)"],
    [1, "rgba(223,188,120,0)"],
  ]);
  context.fillRect(0, 0, 1, 1);
  fillPath(context, `
    M .47 0 Q .39 .22 .49 .44 Q .56 .69 .5 .96
    Q .65 .61 .57 .39 Q .52 .18 .55 0 Z
  `, gradient(context, 0, 0, 0, 1, [
    [0, "rgba(255,251,233,0.52)"],
    [0.5, "rgba(255,243,211,0.18)"],
    [1, "rgba(255,243,211,0)"],
  ]));
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = gradient(context, 0, 0, 1, 0, [
    [0, "rgba(255,255,255,0)"],
    [0.16, "rgba(255,255,255,0.55)"],
    [0.38, "#ffffff"],
    [0.62, "#ffffff"],
    [0.84, "rgba(255,255,255,0.55)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  context.fillRect(0, 0, 1, 1);
}

function drawRelease(context: CanvasRenderingContext2D, frame: number): void {
  const [scale, alpha, fracture] = RELEASE_POSES[frame];
  if (alpha === 0) return;
  context.save();
  context.translate(0.5, 0.5);
  context.rotate(-0.11 + frame * 0.012);
  context.scale(scale, 0.48 + scale * 0.52);
  context.translate(-0.5, -0.5);
  const body = gradient(context, 0.22, 0.83, 0.73, 0.13, [
    [0, "rgba(214,173,95,0.12)"],
    [0.2, "rgba(233,207,153,0.66)"],
    [0.49, "rgba(255,242,211,0.95)"],
    [0.72, "rgba(255,250,233,0.95)"],
    [1, "rgba(239,216,166,0.2)"],
  ]);
  if (frame < 13) {
    fillPath(context, `
      M .134 .865 C .436 .633 .606 .296 .622 .102
      C .764 .301 .747 .539 .578 .643
      L .551 .626 C .4 .746 .269 .819 .134 .865 Z
    `, body);
    fillPath(context, `
      M .134 .865 C .436 .633 .606 .296 .622 .102
      C .665 .297 .488 .658 .134 .865 Z
    `, "#fffdf1", 0.87);
    fillPath(context, `
      M .317 .749 C .522 .571 .64 .355 .653 .222
      C .705 .405 .558 .653 .317 .749 Z
    `, "#fff3d3", 0.55);
    cutPath(context, `
      M .57 .645 Q .624 .549 .687 .53
      L .697 .557 Q .631 .574 .602 .675 Z
    `);
    if (fracture > 0) {
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.lineWidth = 0.008 + fracture * 0.085;
      context.strokeStyle = "#ffffff";
      for (let index = 0; index < 3; index += 1) {
        const y = 0.32 + index * 0.19;
        context.beginPath();
        context.moveTo(0.42 - index * 0.1, y - 0.1);
        context.quadraticCurveTo(0.67 - index * 0.11, y + 0.016, 0.86 - index * 0.1, y);
        context.stroke();
      }
      context.restore();
    }
  }
  if (frame >= 10) {
    const drift = (frame - 9) * 0.012;
    context.save();
    context.translate(drift, -drift);
    fillPath(context, "M .643 .175 Q .74 .278 .702 .395 Q .7 .269 .643 .175 Z", body);
    context.restore();
    context.save();
    context.translate(-drift, drift * 0.65);
    fillPath(context, "M .177 .839 Q .32 .734 .369 .661 Q .351 .763 .177 .839 Z", body);
    fillPath(context, "M .48 .62 L .571 .474 L .534 .591 Z", "#fff3d6", 0.7);
    context.restore();
  }
  context.restore();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = `rgba(255,255,255,${alpha})`;
  context.fillRect(0, 0, 1, 1);
}

function createRelease(): CanvasTexture {
  return configure(createCanvasTexture(TEXTURE_SIZE * 4, TEXTURE_SIZE * 4, (context) => {
    for (let frame = 0; frame < RELEASE_POSES.length; frame += 1) {
      context.save();
      context.translate((frame % 4) * TEXTURE_SIZE, Math.floor(frame / 4) * TEXTURE_SIZE);
      paintTile(context, (tile) => drawRelease(tile, frame));
      context.restore();
    }
  }), "release");
}

function drawSpark(context: CanvasRenderingContext2D): void {
  const body = gradient(context, 0.5, 0.055, 0.5, 0.945, [
    [0, "rgba(255,250,232,0)"],
    [0.15, "rgba(255,250,232,0.82)"],
    [0.34, "rgba(255,248,223,0.94)"],
    [0.56, "rgba(249,229,182,0.69)"],
    [0.8, "rgba(226,191,119,0.28)"],
    [1, "rgba(226,191,119,0)"],
  ]);
  fillPath(context, `
    M .505 .055 C .485 .182 .411 .365 .462 .552
    Q .511 .739 .493 .945 Q .569 .667 .536 .495
    Q .504 .298 .505 .055 Z
  `, body);
  fillPath(context, `
    M .505 .108 Q .462 .35 .488 .492 L .507 .628
    Q .515 .429 .505 .108 Z
  `, "#fffdf4", 0.74);
}

function drawImpact(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(0.51, 0.5);
  context.rotate(0.42);
  context.scale(0.18, 0.35);
  const glow = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  glow.addColorStop(0, "rgba(255,243,207,0.3)");
  glow.addColorStop(0.32, "rgba(244,215,157,0.15)");
  glow.addColorStop(1, "rgba(221,181,105,0)");
  context.fillStyle = glow;
  context.fillRect(-1, -1, 2, 2);
  context.restore();
  fillPath(context, `
    M .246 .898 Q .429 .59 .656 .112 Q .657 .361 .561 .51
    Q .421 .742 .246 .898 Z
  `, gradient(context, 0.25, 0.9, 0.66, 0.11, [
    [0, "rgba(222,184,111,0.04)"],
    [0.32, "rgba(254,239,200,0.83)"],
    [0.52, "rgba(255,251,237,0.98)"],
    [0.76, "rgba(255,242,211,0.85)"],
    [1, "rgba(235,203,145,0.05)"],
  ]));
  fillPath(context, "M .326 .77 L .557 .388 L .518 .527 Z", "#fffdf5", 0.88);
  fillPath(context, "M .561 .432 L .795 .29 L .646 .456 Z", "#fff2d1", 0.68);
  fillPath(context, "M .438 .541 L .235 .477 L .364 .554 Z", "#f4dcaa", 0.53);
  fillPath(context, "M .556 .587 L .704 .759 L .577 .674 Z", "#ebcc94", 0.44);
  cutPath(context, "M .594 .622 L .636 .633 L .668 .674 L .617 .664 Z");
}

function drawResidual(context: CanvasRenderingContext2D): void {
  const body = gradient(context, 0.25, 0.84, 0.69, 0.16, [
    [0, "rgba(221,182,108,0)"],
    [0.28, "rgba(230,199,139,0.3)"],
    [0.56, "rgba(251,236,198,0.66)"],
    [0.83, "rgba(243,220,171,0.43)"],
    [1, "rgba(230,199,139,0)"],
  ]);
  fillPath(context, `
    M .271 .849 Q .459 .611 .47 .475
    Q .456 .252 .671 .149 Q .521 .312 .531 .483
    Q .538 .652 .271 .849 Z
  `, body);
  fillPath(context, "M .477 .478 Q .49 .331 .578 .258 Q .524 .39 .477 .478 Z", "#fff3d5", 0.32);
  cutPath(context, "M .43 .546 L .572 .49 L .576 .53 L .409 .58 Z");
}

export class LaminaEnergiaTextures {
  readonly blade: CanvasTexture = single("blade", drawBlade);
  readonly trail: CanvasTexture = single("trail", drawTrail);
  readonly release: CanvasTexture = createRelease();
  readonly spark: CanvasTexture = single("spark", drawSpark);
  readonly impact: CanvasTexture = single("impact", drawImpact);
  readonly residual: CanvasTexture = single("residual", drawResidual);

  dispose(): void {
    this.blade.dispose();
    this.trail.dispose();
    this.release.dispose();
    this.spark.dispose();
    this.impact.dispose();
    this.residual.dispose();
  }
}

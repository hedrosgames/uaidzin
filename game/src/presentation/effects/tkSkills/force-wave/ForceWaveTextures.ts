import { ClampToEdgeWrapping, type CanvasTexture } from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";

type BrushFill = string | CanvasGradient;
type FramePose = readonly [spread: number, opacity: number, bend: number, tear: number];

const TILE_COUNT = 4;
const FRAME_SIZE = 256;
const FRAME_PADDING = 8;
const FRAME_POSES: readonly FramePose[] = [
  [0.14, 0.4, -0.008, 0],
  [0.22, 0.64, -0.016, 0],
  [0.32, 0.8, 0.01, 0],
  [0.52, 0.94, -0.024, 0],
  [0.75, 1, 0.016, 0.02],
  [0.92, 1, -0.018, 0.04],
  [1.04, 1, 0.012, 0.06],
  [0.98, 1, -0.012, 0.1],
  [1.03, 0.98, 0.013, 0.14],
  [0.99, 0.94, -0.018, 0.2],
  [1.02, 0.87, 0.006, 0.28],
  [1.04, 0.74, 0.018, 0.5],
  [1.03, 0.55, -0.009, 0.74],
  [1, 0.35, 0.014, 1],
  [1.01, 0.2, 0.01, 1],
  [1.04, 0.065, 0.006, 1],
];

const UPPER_BRUSH = `
  M .045 .5 C .273 .469 .557 .331 .793 .215
  C .746 .298 .835 .241 .888 .327
  C .849 .299 .835 .301 .811 .32
  C .7 .337 .53 .427 .36 .468
  C .222 .494 .128 .496 .045 .5 Z
`;

const CORE_BRUSH = `
  M .036 .5 C .216 .484 .446 .518 .612 .475
  C .719 .444 .811 .404 .891 .433
  C .913 .441 .93 .457 .934 .481
  C .9 .462 .87 .465 .845 .478
  C .758 .479 .711 .505 .641 .514
  C .478 .549 .251 .506 .036 .5 Z
`;

const LOWER_BRUSH = `
  M .074 .504 C .352 .527 .577 .595 .791 .694
  C .822 .711 .835 .752 .823 .793
  C .849 .762 .88 .733 .877 .715
  C .833 .706 .855 .683 .787 .662
  C .635 .642 .468 .538 .074 .504 Z
`;

const FRONT_BRUSH = `
  M .823 .254 C .883 .277 .932 .362 .929 .437
  C .948 .459 .952 .501 .925 .545
  C .936 .589 .912 .639 .873 .665
  C .895 .608 .9 .565 .878 .541
  C .916 .487 .889 .421 .862 .39
  C .894 .36 .863 .302 .823 .254 Z
`;

const INNER_CUTS = [
  `M .262 .486 C .466 .445 .633 .317 .81 .294
   C .751 .33 .717 .393 .612 .41
   C .474 .432 .385 .475 .262 .486 Z`,
  `M .308 .515 C .48 .527 .631 .605 .813 .666
   C .769 .695 .676 .672 .596 .61
   C .477 .553 .414 .531 .308 .515 Z`,
  `M .493 .495 C .636 .466 .772 .419 .872 .44
   C .78 .433 .648 .494 .493 .495 Z`,
];

const TEAR_CUTS = [
  `M .348 .403 C .373 .451 .382 .503 .374 .563
   L .451 .596 C .413 .529 .408 .46 .421 .375 Z`,
  `M .578 .298 C .638 .398 .654 .551 .578 .699
   L .663 .737 C .705 .583 .692 .402 .66 .259 Z`,
  `M .798 .162 C .762 .334 .796 .431 .936 .448
   L .967 .478 C .816 .485 .716 .332 .741 .171 Z`,
  `M .737 .843 C .786 .702 .845 .608 .955 .574
   L .969 .609 C .858 .682 .843 .748 .825 .854 Z`,
];

const FRAGMENT_BRUSHES = [
  `M .038 .5 C .106 .493 .179 .48 .242 .453
   C .189 .489 .115 .508 .038 .5 Z`,
  `M .229 .527 C .314 .541 .379 .577 .444 .599
   C .361 .592 .3 .555 .229 .527 Z`,
  `M .374 .441 C .457 .407 .529 .352 .571 .308
   C .548 .379 .457 .438 .374 .441 Z`,
  `M .537 .51 C .613 .473 .69 .465 .725 .483
   C .652 .48 .595 .527 .537 .51 Z`,
  `M .636 .639 C .704 .67 .765 .708 .786 .758
   C .725 .717 .688 .674 .636 .639 Z`,
  `M .772 .233 C .854 .258 .887 .31 .875 .357
   C .847 .294 .814 .266 .772 .233 Z`,
  `M .889 .431 C .937 .445 .948 .49 .915 .529
   C .923 .48 .906 .457 .889 .431 Z`,
  `M .838 .648 C .878 .624 .912 .587 .926 .554
   C .923 .606 .885 .658 .838 .648 Z`,
];

function white(alpha: number): string {
  return `rgba(255,255,255,${alpha})`;
}

function gradient(
  context: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: ReadonlyArray<readonly [number, number]>,
): CanvasGradient {
  const fill = context.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, alpha] of stops) fill.addColorStop(offset, white(alpha));
  return fill;
}

function brush(
  context: CanvasRenderingContext2D,
  shape: string,
  fill: BrushFill,
  opacity = 1,
): void {
  const path = new Path2D(shape);
  context.save();
  context.fillStyle = fill;
  context.strokeStyle = fill;
  context.lineJoin = "round";
  context.lineWidth = 0.006;
  context.globalAlpha = opacity * 0.16;
  context.stroke(path);
  context.globalAlpha = opacity;
  context.fill(path);
  context.restore();
}

function cut(context: CanvasRenderingContext2D, shape: string, opacity = 1): void {
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = opacity;
  context.fillStyle = "#ffffff";
  context.fill(new Path2D(shape));
  context.restore();
}

function paintTile(
  context: CanvasRenderingContext2D,
  size: number,
  padding: number,
  opacity: number,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  context.save();
  context.scale(size, size);
  const inset = padding / size;
  context.beginPath();
  context.rect(inset, inset, 1 - inset * 2, 1 - inset * 2);
  context.clip();
  draw(context);
  context.globalCompositeOperation = "destination-in";
  context.globalAlpha = opacity * 0.9;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1, 1);
  context.restore();
}

function configure(texture: CanvasTexture, name: string): CanvasTexture {
  texture.name = `ForceWave.${name}`;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.flipY = true;
  texture.premultiplyAlpha = false;
  return texture;
}

function drawWave(context: CanvasRenderingContext2D, frame: number): void {
  const [spread, , bend, tear] = FRAME_POSES[frame];
  const flex = Math.sin(frame * 1.73) * 0.009;
  context.save();
  context.transform(1, bend, 0, spread, 0, 0.5 * (1 - spread) - 0.035 * bend);
  const body = gradient(context, 0.03, 0.5, 0.955, 0.5, [
    [0, 0.12], [0.18, 0.35], [0.45, 0.44], [0.77, 0.56], [0.95, 0.67], [1, 0.48],
  ]);
  const highlight = gradient(context, 0.035, 0.5, 0.95, 0.5, [
    [0, 0.18], [0.22, 0.36], [0.57, 0.61], [0.86, 0.8], [1, 0.64],
  ]);
  if (frame < 14) {
    const silhouette = `
      M .035 .5 C .186 .488 .333 .467 .48 .399
      C .635 .337 .738 ${0.213 + flex} .804 ${0.182 + flex}
      C .827 .174 .816 .222 .821 .245
      C .855 .207 .893 .265 .902 .313
      C .884 .294 .873 .3 .871 .32
      C .931 .345 .955 ${0.405 - flex} .931 .45
      C .956 .487 .948 .532 .923 .558
      C .946 .601 .918 .668 .882 .69
      C .904 .705 .887 .745 .855 .772
      C .843 .786 .831 .8 .818 .804
      C .844 .723 .811 .72 .778 .701
      C .673 ${0.72 - flex} .623 .681 .544 .634
      C .347 .545 .225 .512 .035 .5 Z
    `;
    brush(context, silhouette, body, 1 - tear * 0.72);
    brush(context, UPPER_BRUSH, highlight, 0.75);
    brush(context, LOWER_BRUSH, highlight, 0.8);
    brush(context, CORE_BRUSH, highlight);
    context.save();
    context.translate(0, flex);
    brush(context, FRONT_BRUSH, highlight, 0.91);
    context.restore();
    for (const shape of INNER_CUTS) cut(context, shape);
    cut(context, `
      M .832 ${0.329 + flex} C .873 .343 .908 .37 .949 .362
      L .966 .386 C .921 .401 .867 .359 .832 ${0.329 + flex} Z
    `, 0.88);
    cut(context, `
      M .765 ${0.577 - flex} C .821 .591 .877 .649 .937 .634
      L .94 .655 C .883 .689 .803 .601 .765 ${0.577 - flex} Z
    `);
    for (let index = 0; index < TEAR_CUTS.length; index += 1) {
      cut(context, TEAR_CUTS[index], Math.min(1, tear * (1.35 + index * 0.18)));
    }
    cut(context, `
      M .13 .491 C .292 .474 .458 .394 .625 .343
      C .447 .422 .299 .493 .13 .491 Z
    `, 0.68);
  }
  if (frame >= 10) {
    for (let index = 0; index < FRAGMENT_BRUSHES.length; index += 1) {
      context.save();
      const side = index % 2 === 0 ? -1 : 1;
      context.translate(0, side * (frame - 10) * 0.004);
      brush(context, FRAGMENT_BRUSHES[index], highlight, frame < 14 ? tear * 0.68 : 1);
      context.restore();
    }
  }
  context.restore();
}

function createMain(): CanvasTexture {
  const size = FRAME_SIZE * TILE_COUNT;
  return configure(createCanvasTexture(size, size, (context) => {
    for (let frame = 0; frame < FRAME_POSES.length; frame += 1) {
      const column = frame % TILE_COUNT;
      const row = Math.floor(frame / TILE_COUNT);
      context.save();
      context.translate(column * FRAME_SIZE, row * FRAME_SIZE);
      paintTile(context, FRAME_SIZE, FRAME_PADDING, FRAME_POSES[frame][1], (tile) => {
        drawWave(tile, frame);
      });
      context.restore();
    }
  }), "main");
}

function createParticle(
  name: string,
  size: number,
  padding: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  return configure(createCanvasTexture(size, size, (context) => {
    paintTile(context, size, padding, 1, draw);
  }), name);
}

function drawStreak(context: CanvasRenderingContext2D): void {
  const fill = gradient(context, 0.5, 0.03, 0.5, 0.97, [
    [0, 0.1], [0.2, 0.52], [0.48, 0.82], [0.7, 0.7], [0.9, 0.34], [1, 0.04],
  ]);
  brush(context, `
    M .495 .035 C .465 .236 .385 .454 .435 .713
    C .45 .816 .482 .913 .514 .965
    C .492 .804 .532 .615 .565 .419
    C .583 .234 .55 .103 .495 .035 Z
  `, fill);
  brush(context, `
    M .496 .112 C .485 .345 .443 .504 .478 .699
    C .488 .785 .5 .856 .507 .897
    C .496 .666 .53 .415 .526 .284
    C .523 .202 .508 .156 .496 .112 Z
  `, white(0.72));
  cut(context, `
    M .447 .364 C .43 .48 .437 .618 .469 .728
    C .45 .581 .46 .488 .447 .364 Z
  `, 0.82);
}

function drawEdge(context: CanvasRenderingContext2D): void {
  const fill = gradient(context, 0.24, 0.94, 0.71, 0.13, [
    [0, 0.05], [0.26, 0.45], [0.55, 0.78], [0.81, 0.64], [1, 0.12],
  ]);
  brush(context, `
    M .207 .921 C .543 .847 .856 .551 .758 .32
    C .717 .216 .576 .117 .345 .055
    C .531 .177 .608 .283 .591 .381
    C .679 .488 .504 .755 .207 .921 Z
  `, fill);
  brush(context, `
    M .318 .843 C .624 .661 .758 .456 .664 .283
    C .79 .418 .724 .669 .318 .843 Z
  `, white(0.66));
  cut(context, `
    M .622 .555 C .679 .542 .755 .497 .791 .438
    L .806 .467 C .746 .539 .699 .558 .622 .555 Z
  `);
  cut(context, `
    M .558 .206 C .617 .236 .666 .268 .73 .266
    L .75 .285 C .677 .31 .61 .249 .558 .206 Z
  `, 0.8);
}

function drawImpact(context: CanvasRenderingContext2D): void {
  const fill = gradient(context, 0.25, 0.18, 0.74, 0.84, [
    [0, 0.32], [0.3, 0.73], [0.48, 0.9], [0.67, 0.72], [1, 0.24],
  ]);
  brush(context, `
    M .473 .405 C .48 .339 .442 .264 .425 .192
    L .555 .394 C .57 .42 .602 .381 .625 .364
    L .813 .27 C .738 .383 .65 .432 .649 .472
    L .883 .522 L .635 .553
    C .616 .57 .663 .702 .691 .798
    L .555 .648 L .493 .861
    C .481 .736 .505 .63 .468 .597
    L .274 .731 L .378 .561
    L .164 .603 C .291 .541 .379 .531 .389 .493
    L .209 .359 L .413 .437
    C .45 .45 .467 .43 .473 .405 Z
  `, fill);
  brush(context, `
    M .455 .455 C .515 .478 .537 .432 .586 .436
    L .562 .488 L .629 .529 L .551 .539
    L .513 .63 L .491 .539 L .401 .559 L .46 .51 Z
  `, white(0.8));
  brush(context, `
    M .262 .295 C .355 .147 .586 .104 .742 .227
    C .571 .14 .391 .187 .262 .295 Z
  `, white(0.58));
  brush(context, `
    M .188 .434 C .122 .525 .176 .654 .291 .684
    C .204 .619 .183 .524 .188 .434 Z
  `, white(0.52));
  brush(context, `
    M .586 .849 C .75 .824 .859 .701 .835 .602
    C .813 .705 .729 .799 .586 .849 Z
  `, white(0.65));
  brush(context, "M .764 .386 Q .808 .355 .85 .349 L .801 .397 Z", white(0.72));
  brush(context, "M .321 .792 L .371 .727 L .357 .778 Z", white(0.57));
  cut(context, `
    M .348 .529 C .418 .512 .477 .505 .532 .483
    C .489 .517 .424 .535 .348 .529 Z
  `);
  cut(context, "M .549 .352 L .578 .379 L .589 .425 L .566 .412 Z");
  cut(context, "M .577 .666 L .61 .635 L .644 .647 L .6 .694 Z");
}

function drawDebris(context: CanvasRenderingContext2D): void {
  const fill = gradient(context, 0.24, 0.16, 0.74, 0.76, [
    [0, 0.82], [0.36, 0.7], [0.7, 0.43], [1, 0.14],
  ]);
  brush(context, `
    M .268 .137 L .81 .446
    Q .672 .512 .311 .867
    L .337 .452 Z
  `, fill);
  brush(context, "M .268 .137 L .81 .446 L .4 .475 Z", white(0.43));
  cut(context, "M .324 .604 L .485 .486 L .393 .593 L .307 .745 Z", 0.7);
}

export class ForceWaveTextures {
  readonly main: CanvasTexture = createMain();
  readonly streak: CanvasTexture = createParticle("streak", 128, 4, drawStreak);
  readonly edge: CanvasTexture = createParticle("edge", 128, 4, drawEdge);
  readonly impact: CanvasTexture = createParticle("impact", 256, 8, drawImpact);
  readonly debris: CanvasTexture = createParticle("debris", 64, 2, drawDebris);

  dispose(): void {
    this.main.dispose();
    this.streak.dispose();
    this.edge.dispose();
    this.impact.dispose();
    this.debris.dispose();
  }
}

import {
  ApplyForce, Bezier, CircleEmitter, ColorOverLife, ConeEmitter, ConstantColor, ConstantValue,
  FrameOverLife, Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode,
  SizeOverLife, TurbulenceField, Vector3, Vector4,
} from "three.quarks";
import { createShrink } from "../../vfxKit/quarkFx";
import type { PicadaPeconhentaResources } from "./PicadaPeconhentaResources";

type Rgb = readonly [red: number, green: number, blue: number];
type ColorStop = [Vector3, number];

const VENOM_RAMP: readonly Rgb[] = [[0.82, 1, 0.55], [0.36, 0.78, 0.42], [0.09, 0.26, 0.17]];
const DEEP_RAMP: readonly Rgb[] = [[0.5, 0.86, 0.46], [0.19, 0.5, 0.3], [0.05, 0.14, 0.1]];
const BUBBLE_RAMP: readonly Rgb[] = [[0.9, 1, 0.72], [0.44, 0.86, 0.5], [0.14, 0.36, 0.24]];

function stops(ramp: readonly Rgb[]): ColorStop[] {
  return ramp.map(([red, green, blue], index) => [
    new Vector3(red, green, blue),
    index / (ramp.length - 1),
  ]);
}

function venomFade(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    stops(VENOM_RAMP),
    [[0, 0], [peak, 0.07], [peak * 0.76, 0.36], [peak * 0.28, 0.72], [0, 1]],
  ));
}

function deepFade(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    stops(DEEP_RAMP),
    [[0, 0], [peak, 0.1], [peak * 0.8, 0.42], [peak * 0.3, 0.78], [0, 1]],
  ));
}

function bubbleFade(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    stops(BUBBLE_RAMP),
    [[0, 0], [peak, 0.12], [peak * 0.82, 0.5], [peak * 0.3, 0.8], [0, 1]],
  ));
}

export interface PicadaPeconhentaParticleConfig {
  chargeCount: number;
  chargeRadius: number;
  chargeSpeed: number;
  trailEmission: number;
  satelliteEmission: number;
  splashCount: number;
  bubbleEmission: number;
}

export function createPicadaPeconhentaSystems(
  shared: PicadaPeconhentaResources,
  config: PicadaPeconhentaParticleConfig,
) {
  const burst = (count: number) => [{
    time: 0, count: new ConstantValue(count), cycle: 1, interval: 0, probability: 1,
  }];
  const common = {
    autoDestroy: false,
    looping: false,
    duration: 1 / 60,
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    startColor: new ConstantColor(new Vector4(1, 1, 1, 1)),
    worldSpace: true,
    renderOrder: 11,
  };
  const charge = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.26, 0.36),
    startSize: new IntervalValue(0.22, 0.46),
    startSpeed: new ConstantValue(-config.chargeSpeed),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(config.chargeCount),
    shape: new CircleEmitter({ radius: config.chargeRadius, thickness: 0.36 }),
    material: shared.materials.goo,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      new FrameOverLife(new PiecewiseBezier([[new Bezier(0, 3, 6, 9), 0]])),
      deepFade(0.86),
      new ApplyForce(new Vector3(0, -1, 0), new ConstantValue(config.chargeSpeed * 1.4)),
      createShrink(1),
    ],
  });
  const trail = new ParticleSystem({
    ...common,
    duration: 1.4,
    startLife: new IntervalValue(0.16, 0.34),
    startSize: new IntervalValue(0.16, 0.34),
    startSpeed: new IntervalValue(0.9, 3),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.trailEmission),
    emissionOverDistance: new ConstantValue(10),
    shape: new ConeEmitter({ radius: 0.14, thickness: 0.6, angle: 0.34 }),
    material: shared.materials.trail,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.3, lengthFactor: 2 },
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      new FrameOverLife(new PiecewiseBezier([[new Bezier(4, 7, 10, 13), 0]])),
      venomFade(0.74),
      new TurbulenceField(new Vector3(0.7, 0.7, 0.7), 2, new Vector3(0.5, 0.4, 0.5), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const satellites = new ParticleSystem({
    ...common,
    duration: 1.4,
    startLife: new IntervalValue(0.18, 0.4),
    startSize: new IntervalValue(0.08, 0.18),
    startSpeed: new IntervalValue(0.8, 2.2),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.satelliteEmission),
    shape: new ConeEmitter({ radius: 0.2, thickness: 1, angle: 0.9 }),
    material: shared.materials.droplet,
    renderMode: RenderMode.BillBoard,
    behaviors: [
      bubbleFade(0.6),
      new ApplyForce(new Vector3(0, -0.6, 0), new ConstantValue(1)),
      createShrink(1),
    ],
  });
  const splash = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.26, 0.52),
    startSize: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(1.8, 4.4),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(config.splashCount),
    shape: new PointEmitter(),
    material: shared.materials.droplet,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.18, lengthFactor: 2.6 },
    behaviors: [
      venomFade(0.92),
      new ApplyForce(new Vector3(0, -3.4, 0), new ConstantValue(1)),
      createShrink(1),
    ],
  });
  const pool = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.85),
    startSize: new ConstantValue(2.2),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.splash,
    renderMode: RenderMode.HorizontalBillBoard,
    renderOrder: 10,
    behaviors: [
      venomFade(0.8),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.34, 0.86, 1.04, 1.12), 0]])),
    ],
  });
  const bubbles = new ParticleSystem({
    ...common,
    duration: 1,
    looping: true,
    startLife: new IntervalValue(0.6, 1.1),
    startSize: new IntervalValue(0.08, 0.18),
    startSpeed: new IntervalValue(0.35, 0.8),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.bubbleEmission),
    shape: new ConeEmitter({ radius: 0.95, thickness: 0.5, angle: 0.16 }),
    material: shared.materials.bubble,
    renderMode: RenderMode.BillBoard,
    behaviors: [
      bubbleFade(0.66),
      new TurbulenceField(new Vector3(0.4, 0.4, 0.4), 1, new Vector3(0.24, 0.2, 0.24), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const systems = { charge, trail, satellites, splash, pool, bubbles };
  for (const [name, system] of Object.entries(systems)) {
    system.emitter.name = `PicadaPeconhenta_${name[0]!.toUpperCase() + name.slice(1)}`;
    system.emitter.renderOrder = 11;
    system.pause();
    system.emitter.visible = false;
  }
  return systems;
}

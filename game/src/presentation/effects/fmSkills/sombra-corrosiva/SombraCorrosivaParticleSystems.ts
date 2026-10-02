import {
  ApplyForce, Bezier, CircleEmitter, ColorOverLife, ConeEmitter, ConstantColor, ConstantValue,
  Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode,
  SizeOverLife, TurbulenceField, Vector3, Vector4,
} from "three.quarks";
import { createFlameAnimation, createShrink } from "../../vfxKit/quarkFx";
import type { SombraCorrosivaResources } from "./SombraCorrosivaResources";

type Rgb = readonly [red: number, green: number, blue: number];
type ColorStop = [Vector3, number];

const DARK_RAMP: readonly Rgb[] = [[0.62, 0.44, 0.78], [0.28, 0.16, 0.42], [0.05, 0.03, 0.1]];
const TRAIL_RAMP: readonly Rgb[] = [[0.54, 0.36, 0.7], [0.24, 0.13, 0.36], [0.04, 0.02, 0.08]];
const SPARK_RAMP: readonly Rgb[] = [[0.9, 0.78, 1], [0.72, 0.4, 0.72], [0.24, 0.12, 0.34]];
const HAZE_RAMP: readonly Rgb[] = [[0.34, 0.2, 0.5], [0.18, 0.1, 0.28], [0.06, 0.03, 0.11]];

function stops(ramp: readonly Rgb[]): ColorStop[] {
  return ramp.map(([red, green, blue], index) => [
    new Vector3(red, green, blue),
    index / (ramp.length - 1),
  ]);
}

function fade(ramp: readonly Rgb[], peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    stops(ramp),
    [[0, 0], [peak, 0.08], [peak * 0.78, 0.42], [peak * 0.3, 0.78], [0, 1]],
  ));
}

export interface SombraCorrosivaParticleConfig {
  wispCount: number;
  wispRadius: number;
  wispSpeed: number;
  trailEmission: number;
  fragmentCount: number;
  fragmentSpeed: number;
  hazeEmission: number;
  hazeCount: number;
}

export function createSombraCorrosivaSystems(
  shared: SombraCorrosivaResources,
  config: SombraCorrosivaParticleConfig,
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
    renderOrder: 12,
  };
  const wisp = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.24, 0.34),
    startSize: new IntervalValue(0.14, 0.34),
    startSpeed: new ConstantValue(-config.wispSpeed),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(config.wispCount),
    shape: new CircleEmitter({ radius: config.wispRadius, thickness: 0.34 }),
    material: shared.materials.body,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.12, lengthFactor: 2.4 },
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      createFlameAnimation([0, 3, 5, 7]),
      fade(DARK_RAMP, 0.88),
      new ApplyForce(new Vector3(0, -0.4, 0), new ConstantValue(1.2)),
      createShrink(1),
    ],
  });
  const trail = new ParticleSystem({
    ...common,
    duration: 1.2,
    startLife: new IntervalValue(0.18, 0.36),
    startSize: new IntervalValue(0.2, 0.44),
    startSpeed: new IntervalValue(0.6, 2),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.trailEmission),
    emissionOverDistance: new ConstantValue(8),
    shape: new ConeEmitter({ radius: 0.1, thickness: 0.7, angle: 0.4 }),
    material: shared.materials.trail,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.26, lengthFactor: 2.8 },
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      createFlameAnimation([4, 7, 9, 12]),
      fade(TRAIL_RAMP, 0.8),
      new TurbulenceField(new Vector3(0.7, 0.7, 0.7), 2, new Vector3(0.45, 0.35, 0.45), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const fragments = new ParticleSystem({
    ...common,
    duration: 0.34,
    startLife: new IntervalValue(0.24, 0.46),
    startSize: new IntervalValue(0.1, 0.26),
    startSpeed: new IntervalValue(config.fragmentSpeed * 0.6, config.fragmentSpeed * 1.3),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.fragmentCount * 6),
    shape: new ConeEmitter({ radius: 0.18, thickness: 0.8, angle: 0.3 }),
    material: shared.materials.streak,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.24, lengthFactor: 3.4 },
    behaviors: [
      fade(SPARK_RAMP, 0.92),
      new ApplyForce(new Vector3(0, -0.6, 0), new ConstantValue(2.2)),
      createShrink(1),
    ],
  });
  const haze = new ParticleSystem({
    ...common,
    duration: 0.46,
    startLife: new IntervalValue(0.5, 0.95),
    startSize: new IntervalValue(0.9, 2),
    startSpeed: new IntervalValue(0.3, 1.1),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.hazeEmission),
    emissionBursts: burst(config.hazeCount),
    shape: new ConeEmitter({ radius: 0.5, thickness: 0.9, angle: 0.5 }),
    material: shared.materials.haze,
    renderMode: RenderMode.BillBoard,
    renderOrder: 11,
    behaviors: [
      fade(HAZE_RAMP, 0.5),
      new ApplyForce(new Vector3(0, -0.3, 0), new ConstantValue(-0.4)),
      new TurbulenceField(new Vector3(1, 1, 1), 2, new Vector3(0.4, 0.5, 0.4), new Vector3(1, 1, 1)),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.5, 0.92, 1.16, 1.3), 0]])),
    ],
  });
  const iris = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.4),
    startSize: new ConstantValue(1.5),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.iris,
    renderMode: RenderMode.BillBoard,
    renderOrder: 13,
    behaviors: [
      fade([[1, 0.92, 1], [0.6, 0.36, 0.62], [0.14, 0.07, 0.2]], 0.92),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.3, 0.96, 1.02, 1.06), 0]])),
    ],
  });
  const systems = { wisp, trail, fragments, haze, iris };
  for (const [name, system] of Object.entries(systems)) {
    system.emitter.name = `SombraCorrosiva_${name[0]!.toUpperCase() + name.slice(1)}`;
    system.emitter.renderOrder = name === "haze" ? 11 : 12;
    system.pause();
    system.emitter.visible = false;
  }
  return systems;
}

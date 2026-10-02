import {
  ApplyForce, Bezier, CircleEmitter, ColorOverLife, ConeEmitter, ConstantColor, ConstantValue,
  Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode,
  SizeOverLife, TurbulenceField, Vector3, Vector4,
} from "three.quarks";
import { createFlameAnimation, createShrink } from "../../vfxKit/quarkFx";
import type { NevascaResources } from "./NevascaResources";

type Rgb = readonly [red: number, green: number, blue: number];
type ColorStop = [Vector3, number];

const SNOW_RAMP: readonly Rgb[] = [[0.96, 0.99, 1], [0.74, 0.88, 0.97], [0.44, 0.68, 0.9]];
const ICE_RAMP: readonly Rgb[] = [[0.86, 0.96, 1], [0.58, 0.8, 0.96], [0.28, 0.52, 0.82]];
const MIST_RAMP: readonly Rgb[] = [[0.72, 0.86, 0.97], [0.5, 0.7, 0.9], [0.28, 0.45, 0.72]];
const FLASH_RAMP: readonly Rgb[] = [[1, 1, 1], [0.82, 0.94, 1], [0.42, 0.72, 0.96]];

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

export interface NevascaParticleConfig {
  vortexCount: number;
  vortexRadius: number;
  vortexSpeed: number;
  crystalEmission: number;
  shardCount: number;
  shardSpeed: number;
  snowEmission: number;
  snowCount: number;
  mistEmission: number;
  mistCount: number;
  coreCount: number;
  coreSize: number;
}

export function createNevascaSystems(
  shared: NevascaResources,
  config: NevascaParticleConfig,
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
  const vortex = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.32, 0.52),
    startSize: new IntervalValue(0.16, 0.4),
    startSpeed: new ConstantValue(-config.vortexSpeed),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(config.vortexCount),
    shape: new CircleEmitter({ radius: config.vortexRadius, thickness: 0.6 }),
    material: shared.materials.frost,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.14, lengthFactor: 2.2 },
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      createFlameAnimation([0, 3, 5, 8]),
      fade(SNOW_RAMP, 0.9),
      new ApplyForce(new Vector3(0, 0.35, 0), new ConstantValue(0.8)),
      createShrink(1),
    ],
  });
  const crystals = new ParticleSystem({
    ...common,
    duration: 0.9,
    startLife: new IntervalValue(0.4, 0.8),
    startSize: new IntervalValue(0.22, 0.52),
    startSpeed: new IntervalValue(0.3, 1.1),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.crystalEmission),
    shape: new CircleEmitter({ radius: 3.55, thickness: 0.3 }),
    material: shared.materials.crystal,
    renderMode: RenderMode.BillBoard,
    behaviors: [
      fade(ICE_RAMP, 0.88),
      new ApplyForce(new Vector3(0, 0.6, 0), new ConstantValue(1.1)),
      new TurbulenceField(new Vector3(0.9, 0.9, 0.9), 2, new Vector3(0.5, 0.4, 0.5), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const shards = new ParticleSystem({
    ...common,
    duration: 0.3,
    startLife: new IntervalValue(0.24, 0.46),
    startSize: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(config.shardSpeed * 0.7, config.shardSpeed * 1.35),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.shardCount * 7),
    shape: new ConeEmitter({ radius: 0.3, thickness: 0.85, angle: 0.26 }),
    material: shared.materials.streak,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.22, lengthFactor: 3.6 },
    behaviors: [
      fade(FLASH_RAMP, 0.94),
      new ApplyForce(new Vector3(0, -0.5, 0), new ConstantValue(2.6)),
      createShrink(1),
    ],
  });
  const snow = new ParticleSystem({
    ...common,
    duration: 0.5,
    startLife: new IntervalValue(0.7, 1.3),
    startSize: new IntervalValue(0.16, 0.4),
    startSpeed: new IntervalValue(0.1, 0.5),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.snowEmission),
    emissionBursts: burst(config.snowCount),
    shape: new CircleEmitter({ radius: 3.6, thickness: 0.9 }),
    material: shared.materials.flake,
    renderMode: RenderMode.BillBoard,
    behaviors: [
      fade(SNOW_RAMP, 0.8),
      new ApplyForce(new Vector3(0, -0.35, 0), new ConstantValue(0.7)),
      new TurbulenceField(new Vector3(1.1, 1.1, 1.1), 2, new Vector3(0.6, 0.5, 0.6), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const mist = new ParticleSystem({
    ...common,
    duration: 0.5,
    startLife: new IntervalValue(0.5, 0.95),
    startSize: new IntervalValue(1.1, 2.4),
    startSpeed: new IntervalValue(0.2, 0.9),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.mistEmission),
    emissionBursts: burst(config.mistCount),
    shape: new CircleEmitter({ radius: 2.4, thickness: 0.95 }),
    material: shared.materials.frost,
    renderMode: RenderMode.BillBoard,
    renderOrder: 11,
    behaviors: [
      fade(MIST_RAMP, 0.46),
      new ApplyForce(new Vector3(0, -0.2, 0), new ConstantValue(-0.2)),
      new TurbulenceField(new Vector3(1.2, 1.2, 1.2), 2, new Vector3(0.45, 0.6, 0.45), new Vector3(1, 1, 1)),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.62, 0.96, 1.18, 1.32), 0]])),
    ],
  });
  const cores = Array.from({ length: config.coreCount }, (_, index) => new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.26 + index * 0.06),
    startSize: new ConstantValue(config.coreSize * (1 - index * 0.12)),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.flash,
    renderMode: RenderMode.BillBoard,
    renderOrder: 13,
    behaviors: [
      fade(FLASH_RAMP, 0.95),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.34, 1, 1.04, 1.08), 0]])),
    ],
  }));
  const systems = { vortex, crystals, shards, snow, mist, cores };
  for (const [name, system] of Object.entries(systems)) {
    if (Array.isArray(system)) {
      system.forEach((core, index) => {
        core.emitter.name = `Nevasca_Core${index}`;
        core.emitter.renderOrder = 13;
        core.pause();
        core.emitter.visible = false;
      });
      continue;
    }
    system.emitter.name = `Nevasca_${name[0]!.toUpperCase() + name.slice(1)}`;
    system.emitter.renderOrder = name === "mist" ? 11 : 12;
    system.pause();
    system.emitter.visible = false;
  }
  return systems;
}

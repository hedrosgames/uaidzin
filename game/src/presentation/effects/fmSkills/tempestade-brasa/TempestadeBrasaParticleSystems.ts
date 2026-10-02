import {
  ApplyForce, Bezier, ColorOverLife, ConeEmitter, ConstantColor, ConstantValue, Gradient,
  IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode, SizeOverLife,
  TurbulenceField, Vector3, Vector4,
} from "three.quarks";
import { createFlameAnimation, createShrink } from "../../vfxKit/quarkFx";
import type { TempestadeBrasaResources } from "./TempestadeBrasaResources";

type Rgb = readonly [red: number, green: number, blue: number];
type ColorStop = [Vector3, number];

const EMBER_RAMP: readonly Rgb[] = [[1, 0.98, 0.86], [1, 0.72, 0.3], [0.72, 0.2, 0.08], [0.16, 0.06, 0.03]];
const RAIN_RAMP: readonly Rgb[] = [[1, 0.96, 0.8], [1, 0.66, 0.26], [0.6, 0.16, 0.07], [0.12, 0.05, 0.03]];
const SPARK_RAMP: readonly Rgb[] = [[1, 1, 0.92], [1, 0.82, 0.42], [0.85, 0.34, 0.1], [0.2, 0.08, 0.03]];
const DUST_RAMP: readonly Rgb[] = [[0.62, 0.5, 0.4], [0.42, 0.33, 0.26], [0.24, 0.18, 0.14]];
const ASH_RAMP: readonly Rgb[] = [[0.5, 0.42, 0.35], [0.3, 0.25, 0.2], [0.16, 0.13, 0.11]];
const FLASH_RAMP: readonly Rgb[] = [[1, 0.98, 0.88], [1, 0.78, 0.4], [0.9, 0.4, 0.12]];

function stops(ramp: readonly Rgb[]): ColorStop[] {
  return ramp.map(([red, green, blue], index) => [
    new Vector3(red, green, blue),
    index / (ramp.length - 1),
  ]);
}

function fade(ramp: readonly Rgb[], peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    stops(ramp),
    [[0, 0], [peak, 0.08], [peak * 0.78, 0.4], [peak * 0.3, 0.76], [0, 1]],
  ));
}

export interface TempestadeBrasaParticleConfig {
  emberCount: number;
  emberEmission: number;
  rainEmission: number;
  rainCount: number;
  rainHeight: number;
  rainSpeed: number;
  cinderEmission: number;
  coreCount: number;
  coreSize: number;
  dustCount: number;
  ashEmission: number;
  areaRadius: number;
}

export function createTempestadeBrasaSystems(
  shared: TempestadeBrasaResources,
  config: TempestadeBrasaParticleConfig,
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
  const embers = new ParticleSystem({
    ...common,
    duration: 0.34,
    startLife: new IntervalValue(0.5, 0.95),
    startSize: new IntervalValue(0.16, 0.42),
    startSpeed: new IntervalValue(1.4, 3.2),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.emberEmission),
    emissionBursts: burst(config.emberCount),
    shape: new ConeEmitter({ radius: config.areaRadius * 0.94, thickness: 0.9, angle: 0.22 }),
    material: shared.materials.ember,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      createFlameAnimation([0, 3, 6, 9]),
      fade(EMBER_RAMP, 0.92),
      new ApplyForce(new Vector3(0, -1, 0), new ConstantValue(2.4)),
      new TurbulenceField(new Vector3(0.9, 0.9, 0.9), 2, new Vector3(0.5, 0.9, 0.5), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const rain = new ParticleSystem({
    ...common,
    duration: 0.4,
    startLife: new IntervalValue(0.42, 0.68),
    startSize: new IntervalValue(0.22, 0.46),
    startSpeed: new IntervalValue(config.rainSpeed * 0.82, config.rainSpeed * 1.25),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.rainEmission),
    emissionBursts: burst(config.rainCount),
    shape: new ConeEmitter({ radius: config.areaRadius * 0.92, thickness: 1, angle: 0.16 }),
    material: shared.materials.coalRain,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.16, lengthFactor: 2.8 },
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      createFlameAnimation([4, 7, 10, 12]),
      fade(RAIN_RAMP, 0.94),
      new TurbulenceField(new Vector3(0.7, 0.7, 0.7), 2, new Vector3(0.7, 0.5, 0.7), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const cinders = new ParticleSystem({
    ...common,
    duration: 0.46,
    startLife: new IntervalValue(0.34, 0.62),
    startSize: new IntervalValue(0.08, 0.2),
    startSpeed: new IntervalValue(3.4, 7.4),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.cinderEmission),
    shape: new ConeEmitter({ radius: config.areaRadius * 0.4, thickness: 0.9, angle: 0.9 }),
    material: shared.materials.cinder,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.22, lengthFactor: 3.2 },
    behaviors: [
      fade(SPARK_RAMP, 0.96),
      new ApplyForce(new Vector3(0, -1, 0), new ConstantValue(7.5)),
      new TurbulenceField(new Vector3(0.6, 0.6, 0.6), 2, new Vector3(0.9, 0.6, 0.9), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const dust = new ParticleSystem({
    ...common,
    duration: 0.52,
    startLife: new IntervalValue(0.55, 1.05),
    startSize: new IntervalValue(1.1, 2.3),
    startSpeed: new IntervalValue(0.6, 1.7),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.dustCount * 2),
    shape: new ConeEmitter({ radius: config.areaRadius * 0.88, thickness: 0.85, angle: 0.34 }),
    material: shared.materials.dust,
    renderMode: RenderMode.BillBoard,
    renderOrder: 11,
    behaviors: [
      fade(DUST_RAMP, 0.5),
      new ApplyForce(new Vector3(0, -1, 0), new ConstantValue(-0.5)),
      new TurbulenceField(new Vector3(1.1, 1.1, 1.1), 2, new Vector3(0.4, 0.5, 0.4), new Vector3(1, 1, 1)),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.5, 0.94, 1.18, 1.3), 0]])),
    ],
  });
  const ash = new ParticleSystem({
    ...common,
    duration: 0.5,
    startLife: new IntervalValue(0.6, 1.15),
    startSize: new IntervalValue(0.07, 0.2),
    startSpeed: new IntervalValue(0.8, 2.2),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.ashEmission),
    shape: new ConeEmitter({ radius: config.areaRadius * 0.9, thickness: 1, angle: 0.7 }),
    material: shared.materials.ash,
    renderMode: RenderMode.BillBoard,
    renderOrder: 11,
    behaviors: [
      fade(ASH_RAMP, 0.42),
      new ApplyForce(new Vector3(0, -1, 0), new ConstantValue(0.9)),
      new TurbulenceField(new Vector3(0.8, 0.8, 0.8), 2, new Vector3(0.5, 0.4, 0.5), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const cores = Array.from({ length: config.coreCount }, () => new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.2, 0.3),
    startSize: new IntervalValue(config.coreSize * 0.86, config.coreSize * 1.2),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(2),
    shape: new PointEmitter(),
    material: shared.materials.flash,
    renderMode: RenderMode.HorizontalBillBoard,
    renderOrder: 13,
    behaviors: [
      fade(FLASH_RAMP, 0.94),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.36, 0.9, 1.06, 1.16), 0]])),
      new ColorOverLife(new Gradient(
        stops(FLASH_RAMP),
        [[0, 0], [0.1, 0.1], [0.4, 0.44], [0.76, 0.8], [0, 1]],
      )),
      createShrink(1),
    ],
  }));
  const systems = { embers, rain, cinders, dust, ash };
  for (const [name, system] of Object.entries(systems)) {
    system.emitter.name = `TempestadeBrasa_${name[0]!.toUpperCase() + name.slice(1)}`;
    system.emitter.renderOrder = 12;
    system.pause();
    system.emitter.visible = false;
  }
  cores.forEach((system, index) => {
    system.emitter.name = `TempestadeBrasa_Core${index}`;
    system.emitter.renderOrder = 13;
    system.pause();
    system.emitter.visible = false;
  });
  embers.emitter.rotation.x = -Math.PI / 2;
  rain.emitter.rotation.x = Math.PI / 2;
  cinders.emitter.rotation.x = -Math.PI / 2;
  dust.emitter.rotation.x = -Math.PI / 2;
  ash.emitter.rotation.x = -Math.PI / 2;
  return { ...systems, cores };
}

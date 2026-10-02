import {
  ApplyForce, Bezier, CircleEmitter, ColorOverLife, ConeEmitter, ConstantColor, ConstantValue,
  Gradient, IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode,
  SizeOverLife, TurbulenceField, Vector3, Vector4,
} from "three.quarks";
import { createFlameAnimation, createShrink } from "../../vfxKit/quarkFx";
import type { ColapsoElementalResources } from "./ColapsoElementalResources";

type Rgb = readonly [red: number, green: number, blue: number];
type ColorStop = [Vector3, number];

const ORBIT_RAMP: readonly Rgb[] = [[1, 0.96, 0.82], [1, 0.68, 0.32], [0.6, 0.24, 0.62]];
const FRAGMENT_RAMP: readonly Rgb[] = [[1, 0.92, 0.76], [1, 0.6, 0.26], [0.42, 0.18, 0.46]];
const FLASH_RAMP: readonly Rgb[] = [[1, 1, 1], [1, 0.84, 0.55], [0.66, 0.38, 0.86]];
const DUST_RAMP: readonly Rgb[] = [[0.86, 0.78, 0.66], [0.6, 0.5, 0.52], [0.3, 0.22, 0.34]];
const WAVE_RAMP: readonly Rgb[] = [[1, 0.9, 0.7], [1, 0.62, 0.32], [0.5, 0.24, 0.6]];

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

export interface ColapsoElementalParticleConfig {
  orbitCount: number;
  orbitRadius: number;
  orbitSpeed: number;
  emberEmission: number;
  fragmentCount: number;
  fragmentSpeed: number;
  waveEmission: number;
  waveCount: number;
  dustEmission: number;
  dustCount: number;
  coreCount: number;
  coreSize: number;
}

export function createColapsoElementalSystems(
  shared: ColapsoElementalResources,
  config: ColapsoElementalParticleConfig,
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
  const orbit = new ParticleSystem({
    ...common,
    duration: 0.7,
    startLife: new IntervalValue(0.3, 0.6),
    startSize: new IntervalValue(0.2, 0.46),
    startSpeed: new ConstantValue(-config.orbitSpeed),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(config.orbitCount),
    emissionOverTime: new ConstantValue(config.emberEmission),
    shape: new CircleEmitter({ radius: config.orbitRadius, thickness: 0.5 }),
    material: shared.materials.core,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.16, lengthFactor: 2.3 },
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      createFlameAnimation([0, 3, 5, 7]),
      fade(ORBIT_RAMP, 0.92),
      new TurbulenceField(new Vector3(0.8, 0.8, 0.8), 2, new Vector3(0.5, 0.4, 0.5), new Vector3(1, 1, 1)),
      createShrink(1),
    ],
  });
  const fragments = new ParticleSystem({
    ...common,
    duration: 0.32,
    startLife: new IntervalValue(0.24, 0.48),
    startSize: new IntervalValue(0.14, 0.36),
    startSpeed: new IntervalValue(config.fragmentSpeed * 0.65, config.fragmentSpeed * 1.3),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.fragmentCount * 6),
    shape: new ConeEmitter({ radius: 0.32, thickness: 0.9, angle: 0.22 }),
    material: shared.materials.streak,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.24, lengthFactor: 3.4 },
    behaviors: [
      fade(FRAGMENT_RAMP, 0.94),
      new ApplyForce(new Vector3(0, -0.55, 0), new ConstantValue(2.4)),
      createShrink(1),
    ],
  });
  const wave = new ParticleSystem({
    ...common,
    duration: 0.34,
    startLife: new IntervalValue(0.3, 0.5),
    startSize: new IntervalValue(1.6, 3.4),
    startSpeed: new IntervalValue(1.4, 3.2),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(config.waveCount),
    emissionOverTime: new ConstantValue(config.waveEmission),
    shape: new CircleEmitter({ radius: 1.1, thickness: 0.2 }),
    material: shared.materials.ring,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.3, lengthFactor: 1.4 },
    renderOrder: 12,
    behaviors: [
      fade(WAVE_RAMP, 0.86),
      new ApplyForce(new Vector3(0, 0.5, 0), new ConstantValue(0.9)),
      createShrink(1),
    ],
  });
  const dust = new ParticleSystem({
    ...common,
    duration: 0.46,
    startLife: new IntervalValue(0.5, 0.95),
    startSize: new IntervalValue(1, 2.2),
    startSpeed: new IntervalValue(0.3, 1),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.dustEmission),
    emissionBursts: burst(config.dustCount),
    shape: new CircleEmitter({ radius: 2.6, thickness: 0.95 }),
    material: shared.materials.dust,
    renderMode: RenderMode.BillBoard,
    renderOrder: 11,
    behaviors: [
      fade(DUST_RAMP, 0.52),
      new ApplyForce(new Vector3(0, -0.25, 0), new ConstantValue(-0.25)),
      new TurbulenceField(new Vector3(1.1, 1.1, 1.1), 2, new Vector3(0.45, 0.55, 0.45), new Vector3(1, 1, 1)),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.62, 0.96, 1.16, 1.3), 0]])),
    ],
  });
  const cores = Array.from({ length: config.coreCount }, (_, index) => new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.3 + index * 0.05),
    startSize: new ConstantValue(config.coreSize * (1 - index * 0.1)),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.flash,
    renderMode: RenderMode.BillBoard,
    renderOrder: 13,
    behaviors: [
      fade(FLASH_RAMP, 0.95),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.32, 1, 1.04, 1.08), 0]])),
    ],
  }));
  const systems = { orbit, fragments, wave, dust, cores };
  for (const [name, system] of Object.entries(systems)) {
    if (Array.isArray(system)) {
      system.forEach((core, index) => {
        core.emitter.name = `ColapsoElemental_Core${index}`;
        core.emitter.renderOrder = 13;
        core.pause();
        core.emitter.visible = false;
      });
      continue;
    }
    system.emitter.name = `ColapsoElemental_${name[0]!.toUpperCase() + name.slice(1)}`;
    system.emitter.renderOrder = name === "dust" ? 11 : 12;
    system.pause();
    system.emitter.visible = false;
  }
  return systems;
}

import {
  ApplyForce, Bezier, CircleEmitter, ColorOverLife, ConeEmitter, ConstantColor, ConstantValue,
  Gradient, IntervalValue, OrbitOverLife, ParticleSystem, PiecewiseBezier, PointEmitter,
  RenderMode, SizeOverLife, Vector3, Vector4,
} from "three.quarks";
import { createFlameAnimation, createShrink } from "../../vfxKit/quarkFx";
import type { ManaBurnResources } from "./ManaBurnResources";
import type { ManaBurnVfxConfig } from "./ManaBurnVfx";

const MANA_COLORS = [
  [new Vector3(0.86, 0.94, 1), 0],
  [new Vector3(0.55, 0.76, 1), 0.45],
  [new Vector3(0.2, 0.36, 0.72), 1],
] as const;
const EMBER_COLORS = [
  [new Vector3(1, 0.95, 0.84), 0],
  [new Vector3(1, 0.78, 0.44), 0.5],
  [new Vector3(0.66, 0.36, 0.14), 1],
] as const;
const ARCANE_COLORS = [
  [new Vector3(1, 0.99, 0.96), 0],
  [new Vector3(0.94, 0.96, 1), 0.46],
  [new Vector3(0.58, 0.7, 0.92), 1],
] as const;

function fadeInOut(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    [...MANA_COLORS],
    [[0, 0], [peak, 0.08], [peak * 0.78, 0.34], [peak * 0.3, 0.7], [0, 1]],
  ));
}

function emberFade(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    [...EMBER_COLORS],
    [[0, 0.04], [peak, 0.07], [peak * 0.62, 0.36], [peak * 0.22, 0.72], [0, 1]],
  ));
}

function arcaneFade(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    [...ARCANE_COLORS],
    [[0, 0], [peak, 0.09], [peak * 0.8, 0.42], [peak * 0.26, 0.76], [0, 1]],
  ));
}

export function createManaBurnSystems(shared: ManaBurnResources, config: ManaBurnVfxConfig) {
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
    worldSpace: false,
    renderOrder: 12,
  };
  const drain = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.32, 0.44),
    startSize: new IntervalValue(0.07, 0.16),
    startSpeed: new ConstantValue(-config.drainInwardSpeed),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(config.drainCount),
    shape: new CircleEmitter({ radius: config.ringRadius * 0.94, thickness: 0.3 }),
    material: shared.materials.drain,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.055, lengthFactor: 2.5 },
    behaviors: [
      fadeInOut(0.86),
      new ApplyForce(new Vector3(0, 0, -1), new ConstantValue(config.drainGravity)),
      new OrbitOverLife(new ConstantValue(config.drainSwirl), new Vector3(0, 0, 1)),
      createShrink(1),
    ],
  });
  const flame = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(config.flameDuration),
    startSize: new ConstantValue(config.flameSize),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.flame,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      new FrameOverLife(new PiecewiseBezier([[new Bezier(0, 5, 10, 15), 0]])),
      arcaneFade(0.94),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.66, 0.94, 1.02, 1.06), 0]])),
    ],
  });
  const flash = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.24),
    startSize: new ConstantValue(config.ringRadius * 2.35),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.flash,
    renderMode: RenderMode.HorizontalBillBoard,
    renderOrder: 11,
    behaviors: [
      emberFade(0.78),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(1.12, 0.86, 0.62, 0.42), 0]])),
    ],
  });
  const motes = new ParticleSystem({
    ...common,
    duration: 1,
    looping: true,
    startLife: new IntervalValue(0.42, 0.78),
    startSize: new IntervalValue(0.03, 0.075),
    startSpeed: new IntervalValue(0.22, 0.58),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.moteEmission),
    shape: new ConeEmitter({ radius: config.ringRadius * 0.62, thickness: 0.45, angle: 0.12 }),
    material: shared.materials.mote,
    renderMode: RenderMode.BillBoard,
    behaviors: [fadeInOut(0.52), createShrink(1)],
  });
  const residual = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.18, 0.32),
    startSize: new IntervalValue(0.028, 0.06),
    startSpeed: new IntervalValue(0.18, 0.5),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(7),
    shape: new ConeEmitter({ radius: config.ringRadius * 0.55, thickness: 0.5, angle: 0.85 }),
    material: shared.materials.residual,
    renderMode: RenderMode.BillBoard,
    behaviors: [emberFade(0.42), createShrink(1)],
  });
  const systems = { drain, flame, flash, motes, residual };
  for (const [name, system] of Object.entries(systems)) {
    system.emitter.name = `ManaBurn_${name[0]!.toUpperCase() + name.slice(1)}`;
    system.pause();
    system.emitter.visible = false;
  }
  drain.emitter.position.y = config.drainHeight;
  drain.emitter.rotation.x = -Math.PI / 2;
  flame.emitter.position.y = config.flameCenter;
  flash.emitter.position.y = 0.04;
  motes.emitter.position.y = 0.14;
  residual.emitter.position.y = 0.48;
  return systems;
}

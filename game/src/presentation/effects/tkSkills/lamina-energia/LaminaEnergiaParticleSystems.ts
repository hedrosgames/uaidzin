import {
  Bezier, ColorOverLife, ConeEmitter, ConstantColor, ConstantValue, Gradient,
  IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode,
  SizeOverLife, Vector3, Vector4,
} from "three.quarks";
import { createFlameAnimation, createShrink } from "../../vfxKit/quarkFx";
import type { LaminaEnergiaResources } from "./LaminaEnergiaResources";

function envelope(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    [[new Vector3(1, 0.96, 0.83), 0], [new Vector3(1, 0.82, 0.48), 0.55], [new Vector3(0.83, 0.55, 0.22), 1]],
    [[0, 0], [peak, 0.06], [peak * 0.7, 0.38], [peak * 0.25, 0.72], [0, 1]],
  ));
}

export function createLaminaEnergiaSystems(shared: LaminaEnergiaResources) {
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
    renderOrder: 13,
  };
  const release = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.16),
    startSize: new ConstantValue(0.56),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.release,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [createFlameAnimation(), envelope(0.62), new SizeOverLife(new PiecewiseBezier([[new Bezier(0.25, 0.8, 1, 1.12), 0]]))],
  });
  const motes = new ParticleSystem({
    ...common,
    duration: 1,
    startLife: new IntervalValue(0.06, 0.13),
    startSize: new IntervalValue(0.018, 0.04),
    startSpeed: new IntervalValue(0.4, 1.2),
    emissionOverTime: new ConstantValue(26),
    shape: new ConeEmitter({ radius: 0.14, thickness: 0.5, angle: 0.25 }),
    material: shared.materials.spark,
    instancingGeometry: shared.streakGeometry,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.06, lengthFactor: 2.4 },
    behaviors: [envelope(0.65), createShrink(1)],
  });
  const impact = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.14),
    startSize: new ConstantValue(0.9),
    startSpeed: new ConstantValue(0),
    startRotation: new ConstantValue(-0.55),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.impact,
    renderMode: RenderMode.BillBoard,
    behaviors: [envelope(0.83), new SizeOverLife(new PiecewiseBezier([[new Bezier(0.25, 1, 1.08, 1.2), 0]]))],
  });
  const sparks = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.08, 0.18),
    startSize: new IntervalValue(0.028, 0.06),
    startSpeed: new IntervalValue(1.2, 3.2),
    emissionBursts: burst(7),
    shape: new ConeEmitter({ radius: 0.09, thickness: 1, angle: 0.7 }),
    material: shared.materials.spark,
    instancingGeometry: shared.streakGeometry,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.045, lengthFactor: 2.8 },
    behaviors: [envelope(0.8), createShrink(1)],
  });
  const residual = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.12, 0.22),
    startSize: new IntervalValue(0.1, 0.2),
    startSpeed: new IntervalValue(0.25, 0.65),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(3),
    shape: new ConeEmitter({ radius: 0.12, thickness: 0.35, angle: 0.9 }),
    material: shared.materials.residual,
    renderMode: RenderMode.BillBoard,
    behaviors: [envelope(0.42), createShrink(1)],
  });
  const systems = { release, motes, impact, sparks, residual };
  for (const [name, system] of Object.entries(systems)) {
    system.emitter.name = `LaminaEnergia_${name}`;
    system.pause();
    system.emitter.visible = false;
  }
  return systems;
}

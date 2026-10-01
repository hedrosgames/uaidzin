import {
  Bezier, ColorOverLife, ConeEmitter, ConstantColor, ConstantValue, Gradient,
  IntervalValue, ParticleSystem, PiecewiseBezier, PointEmitter, RenderMode,
  SizeOverLife, Vector3, Vector4,
} from "three.quarks";
import { createFlameAnimation, createShrink } from "../../vfxKit/quarkFx";
import type { CampoGeloResources } from "./CampoGeloResources";

function envelope(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    [[new Vector3(0.9, 0.98, 1), 0], [new Vector3(0.55, 0.83, 1), 0.5], [new Vector3(0.2, 0.42, 0.6), 1]],
    [[0, 0], [peak, 0.08], [peak * 0.75, 0.35], [peak * 0.28, 0.72], [0, 1]],
  ));
}

export function createCampoGeloSystems(shared: CampoGeloResources, radius: number) {
  const scale = Math.min(1, radius / 2);
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
  const flash = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.12),
    startSize: new ConstantValue(radius * 1.1),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: shared.materials.flash,
    renderMode: RenderMode.HorizontalBillBoard,
    behaviors: [
      envelope(0.65),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.25, 0.8, 1, 1), 0]])),
    ],
  });
  const fractures = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.12, 0.26),
    startSize: new IntervalValue(0.04 * scale, 0.1 * scale),
    startSpeed: new IntervalValue(0.5 * scale, 1.3 * scale),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(14),
    shape: new ConeEmitter({ radius: radius * 0.7, thickness: 0.5, angle: 0.55 }),
    material: shared.materials.flake,
    renderMode: RenderMode.BillBoard,
    behaviors: [envelope(0.88), createShrink(1)],
  });
  const vapor = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.28, 0.38),
    startSize: new IntervalValue(0.38 * scale, 0.6 * scale),
    startSpeed: new IntervalValue(0.1 * scale, 0.28 * scale),
    startRotation: new IntervalValue(-0.3, 0.3),
    emissionBursts: burst(16),
    shape: new ConeEmitter({ radius: radius * 0.74, thickness: 0.48, angle: 0.6 }),
    material: shared.materials.vapor,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      createFlameAnimation(),
      envelope(0.52),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.4, 0.8, 1, 1.15), 0]])),
    ],
  });
  const residual = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.16, 0.28),
    startSize: new IntervalValue(0.025 * scale, 0.055 * scale),
    startSpeed: new IntervalValue(0.15 * scale, 0.4 * scale),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(9),
    shape: new ConeEmitter({ radius: radius * 0.8, thickness: 0.18, angle: 0.35 }),
    material: shared.materials.flake,
    renderMode: RenderMode.BillBoard,
    behaviors: [envelope(0.5), createShrink(1)],
  });
  const systems = { flash, fractures, vapor, residual };
  for (const [name, system] of Object.entries(systems)) {
    system.emitter.name = `CampoGelo_${name}`;
    system.emitter.rotation.x = -Math.PI / 2;
    system.emitter.position.y = (system === vapor ? 0.38 : 0.1) * scale;
    system.pause();
    system.emitter.visible = false;
  }
  return systems;
}

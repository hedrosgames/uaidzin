import {
  Bezier,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  FrameOverLife,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  PointEmitter,
  RenderMode,
  SizeOverLife,
  Vector3,
  Vector4,
} from "three.quarks";
import type { FuryResources } from "./FuryResources";
import type { FuryVfxConfig } from "./FuryVfx";

function envelope(peak: number): ColorOverLife {
  return new ColorOverLife(new Gradient(
    [
      [new Vector3(1, 0.88, 0.72), 0],
      [new Vector3(1, 0.49, 0.32), 0.22],
      [new Vector3(0.94, 0.23, 0.17), 0.6],
      [new Vector3(0.6, 0.12, 0.1), 1],
    ],
    [[0, 0], [peak, 0.08], [peak * 0.88, 0.35], [peak * 0.45, 0.68], [0, 1]],
  ));
}

function grow(): SizeOverLife {
  return new SizeOverLife(new PiecewiseBezier([
    [new Bezier(0.24, 0.5, 0.84, 1), 0],
    [new Bezier(1, 1.03, 1.09, 1.16), 0.3],
  ]));
}

function shrink(): SizeOverLife {
  return new SizeOverLife(new PiecewiseBezier([[new Bezier(0.6, 1, 0.6, 0), 0]]));
}

export function createFurySystems(resources: FuryResources, config: FuryVfxConfig) {
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
    renderOrder: 10,
  };
  const main = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.48),
    startSize: new ConstantValue(config.ringRadius),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: resources.materials.surge,
    instancingGeometry: resources.surgeGeometry,
    renderMode: RenderMode.Mesh,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    behaviors: [
      new FrameOverLife(new PiecewiseBezier([[new Bezier(0, 5, 10, 15), 0]])),
      envelope(0.82),
      grow(),
    ],
  });
  const streaks = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.18, 0.32),
    startSize: new IntervalValue(0.045, 0.085),
    startSpeed: new IntervalValue(3.2, 5.4),
    emissionBursts: burst(8),
    shape: new ConeEmitter({ radius: config.ringRadius * 0.46, thickness: 0.25, angle: 0.18 }),
    material: resources.materials.spark,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.035, lengthFactor: 2.6 },
    behaviors: [envelope(0.8), shrink()],
  });
  const edge = new ParticleSystem({
    ...common,
    startLife: new IntervalValue(0.18, 0.32),
    startSize: new IntervalValue(0.2, 0.34),
    startSpeed: new IntervalValue(0.9, 2),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionBursts: burst(5),
    shape: new ConeEmitter({ radius: config.ringRadius * 0.68, thickness: 0.12, angle: 0.55 }),
    material: resources.materials.slash,
    renderMode: RenderMode.BillBoard,
    behaviors: [envelope(0.54), grow()],
  });
  const pulse = new ParticleSystem({
    ...common,
    startLife: new ConstantValue(0.38),
    startSize: new ConstantValue(config.ringRadius * 2.45),
    startSpeed: new ConstantValue(0),
    emissionBursts: burst(1),
    shape: new PointEmitter(),
    material: resources.materials.pulse,
    renderMode: RenderMode.HorizontalBillBoard,
    behaviors: [envelope(0.68), grow()],
    renderOrder: 9,
  });
  const embers = new ParticleSystem({
    ...common,
    duration: 1,
    looping: true,
    startLife: new IntervalValue(0.28, 0.5),
    startSize: new IntervalValue(0.028, 0.065),
    startSpeed: new IntervalValue(0.5, 1.1),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    emissionOverTime: new ConstantValue(config.emberEmission),
    shape: new ConeEmitter({ radius: config.ringRadius * 0.62, thickness: 0.12, angle: 0.12 }),
    material: resources.materials.spark,
    renderMode: RenderMode.BillBoard,
    behaviors: [envelope(0.58), shrink()],
  });
  const systems = { main, streaks, edge, pulse, embers };
  for (const [name, system] of Object.entries(systems)) {
    system.emitter.name = `Fury_${name[0]!.toUpperCase() + name.slice(1)}`;
    system.pause();
    system.emitter.visible = false;
  }
  for (const system of [streaks, edge, embers]) system.emitter.rotation.x = -Math.PI / 2;
  main.emitter.position.y = 0.06;
  streaks.emitter.position.y = 0.15;
  edge.emitter.position.y = 0.38;
  pulse.emitter.position.y = 0.025;
  embers.emitter.position.y = 0.18;
  return systems;
}

import { MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  IntervalValue,
  ParticleSystem,
  PointEmitter,
  RenderMode,
  SphereEmitter,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import {
  createAdditiveMaterial,
  createFireGradient,
  createFlameAnimation,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface TribunalParticleMaterials {
  ember: MeshBasicMaterial;
  spark: MeshBasicMaterial;
  trail: MeshBasicMaterial;
}

export interface TribunalDescentSystems {
  trail: ParticleSystem;
  sparks: ParticleSystem;
  all: ParticleSystem[];
}

export interface TribunalTouchdownSystems {
  burst: ParticleSystem;
  plume: ParticleSystem;
  all: ParticleSystem[];
}

export interface TribunalFinalSystems {
  impact: ParticleSystem;
  plume: ParticleSystem;
  residue: ParticleSystem;
  all: ParticleSystem[];
}

export interface TribunalParticleConfig {
  descentDuration: number;
  trailEmission: number;
  sparkEmission: number;
  touchdownBurstCount: number;
  finalBurstCount: number;
}

export function createTribunalParticleMaterials(
  textures: { beam: Texture; spark: Texture; trail: Texture },
): TribunalParticleMaterials {
  return {
    ember: createAdditiveMaterial(textures.beam),
    spark: createAdditiveMaterial(textures.spark),
    trail: createAdditiveMaterial(textures.trail),
  };
}

export function createTribunalDescentSystems(
  materials: TribunalParticleMaterials,
  config: TribunalParticleConfig,
): TribunalDescentSystems {
  const trail = new ParticleSystem({
    autoDestroy: false,
    duration: config.descentDuration + 0.28,
    looping: false,
    startLife: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(0.1, 0.5),
    startSize: new IntervalValue(0.32, 0.58),
    startRotation: new IntervalValue(-1.1, 1.1),
    startColor: new ConstantColor(new QuarksVector4(1, 0.94, 0.74, 0.72)),
    emissionOverTime: new ConstantValue(config.trailEmission),
    emissionOverDistance: new ConstantValue(10),
    shape: new ConeEmitter({
      radius: 0.05,
      thickness: 0.7,
      angle: 0.14,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.2, 0), new ConstantValue(1)),
      createTurbulence(0.32),
    ],
  });

  const sparks = new ParticleSystem({
    autoDestroy: false,
    duration: config.descentDuration + 0.24,
    looping: false,
    startLife: new IntervalValue(0.1, 0.28),
    startSpeed: new IntervalValue(1, 3.6),
    startSize: new IntervalValue(0.022, 0.05),
    startColor: new ConstantColor(new QuarksVector4(1, 0.84, 0.34, 0.92)),
    emissionOverTime: new ConstantValue(config.sparkEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new PointEmitter(),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createFireGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.2, 0), new ConstantValue(1)),
      createTurbulence(1),
    ],
  });

  return { trail, sparks, all: [trail, sparks] };
}

export function createTribunalTouchdownSystems(
  materials: TribunalParticleMaterials,
  config: TribunalParticleConfig,
): TribunalTouchdownSystems {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.18, 0.44),
    startSpeed: new IntervalValue(2.6, 6.2),
    startSize: new IntervalValue(0.05, 0.13),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.56, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(config.touchdownBurstCount), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new SphereEmitter({
      radius: 0.13,
      thickness: 0.2,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createFireGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -7.6, 0), new ConstantValue(1)),
      createTurbulence(0.55),
    ],
  });

  const plume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.16, 0.4),
    startSpeed: new IntervalValue(1.5, 4.2),
    startSize: new IntervalValue(0.56, 1.02),
    startColor: new ConstantColor(new QuarksVector4(1, 0.9, 0.62, 0.84)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(16), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new ConeEmitter({
      radius: 0.24,
      thickness: 0.7,
      angle: 0.28,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      createTurbulence(0.66),
    ],
  });

  burst.pause();
  plume.pause();
  burst.emitter.visible = false;
  plume.emitter.visible = false;

  return { burst, plume, all: [burst, plume] };
}

export function createTribunalFinalSystems(
  materials: TribunalParticleMaterials,
  config: TribunalParticleConfig,
): TribunalFinalSystems {
  const impact = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.22, 0.54),
    startSpeed: new IntervalValue(4.2, 9.6),
    startSize: new IntervalValue(0.07, 0.2),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.92, 0.66, 0.96)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(config.finalBurstCount), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new SphereEmitter({
      radius: 0.2,
      thickness: 0.2,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createFireGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -8.6, 0), new ConstantValue(1)),
      createTurbulence(0.62),
    ],
  });

  const plume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.2, 0.5),
    startSpeed: new IntervalValue(2.4, 6.6),
    startSize: new IntervalValue(0.8, 1.5),
    startColor: new ConstantColor(new QuarksVector4(1, 0.92, 0.7, 0.86)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(28), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new ConeEmitter({
      radius: 0.34,
      thickness: 0.7,
      angle: 0.32,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      createTurbulence(0.74),
    ],
  });

  const residue = new ParticleSystem({
    autoDestroy: false,
    duration: 0.4,
    looping: false,
    startLife: new IntervalValue(0.9, 1.6),
    startSpeed: new IntervalValue(0.16, 0.5),
    startSize: new IntervalValue(0.16, 0.4),
    startColor: new ConstantColor(new QuarksVector4(1, 0.78, 0.3, 0.55)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(34), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new SphereEmitter({
      radius: 2.1,
      thickness: 0.4,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.85, 0), new ConstantValue(1)),
      createTurbulence(0.4),
    ],
  });

  impact.pause();
  plume.pause();
  residue.pause();
  impact.emitter.visible = false;
  plume.emitter.visible = false;
  residue.emitter.visible = false;

  return { impact, plume, residue, all: [impact, plume, residue] };
}

export function disposeTribunalParticleMaterials(
  materials: TribunalParticleMaterials,
): void {
  materials.ember.dispose();
  materials.spark.dispose();
  materials.trail.dispose();
}

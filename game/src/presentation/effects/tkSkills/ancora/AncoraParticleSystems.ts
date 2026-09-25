import { MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  Gradient,
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
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface AncoraParticleMaterials {
  glow: MeshBasicMaterial;
  spark: MeshBasicMaterial;
  spectral: MeshBasicMaterial;
}

export interface AncoraChainSystems {
  trail: ParticleSystem;
  embers: ParticleSystem;
  all: ParticleSystem[];
}

export interface AncoraImpactSystems {
  sparks: ParticleSystem;
  shards: ParticleSystem;
  plume: ParticleSystem;
  wisps: ParticleSystem;
  all: ParticleSystem[];
}

export interface AncoraParticleConfig {
  chainDuration: number;
  trailEmission: number;
  sparkBurstCount: number;
  shardBurstCount: number;
  plumeBurstCount: number;
}

export function createAncoraParticleMaterials(
  textures: { glow: Texture; spark: Texture; spectral: Texture },
): AncoraParticleMaterials {
  return {
    glow: createAdditiveMaterial(textures.glow),
    spark: createAdditiveMaterial(textures.spark),
    spectral: createAdditiveMaterial(textures.spectral),
  };
}

export function createAncoraEmberGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.86, 0.62), 0],
      [new QuarksVector3(0.92, 0.36, 0.14), 0.4],
      [new QuarksVector3(0.64, 0.14, 0.05), 0.76],
      [new QuarksVector3(0.2, 0.03, 0.01), 1],
    ],
    [
      [1, 0],
      [0.9, 0.4],
      [0.45, 0.76],
      [0, 1],
    ],
  );
}

export function createAncoraChainSystems(
  materials: AncoraParticleMaterials,
  config: AncoraParticleConfig,
): AncoraChainSystems {
  const trail = new ParticleSystem({
    autoDestroy: false,
    duration: config.chainDuration + 0.3,
    looping: false,
    startLife: new IntervalValue(0.16, 0.42),
    startSpeed: new IntervalValue(0.1, 0.7),
    startSize: new IntervalValue(0.16, 0.36),
    startRotation: new IntervalValue(-1.1, 1.1),
    startColor: new ConstantColor(new QuarksVector4(1, 0.94, 0.82, 0.78)),
    emissionOverTime: new ConstantValue(config.trailEmission),
    emissionOverDistance: new ConstantValue(7),
    shape: new ConeEmitter({
      radius: 0.05,
      thickness: 0.75,
      angle: 0.12,
    }),
    material: materials.spectral,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.9, 0), new ConstantValue(1)),
      createTurbulence(0.32),
    ],
  });

  const embers = new ParticleSystem({
    autoDestroy: false,
    duration: config.chainDuration + 0.24,
    looping: false,
    startLife: new IntervalValue(0.12, 0.32),
    startSpeed: new IntervalValue(0.9, 3.2),
    startSize: new IntervalValue(0.03, 0.07),
    startColor: new ConstantColor(new QuarksVector4(1, 0.72, 0.3, 0.9)),
    emissionOverTime: new ConstantValue(config.trailEmission * 0.55),
    emissionOverDistance: new ConstantValue(0),
    shape: new PointEmitter(),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createAncoraEmberGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.2, 0), new ConstantValue(1)),
      createTurbulence(1),
    ],
  });

  trail.pause();
  embers.pause();
  trail.emitter.visible = false;
  embers.emitter.visible = false;

  return { trail, embers, all: [trail, embers] };
}

export function createAncoraImpactSystems(
  materials: AncoraParticleMaterials,
  config: AncoraParticleConfig,
  scale: number,
): AncoraImpactSystems {
  const sparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.22, 0.56),
    startSpeed: new IntervalValue(3.2, 8.4),
    startSize: new IntervalValue(0.05, 0.15),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.82, 0.58, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.round(config.sparkBurstCount * scale)),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: 0.18 * scale,
      thickness: 0.22,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createAncoraEmberGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -9.6, 0), new ConstantValue(1)),
      createTurbulence(0.72),
    ],
  });

  const shards = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.3, 0.68),
    startSpeed: new IntervalValue(2.4, 6.4),
    startSize: new IntervalValue(0.1, 0.27),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.66, 0.58, 0.48, 1)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.round(config.shardBurstCount * scale)),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: 0.14 * scale,
      thickness: 0.3,
    }),
    material: materials.glow,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createAncoraEmberGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -12.4, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });

  const plume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.24, 0.58),
    startSpeed: new IntervalValue(2, 5.4),
    startSize: new IntervalValue(0.6, 1.2),
    startColor: new ConstantColor(new QuarksVector4(1, 0.78, 0.54, 0.82)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.round(config.plumeBurstCount * scale)),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new ConeEmitter({
      radius: 0.28 * scale,
      thickness: 0.7,
      angle: 0.28,
    }),
    material: materials.glow,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      createTurbulence(0.78),
    ],
  });

  const wisps = new ParticleSystem({
    autoDestroy: false,
    duration: 0.2,
    looping: false,
    startLife: new IntervalValue(0.3, 0.62),
    startSpeed: new IntervalValue(0.5, 1.6),
    startSize: new IntervalValue(0.2, 0.46),
    startRotation: new IntervalValue(-1.2, 1.2),
    startColor: new ConstantColor(new QuarksVector4(0.96, 0.9, 0.78, 0.6)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(14),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new ConeEmitter({
      radius: 0.22 * scale,
      thickness: 0.8,
      angle: 0.14,
    }),
    material: materials.spectral,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.8, 0), new ConstantValue(1)),
      createTurbulence(0.44),
    ],
  });

  sparks.pause();
  shards.pause();
  plume.pause();
  wisps.pause();
  sparks.emitter.visible = false;
  shards.emitter.visible = false;
  plume.emitter.visible = false;
  wisps.emitter.visible = false;

  return {
    sparks,
    shards,
    plume,
    wisps,
    all: [sparks, shards, plume, wisps],
  };
}

export function disposeAncoraParticleMaterials(
  materials: AncoraParticleMaterials,
): void {
  materials.glow.dispose();
  materials.spark.dispose();
  materials.spectral.dispose();
}

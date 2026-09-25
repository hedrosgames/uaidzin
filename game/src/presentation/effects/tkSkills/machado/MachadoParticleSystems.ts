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

export interface MachadoParticleMaterials {
  ember: MeshBasicMaterial;
  spark: MeshBasicMaterial;
  trail: MeshBasicMaterial;
}

export interface MachadoFallSystems {
  trail: ParticleSystem;
  sparks: ParticleSystem;
  all: ParticleSystem[];
}

export interface MachadoImpactSystems {
  shards: ParticleSystem;
  plume: ParticleSystem;
  all: ParticleSystem[];
}

export interface MachadoParticleConfig {
  fallDuration: number;
  trailEmission: number;
  sparkEmission: number;
  shardBurstCount: number;
}

export function createMachadoParticleMaterials(
  textures: { ember: Texture; spark: Texture; trail: Texture },
): MachadoParticleMaterials {
  return {
    ember: createAdditiveMaterial(textures.ember),
    spark: createAdditiveMaterial(textures.spark),
    trail: createAdditiveMaterial(textures.trail),
  };
}

export function createMachadoFallSystems(
  materials: MachadoParticleMaterials,
  config: MachadoParticleConfig,
): MachadoFallSystems {
  const trail = new ParticleSystem({
    autoDestroy: false,
    duration: config.fallDuration + 0.3,
    looping: false,
    startLife: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(0.1, 0.5),
    startSize: new IntervalValue(0.34, 0.6),
    startRotation: new IntervalValue(-1.2, 1.2),
    startColor: new ConstantColor(new QuarksVector4(1, 0.93, 0.78, 0.7)),
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
      new ApplyForce(new QuarksVector3(0, 1.4, 0), new ConstantValue(1)),
      createTurbulence(0.34),
    ],
  });

  const sparks = new ParticleSystem({
    autoDestroy: false,
    duration: config.fallDuration + 0.26,
    looping: false,
    startLife: new IntervalValue(0.1, 0.3),
    startSpeed: new IntervalValue(1.1, 3.8),
    startSize: new IntervalValue(0.022, 0.05),
    startColor: new ConstantColor(new QuarksVector4(1, 0.66, 0.18, 0.9)),
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
      new ApplyForce(new QuarksVector3(0, -2.4, 0), new ConstantValue(1)),
      createTurbulence(1.05),
    ],
  });

  return { trail, sparks, all: [trail, sparks] };
}

export function createMachadoImpactSystems(
  materials: MachadoParticleMaterials,
  config: MachadoParticleConfig,
): MachadoImpactSystems {
  const shards = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.2, 0.52),
    startSpeed: new IntervalValue(3.2, 7.4),
    startSize: new IntervalValue(0.05, 0.14),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.62, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(config.shardBurstCount), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new SphereEmitter({
      radius: 0.14,
      thickness: 0.2,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createFireGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -8.4, 0), new ConstantValue(1)),
      createTurbulence(0.6),
    ],
  });

  const plume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.18, 0.44),
    startSpeed: new IntervalValue(1.8, 4.8),
    startSize: new IntervalValue(0.62, 1.14),
    startColor: new ConstantColor(new QuarksVector4(1, 0.82, 0.56, 0.82)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(20), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new ConeEmitter({
      radius: 0.26,
      thickness: 0.7,
      angle: 0.3,
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
      createTurbulence(0.7),
    ],
  });

  shards.pause();
  plume.pause();
  shards.emitter.visible = false;
  plume.emitter.visible = false;

  return { shards, plume, all: [shards, plume] };
}

export function disposeMachadoParticleMaterials(
  materials: MachadoParticleMaterials,
): void {
  materials.ember.dispose();
  materials.spark.dispose();
  materials.trail.dispose();
}

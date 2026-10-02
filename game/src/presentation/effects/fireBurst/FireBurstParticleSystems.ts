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
} from "../vfxKit/quarkFx";

export interface FireBurstParticleMaterials {
  fire: MeshBasicMaterial;
  spark: MeshBasicMaterial;
  trail: MeshBasicMaterial;
}

export interface FireBurstFlightSystems {
  trail: ParticleSystem;
  sparks: ParticleSystem;
  all: ParticleSystem[];
}

export interface FireBurstImpactSystems {
  impact: ParticleSystem;
  plume: ParticleSystem;
  all: ParticleSystem[];
}

export interface FireBurstParticleConfig {
  flightDuration: number;
  trailEmission: number;
  sparkEmission: number;
}

export function createFireBurstParticleMaterials(
  textures: { fire: Texture; spark: Texture; trail: Texture },
  flameTexture?: Texture,
): FireBurstParticleMaterials {
  return {
    fire: createAdditiveMaterial(flameTexture ?? textures.fire),
    spark: createAdditiveMaterial(textures.spark),
    trail: createAdditiveMaterial(textures.trail),
  };
}

export function createFireBurstFlightSystems(
  materials: FireBurstParticleMaterials,
  config: FireBurstParticleConfig,
): FireBurstFlightSystems {
  const trail = new ParticleSystem({
    autoDestroy: false,
    duration: config.flightDuration + 0.28,
    looping: false,
    startLife: new IntervalValue(0.1, 0.24),
    startSpeed: new IntervalValue(0.1, 0.6),
    startSize: new IntervalValue(0.24, 0.46),
    startRotation: new IntervalValue(-1.1, 1.1),
    startColor: new ConstantColor(new QuarksVector4(1, 0.76, 0.42, 0.76)),
    emissionOverTime: new ConstantValue(config.trailEmission),
    emissionOverDistance: new ConstantValue(9),
    shape: new ConeEmitter({
      radius: 0.045,
      thickness: 0.72,
      angle: 0.16,
    }),
    material: materials.fire,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.6, 0), new ConstantValue(1)),
      createTurbulence(0.38),
    ],
  });

  const sparks = new ParticleSystem({
    autoDestroy: false,
    duration: config.flightDuration + 0.22,
    looping: false,
    startLife: new IntervalValue(0.12, 0.34),
    startSpeed: new IntervalValue(1.3, 4.6),
    startSize: new IntervalValue(0.025, 0.055),
    startColor: new ConstantColor(new QuarksVector4(1, 0.68, 0.2, 0.9)),
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
      new ApplyForce(new QuarksVector3(0, -2.7, 0), new ConstantValue(1)),
      createTurbulence(1.15),
    ],
  });

  return { trail, sparks, all: [trail, sparks] };
}

export function createFireBurstImpactSystems(
  materials: FireBurstParticleMaterials,
): FireBurstImpactSystems {
  const impact = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.16, 0.42),
    startSpeed: new IntervalValue(2.8, 6.5),
    startSize: new IntervalValue(0.32, 0.68),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.78, 0.42, 0.88)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(32), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.18,
      thickness: 0.18,
    }),
    material: materials.fire,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -3.6, 0), new ConstantValue(1)),
      createTurbulence(0.46),
    ],
  });

  const plume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.14, 0.36),
    startSpeed: new IntervalValue(1.6, 4.4),
    startSize: new IntervalValue(0.65, 1.1),
    startColor: new ConstantColor(new QuarksVector4(1, 0.8, 0.58, 0.8)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(18), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({
      radius: 0.24,
      thickness: 0.72,
      angle: 0.3,
    }),
    material: materials.fire,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      createTurbulence(0.72),
    ],
  });

  impact.pause();
  plume.pause();
  impact.emitter.visible = false;
  plume.emitter.visible = false;

  return {
    impact,
    plume,
    all: [impact, plume],
  };
}

export function disposeFireBurstParticleMaterials(
  materials: FireBurstParticleMaterials,
): void {
  materials.fire.dispose();
  materials.spark.dispose();
  materials.trail.dispose();
}

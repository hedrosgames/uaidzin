import {
  AdditiveBlending,
  DoubleSide,
  MeshBasicMaterial,
  type Texture,
} from "three";
import {
  ApplyForce,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  Gradient,
  IntervalValue,
  ParticleSystem,
  RenderMode,
  SphereEmitter,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import { createShrink, createTurbulence } from "../../vfxKit/quarkFx";

export interface LuzParticleMaterials {
  glow: MeshBasicMaterial;
  spark: MeshBasicMaterial;
  flare: MeshBasicMaterial;
}

export interface LuzChargeSystems {
  chargeMotes: ParticleSystem;
  all: ParticleSystem[];
}

export interface LuzBeamSystems {
  beamSparks: ParticleSystem;
  beamHalo: ParticleSystem;
  all: ParticleSystem[];
}

export interface LuzImpactSystems {
  impactBurst: ParticleSystem;
  impactPlume: ParticleSystem;
  all: ParticleSystem[];
}

export interface LuzParticleConfig {
  chargeDuration: number;
  moteEmission: number;
  sparkEmission: number;
  haloEmission: number;
  impactSparkCount: number;
}

export function createLuzParticleMaterials(
  textures: { glow: Texture; spark: Texture; flare: Texture },
): LuzParticleMaterials {
  const create = (map: Texture, opacity: number): MeshBasicMaterial =>
    new MeshBasicMaterial({
      map,
      color: 0xffffff,
      transparent: true,
      opacity,
      alphaTest: 0.01,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
  return {
    glow: create(textures.glow, 0.85),
    spark: create(textures.spark, 0.95),
    flare: create(textures.flare, 0.9),
  };
}

function createGoldGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.98, 0.88), 0],
      [new QuarksVector3(1, 0.84, 0.34), 0.45],
      [new QuarksVector3(0.62, 0.42, 0.1), 1],
    ],
    [
      [1, 0],
      [0.85, 0.4],
      [0, 1],
    ],
  );
}

export function createLuzChargeSystems(
  materials: LuzParticleMaterials,
  config: LuzParticleConfig,
): LuzChargeSystems {
  const chargeMotes = new ParticleSystem({
    autoDestroy: false,
    duration: config.chargeDuration + 0.2,
    looping: false,
    startLife: new IntervalValue(0.16, 0.34),
    startSpeed: new IntervalValue(0.4, 1.3),
    startSize: new IntervalValue(0.06, 0.16),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.92, 0.62, 0.9)),
    emissionOverTime: new ConstantValue(config.moteEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({ radius: 0.34, thickness: 0.3 }),
    material: materials.glow,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createGoldGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.6, 0), new ConstantValue(1)),
      createTurbulence(0.7),
    ],
  });
  return { chargeMotes, all: [chargeMotes] };
}

export function createLuzBeamSystems(
  materials: LuzParticleMaterials,
  config: LuzParticleConfig,
): LuzBeamSystems {
  const beamSparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.6,
    looping: false,
    startLife: new IntervalValue(0.08, 0.2),
    startSpeed: new IntervalValue(1.8, 4.6),
    startSize: new IntervalValue(0.05, 0.12),
    startColor: new ConstantColor(new QuarksVector4(1, 0.95, 0.72, 0.95)),
    emissionOverTime: new ConstantValue(config.sparkEmission),
    emissionOverDistance: new ConstantValue(26),
    shape: new SphereEmitter({ radius: 0.1, thickness: 0.9 }),
    material: materials.spark,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.14,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createGoldGradient()),
      createShrink(1),
      createTurbulence(1.1),
    ],
  });

  const beamHalo = new ParticleSystem({
    autoDestroy: false,
    duration: 0.6,
    looping: false,
    startLife: new IntervalValue(0.14, 0.3),
    startSpeed: new IntervalValue(0.2, 0.7),
    startSize: new IntervalValue(0.3, 0.62),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.5, 0.55)),
    emissionOverTime: new ConstantValue(config.haloEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({ radius: 0.18, thickness: 0.7 }),
    material: materials.glow,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createGoldGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.5, 0), new ConstantValue(1)),
      createTurbulence(0.4),
    ],
  });

  beamSparks.pause();
  beamHalo.pause();
  beamSparks.emitter.visible = false;
  beamHalo.emitter.visible = false;

  return { beamSparks, beamHalo, all: [beamSparks, beamHalo] };
}

export function createLuzImpactSystems(
  materials: LuzParticleMaterials,
  config: LuzParticleConfig,
): LuzImpactSystems {
  const impactBurst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.2, 0.5),
    startSpeed: new IntervalValue(2.6, 6.2),
    startSize: new IntervalValue(0.1, 0.3),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.94, 0.7, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.impactSparkCount), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({ radius: 0.14, thickness: 0.16 }),
    material: materials.spark,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.18,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createGoldGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -3.2, 0), new ConstantValue(1)),
      createTurbulence(1.2),
    ],
  });

  const impactPlume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.24, 0.52),
    startSpeed: new IntervalValue(1.2, 3),
    startSize: new IntervalValue(0.4, 0.9),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.86, 0.48, 0.7)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(18), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({ radius: 0.3, thickness: 0.7, angle: 0.4 }),
    material: materials.flare,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createGoldGradient()),
      createShrink(1),
      createTurbulence(0.7),
    ],
  });

  impactBurst.pause();
  impactPlume.pause();
  impactBurst.emitter.visible = false;
  impactPlume.emitter.visible = false;

  return { impactBurst, impactPlume, all: [impactBurst, impactPlume] };
}

export function disposeLuzParticleMaterials(materials: LuzParticleMaterials): void {
  materials.glow.dispose();
  materials.spark.dispose();
  materials.flare.dispose();
}

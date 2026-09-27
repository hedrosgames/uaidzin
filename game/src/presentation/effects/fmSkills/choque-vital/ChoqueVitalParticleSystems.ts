import { AdditiveBlending, DoubleSide, MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
  CircleEmitter,
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
import { createShrink, createTurbulence } from "../../vfxKit/quarkFx";

export interface ChoqueVitalParticleMaterials {
  spark: MeshBasicMaterial;
  glow: MeshBasicMaterial;
  smoke: MeshBasicMaterial;
}

export interface ChoqueVitalChargeSystems {
  motes: ParticleSystem;
  all: ParticleSystem[];
}

export interface ChoqueVitalArcSystems {
  arcSparks: ParticleSystem;
  corona: ParticleSystem;
  all: ParticleSystem[];
}

export interface ChoqueVitalImpactSystems {
  burst: ParticleSystem;
  plume: ParticleSystem;
  all: ParticleSystem[];
}

export interface ChoqueVitalParticleConfig {
  sparkEmission: number;
  coronaEmission: number;
  impactBurstCount: number;
}

export function createChoqueVitalParticleMaterials(
  sparkTexture: Texture,
  glowTexture: Texture,
): ChoqueVitalParticleMaterials {
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
    spark: create(sparkTexture, 0.95),
    glow: create(glowTexture, 0.8),
    smoke: create(glowTexture, 0.5),
  };
}

function createChargeGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 1, 0.92), 0],
      [new QuarksVector3(1, 0.86, 0.44), 0.3],
      [new QuarksVector3(0.9, 0.52, 0.1), 0.68],
      [new QuarksVector3(0.24, 0.1, 0.02), 1],
    ],
    [
      [1, 0],
      [0.94, 0.28],
      [0.5, 0.7],
      [0, 1],
    ],
  );
}

export function createChoqueVitalChargeSystems(
  materials: ChoqueVitalParticleMaterials,
): ChoqueVitalChargeSystems {
  const motes = new ParticleSystem({
    autoDestroy: false,
    duration: 0.32,
    looping: false,
    startLife: new IntervalValue(0.1, 0.24),
    startSpeed: new IntervalValue(1.1, 2.6),
    startSize: new IntervalValue(0.05, 0.12),
    startColor: new ConstantColor(new QuarksVector4(1, 0.9, 0.54, 0.94)),
    emissionOverTime: new ConstantValue(70),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({ radius: 0.34, thickness: 0.4 }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createChargeGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1, 0), new ConstantValue(1)),
      createTurbulence(0.8),
    ],
  });
  return { motes, all: [motes] };
}

export function createChoqueVitalArcSystems(
  materials: ChoqueVitalParticleMaterials,
  config: ChoqueVitalParticleConfig,
): ChoqueVitalArcSystems {
  const arcSparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.9,
    looping: false,
    startLife: new IntervalValue(0.1, 0.26),
    startSpeed: new IntervalValue(2, 5.6),
    startSize: new IntervalValue(0.045, 0.11),
    startColor: new ConstantColor(new QuarksVector4(1, 0.94, 0.66, 0.98)),
    emissionOverTime: new ConstantValue(config.sparkEmission),
    emissionOverDistance: new ConstantValue(8),
    shape: new CircleEmitter({ radius: 0.12, thickness: 0.7 }),
    material: materials.spark,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.16,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createChargeGradient()),
      createShrink(1),
      createTurbulence(1.2),
    ],
  });

  const corona = new ParticleSystem({
    autoDestroy: false,
    duration: 0.9,
    looping: false,
    startLife: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(0.2, 0.9),
    startSize: new IntervalValue(0.24, 0.52),
    startColor: new ConstantColor(new QuarksVector4(1, 0.82, 0.4, 0.6)),
    emissionOverTime: new ConstantValue(config.coronaEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({ radius: 0.2, thickness: 0.7 }),
    material: materials.glow,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createChargeGradient()),
      createShrink(1),
      createTurbulence(0.5),
    ],
  });

  arcSparks.pause();
  corona.pause();
  arcSparks.emitter.visible = false;
  corona.emitter.visible = false;

  return { arcSparks, corona, all: [arcSparks, corona] };
}

export function createChoqueVitalImpactSystems(
  materials: ChoqueVitalParticleMaterials,
  config: ChoqueVitalParticleConfig,
): ChoqueVitalImpactSystems {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.14, 0.36),
    startSpeed: new IntervalValue(4.2, 9),
    startSize: new IntervalValue(0.1, 0.26),
    startColor: new ConstantColor(new QuarksVector4(1, 0.96, 0.76, 0.96)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.impactBurstCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new PointEmitter(),
    material: materials.spark,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.2,
    worldSpace: true,
    renderOrder: 11,
    behaviors: [
      new ColorOverLife(createChargeGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.2, 0), new ConstantValue(1)),
      createTurbulence(1.4),
    ],
  });

  const plume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.24, 0.56),
    startSpeed: new IntervalValue(0.9, 2.6),
    startSize: new IntervalValue(0.5, 1.05),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.66, 0.34, 0.36)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(14), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({ radius: 0.3, thickness: 0.68, angle: 0.44 }),
    material: materials.smoke,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 11,
    behaviors: [
      new ColorOverLife(createChargeGradient()),
      createShrink(1),
      createTurbulence(0.62),
    ],
  });

  burst.pause();
  plume.pause();
  burst.emitter.visible = false;
  plume.emitter.visible = false;

  return { burst, plume, all: [burst, plume] };
}

export function disposeChoqueVitalParticleMaterials(
  materials: ChoqueVitalParticleMaterials,
): void {
  materials.spark.dispose();
  materials.glow.dispose();
  materials.smoke.dispose();
}

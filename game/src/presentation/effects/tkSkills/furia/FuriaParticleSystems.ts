import { MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
  ColorOverLife,
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
import {
  createAdditiveMaterial,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface FuriaParticleMaterials {
  ember: MeshBasicMaterial;
  spark: MeshBasicMaterial;
}

export interface FuriaAuraSystems {
  embers: ParticleSystem;
  all: ParticleSystem[];
}

export interface FuriaBurstSystems {
  burst: ParticleSystem;
  all: ParticleSystem[];
}

export interface FuriaParticleConfig {
  emberEmission: number;
  burstCount: number;
  ringRadius: number;
}

function createFuriaGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.62, 0.32), 0],
      [new QuarksVector3(0.96, 0.28, 0.12), 0.38],
      [new QuarksVector3(0.64, 0.1, 0.05), 0.74],
      [new QuarksVector3(0.16, 0.02, 0.01), 1],
    ],
    [
      [0.95, 0],
      [0.85, 0.42],
      [0.42, 0.78],
      [0, 1],
    ],
  );
}

export function createFuriaParticleMaterials(
  textures: { ember: Texture; spark: Texture },
): FuriaParticleMaterials {
  return {
    ember: createAdditiveMaterial(textures.ember),
    spark: createAdditiveMaterial(textures.spark),
  };
}

export function createFuriaAuraSystems(
  materials: FuriaParticleMaterials,
  config: FuriaParticleConfig,
): FuriaAuraSystems {
  const embers = new ParticleSystem({
    autoDestroy: false,
    duration: 2,
    looping: true,
    startLife: new IntervalValue(0.8, 1.7),
    startSpeed: new IntervalValue(0.25, 0.85),
    startSize: new IntervalValue(0.14, 0.34),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.42, 0.2, 0.78)),
    emissionOverTime: new ConstantValue(config.emberEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({
      radius: Math.max(0.1, config.ringRadius * 0.62),
      thickness: 0.4,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createFuriaGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.9, 0), new ConstantValue(1)),
      createTurbulence(0.52),
    ],
  });

  embers.pause();
  embers.emitter.visible = false;

  return { embers, all: [embers] };
}

export function createFuriaBurstSystems(
  materials: FuriaParticleMaterials,
  config: FuriaParticleConfig,
): FuriaBurstSystems {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.2, 0.5),
    startSpeed: new IntervalValue(2.4, 5.6),
    startSize: new IntervalValue(0.28, 0.62),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.62, 0.34, 0.9)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.burstCount), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.2,
      thickness: 0.2,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.4, 0), new ConstantValue(1)),
      createTurbulence(0.8),
    ],
  });

  const ringSparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.18, 0.4),
    startSpeed: new IntervalValue(3.4, 6.8),
    startSize: new IntervalValue(0.1, 0.2),
    startColor: new ConstantColor(new QuarksVector4(1, 0.5, 0.24, 0.88)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(Math.floor(config.burstCount * 0.6)), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.14,
      thickness: 0.14,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -3.4, 0), new ConstantValue(1)),
      createTurbulence(0.6),
    ],
  });

  burst.pause();
  ringSparks.pause();
  burst.emitter.visible = false;
  ringSparks.emitter.visible = false;

  return { burst, all: [burst, ringSparks] };
}

export function disposeFuriaParticleMaterials(
  materials: FuriaParticleMaterials,
): void {
  materials.ember.dispose();
  materials.spark.dispose();
}

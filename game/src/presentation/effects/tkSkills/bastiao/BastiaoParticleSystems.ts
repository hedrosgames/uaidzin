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
  RenderMode,
  SphereEmitter,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import {
  createAdditiveMaterial,
  createFlameAnimation,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface BastiaoParticleMaterials {
  dust: MeshBasicMaterial;
  spark: MeshBasicMaterial;
  spectral: MeshBasicMaterial;
}

export interface BastiaoJointSystems {
  dust: ParticleSystem;
  burst: ParticleSystem;
  all: ParticleSystem[];
}

export interface BastiaoChainSparks {
  burst: ParticleSystem;
  all: ParticleSystem[];
}

export interface BastiaoCloseSystems {
  closeSparks: ParticleSystem;
  emberPulse: ParticleSystem;
  all: ParticleSystem[];
}

export interface BastiaoDescentSystems {
  groundDust: ParticleSystem;
  all: ParticleSystem[];
}

export interface BastiaoParticleConfig {
  riseDuration: number;
  dustEmission: number;
  jointBurstCount: number;
  chainSparkCount: number;
  closeSparkCount: number;
  pulseBurstCount: number;
  descentBurstCount: number;
}

export function createBastiaoParticleMaterials(
  textures: { dust: Texture; spark: Texture; spectral: Texture },
): BastiaoParticleMaterials {
  return {
    dust: createAdditiveMaterial(textures.dust),
    spark: createAdditiveMaterial(textures.spark),
    spectral: createAdditiveMaterial(textures.spectral),
  };
}

function createDustGradient(): ColorOverLife {
  return new ColorOverLife(
    new Gradient(
      [
        [new QuarksVector3(0.86, 0.8, 0.68), 0],
        [new QuarksVector3(0.52, 0.46, 0.36), 1],
      ],
      [
        [0.9, 0],
        [0, 1],
      ],
    ),
  );
}

export function createBastiaoJointSystems(
  materials: BastiaoParticleMaterials,
  config: BastiaoParticleConfig,
): BastiaoJointSystems {
  const dust = new ParticleSystem({
    autoDestroy: false,
    duration: config.riseDuration + 0.3,
    looping: false,
    startLife: new IntervalValue(0.5, 1.1),
    startSpeed: new IntervalValue(0.35, 1.2),
    startSize: new IntervalValue(0.3, 0.72),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.8, 0.68, 0.52)),
    emissionOverTime: new ConstantValue(config.dustEmission),
    emissionOverDistance: new ConstantValue(6),
    shape: new ConeEmitter({
      radius: 0.14,
      thickness: 0.7,
      angle: 0.5,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createDustGradient(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.55, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });

  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.3, 0.7),
    startSpeed: new IntervalValue(1.1, 3),
    startSize: new IntervalValue(0.24, 0.6),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.88, 0.82, 0.7, 0.66)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(config.jointBurstCount), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new SphereEmitter({
      radius: 0.16,
      thickness: 0.24,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createDustGradient(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.4, 0), new ConstantValue(1)),
      createTurbulence(0.62),
    ],
  });

  burst.pause();
  burst.emitter.visible = false;

  return { dust, burst, all: [dust, burst] };
}

export function createBastiaoChainSparks(
  materials: BastiaoParticleMaterials,
  config: BastiaoParticleConfig,
): BastiaoChainSparks {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.16, 0.42),
    startSpeed: new IntervalValue(1.8, 4.8),
    startSize: new IntervalValue(0.04, 0.11),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.5, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(config.chainSparkCount), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new SphereEmitter({
      radius: 0.1,
      thickness: 0.2,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -6.2, 0), new ConstantValue(1)),
      createTurbulence(0.7),
    ],
  });

  burst.pause();
  burst.emitter.visible = false;

  return { burst, all: [burst] };
}

export function createBastiaoCloseSystems(
  materials: BastiaoParticleMaterials,
  config: BastiaoParticleConfig,
): BastiaoCloseSystems {
  const closeSparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.22, 0.54),
    startSpeed: new IntervalValue(3.2, 7.4),
    startSize: new IntervalValue(0.06, 0.16),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.92, 0.62, 0.96)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(config.closeSparkCount), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new SphereEmitter({
      radius: 0.12,
      thickness: 0.2,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -8.2, 0), new ConstantValue(1)),
      createTurbulence(0.62),
    ],
  });

  const emberPulse = new ParticleSystem({
    autoDestroy: false,
    duration: 0.16,
    looping: false,
    startLife: new IntervalValue(0.5, 1.1),
    startSpeed: new IntervalValue(0.7, 2.3),
    startSize: new IntervalValue(0.3, 0.7),
    startColor: new ConstantColor(new QuarksVector4(1, 0.82, 0.42, 0.72)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(config.pulseBurstCount), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new ConeEmitter({
      radius: 0.32,
      thickness: 0.7,
      angle: 0.38,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.9, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });

  closeSparks.pause();
  emberPulse.pause();
  closeSparks.emitter.visible = false;
  emberPulse.emitter.visible = false;

  return { closeSparks, emberPulse, all: [closeSparks, emberPulse] };
}

export function createBastiaoDescentSystems(
  materials: BastiaoParticleMaterials,
  config: BastiaoParticleConfig,
): BastiaoDescentSystems {
  const groundDust = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.4, 0.9),
    startSpeed: new IntervalValue(1.3, 3.5),
    startSize: new IntervalValue(0.3, 0.78),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.8, 0.68, 0.6)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      { time: 0, count: new ConstantValue(config.descentBurstCount), cycle: 1, interval: 0, probability: 1 },
    ],
    shape: new SphereEmitter({
      radius: 0.18,
      thickness: 0.3,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createDustGradient(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.8, 0), new ConstantValue(1)),
      createTurbulence(0.7),
    ],
  });

  groundDust.pause();
  groundDust.emitter.visible = false;

  return { groundDust, all: [groundDust] };
}

export function disposeBastiaoParticleMaterials(
  materials: BastiaoParticleMaterials,
): void {
  materials.dust.dispose();
  materials.spark.dispose();
  materials.spectral.dispose();
}

import {
  DoubleSide,
  MeshBasicMaterial,
  NormalBlending,
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

export interface InvestidaParticleMaterials {
  wind: MeshBasicMaterial;
  spark: MeshBasicMaterial;
  dust: MeshBasicMaterial;
}

export interface InvestidaFlightSystems {
  windTrail: ParticleSystem;
  gusts: ParticleSystem;
  all: ParticleSystem[];
}

export interface InvestidaArrivalSystems {
  dustBurst: ParticleSystem;
  dustPlume: ParticleSystem;
  all: ParticleSystem[];
}

export interface InvestidaParticleConfig {
  dashDuration: number;
  windEmission: number;
  gustEmission: number;
  dustBurstCount: number;
}

export function createInvestidaParticleMaterials(
  textures: { wind: Texture; spark: Texture; dust: Texture },
): InvestidaParticleMaterials {
  return {
    wind: createAdditiveMaterial(textures.wind),
    spark: createAdditiveMaterial(textures.spark),
    dust: new MeshBasicMaterial({
      map: textures.dust,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: NormalBlending,
      toneMapped: false,
    }),
  };
}

function createWindGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(0.96, 0.99, 1), 0],
      [new QuarksVector3(0.76, 0.85, 0.92), 0.5],
      [new QuarksVector3(0.4, 0.5, 0.58), 1],
    ],
    [
      [0.68, 0],
      [0.42, 0.55],
      [0, 1],
    ],
  );
}

function createDustGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(0.84, 0.76, 0.6), 0],
      [new QuarksVector3(0.62, 0.54, 0.42), 0.5],
      [new QuarksVector3(0.34, 0.3, 0.24), 1],
    ],
    [
      [0.9, 0],
      [0.55, 0.45],
      [0, 1],
    ],
  );
}

export function createInvestidaFlightSystems(
  materials: InvestidaParticleMaterials,
  config: InvestidaParticleConfig,
): InvestidaFlightSystems {
  const windTrail = new ParticleSystem({
    autoDestroy: false,
    duration: config.dashDuration + 0.3,
    looping: false,
    startLife: new IntervalValue(0.1, 0.24),
    startSpeed: new IntervalValue(0.2, 0.9),
    startSize: new IntervalValue(0.26, 0.5),
    startRotation: new IntervalValue(-1, 1),
    startColor: new ConstantColor(new QuarksVector4(0.94, 0.97, 1, 0.62)),
    emissionOverTime: new ConstantValue(config.windEmission),
    emissionOverDistance: new ConstantValue(12),
    shape: new ConeEmitter({
      radius: 0.05,
      thickness: 0.7,
      angle: 0.14,
    }),
    material: materials.wind,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.12,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createWindGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.6, 0), new ConstantValue(1)),
      createTurbulence(0.3),
    ],
  });

  const gusts = new ParticleSystem({
    autoDestroy: false,
    duration: config.dashDuration + 0.24,
    looping: false,
    startLife: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(1.1, 3.4),
    startSize: new IntervalValue(0.03, 0.06),
    startColor: new ConstantColor(new QuarksVector4(0.88, 0.93, 1, 0.9)),
    emissionOverTime: new ConstantValue(config.gustEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new PointEmitter(),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createWindGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.4, 0), new ConstantValue(1)),
      createTurbulence(1.05),
    ],
  });

  return { windTrail, gusts, all: [windTrail, gusts] };
}

export function createInvestidaArrivalSystems(
  materials: InvestidaParticleMaterials,
  config: InvestidaParticleConfig,
): InvestidaArrivalSystems {
  const dustBurst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.2, 0.44),
    startSpeed: new IntervalValue(2.2, 5),
    startSize: new IntervalValue(0.35, 0.78),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.78, 0.62, 0.9)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.dustBurstCount), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.16,
      thickness: 0.16,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createDustGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.4, 0), new ConstantValue(1)),
      createTurbulence(0.52),
    ],
  });

  const dustPlume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.24, 0.46),
    startSpeed: new IntervalValue(1.3, 3.2),
    startSize: new IntervalValue(0.5, 0.95),
    startColor: new ConstantColor(new QuarksVector4(0.9, 0.82, 0.66, 0.82)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(16), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({
      radius: 0.26,
      thickness: 0.72,
      angle: 0.34,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createDustGradient()),
      createShrink(1),
      createTurbulence(0.6),
    ],
  });

  dustBurst.pause();
  dustPlume.pause();
  dustBurst.emitter.visible = false;
  dustPlume.emitter.visible = false;

  return {
    dustBurst,
    dustPlume,
    all: [dustBurst, dustPlume],
  };
}

export function disposeInvestidaParticleMaterials(
  materials: InvestidaParticleMaterials,
): void {
  materials.wind.dispose();
  materials.spark.dispose();
  materials.dust.dispose();
}

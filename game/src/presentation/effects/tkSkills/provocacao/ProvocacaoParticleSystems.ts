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

export interface ProvocacaoParticleMaterials {
  ember: MeshBasicMaterial;
  spark: MeshBasicMaterial;
}

export interface ProvocacaoBurstSystems {
  burst: ParticleSystem;
  ringSparks: ParticleSystem;
  all: ParticleSystem[];
}

export interface ProvocacaoAuraSystems {
  embers: ParticleSystem;
  all: ParticleSystem[];
}

export interface ProvocacaoParticleConfig {
  emberEmission: number;
  burstCount: number;
}

function createProvocacaoGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.6, 0.42), 0],
      [new QuarksVector3(0.88, 0.26, 0.2), 0.36],
      [new QuarksVector3(0.55, 0.1, 0.08), 0.72],
      [new QuarksVector3(0.14, 0.02, 0.02), 1],
    ],
    [
      [0.92, 0],
      [0.82, 0.4],
      [0.4, 0.76],
      [0, 1],
    ],
  );
}

export function createProvocacaoParticleMaterials(
  textures: { ember: Texture; spark: Texture },
): ProvocacaoParticleMaterials {
  return {
    ember: createAdditiveMaterial(textures.ember),
    spark: createAdditiveMaterial(textures.spark),
  };
}

export function createProvocacaoAuraSystems(
  materials: ProvocacaoParticleMaterials,
  config: ProvocacaoParticleConfig,
): ProvocacaoAuraSystems {
  const embers = new ParticleSystem({
    autoDestroy: false,
    duration: 2,
    looping: true,
    startLife: new IntervalValue(0.5, 0.95),
    startSpeed: new IntervalValue(0.3, 0.95),
    startSize: new IntervalValue(0.12, 0.3),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.46, 0.3, 0.82)),
    emissionOverTime: new ConstantValue(config.emberEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({
      radius: 0.52,
      thickness: 0.42,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createProvocacaoGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.7, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });

  embers.pause();
  embers.emitter.visible = false;

  return { embers, all: [embers] };
}

export function createProvocacaoBurstSystems(
  materials: ProvocacaoParticleMaterials,
  config: ProvocacaoParticleConfig,
): ProvocacaoBurstSystems {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.22, 0.5),
    startSpeed: new IntervalValue(2.8, 6.4),
    startSize: new IntervalValue(0.26, 0.58),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.52, 0.36, 0.9)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.burstCount), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.2,
      thickness: 0.2,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.2, 0), new ConstantValue(1)),
      createTurbulence(0.78),
    ],
  });

  const ringSparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.2, 0.44),
    startSpeed: new IntervalValue(4.2, 7.6),
    startSize: new IntervalValue(0.09, 0.2),
    startColor: new ConstantColor(new QuarksVector4(1, 0.76, 0.3, 0.92)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(Math.floor(config.burstCount * 0.7)), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.3,
      thickness: 0.1,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -3.6, 0), new ConstantValue(1)),
      createTurbulence(0.55),
    ],
  });

  burst.pause();
  ringSparks.pause();
  burst.emitter.visible = false;
  ringSparks.emitter.visible = false;

  return { burst, ringSparks, all: [burst, ringSparks] };
}

export function disposeProvocacaoParticleMaterials(
  materials: ProvocacaoParticleMaterials,
): void {
  materials.ember.dispose();
  materials.spark.dispose();
}

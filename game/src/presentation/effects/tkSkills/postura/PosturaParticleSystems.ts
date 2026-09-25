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
  CircleEmitter,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import {
  createAdditiveMaterial,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface PosturaParticleMaterials {
  spark: MeshBasicMaterial;
  mote: MeshBasicMaterial;
}

export interface PosturaSparkSystems {
  burst: ParticleSystem;
  ambient: ParticleSystem;
  all: ParticleSystem[];
}

export interface PosturaParticleConfig {
  ringRadius: number;
  sparkEmission: number;
  moteEmission: number;
}

function createSparkGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.93, 0.72), 0],
      [new QuarksVector3(0.91, 0.69, 0.18), 0.4],
      [new QuarksVector3(0.55, 0.4, 0.1), 0.75],
      [new QuarksVector3(0.12, 0.09, 0.03), 1],
    ],
    [
      [1, 0],
      [0.9, 0.3],
      [0.4, 0.74],
      [0, 1],
    ],
  );
}

function createMoteGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(0.85, 0.74, 0.5), 0],
      [new QuarksVector3(0.72, 0.55, 0.18), 0.5],
      [new QuarksVector3(0.2, 0.16, 0.08), 1],
    ],
    [
      [0.4, 0],
      [0.28, 0.6],
      [0, 1],
    ],
  );
}

export function createPosturaParticleMaterials(
  textures: { spark: Texture; mote: Texture },
): PosturaParticleMaterials {
  return {
    spark: createAdditiveMaterial(textures.spark),
    mote: createAdditiveMaterial(textures.mote),
  };
}

export function createPosturaSparkSystems(
  materials: PosturaParticleMaterials,
  config: PosturaParticleConfig,
): PosturaSparkSystems {
  const radius = Math.max(0.4, config.ringRadius);

  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.45,
    looping: false,
    startLife: new IntervalValue(0.28, 0.6),
    startSpeed: new IntervalValue(0.9, 2.1),
    startSize: new IntervalValue(0.1, 0.26),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.55, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{
      time: 0,
      count: new ConstantValue(Math.max(6, Math.round(config.sparkEmission))),
      cycle: 1,
      interval: 1,
      probability: 1,
    }],
    shape: new CircleEmitter({
      radius,
      arc: Math.PI * 2,
      thickness: 0.08,
      speed: new ConstantValue(0),
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createSparkGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 2.4, 0), new ConstantValue(1)),
      createTurbulence(0.3),
    ],
  });

  const ambient = new ParticleSystem({
    autoDestroy: false,
    duration: 3,
    looping: true,
    startLife: new IntervalValue(1.6, 3),
    startSpeed: new IntervalValue(0.05, 0.2),
    startSize: new IntervalValue(0.06, 0.14),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.85, 0.72, 0.42, 0.32)),
    emissionOverTime: new ConstantValue(config.moteEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new CircleEmitter({
      radius,
      arc: Math.PI * 2,
      thickness: 0.22,
      speed: new ConstantValue(0),
    }),
    material: materials.mote,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createMoteGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.5, 0), new ConstantValue(1)),
      createTurbulence(0.16),
    ],
  });

  burst.pause();
  burst.emitter.visible = false;
  ambient.pause();
  ambient.emitter.visible = false;

  return { burst, ambient, all: [burst, ambient] };
}

export function disposePosturaParticleMaterials(
  materials: PosturaParticleMaterials,
): void {
  materials.spark.dispose();
  materials.mote.dispose();
}

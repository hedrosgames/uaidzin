import { MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
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
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface CorteParticleMaterials {
  spark: MeshBasicMaterial;
}

export interface CorteSlashSystems {
  sparks: ParticleSystem;
  glint: ParticleSystem;
  all: ParticleSystem[];
}

export interface CorteParticleConfig {
  slashDuration: number;
  sparkEmission: number;
  glintBurst: number;
}

export function createCorteParticleMaterials(
  textures: { spark: Texture },
): CorteParticleMaterials {
  return {
    spark: createAdditiveMaterial(textures.spark),
  };
}

export function createCorteSlashSystems(
  materials: CorteParticleMaterials,
  config: CorteParticleConfig,
): CorteSlashSystems {
  const sparks = new ParticleSystem({
    autoDestroy: false,
    duration: config.slashDuration,
    looping: false,
    startLife: new IntervalValue(0.14, 0.34),
    startSpeed: new IntervalValue(1.4, 3.8),
    startSize: new IntervalValue(0.02, 0.05),
    startColor: new ConstantColor(new QuarksVector4(1, 0.96, 0.86, 0.9)),
    emissionOverTime: new ConstantValue(config.sparkEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new PointEmitter(),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.4, 0), new ConstantValue(1)),
      createTurbulence(0.9),
    ],
  });

  const glint = new ParticleSystem({
    autoDestroy: false,
    duration: 0.05,
    looping: false,
    startLife: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(1.2, 2.6),
    startSize: new IntervalValue(0.03, 0.07),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.98, 0.92, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.glintBurst),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: 0.05,
      thickness: 0.1,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -1.8, 0), new ConstantValue(1)),
      createTurbulence(0.6),
    ],
  });

  sparks.pause();
  glint.pause();
  sparks.emitter.visible = false;
  glint.emitter.visible = false;

  return { sparks, glint, all: [sparks, glint] };
}

export function disposeCorteParticleMaterials(
  materials: CorteParticleMaterials,
): void {
  materials.spark.dispose();
}

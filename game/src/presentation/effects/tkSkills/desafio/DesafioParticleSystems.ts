import { MeshBasicMaterial } from "three";
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
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";
import type { DesafioTextureSet } from "./DesafioTextures";

export interface DesafioParticleMaterials {
  ember: MeshBasicMaterial;
  spark: MeshBasicMaterial;
}

export interface DesafioParticleConfig {
  aimDuration: number;
  haloEmberEmission: number;
  snapSparkCount: number;
  markDustCount: number;
}

export function createDesafioParticleMaterials(
  textures: DesafioTextureSet,
): DesafioParticleMaterials {
  return {
    ember: createAdditiveMaterial(textures.glow),
    spark: createAdditiveMaterial(textures.spark),
  };
}

export function createDesafioHaloEmbers(
  materials: DesafioParticleMaterials,
  config: DesafioParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: config.aimDuration,
    looping: false,
    startLife: new IntervalValue(0.5, 0.95),
    startSpeed: new IntervalValue(0.5, 1.1),
    startSize: new IntervalValue(0.22, 0.44),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.56, 1, 0.38, 0.74)),
    emissionOverTime: new ConstantValue(config.haloEmberEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new ConeEmitter({
      radius: 0.34,
      thickness: 0.9,
      angle: 0.12,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.15, 0), new ConstantValue(1)),
      createTurbulence(0.28),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createDesafioSnapSparks(
  materials: DesafioParticleMaterials,
  config: DesafioParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.05,
    looping: false,
    startLife: new IntervalValue(0.42, 0.72),
    startSpeed: new IntervalValue(1.5, 2.4),
    startSize: new IntervalValue(0.05, 0.09),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.72, 1, 0.52, 0.96)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.snapSparkCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new ConeEmitter({
      radius: 0.06,
      thickness: 0.9,
      angle: 0.22,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createDesafioGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.9, 0), new ConstantValue(1)),
      createTurbulence(0.55),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createDesafioMarkDust(
  materials: DesafioParticleMaterials,
  config: DesafioParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.05,
    looping: false,
    startLife: new IntervalValue(0.22, 0.44),
    startSpeed: new IntervalValue(0.7, 1.5),
    startSize: new IntervalValue(0.08, 0.16),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.42, 0.9, 0.28, 0.68)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.markDustCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: 0.62,
      thickness: 0.9,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -0.6, 0), new ConstantValue(1)),
      createTurbulence(0.3),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function disposeDesafioParticleMaterials(
  materials: DesafioParticleMaterials,
): void {
  materials.ember.dispose();
  materials.spark.dispose();
}

function createDesafioGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(0.82, 1, 0.68), 0],
      [new QuarksVector3(0.32, 0.8, 0.2), 0.45],
      [new QuarksVector3(0.08, 0.26, 0.05), 1],
    ],
    [
      [1, 0],
      [0.9, 0.45],
      [0, 1],
    ],
  );
}

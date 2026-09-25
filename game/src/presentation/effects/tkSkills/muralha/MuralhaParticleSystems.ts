import { MeshBasicMaterial } from "three";
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
import type { MuralhaTextureSet } from "./MuralhaTextures";

export interface MuralhaParticleMaterials {
  dust: MeshBasicMaterial;
  joint: MeshBasicMaterial;
  spark: MeshBasicMaterial;
}

export interface MuralhaParticleConfig {
  jointDustRate: number;
  ringDustRate: number;
  crumbleDustBurst: number;
  crumbleDustRate: number;
  materializeDuration: number;
  crumbleDuration: number;
}

export function createMuralhaParticleMaterials(
  textures: MuralhaTextureSet,
): MuralhaParticleMaterials {
  return {
    dust: createAdditiveMaterial(textures.dust),
    joint: createAdditiveMaterial(textures.dust),
    spark: createAdditiveMaterial(textures.spark),
  };
}

function createDustGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(0.92, 0.86, 0.74), 0],
      [new QuarksVector3(0.72, 0.6, 0.4), 0.45],
      [new QuarksVector3(0.3, 0.24, 0.16), 1],
    ],
    [
      [0.75, 0],
      [0.45, 0.55],
      [0, 1],
    ],
  );
}

export function createMuralhaJointDust(
  materials: MuralhaParticleMaterials,
  config: MuralhaParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: config.materializeDuration,
    looping: false,
    startLife: new IntervalValue(0.3, 0.7),
    startSpeed: new IntervalValue(0.3, 1.1),
    startSize: new IntervalValue(0.12, 0.34),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.9, 0.82, 0.66, 0.6)),
    emissionOverTime: new ConstantValue(config.jointDustRate),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [],
    shape: new SphereEmitter({ radius: 0.4, thickness: 0.7 }),
    material: materials.joint,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createDustGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.9, 0), new ConstantValue(1)),
      createTurbulence(0.7),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createMuralhaRingDust(
  materials: MuralhaParticleMaterials,
  config: MuralhaParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: config.materializeDuration + 0.4,
    looping: false,
    startLife: new IntervalValue(0.4, 0.85),
    startSpeed: new IntervalValue(1.6, 3.4),
    startSize: new IntervalValue(0.16, 0.42),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.76, 0.56, 0.7)),
    emissionOverTime: new ConstantValue(config.ringDustRate),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [],
    shape: new SphereEmitter({ radius: 0.24, thickness: 0.9 }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 7,
    behaviors: [
      new ColorOverLife(createDustGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.25, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });
  system.emitter.scale.set(1, 0.04, 1);
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createMuralhaCrumbleDust(
  materials: MuralhaParticleMaterials,
  config: MuralhaParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: Math.max(0.05, config.crumbleDuration * 0.7),
    looping: false,
    startLife: new IntervalValue(0.4, 1.0),
    startSpeed: new IntervalValue(0.8, 2.6),
    startSize: new IntervalValue(0.18, 0.5),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.88, 0.8, 0.62, 0.72)),
    emissionOverTime: new ConstantValue(config.crumbleDustRate),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.crumbleDustBurst),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 1.2, thickness: 0.6 }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createDustGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.5, 0), new ConstantValue(1)),
      createTurbulence(0.9),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createMuralhaGoldSparks(
  materials: MuralhaParticleMaterials,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.08,
    looping: false,
    startLife: new IntervalValue(0.15, 0.4),
    startSpeed: new IntervalValue(1.4, 3.6),
    startSize: new IntervalValue(0.03, 0.07),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.5, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(24),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 0.3, thickness: 0.5 }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(new Gradient([
        [new QuarksVector3(1, 0.95, 0.7), 0],
        [new QuarksVector3(0.92, 0.72, 0.2), 0.5],
        [new QuarksVector3(0.4, 0.26, 0.08), 1],
      ], [
        [1, 0],
        [0.85, 0.5],
        [0, 1],
      ])),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -5.2, 0), new ConstantValue(1)),
      createTurbulence(0.8),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function disposeMuralhaParticleMaterials(
  materials: MuralhaParticleMaterials,
): void {
  materials.dust.dispose();
  materials.joint.dispose();
  materials.spark.dispose();
}

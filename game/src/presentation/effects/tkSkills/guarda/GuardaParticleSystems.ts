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
  createFlameAnimation,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";
import type { GuardaTextureSet } from "./GuardaTextures";

export interface GuardaParticleMaterials {
  spark: MeshBasicMaterial;
  mote: MeshBasicMaterial;
  flash: MeshBasicMaterial;
}

export interface GuardaParticleConfig {
  sparkCount: number;
  flashCount: number;
  moteRate: number;
}

export function createGuardaParticleMaterials(
  textures: GuardaTextureSet,
  flameTexture: Texture,
): GuardaParticleMaterials {
  return {
    spark: createAdditiveMaterial(textures.spark),
    mote: createAdditiveMaterial(textures.glow),
    flash: createAdditiveMaterial(flameTexture),
  };
}

export function createGuardaWaveSparks(
  materials: GuardaParticleMaterials,
  config: GuardaParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.05,
    looping: false,
    startLife: new IntervalValue(0.12, 0.38),
    startSpeed: new IntervalValue(1.8, 5.6),
    startSize: new IntervalValue(0.02, 0.05),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.86, 0.5, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.sparkCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 0.24, thickness: 0.5 }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(new Gradient([
        [new QuarksVector3(1, 0.88, 0.52), 0],
        [new QuarksVector3(0.92, 0.56, 0.2), 0.34],
        [new QuarksVector3(0.72, 0.2, 0.18), 0.7],
        [new QuarksVector3(0.2, 0.05, 0.04), 1],
      ], [
        [1, 0],
        [0.9, 0.4],
        [0, 1],
      ])),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -4.2, 0), new ConstantValue(1)),
      createTurbulence(1.1),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createGuardaFlash(
  materials: GuardaParticleMaterials,
  config: GuardaParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.08,
    looping: false,
    startLife: new IntervalValue(0.1, 0.26),
    startSpeed: new IntervalValue(0.4, 1.6),
    startSize: new IntervalValue(0.3, 0.66),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.86, 0.6, 0.8)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.flashCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 0.3, thickness: 0.6 }),
    material: materials.flash,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      createTurbulence(0.5),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createGuardaAuraMotes(
  materials: GuardaParticleMaterials,
  config: GuardaParticleConfig,
  duration: number,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration,
    looping: false,
    startLife: new IntervalValue(0.4, 0.9),
    startSpeed: new IntervalValue(0.12, 0.4),
    startSize: new IntervalValue(0.03, 0.075),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.82, 0.45, 0.55)),
    emissionOverTime: new ConstantValue(config.moteRate),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [],
    shape: new SphereEmitter({ radius: 1.0, thickness: 0.4 }),
    material: materials.mote,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.5, 0), new ConstantValue(1)),
      createTurbulence(0.3),
    ],
  });
  system.emitter.scale.set(1, 0.18, 1);
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function disposeGuardaParticleMaterials(
  materials: GuardaParticleMaterials,
): void {
  materials.spark.dispose();
  materials.mote.dispose();
  materials.flash.dispose();
}

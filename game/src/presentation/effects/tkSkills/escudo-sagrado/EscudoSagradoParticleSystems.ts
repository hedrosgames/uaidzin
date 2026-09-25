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
import type { EscudoSagradoTextureSet } from "./EscudoSagradoTextures";

export interface EscudoSagradoParticleMaterials {
  spark: MeshBasicMaterial;
  mote: MeshBasicMaterial;
  flash: MeshBasicMaterial;
}

export interface EscudoSagradoParticleConfig {
  flashCount: number;
  impactSparkCount: number;
  moteRate: number;
}

export function createEscudoSagradoParticleMaterials(
  textures: EscudoSagradoTextureSet,
  flameTexture: Texture,
): EscudoSagradoParticleMaterials {
  return {
    spark: createAdditiveMaterial(textures.spark),
    mote: createAdditiveMaterial(textures.glow),
    flash: createAdditiveMaterial(flameTexture),
  };
}

export function createEscudoSagradoFlash(
  materials: EscudoSagradoParticleMaterials,
  config: EscudoSagradoParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.08,
    looping: false,
    startLife: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(0.6, 2.0),
    startSize: new IntervalValue(0.28, 0.62),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.9, 0.62, 0.85)),
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

export function createEscudoSagradoImpactSparks(
  materials: EscudoSagradoParticleMaterials,
  config: EscudoSagradoParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.05,
    looping: false,
    startLife: new IntervalValue(0.1, 0.3),
    startSpeed: new IntervalValue(2.2, 6.6),
    startSize: new IntervalValue(0.02, 0.05),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.84, 0.46, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.impactSparkCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 0.26, thickness: 0.5 }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(new Gradient([
        [new QuarksVector3(1, 0.94, 0.62), 0],
        [new QuarksVector3(1, 0.7, 0.2), 0.42],
        [new QuarksVector3(0.6, 0.24, 0.05), 1],
      ], [
        [1, 0],
        [0.9, 0.4],
        [0, 1],
      ])),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -3.8, 0), new ConstantValue(1)),
      createTurbulence(1.0),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createEscudoSagradoMotes(
  materials: EscudoSagradoParticleMaterials,
  config: EscudoSagradoParticleConfig,
  duration: number,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration,
    looping: false,
    startLife: new IntervalValue(0.35, 0.85),
    startSpeed: new IntervalValue(0.15, 0.5),
    startSize: new IntervalValue(0.035, 0.08),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.55, 0.7)),
    emissionOverTime: new ConstantValue(config.moteRate),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [],
    shape: new SphereEmitter({ radius: 1.0, thickness: 0.28 }),
    material: materials.mote,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.6, 0), new ConstantValue(1)),
      createTurbulence(0.35),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function disposeEscudoSagradoParticleMaterials(
  materials: EscudoSagradoParticleMaterials,
): void {
  materials.spark.dispose();
  materials.mote.dispose();
  materials.flash.dispose();
}

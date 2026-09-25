import { MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  IntervalValue,
  ParticleSystem,
  RenderMode,
  SphereEmitter,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import {
  createAdditiveMaterial,
  createFireGradient,
  createFlameAnimation,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";
import type { GolpeTextureSet } from "./GolpeTextures";

export interface GolpeParticleMaterials {
  spark: MeshBasicMaterial;
  flame: MeshBasicMaterial;
}

export interface GolpeParticleConfig {
  slashSparkCount: number;
  groundSparkCount: number;
  emberCount: number;
}

export function createGolpeParticleMaterials(
  textures: GolpeTextureSet,
  flameTexture: Texture,
): GolpeParticleMaterials {
  return {
    spark: createAdditiveMaterial(textures.spark),
    flame: createAdditiveMaterial(flameTexture),
  };
}

export function createGolpeSlashSparks(
  materials: GolpeParticleMaterials,
  config: GolpeParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.05,
    looping: false,
    startLife: new IntervalValue(0.1, 0.26),
    startSpeed: new IntervalValue(2.4, 6.4),
    startSize: new IntervalValue(0.02, 0.05),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.78, 0.38, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.slashSparkCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 0.85, thickness: 0.9 }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createFireGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -4.6, 0), new ConstantValue(1)),
      createTurbulence(1.1),
    ],
  });
  system.pause();
  return system;
}

export function createGolpeImpactSparks(
  materials: GolpeParticleMaterials,
  config: GolpeParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.05,
    looping: false,
    startLife: new IntervalValue(0.08, 0.28),
    startSpeed: new IntervalValue(2.0, 7.0),
    startSize: new IntervalValue(0.018, 0.046),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.86, 0.5, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.groundSparkCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 0.3, thickness: 0.5 }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createFireGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -3.4, 0), new ConstantValue(1)),
      createTurbulence(0.9),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createGolpeEmberPuff(
  materials: GolpeParticleMaterials,
  config: GolpeParticleConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(0.8, 2.2),
    startSize: new IntervalValue(0.3, 0.6),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.86, 0.6, 0.85)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.emberCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new ConeEmitter({
      radius: 0.3,
      thickness: 0.7,
      angle: 0.34,
    }),
    material: materials.flame,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      createTurbulence(0.6),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function disposeGolpeParticleMaterials(
  materials: GolpeParticleMaterials,
): void {
  materials.spark.dispose();
  materials.flame.dispose();
}

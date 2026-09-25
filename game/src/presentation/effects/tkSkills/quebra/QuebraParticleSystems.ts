import { MeshBasicMaterial } from "three";
import {
  ApplyForce,
  ColorOverLife,
  ConstantColor,
  ConstantValue,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  RenderMode,
  SphereEmitter,
  SizeOverLife,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
  Bezier,
} from "three.quarks";
import {
  createAdditiveMaterial,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";
import type { QuebraTextureSet } from "./QuebraTextures";

export interface QuebraParticleMaterials {
  spark: MeshBasicMaterial;
  mote: MeshBasicMaterial;
}

export interface QuebraImpactSystems {
  sparks: ParticleSystem;
  motes: ParticleSystem;
  all: ParticleSystem[];
}

export interface QuebraParticleConfig {
  sparkEmission: number;
  moteEmission: number;
}

function createMetalGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.98, 0.92), 0],
      [new QuarksVector3(1, 0.87, 0.5), 0.3],
      [new QuarksVector3(0.83, 0.63, 0.09), 0.68],
      [new QuarksVector3(0.2, 0.14, 0.08), 1],
    ],
    [
      [1, 0],
      [0.9, 0.4],
      [0.4, 0.78],
      [0, 1],
    ],
  );
}

export function createQuebraParticleMaterials(
  textures: QuebraTextureSet,
): QuebraParticleMaterials {
  return {
    spark: createAdditiveMaterial(textures.spark),
    mote: createAdditiveMaterial(textures.shard),
  };
}

export function createQuebraImpactSystems(
  materials: QuebraParticleMaterials,
  config: QuebraParticleConfig,
): QuebraImpactSystems {
  const sparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.08,
    looping: false,
    startLife: new IntervalValue(0.12, 0.4),
    startSpeed: new IntervalValue(3.8, 9.2),
    startSize: new IntervalValue(0.03, 0.07),
    startColor: new ConstantColor(new QuarksVector4(1, 0.92, 0.7, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.sparkEmission), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.14,
      thickness: 0.14,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createMetalGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -8.4, 0), new ConstantValue(1)),
      createTurbulence(1.35),
    ],
  });

  const motes = new ParticleSystem({
    autoDestroy: false,
    duration: 0.08,
    looping: false,
    startLife: new IntervalValue(0.14, 0.34),
    startSpeed: new IntervalValue(2.2, 5.4),
    startSize: new IntervalValue(0.16, 0.4),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.86, 0.58, 0.88)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.moteEmission), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.2,
      thickness: 0.2,
    }),
    material: materials.mote,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createMetalGradient()),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.9, 1.05, 0.5, 0), 0]])),
      new ApplyForce(new QuarksVector3(0, -6.2, 0), new ConstantValue(1)),
      createTurbulence(0.85),
    ],
  });

  sparks.pause();
  motes.pause();
  sparks.emitter.visible = false;
  motes.emitter.visible = false;

  return {
    sparks,
    motes,
    all: [sparks, motes],
  };
}

export function disposeQuebraParticleMaterials(
  materials: QuebraParticleMaterials,
): void {
  materials.spark.dispose();
  materials.mote.dispose();
}

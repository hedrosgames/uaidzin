import { MeshBasicMaterial, NormalBlending } from "three";
import {
  ApplyForce,
  ColorOverLife,
  ConstantColor,
  ConstantValue,
  DonutEmitter,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  RenderMode,
  SizeOverLife,
  SphereEmitter,
  Bezier,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import {
  createAdditiveMaterial,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";
import type { RugidoTextureSet } from "./RugidoTextures";

export interface RugidoParticleMaterials {
  streak: MeshBasicMaterial;
  dust: MeshBasicMaterial;
  ember: MeshBasicMaterial;
}

export interface RugidoEmissionSystems {
  streaks: ParticleSystem;
  dust: ParticleSystem;
  embers: ParticleSystem;
  all: ParticleSystem[];
}

export interface RugidoParticleConfig {
  streakEmission: number;
  dustEmission: number;
  emberCount: number;
}

function createRoarGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.96, 0.86), 0],
      [new QuarksVector3(1, 0.84, 0.48), 0.3],
      [new QuarksVector3(0.82, 0.38, 0.18), 0.66],
      [new QuarksVector3(0.36, 0.12, 0.06), 1],
    ],
    [
      [1, 0],
      [0.92, 0.34],
      [0.5, 0.72],
      [0, 1],
    ],
  );
}

function createEmberGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.66, 0.44), 0],
      [new QuarksVector3(0.88, 0.32, 0.18), 0.5],
      [new QuarksVector3(0.32, 0.09, 0.05), 1],
    ],
    [
      [1, 0],
      [0.85, 0.45],
      [0, 1],
    ],
  );
}

function createDustGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(0.86, 0.76, 0.6), 0],
      [new QuarksVector3(0.64, 0.55, 0.42), 0.55],
      [new QuarksVector3(0.3, 0.25, 0.18), 1],
    ],
    [
      [0.62, 0],
      [0.38, 0.5],
      [0, 1],
    ],
  );
}

export function createRugidoParticleMaterials(
  textures: RugidoTextureSet,
): RugidoParticleMaterials {
  return {
    streak: createAdditiveMaterial(textures.streak),
    dust: new MeshBasicMaterial({
      map: textures.puff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthTest: true,
      side: 2,
      blending: NormalBlending,
      toneMapped: false,
    }),
    ember: createAdditiveMaterial(textures.ember),
  };
}

export function createRugidoEmissionSystems(
  materials: RugidoParticleMaterials,
  config: RugidoParticleConfig,
): RugidoEmissionSystems {
  const streaks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.3,
    looping: false,
    startLife: new IntervalValue(0.28, 0.5),
    startSpeed: new IntervalValue(6.4, 10.6),
    startSize: new IntervalValue(0.5, 0.95),
    startColor: new ConstantColor(new QuarksVector4(1, 0.93, 0.74, 0.95)),
    emissionOverTime: new ConstantValue(config.streakEmission),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [],
    shape: new DonutEmitter({
      radius: 0.14,
      donutRadius: 0.09,
      thickness: 1,
      arc: Math.PI * 2,
    }),
    material: materials.streak,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 3.6,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createRoarGradient()),
      new ApplyForce(new QuarksVector3(0, -3.4, 0), new ConstantValue(1)),
      createTurbulence(0.9),
    ],
  });

  const dust = new ParticleSystem({
    autoDestroy: false,
    duration: 0.4,
    looping: false,
    startLife: new IntervalValue(0.26, 0.55),
    startSpeed: new IntervalValue(0.9, 2.3),
    startSize: new IntervalValue(0.34, 0.72),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.76, 0.6, 0.6)),
    emissionOverTime: new ConstantValue(config.dustEmission),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [],
    shape: new SphereEmitter({
      radius: 0.95,
      thickness: 1,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createDustGradient()),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.7, 1.15, 1.3, 0.9), 0]])),
      new ApplyForce(new QuarksVector3(0, 1.7, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });

  const embers = new ParticleSystem({
    autoDestroy: false,
    duration: 0.08,
    looping: false,
    startLife: new IntervalValue(0.14, 0.38),
    startSpeed: new IntervalValue(2.4, 5.6),
    startSize: new IntervalValue(0.05, 0.11),
    startColor: new ConstantColor(new QuarksVector4(1, 0.62, 0.42, 0.95)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.emberCount), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.18,
      thickness: 0.18,
    }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createEmberGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -7.2, 0), new ConstantValue(1)),
      createTurbulence(1.2),
    ],
  });

  for (const system of [streaks, dust, embers]) {
    system.pause();
    system.emitter.visible = false;
  }

  return {
    streaks,
    dust,
    embers,
    all: [streaks, dust, embers],
  };
}

export function disposeRugidoParticleMaterials(
  materials: RugidoParticleMaterials,
): void {
  materials.streak.dispose();
  materials.dust.dispose();
  materials.ember.dispose();
}

import { MeshBasicMaterial } from "three";
import {
  ApplyForce,
  Bezier,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  RenderMode,
  SizeOverLife,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import { createAdditiveMaterial, createTurbulence } from "../../vfxKit/quarkFx";
import type { PurificarTextureSet } from "./PurificarTextures";

export interface PurificarParticleMaterials {
  mote: MeshBasicMaterial;
  vapor: MeshBasicMaterial;
}

export interface PurificarAscendSystems {
  vapor: ParticleSystem;
  wisps: ParticleSystem;
  all: ParticleSystem[];
}

function createLightGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.98, 0.92), 0],
      [new QuarksVector3(1, 0.93, 0.74), 0.34],
      [new QuarksVector3(0.83, 0.63, 0.09), 0.7],
      [new QuarksVector3(0.12, 0.09, 0.04), 1],
    ],
    [
      [1, 0],
      [0.92, 0.36],
      [0.5, 0.74],
      [0, 1],
    ],
  );
}

export function createPurificarParticleMaterials(
  textures: PurificarTextureSet,
): PurificarParticleMaterials {
  return {
    mote: createAdditiveMaterial(textures.mote),
    vapor: createAdditiveMaterial(textures.halo),
  };
}

export function createPurificarAscendSystems(
  materials: PurificarParticleMaterials,
): PurificarAscendSystems {
  const vapor = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.5, 0.85),
    startSpeed: new IntervalValue(1.4, 2.6),
    startSize: new IntervalValue(0.28, 0.5),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.95, 0.82, 0.85)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(26), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({
      radius: 0.22,
      thickness: 0.8,
      angle: 0.28,
    }),
    material: materials.vapor,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ColorOverLife(createLightGradient()),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.6, 0.85, 1.15, 1.4), 0]])),
      new ApplyForce(new QuarksVector3(0, 1.1, 0), new ConstantValue(1)),
      createTurbulence(0.32),
    ],
  });

  const wisps = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.6, 1.0),
    startSpeed: new IntervalValue(0.9, 1.7),
    startSize: new IntervalValue(0.5, 0.9),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.92, 0.72, 0.6)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(12), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({
      radius: 0.3,
      thickness: 0.9,
      angle: 0.36,
    }),
    material: materials.vapor,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createLightGradient()),
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.5, 0.8, 1.1, 1.35), 0]])),
      new ApplyForce(new QuarksVector3(0, 0.7, 0), new ConstantValue(1)),
      createTurbulence(0.24),
    ],
  });

  vapor.pause();
  wisps.pause();
  vapor.emitter.visible = false;
  wisps.emitter.visible = false;

  return { vapor, wisps, all: [vapor, wisps] };
}

export function disposePurificarParticleMaterials(
  materials: PurificarParticleMaterials,
): void {
  materials.mote.dispose();
  materials.vapor.dispose();
}

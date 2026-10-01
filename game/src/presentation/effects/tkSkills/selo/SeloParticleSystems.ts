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
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface SeloParticleMaterials {
  dust: MeshBasicMaterial;
  glyph: MeshBasicMaterial;
}

export interface SeloAmbientSystems {
  dust: ParticleSystem;
  motes: ParticleSystem;
  all: ParticleSystem[];
}

export interface SeloBurstSystems {
  burst: ParticleSystem;
  all: ParticleSystem[];
}

export interface SeloParticleConfig {
  dustEmission: number;
  moteEmission: number;
  burstCount: number;
  innerRadius: number;
  outerRadius: number;
}

function createSeloGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.82, 1), 0],
      [new QuarksVector3(0.78, 0.36, 1), 0.34],
      [new QuarksVector3(0.48, 0.12, 0.82), 0.7],
      [new QuarksVector3(0.12, 0.02, 0.24), 1],
    ],
    [
      [0.9, 0],
      [0.82, 0.4],
      [0.4, 0.76],
      [0, 1],
    ],
  );
}

export function createSeloParticleMaterials(
  textures: { dust: Texture; glyph: Texture },
): SeloParticleMaterials {
  return {
    dust: createAdditiveMaterial(textures.dust),
    glyph: createAdditiveMaterial(textures.glyph),
  };
}

export function createSeloAmbientSystems(
  materials: SeloParticleMaterials,
  config: SeloParticleConfig,
): SeloAmbientSystems {
  const dust = new ParticleSystem({
    autoDestroy: false,
    duration: 2,
    looping: true,
    startLife: new IntervalValue(0.9, 1.9),
    startSpeed: new IntervalValue(0.18, 0.6),
    startSize: new IntervalValue(0.1, 0.26),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.92, 0.58, 1, 0.75)),
    emissionOverTime: new ConstantValue(config.dustEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({
      radius: config.outerRadius * 0.96,
      thickness: 0.75,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createSeloGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.35, 0), new ConstantValue(1)),
      createTurbulence(0.34),
    ],
  });

  const motes = new ParticleSystem({
    autoDestroy: false,
    duration: 2,
    looping: true,
    startLife: new IntervalValue(0.8, 1.6),
    startSpeed: new IntervalValue(0.1, 0.34),
    startSize: new IntervalValue(0.16, 0.3),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.72, 1, 0.94)),
    emissionOverTime: new ConstantValue(config.moteEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({
      radius: config.innerRadius,
      thickness: 0.12,
    }),
    material: materials.glyph,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.85, 0), new ConstantValue(1)),
      createTurbulence(0.2),
    ],
  });

  for (const system of [dust, motes]) {
    system.pause();
    system.emitter.visible = false;
  }

  return { dust, motes, all: [dust, motes] };
}

export function createSeloBurstSystems(
  materials: SeloParticleMaterials,
  config: SeloParticleConfig,
): SeloBurstSystems {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.2, 0.52),
    startSpeed: new IntervalValue(2.2, 5.4),
    startSize: new IntervalValue(0.24, 0.58),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.48, 1, 0.94)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.burstCount), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.2,
      thickness: 0.2,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createSeloGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -1.8, 0), new ConstantValue(1)),
      createTurbulence(0.62),
    ],
  });

  const ringSparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.2, 0.44),
    startSpeed: new IntervalValue(3.1, 6.2),
    startSize: new IntervalValue(0.1, 0.22),
    startColor: new ConstantColor(new QuarksVector4(0.7, 0.28, 1, 0.92)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(Math.floor(config.burstCount * 0.6)), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.14,
      thickness: 0.14,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.8, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });

  for (const system of [burst, ringSparks]) {
    system.pause();
    system.emitter.visible = false;
  }

  return { burst, all: [burst, ringSparks] };
}

export function disposeSeloParticleMaterials(
  materials: SeloParticleMaterials,
): void {
  materials.dust.dispose();
  materials.glyph.dispose();
}

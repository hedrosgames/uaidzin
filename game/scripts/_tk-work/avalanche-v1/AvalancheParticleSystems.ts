import { DoubleSide, MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
  Bezier,
  ColorOverLife,
  ConstantColor,
  ConstantValue,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  PointEmitter,
  RenderMode,
  SizeOverLife,
  SphereEmitter,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import { createTurbulence } from "../../vfxKit/quarkFx";

export interface AvalancheParticleMaterials {
  dust: MeshBasicMaterial;
  debris: MeshBasicMaterial;
}

export interface AvalanchePointSystems {
  burst: ParticleSystem;
  puff: ParticleSystem;
  all: ParticleSystem[];
}

export interface AvalancheEmissionConfig {
  waveDuration: number;
  dustEmission: number;
  debrisPerPoint: number;
}

const DUST_TINT = new QuarksVector3(0.82, 0.72, 0.56);

function createGrow(): SizeOverLife {
  return new SizeOverLife(
    new PiecewiseBezier([[new Bezier(0.62, 0.95, 1.28, 1.55), 0]]),
  );
}

function createDustFade(): ColorOverLife {
  return new ColorOverLife(
    new Gradient(
      [
        [DUST_TINT.clone(), 0],
        [DUST_TINT.clone(), 1],
      ],
      [
        [0.78, 0],
        [0.42, 0.55],
        [0, 1],
      ],
    ),
  );
}

export function createAvalancheParticleMaterials(
  textures: { dust: Texture; debris: Texture },
): AvalancheParticleMaterials {
  return {
    dust: new MeshBasicMaterial({
      map: textures.dust,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      toneMapped: false,
    }),
    debris: new MeshBasicMaterial({
      map: textures.debris,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      alphaTest: 0.02,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      toneMapped: false,
    }),
  };
}

export function createAvalancheWaveSystem(
  materials: AvalancheParticleMaterials,
  config: AvalancheEmissionConfig,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: config.waveDuration + 0.1,
    looping: false,
    startLife: new IntervalValue(0.35, 0.8),
    startSpeed: new IntervalValue(0.3, 1.2),
    startSize: new IntervalValue(0.5, 1.1),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 1, 1, 0.72)),
    emissionOverTime: new ConstantValue(config.dustEmission),
    emissionOverDistance: new ConstantValue(6),
    shape: new PointEmitter(),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createGrow(),
      createDustFade(),
      new ApplyForce(new QuarksVector3(0, 1.1, 0), new ConstantValue(1)),
      createTurbulence(0.55),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function createAvalancheImpactSystems(
  materials: AvalancheParticleMaterials,
  config: AvalancheEmissionConfig,
): AvalanchePointSystems {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.5, 0.95),
    startSpeed: new IntervalValue(2.4, 5.4),
    startSize: new IntervalValue(0.09, 0.22),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 1, 1, 1)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.debrisPerPoint), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.2,
      thickness: 0.2,
    }),
    material: materials.debris,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      new ApplyForce(new QuarksVector3(0, -9.5, 0), new ConstantValue(1)),
      createTurbulence(0.4),
    ],
  });

  const puff = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.6, 1.1),
    startSpeed: new IntervalValue(0.6, 1.7),
    startSize: new IntervalValue(0.7, 1.3),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 1, 1, 0.66)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(12), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.32,
      thickness: 0.32,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createGrow(),
      createDustFade(),
      new ApplyForce(new QuarksVector3(0, 0.9, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });

  burst.pause();
  puff.pause();
  burst.emitter.visible = false;
  puff.emitter.visible = false;

  return { burst, puff, all: [burst, puff] };
}

export function createAvalancheLingerSystem(
  materials: AvalancheParticleMaterials,
): ParticleSystem {
  const system = new ParticleSystem({
    autoDestroy: false,
    duration: 0.1,
    looping: false,
    startLife: new IntervalValue(0.9, 1.5),
    startSpeed: new IntervalValue(0.3, 1),
    startSize: new IntervalValue(0.9, 1.7),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 1, 1, 0.5)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(24), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 1.4,
      thickness: 1.2,
    }),
    material: materials.dust,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 7,
    behaviors: [
      createGrow(),
      createDustFade(),
      new ApplyForce(new QuarksVector3(0, 0.55, 0), new ConstantValue(1)),
      createTurbulence(0.35),
    ],
  });
  system.pause();
  system.emitter.visible = false;
  return system;
}

export function disposeAvalancheParticleMaterials(
  materials: AvalancheParticleMaterials,
): void {
  materials.dust.dispose();
  materials.debris.dispose();
}

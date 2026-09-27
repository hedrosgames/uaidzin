import { AdditiveBlending, DoubleSide, MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
  CircleEmitter,
  ColorOverLife,
  ConeEmitter,
  ConstantColor,
  ConstantValue,
  Gradient,
  IntervalValue,
  OrbitOverLife,
  ParticleSystem,
  PointEmitter,
  RenderMode,
  SphereEmitter,
  Vector3 as QuarksVector3,
  Vector4 as QuarksVector4,
} from "three.quarks";
import {
  createFlameAnimation,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface EsferaIgneaParticleMaterials {
  flame: MeshBasicMaterial;
  ember: MeshBasicMaterial;
  plume: MeshBasicMaterial;
}

export interface EsferaIgneaFlightSystems {
  envelope: ParticleSystem;
  embers: ParticleSystem;
  orbiters: ParticleSystem;
  wake: ParticleSystem;
  all: ParticleSystem[];
}

export interface EsferaIgneaImpactSystems {
  burst: ParticleSystem;
  plume: ParticleSystem;
  all: ParticleSystem[];
}

export interface EsferaIgneaChargeSystems {
  motes: ParticleSystem;
  all: ParticleSystem[];
}

export interface EsferaIgneaParticleConfig {
  envelopeEmission: number;
  emberEmission: number;
  impactBurstCount: number;
}

export function createEsferaIgneaParticleMaterials(
  flameTexture: Texture,
  emberTexture: Texture,
): EsferaIgneaParticleMaterials {
  const create = (map: Texture, opacity: number): MeshBasicMaterial =>
    new MeshBasicMaterial({
      map,
      color: 0xffffff,
      transparent: true,
      opacity,
      alphaTest: 0.01,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
  return {
    flame: create(flameTexture, 0.8),
    ember: create(emberTexture, 0.95),
    plume: create(flameTexture, 0.7),
  };
}

function createFireballGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.98, 0.84), 0],
      [new QuarksVector3(1, 0.72, 0.18), 0.34],
      [new QuarksVector3(0.94, 0.26, 0.05), 0.72],
      [new QuarksVector3(0.24, 0.04, 0.01), 1],
    ],
    [
      [1, 0],
      [0.96, 0.32],
      [0.52, 0.74],
      [0, 1],
    ],
  );
}

export function createEsferaIgneaChargeSystems(
  materials: EsferaIgneaParticleMaterials,
): EsferaIgneaChargeSystems {
  const motes = new ParticleSystem({
    autoDestroy: false,
    duration: 0.4,
    looping: false,
    startLife: new IntervalValue(0.14, 0.3),
    startSpeed: new IntervalValue(0.5, 1.5),
    startSize: new IntervalValue(0.05, 0.13),
    startColor: new ConstantColor(new QuarksVector4(1, 0.72, 0.24, 0.92)),
    emissionOverTime: new ConstantValue(54),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({ radius: 0.3, thickness: 0.5 }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createFireballGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.4, 0), new ConstantValue(1)),
      createTurbulence(0.6),
    ],
  });
  return { motes, all: [motes] };
}

export function createEsferaIgneaFlightSystems(
  materials: EsferaIgneaParticleMaterials,
  config: EsferaIgneaParticleConfig,
): EsferaIgneaFlightSystems {
  const envelope = new ParticleSystem({
    autoDestroy: false,
    duration: 1.4,
    looping: false,
    startLife: new IntervalValue(0.24, 0.5),
    startSpeed: new IntervalValue(0.1, 0.8),
    startSize: new IntervalValue(0.62, 1.15),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.86, 0.6, 0.9)),
    emissionOverTime: new ConstantValue(config.envelopeEmission),
    emissionOverDistance: new ConstantValue(4),
    shape: new SphereEmitter({ radius: 0.3, thickness: 0.42 }),
    material: materials.flame,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.3, 0), new ConstantValue(1)),
      createTurbulence(0.3),
    ],
  });

  const embers = new ParticleSystem({
    autoDestroy: false,
    duration: 1.4,
    looping: false,
    startLife: new IntervalValue(0.18, 0.44),
    startSpeed: new IntervalValue(1.2, 3.8),
    startSize: new IntervalValue(0.05, 0.12),
    startColor: new ConstantColor(new QuarksVector4(1, 0.78, 0.28, 0.98)),
    emissionOverTime: new ConstantValue(config.emberEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new CircleEmitter({ radius: 0.24, thickness: 0.4 }),
    material: materials.ember,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.12,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createFireballGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -1.4, 0), new ConstantValue(1)),
      createTurbulence(1.05),
    ],
  });

  const orbiters = new ParticleSystem({
    autoDestroy: false,
    duration: 1.4,
    looping: false,
    startLife: new IntervalValue(0.3, 0.62),
    startSpeed: new IntervalValue(0.05, 0.4),
    startSize: new IntervalValue(0.16, 0.34),
    startColor: new ConstantColor(new QuarksVector4(1, 0.62, 0.2, 0.9)),
    emissionOverTime: new ConstantValue(34),
    emissionOverDistance: new ConstantValue(0),
    shape: new CircleEmitter({ radius: 0.42, thickness: 0.9 }),
    material: materials.ember,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createFireballGradient()),
      createShrink(1),
      new OrbitOverLife(new IntervalValue(3.4, 6.2), new QuarksVector3(0.3, 1, 0.5)),
      createTurbulence(0.18),
    ],
  });

  const wake = new ParticleSystem({
    autoDestroy: false,
    duration: 1.4,
    looping: false,
    startLife: new IntervalValue(0.16, 0.38),
    startSpeed: new IntervalValue(0.1, 0.6),
    startSize: new IntervalValue(0.3, 0.62),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.62, 0.26, 0.4)),
    emissionOverTime: new ConstantValue(34),
    emissionOverDistance: new ConstantValue(0),
    shape: new PointEmitter(),
    material: materials.plume,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.9, 0), new ConstantValue(1)),
      createTurbulence(0.26),
    ],
  });

  envelope.pause();
  embers.pause();
  orbiters.pause();
  wake.pause();
  envelope.emitter.visible = false;
  embers.emitter.visible = false;
  orbiters.emitter.visible = false;
  wake.emitter.visible = false;

  return { envelope, embers, orbiters, wake, all: [envelope, embers, orbiters, wake] };
}

export function createEsferaIgneaImpactSystems(
  materials: EsferaIgneaParticleMaterials,
  config: EsferaIgneaParticleConfig,
): EsferaIgneaImpactSystems {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.18, 0.44),
    startSpeed: new IntervalValue(3, 6.8),
    startSize: new IntervalValue(0.34, 0.78),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.94, 0.76, 0.86)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.impactBurstCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 0.2, thickness: 0.2 }),
    material: materials.flame,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 11,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.4, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });

  const plume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.2, 0.44),
    startSpeed: new IntervalValue(1.1, 2.9),
    startSize: new IntervalValue(0.5, 1.0),
    startColor: new ConstantColor(new QuarksVector4(1, 0.62, 0.28, 0.5)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(16), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({ radius: 0.26, thickness: 0.7, angle: 0.38 }),
    material: materials.plume,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 11,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      createTurbulence(0.66),
    ],
  });

  burst.pause();
  plume.pause();
  burst.emitter.visible = false;
  plume.emitter.visible = false;

  return { burst, plume, all: [burst, plume] };
}

export function disposeEsferaIgneaParticleMaterials(
  materials: EsferaIgneaParticleMaterials,
): void {
  materials.flame.dispose();
  materials.ember.dispose();
  materials.plume.dispose();
}

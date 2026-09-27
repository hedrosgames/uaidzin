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

export interface LancaGlacialParticleMaterials {
  frost: MeshBasicMaterial;
  glint: MeshBasicMaterial;
  mist: MeshBasicMaterial;
}

export interface LancaGlacialChargeSystems {
  crystals: ParticleSystem;
  all: ParticleSystem[];
}

export interface LancaGlacialFlightSystems {
  mantle: ParticleSystem;
  glints: ParticleSystem;
  orbiters: ParticleSystem;
  wake: ParticleSystem;
  all: ParticleSystem[];
}

export interface LancaGlacialImpactSystems {
  shatter: ParticleSystem;
  vapour: ParticleSystem;
  all: ParticleSystem[];
}

export interface LancaGlacialParticleConfig {
  mantleEmission: number;
  glintEmission: number;
  shatterCount: number;
}

export function createLancaGlacialParticleMaterials(
  frostTexture: Texture,
  glintTexture: Texture,
): LancaGlacialParticleMaterials {
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
    frost: create(frostTexture, 0.5),
    glint: create(glintTexture, 0.78),
    mist: create(frostTexture, 0.34),
  };
}

function createGlacierGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 1, 1), 0],
      [new QuarksVector3(0.78, 0.92, 1), 0.32],
      [new QuarksVector3(0.36, 0.62, 0.78), 0.7],
      [new QuarksVector3(0.1, 0.2, 0.28), 1],
    ],
    [
      [1, 0],
      [0.92, 0.3],
      [0.42, 0.72],
      [0, 1],
    ],
  );
}

export function createLancaGlacialChargeSystems(
  materials: LancaGlacialParticleMaterials,
): LancaGlacialChargeSystems {
  const crystals = new ParticleSystem({
    autoDestroy: false,
    duration: 0.36,
    looping: false,
    startLife: new IntervalValue(0.14, 0.3),
    startSpeed: new IntervalValue(0.7, 1.9),
    startSize: new IntervalValue(0.05, 0.14),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.96, 1, 0.92)),
    emissionOverTime: new ConstantValue(58),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({ radius: 0.3, thickness: 0.5 }),
    material: materials.glint,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createGlacierGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.2, 0), new ConstantValue(1)),
      createTurbulence(0.5),
    ],
  });
  return { crystals, all: [crystals] };
}

export function createLancaGlacialFlightSystems(
  materials: LancaGlacialParticleMaterials,
  config: LancaGlacialParticleConfig,
): LancaGlacialFlightSystems {
  const mantle = new ParticleSystem({
    autoDestroy: false,
    duration: 1.2,
    looping: false,
    startLife: new IntervalValue(0.2, 0.42),
    startSpeed: new IntervalValue(0.1, 0.7),
    startSize: new IntervalValue(0.3, 0.58),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.72, 0.88, 1, 0.4)),
    emissionOverTime: new ConstantValue(config.mantleEmission),
    emissionOverDistance: new ConstantValue(2),
    shape: new SphereEmitter({ radius: 0.26, thickness: 0.45 }),
    material: materials.frost,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.7, 0), new ConstantValue(1)),
      createTurbulence(0.28),
    ],
  });

  const glints = new ParticleSystem({
    autoDestroy: false,
    duration: 1.2,
    looping: false,
    startLife: new IntervalValue(0.12, 0.3),
    startSpeed: new IntervalValue(1.6, 4.4),
    startSize: new IntervalValue(0.05, 0.13),
    startColor: new ConstantColor(new QuarksVector4(0.96, 1, 1, 0.98)),
    emissionOverTime: new ConstantValue(config.glintEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new CircleEmitter({ radius: 0.22, thickness: 0.4 }),
    material: materials.glint,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.14,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createGlacierGradient()),
      createShrink(1),
      createTurbulence(0.9),
    ],
  });

  const orbiters = new ParticleSystem({
    autoDestroy: false,
    duration: 1.2,
    looping: false,
    startLife: new IntervalValue(0.13, 0.28),
    startSpeed: new IntervalValue(0.05, 0.35),
    startSize: new IntervalValue(0.16, 0.34),
    startColor: new ConstantColor(new QuarksVector4(0.72, 0.9, 1, 0.7)),
    emissionOverTime: new ConstantValue(40),
    emissionOverDistance: new ConstantValue(0),
    shape: new CircleEmitter({ radius: 0.4, thickness: 0.9 }),
    material: materials.glint,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createGlacierGradient()),
      createShrink(1),
      new OrbitOverLife(new IntervalValue(-2.8, -5.4), new QuarksVector3(0.2, 1, -0.4)),
      createTurbulence(0.16),
    ],
  });

  const wake = new ParticleSystem({
    autoDestroy: false,
    duration: 1.2,
    looping: false,
    startLife: new IntervalValue(0.22, 0.5),
    startSpeed: new IntervalValue(0.05, 0.5),
    startSize: new IntervalValue(0.3, 0.62),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.74, 0.9, 1, 0.46)),
    emissionOverTime: new ConstantValue(52),
    emissionOverDistance: new ConstantValue(0),
    shape: new PointEmitter(),
    material: materials.mist,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 9,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.5, 0), new ConstantValue(1)),
      createTurbulence(0.22),
    ],
  });

  mantle.pause();
  glints.pause();
  orbiters.pause();
  wake.pause();
  mantle.emitter.visible = false;
  glints.emitter.visible = false;
  orbiters.emitter.visible = false;
  wake.emitter.visible = false;

  return { mantle, glints, orbiters, wake, all: [mantle, glints, orbiters, wake] };
}

export function createLancaGlacialImpactSystems(
  materials: LancaGlacialParticleMaterials,
  config: LancaGlacialParticleConfig,
): LancaGlacialImpactSystems {
  const shatter = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.2, 0.46),
    startSpeed: new IntervalValue(3.4, 7.4),
    startSize: new IntervalValue(0.14, 0.38),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.96, 1, 1, 0.94)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(config.shatterCount),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({ radius: 0.2, thickness: 0.2 }),
    material: materials.glint,
    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.16,
    worldSpace: true,
    renderOrder: 11,
    behaviors: [
      new ColorOverLife(createGlacierGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -2.8, 0), new ConstantValue(1)),
      createTurbulence(0.9),
    ],
  });

  const vapour = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.26, 0.6),
    startSpeed: new IntervalValue(0.8, 2.4),
    startSize: new IntervalValue(0.5, 1.05),
    startColor: new ConstantColor(new QuarksVector4(0.86, 0.96, 1, 0.44)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(18), cycle: 1, interval: 0, probability: 1 }],
    shape: new ConeEmitter({ radius: 0.28, thickness: 0.66, angle: 0.42 }),
    material: materials.mist,
    renderMode: RenderMode.BillBoard,
    uTileCount: 4,
    vTileCount: 4,
    blendTiles: true,
    worldSpace: true,
    renderOrder: 11,
    behaviors: [
      createFlameAnimation(),
      createShrink(1),
      createTurbulence(0.5),
    ],
  });

  shatter.pause();
  vapour.pause();
  shatter.emitter.visible = false;
  vapour.emitter.visible = false;

  return { shatter, vapour, all: [shatter, vapour] };
}

export function disposeLancaGlacialParticleMaterials(
  materials: LancaGlacialParticleMaterials,
): void {
  materials.frost.dispose();
  materials.glint.dispose();
  materials.mist.dispose();
}

import { MeshBasicMaterial, type Texture } from "three";
import {
  ApplyForce,
  ColorOverLife,
  ConeEmitter,
  Gradient,
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
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface JulgamentoParticleMaterials {
  beam: MeshBasicMaterial;
  glow: MeshBasicMaterial;
  spark: MeshBasicMaterial;
}

export interface JulgamentoImpactSystems {
  beamTrail: ParticleSystem;
  sparks: ParticleSystem;
  plume: ParticleSystem;
  all: ParticleSystem[];
}

export interface JulgamentoParticleConfig {
  fallDuration: number;
  trailEmission: number;
  sparkBurstCount: number;
  plumeBurstCount: number;
}

function createMoonGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.94, 0.78), 0],
      [new QuarksVector3(0.94, 0.75, 0.44), 0.38],
      [new QuarksVector3(0.62, 0.42, 0.2), 0.74],
      [new QuarksVector3(0.24, 0.15, 0.06), 1],
    ],
    [
      [1, 0],
      [0.88, 0.4],
      [0.42, 0.78],
      [0, 1],
    ],
  );
}

export function createJulgamentoParticleMaterials(
  textures: { beam: Texture; glow: Texture; spark: Texture },
): JulgamentoParticleMaterials {
  return {
    beam: createAdditiveMaterial(textures.beam),
    glow: createAdditiveMaterial(textures.glow),
    spark: createAdditiveMaterial(textures.spark),
  };
}

export function createJulgamentoImpactSystems(
  materials: JulgamentoParticleMaterials,
  config: JulgamentoParticleConfig,
  scale: number,
): JulgamentoImpactSystems {
  const beamTrail = new ParticleSystem({
    autoDestroy: false,
    duration: config.fallDuration,
    looping: false,
    startLife: new IntervalValue(0.14, 0.32),
    startSpeed: new IntervalValue(0.4, 1.6),
    startSize: new IntervalValue(0.2, 0.42),
    startRotation: new IntervalValue(-1.2, 1.2),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.62, 0.76)),
    emissionOverTime: new ConstantValue(config.trailEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new ConeEmitter({
      radius: 0.12,
      thickness: 0.8,
      angle: 0.12,
    }),
    material: materials.glow,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.2, 0), new ConstantValue(1)),
      createTurbulence(0.4),
    ],
  });

  const sparks = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.24, 0.6),
    startSpeed: new IntervalValue(3.4, 8.2),
    startSize: new IntervalValue(0.05, 0.15),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.93, 0.78, 0.9)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.round(config.sparkBurstCount * scale)),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: 0.16 * scale,
      thickness: 0.22,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      new ColorOverLife(createMoonGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -9.2, 0), new ConstantValue(1)),
      createTurbulence(0.7),
    ],
  });

  const plume = new ParticleSystem({
    autoDestroy: false,
    duration: 0.14,
    looping: false,
    startLife: new IntervalValue(0.22, 0.52),
    startSpeed: new IntervalValue(2.2, 5.8),
    startSize: new IntervalValue(0.26, 0.58),
    startColor: new ConstantColor(new QuarksVector4(1, 0.84, 0.52, 0.64)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.round(config.plumeBurstCount * scale)),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    shape: new ConeEmitter({
      radius: 0.3 * scale,
      thickness: 0.7,
      angle: 0.26,
    }),
    material: materials.glow,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      createTurbulence(0.8),
    ],
  });

  beamTrail.pause();
  sparks.pause();
  plume.pause();
  beamTrail.emitter.visible = false;
  sparks.emitter.visible = false;
  plume.emitter.visible = false;

  return {
    beamTrail,
    sparks,
    plume,
    all: [beamTrail, sparks, plume],
  };
}

export function disposeJulgamentoParticleMaterials(
  materials: JulgamentoParticleMaterials,
): void {
  materials.beam.dispose();
  materials.glow.dispose();
  materials.spark.dispose();
}

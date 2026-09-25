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
  type Behavior,
  type Particle,
} from "three.quarks";
import {
  createAdditiveMaterial,
  createShrink,
  createTurbulence,
} from "../../vfxKit/quarkFx";

export interface BencaoParticleMaterials {
  mote: MeshBasicMaterial;
  spark: MeshBasicMaterial;
}

export interface BencaoAuraSystems {
  motes: ParticleSystem;
  all: ParticleSystem[];
}

export interface BencaoBurstSystems {
  burst: ParticleSystem;
  all: ParticleSystem[];
}

export interface BencaoParticleConfig {
  moteEmission: number;
  burstCount: number;
  ringRadius: number;
}

class BencaoSwirl implements Behavior {
  readonly type = "BencaoSwirl";
  start = 0;
  end = 0;

  constructor(private readonly strength: number) {}

  update(particle: Particle, delta: number): void {
    const { x, z } = particle.position;
    const radius = Math.hypot(x, z);
    if (radius < 1e-4) return;
    const factor = (this.strength * delta) / radius;
    particle.velocity.x += -z * factor;
    particle.velocity.z += x * factor;
  }

  initialize(): void {}
  frameUpdate(): void {}
  reset(): void {}
  toJSON() {
    return { type: this.type };
  }
  clone(): BencaoSwirl {
    return new BencaoSwirl(this.strength);
  }
}

function createBencaoGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.96, 0.82), 0],
      [new QuarksVector3(1, 0.85, 0.42), 0.34],
      [new QuarksVector3(0.83, 0.63, 0.09), 0.7],
      [new QuarksVector3(0.3, 0.18, 0.04), 1],
    ],
    [
      [0.95, 0],
      [0.85, 0.4],
      [0.42, 0.76],
      [0, 1],
    ],
  );
}

export function createBencaoParticleMaterials(
  textures: { glow: Texture; mote: Texture },
): BencaoParticleMaterials {
  return {
    mote: createAdditiveMaterial(textures.mote),
    spark: createAdditiveMaterial(textures.glow),
  };
}

export function createBencaoAuraSystems(
  materials: BencaoParticleMaterials,
  config: BencaoParticleConfig,
): BencaoAuraSystems {
  const motes = new ParticleSystem({
    autoDestroy: false,
    duration: 2,
    looping: true,
    startLife: new IntervalValue(0.5, 0.85),
    startSpeed: new IntervalValue(0.55, 1.25),
    startSize: new IntervalValue(0.08, 0.2),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.88, 0.52, 0.86)),
    emissionOverTime: new ConstantValue(config.moteEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({
      radius: Math.max(0.12, config.ringRadius * 0.55),
      thickness: 0.9,
    }),
    material: materials.mote,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createBencaoGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 1.35, 0), new ConstantValue(1)),
      new BencaoSwirl(1.9),
      createTurbulence(0.2),
    ],
  });

  motes.pause();
  motes.emitter.visible = false;

  return { motes, all: [motes] };
}

export function createBencaoBurstSystems(
  materials: BencaoParticleMaterials,
  config: BencaoParticleConfig,
): BencaoBurstSystems {
  const burst = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.3, 0.6),
    startSpeed: new IntervalValue(1.6, 3.6),
    startSize: new IntervalValue(0.2, 0.44),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(1, 0.9, 0.58, 0.9)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(config.burstCount), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.2,
      thickness: 0.2,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.9, 0), new ConstantValue(1)),
      createTurbulence(0.4),
    ],
  });

  const ringPulse = new ParticleSystem({
    autoDestroy: false,
    duration: 0.12,
    looping: false,
    startLife: new IntervalValue(0.24, 0.44),
    startSpeed: new IntervalValue(2.8, 5.2),
    startSize: new IntervalValue(0.08, 0.16),
    startColor: new ConstantColor(new QuarksVector4(1, 0.84, 0.44, 0.88)),
    emissionOverTime: new ConstantValue(0),
    emissionOverDistance: new ConstantValue(0),
    emissionBursts: [{ time: 0, count: new ConstantValue(Math.floor(config.burstCount * 0.6)), cycle: 1, interval: 0, probability: 1 }],
    shape: new SphereEmitter({
      radius: 0.14,
      thickness: 0.14,
    }),
    material: materials.spark,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 10,
    behaviors: [
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, -0.6, 0), new ConstantValue(1)),
      createTurbulence(0.3),
    ],
  });

  burst.pause();
  ringPulse.pause();
  burst.emitter.visible = false;
  ringPulse.emitter.visible = false;

  return { burst, all: [burst, ringPulse] };
}

export function disposeBencaoParticleMaterials(
  materials: BencaoParticleMaterials,
): void {
  materials.mote.dispose();
  materials.spark.dispose();
}

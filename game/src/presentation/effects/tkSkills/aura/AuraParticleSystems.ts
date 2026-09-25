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

export interface AuraParticleMaterials {
  shimmer: MeshBasicMaterial;
}

export interface AuraShimmerSystems {
  shimmer: ParticleSystem;
  all: ParticleSystem[];
}

export interface AuraParticleConfig {
  shimmerEmission: number;
  bodyRadius: number;
}

function createAuraGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(0.98, 0.9, 0.62), 0],
      [new QuarksVector3(0.92, 0.7, 0.22), 0.42],
      [new QuarksVector3(0.68, 0.5, 0.12), 0.76],
      [new QuarksVector3(0.2, 0.15, 0.04), 1],
    ],
    [
      [0.55, 0],
      [0.48, 0.34],
      [0.26, 0.72],
      [0, 1],
    ],
  );
}

export function createAuraParticleMaterials(
  textures: { halo: Texture; mote: Texture },
): AuraParticleMaterials {
  return {
    shimmer: createAdditiveMaterial(textures.mote),
  };
}

export function createAuraShimmerSystems(
  materials: AuraParticleMaterials,
  config: AuraParticleConfig,
): AuraShimmerSystems {
  const shimmer = new ParticleSystem({
    autoDestroy: false,
    duration: 2,
    looping: true,
    startLife: new IntervalValue(1.4, 2.8),
    startSpeed: new IntervalValue(0.08, 0.28),
    startSize: new IntervalValue(0.07, 0.18),
    startRotation: new IntervalValue(-Math.PI, Math.PI),
    startColor: new ConstantColor(new QuarksVector4(0.98, 0.86, 0.5, 0.4)),
    emissionOverTime: new ConstantValue(config.shimmerEmission),
    emissionOverDistance: new ConstantValue(0),
    shape: new SphereEmitter({
      radius: Math.max(0.2, config.bodyRadius * 0.85),
      thickness: 0.55,
    }),
    material: materials.shimmer,
    renderMode: RenderMode.BillBoard,
    worldSpace: true,
    renderOrder: 8,
    behaviors: [
      new ColorOverLife(createAuraGradient()),
      createShrink(1),
      new ApplyForce(new QuarksVector3(0, 0.55, 0), new ConstantValue(1)),
      createTurbulence(0.22),
    ],
  });

  shimmer.pause();
  shimmer.emitter.visible = false;

  return { shimmer, all: [shimmer] };
}

export function disposeAuraParticleMaterials(
  materials: AuraParticleMaterials,
): void {
  materials.shimmer.dispose();
}

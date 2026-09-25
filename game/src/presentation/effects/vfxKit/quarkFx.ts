import { AdditiveBlending, DoubleSide, MeshBasicMaterial, type Texture } from "three";
import {
  Bezier,
  FrameOverLife,
  Gradient,
  PiecewiseBezier,
  SizeOverLife,
  TurbulenceField,
  Vector3 as QuarksVector3,
} from "three.quarks";

export function createAdditiveMaterial(map: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map,
    color: 0xffffff,
    transparent: true,
    opacity: 0.78,
    alphaTest: 0.01,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

export function createFireGradient(): Gradient {
  return new Gradient(
    [
      [new QuarksVector3(1, 0.949, 0.459), 0],
      [new QuarksVector3(1, 0.647, 0), 0.4],
      [new QuarksVector3(0.78, 0.16, 0.025), 0.76],
      [new QuarksVector3(0.22, 0.025, 0.008), 1],
    ],
    [
      [1, 0],
      [0.95, 0.38],
      [0.48, 0.78],
      [0, 1],
    ],
  );
}

export function createShrink(sizeAtBirth: number): SizeOverLife {
  return new SizeOverLife(
    new PiecewiseBezier([
      [new Bezier(sizeAtBirth, sizeAtBirth * 1.12, sizeAtBirth * 0.48, 0), 0],
    ]),
  );
}

export function createTurbulence(strength: number): TurbulenceField {
  return new TurbulenceField(
    new QuarksVector3(0.8, 0.8, 0.8),
    2,
    new QuarksVector3(strength, strength * 1.45, strength),
    new QuarksVector3(1.1, 1.1, 1.1),
  );
}

export function createFlameAnimation(
  frames: [number, number, number, number] = [0, 5, 10, 15],
): FrameOverLife {
  return new FrameOverLife(
    new PiecewiseBezier([[new Bezier(...frames), 0]]),
  );
}

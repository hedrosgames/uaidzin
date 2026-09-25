import { CatmullRomCurve3, Vector3 } from "three";

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

export interface HelixCurveOptions {
  samples: number;
  radiusFactor: number;
  radiusJitter: number;
  maxRadius: number;
  turns: number;
  turnsJitter: number;
  lateralFactor: number;
  verticalFactor: number;
}

export const DEFAULT_HELIX_OPTIONS: HelixCurveOptions = {
  samples: 32,
  radiusFactor: 0.2,
  radiusJitter: 0.055,
  maxRadius: 2.4,
  turns: 0.85,
  turnsJitter: 0.4,
  lateralFactor: 0.82,
  verticalFactor: 0.86,
};

export function createHelixCurve(
  origin: Vector3,
  target: Vector3,
  phase: number,
  options: Partial<HelixCurveOptions> = {},
): CatmullRomCurve3 {
  const merged = { ...DEFAULT_HELIX_OPTIONS, ...options };
  const distance = origin.distanceTo(target);
  const direction = target.clone().sub(origin);
  if (distance < 0.0001) direction.copy(FORWARD);
  else direction.divideScalar(distance);
  const side = new Vector3().crossVectors(direction, UP);
  if (side.lengthSq() < 0.001) side.set(1, 0, 0);
  side.normalize();
  const normal = new Vector3().crossVectors(side, direction).normalize();
  const radius = Math.min(
    distance * (merged.radiusFactor + Math.random() * merged.radiusJitter),
    merged.maxRadius,
  );
  const turns = merged.turns + Math.random() * merged.turnsJitter;
  const points: Vector3[] = [];
  for (let index = 0; index <= merged.samples; index += 1) {
    const t = index / merged.samples;
    const envelope = Math.sin(Math.PI * t);
    const angle = phase + t * Math.PI * 2 * turns;
    points.push(
      origin
        .clone()
        .lerp(target, t)
        .addScaledVector(side, Math.cos(angle) * radius * envelope)
        .addScaledVector(normal, Math.sin(angle) * radius * envelope * merged.lateralFactor)
        .addScaledVector(UP, radius * envelope * merged.verticalFactor),
    );
  }
  points[0].copy(origin);
  points[points.length - 1].copy(target);
  const curve = new CatmullRomCurve3(points);
  curve.arcLengthDivisions = 256;
  return curve;
}

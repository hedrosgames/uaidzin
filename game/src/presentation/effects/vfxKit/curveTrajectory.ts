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
  peak: number;
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
  peak: 0.5,
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
  const peak = Math.min(0.85, Math.max(0.15, merged.peak));
  const points: Vector3[] = [];
  for (let index = 0; index <= merged.samples; index += 1) {
    const t = index / merged.samples;
    const warped = Math.pow(t, Math.log(0.5) / Math.log(peak));
    const envelope = Math.sin(Math.PI * warped);
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

export interface ArcCurveOptions {
  samples: number;
  arc: number;
  lateral: number;
  twist: number;
  turns: number;
  minimumSpan: number;
}

export const DEFAULT_ARC_OPTIONS: ArcCurveOptions = {
  samples: 28,
  arc: 0.09,
  lateral: 0.06,
  twist: 0,
  turns: 0,
  minimumSpan: 0.6,
};

export function createArcCurve(
  origin: Vector3,
  target: Vector3,
  phase = 0,
  options: Partial<ArcCurveOptions> = {},
): CatmullRomCurve3 {
  const merged = { ...DEFAULT_ARC_OPTIONS, ...options };
  const offset = new Vector3().subVectors(target, origin);
  let distance = offset.length();
  let direction: Vector3;
  if (distance < 0.0001) {
    direction = new Vector3(FORWARD.x, FORWARD.y, FORWARD.z);
    distance = merged.minimumSpan;
  } else {
    direction = offset.clone().divideScalar(distance);
  }
  const side = new Vector3().crossVectors(direction, UP);
  if (side.lengthSq() < 0.001) side.set(1, 0, 0);
  side.normalize();
  const normal = new Vector3().crossVectors(side, direction).normalize();
  const arc = distance * merged.arc;
  const lateral = distance * merged.lateral;
  const twist = distance * merged.twist;
  const turns = merged.turns;
  const points: Vector3[] = [];
  for (let index = 0; index <= merged.samples; index += 1) {
    const t = index / merged.samples;
    const envelope = Math.sin(Math.PI * t);
    const swing = phase + t * Math.PI * 2 * turns;
    const cosSwing = Math.cos(swing);
    const sinSwing = Math.sin(swing);
    points.push(
      origin
        .clone()
        .lerp(target, t)
        .addScaledVector(normal, arc * envelope)
        .addScaledVector(side, lateral * envelope * cosSwing + twist * envelope * sinSwing),
    );
  }
  points[0].copy(origin);
  points[points.length - 1].copy(target);
  const curve = new CatmullRomCurve3(points);
  curve.arcLengthDivisions = 256;
  return curve;
}

export interface JaggedCurveOptions {
  samples: number;
  steps: number;
  stepsJitter: number;
  amplitude: number;
  amplitudeJitter: number;
  lift: number;
}

export const DEFAULT_JAGGED_OPTIONS: JaggedCurveOptions = {
  samples: 40,
  steps: 9,
  stepsJitter: 3,
  amplitude: 0.3,
  amplitudeJitter: 0.5,
  lift: 0.12,
};

export function createJaggedCurve(
  origin: Vector3,
  target: Vector3,
  phase = 0,
  options: Partial<JaggedCurveOptions> = {},
): CatmullRomCurve3 {
  const merged = { ...DEFAULT_JAGGED_OPTIONS, ...options };
  const offset = new Vector3().subVectors(target, origin);
  let distance = offset.length();
  let direction: Vector3;
  if (distance < 0.0001) {
    direction = new Vector3(FORWARD.x, FORWARD.y, FORWARD.z);
    distance = 1;
  } else {
    direction = offset.clone().divideScalar(distance);
  }
  const side = new Vector3().crossVectors(direction, UP);
  if (side.lengthSq() < 0.001) side.set(1, 0, 0);
  side.normalize();
  const normal = new Vector3().crossVectors(side, direction).normalize();
  const count = Math.max(
    1,
    Math.floor(merged.steps + (Math.random() - 0.5) * merged.stepsJitter * 2),
  );
  const lateral: number[] = [];
  const lift: number[] = [];
  let sign = phase % 2 === 0 ? 1 : -1;
  for (let index = 0; index <= count; index += 1) {
    const envelope = Math.sin(Math.PI * Math.min(index / count, 1));
    const magnitude = merged.amplitude
      + Math.random() * merged.amplitudeJitter * merged.amplitude;
    lateral.push(sign * magnitude * envelope);
    lift.push((Math.random() - 0.3) * merged.lift * distance * envelope);
    sign = -sign;
  }
  lateral[0] = 0;
  lateral[count] = 0;
  lift[0] = 0;
  lift[count] = 0;
  const points: Vector3[] = [];
  for (let index = 0; index <= merged.samples; index += 1) {
    const t = index / merged.samples;
    const scaled = t * count;
    const cell = Math.min(Math.floor(scaled), count - 1);
    const fraction = scaled - cell;
    const blend = fraction * fraction * (3 - 2 * fraction);
    const lateralValue = lateral[cell] + (lateral[cell + 1] - lateral[cell]) * blend;
    const liftValue = lift[cell] + (lift[cell + 1] - lift[cell]) * blend;
    points.push(
      origin
        .clone()
        .lerp(target, t)
        .addScaledVector(side, lateralValue)
        .addScaledVector(normal, liftValue),
    );
  }
  points[0].copy(origin);
  points[points.length - 1].copy(target);
  const curve = new CatmullRomCurve3(points);
  curve.arcLengthDivisions = 256;
  return curve;
}

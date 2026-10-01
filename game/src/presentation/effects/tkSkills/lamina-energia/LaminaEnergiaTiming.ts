import { Vector3 } from "three";

export const LAMINA_ENERGIA_TIMING = {
  releaseDuration: 3 / 60,
  speed: 28,
  minFlightDuration: 6 / 60,
  maxFlightDuration: 18 / 60,
  fadeDuration: 15 / 60,
  originHeight: 1.05,
  targetHeight: 0.95,
} as const;

export function laminaEnergiaFlightDuration(distance: number): number {
  const finiteDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  return Math.min(LAMINA_ENERGIA_TIMING.maxFlightDuration,
    Math.max(LAMINA_ENERGIA_TIMING.minFlightDuration, finiteDistance / LAMINA_ENERGIA_TIMING.speed));
}

export function laminaEnergiaEndpoints(origin: Vector3, target: Vector3, attackPoint?: Vector3) {
  return {
    origin: attackPoint?.clone() ?? origin.clone().add(new Vector3(0, LAMINA_ENERGIA_TIMING.originHeight, 0)),
    target: attackPoint ? target.clone() : target.clone().add(new Vector3(0, LAMINA_ENERGIA_TIMING.targetHeight, 0)),
  };
}

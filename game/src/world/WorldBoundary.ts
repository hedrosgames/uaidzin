export interface WorldBoundary {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function boxBoundary(size: number): WorldBoundary {
  const h = size / 2;
  return { minX: -h, maxX: h, minZ: -h, maxZ: h };
}

export function clampToBoundary(
  x: number,
  z: number,
  bounds: WorldBoundary,
  margin = 0,
): { x: number; z: number } {
  return {
    x: Math.min(Math.max(x, bounds.minX + margin), bounds.maxX - margin),
    z: Math.min(Math.max(z, bounds.minZ + margin), bounds.maxZ - margin),
  };
}

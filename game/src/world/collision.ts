export interface SolidBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SolidCircle {
  x: number;
  z: number;
  r: number;
}

export interface WorldCollision {
  boxes: SolidBox[];
  circles: SolidCircle[];
}

export function emptyCollision(): WorldCollision {
  return { boxes: [], circles: [] };
}

export function boxFromCenter(x: number, z: number, w: number, d: number): SolidBox {
  const hw = w / 2;
  const hd = d / 2;
  return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd };
}

export function circleHitsBox(x: number, z: number, r: number, box: SolidBox): boolean {
  const cx = Math.max(box.minX, Math.min(x, box.maxX));
  const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

export function circleHitsCircle(
  x: number,
  z: number,
  r: number,
  circle: SolidCircle,
): boolean {
  const dx = x - circle.x;
  const dz = z - circle.z;
  const rr = r + circle.r;
  return dx * dx + dz * dz < rr * rr;
}

export function positionBlocked(
  x: number,
  z: number,
  r: number,
  collision: WorldCollision,
): boolean {
  for (const box of collision.boxes) {
    if (circleHitsBox(x, z, r, box)) return true;
  }
  for (const circle of collision.circles) {
    if (circleHitsCircle(x, z, r, circle)) return true;
  }
  return false;
}

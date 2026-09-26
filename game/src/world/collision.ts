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

export function projectWalkTarget(
  x: number,
  z: number,
  r: number,
  collision: WorldCollision,
  fromX: number,
  fromZ: number,
): { x: number; z: number } {
  if (!positionBlocked(x, z, r, collision)) return { x, z };

  let px = x;
  let pz = z;
  for (let pass = 0; pass < 4; pass++) {
    let pushed = false;
    for (const circle of collision.circles) {
      const dx = px - circle.x;
      const dz = pz - circle.z;
      const d = Math.hypot(dx, dz);
      const need = circle.r + r + 0.06;
      if (d < need) {
        if (d < 1e-5) {
          const ox = fromX - circle.x;
          const oz = fromZ - circle.z;
          const ol = Math.hypot(ox, oz);
          if (ol > 1e-5) {
            px = circle.x + (ox / ol) * need;
            pz = circle.z + (oz / ol) * need;
          } else {
            px = circle.x + need;
            pz = circle.z;
          }
        } else {
          const s = need / d;
          px = circle.x + dx * s;
          pz = circle.z + dz * s;
        }
        pushed = true;
      }
    }
    for (const box of collision.boxes) {
      if (!circleHitsBox(px, pz, r, box)) continue;
      const cx = Math.max(box.minX, Math.min(px, box.maxX));
      const cz = Math.max(box.minZ, Math.min(pz, box.maxZ));
      let dx = px - cx;
      let dz = pz - cz;
      let d = Math.hypot(dx, dz);
      if (d < 1e-5) {
        const left = Math.abs(px - (box.minX - r));
        const right = Math.abs(px - (box.maxX + r));
        const top = Math.abs(pz - (box.minZ - r));
        const bottom = Math.abs(pz - (box.maxZ + r));
        const m = Math.min(left, right, top, bottom);
        if (m === left) px = box.minX - r - 0.06;
        else if (m === right) px = box.maxX + r + 0.06;
        else if (m === top) pz = box.minZ - r - 0.06;
        else pz = box.maxZ + r + 0.06;
      } else {
        const need = r + 0.06;
        const s = need / d;
        px = cx + dx * s;
        pz = cz + dz * s;
      }
      pushed = true;
    }
    if (!pushed && !positionBlocked(px, pz, r, collision)) break;
  }

  if (!positionBlocked(px, pz, r, collision)) return { x: px, z: pz };

  const dx = fromX - x;
  const dz = fromZ - z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-5) return { x: fromX, z: fromZ };
  const steps = Math.max(4, Math.ceil(dist / 0.12));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const qx = x + dx * t;
    const qz = z + dz * t;
    if (!positionBlocked(qx, qz, r, collision)) return { x: qx, z: qz };
  }
  return { x: fromX, z: fromZ };
}

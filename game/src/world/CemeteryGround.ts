import { type MeshStandardMaterial } from "three";
import { makePaintedTerrainMaterial } from "./PaintedTerrain";

export function cemeteryPathDistance(x: number, z: number): number {
  const perimeter = Math.abs(Math.max(Math.abs(x), Math.abs(z)) - 4.6);
  return Math.min(perimeter, Math.abs(x), Math.abs(z + 4.6));
}

export const CEMETERY_PATH_GLSL = `
float cemeteryPath(vec2 p) {
  float perimeter = abs(max(abs(p.x), abs(p.y)) - 4.6);
  float distanceToPath = min(perimeter, min(abs(p.x), abs(p.y + 4.6)));
  return 1.0 - smoothstep(0.6, 1.3, distanceToPath + (cityFbm(p * 1.9) - 0.5) * 0.5);
}
`;

export function makeCemeteryGroundMaterial(): MeshStandardMaterial {
  return makePaintedTerrainMaterial("cemetery");
}

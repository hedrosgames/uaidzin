import type { Group } from "three";
import { boxFromCenter, type WorldCollision } from "./collision";
import {
  cemeteryPropFootprint,
  cemeteryPropRadius,
  cemeteryPropScale,
  spawnCemeteryProp,
} from "./CemeteryProps";

const WALL_HEIGHT = 2.2;

const TREES: Array<[number, number, number, number]> = [
  [-14.75, -14.55, 3.85, 0.4],
  [14.85, -14.35, 3.45, 1.7],
  [-14.55, 14.65, 4.05, 2.4],
  [14.55, 14.45, 3.55, 0.9],
  [-15.15, 0.15, 3.7, 1.2],
  [15.1, -0.45, 3.35, 2.8],
];

const TOMBS: Array<[number, number, number, number]> = [
  [-8.6, -15.45, 1.42, 0],
  [-5.7, -15.7, 1.22, 0],
  [5.85, -15.55, 1.48, 0],
  [8.75, -15.35, 1.28, 0],
  [-11.3, 15.5, 1.36, 2],
  [-7.35, 15.75, 1.5, 2],
  [7.55, 15.55, 1.24, 2],
  [11.45, 15.4, 1.44, 2],
  [-15.55, -8.7, 1.33, 1],
  [-15.65, 6.5, 1.46, 1],
  [15.55, -8.55, 1.4, 3],
  [15.6, 6.35, 1.26, 3],
  [-12.6, -10.6, 1.18, 1],
  [12.7, -10.45, 1.3, 3],
  [-10.6, 12.35, 1.34, 1],
  [10.7, 12.2, 1.22, 3],
];

export function addCemeteryEnclosure(parent: Group, collision: WorldCollision, size: number): void {
  const scale = cemeteryPropScale("wall", WALL_HEIGHT);
  const foot = cemeteryPropFootprint("wall", scale, 0);
  const moduleWidth = foot.width;
  const wallT = foot.depth;
  const half = size / 2;
  const runs: Array<{ alongX: boolean; fixed: number; length: number; quarterTurns: number }> = [
    { alongX: true, fixed: -half + wallT / 2, length: size, quarterTurns: 0 },
    { alongX: true, fixed: half - wallT / 2, length: size, quarterTurns: 2 },
    { alongX: false, fixed: half - wallT / 2, length: size - wallT * 2, quarterTurns: 3 },
    { alongX: false, fixed: -half + wallT / 2, length: size - wallT * 2, quarterTurns: 1 },
  ];
  for (const run of runs) {
    const segments = Math.max(1, Math.round(run.length / moduleWidth));
    const segmentLength = run.length / segments;
    const scaleX = scale * (segmentLength / moduleWidth);
    for (let i = 0; i < segments; i++) {
      const offset = -run.length / 2 + segmentLength * (i + 0.5);
      spawnCemeteryProp(parent, {
        id: "wall",
        x: run.alongX ? offset : run.fixed,
        z: run.alongX ? run.fixed : offset,
        scale,
        scaleX,
        quarterTurns: run.quarterTurns,
      });
    }
    collision.boxes.push(
      run.alongX
        ? boxFromCenter(0, run.fixed, run.length, wallT)
        : boxFromCenter(run.fixed, 0, wallT, run.length),
    );
  }

  for (const [x, z, treeScale, yaw] of TREES) {
    spawnCemeteryProp(parent, { id: "tree", x, z, scale: treeScale, yaw });
    collision.circles.push({ x, z, r: cemeteryPropRadius("tree", treeScale) });
  }

  for (const [x, z, tombScale, quarterTurns] of TOMBS) {
    spawnCemeteryProp(parent, { id: "tomb", x, z, scale: tombScale, quarterTurns });
    collision.circles.push({ x, z, r: cemeteryPropRadius("tomb", tombScale) });
  }
}

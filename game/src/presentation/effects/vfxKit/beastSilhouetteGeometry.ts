import {
  BufferGeometry, ConeGeometry, Float32BufferAttribute, IcosahedronGeometry,
  Matrix4, Quaternion, Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createBladeGeometry } from "./stylizedGeometry";

export type BeastSilhouette = "wolf" | "bear" | "tiger" | "dragon" | "condor" | "titan";

export function createBeastSilhouetteGeometry(kind: BeastSilhouette): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const matrix = new Matrix4();
  const position = new Vector3();
  const scale = new Vector3();
  const rotation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const direction = new Vector3();
  const add = (
    geometry: BufferGeometry,
    at: readonly [number, number, number],
    size: readonly [number, number, number],
    shade = 1,
    tilt = 0,
  ) => {
    position.fromArray(at);
    scale.fromArray(size);
    rotation.setFromAxisAngle(UP, tilt);
    matrix.compose(position, rotation, scale);
    geometry.applyMatrix4(matrix);
    if (geometry.index) {
      const original = geometry;
      geometry = geometry.toNonIndexed();
      original.dispose();
    }
    const color = new Float32Array(geometry.getAttribute("position").count * 3).fill(shade);
    geometry.setAttribute("color", new Float32BufferAttribute(color, 3));
    parts.push(geometry);
  };
  const stone = (at: readonly [number, number, number], size: readonly [number, number, number], shade = 1) =>
    add(new IcosahedronGeometry(1, 0), at, size, shade);
  const horn = (from: Vector3, to: Vector3, width: number, shade = 1) => {
    direction.subVectors(to, from);
    const geometry = new ConeGeometry(width, direction.length(), 5);
    rotation.setFromUnitVectors(up, direction.normalize());
    geometry.applyQuaternion(rotation);
    position.copy(from).add(to).multiplyScalar(0.5);
    add(geometry, [position.x, position.y, position.z], [1, 1, 1], shade);
  };
  if (kind === "titan") {
    stone([0, 0.72, 0], [0.52, 0.57, 0.27], 0.86);
    stone([0, 1.38, 0.02], [0.26, 0.3, 0.24], 1.12);
    for (const side of [-1, 1]) {
      stone([side * 0.53, 0.86, 0], [0.26, 0.32, 0.28], 0.72);
      stone([side * 0.64, 0.42, 0.03], [0.2, 0.38, 0.22], 0.88);
      stone([side * 0.25, 0.04, 0], [0.23, 0.36, 0.23], 0.7);
    }
  } else if (kind === "condor") {
    stone([0, 0.2, 0], [0.22, 0.4, 0.22], 0.72);
    stone([0, 0.57, 0.17], [0.2, 0.2, 0.2], 1.15);
    horn(new Vector3(0, 0.52, 0.27), new Vector3(0, 0.4, 0.58), 0.13, 1.3);
    for (const side of [-1, 1]) {
      for (let feather = 0; feather < 5; feather++) {
        const geometry = createBladeGeometry(0.84 - feather * 0.06, 0.2, 0.045);
        geometry.rotateZ(side * (1.05 + feather * 0.13));
        add(geometry, [side * (0.32 + feather * 0.12), 0.22 - feather * 0.06, -feather * 0.035], [1, 1, 1], 0.7 + feather * 0.1);
      }
    }
  } else {
    const broad = kind === "bear" ? 1.38 : 1;
    stone([0, 0.34, -0.15], [0.3 * broad, 0.38 * broad, 0.62], 0.82);
    stone([0, 0.58, 0.46], [0.26 * broad, 0.3 * broad, 0.31], 1.04);
    stone([0, 0.47, 0.76], [0.18 * broad, 0.14, kind === "wolf" ? 0.3 : 0.19], 1.22);
    for (const side of [-1, 1]) {
      stone([side * 0.22 * broad, -0.13, 0.3], [0.11 * broad, 0.39, 0.13], 0.7);
      stone([side * 0.22 * broad, -0.13, -0.55], [0.13 * broad, 0.36, 0.15], 0.75);
      stone([side * 0.22 * broad, -0.44, 0.38], [0.15, 0.09, 0.21], 0.88);
      stone([side * 0.19 * broad, 0.65, 0.68], [0.05, 0.055, 0.04], 0.15);
      if (kind === "bear") stone([side * 0.25, 0.86, 0.45], [0.12, 0.13, 0.1], 0.68);
      else horn(new Vector3(side * 0.16, 0.75, 0.36), new Vector3(side * 0.25, 1.02, 0.31), 0.12, 0.85);
    }
    horn(new Vector3(0, 0.42, -0.59), new Vector3(0, kind === "tiger" ? 0.56 : 0.08, -1.14), 0.15, 0.76);
    if (kind === "dragon") {
      for (const side of [-1, 1]) {
        for (let feather = 0; feather < 3; feather++) {
          const geometry = createBladeGeometry(1.25 - feather * 0.18, 0.58, 0.055);
          geometry.rotateZ(side * (0.9 + feather * 0.3));
          geometry.rotateX(-0.35);
          add(geometry, [side * 0.58, 0.69 - feather * 0.12, -0.18 - feather * 0.14], [1, 1, 1], 0.7 + feather * 0.15);
        }
      }
    }
    if (kind === "tiger") {
      for (const side of [-1, 1]) {
        for (let stripe = 0; stripe < 3; stripe++) {
          stone([side * 0.27, 0.47, 0.07 - stripe * 0.25], [0.045, 0.25, 0.055], 0.35);
        }
      }
    }
  }
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error(`Geometria inválida: ${kind}`);
  geometry.computeBoundingSphere();
  return geometry;
}

const UP = new Vector3(0, 1, 0);

import { Box3, Object3D, Vector3 } from "three";

export interface ModelFit {
  scale: number;
  height: number;
  minY: number;
  centerX: number;
  centerZ: number;
}

const MIN_MEASURABLE_HEIGHT = 1e-5;

function measureMeshBox(root: Object3D): Box3 {
  const box = new Box3();
  try {
    box.setFromObject(root, true);
  } catch {
    box.makeEmpty();
  }
  if (box.isEmpty()) box.setFromObject(root, false);
  return box;
}

export function measureModel(root: Object3D): ModelFit | null {
  root.updateMatrixWorld(true);

  const inv = root.matrixWorld.clone().invert();
  const boneBox = new Box3();
  const tip = new Vector3();
  let hasBones = false;

  root.traverse((obj) => {
    if (!(obj as { isBone?: boolean }).isBone) return;
    hasBones = true;
    obj.updateWorldMatrix(true, false);
    obj.getWorldPosition(tip);
    tip.applyMatrix4(inv);
    if (boneBox.isEmpty()) {
      boneBox.set(tip.clone(), tip.clone());
    } else {
      boneBox.expandByPoint(tip);
    }
  });

  const meshBox = measureMeshBox(root);
  if (meshBox.isEmpty()) return null;
  meshBox.applyMatrix4(inv);

  const meshSize = meshBox.getSize(new Vector3());
  const meshCenter = meshBox.getCenter(new Vector3());
    let height = Math.max(meshSize.y, 0.001);
    if (hasBones && !boneBox.isEmpty()) {
      const boneSize = boneBox.getSize(new Vector3());
      height = Math.max(boneSize.y, 0.001);
    }

  return {
    scale: 1,
    height,
    minY: meshBox.min.y,
    centerX: meshCenter.x,
    centerZ: meshCenter.z,
  };
}

export function fitModelToHeight(root: Object3D, targetHeight: number): ModelFit | null {
  const fit = measureModel(root);
  if (!fit) return null;
  if (!isFinite(fit.height) || fit.height < MIN_MEASURABLE_HEIGHT) return null;
  const scale = targetHeight / fit.height;
  if (!isFinite(scale) || scale <= 0) return null;
  return { ...fit, scale };
}

export function applyModelFit(root: Object3D, fit: ModelFit): void {
  root.scale.setScalar(fit.scale);
  root.position.set(-fit.centerX * fit.scale, -fit.minY * fit.scale, -fit.centerZ * fit.scale);
  root.updateMatrixWorld(true);
}

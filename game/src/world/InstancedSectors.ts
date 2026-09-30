import { Color, Group, InstancedMesh, Matrix4 } from "three";
import { grassCount } from "../presentation/rendering/GraphicsQuality";

export function splitInstancedSectors(source: InstancedMesh, sectorSize = 12): Group {
  const group = new Group();
  group.name = source.name;
  group.userData.occlusionIgnore = true;
  const sectors = new Map<string, number[]>();
  const matrix = new Matrix4();
  const color = new Color();
  const fullCount = (source.userData.fullCount as number | undefined) ?? source.count;
  for (let index = 0; index < fullCount; index++) {
    source.getMatrixAt(index, matrix);
    const key = `${Math.floor(matrix.elements[12]! / sectorSize)},${Math.floor(matrix.elements[14]! / sectorSize)}`;
    const indices = sectors.get(key) ?? [];
    indices.push(index);
    sectors.set(key, indices);
  }
  for (const [key, indices] of sectors) {
    const mesh = new InstancedMesh(source.geometry, source.material, indices.length);
    mesh.name = `${source.name}-sector-${key}`;
    mesh.userData = { ...source.userData, fullCount: indices.length };
    mesh.castShadow = source.castShadow;
    mesh.receiveShadow = source.receiveShadow;
    mesh.raycast = () => {};
    indices.forEach((sourceIndex, index) => {
      source.getMatrixAt(sourceIndex, matrix);
      mesh.setMatrixAt(index, matrix);
      if (source.instanceColor) {
        source.getColorAt(sourceIndex, color);
        mesh.setColorAt(index, color);
      }
    });
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    if (source.userData.budgetKind === "grass") mesh.count = grassCount(indices.length);
    group.add(mesh);
  }
  source.dispose();
  return group;
}

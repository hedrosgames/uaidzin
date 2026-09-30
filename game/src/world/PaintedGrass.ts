import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, MeshBasicMaterial, Object3D } from "three";
import { loadCityPaintedTexture } from "./CityPaintedMaterials";
import { trackWorldVisual } from "./WorldVisuals";
import { positionBlocked, type SolidBox, type WorldCollision } from "./collision";
import { splitInstancedSectors } from "./InstancedSectors";

export function makePaintedGrassGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uv: number[] = [];
  const colors: number[] = [];
  for (let plane = 0; plane < 3; plane++) {
    const angle = plane * Math.PI / 3;
    const x = Math.cos(angle) * 0.65;
    const z = Math.sin(angle) * 0.65;
    positions.push(-x, -0.018, -z, x, -0.018, z, x, 0.95, z,
      -x, -0.018, -z, x, 0.95, z, -x, 0.95, -z);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    for (let vertex = 0; vertex < 6; vertex++) {
      const shade = vertex === 2 || vertex > 3 ? 1 : 0.8;
      colors.push(shade, shade, shade);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function makePaintedGrassMaterial(): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ color: 0xd4d7a2, side: DoubleSide, vertexColors: true, alphaTest: 0.45 });
  material.name = "painted-tall-grass";
  trackWorldVisual(loadCityPaintedTexture("grass").then((map) => {
    material.map = map;
    material.needsUpdate = true;
  }));
  return material;
}

export function buildPaintedGrassPatches(bounds: SolidBox, collision: WorldCollision, count: number): Group {
  const grass = new InstancedMesh(makePaintedGrassGeometry(), makePaintedGrassMaterial(), count);
  grass.name = "dungeon-tall-grass";
  grass.userData.budgetKind = "grass";
  const transform = new Object3D();
  const color = new Color();
  let seed = 7319;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let placed = 0;
  for (let attempt = 0; placed < count && attempt < count * 40; attempt++) {
    const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
    const z = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
    if (Math.abs(x) < 2.9 || positionBlocked(x, z, 0.65, collision)) continue;
    const patch = Math.sin(x * 0.48 + Math.sin(z * 0.17)) * Math.cos(z * 0.33 - x * 0.1);
    if (random() > Math.max(0.03, patch * 0.85)) continue;
    transform.position.set(x, 0.025, z);
    transform.rotation.y = random() * Math.PI;
    const width = 0.6 + random() * 0.5;
    transform.scale.set(width, 0.7 + random() * 0.6, width);
    transform.updateMatrix();
    grass.setMatrixAt(placed, transform.matrix);
    const value = 0.82 + random() * 0.18;
    color.setRGB(value, value, value * 0.94);
    grass.setColorAt(placed, color);
    placed++;
  }
  grass.count = placed;
  grass.userData.fullCount = placed;
  return splitInstancedSectors(grass);
}

import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from "three";

const TREE_COUNT = 64;
const TERRAIN_SIZE = 200;

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildCityScenery(cityHalf: number): Group {
  const group = new Group();
  group.name = "city-scenery";

  const terrain = new Mesh(
    new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE),
    new MeshStandardMaterial({ color: 0x1d2418, roughness: 1, metalness: 0 }),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.03;
  terrain.receiveShadow = true;
  group.add(terrain);

  const trunkMat = new MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 });
  const leafMat = new MeshStandardMaterial({ color: 0x1c3a24, roughness: 1 });
  const trunk = new InstancedMesh(new CylinderGeometry(0.16, 0.26, 1.6, 6), trunkMat, TREE_COUNT);
  const lower = new InstancedMesh(new ConeGeometry(1.5, 2.8, 7), leafMat, TREE_COUNT);
  const upper = new InstancedMesh(new ConeGeometry(1.0, 2.4, 7), leafMat, TREE_COUNT);
  trunk.castShadow = true;
  lower.castShadow = true;
  upper.castShadow = true;

  const rand = seededRandom(7331);
  const dummy = new Object3D();
  const innerR = cityHalf + 3.5;
  const outerR = cityHalf + 22;
  for (let i = 0; i < TREE_COUNT; i++) {
    const angle = (i / TREE_COUNT) * Math.PI * 2 + (rand() - 0.5) * 0.18;
    const radius = innerR + rand() * (outerR - innerR);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const s = 0.85 + rand() * 0.9;
    const rot = rand() * Math.PI * 2;

    dummy.position.set(x, 0.8 * s, z);
    dummy.rotation.set(0, rot, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunk.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, (1.6 + 1.4) * s, z);
    dummy.updateMatrix();
    lower.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, (1.6 + 2.6 + 1.0) * s, z);
    dummy.updateMatrix();
    upper.setMatrixAt(i, dummy.matrix);
  }
  trunk.instanceMatrix.needsUpdate = true;
  lower.instanceMatrix.needsUpdate = true;
  upper.instanceMatrix.needsUpdate = true;
  group.add(trunk, lower, upper);

  return group;
}

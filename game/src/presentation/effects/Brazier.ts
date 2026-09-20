import {
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
} from "three";

export interface BrazierHandle {
  group: Group;
  update(dt: number): void;
  dispose(): void;
}

export const BRAZIER_RADIUS = 0.4;

const LIGHT_COLOR = 0xff8a3c;
const LIGHT_INTENSITY = 16;
const LIGHT_DISTANCE = 12;
const FLAME_COLOR = 0xff7a1a;
const FLAME_EMISSIVE = 2.6;

const ironGeo = {
  post: new CylinderGeometry(0.09, 0.13, 1.25, 8),
  base: new CylinderGeometry(0.34, 0.4, 0.12, 10),
  bowl: new CylinderGeometry(0.42, 0.24, 0.32, 10, 1, true),
  coals: new SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  flame: new IcosahedronGeometry(0.22, 1),
};

export function createBrazier(id: string, x: number, z: number): BrazierHandle {
  const group = new Group();
  group.name = id;
  group.position.set(x, 0, z);

  const iron = new MeshStandardMaterial({ color: 0x2a2320, roughness: 0.6, metalness: 0.7 });
  const coals = new MeshStandardMaterial({
    color: 0x2b1108,
    emissive: 0xff3c08,
    emissiveIntensity: 1.1,
    roughness: 1,
  });
  const flame = new MeshStandardMaterial({
    color: 0x000000,
    emissive: FLAME_COLOR,
    emissiveIntensity: FLAME_EMISSIVE,
    roughness: 1,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });

  const base = new Mesh(ironGeo.base, iron);
  base.position.y = 0.06;
  base.castShadow = true;
  group.add(base);

  const post = new Mesh(ironGeo.post, iron);
  post.position.y = 0.72;
  post.castShadow = true;
  group.add(post);

  const bowl = new Mesh(ironGeo.bowl, iron);
  bowl.position.y = 1.45;
  bowl.castShadow = true;
  group.add(bowl);

  const coalMesh = new Mesh(ironGeo.coals, coals);
  coalMesh.position.y = 1.42;
  coalMesh.scale.y = 0.5;
  group.add(coalMesh);

  const flameMesh = new Mesh(ironGeo.flame, flame);
  flameMesh.position.y = 1.78;
  flameMesh.scale.set(0.8, 1.35, 0.8);
  group.add(flameMesh);

  const light = new PointLight(LIGHT_COLOR, LIGHT_INTENSITY, LIGHT_DISTANCE, 2);
  light.position.y = 1.95;
  group.add(light);

  let time = Math.random() * 100;

  return {
    group,
    update(dt: number) {
      time += dt;
      const n =
        Math.sin(time * 11.3) * 0.5 +
        Math.sin(time * 17.7 + 1.3) * 0.3 +
        Math.sin(time * 29.1 + 2.1) * 0.2;
      light.intensity = LIGHT_INTENSITY * (1 + n * 0.22);
      flame.emissiveIntensity = FLAME_EMISSIVE * (1 + n * 0.28);
      flameMesh.scale.set(0.8 + n * 0.08, 1.35 + n * 0.22, 0.8 - n * 0.06);
      flameMesh.rotation.y = time * 1.7;
      flameMesh.position.y = 1.78 + n * 0.04;
    },
    dispose() {
      iron.dispose();
      coals.dispose();
      flame.dispose();
      light.dispose();
    },
  };
}

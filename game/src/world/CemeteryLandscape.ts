import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { positionBlocked, type WorldCollision } from "./collision";
import { cemeteryPathDistance } from "./CemeteryGround";
import { buildCemeteryGraves } from "./CemeteryGraves";

function makeDryGrassGeometry(): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 2.39996;
    const height = 0.14 + blade % 3 * 0.065;
    const bend = 0.07 + blade % 2 * 0.04;
    const point = (step: number, side: number) => {
      const width = 0.013 * (1 - step);
      const reach = 0.024 + bend * step * step;
      positions.push(Math.cos(angle) * reach + Math.sin(angle) * width * side, height * step, Math.sin(angle) * reach - Math.cos(angle) * width * side);
      const shade = 0.38 + step * 0.62;
      colors.push(shade, shade, shade * 0.88);
    };
    for (let segment = 0; segment < 3; segment++) {
      const low = segment / 3;
      const high = (segment + 1) / 3;
      point(low, -1); point(low, 1); point(high, 1);
      point(low, -1); point(high, 1); point(high, -1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildCemeteryLandscape(parent: Group, collision: WorldCollision): Group {
  const group = new Group();
  group.name = "cemetery-understory";
  group.add(buildCemeteryGraves(parent.children.filter((node) => node.name === "prop-cemetery-tomb")));
  const grass = new InstancedMesh(makeDryGrassGeometry(), new MeshStandardMaterial({ color: 0xc4b89d, roughness: 1, vertexColors: true, side: DoubleSide }), 3400);
  grass.name = "cemetery-grass";
  const stones = new InstancedMesh(new IcosahedronGeometry(1, 0), new MeshStandardMaterial({ color: 0x797d78, roughness: 0.96 }), 260);
  stones.name = "cemetery-stones";
  const anchors = parent.children.filter((node) => /prop-cemetery-(tomb|tree)/.test(node.name));
  const transform = new Object3D();
  const color = new Color();
  let seed = 38629;
  const random = () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
  for (const mesh of [grass, stones]) {
    let count = 0;
    for (let attempt = 0; attempt < 36000 && count < mesh.instanceMatrix.count; attempt++) {
      const anchor = anchors[attempt % anchors.length]!;
      const aroundGrave = attempt % 4 !== 0;
      const x = aroundGrave ? anchor.position.x + (random() - 0.5) * 4.4 : (random() - 0.5) * 33;
      const z = aroundGrave ? anchor.position.z + (random() - 0.5) * 4.4 : (random() - 0.5) * 33;
      if (Math.abs(x) > 16.6 || Math.abs(z) > 16.6 || positionBlocked(x, z, 0.08, collision)) continue;
      if (cemeteryPathDistance(x, z) < 1.25 || Math.hypot(x, z + 13.2) < 2) continue;
      const patch = Math.sin(x * 2.6 + Math.sin(z * 1.7)) * Math.cos(z * 2.3 - x * 0.5);
      if (random() > 0.5 + patch * 0.42) continue;
      transform.position.set(x, mesh === grass ? 0.012 : 0.018, z);
      transform.rotation.set(mesh === stones ? random() * 2 : 0, random() * Math.PI * 2, 0);
      const scale = mesh === grass ? 0.55 + random() * 0.85 : 0.04 + random() * 0.09;
      transform.scale.set(scale, scale * (mesh === stones ? 0.38 : 1), scale);
      transform.updateMatrix();
      mesh.setMatrixAt(count, transform.matrix);
      if (mesh === grass) color.setHSL(0.115 + random() * 0.06, 0.12 + random() * 0.14, 0.3 + random() * 0.19);
      else color.setHSL(0.12, 0.05, 0.52 + random() * 0.25);
      mesh.setColorAt(count, color);
      count++;
    }
    mesh.count = count;
    mesh.receiveShadow = true;
    mesh.userData.occlusionIgnore = true;
    mesh.raycast = () => {};
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

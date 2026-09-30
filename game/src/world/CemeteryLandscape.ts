import { Color, Group, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { splitInstancedSectors } from "./InstancedSectors";
import { grassCount } from "../presentation/rendering/GraphicsQuality";
import { positionBlocked, type WorldCollision } from "./collision";
import { cemeteryPathDistance } from "./CemeteryGround";
import { buildCemeteryGraves } from "./CemeteryGraves";
import { makePaintedGrassGeometry, makePaintedGrassMaterial } from "./PaintedGrass";

export function buildCemeteryLandscape(parent: Group, collision: WorldCollision): Group {
  const group = new Group();
  group.name = "cemetery-understory";
  group.add(buildCemeteryGraves(parent.children.filter((node) => node.name === "prop-cemetery-tomb")));
  const grassMaterial = makePaintedGrassMaterial();
  grassMaterial.color.set(0xaeb9a2);
  const grass = new InstancedMesh(makePaintedGrassGeometry(), grassMaterial, 2000);
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
      const patch = Math.sin(x * 0.72 + Math.sin(z * 0.37)) * Math.cos(z * 0.63 - x * 0.15);
      if (random() > Math.max(0.04, patch * 0.88)) continue;
      transform.position.set(x, mesh === grass ? 0.012 : 0.018, z);
      transform.rotation.set(mesh === stones ? random() * 2 : 0, random() * Math.PI * 2, 0);
      const scale = mesh === grass ? 0.65 + random() * 0.55 : 0.04 + random() * 0.09;
      transform.scale.set(scale, scale * (mesh === stones ? 0.38 : 1), scale);
      transform.updateMatrix();
      mesh.setMatrixAt(count, transform.matrix);
      if (mesh === grass) color.setRGB(0.82 + random() * 0.15, 0.86 + random() * 0.12, 0.86 + random() * 0.14);
      else color.setHSL(0.12, 0.05, 0.52 + random() * 0.25);
      mesh.setColorAt(count, color);
      count++;
    }
    mesh.count = count;
    mesh.receiveShadow = mesh !== grass;
    if (mesh === grass) {
      mesh.userData.budgetKind = "grass";
      mesh.userData.fullCount = count;
      mesh.count = grassCount(count);
    }
    mesh.userData.occlusionIgnore = true;
    mesh.raycast = () => {};
    mesh.computeBoundingSphere();
    group.add(splitInstancedSectors(mesh));
  }
  return group;
}

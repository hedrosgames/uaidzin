import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";

const TERRAIN_SIZE = 120;

export function buildCityScenery(cityHalf: number): Group {
  const group = new Group();
  group.name = "city-scenery";

  const terrain = new Mesh(
    new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE),
    new MeshStandardMaterial({ color: 0x14110e, roughness: 1, metalness: 0 }),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.04;
  terrain.receiveShadow = true;
  group.add(terrain);

  const skirt = new Mesh(
    new PlaneGeometry(cityHalf * 2 + 8, cityHalf * 2 + 8),
    new MeshStandardMaterial({ color: 0x1a1612, roughness: 1, metalness: 0 }),
  );
  skirt.rotation.x = -Math.PI / 2;
  skirt.position.y = -0.02;
  skirt.receiveShadow = true;
  group.add(skirt);

  return group;
}

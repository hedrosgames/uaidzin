import { Group, Mesh, PlaneGeometry } from "three";
import { makePaintedTerrainMaterial } from "./PaintedTerrain";

export function buildCityScenery(cityHalf: number): Group {
  const group = new Group();
  group.name = "city-scenery";

  const terrain = new Mesh(
    new PlaneGeometry(Math.max(220, cityHalf * 8), Math.max(220, cityHalf * 8)),
    makePaintedTerrainMaterial("exterior"),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.04;
  terrain.userData.occlusionIgnore = true;
  terrain.raycast = () => {};
  group.add(terrain);

  return group;
}

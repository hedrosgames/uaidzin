import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import type { WorldCollision } from "./collision";
import type { InteractableDef } from "./definitions";
import { grassCount, isCheapShaders } from "../presentation/rendering/GraphicsQuality";

export const CITY_GARDEN_BEDS = [
  [-14.6, -13.6, 2.4, 2.2], [-5.0, -15.3, 2.8, 1.35],
  [14.7, -13.5, 2.15, 2.5], [15.3, -6.2, 1.8, 2.9],
  [-15.0, -6.3, 1.8, 2.7], [-15.2, 5.3, 1.55, 2.8],
  [15.2, 5.4, 1.7, 2.55], [-14.8, 13.9, 2.1, 2.0],
  [14.9, 14.5, 2.0, 1.8], [-5.8, 14.9, 3.2, 1.65],
  [5.9, 15.1, 2.7, 1.6],
  [-12.0, -6.0, 3.1, 2.7], [12.2, -6.1, 3.0, 2.6],
  [-12.1, 5.7, 2.9, 2.6], [12.6, 5.8, 2.6, 2.7],
  [-5.5, 13.1, 2.8, 2.0],
] as const;

export const CITY_GARDEN_GLSL = `
float cityGarden(vec2 p) {
  float distanceToBed = 10.0;
  ${CITY_GARDEN_BEDS.map(([x, z, rx, rz]) => `distanceToBed = min(distanceToBed, length((p - vec2(${x.toFixed(2)}, ${z.toFixed(2)})) / vec2(${rx.toFixed(2)}, ${rz.toFixed(2)})));`).join("\n  ")}
  return 1.0 - smoothstep(0.5, 1.65, distanceToBed + (cityFbm(p * 1.4) - 0.5) * 0.55);
}
`;

export const CITY_GARDEN_CHEAP_GLSL = `
float cityGarden(vec2 p) {
  return 0.0;
}
`;

export function getCityGardenGlsl(): string {
  return isCheapShaders() ? CITY_GARDEN_CHEAP_GLSL : CITY_GARDEN_GLSL;
}

function makeGrassGeometry(): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 2.399;
    const x = Math.cos(angle) * 0.045;
    const z = Math.sin(angle) * 0.045;
    const width = 0.022;
    const height = 0.11 + (blade % 3) * 0.04;
    const dx = Math.cos(angle) * width;
    const dz = Math.sin(angle) * width;
    positions.push(x - dx, 0, z - dz, x + dx, 0, z + dz,
      x + dx * 1.5, height * 0.6, z + dz * 1.5,
      x - dx, 0, z - dz, x + dx * 1.5, height * 0.6, z + dz * 1.5,
      x + dx * 0.5, height, z + dz * 3.5);
    for (let v = 0; v < 6; v++) {
      const brightness = v === 5 ? 1 : v === 2 || v === 4 ? 0.9 : 0.72;
      colors.push(brightness, brightness, brightness);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildCityVegetation(collision: WorldCollision, services: InteractableDef[]): Group {
  const group = new Group();
  group.name = "city-gardens";
  const material = new MeshStandardMaterial({ color: 0xc6d1bc, roughness: 1, side: DoubleSide, vertexColors: true });
  const grass = new InstancedMesh(makeGrassGeometry(), material, 5200);
  grass.name = "city-grass";
  grass.userData.occlusionIgnore = true;
  grass.raycast = () => {};
  const transform = new Object3D();
  const color = new Color();
  let seed = 7259;
  const random = () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
  let count = 0;
  for (let attempt = 0; attempt < 20000 && count < 5200; attempt++) {
    const bed = CITY_GARDEN_BEDS[attempt % CITY_GARDEN_BEDS.length]!;
    const x = bed[0] + (random() * 2 - 1) * bed[2] * 1.2;
    const z = bed[1] + (random() * 2 - 1) * bed[3] * 1.2;
    const radius = Math.hypot((x - bed[0]) / bed[2], (z - bed[1]) / bed[3]);
    if (radius > 0.8 + random() * 0.4 || Math.abs(x) > 16.8 || Math.abs(z) > 16.8) continue;
    if (services.some((service) => Math.hypot(x - service.x, z - service.z) < 1.4)) continue;
    if (collision.boxes.some((box) => x > box.minX - 0.15 && x < box.maxX + 0.15 && z > box.minZ - 0.15 && z < box.maxZ + 0.15)) continue;
    if (collision.circles.some((circle) => Math.hypot(x - circle.x, z - circle.z) < circle.r + 0.2)) continue;
    transform.position.set(x, 0.015, z);
    transform.rotation.y = random() * Math.PI * 2;
    transform.scale.setScalar(0.55 + random() * 0.8);
    transform.updateMatrix();
    grass.setMatrixAt(count, transform.matrix);
    color.setHSL(0.24 + random() * 0.05, 0.28 + random() * 0.16, 0.42 + random() * 0.14);
    grass.setColorAt(count, color);
    count++;
  }
  grass.userData.budgetKind = "grass";
  grass.userData.fullCount = count;
  grass.count = grassCount(count);
  grass.receiveShadow = false;
  grass.computeBoundingSphere();
  group.add(grass);
  return group;
}

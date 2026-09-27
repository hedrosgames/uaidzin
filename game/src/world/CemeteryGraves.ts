import { Group, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry } from "three";
import { CITY_SURFACE_GLSL } from "./CitySurface";
import { makeCitySolidMaterial } from "./CityMaterialTextures";

function makeGraveSoil(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: 0x675b48, roughness: 1, transparent: true, depthWrite: false });
  material.name = "cemetery-grave-soil";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vPlot;\nvarying vec2 vSoilWorld;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
vPlot = position.xz;
vec4 soilWorld = vec4(position, 1.0);
#ifdef USE_INSTANCING
soilWorld = instanceMatrix * soilWorld;
#endif
vSoilWorld = (modelMatrix * soilWorld).xz;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec2 vPlot;
varying vec2 vSoilWorld;
${CITY_SURFACE_GLSL}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
float grain = cityFbm(vSoilWorld * 27.0);
float clumps = cityFbm(vSoilWorld * 8.0);
float edge = max(abs(vPlot.x), abs(vPlot.y)) + (grain - 0.5) * 0.075;
diffuseColor.a *= 1.0 - smoothstep(0.36, 0.5, edge);
diffuseColor.rgb *= mix(0.62, 1.2, clumps) * mix(0.83, 1.12, grain);`);
  };
  material.customProgramCacheKey = () => "cemetery-grave-soil-1";
  return material;
}

export function buildCemeteryGraves(tombs: Object3D[]): Group {
  const group = new Group();
  group.name = "cemetery-grave-plots";
  const geometry = new PlaneGeometry(1, 1, 10, 16);
  geometry.rotateX(-Math.PI / 2);
  const vertices = geometry.getAttribute("position");
  for (let i = 0; i < vertices.count; i++) {
    vertices.setY(i, 0.035 * (1 - Math.pow(vertices.getX(i) * 2, 6)) * (1 - Math.pow(vertices.getZ(i) * 2, 6)));
  }
  geometry.computeVertexNormals();
  const soil = new InstancedMesh(geometry, makeGraveSoil(), tombs.length);
  soil.name = "cemetery-grave-soil";
  const edging = new InstancedMesh(new IcosahedronGeometry(1, 0), makeCitySolidMaterial("stone", 0x8d9086), tombs.length * 10);
  edging.name = "cemetery-grave-edging";
  const transform = new Object3D();
  let stoneIndex = 0;
  tombs.forEach((tomb, index) => {
    const yaw = tomb.rotation.y;
    const width = 0.8 + index % 3 * 0.05;
    const length = 1.75 + index % 4 * 0.08;
    const forward = length * 0.5 + 0.2;
    const centerX = tomb.position.x + Math.sin(yaw) * forward;
    const centerZ = tomb.position.z + Math.cos(yaw) * forward;
    transform.position.set(centerX, 0.013, centerZ);
    transform.rotation.set(0, yaw, 0);
    transform.scale.set(width + 0.25, 1, length + 0.2);
    transform.updateMatrix();
    soil.setMatrixAt(index, transform.matrix);
    for (let stone = 0; stone < 10; stone++) {
      if ((stone + index) % 7 === 0) continue;
      const side = stone < 5 ? -1 : 1;
      const localX = side * width * 0.51;
      const localZ = ((stone % 5) / 4 - 0.5) * length * 0.84;
      transform.position.set(centerX + Math.cos(yaw) * localX + Math.sin(yaw) * localZ, 0.035,
        centerZ - Math.sin(yaw) * localX + Math.cos(yaw) * localZ);
      transform.rotation.set(Math.sin(stone + index) * 0.2, yaw + Math.sin(index * 3 + stone) * 0.16, 0);
      transform.scale.set(0.09, 0.045 + stone % 2 * 0.01, 0.17);
      transform.updateMatrix();
      edging.setMatrixAt(stoneIndex++, transform.matrix);
    }
  });
  edging.count = stoneIndex;
  for (const mesh of [soil, edging]) {
    mesh.receiveShadow = true;
    mesh.userData.occlusionIgnore = true;
    mesh.raycast = () => {};
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

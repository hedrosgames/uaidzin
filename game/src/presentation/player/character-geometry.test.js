import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { repairCharacterGeometry } from "../../../public/boot/assets/character-geometry.mjs";

async function loadGeometry(classId) {
  const source = readFileSync(resolve("public/models/player", classId, `${classId}.glb`));
  const jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
  delete json.images;
  delete json.textures;
  json.materials = [{}];
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) primitive.material = 0;
  const raw = Buffer.from(JSON.stringify(json));
  const paddedLength = Math.ceil(raw.length / 4) * 4;
  const output = Buffer.alloc(20 + paddedLength + source.length - 20 - jsonLength, 32);
  source.copy(output, 0, 0, 12);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(paddedLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  raw.copy(output, 20);
  source.copy(output, 20 + paddedLength, 20 + jsonLength);
  return new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength), "");
}

describe("Geometria original das classes", () => {
  it.each(["TK", "FM", "BM", "HT"])("%s preserva atributos, transformações e faces válidas", async (classId) => {
    const { scene } = await loadGeometry(classId);
    const meshes = [];
    scene.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
    const before = meshes.map((mesh) => ({
      indices: Array.from(mesh.geometry.index.array),
      attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attribute]) => [key, Array.from(attribute.array)])),
      matrix: mesh.matrix.toArray(),
      scale: mesh.scale.toArray(),
    }));
    repairCharacterGeometry(scene, classId);
    let removed = 0;
    meshes.forEach((mesh, index) => {
      const original = before[index];
      const indices = Array.from(mesh.geometry.index.array);
      removed += original.indices.length - indices.length;
      const expected = [...original.indices];
      if (mesh.geometry.userData.tkLooseFragmentRemoved) expected.splice(30873, 6);
      expect(indices).toEqual(expected);
      for (const [key, attribute] of Object.entries(mesh.geometry.attributes)) expect(Array.from(attribute.array)).toEqual(original.attributes[key]);
      expect(mesh.matrix.toArray()).toEqual(original.matrix);
      expect(mesh.scale.toArray()).toEqual(original.scale);
    });
    expect(removed).toBe(classId === "TK" ? 6 : 0);
    const geometries = meshes.map((mesh) => mesh.geometry);
    repairCharacterGeometry(scene, classId);
    meshes.forEach((mesh, index) => expect(mesh.geometry).toBe(geometries[index]));
  });
});

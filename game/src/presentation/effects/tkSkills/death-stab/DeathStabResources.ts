import {
  AdditiveBlending, BufferGeometry, ClampToEdgeWrapping, DoubleSide,
  Float32BufferAttribute, LinearFilter, MeshBasicMaterial, NormalBlending,
  PlaneGeometry, SRGBColorSpace, TextureLoader,
} from "three";
import { createCanvasTexture } from "../../vfxKit/canvasTexture";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function createDeathStabResources() {
  const atlas = new TextureLoader().load("/assets/vfx/death-stab/wind-slash.png");
  atlas.colorSpace = SRGBColorSpace;
  atlas.minFilter = atlas.magFilter = LinearFilter;
  atlas.wrapS = atlas.wrapT = ClampToEdgeWrapping;
  atlas.generateMipmaps = false;
  const size = 128;
  const stroke = createCanvasTexture(size, size, (context) => {
    context.fillStyle = "white";
    context.beginPath();
    context.moveTo(size * 0.06, size * 0.53);
    context.quadraticCurveTo(size * 0.48, size * 0.41, size * 0.96, size * 0.5);
    context.lineTo(size * 0.43, size * 0.57);
    context.lineTo(size * 0.54, size * 0.51);
    context.closePath();
    context.fill();
  });
  const curl = createCanvasTexture(size, size, (context) => {
    context.fillStyle = "white";
    context.beginPath();
    context.moveTo(size * 0.08, size * 0.68);
    context.bezierCurveTo(size * 0.85, size * 0.59, size * 0.87, size * 0.14, size * 0.33, size * 0.29);
    context.bezierCurveTo(size * 0.99, size * 0.01, size * 0.98, size * 0.77, size * 0.08, size * 0.68);
    context.fill();
  });
  const material = (map: typeof atlas, additive = false) => new MeshBasicMaterial({
    map, color: 0xffffff, transparent: true, depthWrite: false, depthTest: true,
    side: DoubleSide, blending: additive ? AdditiveBlending : NormalBlending,
    toneMapped: false,
  });
  const shard = new BufferGeometry();
  shard.setAttribute("position", new Float32BufferAttribute([0, 0, 0.6, -0.09, 0, -0.4, 0.055, 0.025, -0.2], 3));
  shard.setAttribute("uv", new Float32BufferAttribute([1, 0.5, 0, 0, 0, 1], 2));
  const needle = new PlaneGeometry(0.55, 0.065);
  needle.rotateY(-Math.PI / 2);
  const first = new PlaneGeometry(1.35, 0.7, 8, 2);
  first.rotateY(-Math.PI / 2);
  const positions = first.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    positions.setX(index, Math.sin(positions.getZ(index) * 3) * 0.065);
  }
  first.computeVertexNormals();
  const second = first.clone().rotateZ(Math.PI / 2);
  const wave = mergeGeometries([first, second]);
  first.dispose();
  second.dispose();
  return {
    atlas, stroke, curl, wave, needle, shard,
    windMaterial: material(atlas), strokeMaterial: material(stroke),
    curlMaterial: material(curl), flashMaterial: material(stroke, true),
    shardMaterial: new MeshBasicMaterial({ color: 0xffffff, transparent: true,
      depthWrite: false, side: DoubleSide, toneMapped: false }),
  };
}

export type DeathStabResources = ReturnType<typeof createDeathStabResources>;

export function disposeDeathStabResources(resources: DeathStabResources): void {
  for (const resource of Object.values(resources)) resource.dispose();
}

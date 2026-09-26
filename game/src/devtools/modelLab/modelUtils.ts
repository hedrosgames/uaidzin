import {
  DoubleSide,
  MeshStandardMaterial,
  type AnimationClip,
  type Mesh,
  type Object3D,
  type SkinnedMesh,
} from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

const loader = new GLTFLoader();
const templateCache = new Map<string, Promise<GLTF>>();
const clipCache = new Map<string, Promise<AnimationClip | null>>();

export function loadTemplate(url: string): Promise<GLTF> {
  let pending = templateCache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url);
    templateCache.set(url, pending);
  }
  return pending;
}

export function loadClip(url: string): Promise<AnimationClip | null> {
  let pending = clipCache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url).then((gltf) => {
      const clip = gltf.animations[0] ?? null;
      disposeObject(gltf.scene);
      return clip;
    });
    clipCache.set(url, pending);
  }
  return pending;
}

export function instantiateModel(gltf: GLTF): Object3D {
  const model = cloneSkinned(gltf.scene);
  model.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
  hardenMaterials(model);
  return model;
}

function hardenMaterials(model: Object3D): void {
  model.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next: MeshStandardMaterial[] = [];
    for (const mat of mats) {
      if (!mat) continue;
      const src = mat as MeshStandardMaterial;
      const std = new MeshStandardMaterial({
        map: src.map ?? null,
        color: src.color?.clone?.() ?? 0xffffff,
        normalMap: src.normalMap ?? null,
        side: DoubleSide,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        metalness: 0,
        roughness: 0.75,
      });
      if (std.map) {
        std.map.colorSpace = "srgb";
        std.map.needsUpdate = true;
      }
      src.dispose();
      next.push(std);
    }
    mesh.material = next.length === 1 ? next[0] : next;
    if ((mesh as SkinnedMesh).isSkinnedMesh) {
      (mesh as SkinnedMesh).frustumCulled = false;
    }
  });
}

function disposeObject(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const std = mat as MeshStandardMaterial;
      std.map?.dispose();
      std.dispose();
    }
  });
}

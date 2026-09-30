import { AnimationMixer, Box3, Group, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { WorldTickable } from "./CityWorld";
import { trackWorldVisual } from "./WorldVisuals";
import { makePaintedCharacterMaterial } from "../presentation/rendering/PaintedCharacter";
import { loadPaintedCharacterAtlas } from "../presentation/rendering/PaintedCharacterAtlas";

interface CityNpcSpec {
  model: string;
  height: number;
  facing: number;
}

const NPC_MODELS: Record<string, CityNpcSpec> = {
  "npc-portal-guard": { model: "../player/TK/TK", height: 1.78, facing: 0.1 },
  "npc-skill-master": { model: "../player/FM/FM", height: 1.72, facing: -0.3 },
  "npc-quest": { model: "../player/BM/BM", height: 1.78, facing: 0.3 },
  "npc-composer": { model: "blacksmith", height: 1.66, facing: 0.6 },
  "npc-merchant": { model: "merchant", height: 1.78, facing: -0.9 },
  "npc-blacksmith": { model: "blacksmith", height: 1.52, facing: -0.65 },
  "npc-sage": { model: "sage", height: 1.68, facing: 0.55 },
};

function releaseNpc(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    if ((mesh as SkinnedMesh).isSkinnedMesh) (mesh as SkinnedMesh).skeleton.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const map = (material as MeshStandardMaterial).map;
      if (!map?.userData.paintedAtlas) map?.dispose();
      (material as MeshStandardMaterial).userData.originalAtlas?.dispose();
      material.dispose();
    }
  });
}

export function attachCityNpc(anchor: Group): WorldTickable | null {
  const spec = NPC_MODELS[anchor.name];
  if (!spec) return null;
  let disposed = false;
  let mixer: AnimationMixer | null = null;
  let model: Group | null = null;
  anchor.userData.interactableId = anchor.name;

  const classId = spec.model.startsWith("../player/") ? spec.model.split("/")[2] : null;
  trackWorldVisual(Promise.all([
    new GLTFLoader().loadAsync(`/models/npcs/${spec.model}.glb`),
    classId ? loadPaintedCharacterAtlas(classId) : Promise.resolve(null),
  ]).then(([gltf, atlas]) => {
    if (disposed) {
      releaseNpc(gltf.scene);
      return;
    }
    model = gltf.scene;
    model.name = `${spec.model}-animated`;
    model.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const paintedMaterials = materials.map((material) => {
        const painted = makePaintedCharacterMaterial(material as MeshStandardMaterial, atlas);
        material.dispose();
        return painted;
      });
      mesh.material = paintedMaterials.length === 1 ? paintedMaterials[0]! : paintedMaterials;
    });
    mixer = new AnimationMixer(model);
    const idle = gltf.animations[0];
    if (idle) mixer.clipAction(idle).play();
    mixer.update(0);
    model.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(model, true);
    const height = bounds.getSize(new Vector3()).y;
    model.scale.multiplyScalar(spec.height / height);
    model.updateMatrixWorld(true);
    bounds.setFromObject(model, true);
    const center = bounds.getCenter(new Vector3());
    model.position.set(-center.x, -bounds.min.y, -center.z);
    const facing = new Group();
    facing.rotation.y = spec.facing;
    facing.add(model);
    releaseNpc(anchor);
    anchor.clear();
    anchor.add(facing);
  }).catch(() => {}));

  return {
    update(dt: number): void {
      mixer?.update(dt);
    },
    dispose(): void {
      disposed = true;
      mixer?.stopAllAction();
      if (model) {
        mixer?.uncacheRoot(model);
        releaseNpc(model);
        model.removeFromParent();
      }
      mixer = null;
    },
  };
}

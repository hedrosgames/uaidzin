import { AnimationMixer, Box3, Group, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { getArmorReflection } from "../../public/boot/assets/tk-materials.mjs";
import type { WorldTickable } from "./CityWorld";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";
import { trackWorldVisual } from "./WorldVisuals";

interface CityNpcSpec {
  model: string;
  height: number;
  facing: number;
}

const NPC_MODELS: Record<string, CityNpcSpec> = {
  "npc-merchant": { model: "merchant", height: 1.78, facing: -0.9 },
  "npc-blacksmith": { model: "blacksmith", height: 1.52, facing: -0.65 },
  "npc-sage": { model: "sage", height: 1.68, facing: 0.55 },
};

function polishNpcMaterial(material: MeshStandardMaterial): void {
  material.roughness = 0.88;
  material.metalness = 0;
  material.transparent = false;
  material.depthWrite = true;
  material.envMap = getArmorReflection();
  material.envMapIntensity = 0.45;
  material.userData.artProfile = "city-npc-matte";
  stampAnisotropy(material.map);
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
      float npcLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      float npcSkin = smoothstep(0.14, 0.28, npcLuma)
        * smoothstep(1.12, 1.3, diffuseColor.r / max(diffuseColor.g, 0.01))
        * smoothstep(0.32, 0.5, diffuseColor.b / max(diffuseColor.r, 0.01));
      roughnessFactor = mix(0.91, 0.74, npcSkin);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(npcLuma), 0.055);
      `,
    );
  };
  material.customProgramCacheKey = () => "city-npc-matte-v1";
}

function releaseNpc(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    if ((mesh as SkinnedMesh).isSkinnedMesh) (mesh as SkinnedMesh).skeleton.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      (material as MeshStandardMaterial).map?.dispose();
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

  trackWorldVisual(new GLTFLoader().loadAsync(`/models/npcs/${spec.model}.glb`).then((gltf) => {
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
      for (const material of materials) polishNpcMaterial(material as MeshStandardMaterial);
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

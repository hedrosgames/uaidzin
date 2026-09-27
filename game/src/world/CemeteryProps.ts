import { Group, Mesh, Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { applyCemeteryMaterials } from "./CemeteryMaterials";

export type CemeteryPropId = "wall" | "tomb" | "tree" | "mausoleum";

interface CemeteryPropSpec {
  url: string;
  width: number;
  depth: number;
  height: number;
}

const CEMETERY_PROP_SPECS: Record<CemeteryPropId, CemeteryPropSpec> = {
  wall: { url: "/models/props/cemetery/muro-pedra.glb", width: 0.998047, depth: 0.185547, height: 0.541016 },
  tomb: { url: "/models/props/cemetery/lapide-arco.glb", width: 0.919922, depth: 0.326172, height: 0.998047 },
  tree: { url: "/models/props/cemetery/arvore-seca.glb", width: 0.912109, depth: 0.580078, height: 0.998047 },
  mausoleum: { url: "/models/props/cemetery/mausoleu.glb", width: 1, depth: 1, height: 0.92 },
};

export interface CemeteryPropFootprint {
  width: number;
  depth: number;
}

export function cemeteryPropScale(id: CemeteryPropId, targetHeight: number): number {
  return targetHeight / CEMETERY_PROP_SPECS[id].height;
}

export function cemeteryPropFootprint(id: CemeteryPropId, scale: number, quarterTurns: number): CemeteryPropFootprint {
  const spec = CEMETERY_PROP_SPECS[id];
  const swap = quarterTurns % 2 !== 0;
  return {
    width: (swap ? spec.depth : spec.width) * scale,
    depth: (swap ? spec.width : spec.depth) * scale,
  };
}

export function cemeteryPropRadius(id: CemeteryPropId, scale: number): number {
  const spec = CEMETERY_PROP_SPECS[id];
  return Math.max(spec.width, spec.depth) * scale * 0.5;
}

const loader = new GLTFLoader();
const prototypes = new Map<CemeteryPropId, Promise<Object3D>>();

function loadPrototype(id: CemeteryPropId): Promise<Object3D> {
  let pending = prototypes.get(id);
  if (!pending) {
    pending = loader.loadAsync(CEMETERY_PROP_SPECS[id].url).then(async (gltf) => {
      await applyCemeteryMaterials(gltf.scene, id);
      return gltf.scene;
    }).catch(() => new Group());
    prototypes.set(id, pending);
  }
  return pending;
}

export interface CemeteryPropPlacement {
  id: CemeteryPropId;
  x: number;
  z: number;
  scale: number;
  quarterTurns?: number;
  yaw?: number;
  scaleX?: number;
}

export function spawnCemeteryProp(parent: Group, placement: CemeteryPropPlacement): Group {
  const anchor = new Group();
  anchor.name = `prop-cemetery-${placement.id}`;
  anchor.position.set(placement.x, 0, placement.z);
  anchor.rotation.y = placement.yaw ?? (placement.quarterTurns ?? 0) * (Math.PI / 2);
  anchor.scale.set(placement.scaleX ?? placement.scale, placement.scale, placement.scale);
  parent.add(anchor);
  void loadPrototype(placement.id).then((proto) => {
    const clone = proto.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.visible = true;
      mesh.frustumCulled = false;
    });
    anchor.add(clone);
  });
  return anchor;
}

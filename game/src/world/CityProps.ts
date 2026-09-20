import { DoubleSide, Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type CityPropId =
  | "wall"
  | "fountain"
  | "fountain-simple"
  | "stall-1"
  | "stall-2"
  | "weapon-rack"
  | "stall-bakery"
  | "wagon"
  | "bulletin-board";

interface CityPropSpec {
  url: string;
  width: number;
  depth: number;
  height: number;
}

const CITY_PROP_SPECS: Record<CityPropId, CityPropSpec> = {
  wall: { url: "/models/city/wall.glb", width: 0.999, depth: 0.138, height: 0.303 },
  fountain: { url: "/models/city/fountain.glb", width: 0.998, depth: 0.999, height: 0.735 },
  "fountain-simple": { url: "/models/city/fountain-simple.glb", width: 0.998, depth: 0.812, height: 0.905 },
  "stall-1": { url: "/models/city/stall-1.glb", width: 0.996, depth: 0.617, height: 0.761 },
  "stall-2": { url: "/models/city/stall-2.glb", width: 0.879, depth: 0.517, height: 0.796 },
  "weapon-rack": { url: "/models/city/weapon-rack.glb", width: 0.979, depth: 0.757, height: 0.984 },
  "stall-bakery": { url: "/models/city/stall-bakery.glb", width: 0.946, depth: 0.68, height: 0.807 },
  wagon: { url: "/models/city/wagon.glb", width: 0.637, depth: 0.996, height: 0.689 },
  "bulletin-board": { url: "/models/city/bulletin-board.glb", width: 1.0, depth: 0.494, height: 0.978 },
};

export interface CityPropFootprint {
  width: number;
  depth: number;
}

export function cityPropScale(id: CityPropId, targetHeight: number): number {
  return targetHeight / CITY_PROP_SPECS[id].height;
}

export function cityPropFootprint(id: CityPropId, scale: number, quarterTurns: number): CityPropFootprint {
  const spec = CITY_PROP_SPECS[id];
  const swap = quarterTurns % 2 !== 0;
  return {
    width: (swap ? spec.depth : spec.width) * scale,
    depth: (swap ? spec.width : spec.depth) * scale,
  };
}

const loader = new GLTFLoader();
const prototypes = new Map<CityPropId, Promise<Object3D>>();

function hardenPropMaterials(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = mats.map((mat) => {
      const src = mat as MeshStandardMaterial;
      const std = new MeshStandardMaterial({
        map: src.map ?? null,
        color: 0xffffff,
        side: DoubleSide,
        roughness: 0.82,
        metalness: 0,
      });
      if (std.map) {
        std.map.colorSpace = "srgb";
        std.map.needsUpdate = true;
      }
      src.dispose();
      return std;
    });
    mesh.material = next.length === 1 ? next[0]! : next;
  });
}

export type CityPropReadyFn = (root: Object3D) => void;

function loadPrototype(id: CityPropId): Promise<Object3D> {
  let pending = prototypes.get(id);
  if (!pending) {
    pending = loader.loadAsync(CITY_PROP_SPECS[id].url).then((gltf) => {
      hardenPropMaterials(gltf.scene);
      return gltf.scene;
    }).catch(() => new Group());
    prototypes.set(id, pending);
  }
  return pending;
}

export interface CityPropPlacement {
  id: CityPropId;
  x: number;
  z: number;
  scale: number;
  quarterTurns: number;
  scaleX?: number;
}

export function spawnCityProp(
  parent: Group,
  placement: CityPropPlacement,
  onReady?: CityPropReadyFn,
): Group {
  const anchor = new Group();
  anchor.name = `prop-${placement.id}`;
  anchor.position.set(placement.x, 0, placement.z);
  anchor.rotation.y = placement.quarterTurns * (Math.PI / 2);
  anchor.scale.set(placement.scaleX ?? placement.scale, placement.scale, placement.scale);
  parent.add(anchor);
  void loadPrototype(placement.id).then((proto) => {
    if (!proto) return;
    const clone = proto.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.visible = true;
      mesh.frustumCulled = false;
    });
    anchor.add(clone);
    onReady?.(clone);
  });
  return anchor;
}

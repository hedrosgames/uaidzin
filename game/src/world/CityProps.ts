import { DoubleSide, Group, Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CITY_SURFACE_GLSL } from "./CitySurface";
import { isCheapShaders } from "../presentation/rendering/GraphicsQuality";

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

function hardenPropMaterials(root: Object3D, id: CityPropId): void {
  const stone = id === "wall" || id === "fountain" || id === "fountain-simple";
  const canopy = id.startsWith("stall") || id === "wagon";
  const height = CITY_PROP_SPECS[id].height;
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = mats.map((mat) => {
      const src = mat as MeshStandardMaterial;
      const std = src.isMeshStandardMaterial ? src.clone() : new MeshStandardMaterial({ map: src.map ?? null });
      std.name = `city-${id}-surface`;
      std.side = DoubleSide;
      std.roughness = stone ? 0.94 : 0.88;
      std.metalness = src.metalness ?? 0;
      if (std.map) {
        std.map.colorSpace = SRGBColorSpace;
        std.map.anisotropy = 8;
        std.map.needsUpdate = true;
      }
      std.onBeforeCompile = (shader) => {
        if (isCheapShaders()) return;
        shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vPropSurface;");
        shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\nvPropSurface = position / ${height.toFixed(4)};`);
        shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vPropSurface;
float propRelief;
float propRoughness;
${CITY_SURFACE_GLSL}`);
        shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
float pores = cityFbm(vPropSurface.xz * 160.0 + vPropSurface.y * 31.0);
float weather = cityFbm(vPropSurface.xz * 14.0 + vPropSurface.y * 9.0);
float luminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
${stone ? `
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(luminance) * vec3(0.93, 0.97, 1.0), 0.72);
diffuseColor.rgb *= mix(0.86, 1.07, weather);
propRelief = (pores - 0.5) * 0.007;
propRoughness = mix(0.88, 0.99, pores);` : `
float cloth = ${canopy ? "smoothstep(0.58, 0.73, vPropSurface.y)" : "0.0"};
float grain = cityFbm(vec2(vPropSurface.x * 210.0 + vPropSurface.z * 180.0, vPropSurface.y * 8.0));
float weave = sin(vPropSurface.x * 650.0) * sin((vPropSurface.y + vPropSurface.z) * 650.0);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(luminance), 0.12);
diffuseColor.rgb *= mix(mix(0.84, 1.05, grain), 0.96 + weave * 0.025, cloth);
propRelief = mix((grain - 0.5) * 0.004, weave * 0.0007, cloth);
propRoughness = mix(0.82 + pores * 0.13, 0.98, cloth);`}`);
        shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, propRoughness);");
        shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nnormal = cityRelief(normal, -vViewPosition, propRelief);");
      };
      std.customProgramCacheKey = () => `${isCheapShaders() ? "cheap" : "natural"}-city-prop-1-${id}`;
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
      hardenPropMaterials(gltf.scene, id);
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
    });
    anchor.add(clone);
    onReady?.(clone);
  });
  return anchor;
}

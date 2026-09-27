import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace, Vector2 } from "three";
import type { CityPropId } from "./CityProps";
import { loadCitySurfaceTextures, type CitySurfaceKind, type CitySurfaceTextures } from "./CityMaterialTextures";

type PropSurface = CitySurfaceKind | "paint" | "paper";
type AtlasRect = readonly [number, number, number, number];

const fabricIslands: Partial<Record<CityPropId, readonly AtlasRect[]>> = {
  "stall-1": [[0.02, 0.303, 0.3, 0.561], [0.583, 0.20, 0.733, 0.534], [0.76, 0.088, 0.833, 0.34], [0.577, 0.783, 0.763, 0.864]],
  "stall-bakery": [[0.077, 0.207, 0.348, 0.38], [0.601, 0.701, 0.784, 0.973]],
  "weapon-rack": [[0.249, 0.064, 0.549, 0.281], [0.009, 0.27, 0.216, 0.55], [0.348, 0.933, 0.497, 0.987]],
};

const paintedIslands: Partial<Record<CityPropId, readonly AtlasRect[]>> = {
  "stall-1": [[0.39, 0.735, 0.58, 1], [0.895, 0.35, 1, 0.7], [0.28, 0, 0.59, 0.14]],
  "stall-2": [[0.323, 0.751, 0.385, 0.828]],
  "stall-bakery": [[0, 0, 0.279, 0.123], [0.52, 0.045, 0.617, 0.146], [0.815, 0, 1, 0.623], [0.258, 0.552, 0.391, 0.725], [0.49, 0.599, 0.652, 0.715], [0.405, 0.698, 0.525, 0.955], [0.8, 0.813, 1, 1]],
};

function insideAtlasRegion(u: number, v: number, regions?: readonly AtlasRect[]): boolean {
  return regions?.some(([left, top, right, bottom]) => u >= left && u <= right && v >= top && v <= bottom) ?? false;
}

const normalStrength: Record<CitySurfaceKind, number> = { stone: 0.32, wood: 0.4, cloth: 0.55, iron: 0.18 };
const detailScale: Record<CitySurfaceKind, number> = { stone: 3, wood: 5, cloth: 0.75, iron: 3 };

function sourcePixels(material: MeshStandardMaterial): ImageData | null {
  const image = material.map?.image as CanvasImageSource & { width: number; height: number } | undefined;
  if (!image?.width) return null;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

function classifySurface(id: CityPropId, u: number, v: number, x: number, y: number, z: number, pixels: ImageData | null): PropSurface {
  if (id === "wall" || id === "fountain" || id === "fountain-simple") return "stone";
  if (!pixels) return "wood";
  const px = Math.min(pixels.width - 1, Math.max(0, Math.floor(u * pixels.width)));
  const py = Math.min(pixels.height - 1, Math.max(0, Math.floor(v * pixels.height)));
  const index = (py * pixels.width + px) * 4;
  const r = pixels.data[index]! / 255;
  const g = pixels.data[index + 1]! / 255;
  const b = pixels.data[index + 2]! / 255;
  const brightness = Math.max(r, g, b);
  const chroma = brightness - Math.min(r, g, b);
  const canopyHeight = id === "weapon-rack" ? 0.68 : id === "stall-bakery" ? 0.54 : 0.51;
  if (id === "stall-2" && y > canopyHeight) return Math.abs(x) < 0.307 && y > 0.54 && z > -0.14 && z < 0.24 ? "cloth" : "wood";
  if (y > canopyHeight && insideAtlasRegion(u, v, fabricIslands[id])) return "cloth";
  if (y < canopyHeight && insideAtlasRegion(u, v, paintedIslands[id])) return "paint";
  if (id === "wagon" && y > 0.32 && Math.abs(x) < 0.255 && chroma < 0.19 && brightness > 0.28) return "cloth";
  if (id === "bulletin-board" && y > 0.3 && y < 0.78 && chroma < 0.16 && brightness > 0.52) return "paper";
  if (id === "weapon-rack" && y < 0.69 && b > r * 0.98 && g > r * 0.97 && brightness > 0.19) return "iron";
  if (id === "wagon" && y < 0.31 && chroma < 0.055 && brightness < 0.31) return "iron";
  const merchandise = ((g > r * 0.95 && g > b * 1.25) || b > r * 1.15 || (r > g * 1.8 && r > 0.65)) && y < canopyHeight;
  return merchandise ? "paint" : "wood";
}

function partitionSurfaces(mesh: Mesh, id: CityPropId, source: MeshStandardMaterial): PropSurface[] {
  const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const pixels = sourcePixels(source);
  const buckets = new Map<PropSurface, number[]>();
  const detailUv = new Float32Array(position.count * 2);
  for (let face = 0; face < position.count; face += 3) {
    const average = (attribute: typeof position, axis: number) => (attribute.getComponent(face, axis) + attribute.getComponent(face + 1, axis) + attribute.getComponent(face + 2, axis)) / 3;
    const kind = classifySurface(id, average(uv, 0), average(uv, 1), average(position, 0), average(position, 1), average(position, 2), pixels);
    const indices = buckets.get(kind) ?? [];
    indices.push(face, face + 1, face + 2);
    buckets.set(kind, indices);
    const scale = kind === "paint" || kind === "paper" ? 1 : detailScale[kind];
    for (let vertex = face; vertex < face + 3; vertex++) {
      detailUv[vertex * 2] = uv.getX(vertex) * scale;
      detailUv[vertex * 2 + 1] = uv.getY(vertex) * scale;
    }
  }
  geometry.setAttribute("uv1", new Float32BufferAttribute(detailUv, 2));
  const indices: number[] = [];
  geometry.clearGroups();
  const kinds = [...buckets.keys()];
  for (const [materialIndex, kind] of kinds.entries()) {
    const faces = buckets.get(kind)!;
    geometry.addGroup(indices.length, faces.length, materialIndex);
    indices.push(...faces);
  }
  geometry.setIndex(indices);
  mesh.geometry.dispose();
  mesh.geometry = geometry;
  mesh.userData.citySurfaceTriangles = Object.fromEntries([...buckets].map(([kind, faces]) => [kind, faces.length / 3]));
  return kinds;
}

function makeSurfaceMaterial(source: MeshStandardMaterial, id: CityPropId, kind: PropSurface, maps?: CitySurfaceTextures): MeshStandardMaterial {
  const material = source.clone();
  material.name = `city-${id}-${kind}`;
  material.side = DoubleSide;
  material.metalness = kind === "iron" ? 0.72 : 0;
  material.roughness = kind === "paint" ? 0.9 : 1;
  if (!maps) return material;
  material.normalMap = maps.normal;
  material.normalScale = new Vector2(normalStrength[kind as CitySurfaceKind], normalStrength[kind as CitySurfaceKind]);
  material.roughnessMap = maps.roughness;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSurfaceAlbedo = { value: maps.albedo };
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D uSurfaceAlbedo;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
vec3 surfaceDetail = texture2D(uSurfaceAlbedo, vNormalMapUv).rgb;
float originalLight = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float detailLight = dot(surfaceDetail, vec3(0.2126, 0.7152, 0.0722));
${kind === "stone" ? `
vec3 mineral = mix(surfaceDetail, vec3(detailLight) * vec3(0.92, 0.98, 1.03), 0.74);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(originalLight) * vec3(0.9, 0.95, 1.0), 0.82);
diffuseColor.rgb *= mix(vec3(0.82), clamp(mineral * 3.0, vec3(0.65), vec3(1.4)), 0.72);` : kind === "wood" ? `
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(originalLight) * vec3(1.15, 1.02, 0.9), 0.5);
diffuseColor.rgb *= mix(0.72, 1.3, clamp(detailLight * 3.4, 0.0, 1.0));` : kind === "cloth" ? `
diffuseColor.rgb *= clamp(vec3(detailLight * 3.2), vec3(0.72), vec3(1.12));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), 0.12);` : `
diffuseColor.rgb = mix(diffuseColor.rgb, surfaceDetail * vec3(0.36, 0.39, 0.42), 0.62);`}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor, ${kind === "iron" ? "0.38, 0.76" : kind === "cloth" ? "0.88, 1.0" : kind === "wood" ? "0.69, 0.95" : "0.78, 0.98"});`);
  };
  material.customProgramCacheKey = () => `city-authored-surface-1-${kind}`;
  return material;
}

export async function applyCityPropMaterials(root: Object3D, id: CityPropId): Promise<void> {
  const meshes: Mesh<BufferGeometry, MeshStandardMaterial>[] = [];
  root.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
  await Promise.all(meshes.map(async (mesh) => {
    const source = mesh.material;
    if (source.map) {
      source.map.colorSpace = SRGBColorSpace;
      source.map.anisotropy = 8;
    }
    const kinds = partitionSurfaces(mesh, id, source);
    const materials = await Promise.all(kinds.map(async (kind) => makeSurfaceMaterial(source, id, kind,
      kind === "paint" || kind === "paper" ? undefined : await loadCitySurfaceTextures(kind))));
    (mesh as Mesh).material = materials.length === 1 ? materials[0]! : materials;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    source.dispose();
  }));
}

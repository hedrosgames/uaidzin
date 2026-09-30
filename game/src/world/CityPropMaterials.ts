import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace, type Texture } from "three";
import type { CityPropId } from "./CityProps";
import type { CitySurfaceKind } from "./CityMaterialTextures";
import { loadCityPaintedTexture } from "./CityPaintedMaterials";
import { stampAnisotropy } from "../presentation/rendering/GraphicsQuality";

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

const surfaceIds: Record<PropSurface, number> = { stone: 0, wood: 1, cloth: 2, iron: 3, paint: 4, paper: 5 };

function assignSurfaceKinds(mesh: Mesh, id: CityPropId, source: MeshStandardMaterial): void {
  const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const pixels = sourcePixels(source);
  const surfaces = new Float32Array(position.count);
  for (let face = 0; face < position.count; face += 3) {
    const average = (attribute: typeof position, axis: number) => (attribute.getComponent(face, axis) + attribute.getComponent(face + 1, axis) + attribute.getComponent(face + 2, axis)) / 3;
    const kind = classifySurface(id, average(uv, 0), average(uv, 1), average(position, 0), average(position, 1), average(position, 2), pixels);
    surfaces.fill(surfaceIds[kind], face, face + 3);
  }
  geometry.setAttribute("citySurface", new Float32BufferAttribute(surfaces, 1));
  geometry.setIndex(Array.from({ length: position.count }, (_, index) => index));
  geometry.clearGroups();
  mesh.geometry.dispose();
  mesh.geometry = geometry;
}

function makeSurfaceMaterial(source: MeshStandardMaterial, id: CityPropId, paint: Texture): MeshStandardMaterial {
  const material = source.clone();
  material.name = `city-painted-${id}`;
  material.side = DoubleSide;
  material.metalness = 0;
  material.roughness = 1;
  material.normalMap = null;
  material.roughnessMap = null;
  material.metalnessMap = null;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.cityPaint = { value: paint };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute float citySurface;\nvarying float vCitySurface;\nvarying vec2 vCityPaintUv;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCitySurface = citySurface;\nvCityPaintUv = uv * 2.0;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D cityPaint;\nvarying float vCitySurface;\nvarying vec2 vCityPaintUv;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
vec3 pigment = texture2D(cityPaint, vCityPaintUv).rgb;
float originalTone = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
float paintedShade = clamp(pow(max(originalTone, 0.001), 0.28) * 1.35, 0.58, 1.04);
if (vCitySurface < 0.5) {
  diffuseColor.rgb = pigment * paintedShade * vec3(0.88, 0.88, 0.97);
} else if (vCitySurface < 1.5) {
  diffuseColor.rgb = mix(pigment * paintedShade, sqrt(max(diffuseColor.rgb, vec3(0.0))) * vec3(0.75, 0.68, 0.64), 0.32);
} else if (vCitySurface < 2.5) {
  diffuseColor.rgb = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(0.72));
  diffuseColor.rgb = mix(diffuseColor.rgb, floor(diffuseColor.rgb * 9.0 + 0.5) / 9.0, 0.16);
} else if (vCitySurface < 3.5) {
  diffuseColor.rgb = mix(vec3(0.085, 0.10, 0.16), vec3(0.30, 0.33, 0.40), paintedShade * 0.6);
} else {
  diffuseColor.rgb = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(0.82));
}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = vCitySurface > 2.5 && vCitySurface < 3.5 ? 0.28 : 0.0;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = vCitySurface > 2.5 && vCitySurface < 3.5 ? 0.72 : 1.0;");
  };
  material.customProgramCacheKey = () => "city-painted-prop-1";
  return material;
}

export async function applyCityPropMaterials(root: Object3D, id: CityPropId): Promise<void> {
  const stone = id === "wall" || id === "fountain" || id === "fountain-simple";
  const paint = await loadCityPaintedTexture(stone ? "stone" : "wood");
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const mesh = object as Mesh<BufferGeometry, MeshStandardMaterial>;
    const source = mesh.material;
    if (source.map) {
      source.map.colorSpace = SRGBColorSpace;
      stampAnisotropy(source.map);
    }
    assignSurfaceKinds(mesh, id, source);
    mesh.material = makeSurfaceMaterial(source, id, paint);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    source.dispose();
  });
}

import {
  CanvasTexture,
  Color,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  NoColorSpace,
  Object3D,
  type IUniform,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from "three";

type BodyUniforms = {
  uArmorAura: IUniform<number>;
  uTime: IUniform<number>;
  uAuraColor: IUniform<Color>;
};

const BODY_CACHE = "uaidzin-aura-body-v39-emap";

function srgbToLin(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function goldScoreLin(r: number, g: number, b: number): number {
  let score = smoothstep(0.055, 0.12, g - b);
  score *= smoothstep(0.12, 0.25, r - b);
  score *= 1 - smoothstep(0.11, 0.2, b);
  score *= smoothstep(0.12, 0.22, r);
  score *= smoothstep(0.08, 0.16, g);
  score *= 1 - smoothstep(0.12, 0.22, r - g);
  score *= 1 - smoothstep(0.45, 0.7, b / Math.max(r, 1e-4));
  return Math.min(1, Math.max(0, score));
}

function buildGoldMaskTexture(source: Texture): Texture | null {
  const img = source.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | { width: number; height: number }
    | undefined;
  if (!img || !("width" in img) || !img.width) return null;

  const w = img.width;
  const h = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(img as CanvasImageSource, 0, 0);
  } catch {
    return null;
  }

  const imageData = ctx.getImageData(0, 0, w, h);
  const src = imageData.data;
  const raw = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      raw[y * w + x] = goldScoreLin(
        srgbToLin(src[i]!),
        srgbToLin(src[i + 1]!),
        srgbToLin(src[i + 2]!),
      );
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let keep = raw[y * w + x]! > 0.35;
      if (keep) {
        let neighbors = 0;
        let count = 0;
        for (let oy = -2; oy <= 2; oy++) {
          for (let ox = -2; ox <= 2; ox++) {
            const xx = x + ox;
            const yy = y + oy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            count++;
            if (raw[yy * w + xx]! > 0.28) neighbors++;
          }
        }
        keep = neighbors >= Math.floor(count * 0.7);
      }
      const v = keep ? 255 : 0;
      src[i] = v;
      src[i + 1] = v;
      src[i + 2] = v;
      src[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const mask = new CanvasTexture(canvas);
  mask.colorSpace = NoColorSpace;
  mask.flipY = source.flipY;
  mask.wrapS = source.wrapS;
  mask.wrapT = source.wrapT;
  mask.offset.copy(source.offset);
  mask.repeat.copy(source.repeat);
  mask.center.copy(source.center);
  mask.rotation = source.rotation;
  mask.magFilter = NearestFilter;
  mask.minFilter = NearestFilter;
  mask.generateMipmaps = false;
  mask.needsUpdate = true;
  return mask;
}

export class ArmorAura {
  private readonly bodyUniforms: BodyUniforms[] = [];
  private readonly maskTextures: Texture[] = [];
  private enabled = false;
  private time = 0;
  private readonly auraColor = new Color(0xff1a1a);

  apply(model: Object3D): void {
    this.disposeMasks();
    this.bodyUniforms.length = 0;
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name === "ArmorAuraShell") {
        mesh.removeFromParent();
        const mat = mesh.material;
        if (mat && !Array.isArray(mat)) mat.dispose();
        return;
      }
      if (!mesh.geometry) return;
      this.hookBody(mesh);
    });
    this.syncEnabled();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.syncEnabled();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getShellCount(): number {
    return 0;
  }

  update(dt: number): void {
    if (!this.enabled) return;
    this.time += dt;
    for (const u of this.bodyUniforms) u.uTime.value = this.time;
  }

  private disposeMasks(): void {
    for (const t of this.maskTextures) t.dispose();
    this.maskTextures.length = 0;
  }

  private syncEnabled(): void {
    const v = this.enabled ? 1 : 0;
    for (const u of this.bodyUniforms) u.uArmorAura.value = v;
  }

  private hookBody(source: Mesh): void {
    const mats = Array.isArray(source.material) ? source.material : [source.material];
    for (const mat of mats) {
      if (!mat || !(mat instanceof MeshStandardMaterial)) continue;
      if (!mat.map) continue;

      const maskTex = buildGoldMaskTexture(mat.map);
      if (!maskTex) continue;
      this.maskTextures.push(maskTex);

      mat.emissiveMap = maskTex;
      mat.emissive.set(0, 0, 0);
      mat.emissiveIntensity = 1;

      const local: BodyUniforms = {
        uArmorAura: { value: this.enabled ? 1 : 0 },
        uTime: { value: this.time },
        uAuraColor: { value: this.auraColor.clone() },
      };
      this.bodyUniforms.push(local);

      mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
        shader.uniforms.uArmorAura = local.uArmorAura;
        shader.uniforms.uTime = local.uTime;
        shader.uniforms.uAuraColor = local.uAuraColor;

        shader.fragmentShader = shader.fragmentShader.replace(
          "void main() {",
          `
uniform float uArmorAura;
uniform float uTime;
uniform vec3 uAuraColor;
float auraHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float auraNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = auraHash(i);
  float b = auraHash(i + vec2(1.0, 0.0));
  float c = auraHash(i + vec2(0.0, 1.0));
  float d = auraHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float auraFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * auraNoise(p);
    p = p * 2.15 + vec2(7.1, 3.3);
    a *= 0.5;
  }
  return v;
}
void main() {
`,
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
if (uArmorAura > 0.001) {
#if defined( USE_EMISSIVEMAP )
  float goldM = texture2D( emissiveMap, vEmissiveMapUv ).r;
#else
  float goldM = 0.0;
#endif
  if (goldM > 0.5) {
    vec3 nDir = normalize(normal);
    vec3 vDir = normalize(vViewPosition);
    float facing = clamp(dot(vDir, nDir), 0.0, 1.0);
    float plate = smoothstep(0.05, 0.5, facing);
    vec2 nUv = vEmissiveMapUv * 16.0;
    nUv.y -= uTime * 1.35;
    float n1 = auraFbm(nUv);
    float n2 = auraFbm(nUv * 1.7 + vec2(uTime * 0.3, -uTime * 0.22));
    float swirl = smoothstep(0.25, 0.75, n1 * 0.6 + n2 * 0.5);
    float glow = plate * (0.7 + swirl * 1.6);
    float rim = pow(1.0 - facing, 2.8) * plate;
    totalEmissiveRadiance += uAuraColor * goldM * (glow * 3.2 + rim * 1.6);
  }
}
`,
        );
      };
      mat.customProgramCacheKey = () => BODY_CACHE;
      mat.needsUpdate = true;
    }
  }
}

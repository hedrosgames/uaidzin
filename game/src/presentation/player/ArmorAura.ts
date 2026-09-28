import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type IUniform,
  type WebGLProgramParametersWithUniforms,
} from "three";

type AuraUniforms = {
  uAura: IUniform<number>;
  uTime: IUniform<number>;
  uAuraColor: IUniform<Color>;
};

type PoolBolt = {
  line: Line;
  geometry: BufferGeometry;
  attr: BufferAttribute;
  positions: Float32Array;
  material: LineBasicMaterial;
  life: number;
  maxLife: number;
  active: boolean;
};

const CACHE_KEY = "uaidzin-weapon-aura-v2";
const BOLT_POOL = 14;
const MAX_VERTS = 12;
const BOLT_SPAWN_CHANCE = 0.48;

export class ArmorAura {
  private readonly uniforms: AuraUniforms[] = [];
  private readonly roots: Object3D[] = [];
  private readonly boltPool: PoolBolt[] = [];
  private enabled = false;
  private time = 0;
  private spawnAcc = 0;
  private readonly auraColor = new Color(0xff1a1a);
  private readonly tmpA = new Vector3();
  private readonly tmpC = new Vector3();

  constructor() {
    for (let i = 0; i < BOLT_POOL; i++) {
      const positions = new Float32Array(MAX_VERTS * 3);
      const attr = new BufferAttribute(positions, 3);
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", attr);
      const material = new LineBasicMaterial({
        color: 0xff2200,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new Line(geometry, material);
      line.frustumCulled = false;
      line.renderOrder = 40;
      this.boltPool.push({
        line,
        geometry,
        attr,
        positions,
        material,
        life: 0,
        maxLife: 0,
        active: false,
      });
    }
  }

  apply(roots: Object3D[]): void {
    this.clearBolts();
    this.uniforms.length = 0;
    this.roots.length = 0;
    for (const root of roots) {
      this.roots.push(root);
      root.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        this.hookMesh(mesh);
      });
    }
    this.syncEnabled();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.syncEnabled();
    if (!on) this.clearBolts();
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
    for (const u of this.uniforms) u.uTime.value = this.time;
    this.updateBolts(dt);
    this.spawnAcc += dt;
    if (this.spawnAcc >= 0.05) {
      this.spawnAcc = 0;
      if (Math.random() < BOLT_SPAWN_CHANCE) this.trySpawnBolt();
    }
  }

  private syncEnabled(): void {
    const v = this.enabled ? 1 : 0;
    for (const u of this.uniforms) u.uAura.value = v;
  }

  private clearBolts(): void {
    for (let i = 0; i < this.boltPool.length; i++) {
      const b = this.boltPool[i]!;
      if (b.active) {
        b.line.removeFromParent();
        b.active = false;
      }
    }
  }

  private updateBolts(dt: number): void {
    for (let i = 0; i < this.boltPool.length; i++) {
      const b = this.boltPool[i]!;
      if (!b.active) continue;
      b.life += dt;
      const t = b.life / b.maxLife;
      b.material.opacity = (1 - t) * (0.55 + 0.45 * Math.sin(this.time * 40 + i));
      if (b.life >= b.maxLife) {
        b.line.removeFromParent();
        b.active = false;
      }
    }
  }

  private trySpawnBolt(): void {
    if (this.roots.length === 0) return;
    let bolt: PoolBolt | null = null;
    for (let i = 0; i < this.boltPool.length; i++) {
      if (!this.boltPool[i]!.active) {
        bolt = this.boltPool[i]!;
        break;
      }
    }
    if (!bolt) return;

    const root = this.roots[(Math.random() * this.roots.length) | 0]!;
    const len = 0.28 + Math.random() * 0.5;
    const dir = this.tmpC.set(
      Math.random() * 2 - 1,
      Math.random() * 1.6 - 0.1,
      Math.random() * 2 - 1,
    ).normalize();
    const origin = this.tmpA.set(
      (Math.random() - 0.5) * 0.12,
      Math.random() * 0.55,
      (Math.random() - 0.5) * 0.12,
    );

    const segs = 6 + ((Math.random() * 4) | 0);
    const positions = bolt.positions;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const jitter = i === 0 || i === segs ? 0 : 0.035 + Math.random() * 0.06;
      positions[i * 3] = origin.x + dir.x * len * t + (Math.random() * 2 - 1) * jitter;
      positions[i * 3 + 1] = origin.y + dir.y * len * t + (Math.random() * 2 - 1) * jitter;
      positions[i * 3 + 2] = origin.z + dir.z * len * t + (Math.random() * 2 - 1) * jitter;
    }

    bolt.geometry.setDrawRange(0, segs + 1);
    bolt.attr.needsUpdate = true;
    bolt.life = 0;
    bolt.maxLife = 0.07 + Math.random() * 0.11;
    bolt.active = true;
    root.add(bolt.line);
  }

  private hookMesh(mesh: Mesh): void {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next: MeshStandardMaterial[] = [];
    for (const mat of mats) {
      if (!mat) continue;
      const std =
        mat instanceof MeshStandardMaterial
          ? mat.clone()
          : new MeshStandardMaterial({
              color: 0xffffff,
              side: DoubleSide,
              roughness: 0.45,
              metalness: 0.15,
            });
      this.hookMaterial(std);
      next.push(std);
    }
    if (next.length === 0) return;
    mesh.material = next.length === 1 ? next[0]! : next;
  }

  private hookMaterial(mat: MeshStandardMaterial): void {
    const local: AuraUniforms = {
      uAura: { value: this.enabled ? 1 : 0 },
      uTime: { value: this.time },
      uAuraColor: { value: this.auraColor.clone() },
    };
    this.uniforms.push(local);

    mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uAura = local.uAura;
      shader.uniforms.uTime = local.uTime;
      shader.uniforms.uAuraColor = local.uAuraColor;

      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `
uniform float uAura;
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
  for (int i = 0; i < 4; i++) {
    v += a * auraNoise(p);
    p = p * 2.2 + vec2(9.2, 4.1);
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
if (uAura > 0.001) {
  vec3 nDir = normalize(normal);
  vec3 vDir = normalize(vViewPosition);
  float facing = clamp(abs(dot(vDir, nDir)), 0.0, 1.0);
  float rim = pow(1.0 - facing, 1.8);
  vec2 flow = vec2(uTime * 2.6, -uTime * 3.4);
  float n1 = auraFbm(vViewPosition.xy * 0.7 + flow);
  float n2 = auraFbm(vViewPosition.xy * 1.45 - flow.yx * 1.5 + vec2(uTime * 0.4));
  float n3 = auraFbm(vViewPosition.yz * 0.9 + flow.yx * 0.8);
  float pulse = 0.5 + 0.5 * sin(uTime * 8.0 + n1 * 10.0);
  float vein = smoothstep(0.28, 0.78, n1 * 0.4 + n2 * 0.35 + n3 * 0.35);
  float arc = smoothstep(0.55, 0.9, abs(sin(n1 * 14.0 + uTime * 12.0))) * vein;
  float surge = smoothstep(0.7, 0.95, n2) * (0.6 + 0.4 * sin(uTime * 18.0));
  float body = 0.85 + vein * 1.6 + arc * 2.6 + surge * 1.4;
  totalEmissiveRadiance += uAuraColor * (body * pulse + rim * 2.4);
  diffuseColor.rgb = mix(diffuseColor.rgb, uAuraColor * 0.75, 0.72 + vein * 0.2);
}
`,
      );
    };
    mat.customProgramCacheKey = () => CACHE_KEY;
    mat.needsUpdate = true;
  }
}

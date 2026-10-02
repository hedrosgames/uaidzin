import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  Scene,
  Texture,
  TextureLoader,
  Vector3,
} from "three";
import type { TkLightPool } from "../TkLightPool";
import { createCanvasTexture } from "../vfxKit/canvasTexture";
import { BM_ATLAS_DEFS, type BmAtlasDef, type BmDedicatedVfxId } from "./BmAtlasDefs";

const FORWARD = new Vector3(0, 0, 1);
const GRID = 4;
const FRAME_STEP = 1 / GRID;

function createFallbackAtlas(): Texture {
  return createCanvasTexture(128, 128, (context) => {
    context.clearRect(0, 0, 128, 128);
    for (let frame = 0; frame < 16; frame += 1) {
      const col = frame % GRID;
      const row = Math.floor(frame / GRID);
      const x = col * 32;
      const y = row * 32;
      const alpha = 0.35 + (frame / 15) * 0.55;
      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.beginPath();
      context.ellipse(x + 16, y + 16, 10 + frame * 0.2, 6 + frame * 0.15, 0, 0, Math.PI * 2);
      context.fill();
    }
  });
}

type AtlasBundle = {
  texture: Texture;
  geometry: PlaneGeometry;
  material: MeshBasicMaterial;
  glowMaterial: MeshBasicMaterial;
};

class BmAtlasCast {
  private readonly root = new Group();
  private readonly mesh: Mesh;
  private readonly glow: Mesh;
  private readonly light: PointLight | null;
  private readonly tint = new Color();
  private readonly direction = new Vector3();
  private readonly travelEnd = new Vector3();
  private readonly from = new Vector3();
  private elapsed = 0;
  private disposed = false;

  constructor(
    private readonly castRoot: Group,
    private readonly def: BmAtlasDef,
    bundle: AtlasBundle,
    origin: Vector3,
    target: Vector3,
    private readonly radius: number,
    private readonly onDispose: (cast: BmAtlasCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.tint.setHex(def.tint);
    this.from.copy(origin);
    this.from.y += def.heightOffset;
    this.travelEnd.copy(target);
    if (def.mode === "aoe" || def.mode === "self" || def.mode === "summon") {
      this.travelEnd.copy(origin);
    }
    this.travelEnd.y = this.from.y;
    this.direction.copy(this.travelEnd).sub(this.from);
    if (this.direction.lengthSq() < 1e-6) {
      this.direction.set(0, 0, 1);
    } else {
      this.direction.normalize();
    }

    const sizeW = def.mode === "aoe" ? Math.max(def.width, this.radius * 1.6) : def.width;
    const sizeH = def.mode === "aoe" ? Math.max(def.height, this.radius * 1.6) : def.height;
    const map = bundle.texture.clone();
    map.needsUpdate = true;
    map.repeat.set(FRAME_STEP, FRAME_STEP);

    const mainMat = bundle.material.clone();
    mainMat.map = map;
    mainMat.color.copy(this.tint);
    mainMat.blending = def.additive ? AdditiveBlending : NormalBlending;

    const glowMat = bundle.glowMaterial.clone();
    glowMat.map = map;
    glowMat.color.copy(this.tint);
    glowMat.opacity = 0.28;

    this.mesh = new Mesh(bundle.geometry, mainMat);
    this.mesh.name = `bm-atlas-${def.dedicatedId}`;
    this.mesh.scale.set(sizeW, sizeH, 1);

    this.glow = new Mesh(bundle.geometry, glowMat);
    this.glow.scale.set(sizeW * 1.18, sizeH * 1.18, 1);

    this.root.name = `bm-cast-${def.dedicatedId}`;
    this.root.position.copy(this.from);
    if (def.mode === "aoe") {
      this.root.rotation.x = -Math.PI / 2;
    } else if (def.mode === "directed" || def.travel) {
      this.root.quaternion.setFromUnitVectors(FORWARD, this.direction);
    }
    this.root.add(this.mesh);
    this.root.add(this.glow);
    castRoot.add(this.root);

    this.light = lightPool
      ? lightPool.acquire(def.tint, 4)
      : new PointLight(def.tint, 0, 4, 2);
    if (this.light) {
      this.light.intensity = 0;
      this.root.add(this.light);
    }
    this.applyFrame(0);
  }

  private applyFrame(frame: number): void {
    const clamped = MathUtils.clamp(Math.floor(frame), 0, Math.max(0, this.def.frameCount - 1));
    const col = clamped % GRID;
    const row = Math.floor(clamped / GRID);
    const u = col * FRAME_STEP;
    const v = 1 - (row + 1) * FRAME_STEP;
    const mats = [
      this.mesh.material as MeshBasicMaterial,
      this.glow.material as MeshBasicMaterial,
    ];
    for (const mat of mats) {
      if (!mat.map) continue;
      mat.map.repeat.set(FRAME_STEP, FRAME_STEP);
      mat.map.offset.set(u, v);
      mat.map.needsUpdate = true;
      mat.needsUpdate = true;
    }
  }

  update(dt: number): boolean {
    if (this.disposed) return false;
    this.elapsed += dt;
    const t = MathUtils.clamp(this.elapsed / this.def.duration, 0, 1);
    const frame = t * (this.def.frameCount - 0.001);
    this.applyFrame(frame);

    let opacity = 1;
    if (t < 0.12) opacity = t / 0.12;
    else if (t > 0.72) opacity = MathUtils.clamp((1 - t) / 0.28, 0, 1);

    (this.mesh.material as MeshBasicMaterial).opacity = opacity;
    (this.glow.material as MeshBasicMaterial).opacity = opacity * 0.32;

    if (this.def.travel && this.def.mode === "directed") {
      this.root.position.lerpVectors(this.from, this.travelEnd, MathUtils.smoothstep(t, 0, 1));
    } else if (this.def.mode === "summon" || this.def.mode === "self") {
      const pulse = 0.92 + Math.sin(t * Math.PI) * 0.12;
      this.mesh.scale.set(this.def.width * pulse, this.def.height * pulse, 1);
      this.glow.scale.set(this.def.width * pulse * 1.18, this.def.height * pulse * 1.18, 1);
    } else if (this.def.mode === "aoe") {
      const grow = 0.55 + t * 0.7;
      const base = Math.max(this.def.width, this.radius * 1.6);
      this.mesh.scale.set(base * grow, base * grow, 1);
      this.glow.scale.set(base * grow * 1.12, base * grow * 1.12, 1);
    }

    if (this.light) {
      const peak = this.def.lightPeak;
      this.light.intensity = t < 0.55
        ? MathUtils.lerp(0, peak, t / 0.55)
        : MathUtils.lerp(peak, 0, (t - 0.55) / 0.45);
    }

    if (t >= 1) {
      this.dispose();
      return false;
    }
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.light) {
      this.root.remove(this.light);
      if (this.lightPool) this.lightPool.release(this.light);
      else {
        this.light.dispose();
      }
    }
    const mainMat = this.mesh.material as MeshBasicMaterial;
    const glowMat = this.glow.material as MeshBasicMaterial;
    const map = mainMat.map;
    mainMat.dispose();
    glowMat.dispose();
    map?.dispose();
    this.castRoot.remove(this.root);
    this.onDispose(this);
  }
}

export class BmAtlasVfxController {
  private readonly castRoot = new Group();
  private readonly casts = new Set<BmAtlasCast>();
  private readonly bundles = new Map<string, AtlasBundle>();
  private readonly loader = new TextureLoader();
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly lightPool?: TkLightPool,
  ) {
    this.castRoot.name = "bm-atlas-root";
    this.scene.add(this.castRoot);
  }

  private bundleFor(def: BmAtlasDef): AtlasBundle {
    let bundle = this.bundles.get(def.skillId);
    if (bundle) return bundle;
    const texture = createFallbackAtlas();
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
    texture.minFilter = texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.repeat.set(FRAME_STEP, FRAME_STEP);
    if (typeof Image !== "undefined") {
      this.loader.load(def.atlasUrl, (loaded) => {
        texture.image = loaded.image;
        texture.needsUpdate = true;
      }, undefined, () => {});
    }
    const geometry = new PlaneGeometry(1, 1);
    const material = new MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    const glowMaterial = material.clone();
    glowMaterial.opacity = 0.28;
    bundle = { texture, geometry, material, glowMaterial };
    this.bundles.set(def.skillId, bundle);
    return bundle;
  }

  cast(
    dedicatedId: BmDedicatedVfxId,
    origin: Vector3,
    target: Vector3,
    radius = 1,
  ): void {
    if (this.disposed) return;
    const def = BM_ATLAS_DEFS[dedicatedId];
    if (!def) return;
    while (this.casts.size >= def.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value;
      oldest?.dispose();
    }
    const cast = new BmAtlasCast(
      this.castRoot,
      def,
      this.bundleFor(def),
      origin,
      target,
      Math.max(0.5, radius),
      (item) => this.casts.delete(item),
      this.lightPool,
    );
    this.casts.add(cast);
  }

  update(dt: number, _width?: number, _height?: number): void {
    if (this.disposed || this.casts.size === 0) return;
    for (const cast of [...this.casts]) {
      cast.update(dt);
    }
  }

  clear(): void {
    for (const cast of [...this.casts]) cast.dispose();
    this.casts.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    for (const bundle of this.bundles.values()) {
      bundle.texture.dispose();
      bundle.geometry.dispose();
      bundle.material.dispose();
      bundle.glowMaterial.dispose();
    }
    this.bundles.clear();
    this.scene.remove(this.castRoot);
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    return this.casts.size * 2;
  }
}

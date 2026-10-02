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
import { HT_ATLAS_DEFS, type HtAtlasDef, type HtDedicatedVfxId } from "./HtAtlasDefs";

const ARROW_FORWARD = new Vector3(1, 0, 0);
const GRID = 4;
const FRAME_STEP = 1 / GRID;

type AtlasBundle = {
  texture: Texture;
  geometry: PlaneGeometry;
  material: MeshBasicMaterial;
  glowMaterial: MeshBasicMaterial;
};

class HtAtlasCast {
  private readonly root = new Group();
  private readonly mesh: Mesh;
  private readonly crossMesh: Mesh | null = null;
  private readonly glow: Mesh;
  private readonly light: PointLight | null;
  private readonly tint = new Color();
  private readonly direction = new Vector3();
  private readonly travelEnd = new Vector3();
  private readonly from = new Vector3();
  private readonly map: Texture;
  private elapsed = 0;
  private disposed = false;

  constructor(
    private readonly castRoot: Group,
    private readonly def: HtAtlasDef,
    bundle: AtlasBundle,
    origin: Vector3,
    target: Vector3,
    private readonly radius: number,
    private readonly onDispose: (cast: HtAtlasCast) => void,
    private readonly lightPool?: TkLightPool,
    delaySec = 0,
    offsetSpread = 0,
  ) {
    this.elapsed = -delaySec;
    this.tint.setHex(def.tint);

    if (def.mode === "directed" && !def.travel) {
      this.from.copy(target);
      this.from.y += def.heightOffset;
      this.travelEnd.copy(this.from);
      this.direction.copy(target).sub(origin);
      if (this.direction.lengthSq() < 1e-6) {
        this.direction.set(0, 0, 1);
      } else {
        this.direction.normalize();
      }
    } else {
      this.from.copy(origin);
      this.from.y += def.heightOffset;
      this.travelEnd.copy(target);
      if (def.mode === "aoe" || def.mode === "self") {
        this.travelEnd.copy(origin);
      }
      this.travelEnd.y = this.from.y;
      this.direction.copy(this.travelEnd).sub(this.from);
      if (this.direction.lengthSq() < 1e-6) {
        this.direction.set(0, 0, 1);
      } else {
        this.direction.normalize();
      }
    }

    if (offsetSpread !== 0) {
      const side = new Vector3(-this.direction.z, 0, this.direction.x).multiplyScalar(offsetSpread);
      this.from.add(side);
      this.travelEnd.add(side);
    }

    const sizeW = def.mode === "aoe" ? Math.max(def.width, this.radius * 1.6) : def.width;
    const sizeH = def.mode === "aoe" ? Math.max(def.height, this.radius * 1.6) : def.height;

    this.map = bundle.texture.clone();
    this.map.repeat.set(FRAME_STEP, FRAME_STEP);

    const mainMat = bundle.material.clone();
    mainMat.map = this.map;
    mainMat.color.copy(this.tint);
    mainMat.blending = def.additive ? AdditiveBlending : NormalBlending;

    const glowMat = bundle.glowMaterial.clone();
    glowMat.map = this.map;
    glowMat.color.copy(this.tint);
    glowMat.opacity = 0.28;

    this.mesh = new Mesh(bundle.geometry, mainMat);
    this.mesh.name = `ht-atlas-${def.dedicatedId}`;
    this.mesh.scale.set(sizeW, sizeH, 1);

    this.glow = new Mesh(bundle.geometry, glowMat);
    this.glow.scale.set(sizeW * 1.18, sizeH * 1.18, 1);

    this.root.name = `ht-cast-${def.dedicatedId}`;
    this.root.position.copy(this.from);

    if (def.mode === "aoe") {
      this.root.rotation.x = -Math.PI / 2;
    } else if (def.mode === "directed" || def.travel) {
      this.root.quaternion.setFromUnitVectors(ARROW_FORWARD, this.direction);
      if (def.crossPlane) {
        const crossMat = mainMat.clone();
        this.crossMesh = new Mesh(bundle.geometry, crossMat);
        this.crossMesh.scale.set(sizeW, sizeH, 1);
        this.crossMesh.rotation.x = Math.PI / 2;
        this.root.add(this.crossMesh);
      }
    }

    this.root.add(this.mesh);
    this.root.add(this.glow);
    this.root.visible = delaySec <= 0;
    castRoot.add(this.root);

    this.light = lightPool
      ? lightPool.acquire(def.tint, Math.max(3.5, sizeW * 1.2))
      : new PointLight(def.tint, 0, Math.max(3.5, sizeW * 1.2), 2);
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
    this.map.offset.set(u, v);
  }

  update(dt: number): boolean {
    if (this.disposed) return false;
    this.elapsed += dt;
    if (this.elapsed < 0) {
      this.root.visible = false;
      return true;
    }
    this.root.visible = true;

    const t = MathUtils.clamp(this.elapsed / this.def.duration, 0, 1);
    const frame = t * (this.def.frameCount - 0.001);
    this.applyFrame(frame);

    let opacity = 1;
    if (t < 0.1) opacity = t / 0.1;
    else if (t > 0.72) opacity = MathUtils.clamp((1 - t) / 0.28, 0, 1);

    (this.mesh.material as MeshBasicMaterial).opacity = opacity;
    (this.glow.material as MeshBasicMaterial).opacity = opacity * 0.32;
    if (this.crossMesh) {
      (this.crossMesh.material as MeshBasicMaterial).opacity = opacity * 0.85;
    }

    if (this.def.travel && this.def.mode === "directed") {
      const flightEnd = 0.6;
      if (t < flightEnd) {
        this.root.position.lerpVectors(this.from, this.travelEnd, MathUtils.smoothstep(t / flightEnd, 0, 1));
      } else {
        this.root.position.copy(this.travelEnd);
      }
    } else if (this.def.mode === "self") {
      const pulse = 0.94 + Math.sin(t * Math.PI) * 0.1;
      this.mesh.scale.set(this.def.width * pulse, this.def.height * pulse, 1);
      this.glow.scale.set(this.def.width * pulse * 1.18, this.def.height * pulse * 1.18, 1);
    } else if (this.def.mode === "aoe") {
      const grow = 0.6 + t * 0.65;
      const base = Math.max(this.def.width, this.radius * 1.6);
      this.mesh.scale.set(base * grow, base * grow, 1);
      this.glow.scale.set(base * grow * 1.12, base * grow * 1.12, 1);
    }

    if (this.light) {
      const peak = this.def.lightPeak;
      this.light.intensity = t < 0.5
        ? MathUtils.lerp(0, peak, t / 0.5)
        : MathUtils.lerp(peak, 0, (t - 0.5) / 0.5);
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
      else this.light.dispose();
    }
    const mainMat = this.mesh.material as MeshBasicMaterial;
    const glowMat = this.glow.material as MeshBasicMaterial;
    mainMat.dispose();
    glowMat.dispose();
    if (this.crossMesh) {
      (this.crossMesh.material as MeshBasicMaterial).dispose();
    }
    this.map.dispose();
    this.castRoot.remove(this.root);
    this.onDispose(this);
  }
}

export class HtAtlasVfxController {
  private readonly castRoot = new Group();
  private readonly casts = new Set<HtAtlasCast>();
  private readonly bundles = new Map<string, AtlasBundle>();
  private readonly loader = new TextureLoader();
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly lightPool?: TkLightPool,
  ) {
    this.castRoot.name = "ht-atlas-root";
    this.scene.add(this.castRoot);
  }

  private bundleFor(def: HtAtlasDef): AtlasBundle {
    let bundle = this.bundles.get(def.skillId);
    if (bundle) return bundle;
    const texture = this.loader.load(def.atlasUrl);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
    texture.minFilter = texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.repeat.set(FRAME_STEP, FRAME_STEP);
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
    dedicatedId: HtDedicatedVfxId,
    origin: Vector3,
    target: Vector3,
    radius = 1,
  ): void {
    if (this.disposed) return;
    const def = HT_ATLAS_DEFS[dedicatedId];
    if (!def) return;

    const count = def.burstCount;
    while (this.casts.size + count > def.maxConcurrentCasts + (count > 1 ? count : 0)) {
      const oldest = this.casts.values().next().value;
      if (!oldest) break;
      oldest.dispose();
    }

    const bundle = this.bundleFor(def);
    const effectiveRadius = Math.max(0.5, radius);

    if (count > 1) {
      for (let index = 0; index < count; index++) {
        const delay = index * 0.07;
        const spread = (index - (count - 1) / 2) * 0.22;
        const cast = new HtAtlasCast(
          this.castRoot,
          def,
          bundle,
          origin,
          target,
          effectiveRadius,
          (item) => this.casts.delete(item),
          this.lightPool,
          delay,
          spread,
        );
        this.casts.add(cast);
      }
      return;
    }

    const cast = new HtAtlasCast(
      this.castRoot,
      def,
      bundle,
      origin,
      target,
      effectiveRadius,
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

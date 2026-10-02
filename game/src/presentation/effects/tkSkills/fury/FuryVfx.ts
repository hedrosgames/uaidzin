import {
  Group, MathUtils, Mesh, Object3D, PointLight, Scene, ShaderMaterial, Vector2, Vector3,
  type BufferGeometry, type MeshBasicMaterial,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import type { TkLightPool } from "../../TkLightPool";
import { createFurySystems } from "./FuryParticleSystems";
import { FuryResources } from "./FuryResources";

export interface FuryVfxConfig {
  activationDuration: number;
  auraDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  ringRadius: number;
  emberEmission: number;
  lightPeak: number;
}

export const DEFAULT_FURY_VFX_CONFIG: FuryVfxConfig = {
  activationDuration: 8 / 60,
  auraDuration: 2,
  fadeDuration: 0.35,
  maxConcurrentCasts: 2,
  ringRadius: 0.95,
  emberEmission: 7,
  lightPeak: 1.65,
};

type FuryPhase = "activation" | "active" | "fade";
const STEP = 1 / 60;

function finiteVector(value: Vector3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

class FuryCast {
  private readonly root = new Group();
  private readonly ring: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly slashes: Mesh<BufferGeometry, MeshBasicMaterial>[] = [];
  private readonly particles: ReturnType<typeof createFurySystems>;
  private readonly systems: ParticleSystem[];
  private readonly anchorOffset = new Vector3();
  private readonly anchorPosition = new Vector3();
  private readonly light: PointLight | null;
  private elapsed = 0;
  private phase: FuryPhase = "activation";
  private phaseStartedAt = 0;
  private disposed = false;

  constructor(
    parent: Group,
    resources: FuryResources,
    private readonly config: FuryVfxConfig,
    center: Vector3,
    private readonly anchor: Object3D | undefined,
    private readonly onDispose: (cast: FuryCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.root.name = "fury-cast";
    this.root.position.copy(center);
    parent.add(this.root);
    if (anchor) this.anchorOffset.copy(center).sub(anchor.getWorldPosition(this.anchorPosition));
    this.particles = createFurySystems(resources, config);
    this.systems = Object.values(this.particles);
    for (const system of this.systems) this.root.add(system.emitter);
    this.ring = new Mesh(resources.groundGeometry, resources.materials.ground.clone());
    this.ring.name = "fury-pressure-ring";
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.035;
    this.ring.renderOrder = 8;
    this.root.add(this.ring);
    for (let index = 0; index < 3; index++) {
      const slash = new Mesh(resources.slashGeometry, (
        index === 2 ? resources.materials.accent : resources.materials.orbit
      ).clone());
      slash.name = `fury-orbit-slash-${index}`;
      slash.renderOrder = 10;
      this.root.add(slash);
      this.slashes.push(slash);
    }
    this.light = lightPool ? lightPool.acquire(0xff6645, 3.2) : new PointLight(0xff6645, 0, 3.2, 2);
    if (this.light) {
      this.light.position.y = 0.65;
      this.light.intensity = 0;
      this.root.add(this.light);
    }
    for (const system of [this.particles.main, this.particles.streaks, this.particles.edge, this.particles.pulse]) this.start(system);
    this.updateVisual();
    this.root.updateWorldMatrix(true, true);
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  getSystems(): ParticleSystem[] {
    return this.systems;
  }

  getPhase(): FuryPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      phaseStartedAt: this.phaseStartedAt,
      position: this.root.position.toArray(),
      followsCaster: Boolean(this.anchor),
      ring: { opacity: this.ring.material.opacity, scale: this.ring.scale.x },
      lightIntensity: this.light?.intensity ?? 0,
    };
  }

  followAnchor(): void {
    if (this.disposed || !this.anchor?.parent) return;
    this.anchor.getWorldPosition(this.anchorPosition);
    if (finiteVector(this.anchorPosition)) {
      this.root.position.copy(this.anchorPosition).add(this.anchorOffset);
      this.root.updateWorldMatrix(true, true);
    }
  }

  update(delta: number): void {
    if (this.disposed) return;
    this.elapsed += delta;
    const fadeAt = this.config.activationDuration + this.config.auraDuration;
    if (this.phase === "activation" && this.elapsed + 1e-9 >= this.config.activationDuration) {
      this.phase = "active";
      this.phaseStartedAt = this.config.activationDuration;
      this.start(this.particles.embers);
    }
    if (this.phase === "active" && this.elapsed + 1e-9 >= fadeAt) {
      this.phase = "fade";
      this.phaseStartedAt = fadeAt;
      for (const system of this.systems) system.endEmit();
    }
    this.updateVisual();
    this.root.updateWorldMatrix(true, true);
    if (this.elapsed + 1e-9 >= fadeAt + this.config.fadeDuration) this.dispose();
  }

  private updateVisual(): void {
    const activation = MathUtils.clamp(this.elapsed / this.config.activationDuration, 0, 1);
    const fadeAt = this.config.activationDuration + this.config.auraDuration;
    const fadeProgress = MathUtils.clamp((this.elapsed - fadeAt) / this.config.fadeDuration, 0, 1);
    const fade = (1 - fadeProgress) ** 2;
    const beat = (0.5 + 0.5 * Math.sin(this.elapsed * Math.PI * 3.6)) ** 3;
    const reveal = 1 - (1 - activation) ** 3;
    const shock = Math.sin(Math.min(1, this.elapsed / 0.38) * Math.PI);
    this.ring.scale.setScalar(this.config.ringRadius * (0.3 + reveal * 0.7 + beat * 0.035 + fadeProgress * 0.12));
    this.ring.rotation.z = this.elapsed * 0.32;
    this.ring.material.opacity = reveal * fade * (0.24 + beat * 0.11 + shock * 0.15);
    for (let index = 0; index < this.slashes.length; index++) {
      const slash = this.slashes[index]!;
      const stagger = index * Math.PI * 2 / 3;
      const wave = 0.5 + 0.5 * Math.sin(this.elapsed * 4 + stagger);
      const scale = this.config.ringRadius * (index === 2 ? 0.88 : 0.52) * (0.76 + reveal * 0.24 + wave * 0.045);
      slash.scale.setScalar(scale);
      slash.rotation.set(0.12 * Math.sin(stagger), -this.elapsed * (1.6 + index * 0.17) + stagger, 0.09 * Math.cos(stagger));
      slash.position.set(index === 2 ? 0 : (index === 0 ? -0.42 : 0.42), index === 2 ? 0.66 : 1.02 + wave * 0.07, 0);
      slash.material.opacity = reveal * fade * (index === 2 ? 0.12 + beat * 0.08 : 0.5 + wave * 0.2);
    }
    if (this.light) {
      this.light.intensity = this.config.lightPeak * fade * (
        this.phase === "activation" ? Math.sin(activation * Math.PI) : 0.09 + beat * 0.06
      );
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.endEmit();
      system.dispose();
    }
    this.ring.material.dispose();
    for (const slash of this.slashes) slash.material.dispose();
    if (this.lightPool) this.lightPool.release(this.light);
    else if (this.light) {
      this.light.removeFromParent();
      this.light.dispose();
    }
    this.root.removeFromParent();
    this.root.clear();
    this.onDispose(this);
  }
}

export class FuryVfxController {
  private readonly resources = new FuryResources();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly root = new Group();
  private readonly casts = new Set<FuryCast>();
  private readonly config: FuryVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<FuryVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    this.config = { ...DEFAULT_FURY_VFX_CONFIG };
    for (const key of Object.keys(this.config) as (keyof FuryVfxConfig)[]) {
      const value = config[key];
      if (value !== undefined && Number.isFinite(value)) {
        this.config[key] = Math.max(key === "emberEmission" || key === "lightPeak" ? 0 : STEP, value);
      }
    }
    this.config.maxConcurrentCasts = Math.max(1, Math.floor(this.config.maxConcurrentCasts));
    this.root.name = "fury-vfx-root";
    this.batchedRenderer.name = "fury-quarks";
    this.scene.add(this.root, this.batchedRenderer);
  }

  castFuria(center: Vector3, duration?: number, anchor?: Object3D): void {
    if (this.disposed) throw new Error("FuryVfxController descartado");
    if (!finiteVector(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) this.casts.values().next().value?.dispose();
    if (this.casts.size === 0) this.accumulator = 0;
    const auraDuration = duration !== undefined && Number.isFinite(duration)
      ? Math.max(STEP, duration)
      : this.config.auraDuration;
    const cast = new FuryCast(
      this.root, this.resources, { ...this.config, auraDuration }, center, anchor,
      finished => this.casts.delete(finished), this.lightPool,
    );
    this.casts.add(cast);
    for (const system of cast.getSystems()) this.batchedRenderer.addSystem(system);
  }

  update(delta: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    this.accumulator += Number.isFinite(delta) ? MathUtils.clamp(delta, 0, 0.1) : 0;
    for (const cast of this.casts) cast.followAnchor();
    for (const batch of this.batchedRenderer.batches) {
      if (!(batch.material instanceof ShaderMaterial)) continue;
      const resolution = batch.material.uniforms.resolution?.value;
      if (resolution instanceof Vector2 && Number.isFinite(width) && Number.isFinite(height)) {
        resolution.set(Math.max(1, width), Math.max(1, height));
      }
    }
    while (this.accumulator + 1e-9 >= STEP) {
      for (const cast of this.casts) cast.update(STEP);
      this.batchedRenderer.update(STEP);
      this.accumulator = Math.max(0, this.accumulator - STEP);
    }
  }

  getPhase(): FuryPhase | "idle" {
    return this.casts.values().next().value?.getPhase() ?? "idle";
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap(cast => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map(cast => cast.getState());
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    let count = 0;
    for (const cast of this.casts) for (const system of cast.getSystems()) count += system.particleNum;
    return count;
  }

  clear(): void {
    for (const cast of this.casts) cast.dispose();
    this.accumulator = 0;
    this.batchedRenderer.update(0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.clear();
    this.disposed = true;
    this.scene.remove(this.root, this.batchedRenderer);
    for (const batch of this.batchedRenderer.batches) {
      batch.dispose();
      for (const entry of Array.isArray(batch.material) ? batch.material : [batch.material]) entry.dispose();
    }
    this.batchedRenderer.clear();
    this.batchedRenderer.batches.length = 0;
    this.batchedRenderer.systemToBatchIndex.clear();
    this.resources.dispose();
  }
}

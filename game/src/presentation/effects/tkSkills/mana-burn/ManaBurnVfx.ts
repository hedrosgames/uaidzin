import {
  DynamicDrawUsage, Group, InstancedMesh, MathUtils, Mesh, Object3D, PointLight, Scene, ShaderMaterial, Vector2, Vector3,
  type BufferGeometry, type MeshBasicMaterial, type PlaneGeometry,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import type { TkLightPool } from "../../TkLightPool";
import { createManaBurnSystems } from "./ManaBurnParticleSystems";
import { ManaBurnResources } from "./ManaBurnResources";

const FLAME_TILE_TOP = 58 / 256;
const FLAME_TILE_BOTTOM = 236 / 256;
const FLAME_TILE_SPAN = FLAME_TILE_BOTTOM - FLAME_TILE_TOP;
const ACTIVATION_LIGHT = 0x8fc4ff;
const EMBER_LIGHT = 0xffc98a;

export interface ManaBurnVfxConfig {
  activationDuration: number;
  peakDuration: number;
  stateDuration: number;
  fadeDuration: number;
  ringRadius: number;
  drainHeight: number;
  drainCount: number;
  drainInwardSpeed: number;
  drainGravity: number;
  drainSwirl: number;
  flameBase: number;
  flameHeight: number;
  flameDuration: number;
  flameSize: number;
  flameCenter: number;
  moteEmission: number;
  maxConcurrentCasts: number;
  lightPeak: number;
}

function flameSizeFor(height: number): number {
  return height / FLAME_TILE_SPAN;
}

function flameCenterFor(base: number, size: number): number {
  return base - (0.5 - FLAME_TILE_BOTTOM) * size;
}

const DEFAULT_FLAME_BASE = 0.95;
const DEFAULT_FLAME_HEIGHT = 0.62;
const DEFAULT_FLAME_SIZE = flameSizeFor(DEFAULT_FLAME_HEIGHT);

export const DEFAULT_MANA_BURN_VFX_CONFIG: ManaBurnVfxConfig = {
  activationDuration: 0.3,
  peakDuration: 0.42,
  stateDuration: 1.55,
  fadeDuration: 0.42,
  ringRadius: 0.98,
  drainHeight: 1.05,
  drainCount: 26,
  drainInwardSpeed: 2.1,
  drainGravity: 11,
  drainSwirl: 3.2,
  flameBase: DEFAULT_FLAME_BASE,
  flameHeight: DEFAULT_FLAME_HEIGHT,
  flameDuration: 0.72,
  flameSize: DEFAULT_FLAME_SIZE,
  flameCenter: flameCenterFor(DEFAULT_FLAME_BASE, DEFAULT_FLAME_SIZE),
  moteEmission: 8,
  maxConcurrentCasts: 2,
  lightPeak: 1.6,
};

export type ManaBurnPhase = "activation" | "peak" | "state" | "fade";
const STEP = 1 / 60;
const ARC_RADIUS = 0.44;

function finiteVector(value: Vector3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

class ManaBurnCast {
  private readonly root = new Group();
  private readonly emberRing: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly arcRing: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly emberMaterial: MeshBasicMaterial;
  private readonly arcMaterial: MeshBasicMaterial;
  private readonly flameBody: InstancedMesh<BufferGeometry, MeshBasicMaterial>;
  private readonly flameDummy = new Object3D();
  private readonly particles: ReturnType<typeof createManaBurnSystems>;
  private readonly systems: ParticleSystem[];
  private readonly anchorOffset = new Vector3();
  private readonly anchorPosition = new Vector3();
  private readonly light: PointLight | null;
  private elapsed = 0;
  private phase: ManaBurnPhase = "activation";
  private phaseStartedAt = 0;
  private flameStarted = false;
  private flashStarted = false;
  private motesStarted = false;
  private residualStarted = false;
  private disposed = false;
  readonly flameAt: number;
  readonly peakAt: number;
  readonly stateAt: number;
  readonly fadeAt: number;
  readonly duration: number;

  constructor(
    parent: Group,
    renderer: BatchedRenderer,
    resources: ManaBurnResources,
    private readonly config: ManaBurnVfxConfig,
    center: Vector3,
    private readonly anchor: Object3D | undefined,
    private readonly onDispose: (cast: ManaBurnCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.flameAt = config.activationDuration * 0.55;
    this.peakAt = config.activationDuration;
    this.stateAt = this.peakAt + config.peakDuration;
    this.fadeAt = this.stateAt + config.stateDuration;
    this.duration = this.fadeAt + config.fadeDuration;
    this.root.name = "tk-mana-burn-cast";
    this.root.position.copy(center);
    parent.add(this.root);
    if (anchor) this.anchorOffset.copy(center).sub(anchor.getWorldPosition(this.anchorPosition));
    this.emberMaterial = resources.materials.ember.clone();
    this.arcMaterial = resources.materials.arc.clone();
    this.emberRing = new Mesh(resources.ringGeometry, this.emberMaterial);
    this.emberRing.name = "tk-mana-burn-ember-ring";
    this.emberRing.rotation.x = -Math.PI / 2;
    this.emberRing.position.y = 0.035;
    this.emberRing.renderOrder = 9;
    this.emberRing.scale.setScalar(config.ringRadius * 0.42);
    this.arcRing = new Mesh(resources.ringGeometry, this.arcMaterial);
    this.arcRing.name = "tk-mana-burn-arc-ring";
    this.arcRing.rotation.x = -Math.PI / 2;
    this.arcRing.position.y = 0.74;
    this.arcRing.renderOrder = 11;
    this.arcRing.scale.setScalar(ARC_RADIUS * 0.55);
    this.arcRing.visible = false;
    this.root.add(this.emberRing, this.arcRing);
    this.flameBody = new InstancedMesh(resources.flameBodyGeometry, resources.materials.flameBody.clone(), 3);
    this.flameBody.name = "tk-mana-burn-body-flames";
    this.flameBody.instanceMatrix.setUsage(DynamicDrawUsage);
    this.flameBody.frustumCulled = false;
    this.flameBody.visible = false;
    this.root.add(this.flameBody);
    this.particles = createManaBurnSystems(resources, config);
    this.systems = Object.values(this.particles);
    for (const system of this.systems) {
      this.root.add(system.emitter);
      renderer.addSystem(system);
    }
    this.light = lightPool
      ? lightPool.acquire(ACTIVATION_LIGHT, 4.2)
      : new PointLight(ACTIVATION_LIGHT, 0, 4.2, 2);
    if (this.light) {
      this.light.position.y = 0.85;
      this.light.intensity = 0;
      this.root.add(this.light);
    }
    this.start(this.particles.drain);
    this.updateVisual();
    this.root.updateWorldMatrix(true, true);
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  getPhase(): ManaBurnPhase {
    return this.phase;
  }

  getSystems(): ParticleSystem[] {
    return this.systems;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      duration: this.duration,
      phaseStartedAt: this.phaseStartedAt,
      position: this.root.position.toArray(),
      followsCaster: Boolean(this.anchor),
      ring: { opacity: this.emberMaterial.opacity, scale: this.emberRing.scale.x },
      arc: { opacity: this.arcMaterial.opacity, scale: this.arcRing.scale.x, visible: this.arcRing.visible },
      lightIntensity: this.light?.intensity ?? 0,
      flameStarted: this.flameStarted,
      flashStarted: this.flashStarted,
      motesStarted: this.motesStarted,
      residualStarted: this.residualStarted,
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
    if (!this.flameStarted && this.elapsed + 1e-9 >= this.flameAt) {
      this.flameStarted = true;
      this.start(this.particles.flame);
    }
    if (this.phase === "activation" && this.elapsed + 1e-9 >= this.peakAt) {
      this.phase = "peak";
      this.phaseStartedAt = this.peakAt;
      this.flashStarted = true;
      this.start(this.particles.flash);
    }
    if (this.phase === "peak" && this.elapsed + 1e-9 >= this.stateAt) {
      this.phase = "state";
      this.phaseStartedAt = this.stateAt;
      this.motesStarted = true;
      this.start(this.particles.motes);
    }
    if (this.phase === "state" && this.elapsed + 1e-9 >= this.fadeAt) {
      this.phase = "fade";
      this.phaseStartedAt = this.fadeAt;
      this.residualStarted = true;
      for (const system of this.systems) system.endEmit();
      this.start(this.particles.residual);
    }
    this.updateVisual();
    this.root.updateWorldMatrix(true, true);
    if (this.elapsed + 1e-9 >= this.duration) this.dispose();
  }

  private updateVisual(): void {
    const activation = MathUtils.clamp(this.elapsed / this.config.activationDuration, 0, 1);
    const fadeProgress = MathUtils.clamp((this.elapsed - this.fadeAt) / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - fadeProgress, 2);
    const reveal = 1 - Math.pow(1 - activation, 3);
    const beat = Math.pow(0.5 + 0.5 * Math.sin(this.elapsed * Math.PI * 2.4), 3);
    const stateReveal = MathUtils.clamp((this.elapsed - this.stateAt) / 0.24, 0, 1);
    const emberAlpha = reveal * fade * (
      0.34 + beat * 0.14 + (this.phase === "activation" ? (1 - activation) * 0.16 : 0)
    );
    this.emberMaterial.opacity = emberAlpha;
    this.emberRing.scale.setScalar(
      this.config.ringRadius * (0.42 + reveal * 0.58 + beat * 0.025 + fadeProgress * 0.12),
    );
    this.emberRing.rotation.z = this.elapsed * 0.24;
    const arcAlpha = stateReveal * fade * (0.26 + beat * 0.14);
    this.arcMaterial.opacity = arcAlpha;
    this.arcRing.visible = arcAlpha > 0.004;
    this.arcRing.scale.setScalar(ARC_RADIUS * (0.55 + stateReveal * 0.45 + beat * 0.02));
    this.arcRing.rotation.z = -this.elapsed * 0.78;
    const flameProgress = MathUtils.clamp((this.elapsed - this.flameAt) / this.config.flameDuration, 0, 1);
    const flameAlpha = Math.sin(flameProgress * Math.PI);
    this.flameBody.visible = flameAlpha > 0.01;
    this.flameBody.material.opacity = flameAlpha * 0.7;
    if (this.flameBody.visible) {
      for (let index = 0; index < 3; index++) {
        const angle = index * Math.PI * 2 / 3 + this.elapsed * 0.65;
        this.flameDummy.position.set(Math.sin(angle) * 0.35, this.config.flameBase + this.config.flameHeight * 0.44, Math.cos(angle) * 0.35);
        this.flameDummy.rotation.set(0.08, angle, Math.sin(this.elapsed * 8 + index) * 0.12);
        this.flameDummy.scale.set(0.65 + flameAlpha * 0.35, 0.68 + flameAlpha * 0.35, 1);
        this.flameDummy.updateMatrix();
        this.flameBody.setMatrixAt(index, this.flameDummy.matrix);
      }
      this.flameBody.instanceMatrix.needsUpdate = true;
    }
    if (this.light) {
      const ignition = this.phase === "activation" ? Math.sin(activation * Math.PI) : 0;
      const sustained = 0.2 + beat * 0.13 + stateReveal * 0.06;
      this.light.color.setHex(this.phase === "activation" ? ACTIVATION_LIGHT : EMBER_LIGHT);
      this.light.intensity = this.config.lightPeak * fade * (ignition * 0.82 + sustained * 0.9);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.endEmit();
      system.dispose();
    }
    this.emberMaterial.dispose();
    this.arcMaterial.dispose();
    this.flameBody.material.dispose();
    this.flameBody.dispose();
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

export class ManaBurnVfxController {
  private readonly resources = new ManaBurnResources();
  private readonly renderer = new BatchedRenderer();
  private readonly root = new Group();
  private readonly casts = new Set<ManaBurnCast>();
  private readonly config: ManaBurnVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<ManaBurnVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_MANA_BURN_VFX_CONFIG };
    for (const key of Object.keys(merged) as (keyof ManaBurnVfxConfig)[]) {
      const value = config[key];
      if (value !== undefined && Number.isFinite(value)) merged[key] = value;
    }
    this.config = {
      activationDuration: MathUtils.clamp(merged.activationDuration, 0.08, 0.6),
      peakDuration: MathUtils.clamp(merged.peakDuration, 0.12, 0.8),
      stateDuration: MathUtils.clamp(merged.stateDuration, 0.2, 12),
      fadeDuration: MathUtils.clamp(merged.fadeDuration, 0.2, 0.8),
      ringRadius: MathUtils.clamp(merged.ringRadius, 0.3, 3),
      drainHeight: MathUtils.clamp(merged.drainHeight, 0.3, 3),
      drainCount: Math.floor(MathUtils.clamp(merged.drainCount, 0, 80)),
      drainInwardSpeed: MathUtils.clamp(merged.drainInwardSpeed, 0, 8),
      drainGravity: MathUtils.clamp(merged.drainGravity, 0, 60),
      drainSwirl: MathUtils.clamp(merged.drainSwirl, -12, 12),
      flameBase: MathUtils.clamp(merged.flameBase, 0.1, 2.5),
      flameHeight: MathUtils.clamp(merged.flameHeight, 0.15, 1.6),
      flameDuration: MathUtils.clamp(merged.flameDuration, 0.3, 2),
      flameSize: 0,
      flameCenter: 0,
      moteEmission: MathUtils.clamp(merged.moteEmission, 0, 40),
      maxConcurrentCasts: Math.floor(MathUtils.clamp(merged.maxConcurrentCasts, 1, 6)),
      lightPeak: MathUtils.clamp(merged.lightPeak, 0, 4),
    };
    this.config.flameSize = flameSizeFor(this.config.flameHeight);
    this.config.flameCenter = flameCenterFor(this.config.flameBase, this.config.flameSize);
    this.root.name = "tk-mana-burn-vfx-root";
    this.renderer.name = "tk-mana-burn-quarks";
    this.scene.add(this.root, this.renderer);
  }

  castManaBurn(center: Vector3, duration?: number, anchor?: Object3D): void {
    if (this.disposed) throw new Error("ManaBurnVfxController descartado");
    if (!finiteVector(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) this.casts.values().next().value?.dispose();
    if (this.casts.size === 0) this.accumulator = 0;
    const stateDuration = duration !== undefined && Number.isFinite(duration)
      ? MathUtils.clamp(duration, 0.2, 12)
      : this.config.stateDuration;
    this.casts.add(new ManaBurnCast(
      this.root,
      this.renderer,
      this.resources,
      { ...this.config, stateDuration },
      center.clone(),
      anchor,
      finished => this.casts.delete(finished),
      this.lightPool,
    ));
  }

  update(delta: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    this.accumulator = Math.min(0.2, this.accumulator + (Number.isFinite(delta) ? MathUtils.clamp(delta, 0, 0.1) : 0));
    for (const cast of this.casts) cast.followAnchor();
    this.updateBatchResolution(width, height);
    while (this.accumulator + 1e-9 >= STEP) {
      for (const cast of this.casts) cast.update(STEP);
      this.renderer.update(STEP);
      this.accumulator = Math.max(0, this.accumulator - STEP);
    }
    if (this.casts.size === 0) this.accumulator = 0;
  }

  private updateBatchResolution(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    for (const batch of this.renderer.batches) {
      const material = batch.material;
      if (!(material instanceof ShaderMaterial)) continue;
      const value = material.uniforms.resolution?.value;
      if (value instanceof Vector2) value.set(width, height);
    }
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    let count = 0;
    for (const cast of this.casts) {
      for (const system of cast.getSystems()) count += system.particleNum;
    }
    return count;
  }

  getPhase(): ManaBurnPhase | "idle" {
    const order: ManaBurnPhase[] = ["activation", "peak", "state", "fade"];
    let phase: ManaBurnPhase | "idle" = "idle";
    let rank = order.length;
    for (const cast of this.casts) {
      const current = order.indexOf(cast.getPhase());
      if (current < rank) {
        rank = current;
        phase = order[current]!;
      }
    }
    return phase;
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap(cast => [...cast.getSystems()]);
  }

  getCastStates() {
    return [...this.casts].map(cast => cast.getState());
  }

  clear(): void {
    for (const cast of [...this.casts]) cast.dispose();
    this.accumulator = 0;
    this.renderer.update(0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.root, this.renderer);
    for (const batch of this.renderer.batches) {
      batch.dispose();
      for (const entry of Array.isArray(batch.material) ? batch.material : [batch.material]) entry.dispose();
    }
    this.renderer.batches.length = 0;
    this.renderer.systemToBatchIndex.clear();
    this.resources.dispose();
  }
}

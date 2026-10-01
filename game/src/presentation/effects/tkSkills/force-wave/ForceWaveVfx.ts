import { Group, MathUtils, PointLight, Scene, ShaderMaterial, Vector2, Vector3 } from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import type { TkLightPool } from "../../TkLightPool";
import { createForceWaveSystems, ForceWaveResources } from "./ForceWaveParticleSystems";

export interface ForceWaveVfxConfig {
  startupDuration: number;
  travelDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  endWidth: number;
  endHeight: number;
  lightPeak: number;
}

export const DEFAULT_FORCE_WAVE_VFX_CONFIG: ForceWaveVfxConfig = {
  startupDuration: 2 / 60,
  travelDuration: 8 / 60,
  fadeDuration: 9 / 60,
  maxConcurrentCasts: 4,
  endWidth: 1.65,
  endHeight: 1.35,
  lightPeak: 0.65,
};

type ForceWavePhase = "startup" | "travel" | "impact";
const FORWARD = new Vector3(0, 0, 1);
const STEP = 1 / 60;

function finiteVector(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class ForceWaveCast {
  private readonly root = new Group();
  private readonly systems: ReturnType<typeof createForceWaveSystems>;
  private readonly direction: Vector3;
  private readonly distance: number;
  private readonly head = new Vector3();
  private readonly tail = new Vector3();
  private readonly light: PointLight | null;
  private elapsed = 0;
  private phase: ForceWavePhase = "startup";
  private phaseStartedAt = 0;
  private edgeStarted = false;
  private debrisStarted = false;
  private disposed = false;

  constructor(
    castRoot: Group,
    shared: ForceWaveResources,
    private readonly config: ForceWaveVfxConfig,
    private readonly origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: ForceWaveCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.direction = target.clone().sub(origin);
    this.distance = this.direction.length();
    this.direction.divideScalar(this.distance);
    this.head.copy(origin);
    this.tail.copy(origin);
    this.root.name = "tk-force-wave-cast";
    this.root.position.copy(origin);
    this.root.quaternion.setFromUnitVectors(FORWARD, this.direction);
    castRoot.add(this.root);
    this.systems = createForceWaveSystems(shared, config, this.distance);
    for (const system of this.getSystems()) this.root.add(system.emitter);
    this.systems.impact.emitter.position.z = this.distance;
    this.light = lightPool
      ? lightPool.acquire(0xffffff, 3)
      : new PointLight(0xffffff, 0, 3, 2);
    if (this.light) {
      this.light.intensity = 0;
      this.root.add(this.light);
    }
    this.start(this.systems.main);
    this.updateShape();
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  getSystems(): ParticleSystem[] {
    return Object.values(this.systems);
  }

  getPhase(): ForceWavePhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      phaseStartedAt: this.phaseStartedAt,
      elapsed: this.elapsed,
      origin: this.origin.toArray(),
      target: this.target.toArray(),
      head: this.head.toArray(),
      tail: this.tail.toArray(),
      direction: this.direction.toArray(),
      distance: this.distance,
      scale: this.systems.main.emitter.scale.toArray(),
    };
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;
    const arrival = this.config.startupDuration + this.config.travelDuration;
    if (this.phase === "startup" && this.elapsed + 1e-9 >= this.config.startupDuration) {
      this.phase = "travel";
      this.phaseStartedAt = this.config.startupDuration;
      this.start(this.systems.streaks);
    }
    if (!this.edgeStarted && this.elapsed + 1e-9 >= this.config.startupDuration + this.config.travelDuration * 0.25) {
      this.edgeStarted = true;
      this.systems.edge.emitter.position.z = this.distance * 0.3;
      this.start(this.systems.edge);
    }
    if (!this.debrisStarted && this.elapsed + 1e-9 >= this.config.startupDuration + this.config.travelDuration * 0.6) {
      this.debrisStarted = true;
      this.systems.debris.emitter.position.z = this.distance * 0.65;
      this.start(this.systems.debris);
    }
    if (this.phase !== "impact" && this.elapsed + 1e-9 >= arrival) {
      this.phase = "impact";
      this.phaseStartedAt = arrival;
      this.start(this.systems.impact);
    }
    this.updateShape();
    this.root.updateWorldMatrix(true, true);
    if (this.elapsed + 1e-9 >= arrival + this.config.fadeDuration) this.dispose();
  }

  private updateShape(): void {
    const progress = MathUtils.clamp((this.elapsed - this.config.startupDuration) / this.config.travelDuration, 0, 1);
    const fade = MathUtils.clamp(
      (this.elapsed - this.config.startupDuration - this.config.travelDuration) / this.config.fadeDuration, 0, 1,
    );
    const front = this.phase === "startup"
      ? Math.min(this.distance * 0.02, 0.06)
      : this.distance * (1 - Math.pow(1 - progress, 1.35));
    const rear = this.phase === "impact"
      ? this.distance * (0.28 + fade * 0.72)
      : this.distance * Math.max(0, progress - 0.65) * 0.8;
    this.head.copy(this.origin).addScaledVector(this.direction, front);
    this.tail.copy(this.origin).addScaledVector(this.direction, rear);
    const reachScale = Math.min(1, Math.max(0.25, this.distance / 2));
    this.systems.main.emitter.position.z = rear;
    this.systems.main.emitter.scale.set(
      this.config.endWidth * reachScale,
      this.config.endHeight * reachScale,
      Math.max(0.001, front - rear),
    );
    if (this.light) {
      this.light.position.z = front;
      this.light.intensity = this.config.lightPeak
        * (this.phase === "impact" ? 0.5 * (1 - fade) ** 2 : Math.sin(progress * Math.PI));
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.getSystems()) {
      system.endEmit();
      system.dispose();
    }
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

export class ForceWaveVfxController {
  private readonly config: ForceWaveVfxConfig;
  private readonly shared = new ForceWaveResources();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly castRoot = new Group();
  private readonly casts = new Set<ForceWaveCast>();
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<ForceWaveVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    this.config = { ...DEFAULT_FORCE_WAVE_VFX_CONFIG };
    for (const key of Object.keys(this.config) as (keyof ForceWaveVfxConfig)[]) {
      const value = config[key];
      if (value !== undefined && Number.isFinite(value)) {
        this.config[key] = Math.max(key === "lightPeak" ? 0 : STEP, value);
      }
    }
    this.config.maxConcurrentCasts = Math.max(1, Math.floor(this.config.maxConcurrentCasts));
    this.castRoot.name = "tk-force-wave-vfx-root";
    this.batchedRenderer.name = "tk-force-wave-quarks";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castForceWave(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("ForceWaveVfxController descartado");
    if (!finiteVector(origin) || !finiteVector(target)) return;
    const distance = origin.distanceTo(target);
    if (!Number.isFinite(distance) || distance < 0.0001) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) this.casts.values().next().value?.dispose();
    if (this.casts.size === 0) this.accumulator = 0;
    const cast = new ForceWaveCast(
      this.castRoot, this.shared, this.config, origin.clone(), target.clone(),
      (finished) => this.casts.delete(finished), this.lightPool,
    );
    this.casts.add(cast);
    for (const system of cast.getSystems()) {
      system.emitter.updateWorldMatrix(true, false);
      this.batchedRenderer.addSystem(system);
    }
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    this.accumulator += Number.isFinite(deltaTime) ? MathUtils.clamp(deltaTime, 0, 0.1) : 0;
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

  clear(): void {
    for (const cast of this.casts) cast.dispose();
    this.accumulator = 0;
    this.batchedRenderer.update(0);
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    return this.getSystems().reduce((count, system) => count + system.particleNum, 0);
  }

  getPhase(): ForceWavePhase | "idle" {
    return this.casts.values().next().value?.getPhase() ?? "idle";
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap((cast) => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map((cast) => cast.getState());
  }

  dispose(): void {
    if (this.disposed) return;
    this.clear();
    this.disposed = true;
    this.scene.remove(this.castRoot, this.batchedRenderer);
    for (const batch of this.batchedRenderer.batches) {
      batch.dispose();
      for (const material of Array.isArray(batch.material) ? batch.material : [batch.material]) material.dispose();
    }
    this.batchedRenderer.clear();
    this.batchedRenderer.batches.length = 0;
    this.batchedRenderer.systemToBatchIndex.clear();
    this.shared.dispose();
  }
}

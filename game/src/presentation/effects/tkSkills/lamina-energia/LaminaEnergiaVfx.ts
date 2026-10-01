import {
  Color, DynamicDrawUsage, Group, InstancedMesh, MathUtils, Mesh,
  Object3D, PointLight, Quaternion, Scene, Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import type { TkLightPool } from "../../TkLightPool";
import { LaminaEnergiaResources } from "./LaminaEnergiaResources";
import { createLaminaEnergiaSystems } from "./LaminaEnergiaParticleSystems";
import { LAMINA_ENERGIA_TIMING, laminaEnergiaFlightDuration } from "./LaminaEnergiaTiming";

export interface LaminaEnergiaVfxConfig {
  maxConcurrentCasts: number;
  lightPeak: number;
}

export const DEFAULT_LAMINA_ENERGIA_VFX_CONFIG: LaminaEnergiaVfxConfig = {
  maxConcurrentCasts: 4,
  lightPeak: 0.75,
};

const FORWARD = new Vector3(0, 0, 1);
const TILT = new Quaternion().setFromAxisAngle(FORWARD, 0.55);
const STEP = 1 / 60;
const TRAIL_SEGMENTS = 5;
type Phase = "release" | "flight" | "impact";

function finiteVector(point: Vector3): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
}

class LaminaEnergiaCast {
  private readonly root = new Group();
  private readonly blade: Mesh;
  private readonly trail: InstancedMesh;
  private readonly bladeMaterial;
  private readonly trailMaterial;
  private readonly segment = new Object3D();
  private readonly head = new Vector3();
  private readonly light: PointLight | null;
  private readonly systems;
  private readonly allSystems: ParticleSystem[];
  private readonly direction: Vector3;
  private readonly distance: number;
  private readonly size: number;
  readonly flightDuration: number;
  readonly impactAt: number;
  private elapsed = 0;
  private phase: Phase = "release";
  private disposed = false;

  constructor(
    castRoot: Group,
    renderer: BatchedRenderer,
    shared: LaminaEnergiaResources,
    private readonly config: LaminaEnergiaVfxConfig,
    private readonly origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: LaminaEnergiaCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.direction = target.clone().sub(origin);
    this.distance = this.direction.length();
    this.direction.divideScalar(this.distance);
    this.flightDuration = laminaEnergiaFlightDuration(this.distance);
    this.impactAt = LAMINA_ENERGIA_TIMING.releaseDuration + this.flightDuration;
    this.size = Math.min(1, 0.45 + this.distance * 0.22,
      Math.max(0.15, Math.min(origin.y, target.y) / 0.7));
    this.root.name = "tk-lamina-energia-cast";
    this.root.position.copy(origin);
    this.root.quaternion.setFromUnitVectors(FORWARD, this.direction);
    castRoot.add(this.root);
    this.bladeMaterial = shared.materials.blade.clone();
    this.trailMaterial = shared.materials.trail.clone();
    this.blade = new Mesh(shared.bladeGeometry, this.bladeMaterial);
    this.blade.name = "tk-lamina-energia-blade";
    this.blade.quaternion.copy(TILT);
    this.blade.renderOrder = 12;
    this.trail = new InstancedMesh(shared.trailGeometry, this.trailMaterial, TRAIL_SEGMENTS);
    this.trail.name = "tk-lamina-energia-trail";
    this.trail.renderOrder = 11;
    this.trail.frustumCulled = false;
    this.trail.instanceMatrix.setUsage(DynamicDrawUsage);
    const tint = new Color();
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      tint.setRGB(1, 0.9 - i * 0.04, 0.65 - i * 0.055).multiplyScalar(1 - i * 0.12);
      this.trail.setColorAt(i, tint);
    }
    this.root.add(this.blade, this.trail);
    this.systems = createLaminaEnergiaSystems(shared);
    this.allSystems = Object.values(this.systems);
    for (const system of this.allSystems) {
      this.root.add(system.emitter);
      renderer.addSystem(system);
    }
    this.systems.motes.emitter.rotation.y = Math.PI;
    for (const system of [this.systems.impact, this.systems.sparks, this.systems.residual]) {
      system.emitter.position.z = this.distance;
      system.emitter.rotation.y = Math.PI;
    }
    this.light = lightPool ? lightPool.acquire(0xffdf9c, 3) : new PointLight(0xffdf9c, 0, 3, 2);
    if (this.light) this.root.add(this.light);
    this.start(this.systems.release);
    this.updateShape();
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  update(dt: number): void {
    if (this.disposed) return;
    this.elapsed += dt;
    if (this.phase === "release" && this.elapsed + 1e-9 >= LAMINA_ENERGIA_TIMING.releaseDuration) {
      this.phase = "flight";
      this.start(this.systems.motes);
    }
    if (this.phase === "flight" && this.elapsed + 1e-9 >= this.impactAt) {
      this.phase = "impact";
      this.systems.motes.endEmit();
      this.start(this.systems.impact);
      this.start(this.systems.sparks);
      this.start(this.systems.residual);
    }
    this.updateShape();
    if (this.elapsed + 1e-9 >= this.impactAt + LAMINA_ENERGIA_TIMING.fadeDuration) this.dispose();
  }

  private updateShape(): void {
    const release = MathUtils.clamp(this.elapsed / LAMINA_ENERGIA_TIMING.releaseDuration, 0, 1);
    const flight = MathUtils.clamp((this.elapsed - LAMINA_ENERGIA_TIMING.releaseDuration) / this.flightDuration, 0, 1);
    const impact = Math.max(0, this.elapsed - this.impactAt);
    const fade = MathUtils.clamp(1 - impact / LAMINA_ENERGIA_TIMING.fadeDuration, 0, 1);
    const bladeFade = this.phase === "impact" ? Math.max(0, 1 - impact / 0.055) : 1;
    const head = flight * this.distance;
    this.head.copy(this.origin).addScaledVector(this.direction, head);
    this.blade.position.z = head;
    this.blade.scale.setScalar(this.size * (this.phase === "release" ? 0.18 + release * 0.82 : 1 + flight * 0.06));
    this.bladeMaterial.opacity = 0.92 * release * bladeFade;
    this.blade.visible = this.bladeMaterial.opacity > 0.001;
    this.systems.motes.emitter.position.z = head;
    const trailLength = Math.min(0.85, head) * (this.phase === "impact" ? fade : 1);
    this.trail.visible = trailLength > 0.025;
    this.trailMaterial.opacity = 0.36 * (this.phase === "impact" ? fade * fade : 1);
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      const t = i / TRAIL_SEGMENTS;
      this.segment.position.set(0, Math.sin(t * Math.PI) * 0.035, head - t * trailLength);
      this.segment.quaternion.copy(TILT);
      this.segment.scale.set(this.size * (1 - t * 0.75), this.size * (1 - t * 0.65), trailLength / TRAIL_SEGMENTS * 0.82);
      this.segment.updateMatrix();
      this.trail.setMatrixAt(i, this.segment.matrix);
    }
    this.trail.instanceMatrix.needsUpdate = true;
    if (this.light) {
      this.light.position.z = head;
      this.light.intensity = this.config.lightPeak * (this.phase === "release" ? release * 0.35
        : this.phase === "flight" ? 0.45 : fade * fade);
    }
  }

  prepareFrame(): void {
    if (this.disposed) return;
    for (const system of this.allSystems) {
      const emitting = system === this.systems.motes ? this.phase === "flight" : system.time <= system.duration;
      if (!system.paused && (emitting || system.particleNum > 0)) system.emitter.updateWorldMatrix(true, false);
    }
  }

  getPhase(): Phase { return this.phase; }
  getSystems(): readonly ParticleSystem[] { return this.allSystems; }
  getParticleCount(): number {
    let count = 0;
    for (const system of this.allSystems) count += system.particleNum;
    return count;
  }
  getState() {
    return {
      phase: this.phase, elapsed: this.elapsed, flightDuration: this.flightDuration, impactAt: this.impactAt,
      phaseStartedAt: this.phase === "release" ? 0 : this.phase === "flight" ? LAMINA_ENERGIA_TIMING.releaseDuration : this.impactAt,
      origin: this.origin.toArray(), target: this.target.toArray(), head: this.head.toArray(),
      direction: this.direction.toArray(), bladeVisible: this.blade.visible, trailVisible: this.trail.visible,
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.allSystems) system.dispose();
    this.bladeMaterial.dispose();
    this.trailMaterial.dispose();
    this.trail.dispose();
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

export class LaminaEnergiaVfxController {
  private readonly resources = new LaminaEnergiaResources();
  private readonly renderer = new BatchedRenderer();
  private readonly castRoot = new Group();
  private readonly casts = new Set<LaminaEnergiaCast>();
  private readonly config: LaminaEnergiaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<LaminaEnergiaVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    this.config = { ...DEFAULT_LAMINA_ENERGIA_VFX_CONFIG };
    if (Number.isFinite(config.maxConcurrentCasts)) this.config.maxConcurrentCasts = Math.floor(MathUtils.clamp(config.maxConcurrentCasts!, 1, 8));
    if (Number.isFinite(config.lightPeak)) this.config.lightPeak = MathUtils.clamp(config.lightPeak!, 0, 2);
    this.castRoot.name = "tk-lamina-energia-vfx-root";
    this.renderer.name = "tk-lamina-energia-quarks";
    scene.add(this.castRoot, this.renderer);
  }

  castLaminaEnergia(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("LaminaEnergiaVfxController descartado");
    const distanceSquared = origin.distanceToSquared(target);
    if (!finiteVector(origin) || !finiteVector(target) || !Number.isFinite(distanceSquared) || distanceSquared < 1e-8) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) this.casts.values().next().value?.dispose();
    this.casts.add(new LaminaEnergiaCast(this.castRoot, this.renderer, this.resources,
      this.config, origin.clone(), target.clone(), cast => this.casts.delete(cast), this.lightPool));
  }

  update(dt: number, _width = 1, _height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.accumulator = Math.min(0.2, this.accumulator + Math.min(dt, 0.1));
    while (this.accumulator + 1e-9 >= STEP) {
      for (const cast of this.casts) {
        cast.update(STEP);
        cast.prepareFrame();
      }
      this.renderer.update(STEP);
      this.accumulator = Math.max(0, this.accumulator - STEP);
    }
    if (this.casts.size === 0) this.accumulator = 0;
  }

  getActiveCastCount(): number { return this.casts.size; }
  getParticleCount(): number {
    let count = 0;
    for (const cast of this.casts) count += cast.getParticleCount();
    return count;
  }
  getPhase(): Phase | "idle" {
    let phase: Phase | "idle" = "idle";
    for (const cast of this.casts) phase = cast.getPhase();
    return phase;
  }
  getSystems(): ParticleSystem[] { return [...this.casts].flatMap(cast => [...cast.getSystems()]); }
  getCastStates() { return [...this.casts].map(cast => cast.getState()); }

  clear(): void {
    for (const cast of this.casts) cast.dispose();
    this.accumulator = 0;
    this.renderer.update(0);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.castRoot, this.renderer);
    for (const batch of this.renderer.batches) {
      batch.geometry.dispose();
      for (const material of Array.isArray(batch.material) ? batch.material : [batch.material]) material.dispose();
    }
    this.renderer.clear();
    this.renderer.batches.length = 0;
    this.renderer.systemToBatchIndex.clear();
    this.resources.dispose();
  }
}

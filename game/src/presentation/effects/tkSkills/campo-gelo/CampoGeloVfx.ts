import {
  Color, DynamicDrawUsage, Group, InstancedMesh, MathUtils, Mesh,
  Object3D, PointLight, Scene, Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import type { TkLightPool } from "../../TkLightPool";
import { CampoGeloResources } from "./CampoGeloResources";
import { createCampoGeloSystems } from "./CampoGeloParticleSystems";

export const DEFAULT_CAMPO_GELO_VFX_CONFIG = {
  activationDuration: 10 / 60,
  peakDuration: 8 / 60,
  fadeDuration: 22 / 60,
  radius: 3.4,
  maxConcurrentCasts: 3,
  lightPeak: 0.85,
};
export type CampoGeloVfxConfig = typeof DEFAULT_CAMPO_GELO_VFX_CONFIG;
type Phase = "activation" | "peak" | "fade";
const STEP = 1 / 60;
const CRYSTALS = 28;

interface Crystal {
  x: number;
  z: number;
  height: number;
  width: number;
  angle: number;
  lean: number;
  delay: number;
}

class CampoGeloCast {
  private readonly root = new Group();
  private readonly crystals: InstancedMesh;
  private readonly ground: Mesh;
  private readonly rim: Mesh;
  private readonly crystalMaterial;
  private readonly groundMaterial;
  private readonly rimMaterial;
  private readonly shards: Crystal[] = [];
  private readonly transform = new Object3D();
  private readonly systems;
  private readonly allSystems: ParticleSystem[];
  private readonly light: PointLight | null;
  private elapsed = 0;
  private vaporStarted = false;
  private residualStarted = false;
  private disposed = false;
  readonly fadeAt: number;
  readonly duration: number;

  constructor(
    castRoot: Group,
    renderer: BatchedRenderer,
    resources: CampoGeloResources,
    private readonly config: CampoGeloVfxConfig,
    center: Vector3,
    private readonly radius: number,
    private readonly onDispose: (cast: CampoGeloCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.fadeAt = config.activationDuration + config.peakDuration;
    this.duration = this.fadeAt + config.fadeDuration;
    this.root.name = "tk-campo-gelo-cast";
    this.root.position.copy(center);
    this.root.position.y += 0.015;
    castRoot.add(this.root);
    this.crystalMaterial = resources.materials.crystal.clone();
    this.groundMaterial = resources.materials.ground.clone();
    this.rimMaterial = resources.materials.rim.clone();
    this.crystals = new InstancedMesh(resources.crystalGeometry, this.crystalMaterial, CRYSTALS);
    this.crystals.name = "tk-campo-gelo-crystals";
    this.crystals.frustumCulled = false;
    this.crystals.renderOrder = 11;
    this.crystals.instanceMatrix.setUsage(DynamicDrawUsage);
    this.ground = new Mesh(resources.groundGeometry, this.groundMaterial);
    this.ground.name = "tk-campo-gelo-frost";
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.renderOrder = 8;
    this.rim = new Mesh(resources.rimGeometry, this.rimMaterial);
    this.rim.name = "tk-campo-gelo-boundary";
    this.rim.scale.set(radius, 1, radius);
    this.rim.renderOrder = 10;
    this.root.add(this.ground, this.rim, this.crystals);
    const size = Math.min(1, radius / 2);
    const tint = new Color();
    for (let i = 0; i < CRYSTALS; i++) {
      const angle = i * Math.PI * 2 / CRYSTALS + Math.sin(i * 4.3) * 0.055;
      const edge = i % 7 !== 0;
      const distance = radius * (edge ? 0.85 + Math.sin(i * 1.7) * 0.015 : 0.43);
      this.shards.push({
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        height: (edge ? 0.22 + 0.34 * Math.abs(Math.sin(i * 2.3)) : 0.18) * size,
        width: (0.75 + 0.45 * Math.abs(Math.cos(i * 1.8))) * size,
        angle,
        lean: edge ? 0.12 + Math.abs(Math.sin(i * 0.8)) * 0.08 : 0.08,
        delay: edge ? config.activationDuration * (0.12 + (i % 3) * 0.1) : 0,
      });
      tint.setRGB(0.72 + (i % 3) * 0.09, 0.87 + (i % 3) * 0.045, 1);
      this.crystals.setColorAt(i, tint);
    }
    this.systems = createCampoGeloSystems(resources, radius);
    this.allSystems = Object.values(this.systems);
    for (const system of this.allSystems) {
      this.root.add(system.emitter);
      renderer.addSystem(system);
    }
    this.light = lightPool ? lightPool.acquire(0xafdfff, radius * 2) : new PointLight(0xafdfff, 0, radius * 2, 2);
    if (this.light) {
      this.light.position.y = 0.75;
      this.root.add(this.light);
    }
    this.start(this.systems.flash);
    this.start(this.systems.fractures);
    this.updateShape();
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  getPhase(): Phase {
    return this.elapsed < this.config.activationDuration ? "activation" : this.elapsed < this.fadeAt ? "peak" : "fade";
  }

  update(dt: number): void {
    if (this.disposed) return;
    this.elapsed += dt;
    if (!this.vaporStarted && this.elapsed + 1e-9 >= this.config.activationDuration * 0.7) {
      this.vaporStarted = true;
      this.start(this.systems.vapor);
    }
    if (!this.residualStarted && this.elapsed + 1e-9 >= this.fadeAt) {
      this.residualStarted = true;
      this.start(this.systems.residual);
    }
    this.updateShape();
    if (this.elapsed + 1e-9 >= this.duration) this.dispose();
  }

  private updateShape(): void {
    const activation = MathUtils.clamp(this.elapsed / this.config.activationDuration, 0, 1);
    const fade = 1 - MathUtils.clamp((this.elapsed - this.fadeAt) / this.config.fadeDuration, 0, 1);
    const expand = 1 - Math.pow(1 - activation, 3);
    this.ground.scale.setScalar(this.radius * (0.25 + expand * 0.75));
    this.groundMaterial.opacity = (0.08 + expand * 0.25) * fade * fade;
    this.rimMaterial.opacity = (0.3 + expand * 0.38) * fade * fade;
    this.crystalMaterial.opacity = (0.45 + expand * 0.43) * fade;
    const size = Math.min(1, this.radius / 2);
    for (let i = 0; i < this.shards.length; i++) {
      const shard = this.shards[i]!;
      const progress = MathUtils.clamp((this.elapsed - shard.delay) / (this.config.activationDuration * 0.6), 0, 1);
      const grow = (0.04 + (1 - Math.pow(1 - progress, 3)) * 0.96) * fade;
      this.transform.position.set(shard.x, 0.04 * size, shard.z);
      this.transform.rotation.set(shard.lean, -shard.angle, Math.sin(i * 1.6) * 0.05);
      this.transform.scale.set(shard.width * (0.35 + grow * 0.65), shard.height * grow, shard.width * (0.35 + grow * 0.65));
      this.transform.updateMatrix();
      this.crystals.setMatrixAt(i, this.transform.matrix);
    }
    this.crystals.instanceMatrix.needsUpdate = true;
    if (this.light) this.light.intensity = this.config.lightPeak * (0.35 + Math.sin(activation * Math.PI / 2) * 0.65) * fade * fade;
  }

  prepareFrame(): void {
    if (this.disposed) return;
    for (const system of this.allSystems) {
      if (!system.paused && (system.time <= system.duration || system.particleNum > 0)) system.emitter.updateWorldMatrix(true, false);
    }
  }

  getParticleCount(): number {
    let count = 0;
    for (const system of this.allSystems) count += system.particleNum;
    return count;
  }
  getSystems(): readonly ParticleSystem[] { return this.allSystems; }
  getState() {
    const phase = this.getPhase();
    return {
      phase, elapsed: this.elapsed, duration: this.duration, impactAt: 0,
      phaseStartedAt: phase === "activation" ? 0 : phase === "peak" ? this.config.activationDuration : this.fadeAt,
      center: this.root.position.toArray(), radius: this.radius, crystals: CRYSTALS,
      vaporStarted: this.vaporStarted, residualStarted: this.residualStarted,
      groundOpacity: this.groundMaterial.opacity, boundaryOpacity: this.rimMaterial.opacity,
    };
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.allSystems) system.dispose();
    this.crystals.dispose();
    this.crystalMaterial.dispose();
    this.groundMaterial.dispose();
    this.rimMaterial.dispose();
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

export class CampoGeloVfxController {
  private readonly resources = new CampoGeloResources();
  private readonly renderer = new BatchedRenderer();
  private readonly root = new Group();
  private readonly casts = new Set<CampoGeloCast>();
  private readonly config: CampoGeloVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<CampoGeloVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    this.config = { ...DEFAULT_CAMPO_GELO_VFX_CONFIG };
    for (const key of Object.keys(this.config) as (keyof CampoGeloVfxConfig)[]) {
      const value = config[key];
      if (value !== undefined && Number.isFinite(value)) this.config[key] = value;
    }
    this.config.activationDuration = MathUtils.clamp(this.config.activationDuration, 0.1, 0.25);
    this.config.peakDuration = MathUtils.clamp(this.config.peakDuration, 0.08, 0.2);
    this.config.fadeDuration = MathUtils.clamp(this.config.fadeDuration, 0.3, 0.5);
    this.config.radius = MathUtils.clamp(this.config.radius, 0.25, 12);
    this.config.maxConcurrentCasts = Math.floor(MathUtils.clamp(this.config.maxConcurrentCasts, 1, 6));
    this.config.lightPeak = MathUtils.clamp(this.config.lightPeak, 0, 2);
    this.root.name = "tk-campo-gelo-vfx-root";
    this.renderer.name = "tk-campo-gelo-quarks";
    scene.add(this.root, this.renderer);
  }

  castCampoGelo(center: Vector3, radius = this.config.radius): void {
    if (this.disposed) throw new Error("CampoGeloVfxController descartado");
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.z)
      || !Number.isFinite(radius) || radius <= 0 || radius > 12) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) this.casts.values().next().value?.dispose();
    this.casts.add(new CampoGeloCast(this.root, this.renderer, this.resources, this.config,
      center.clone(), radius, cast => this.casts.delete(cast), this.lightPool));
  }

  update(dt: number, _width = 1, _height = 1): void {
    if (this.disposed || this.casts.size === 0 || !Number.isFinite(dt) || dt <= 0) return;
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
    this.scene.remove(this.root, this.renderer);
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

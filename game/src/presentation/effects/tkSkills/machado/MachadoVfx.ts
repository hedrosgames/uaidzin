import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createMachadoImpactSystems,
  createMachadoFallSystems,
  createMachadoParticleMaterials,
  disposeMachadoParticleMaterials,
  type MachadoImpactSystems,
  type MachadoParticleMaterials,
} from "./MachadoParticleSystems";
import {
  createMachadoTextures,
  disposeMachadoTextures,
  type MachadoTextureSet,
} from "./MachadoTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface MachadoVfxConfig {
  fallDuration: number;
  maxConcurrentCasts: number;
  trailEmission: number;
  sparkEmission: number;
  shardBurstCount: number;
  dropHeight: number;
  spinSpeed: number;
  cleanupDelay: number;
  targetHeight: number;
  lightIntensity: number;
}

export const DEFAULT_MACHADO_VFX_CONFIG: MachadoVfxConfig = {
  fallDuration: 0.15,
  maxConcurrentCasts: 3,
  trailEmission: 55,
  sparkEmission: 26,
  shardBurstCount: 34,
  dropHeight: 4.4,
  spinSpeed: 14,
  cleanupDelay: 0.9,
  targetHeight: 0.05,
  lightIntensity: 7.4,
};

type CastPhase = "fall" | "impact";

interface MachadoSharedResources {
  textures: MachadoTextureSet;
  particleMaterials: MachadoParticleMaterials;
  handleGeometry: CylinderGeometry;
  handleMaterial: MeshStandardMaterial;
  bladeGeometry: CylinderGeometry;
  bladeMaterial: MeshStandardMaterial;
  shockGeometry: RingGeometry;
  shockMaterial: MeshBasicMaterial;
  flashGeometry: SphereGeometry;
  flashMaterial: MeshBasicMaterial;
}

function createSharedResources(
  textures: MachadoTextureSet,
): MachadoSharedResources {
  const particleMaterials = createMachadoParticleMaterials(textures);
  const handleGeometry = new CylinderGeometry(0.032, 0.038, 1.12, 10);
  handleGeometry.translate(0, -0.2, 0);
  const handleMaterial = new MeshStandardMaterial({
    color: 0x4a3023,
    emissive: 0x5a2408,
    emissiveIntensity: 0.22,
    roughness: 0.55,
    metalness: 0.4,
  });
  const bladeGeometry = new CylinderGeometry(0.34, 0.34, 0.075, 24, 1, false, 0, Math.PI);
  bladeGeometry.rotateZ(Math.PI / 2);
  const bladeMaterial = new MeshStandardMaterial({
    color: 0xffb648,
    emissive: 0xff7a1a,
    emissiveIntensity: 1.6,
    roughness: 0.3,
    metalness: 0.7,
  });
  const shockGeometry = new RingGeometry(0.34, 0.5, 48);
  const shockMaterial = new MeshBasicMaterial({
    color: 0xffa030,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const flashGeometry = new SphereGeometry(1, 16, 12);
  const flashMaterial = new MeshBasicMaterial({
    color: 0xfff0b4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  return {
    textures,
    particleMaterials,
    handleGeometry,
    handleMaterial,
    bladeGeometry,
    bladeMaterial,
    shockGeometry,
    shockMaterial,
    flashGeometry,
    flashMaterial,
  };
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return (
    Number.isFinite(vector.x) &&
    Number.isFinite(vector.y) &&
    Number.isFinite(vector.z)
  );
}

class MachadoCast {
  private readonly axe: Group;
  private readonly impactSystems: MachadoImpactSystems;
  private readonly systems: ParticleSystem[];
  private readonly shock: Mesh;
  private readonly shockMaterial: MeshBasicMaterial;
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly fallSystems: {
    trail: ParticleSystem;
    sparks: ParticleSystem;
    all: ParticleSystem[];
  };
  private phase: CastPhase = "fall";
  private fallElapsed = 0;
  private impactElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: MachadoSharedResources,
    private readonly config: MachadoVfxConfig,
    private readonly target: Vector3,
    private readonly onDispose: (cast: MachadoCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.axe = new Group();
    this.axe.name = "tk-machado-axe";
    const handle = new Mesh(shared.handleGeometry, shared.handleMaterial);
    const blade = new Mesh(shared.bladeGeometry, shared.bladeMaterial);
    blade.position.y = 0.5;
    this.axe.add(handle, blade);
    this.axe.position.set(
      target.x,
      target.y + config.dropHeight,
      target.z,
    );
    this.axe.rotation.set(0.42, 0, config.spinSpeed * config.fallDuration);
    castRoot.add(this.axe);

    this.impactSystems = createMachadoImpactSystems(shared.particleMaterials, config);
    const fallSystems = createMachadoFallSystems(shared.particleMaterials, config);
    this.fallSystems = fallSystems;
    this.systems = [...fallSystems.all, ...this.impactSystems.all];
    for (const system of this.systems) {
      system.emitter.position.copy(this.axe.position);
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    for (const system of fallSystems.all) system.play();

    this.shockMaterial = shared.shockMaterial.clone();
    this.shock = new Mesh(shared.shockGeometry, this.shockMaterial);
    this.shock.name = "tk-machado-shock";
    this.shock.rotation.x = -Math.PI / 2;
    this.shock.position.set(target.x, target.y + 0.02, target.z);
    this.shock.visible = false;
    this.shock.renderOrder = 11;
    this.castRoot.add(this.shock);

    this.flash = new Mesh(shared.flashGeometry, shared.flashMaterial.clone());
    this.flash.name = "tk-machado-impact-core";
    this.flash.visible = false;
    this.castRoot.add(this.flash);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xff8a2a, 8.5);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xff8a2a, 0, 8.5, 2);
      this.isPooledLight = false;
    }
    if (this.light) this.castRoot.add(this.light);
  }

  getPhase(): CastPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      progress: Math.min(1, this.fallElapsed / this.config.fallDuration),
      elapsed: this.fallElapsed,
      axe: this.axe.position.toArray(),
      target: this.target.toArray(),
      impactAge: this.impactElapsed,
      axeVisible: this.axe.visible,
    };
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
  }

  getSystems(): ParticleSystem[] {
    return this.systems;
  }

  prepareFrame(): void {
    for (const system of this.systems) {
      system.emitter.updateWorldMatrix(true, false);
    }
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    if (this.phase === "fall") {
      this.updateFall(deltaTime);
      return;
    }
    this.updateImpact(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.axe, this.shock, this.flash);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.shockMaterial.dispose();
    this.flash.material.dispose();
    this.onDispose(this);
  }

  private updateFall(deltaTime: number): void {
    this.fallElapsed = Math.min(
      this.fallElapsed + deltaTime,
      this.config.fallDuration,
    );
    if (this.config.fallDuration - this.fallElapsed < 1e-9) {
      this.fallElapsed = this.config.fallDuration;
    }
    const progress = MathUtils.clamp(
      this.fallElapsed / this.config.fallDuration,
      0,
      1,
    );
    const eased = progress * progress;
    this.axe.position.set(
      this.target.x,
      this.target.y + this.config.dropHeight * (1 - eased),
      this.target.z,
    );
    this.axe.rotation.z += this.config.spinSpeed * deltaTime;
    for (const system of this.fallSystems.all) {
      system.emitter.position.copy(this.axe.position);
    }
    if (this.light) {
      this.light.position.copy(this.axe.position);
      this.light.intensity = 0.5 + progress * 1.4;
    }
    if (progress >= 1) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.axe.visible = false;
    for (const system of this.fallSystems.all) system.endEmit();
    const impactEmitters = [this.impactSystems.shards, this.impactSystems.plume];
    for (const system of impactEmitters) {
      system.emitter.position.copy(this.target);
      system.emitter.quaternion.identity();
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.shock.scale.setScalar(0.24);
    this.shockMaterial.opacity = 0.32;
    this.shock.visible = true;
    this.flash.position.copy(this.target);
    this.flash.scale.setScalar(0.16);
    this.flash.material.opacity = 1;
    this.flash.visible = true;
    if (this.light) {
      this.light.position.set(this.target.x, this.target.y + 0.4, this.target.z);
      this.light.intensity = this.config.lightIntensity;
    }
  }

  private updateImpact(deltaTime: number): void {
    this.impactElapsed += deltaTime;
    if (this.impactElapsed >= 0.05) this.axe.visible = false;
    const shockProgress = MathUtils.clamp(this.impactElapsed / 0.3, 0, 1);
    const shockFade = Math.pow(1 - shockProgress, 2);
    this.shock.scale.setScalar(0.24 + shockProgress * 3.6);
    this.shockMaterial.opacity = shockFade * 0.32;
    if (this.light) {
      this.light.intensity = this.config.lightIntensity * shockFade;
    }
    const flashProgress = MathUtils.clamp(this.impactElapsed / 0.15, 0, 1);
    this.flash.scale.setScalar(0.16 + flashProgress * 0.66);
    this.flash.material.opacity = Math.pow(1 - flashProgress, 2);
    this.flash.visible = flashProgress < 1;
    if (this.impactElapsed >= this.config.cleanupDelay) this.dispose();
  }
}

export class MachadoVfxController {
  private readonly textures = createMachadoTextures();
  private readonly shared = createSharedResources(this.textures);
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<MachadoCast>();
  private readonly config: MachadoVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<MachadoVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_MACHADO_VFX_CONFIG, ...config };
    this.config = {
      fallDuration: finiteOr(merged.fallDuration, DEFAULT_MACHADO_VFX_CONFIG.fallDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_MACHADO_VFX_CONFIG.maxConcurrentCasts, 1)),
      trailEmission: finiteOr(merged.trailEmission, DEFAULT_MACHADO_VFX_CONFIG.trailEmission, 0),
      sparkEmission: finiteOr(merged.sparkEmission, DEFAULT_MACHADO_VFX_CONFIG.sparkEmission, 0),
      shardBurstCount: Math.floor(finiteOr(merged.shardBurstCount, DEFAULT_MACHADO_VFX_CONFIG.shardBurstCount, 1)),
      dropHeight: finiteOr(merged.dropHeight, DEFAULT_MACHADO_VFX_CONFIG.dropHeight, 0.5),
      spinSpeed: finiteOr(merged.spinSpeed, DEFAULT_MACHADO_VFX_CONFIG.spinSpeed, 0),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_MACHADO_VFX_CONFIG.cleanupDelay, 0.1),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_MACHADO_VFX_CONFIG.targetHeight, 0),
      lightIntensity: finiteOr(merged.lightIntensity, DEFAULT_MACHADO_VFX_CONFIG.lightIntensity, 0.1),
    };
    this.castRoot.name = "tk-machado-vfx-root";
    this.batchedRenderer.name = "tk-machado-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castMachado(target: Vector3): void {
    if (this.disposed) throw new Error("MachadoVfxController descartado");
    if (!isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as MachadoCast | undefined;
      oldestCast?.dispose();
    }
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new MachadoCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      impactTarget,
      (finishedCast) => this.casts.delete(finishedCast),
      this.lightPool,
    );
    this.casts.add(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    const frameDelta = Number.isFinite(deltaTime)
      ? MathUtils.clamp(deltaTime, 0, 0.1)
      : 0;
    this.accumulator = Math.min(this.accumulator + frameDelta, 0.2);
    let stepCount = 0;
    while (this.accumulator + 1e-9 >= 1 / 60 && stepCount < 6) {
      this.updateFrame(1 / 60, width, height);
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
      stepCount += 1;
    }
  }

  clear(): void {
    for (const cast of [...this.casts]) cast.dispose();
    this.accumulator = 0;
    this.batchedRenderer.update(0);
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    let particleCount = 0;
    for (const cast of this.casts) particleCount += cast.getParticleCount();
    return particleCount;
  }

  getPhase(): CastPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasImpact = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "impact") hasImpact = true;
    }
    return hasImpact ? "impact" : "fall";
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap((cast) => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map((cast) => cast.getState());
  }

  private updateFrame(deltaTime: number, width: number, height: number): void {
    for (const cast of [...this.casts]) {
      cast.update(deltaTime);
      cast.prepareFrame();
    }
    this.updateBatchResolution(width, height);
    this.batchedRenderer.update(deltaTime);
  }

  private updateBatchResolution(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    this.batchResolution.set(width, height);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.castRoot, this.batchedRenderer);
    for (const batch of this.batchedRenderer.batches) {
      this.batchedRenderer.remove(batch);
      batch.dispose();
      if (Array.isArray(batch.material)) {
        for (const material of batch.material) material.dispose();
      } else {
        batch.material.dispose();
      }
    }
    this.batchedRenderer.batches.length = 0;
    this.batchedRenderer.systemToBatchIndex.clear();
    this.shared.handleGeometry.dispose();
    this.shared.handleMaterial.dispose();
    this.shared.bladeGeometry.dispose();
    this.shared.bladeMaterial.dispose();
    this.shared.shockGeometry.dispose();
    this.shared.shockMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterial.dispose();
    disposeMachadoParticleMaterials(this.shared.particleMaterials);
    disposeMachadoTextures(this.textures);
    this.castRoot.clear();
  }
}

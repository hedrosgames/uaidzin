import {
  AdditiveBlending,
  ConeGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Texture,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createFireBurstParticleMaterials,
  createFireBurstFlightSystems,
  createFireBurstImpactSystems,
  disposeFireBurstParticleMaterials,
  type FireBurstParticleMaterials,
  type FireBurstImpactSystems,
} from "./FireBurstParticleSystems";
import { FireBurstChain, type FireBurstChainResources } from "./FireBurstChain";
import { createFireBurstFlameTexture } from "./FireBurstFlameTexture";
import {
  createFireBurstTextures,
  disposeFireBurstTextures,
  type FireBurstTextureSet,
} from "./FireBurstTextures";
import type { TkLightPool } from "../TkLightPool";

export interface FireBurstVfxConfig {
  flightDuration: number;
  maxConcurrentCasts: number;
  trailEmission: number;
  sparkEmission: number;
  chainSpacing: number;
  chainMaxLinks: number;
  cleanupDelay: number;
  originHeight: number;
  targetHeight: number;
}

export const DEFAULT_FIRE_BURST_VFX_CONFIG: FireBurstVfxConfig = {
  flightDuration: 0.5,
  maxConcurrentCasts: 3,
  trailEmission: 72,
  sparkEmission: 40,
  chainSpacing: 0.19,
  chainMaxLinks: 128,
  cleanupDelay: 0.85,
  originHeight: 1.05,
  targetHeight: 0.9,
};

type CastPhase = "flight" | "impact";

export const FIRE_BURST_CHAIN_COUNT = 5;

interface FireBurstSharedResources extends FireBurstChainResources {
  textures: FireBurstTextureSet;
  flameTexture: Texture;
  particleMaterials: FireBurstParticleMaterials;
  chainGeometry: TorusGeometry;
  chainMaterial: MeshStandardMaterial;
  shockGeometry: RingGeometry;
  shockMaterial: MeshBasicMaterial;
  flashGeometry: SphereGeometry;
  flashMaterial: MeshBasicMaterial;
}

const FORWARD = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);

function createSharedResources(
  textures: FireBurstTextureSet,
): FireBurstSharedResources {
  const flameTexture = createFireBurstFlameTexture();
  const particleMaterials = createFireBurstParticleMaterials(textures, flameTexture);
  const chainGeometry = new TorusGeometry(0.15, 0.038, 6, 16);
  chainGeometry.scale(0.76, 1.18, 1);
  const chainMaterial = new MeshStandardMaterial({
    map: textures.chain,
    color: 0xc7b9aa,
    emissive: 0x9a2e08,
    emissiveIntensity: 0.52,
    roughness: 0.42,
    metalness: 0.72,
  });
  const tipGeometry = new ConeGeometry(0.23, 0.68, 4);
  tipGeometry.scale(0.74, 1, 1);
  tipGeometry.translate(0, -0.34, 0);
  const tipMaterial = new MeshStandardMaterial({
    color: 0xffd09a,
    emissive: 0xff5a12,
    emissiveIntensity: 0.65,
    roughness: 0.28,
    metalness: 0.62,
  });
  const shockGeometry = new RingGeometry(0.32, 0.47, 48);
  const shockMaterial = new MeshBasicMaterial({
    color: 0xffa500,
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
    color: 0xffedb0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  return {
    textures,
    flameTexture,
    particleMaterials,
    chainGeometry,
    chainMaterial,
    tipGeometry,
    tipMaterial,
    shockGeometry,
    shockMaterial,
    flashGeometry,
    flashMaterial,
  };
}

function orientEmitter(
  emitter: Object3D,
  position: Vector3,
  direction: Vector3,
): void {
  emitter.position.copy(position);
  emitter.quaternion.setFromUnitVectors(FORWARD, direction);
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class FireBurstCast {
  private readonly chains: FireBurstChain[] = [];
  private readonly impactSystems: FireBurstImpactSystems;
  private readonly systems: ParticleSystem[];
  private readonly shock: Mesh;
  private readonly shockMaterial: MeshBasicMaterial;
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private phase: CastPhase = "flight";
  private flightElapsed = 0;
  private impactElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: FireBurstSharedResources,
    private readonly config: FireBurstVfxConfig,
    origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: FireBurstCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.impactSystems = createFireBurstImpactSystems(shared.particleMaterials);
    for (let index = 0; index < FIRE_BURST_CHAIN_COUNT; index += 1) {
      const flightSystems = createFireBurstFlightSystems(shared.particleMaterials, config);
      this.chains.push(new FireBurstChain(
        castRoot, shared, flightSystems, origin, target,
        Math.random() * Math.PI * 2,
        config.chainSpacing, config.chainMaxLinks,
      ));
      for (const system of flightSystems.all) system.play();
    }
    this.systems = [
      ...this.chains.flatMap((chain) => chain.systems.all),
      ...this.impactSystems.all,
    ];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.shockMaterial = shared.shockMaterial.clone();
    this.shock = new Mesh(shared.shockGeometry, this.shockMaterial);
    this.shock.name = "fire-burst-shock";
    this.shock.rotation.x = -Math.PI / 2;
    this.shock.visible = false;
    this.shock.renderOrder = 11;
    this.castRoot.add(this.shock);

    this.flash = new Mesh(shared.flashGeometry, shared.flashMaterial.clone());
    this.flash.name = "fire-burst-impact-core";
    this.flash.visible = false;
    this.castRoot.add(this.flash);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xff7a1a, 7.5);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xff7a1a, 0, 7.5, 2);
      this.castRoot.add(this.light);
      this.isPooledLight = false;
    }
    this.updateFlight(0);
  }

  getPhase(): CastPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      progress: Math.min(1, this.flightElapsed / this.config.flightDuration),
      elapsed: this.flightElapsed,
      head: this.chains[0].head.toArray(),
      target: this.target.toArray(),
      chains: this.chains.map((chain) => chain.getState()),
      impactAge: this.impactElapsed,
    };
  }

  getParticleCount(): number {
    return this.systems.reduce(
      (total, system) => total + system.particleNum,
      0,
    );
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
    if (this.phase === "flight") {
      this.updateFlight(deltaTime);
      return;
    }
    this.updateImpact(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    for (const chain of this.chains) chain.dispose();
    this.castRoot.remove(this.shock, this.flash);
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

  private updateFlight(deltaTime: number): void {
    this.flightElapsed = Math.min(this.flightElapsed + deltaTime, this.config.flightDuration);
    if (this.config.flightDuration - this.flightElapsed < 1e-9) {
      this.flightElapsed = this.config.flightDuration;
    }
    const linearProgress = MathUtils.clamp(
      this.flightElapsed / this.config.flightDuration,
      0,
      1,
    );
    for (const chain of this.chains) chain.update(linearProgress, this.flightElapsed);
    if (this.light) {
      this.light.position.copy(this.chains[0].head);
      this.light.intensity = 2.2 + Math.sin(linearProgress * Math.PI) * 2;
    }
    if (linearProgress >= 1) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    for (const chain of this.chains) {
      for (const system of chain.systems.all) system.endEmit();
    }
    this.impactSystems.impact.emitter.position.copy(this.target);
    this.impactSystems.impact.emitter.quaternion.identity();
    this.impactSystems.impact.emitter.visible = true;
    this.impactSystems.impact.restart();
    this.impactSystems.impact.play();
    orientEmitter(
      this.impactSystems.plume.emitter,
      this.target,
      UP,
    );
    this.impactSystems.plume.emitter.visible = true;
    this.impactSystems.plume.restart();
    this.impactSystems.plume.play();
    this.shock.position.copy(this.target);
    this.shock.quaternion.setFromUnitVectors(FORWARD, this.chains[0].tangent);
    this.shock.scale.setScalar(0.22);
    this.shockMaterial.opacity = 0.3;
    this.shock.visible = true;
    this.flash.position.copy(this.target);
    this.flash.scale.setScalar(0.14);
    this.flash.material.opacity = 1;
    this.flash.visible = true;
    if (this.light) {
      this.light.position.copy(this.target);
      this.light.intensity = 6.2;
    }
  }

  private updateImpact(deltaTime: number): void {
    this.impactElapsed += deltaTime;
    if (this.impactElapsed >= 0.055) {
      for (const chain of this.chains) chain.hide();
    }
    const shockProgress = MathUtils.clamp(this.impactElapsed / 0.26, 0, 1);
    const shockFade = Math.pow(1 - shockProgress, 2);
    this.shock.scale.setScalar(0.22 + shockProgress * 3.2);
    this.shockMaterial.opacity = shockFade * 0.3;
    if (this.light) {
      this.light.intensity = 6.2 * shockFade;
    }
    const flashProgress = MathUtils.clamp(this.impactElapsed / 0.14, 0, 1);
    this.flash.scale.setScalar(0.14 + flashProgress * 0.62);
    this.flash.material.opacity = Math.pow(1 - flashProgress, 2);
    this.flash.visible = flashProgress < 1;
    if (this.impactElapsed >= this.config.cleanupDelay) this.dispose();
  }
}

export class FireBurstVfxController {
  private readonly textures = createFireBurstTextures();
  private readonly shared = createSharedResources(this.textures);
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<FireBurstCast>();
  private readonly config: FireBurstVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<FireBurstVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_FIRE_BURST_VFX_CONFIG, ...config };
    this.config = {
      flightDuration: finiteOr(merged.flightDuration, DEFAULT_FIRE_BURST_VFX_CONFIG.flightDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_FIRE_BURST_VFX_CONFIG.maxConcurrentCasts, 1)),
      trailEmission: finiteOr(merged.trailEmission, DEFAULT_FIRE_BURST_VFX_CONFIG.trailEmission, 0),
      sparkEmission: finiteOr(merged.sparkEmission, DEFAULT_FIRE_BURST_VFX_CONFIG.sparkEmission, 0),
      chainSpacing: finiteOr(merged.chainSpacing, DEFAULT_FIRE_BURST_VFX_CONFIG.chainSpacing, 0.05),
      chainMaxLinks: Math.floor(finiteOr(merged.chainMaxLinks, DEFAULT_FIRE_BURST_VFX_CONFIG.chainMaxLinks, 10)),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_FIRE_BURST_VFX_CONFIG.cleanupDelay, 0.1),
      originHeight: finiteOr(merged.originHeight, DEFAULT_FIRE_BURST_VFX_CONFIG.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_FIRE_BURST_VFX_CONFIG.targetHeight, 0),
    };
    this.castRoot.name = "fire-burst-vfx-root";
    this.batchedRenderer.name = "fire-burst-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castFireBurst(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("FireBurstVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as
        | FireBurstCast
        | undefined;
      oldestCast?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new FireBurstCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      launchOrigin,
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
    return hasImpact ? "impact" : "flight";
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
    for (const batch of this.batchedRenderer.batches) {
      const material = batch.material;
      if (!(material instanceof ShaderMaterial)) continue;
      const value = material.uniforms.resolution?.value;
      if (value instanceof Vector2) value.copy(this.batchResolution);
    }
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
    this.shared.chainGeometry.dispose();
    this.shared.chainMaterial.dispose();
    this.shared.tipGeometry.dispose();
    this.shared.tipMaterial.dispose();
    this.shared.flameTexture.dispose();
    this.shared.shockGeometry.dispose();
    this.shared.shockMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterial.dispose();
    disposeFireBurstParticleMaterials(this.shared.particleMaterials);
    disposeFireBurstTextures(this.textures);
    this.castRoot.clear();
  }
}

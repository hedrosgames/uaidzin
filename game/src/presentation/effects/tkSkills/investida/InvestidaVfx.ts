import {
  AdditiveBlending,
  ConeGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createInvestidaArrivalSystems,
  createInvestidaFlightSystems,
  createInvestidaParticleMaterials,
  disposeInvestidaParticleMaterials,
  type InvestidaArrivalSystems,
  type InvestidaFlightSystems,
  type InvestidaParticleMaterials,
} from "./InvestidaParticleSystems";
import {
  createInvestidaTextures,
  disposeInvestidaTextures,
  type InvestidaTextureSet,
} from "./InvestidaTextures";
import type { TkLightPool } from "../../TkLightPool";
import { createHelixCurve } from "../../vfxKit/curveTrajectory";
import { LinkProjectile } from "../../vfxKit/linkProjectile";

export interface InvestidaVfxConfig {
  dashDuration: number;
  maxConcurrentCasts: number;
  windEmission: number;
  gustEmission: number;
  dustBurstCount: number;
  linkSpacing: number;
  linkMaxLinks: number;
  cleanupDelay: number;
  originHeight: number;
  targetHeight: number;
}

export const DEFAULT_INVESTIDA_VFX_CONFIG: InvestidaVfxConfig = {
  dashDuration: 0.15,
  maxConcurrentCasts: 3,
  windEmission: 60,
  gustEmission: 22,
  dustBurstCount: 34,
  linkSpacing: 0.26,
  linkMaxLinks: 96,
  cleanupDelay: 0.6,
  originHeight: 1.0,
  targetHeight: 0.35,
};

type CastPhase = "dash" | "arrival";

interface InvestidaSharedResources {
  textures: InvestidaTextureSet;
  particleMaterials: InvestidaParticleMaterials;
  linkGeometry: TorusGeometry;
  linkMaterial: MeshStandardMaterial;
  tipGeometry: ConeGeometry;
  tipMaterial: MeshStandardMaterial;
  ringGeometry: RingGeometry;
  ringMaterial: MeshBasicMaterial;
}

function createSharedResources(): InvestidaSharedResources {
  const textures = createInvestidaTextures();
  const particleMaterials = createInvestidaParticleMaterials(textures);
  const linkGeometry = new TorusGeometry(0.11, 0.026, 6, 16);
  linkGeometry.scale(1.4, 0.82, 1);
  const linkMaterial = new MeshStandardMaterial({
    map: textures.link,
    color: 0x9aa5ae,
    emissive: 0x1c2730,
    emissiveIntensity: 0.08,
    roughness: 0.36,
    metalness: 0.78,
  });
  const tipGeometry = new ConeGeometry(0.16, 0.5, 4);
  tipGeometry.translate(0, 0.25, 0);
  const tipMaterial = new MeshStandardMaterial({
    color: 0xb8c2cc,
    roughness: 0.28,
    metalness: 0.82,
  });
  const ringGeometry = new RingGeometry(0.28, 0.52, 44);
  const ringMaterial = new MeshBasicMaterial({
    color: 0xcbb089,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return {
    textures,
    particleMaterials,
    linkGeometry,
    linkMaterial,
    tipGeometry,
    tipMaterial,
    ringGeometry,
    ringMaterial,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

const UP = new Vector3(0, 1, 0);

class InvestidaDash extends LinkProjectile {
  constructor(
    root: Group,
    shared: InvestidaSharedResources,
    readonly systems: InvestidaFlightSystems,
    origin: Vector3,
    target: Vector3,
    phase: number,
    config: InvestidaVfxConfig,
  ) {
    super(
      root,
      {
        linkGeometry: shared.linkGeometry,
        linkMaterial: shared.linkMaterial,
        tipGeometry: shared.tipGeometry,
        tipMaterial: shared.tipMaterial,
      },
      createHelixCurve(origin, target, phase, {
        samples: 24,
        radiusFactor: 0.02,
        radiusJitter: 0.012,
        maxRadius: 0.09,
        turns: 0.3,
        turnsJitter: 0.2,
        lateralFactor: 0.5,
        verticalFactor: 0.6,
      }),
      phase,
      systems.all,
      {
        objectName: "investida-link",
        tipName: "investida-tip",
        spacing: config.linkSpacing,
        maxLinks: config.linkMaxLinks,
        spinSpeed: 18,
      },
    );
  }
}

class InvestidaCast {
  private readonly dash: InvestidaDash;
  private readonly arrivalSystems: InvestidaArrivalSystems;
  private readonly systems: ParticleSystem[];
  private readonly ring: Mesh;
  private readonly ringMaterial: MeshBasicMaterial;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private phase: CastPhase = "dash";
  private dashElapsed = 0;
  private arrivalElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: InvestidaSharedResources,
    private readonly config: InvestidaVfxConfig,
    origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: InvestidaCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    const flightSystems = createInvestidaFlightSystems(shared.particleMaterials, config);
    this.dash = new InvestidaDash(
      castRoot,
      shared,
      flightSystems,
      origin,
      target,
      Math.random() * Math.PI * 2,
      config,
    );
    for (const system of flightSystems.all) system.play();
    this.arrivalSystems = createInvestidaArrivalSystems(shared.particleMaterials, config);
    this.systems = [...flightSystems.all, ...this.arrivalSystems.all];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.ringMaterial = shared.ringMaterial.clone();
    this.ring = new Mesh(shared.ringGeometry, this.ringMaterial);
    this.ring.name = "investida-ring";
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.ring.renderOrder = 11;
    this.castRoot.add(this.ring);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xd8c9a0, 5.5);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xd8c9a0, 0, 5.5, 2);
      this.isPooledLight = false;
    }
    if (this.light) this.castRoot.add(this.light);
    this.dash.update(0, 0);
  }

  getPhase(): CastPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      progress: Math.min(1, this.dashElapsed / this.config.dashDuration),
      elapsed: this.dashElapsed,
      head: this.dash.head.toArray(),
      target: this.target.toArray(),
      links: this.dash.getState(),
      arrivalAge: this.arrivalElapsed,
    };
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
  }

  getSystems(): ParticleSystem[] {
    return this.systems;
  }

  prepareFrame(): void {
    for (const system of this.systems) system.emitter.updateWorldMatrix(true, false);
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    if (this.phase === "dash") {
      this.updateDash(deltaTime);
      return;
    }
    this.updateArrival(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.dash.dispose();
    this.castRoot.remove(this.ring);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.ringMaterial.dispose();
    this.onDispose(this);
  }

  private updateDash(deltaTime: number): void {
    this.dashElapsed = Math.min(this.dashElapsed + deltaTime, this.config.dashDuration);
    if (this.config.dashDuration - this.dashElapsed < 1e-9) {
      this.dashElapsed = this.config.dashDuration;
    }
    const progress = MathUtils.clamp(this.dashElapsed / this.config.dashDuration, 0, 1);
    this.dash.update(progress, this.dashElapsed);
    if (this.light) {
      this.light.position.copy(this.dash.head);
      this.light.intensity = 1.1 + Math.sin(progress * Math.PI) * 0.6;
    }
    if (progress >= 1) this.triggerArrival();
  }

  private triggerArrival(): void {
    this.phase = "arrival";
    for (const system of this.dash.systems.all) system.endEmit();
    this.dash.hide();
    this.arrivalSystems.dustBurst.emitter.position.copy(this.target);
    this.arrivalSystems.dustBurst.emitter.quaternion.identity();
    this.arrivalSystems.dustBurst.emitter.visible = true;
    this.arrivalSystems.dustBurst.restart();
    this.arrivalSystems.dustBurst.play();
    this.arrivalSystems.dustPlume.emitter.position.copy(this.target);
    this.arrivalSystems.dustPlume.emitter.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), UP);
    this.arrivalSystems.dustPlume.emitter.visible = true;
    this.arrivalSystems.dustPlume.restart();
    this.arrivalSystems.dustPlume.play();
    this.ring.position.copy(this.target);
    this.ring.position.y = Math.max(this.target.y - this.config.targetHeight + 0.04, 0.04);
    this.ring.scale.setScalar(0.35);
    this.ringMaterial.opacity = 0.5;
    this.ring.visible = true;
    if (this.light) {
      this.light.position.copy(this.target);
      this.light.intensity = 2.2;
    }
  }

  private updateArrival(deltaTime: number): void {
    this.arrivalElapsed += deltaTime;
    const ringProgress = MathUtils.clamp(this.arrivalElapsed / 0.3, 0, 1);
    const ringFade = Math.pow(1 - ringProgress, 2);
    this.ring.scale.setScalar(0.35 + ringProgress * 2.4);
    this.ringMaterial.opacity = ringFade * 0.5;
    this.ring.visible = ringProgress < 1;
    if (this.light) {
      this.light.intensity = 2.2 * ringFade;
    }
    if (this.arrivalElapsed >= this.config.cleanupDelay) this.dispose();
  }
}

export class InvestidaVfxController {
  private readonly shared = createSharedResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<InvestidaCast>();
  private readonly config: InvestidaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<InvestidaVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_INVESTIDA_VFX_CONFIG, ...config };
    this.config = {
      dashDuration: finiteOr(merged.dashDuration, DEFAULT_INVESTIDA_VFX_CONFIG.dashDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_INVESTIDA_VFX_CONFIG.maxConcurrentCasts, 1)),
      windEmission: finiteOr(merged.windEmission, DEFAULT_INVESTIDA_VFX_CONFIG.windEmission, 0),
      gustEmission: finiteOr(merged.gustEmission, DEFAULT_INVESTIDA_VFX_CONFIG.gustEmission, 0),
      dustBurstCount: Math.floor(finiteOr(merged.dustBurstCount, DEFAULT_INVESTIDA_VFX_CONFIG.dustBurstCount, 1)),
      linkSpacing: finiteOr(merged.linkSpacing, DEFAULT_INVESTIDA_VFX_CONFIG.linkSpacing, 0.05),
      linkMaxLinks: Math.floor(finiteOr(merged.linkMaxLinks, DEFAULT_INVESTIDA_VFX_CONFIG.linkMaxLinks, 10)),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_INVESTIDA_VFX_CONFIG.cleanupDelay, 0.1),
      originHeight: finiteOr(merged.originHeight, DEFAULT_INVESTIDA_VFX_CONFIG.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_INVESTIDA_VFX_CONFIG.targetHeight, 0),
    };
    this.castRoot.name = "investida-vfx-root";
    this.batchedRenderer.name = "investida-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castInvestida(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("InvestidaVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as InvestidaCast | undefined;
      oldestCast?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const dashTarget = target.clone();
    dashTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new InvestidaCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      launchOrigin,
      dashTarget,
      (finishedCast) => this.casts.delete(finishedCast),
      this.lightPool,
    );
    this.casts.add(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    const frameDelta = Number.isFinite(deltaTime) ? MathUtils.clamp(deltaTime, 0, 0.1) : 0;
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
    let hasArrival = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "arrival") hasArrival = true;
    }
    return hasArrival ? "arrival" : "dash";
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
    this.shared.linkGeometry.dispose();
    this.shared.linkMaterial.dispose();
    this.shared.tipGeometry.dispose();
    this.shared.tipMaterial.dispose();
    this.shared.ringGeometry.dispose();
    this.shared.ringMaterial.dispose();
    disposeInvestidaParticleMaterials(this.shared.particleMaterials);
    disposeInvestidaTextures(this.shared.textures);
    this.castRoot.clear();
  }
}

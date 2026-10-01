import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createJulgamentoImpactSystems,
  createJulgamentoParticleMaterials,
  disposeJulgamentoParticleMaterials,
  type JulgamentoImpactSystems,
  type JulgamentoParticleMaterials,
} from "./JulgamentoParticleSystems";
import {
  createJulgamentoTextures,
  disposeJulgamentoTextures,
  type JulgamentoTextureSet,
} from "./JulgamentoTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface JulgamentoVfxConfig {
  boltCount: number;
  boltStagger: number;
  fallDuration: number;
  dropHeight: number;
  maxConcurrentCasts: number;
  trailEmission: number;
  sparkBurstCount: number;
  plumeBurstCount: number;
  cleanupDelay: number;
  targetHeight: number;
  lightIntensity: number;
  finalBoltScale: number;
}

export const DEFAULT_JULGAMENTO_VFX_CONFIG: JulgamentoVfxConfig = {
  boltCount: 1,
  boltStagger: 0.15,
  fallDuration: 0.12,
  dropHeight: 7.5,
  maxConcurrentCasts: 3,
  trailEmission: 42,
  sparkBurstCount: 30,
  plumeBurstCount: 18,
  cleanupDelay: 1.0,
  targetHeight: 0.05,
  lightIntensity: 8.5,
  finalBoltScale: 1.3,
};

type BoltPhase = "wait" | "beam" | "impact";

interface JulgamentoSharedResources {
  textures: JulgamentoTextureSet;
  particleMaterials: JulgamentoParticleMaterials;
  beamGeometry: CylinderGeometry;
  pillarGeometry: CylinderGeometry;
  shockGeometry: RingGeometry;
  shockMaterial: MeshBasicMaterial;
  flashGeometry: SphereGeometry;
  flashMaterial: MeshBasicMaterial;
  glowGeometry: PlaneGeometry;
  glowMaterial: MeshBasicMaterial;
}

function createSharedResources(textures: JulgamentoTextureSet): JulgamentoSharedResources {
  const particleMaterials = createJulgamentoParticleMaterials(textures);
  const beamGeometry = new CylinderGeometry(0.13, 0.26, 1, 18, 1, true);
  beamGeometry.translate(0, -0.5, 0);
  const pillarGeometry = new CylinderGeometry(0.3, 0.48, 1, 20, 1, true);
  pillarGeometry.translate(0, 0.5, 0);
  const shockGeometry = new RingGeometry(0.34, 0.5, 48);
  const shockMaterial = new MeshBasicMaterial({
    color: 0x9fc9ff,
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
    color: 0xeaf5ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const glowGeometry = new PlaneGeometry(1, 1);
  const glowMaterial = new MeshBasicMaterial({
    map: textures.glow,
    color: 0xffffff,
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
    beamGeometry,
    pillarGeometry,
    shockGeometry,
    shockMaterial,
    flashGeometry,
    flashMaterial,
    glowGeometry,
    glowMaterial,
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

class JulgamentoBolt {
  readonly scale: number;
  readonly systems: ParticleSystem[];
  readonly impactSystems: JulgamentoImpactSystems;
  readonly beam: Mesh<CylinderGeometry, MeshBasicMaterial>;
  readonly pillar: Mesh<CylinderGeometry, MeshBasicMaterial>;
  readonly shock: Mesh;
  readonly shockMaterial: MeshBasicMaterial;
  readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  readonly groundGlow: Mesh;
  readonly groundGlowMaterial: MeshBasicMaterial;
  readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  readonly index: number;
  private readonly castRoot: Group;
  private readonly target: Vector3;
  private readonly config: JulgamentoVfxConfig;
  private phase: BoltPhase = "wait";
  private localTime = 0;
  private impactElapsed = 0;
  private disposed = false;

  constructor(
    castRoot: Group,
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    shared: JulgamentoSharedResources,
    config: JulgamentoVfxConfig,
    target: Vector3,
    index: number,
    scale: number,
    private readonly lightPool?: TkLightPool,
  ) {
    this.castRoot = castRoot;
    this.target = target;
    this.config = config;
    this.index = index;
    this.scale = scale;

    this.beam = new Mesh(shared.beamGeometry, shared.particleMaterials.beam.clone());
    this.beam.name = `tk-julgamento-beam-${index}`;
    this.beam.position.set(target.x, target.y + config.dropHeight, target.z);
    this.beam.scale.set(scale, 0.02, scale);
    this.beam.visible = false;
    this.beam.renderOrder = 9;
    castRoot.add(this.beam);

    this.pillar = new Mesh(shared.pillarGeometry, shared.particleMaterials.beam.clone());
    this.pillar.name = `tk-julgamento-pillar-${index}`;
    this.pillar.position.copy(target);
    this.pillar.visible = false;
    this.pillar.renderOrder = 9;
    castRoot.add(this.pillar);

    this.shockMaterial = shared.shockMaterial.clone();
    this.shock = new Mesh(shared.shockGeometry, this.shockMaterial);
    this.shock.name = `tk-julgamento-shock-${index}`;
    this.shock.rotation.x = -Math.PI / 2;
    this.shock.position.set(target.x, target.y + 0.02, target.z);
    this.shock.visible = false;
    this.shock.renderOrder = 11;
    castRoot.add(this.shock);

    this.flash = new Mesh(shared.flashGeometry, shared.flashMaterial.clone());
    this.flash.name = `tk-julgamento-flash-${index}`;
    this.flash.visible = false;
    castRoot.add(this.flash);

    this.groundGlowMaterial = shared.glowMaterial.clone();
    this.groundGlow = new Mesh(shared.glowGeometry, this.groundGlowMaterial);
    this.groundGlow.name = `tk-julgamento-glow-${index}`;
    this.groundGlow.rotation.x = -Math.PI / 2;
    this.groundGlow.position.set(target.x, target.y + 0.015, target.z);
    this.groundGlow.visible = false;
    this.groundGlow.renderOrder = 10;
    castRoot.add(this.groundGlow);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xf0c24a, 9.5 * scale);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xf0c24a, 0, 9.5 * scale, 2);
      this.isPooledLight = false;
    }
    if (this.light) castRoot.add(this.light);

    this.impactSystems = createJulgamentoImpactSystems(
      shared.particleMaterials,
      config,
      scale,
    );
    this.systems = this.impactSystems.all;
    for (const system of this.systems) {
      system.emitter.position.copy(target);
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
  }

  getPhase(): BoltPhase {
    return this.phase;
  }

  getState() {
    return {
      index: this.index,
      scale: this.scale,
      phase: this.phase,
      localTime: this.localTime,
      impactAge: this.impactElapsed,
      beamVisible: this.beam.visible,
      beamExtent: this.beam.scale.y / this.config.dropHeight,
      pillarVisible: this.pillar.visible,
      target: this.target.toArray(),
    };
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
  }

  update(deltaTime: number): void {
    if (this.disposed || this.phase === "wait") return;
    this.localTime += deltaTime;
    if (this.phase === "beam") {
      this.updateBeam();
      return;
    }
    this.updateImpact(deltaTime);
  }

  start(): void {
    if (this.disposed || this.phase !== "wait") return;
    this.phase = "beam";
    this.beam.visible = true;
    this.impactSystems.beamTrail.emitter.visible = true;
    this.impactSystems.beamTrail.restart();
    this.impactSystems.beamTrail.play();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(this.beam, this.pillar, this.shock, this.flash, this.groundGlow);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.beam.material.dispose();
    this.pillar.material.dispose();
    this.shockMaterial.dispose();
    this.flash.material.dispose();
    this.groundGlowMaterial.dispose();
  }

  private updateBeam(): void {
    const config = this.config;
    const progress = MathUtils.clamp(this.localTime / config.fallDuration, 0, 1);
    const eased = progress * progress;
    this.beam.scale.set(this.scale, Math.max(0.02, eased), this.scale);
    if (this.light) {
      this.light.position.set(
        this.target.x,
        this.target.y + config.dropHeight * (1 - eased),
        this.target.z,
      );
      this.light.intensity = 1.2 + progress * 2.4;
    }
    if (progress >= 1) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.impactElapsed = 0;
    this.beam.visible = false;
    for (const system of this.impactSystems.all) system.endEmit();
    const impactEmitters = [this.impactSystems.sparks, this.impactSystems.plume];
    for (const system of impactEmitters) {
      system.emitter.position.copy(this.target);
      system.emitter.quaternion.identity();
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.pillar.visible = true;
    this.pillar.scale.set(this.scale * 0.6, this.config.dropHeight * 0.42 * this.scale, this.scale * 0.6);
    this.pillar.material.opacity = 0.9;
    this.shock.scale.setScalar(0.26 * this.scale);
    this.shockMaterial.opacity = 0.4;
    this.shock.visible = true;
    this.flash.position.copy(this.target);
    this.flash.position.y += 0.25 * this.scale;
    this.flash.scale.setScalar(0.18 * this.scale);
    this.flash.material.opacity = 1;
    this.flash.visible = true;
    this.groundGlow.scale.setScalar(2.6 * this.scale);
    this.groundGlowMaterial.opacity = 0.85;
    this.groundGlow.visible = true;
    if (this.light) {
      this.light.position.set(this.target.x, this.target.y + 0.5 * this.scale, this.target.z);
      this.light.intensity = this.config.lightIntensity * this.scale;
    }
  }

  private updateImpact(deltaTime: number): void {
    this.impactElapsed += deltaTime;
    const shockProgress = MathUtils.clamp(this.impactElapsed / 0.34, 0, 1);
    const shockFade = Math.pow(1 - shockProgress, 2);
    this.shock.scale.setScalar((0.26 + shockProgress * 4.6) * this.scale);
    this.shockMaterial.opacity = shockFade * 0.4;
    const flashProgress = MathUtils.clamp(this.impactElapsed / 0.16, 0, 1);
    this.flash.scale.setScalar((0.18 + flashProgress * 0.78) * this.scale);
    this.flash.material.opacity = Math.pow(1 - flashProgress, 2);
    this.flash.visible = flashProgress < 1;
    const pillarProgress = MathUtils.clamp(this.impactElapsed / 0.55, 0, 1);
    const pillarRise = MathUtils.clamp(this.impactElapsed / 0.1, 0, 1);
    this.pillar.scale.set(
      this.scale * (0.6 + pillarProgress * 0.5),
      this.config.dropHeight * 0.42 * this.scale * (0.4 + pillarRise * 0.6),
      this.scale * (0.6 + pillarProgress * 0.5),
    );
    this.pillar.material.opacity = 0.9 * Math.pow(1 - pillarProgress, 1.6);
    this.pillar.visible = pillarProgress < 1;
    const glowFade = Math.pow(1 - MathUtils.clamp(this.impactElapsed / 0.8, 0, 1), 1.4);
    this.groundGlowMaterial.opacity = glowFade * 0.85;
    this.groundGlow.visible = glowFade > 0.01;
    const lightFade = Math.pow(1 - MathUtils.clamp(this.impactElapsed / 0.45, 0, 1), 2);
    if (this.light) {
      this.light.intensity = this.config.lightIntensity * this.scale * lightFade;
    }
    if (this.impactElapsed >= this.config.cleanupDelay) this.dispose();
  }
}

type CastPhase = "beam" | "impact";

class JulgamentoCast {
  private readonly bolts: JulgamentoBolt[] = [];
  private readonly systems: ParticleSystem[];
  private elapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    castRoot: Group,
    shared: JulgamentoSharedResources,
    private readonly config: JulgamentoVfxConfig,
    target: Vector3,
    private readonly onDispose: (cast: JulgamentoCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    for (let index = 0; index < config.boltCount; index += 1) {
      const scale = index === config.boltCount - 1 ? config.finalBoltScale : 1;
      const bolt = new JulgamentoBolt(
        castRoot,
        scene,
        batchedRenderer,
        shared,
        config,
        target,
        index,
        scale,
        this.lightPool,
      );
      this.bolts.push(bolt);
    }
    this.systems = this.bolts.flatMap((bolt) => bolt.systems);
  }

  getPhase(): CastPhase {
    let hasImpact = false;
    for (const bolt of this.bolts) {
      if (bolt.getPhase() === "impact") hasImpact = true;
    }
    return hasImpact ? "impact" : "beam";
  }

  getState() {
    return {
      elapsed: this.elapsed,
      phase: this.getPhase(),
      bolts: this.bolts.map((bolt) => bolt.getState()),
    };
  }

  getParticleCount(): number {
    return this.bolts.reduce((total, bolt) => total + bolt.getParticleCount(), 0);
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
    this.elapsed += deltaTime;
    for (let index = 0; index < this.bolts.length; index += 1) {
      const bolt = this.bolts[index];
      const boltStart = index * this.config.boltStagger;
      if (this.elapsed + 1e-9 >= boltStart) bolt.start();
      bolt.update(deltaTime);
    }
    const lastImpact = (this.config.boltCount - 1) * this.config.boltStagger
      + this.config.fallDuration;
    if (this.elapsed >= lastImpact + this.config.cleanupDelay) this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const bolt of this.bolts) bolt.dispose();
    this.onDispose(this);
  }
}

export class JulgamentoVfxController {
  private readonly textures = createJulgamentoTextures();
  private readonly shared = createSharedResources(this.textures);
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<JulgamentoCast>();
  private readonly config: JulgamentoVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<JulgamentoVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_JULGAMENTO_VFX_CONFIG, ...config };
    this.config = {
      boltCount: Math.floor(finiteOr(merged.boltCount, DEFAULT_JULGAMENTO_VFX_CONFIG.boltCount, 1)),
      boltStagger: finiteOr(merged.boltStagger, DEFAULT_JULGAMENTO_VFX_CONFIG.boltStagger, 0.01),
      fallDuration: finiteOr(merged.fallDuration, DEFAULT_JULGAMENTO_VFX_CONFIG.fallDuration, 0.05),
      dropHeight: finiteOr(merged.dropHeight, DEFAULT_JULGAMENTO_VFX_CONFIG.dropHeight, 1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_JULGAMENTO_VFX_CONFIG.maxConcurrentCasts, 1)),
      trailEmission: finiteOr(merged.trailEmission, DEFAULT_JULGAMENTO_VFX_CONFIG.trailEmission, 0),
      sparkBurstCount: Math.floor(finiteOr(merged.sparkBurstCount, DEFAULT_JULGAMENTO_VFX_CONFIG.sparkBurstCount, 1)),
      plumeBurstCount: Math.floor(finiteOr(merged.plumeBurstCount, DEFAULT_JULGAMENTO_VFX_CONFIG.plumeBurstCount, 1)),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_JULGAMENTO_VFX_CONFIG.cleanupDelay, 0.1),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_JULGAMENTO_VFX_CONFIG.targetHeight, 0),
      lightIntensity: finiteOr(merged.lightIntensity, DEFAULT_JULGAMENTO_VFX_CONFIG.lightIntensity, 0.1),
      finalBoltScale: finiteOr(merged.finalBoltScale, DEFAULT_JULGAMENTO_VFX_CONFIG.finalBoltScale, 0.1),
    };
    this.castRoot.name = "tk-julgamento-vfx-root";
    this.batchedRenderer.name = "tk-julgamento-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castJulgamento(target: Vector3): void {
    if (this.disposed) throw new Error("JulgamentoVfxController descartado");
    if (!isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as JulgamentoCast | undefined;
      oldestCast?.dispose();
    }
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new JulgamentoCast(
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
    return hasImpact ? "impact" : "beam";
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
    this.shared.beamGeometry.dispose();
    this.shared.pillarGeometry.dispose();
    this.shared.shockGeometry.dispose();
    this.shared.shockMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterial.dispose();
    this.shared.glowGeometry.dispose();
    this.shared.glowMaterial.dispose();
    disposeJulgamentoParticleMaterials(this.shared.particleMaterials);
    disposeJulgamentoTextures(this.textures);
    this.castRoot.clear();
  }
}

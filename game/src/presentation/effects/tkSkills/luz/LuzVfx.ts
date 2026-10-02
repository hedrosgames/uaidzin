import {
  AdditiveBlending,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createLuzBeamSystems,
  createLuzChargeSystems,
  createLuzImpactSystems,
  createLuzParticleMaterials,
  disposeLuzParticleMaterials,
  type LuzBeamSystems,
  type LuzChargeSystems,
  type LuzImpactSystems,
  type LuzParticleMaterials,
} from "./LuzParticleSystems";
import {
  createLuzTextures,
  disposeLuzTextures,
  type LuzTextureSet,
} from "./LuzTextures";
import type { TkLightPool } from "../../TkLightPool";
import { createTaperedArcGeometry } from "../../vfxKit/stylizedGeometry";

export interface LuzVfxConfig {
  chargeDuration: number;
  beamSpeed: number;
  minBeamDuration: number;
  maxBeamDuration: number;
  impactDuration: number;
  maxConcurrentCasts: number;
  moteEmission: number;
  sparkEmission: number;
  haloEmission: number;
  impactSparkCount: number;
  beamRadiusOrigin: number;
  beamRadiusTarget: number;
  lightPeak: number;
  originHeight: number;
  targetHeight: number;
}

export const DEFAULT_LUZ_VFX_CONFIG: LuzVfxConfig = {
  chargeDuration: 0.11,
  beamSpeed: 38,
  minBeamDuration: 0.1,
  maxBeamDuration: 0.24,
  impactDuration: 0.5,
  maxConcurrentCasts: 3,
  moteEmission: 46,
  sparkEmission: 70,
  haloEmission: 30,
  impactSparkCount: 46,
  beamRadiusOrigin: 0.085,
  beamRadiusTarget: 0.15,
  lightPeak: 5,
  originHeight: 1.05,
  targetHeight: 0.9,
};

type CastPhase = "charge" | "fire" | "impact";

interface LuzSharedResources {
  textures: LuzTextureSet;
  particleMaterials: LuzParticleMaterials;
  beamGeometry: CylinderGeometry;
  coreGeometry: CylinderGeometry;
  glowGeometry: SphereGeometry;
  shockGeometry: BufferGeometry;
  beamMaterial: MeshBasicMaterial;
  coreMaterial: MeshBasicMaterial;
}

function createSharedResources(): LuzSharedResources {
  const textures = createLuzTextures();
  const particleMaterials = createLuzParticleMaterials(textures);
  const beamGeometry = new CylinderGeometry(1, 0.42, 1, 24, 1, true);
  const coreGeometry = new CylinderGeometry(0.3, 0.2, 1, 14, 1, true);
  const glowGeometry = new SphereGeometry(1, 18, 14);
  const shockGeometry = createTaperedArcGeometry(0.58, 0.055, Math.PI * 1.94, 0.022);
  const beamMaterial = new MeshBasicMaterial({
    map: textures.beam,
    color: 0xf0e6d0,
    transparent: true,
    opacity: 0,
    alphaTest: 0.01,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const coreMaterial = new MeshBasicMaterial({
    color: 0xfff6d8,
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
    coreGeometry,
    glowGeometry,
    shockGeometry,
    beamMaterial,
    coreMaterial,
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
const BEAM_FORWARD = new Vector3(0, 1, 0);

class LuzCast {
  private readonly chargeSystems: LuzChargeSystems;
  private readonly beamSystems: LuzBeamSystems;
  private readonly impactSystems: LuzImpactSystems;
  private readonly systems: ParticleSystem[];
  private readonly beamOuter: Mesh;
  private readonly beamCore: Mesh;
  private readonly beamOuterMaterial: MeshBasicMaterial;
  private readonly beamCoreMaterial: MeshBasicMaterial;
  private readonly chargeGlow: Mesh;
  private readonly chargeGlowMaterial: MeshBasicMaterial;
  private readonly flash: Mesh;
  private readonly flashMaterial: MeshBasicMaterial;
  private readonly shockRing: Mesh;
  private readonly shockMaterial: MeshBasicMaterial;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly direction = new Vector3();
  private readonly beamLength: number;
  private readonly fireDuration: number;
  private phase: CastPhase = "charge";
  private elapsed = 0;
  private phaseElapsed = 0;
  private disposed = false;
  private readonly head = new Vector3();
  private readonly origin = new Vector3();
  private readonly midpoint = new Vector3();

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: LuzSharedResources,
    private readonly config: LuzVfxConfig,
    origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: LuzCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.origin.copy(origin);
    this.direction.copy(target).sub(origin);
    this.beamLength = Math.max(this.direction.length(), 0.0001);
    this.direction.divideScalar(this.beamLength);
    this.fireDuration = MathUtils.clamp(
      this.beamLength / config.beamSpeed,
      config.minBeamDuration,
      config.maxBeamDuration,
    );

    this.chargeSystems = createLuzChargeSystems(shared.particleMaterials, config);
    this.beamSystems = createLuzBeamSystems(shared.particleMaterials, config);
    this.impactSystems = createLuzImpactSystems(shared.particleMaterials, config);
    this.systems = [
      ...this.chargeSystems.all,
      ...this.beamSystems.all,
      ...this.impactSystems.all,
    ];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    for (const system of this.chargeSystems.all) system.play();

    this.chargeSystems.chargeMotes.emitter.position.copy(origin);

    const beamQuaternion = new Quaternion();
    beamQuaternion.setFromUnitVectors(UP, this.direction);

    this.beamOuterMaterial = shared.beamMaterial.clone();
    this.beamCoreMaterial = shared.coreMaterial.clone();
    this.beamOuter = new Mesh(shared.beamGeometry, this.beamOuterMaterial);
    this.beamOuter.name = "luz-beam";
    this.beamOuter.scale.set(config.beamRadiusTarget, 0.0001, config.beamRadiusTarget);
    this.beamOuter.quaternion.copy(beamQuaternion);
    this.beamOuter.visible = false;
    this.beamOuter.renderOrder = 12;
    this.beamCore = new Mesh(shared.coreGeometry, this.beamCoreMaterial);
    this.beamCore.name = "luz-core";
    this.beamCore.scale.set(config.beamRadiusTarget * 0.28, 0.0001, config.beamRadiusTarget * 0.28);
    this.beamCore.quaternion.copy(beamQuaternion);
    this.beamCore.visible = false;
    this.beamCore.renderOrder = 13;
    this.castRoot.add(this.beamOuter, this.beamCore);

    this.chargeGlowMaterial = shared.beamMaterial.clone();
    this.chargeGlowMaterial.map = shared.textures.glow;
    this.chargeGlowMaterial.opacity = 0;
    this.chargeGlow = new Mesh(shared.glowGeometry, this.chargeGlowMaterial);
    this.chargeGlow.name = "luz-charge-glow";
    this.chargeGlow.position.copy(origin);
    this.chargeGlow.visible = false;
    this.chargeGlow.renderOrder = 11;
    this.castRoot.add(this.chargeGlow);

    this.flashMaterial = shared.beamMaterial.clone();
    this.flashMaterial.map = shared.textures.glow;
    this.flashMaterial.opacity = 0;
    this.flash = new Mesh(shared.glowGeometry, this.flashMaterial);
    this.flash.name = "luz-flash";
    this.flash.position.copy(target);
    this.flash.visible = false;
    this.flash.renderOrder = 14;
    this.castRoot.add(this.flash);

    this.shockMaterial = shared.beamMaterial.clone();
    this.shockMaterial.map = null;
    this.shockMaterial.opacity = 0;
    this.shockRing = new Mesh(shared.shockGeometry, this.shockMaterial);
    this.shockRing.name = "luz-shock-ring";
    this.shockRing.position.copy(target);
    this.shockRing.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), this.direction);
    this.shockRing.visible = false;
    this.shockRing.renderOrder = 12;
    this.castRoot.add(this.shockRing);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xffd873, 9);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xffd873, 0, 9, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.copy(origin);
      this.castRoot.add(this.light);
    }
  }

  getPhase(): CastPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      progress: Math.min(1, this.phaseElapsed / this.currentPhaseDuration()),
      elapsed: this.elapsed,
      phaseElapsed: this.phaseElapsed,
      head: this.head.toArray(),
      target: this.target.toArray(),
      beamLength: this.beamLength,
      fireDuration: this.fireDuration,
      lightIntensity: this.light?.intensity ?? 0,
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
    this.elapsed += deltaTime;
    this.phaseElapsed += deltaTime;
    if (this.phase === "charge") this.updateCharge(deltaTime);
    else if (this.phase === "fire") this.updateFire(deltaTime);
    else this.updateImpact(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(
      this.beamOuter,
      this.beamCore,
      this.chargeGlow,
      this.flash,
      this.shockRing,
    );
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.chargeGlowMaterial.dispose();
    this.beamOuterMaterial.dispose();
    this.beamCoreMaterial.dispose();
    this.flashMaterial.dispose();
    this.shockMaterial.dispose();
    this.onDispose(this);
  }

  private currentPhaseDuration(): number {
    if (this.phase === "charge") return this.config.chargeDuration;
    if (this.phase === "fire") return this.fireDuration;
    return this.config.impactDuration;
  }

  private updateCharge(deltaTime: number): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.chargeDuration, 0, 1);
    const pulse = 1 + Math.sin(this.elapsed * 42) * 0.08;
    this.chargeGlow.visible = true;
    this.chargeGlow.scale.setScalar(0.1 + progress * 0.34 * pulse);
    this.chargeGlowMaterial.opacity = progress * 0.85;
    this.shockRing.visible = true;
    this.shockRing.scale.set(0.8, 1.1, 1);
    this.shockMaterial.opacity = progress * 0.62;
    if (this.light) this.light.intensity = progress * 1.6;
    this.chargeSystems.chargeMotes.emitter.position.copy(this.castOrigin());
    if (this.phaseElapsed >= this.config.chargeDuration) this.triggerFire();
    void deltaTime;
  }

  private castOrigin(): Vector3 {
    return this.origin;
  }

  private triggerFire(): void {
    this.phase = "fire";
    this.phaseElapsed = 0;
    this.chargeSystems.chargeMotes.endEmit();
    this.chargeGlow.visible = false;
    this.beamOuter.visible = true;
    this.beamCore.visible = true;
    for (const system of this.beamSystems.all) {
      system.emitter.position.copy(this.castOrigin());
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
  }

  private updateFire(deltaTime: number): void {
    void deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.fireDuration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const revealed = Math.max(this.beamLength * eased, 0.0001);
    const midpoint = this.midpoint.copy(this.origin).addScaledVector(this.direction, revealed / 2);
    this.beamOuter.scale.set(this.config.beamRadiusTarget, revealed, this.config.beamRadiusTarget);
    this.beamOuter.position.copy(midpoint);
    this.beamCore.scale.set(
      this.config.beamRadiusTarget * 0.28,
      revealed,
      this.config.beamRadiusTarget * 0.28,
    );
    this.beamCore.position.copy(midpoint);
    this.beamOuterMaterial.opacity = Math.min(this.beamOuterMaterial.opacity + 0.12, 0.82);
    this.beamCoreMaterial.opacity = Math.min(this.beamCoreMaterial.opacity + 0.14, 0.95);
    this.head.copy(this.castOrigin()).addScaledVector(this.direction, revealed);
    for (const system of this.beamSystems.all) {
      system.emitter.position.copy(this.head);
    }
    if (this.light) {
      this.light.position.copy(this.head);
      const lightRamp = Math.sin(progress * Math.PI * 0.5);
      this.light.intensity = MathUtils.clamp(
        this.light.intensity + (this.config.lightPeak * lightRamp - this.light.intensity) * 0.35,
        0,
        this.config.lightPeak,
      );
    }
    if (this.phaseElapsed >= this.fireDuration) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.phaseElapsed = 0;
    this.beamOuter.visible = false;
    this.beamCore.visible = false;
    for (const system of this.beamSystems.all) system.endEmit();
    for (const system of this.impactSystems.all) {
      system.emitter.position.copy(this.target);
      system.emitter.quaternion.setFromUnitVectors(BEAM_FORWARD, this.direction.clone().negate());
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.head.copy(this.target);
    this.flash.visible = true;
    this.shockRing.visible = true;
    if (this.light) {
      this.light.position.copy(this.target);
      this.light.intensity = this.config.lightPeak;
    }
  }

  private updateImpact(deltaTime: number): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.impactDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.flash.scale.setScalar(0.16 + Math.min(progress * 6, 1) * 0.62);
    this.flashMaterial.opacity = fade * 0.95;
    this.flash.visible = progress < 0.85;
    this.shockRing.scale.set(Math.max(0.025, 0.8 * (1 - progress * 2.6)), 1.1 + progress * 0.45, 1);
    this.shockMaterial.opacity = fade * 0.88;
    this.shockRing.visible = progress < 1;
    if (this.light) this.light.intensity = this.config.lightPeak * fade;
    if (this.phaseElapsed >= this.config.impactDuration) this.dispose();
    void deltaTime;
  }
}

export class LuzVfxController {
  private readonly shared = createSharedResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<LuzCast>();
  private readonly config: LuzVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<LuzVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_LUZ_VFX_CONFIG, ...config };
    this.config = {
      chargeDuration: finiteOr(merged.chargeDuration, DEFAULT_LUZ_VFX_CONFIG.chargeDuration, 0.02),
      beamSpeed: finiteOr(merged.beamSpeed, DEFAULT_LUZ_VFX_CONFIG.beamSpeed, 1),
      minBeamDuration: finiteOr(merged.minBeamDuration, DEFAULT_LUZ_VFX_CONFIG.minBeamDuration, 0.02),
      maxBeamDuration: finiteOr(merged.maxBeamDuration, DEFAULT_LUZ_VFX_CONFIG.maxBeamDuration, 0.05),
      impactDuration: finiteOr(merged.impactDuration, DEFAULT_LUZ_VFX_CONFIG.impactDuration, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_LUZ_VFX_CONFIG.maxConcurrentCasts, 1)),
      moteEmission: finiteOr(merged.moteEmission, DEFAULT_LUZ_VFX_CONFIG.moteEmission, 0),
      sparkEmission: finiteOr(merged.sparkEmission, DEFAULT_LUZ_VFX_CONFIG.sparkEmission, 0),
      haloEmission: finiteOr(merged.haloEmission, DEFAULT_LUZ_VFX_CONFIG.haloEmission, 0),
      impactSparkCount: Math.floor(finiteOr(merged.impactSparkCount, DEFAULT_LUZ_VFX_CONFIG.impactSparkCount, 1)),
      beamRadiusOrigin: finiteOr(merged.beamRadiusOrigin, DEFAULT_LUZ_VFX_CONFIG.beamRadiusOrigin, 0.01),
      beamRadiusTarget: finiteOr(merged.beamRadiusTarget, DEFAULT_LUZ_VFX_CONFIG.beamRadiusTarget, 0.01),
      lightPeak: finiteOr(merged.lightPeak, DEFAULT_LUZ_VFX_CONFIG.lightPeak, 0),
      originHeight: finiteOr(merged.originHeight, DEFAULT_LUZ_VFX_CONFIG.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_LUZ_VFX_CONFIG.targetHeight, 0),
    };
    this.castRoot.name = "luz-vfx-root";
    this.batchedRenderer.name = "luz-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castLuz(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("LuzVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as LuzCast | undefined;
      oldestCast?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const beamTarget = target.clone();
    beamTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new LuzCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      launchOrigin,
      beamTarget,
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
    let hasImpact = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "impact") hasImpact = true;
    }
    if (hasImpact) return "impact";
    let hasFire = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "fire") hasFire = true;
    }
    return hasFire ? "fire" : "charge";
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
    this.shared.beamGeometry.dispose();
    this.shared.coreGeometry.dispose();
    this.shared.glowGeometry.dispose();
    this.shared.shockGeometry.dispose();
    this.shared.beamMaterial.dispose();
    this.shared.coreMaterial.dispose();
    disposeLuzParticleMaterials(this.shared.particleMaterials);
    disposeLuzTextures(this.shared.textures);
    this.castRoot.clear();
  }
}

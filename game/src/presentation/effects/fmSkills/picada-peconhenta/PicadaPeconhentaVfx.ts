import {
  Group,
  MathUtils,
  Mesh,
  PointLight,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  type BufferGeometry,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PlaneGeometry,
  type SphereGeometry,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { createArcCurve } from "../../vfxKit/curveTrajectory";
import { createPicadaPeconhentaSystems } from "./PicadaPeconhentaParticleSystems";
import { PicadaPeconhentaResources } from "./PicadaPeconhentaResources";

export interface PicadaPeconhentaVfxConfig {
  chargeDuration: number;
  speed: number;
  minFlightDuration: number;
  maxFlightDuration: number;
  impactDuration: number;
  residualDuration: number;
  meltDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  chargeCount: number;
  chargeRadius: number;
  chargeSpeed: number;
  trailEmission: number;
  satelliteEmission: number;
  splashCount: number;
  bubbleEmission: number;
  arc: number;
  lateral: number;
  stingerScale: number;
  originHeight: number;
  targetHeight: number;
  lightPeak: number;
}

export const DEFAULT_PICADA_PECONHENTA_VFX_CONFIG: PicadaPeconhentaVfxConfig = {
  chargeDuration: 0.12,
  speed: 32,
  minFlightDuration: 0.12,
  maxFlightDuration: 0.42,
  impactDuration: 0.4,
  residualDuration: 4.6,
  meltDuration: 0.55,
  fadeDuration: 0.6,
  maxConcurrentCasts: 3,
  chargeCount: 22,
  chargeRadius: 0.7,
  chargeSpeed: 3.2,
  trailEmission: 34,
  satelliteEmission: 16,
  splashCount: 34,
  bubbleEmission: 12,
  arc: 0.06,
  lateral: 0.035,
  stingerScale: 1,
  originHeight: 1.02,
  targetHeight: 0.9,
  lightPeak: 3.6,
};

export type PicadaPeconhentaPhase = "charge" | "flight" | "impact" | "residual";

const FORWARD = new Vector3(0, 0, 1);
const LIGHT_COLOR = 0x86d94e;

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class PicadaPeconhentaCast {
  private readonly stinger: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly bead: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly decal: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly decalMaterial: MeshBasicMaterial;
  private readonly particles: ReturnType<typeof createPicadaPeconhentaSystems>;
  private readonly systems: ParticleSystem[];
  private readonly curve;
  private readonly light: PointLight;
  private readonly head = new Vector3();
  private readonly tangent = new Vector3();
  private readonly reverseTangent = new Vector3();
  private readonly emitterOrientation = new Quaternion();
  private readonly flightDuration: number;
  private phase: PicadaPeconhentaPhase = "charge";
  private phaseElapsed = 0;
  private phaseStartedAt = 0;
  private elapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    resources: PicadaPeconhentaResources,
    private readonly config: PicadaPeconhentaVfxConfig,
    private readonly origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: PicadaPeconhentaCast) => void,
  ) {
    this.particles = createPicadaPeconhentaSystems(resources, config);
    this.systems = Object.values(this.particles);
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    const distance = Math.max(origin.distanceTo(target), 0.35);
    this.flightDuration = MathUtils.clamp(
      distance / config.speed,
      config.minFlightDuration,
      config.maxFlightDuration,
    );
    this.curve = createArcCurve(origin, target, 0, {
      arc: config.arc,
      lateral: config.lateral,
      minimumSpan: 0.35,
      samples: 22,
    });

    this.stinger = new Mesh(resources.stingerGeometry, resources.stingerMaterial);
    this.stinger.name = "picada-peconhenta-stinger";
    this.stinger.position.copy(origin);
    this.stinger.scale.setScalar(config.stingerScale * 0.42);
    this.stinger.visible = false;
    this.stinger.renderOrder = 12;
    this.castRoot.add(this.stinger);

    this.bead = new Mesh(resources.beadGeometry, resources.materials.bead.clone());
    this.bead.name = "picada-peconhenta-bead";
    this.bead.position.copy(origin);
    this.bead.scale.setScalar(0.02);
    this.bead.renderOrder = 11;
    this.castRoot.add(this.bead);

    this.decalMaterial = resources.materials.decal.clone();
    this.decal = new Mesh(resources.decalGeometry, this.decalMaterial);
    this.decal.name = "picada-peconhenta-decal";
    this.decal.position.set(target.x, 0.03, target.z);
    this.decal.rotation.y = Math.atan2(target.x - origin.x, target.z - origin.z);
    this.decal.scale.setScalar(2.6);
    this.decalMaterial.opacity = 0;
    this.decal.renderOrder = 9;
    this.castRoot.add(this.decal);

    this.light = new PointLight(LIGHT_COLOR, 0, 8, 2);
    this.light.position.copy(origin);
    this.castRoot.add(this.light);

    this.start(this.particles.charge);
    this.particles.charge.emitter.position.copy(origin);
    this.emitterOrientation.setFromUnitVectors(FORWARD, this.aimDirection());
    this.particles.charge.emitter.quaternion.copy(this.emitterOrientation);
    this.updateCharge(0);
  }

  private aimDirection(): Vector3 {
    const aim = this.target.clone().sub(this.origin);
    if (aim.lengthSq() < 0.0001) aim.copy(FORWARD);
    return aim.normalize();
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  getPhase(): PicadaPeconhentaPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      progress: MathUtils.clamp(this.phaseElapsed / this.currentPhaseDuration(), 0, 1),
      elapsed: this.elapsed,
      phaseStartedAt: this.phaseStartedAt,
      head: this.head.toArray(),
      origin: this.origin.toArray(),
      target: this.target.toArray(),
      flightDuration: this.flightDuration,
      lightIntensity: this.light.intensity,
      decalOpacity: this.decalMaterial.opacity,
      stingerScale: this.stinger.scale.x,
      stingerVisible: this.stinger.visible,
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
    else if (this.phase === "flight") this.updateFlight();
    else if (this.phase === "impact") this.updateImpact();
    else this.updateResidual(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(this.stinger, this.bead, this.decal, this.light);
    (this.bead.material as MeshBasicMaterial).dispose();
    this.decalMaterial.dispose();
    this.light.dispose();
    this.onDispose(this);
  }

  private currentPhaseDuration(): number {
    if (this.phase === "charge") return this.config.chargeDuration;
    if (this.phase === "flight") return this.flightDuration;
    if (this.phase === "impact") return this.config.impactDuration;
    return this.config.residualDuration + this.config.fadeDuration;
  }

  private updateCharge(deltaTime: number): void {
    void deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.chargeDuration, 0, 1);
    const pulse = 1 + Math.sin(this.elapsed * 42) * 0.14;
    this.bead.position.copy(this.origin);
    this.bead.scale.setScalar((0.07 + progress * 0.16) * pulse);
    this.particles.charge.emitter.position.copy(this.origin);
    this.light.position.copy(this.origin);
    this.light.intensity = this.config.lightPeak * (0.16 + progress * 0.5);
    if (this.phaseElapsed + 1e-9 >= this.config.chargeDuration) this.triggerFlight();
  }

  private triggerFlight(): void {
    this.phase = "flight";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.charge.endEmit();
    this.bead.visible = false;
    this.stinger.visible = true;
    this.curve.getPointAt(0, this.head);
    this.stinger.position.copy(this.head);
    for (const system of [this.particles.trail, this.particles.satellites]) {
      system.emitter.position.copy(this.head);
      this.start(system);
    }
  }

  private updateFlight(): void {
    this.phaseElapsed = Math.min(this.phaseElapsed, this.flightDuration);
    const linear = MathUtils.clamp(this.phaseElapsed / this.flightDuration, 0, 1);
    const eased = 1 - Math.pow(1 - linear, 2.2);
    this.curve.getPointAt(eased, this.head);
    this.curve.getTangentAt(eased, this.tangent);
    if (this.tangent.lengthSq() < 0.0001) this.tangent.copy(FORWARD);
    this.tangent.normalize();
    const roll = this.elapsed * 26;
    this.stinger.quaternion.setFromUnitVectors(FORWARD, this.tangent);
    this.stinger.rotateZ(roll);
    this.stinger.position.copy(this.head);
    const flick = 0.96 + Math.sin(this.elapsed * 54) * 0.06;
    this.stinger.scale.setScalar(this.config.stingerScale * (1 + linear * 0.32) * flick);
    this.reverseTangent.copy(this.tangent).negate();
    this.emitterOrientation.setFromUnitVectors(FORWARD, this.reverseTangent);
    for (const system of [this.particles.trail, this.particles.satellites]) {
      system.emitter.position.copy(this.head);
      system.emitter.quaternion.copy(this.emitterOrientation);
    }
    this.light.position.copy(this.head);
    this.light.intensity = this.config.lightPeak * (0.7 + Math.sin(linear * Math.PI) * 0.42);
    if (this.particles.charge.particleNum === 0) this.particles.charge.emitter.visible = false;
    if (this.phaseElapsed + 1e-9 >= this.flightDuration) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.head.copy(this.target);
    this.particles.charge.emitter.visible = false;
    for (const system of [this.particles.trail, this.particles.satellites]) system.endEmit();
    for (const system of [this.particles.splash, this.particles.pool, this.particles.bubbles]) {
      system.emitter.position.copy(this.target);
      this.start(system);
    }
    this.particles.bubbles.emitter.position.set(this.target.x, 0.12, this.target.z);
    this.stinger.position.copy(this.target);
    this.stinger.scale.setScalar(this.config.stingerScale * 0.62);
    this.stinger.rotateZ(-0.9);
    this.decal.position.set(this.target.x, 0.03, this.target.z);
    this.light.position.copy(this.target);
    this.light.intensity = this.config.lightPeak;
  }

  private updateImpact(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.impactDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.light.intensity = this.config.lightPeak * fade;
    this.decalMaterial.opacity = Math.min(1, progress * 3.2) * 0.84;
    this.stinger.scale.setScalar(this.config.stingerScale * (0.62 - progress * 0.1));
    if (this.phaseElapsed + 1e-9 >= this.config.impactDuration) this.triggerResidual();
  }

  private triggerResidual(): void {
    this.phase = "residual";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.splash.endEmit();
    this.particles.pool.endEmit();
  }

  private updateResidual(deltaTime: number): void {
    void deltaTime;
    const melt = MathUtils.clamp(this.phaseElapsed / this.config.meltDuration, 0, 1);
    this.stinger.visible = melt < 1;
    this.stinger.scale.setScalar(this.config.stingerScale * 0.52 * (1 - melt) * (1 - melt));
    this.stinger.position.y = this.target.y - melt * 0.2;
    if (melt >= 1) this.stinger.visible = false;
    const fadeStart = this.config.residualDuration;
    const fadeProgress = MathUtils.clamp((this.phaseElapsed - fadeStart) / this.config.fadeDuration, 0, 1);
    this.decalMaterial.opacity = 0.84 * Math.pow(1 - fadeProgress, 2);
    const bubbleFade = MathUtils.clamp((this.phaseElapsed - this.config.residualDuration * 0.42) / 0.9, 0, 1);
    if (bubbleFade >= 1 && !this.particles.bubbles.paused) this.particles.bubbles.endEmit();
    this.light.intensity = this.config.lightPeak * 0.06 * Math.pow(1 - fadeProgress, 2);
    if (this.phaseElapsed + 1e-9 >= this.config.residualDuration + this.config.fadeDuration) this.dispose();
  }
}

export class PicadaPeconhentaVfxController {
  private readonly resources = new PicadaPeconhentaResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<PicadaPeconhentaCast>();
  private readonly config: PicadaPeconhentaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<PicadaPeconhentaVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_PICADA_PECONHENTA_VFX_CONFIG, ...config };
    const fallback = DEFAULT_PICADA_PECONHENTA_VFX_CONFIG;
    this.config = {
      chargeDuration: finiteOr(merged.chargeDuration, fallback.chargeDuration, 0.02),
      speed: finiteOr(merged.speed, fallback.speed, 1),
      minFlightDuration: finiteOr(merged.minFlightDuration, fallback.minFlightDuration, 0.02),
      maxFlightDuration: finiteOr(merged.maxFlightDuration, fallback.maxFlightDuration, 0.05),
      impactDuration: finiteOr(merged.impactDuration, fallback.impactDuration, 0.1),
      residualDuration: finiteOr(merged.residualDuration, fallback.residualDuration, 0.2),
      meltDuration: finiteOr(merged.meltDuration, fallback.meltDuration, 0.05),
      fadeDuration: finiteOr(merged.fadeDuration, fallback.fadeDuration, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, fallback.maxConcurrentCasts, 1)),
      chargeCount: Math.floor(finiteOr(merged.chargeCount, fallback.chargeCount, 0)),
      chargeRadius: finiteOr(merged.chargeRadius, fallback.chargeRadius, 0.05),
      chargeSpeed: finiteOr(merged.chargeSpeed, fallback.chargeSpeed, 0),
      trailEmission: finiteOr(merged.trailEmission, fallback.trailEmission, 0),
      satelliteEmission: finiteOr(merged.satelliteEmission, fallback.satelliteEmission, 0),
      splashCount: Math.floor(finiteOr(merged.splashCount, fallback.splashCount, 1)),
      bubbleEmission: finiteOr(merged.bubbleEmission, fallback.bubbleEmission, 0),
      arc: finiteOr(merged.arc, fallback.arc, 0),
      lateral: finiteOr(merged.lateral, fallback.lateral, 0),
      stingerScale: finiteOr(merged.stingerScale, fallback.stingerScale, 0.1),
      originHeight: finiteOr(merged.originHeight, fallback.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, fallback.targetHeight, 0),
      lightPeak: finiteOr(merged.lightPeak, fallback.lightPeak, 0),
    };
    this.castRoot.name = "picada-peconhenta-vfx-root";
    this.batchedRenderer.name = "picada-peconhenta-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castPicada(origin: Vector3, target: Vector3, residualDuration?: number): void {
    if (this.disposed) throw new Error("PicadaPeconhentaVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as PicadaPeconhentaCast | undefined;
      oldest?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const duration = residualDuration !== undefined && Number.isFinite(residualDuration)
      ? MathUtils.clamp(residualDuration, 0.2, 12)
      : this.config.residualDuration;
    const cast = new PicadaPeconhentaCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.resources,
      { ...this.config, residualDuration: duration },
      launchOrigin,
      impactTarget,
      (finished) => this.casts.delete(finished),
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

  getPhase(): PicadaPeconhentaPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    const order: PicadaPeconhentaPhase[] = ["charge", "flight", "impact", "residual"];
    let phase: PicadaPeconhentaPhase | "idle" = "idle";
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
    return [...this.casts].flatMap((cast) => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map((cast) => cast.getState());
  }

  private updateFrame(deltaTime: number, width: number, height: number): void {
    for (const cast of this.casts) {
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
    this.resources.dispose();
    this.castRoot.clear();
  }
}

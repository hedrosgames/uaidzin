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
  type PlaneGeometry,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { createArcCurve } from "../../vfxKit/curveTrajectory";
import { createSombraCorrosivaSystems } from "./SombraCorrosivaParticleSystems";
import { SombraCorrosivaResources } from "./SombraCorrosivaResources";

export interface SombraCorrosivaVfxConfig {
  chargeDuration: number;
  speed: number;
  minFlightDuration: number;
  maxFlightDuration: number;
  impactDuration: number;
  residualDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  wispCount: number;
  wispRadius: number;
  wispSpeed: number;
  trailEmission: number;
  fragmentCount: number;
  fragmentSpeed: number;
  hazeEmission: number;
  hazeCount: number;
  threadCount: number;
  threadSpread: number;
  tearScale: number;
  eyeScale: number;
  poolScale: number;
  arc: number;
  lateral: number;
  originHeight: number;
  targetHeight: number;
  lightPeak: number;
}

export const DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG: SombraCorrosivaVfxConfig = {
  chargeDuration: 0.1,
  speed: 28,
  minFlightDuration: 0.14,
  maxFlightDuration: 0.4,
  impactDuration: 0.26,
  residualDuration: 0.42,
  fadeDuration: 0.32,
  maxConcurrentCasts: 3,
  wispCount: 24,
  wispRadius: 0.68,
  wispSpeed: 3,
  trailEmission: 30,
  fragmentCount: 12,
  fragmentSpeed: 6.4,
  hazeEmission: 44,
  hazeCount: 14,
  threadCount: 5,
  threadSpread: 0.44,
  tearScale: 1.5,
  eyeScale: 1.7,
  poolScale: 2.1,
  arc: 0.07,
  lateral: 0.05,
  originHeight: 1.02,
  targetHeight: 0.92,
  lightPeak: 2.8,
};

export type SombraCorrosivaPhase = "charge" | "flight" | "impact" | "residual";

const FORWARD = new Vector3(0, 0, 1);
const LIGHT_COLOR = 0x8a5fae;

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class SombraCorrosivaCast {
  private readonly particles: ReturnType<typeof createSombraCorrosivaSystems>;
  private readonly systems: ParticleSystem[];
  private readonly tear: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly eyeLid: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly eyeVoid: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly eyeLidMaterial: MeshBasicMaterial;
  private readonly eyeVoidMaterial: MeshBasicMaterial;
  private readonly threads: Mesh<BufferGeometry, MeshBasicMaterial>[] = [];
  private readonly pool: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly poolMaterial: MeshBasicMaterial;
  private readonly light: PointLight;
  private readonly curve;
  private readonly direction = new Vector3();
  private readonly head = new Vector3();
  private readonly tangent = new Vector3();
  private readonly orientation = new Quaternion();
  private readonly eyeOrientation = new Quaternion();
  private readonly threadReach: number;
  private readonly flightDuration: number;
  private phase: SombraCorrosivaPhase = "charge";
  private phaseElapsed = 0;
  private phaseStartedAt = 0;
  private elapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    resources: SombraCorrosivaResources,
    private readonly config: SombraCorrosivaVfxConfig,
    private readonly origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: SombraCorrosivaCast) => void,
  ) {
    this.particles = createSombraCorrosivaSystems(resources, config);
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
      samples: 20,
    });
    this.direction.copy(target).sub(origin);
    if (this.direction.lengthSq() < 0.0001) this.direction.copy(FORWARD);
    this.direction.normalize();

    this.tear = new Mesh(resources.tearGeometry, resources.tearMaterial);
    this.tear.name = "sombra-corrosiva-tear";
    this.tear.position.copy(origin);
    this.tear.scale.setScalar(config.tearScale * 0.3);
    this.tear.renderOrder = 12;
    this.castRoot.add(this.tear);

    this.eyeLidMaterial = resources.eyeLidMaterial.clone();
    this.eyeLid = new Mesh(resources.eyeLidGeometry, this.eyeLidMaterial);
    this.eyeLid.name = "sombra-corrosiva-eye-lid";
    this.eyeLid.renderOrder = 14;
    this.eyeLid.visible = false;
    this.castRoot.add(this.eyeLid);

    this.eyeVoidMaterial = resources.eyeVoidMaterial.clone();
    this.eyeVoid = new Mesh(resources.eyeVoidGeometry, this.eyeVoidMaterial);
    this.eyeVoid.name = "sombra-corrosiva-eye-void";
    this.eyeVoid.renderOrder = 13;
    this.eyeVoid.visible = false;
    this.castRoot.add(this.eyeVoid);

    this.eyeOrientation.setFromUnitVectors(FORWARD, this.direction);
    this.threadReach = MathUtils.clamp((target.y + 0.32) / 1.5, 0.15, 1);
    for (let index = 0; index < config.threadCount; index += 1) {
      const material = resources.threadMaterial.clone();
      material.opacity = 0;
      const thread = new Mesh(resources.threadGeometry, material);
      thread.name = `sombra-corrosiva-thread-${index}`;
      const angle = (index / config.threadCount) * Math.PI * 2 + 0.35;
      thread.position.set(
        target.x + Math.cos(angle) * config.threadSpread,
        target.y + 0.32,
        target.z + Math.sin(angle) * config.threadSpread,
      );
      thread.rotation.y = angle;
      thread.scale.set(1, 0.001, 1);
      thread.renderOrder = 12;
      this.threads.push(thread);
      this.castRoot.add(thread);
    }

    this.poolMaterial = resources.materials.haze.clone();
    this.poolMaterial.opacity = 0;
    this.pool = new Mesh(resources.groundGeometry, this.poolMaterial);
    this.pool.name = "sombra-corrosiva-pool";
    this.pool.position.set(target.x, 0.04, target.z);
    this.pool.scale.setScalar(config.poolScale);
    this.pool.renderOrder = 9;
    this.castRoot.add(this.pool);

    this.light = new PointLight(LIGHT_COLOR, 0, 6.4, 2);
    this.light.position.copy(origin);
    this.castRoot.add(this.light);

    this.start(this.particles.wisp);
    this.particles.wisp.emitter.position.copy(origin);
    this.updateCharge();
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  getPhase(): SombraCorrosivaPhase {
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
      direction: this.direction.toArray(),
      lightIntensity: this.light.intensity,
      tearVisible: this.tear.visible,
      tearScale: this.tear.scale.x,
      eyeVisible: this.eyeLid.visible,
      eyeOpen: this.eyeLid.scale.x,
      eyeSlit: this.eyeLid.scale.y,
      threadReach: this.threads[0]?.scale.y ?? 0,
      poolOpacity: this.poolMaterial.opacity,
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
    if (this.phase === "charge") this.updateCharge();
    else if (this.phase === "flight") this.updateFlight();
    else if (this.phase === "impact") this.updateImpact();
    else this.updateResidual();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(this.tear, this.eyeLid, this.eyeVoid, this.pool, this.light);
    for (const thread of this.threads) {
      this.castRoot.remove(thread);
      thread.material.dispose();
    }
    this.eyeLidMaterial.dispose();
    this.eyeVoidMaterial.dispose();
    this.poolMaterial.dispose();
    this.light.dispose();
    this.onDispose(this);
  }

  private currentPhaseDuration(): number {
    if (this.phase === "charge") return this.config.chargeDuration;
    if (this.phase === "flight") return this.flightDuration;
    if (this.phase === "impact") return this.config.impactDuration;
    return this.config.residualDuration + this.config.fadeDuration;
  }

  private updateCharge(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.chargeDuration, 0, 1);
    const pulse = 1 + Math.sin(this.elapsed * 38) * 0.16;
    this.tear.position.copy(this.origin);
    this.tear.scale.setScalar(this.config.tearScale * (0.3 + progress * 0.5) * pulse);
    this.tear.rotation.y = this.elapsed * 22;
    this.particles.wisp.emitter.position.copy(this.origin);
    this.light.position.copy(this.origin);
    this.light.intensity = this.config.lightPeak * (0.14 + progress * 0.4);
    if (this.phaseElapsed + 1e-9 >= this.config.chargeDuration) this.triggerFlight();
  }

  private triggerFlight(): void {
    this.phase = "flight";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.wisp.endEmit();
    this.curve.getPointAt(0, this.head);
    this.tear.position.copy(this.head);
    this.particles.trail.emitter.position.copy(this.head);
    this.start(this.particles.trail);
  }

  private updateFlight(): void {
    this.phaseElapsed = Math.min(this.phaseElapsed, this.flightDuration);
    const linear = MathUtils.clamp(this.phaseElapsed / this.flightDuration, 0, 1);
    const eased = 1 - Math.pow(1 - linear, 2.4);
    this.curve.getPointAt(eased, this.head);
    this.curve.getTangentAt(eased, this.tangent);
    if (this.tangent.lengthSq() < 0.0001) this.tangent.copy(FORWARD);
    this.tangent.normalize();
    this.orientation.setFromUnitVectors(FORWARD, this.tangent);
    this.tear.quaternion.copy(this.orientation);
    this.tear.rotateZ(this.elapsed * 16);
    this.tear.position.copy(this.head);
    this.tear.scale.setScalar(this.config.tearScale * (0.8 + linear * 0.28));
    this.particles.trail.emitter.position.copy(this.head);
    this.orientation.setFromUnitVectors(FORWARD, this.tangent.clone().negate());
    this.particles.trail.emitter.quaternion.copy(this.orientation);
    this.light.position.copy(this.head);
    this.light.intensity = this.config.lightPeak * (0.6 + Math.sin(linear * Math.PI) * 0.4);
    if (this.particles.wisp.particleNum === 0) this.particles.wisp.emitter.visible = false;
    if (this.phaseElapsed + 1e-9 >= this.flightDuration) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.head.copy(this.target);
    this.particles.wisp.emitter.visible = false;
    this.particles.trail.endEmit();
    this.tear.visible = false;
    this.eyeLid.visible = true;
    this.eyeVoid.visible = true;
    for (const eye of [this.eyeLid, this.eyeVoid]) {
      eye.position.set(this.target.x, this.target.y + 0.08, this.target.z);
      eye.quaternion.copy(this.eyeOrientation);
      eye.scale.set(0.001, 0.001, 1);
    }
    this.particles.iris.emitter.position.set(this.target.x, this.target.y + 0.08, this.target.z);
    this.particles.iris.emitter.quaternion.copy(this.eyeOrientation);
    this.start(this.particles.iris);
    this.particles.fragments.emitter.position.set(this.target.x, this.target.y + 0.05, this.target.z);
    this.particles.fragments.emitter.quaternion.copy(this.eyeOrientation);
    this.start(this.particles.fragments);
    this.light.position.copy(this.target);
    this.light.intensity = this.config.lightPeak;
  }

  private updateImpact(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.impactDuration, 0, 1);
    const open = MathUtils.clamp(progress / 0.32, 0, 1);
    const collapse = MathUtils.clamp((progress - 0.52) / 0.48, 0, 1);
    const scale = this.config.eyeScale * Math.sin(open * Math.PI * 0.5) * (1 - collapse * 0.85);
    for (const eye of [this.eyeLid, this.eyeVoid]) {
      eye.scale.set(Math.max(0.001, scale * (1 + collapse * 1.5)), Math.max(0.001, scale * (1 - collapse * 0.9)), 1);
    }
    this.poolMaterial.opacity = Math.min(1, progress * 2.6) * 0.58;
    for (let index = 0; index < this.threads.length; index += 1) {
      const thread = this.threads[index]!;
      const start = index * 0.035;
      const reach = MathUtils.clamp((this.phaseElapsed - start) / 0.2, 0, 1);
      thread.scale.y = Math.max(0.001, reach * this.threadReach);
      thread.material.opacity = reach * 0.85;
    }
    this.light.intensity = this.config.lightPeak * Math.pow(1 - progress, 1.5);
    if (this.phaseElapsed + 1e-9 >= this.config.impactDuration) this.triggerResidual();
  }

  private triggerResidual(): void {
    this.phase = "residual";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.fragments.endEmit();
    this.particles.haze.emitter.position.set(this.target.x, this.target.y - 0.1, this.target.z);
    this.start(this.particles.haze);
  }

  private updateResidual(): void {
    const fadeStart = this.config.residualDuration;
    const fadeProgress = MathUtils.clamp((this.phaseElapsed - fadeStart) / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - fadeProgress, 2);
    const eyeFade = MathUtils.clamp(1 - this.phaseElapsed / 0.3, 0, 1);
    this.eyeLid.visible = eyeFade > 0;
    this.eyeVoid.visible = eyeFade > 0;
    this.eyeLid.material.opacity = 0.9 * eyeFade * fade;
    this.eyeVoid.material.opacity = 0.92 * eyeFade * fade;
    this.poolMaterial.opacity = 0.58 * fade;
    for (const thread of this.threads) {
      thread.material.opacity = 0.85 * fade;
      thread.scale.y = Math.max(0.001, thread.scale.y * (1 - fadeProgress * 0.12));
    }
    this.light.intensity = this.config.lightPeak * 0.08 * fade;
    if (this.phaseElapsed + 1e-9 >= this.config.residualDuration + this.config.fadeDuration) this.dispose();
  }
}

export class SombraCorrosivaVfxController {
  private readonly resources = new SombraCorrosivaResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<SombraCorrosivaCast>();
  private readonly config: SombraCorrosivaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<SombraCorrosivaVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG, ...config };
    const fallback = DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG;
    this.config = {
      chargeDuration: finiteOr(merged.chargeDuration, fallback.chargeDuration, 0.02),
      speed: finiteOr(merged.speed, fallback.speed, 1),
      minFlightDuration: finiteOr(merged.minFlightDuration, fallback.minFlightDuration, 0.02),
      maxFlightDuration: finiteOr(merged.maxFlightDuration, fallback.maxFlightDuration, 0.05),
      impactDuration: finiteOr(merged.impactDuration, fallback.impactDuration, 0.05),
      residualDuration: finiteOr(merged.residualDuration, fallback.residualDuration, 0.1),
      fadeDuration: finiteOr(merged.fadeDuration, fallback.fadeDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, fallback.maxConcurrentCasts, 1)),
      wispCount: Math.floor(finiteOr(merged.wispCount, fallback.wispCount, 0)),
      wispRadius: finiteOr(merged.wispRadius, fallback.wispRadius, 0.05),
      wispSpeed: finiteOr(merged.wispSpeed, fallback.wispSpeed, 0),
      trailEmission: finiteOr(merged.trailEmission, fallback.trailEmission, 0),
      fragmentCount: Math.floor(finiteOr(merged.fragmentCount, fallback.fragmentCount, 0)),
      fragmentSpeed: finiteOr(merged.fragmentSpeed, fallback.fragmentSpeed, 0.2),
      hazeEmission: finiteOr(merged.hazeEmission, fallback.hazeEmission, 0),
      hazeCount: Math.floor(finiteOr(merged.hazeCount, fallback.hazeCount, 0)),
      threadCount: Math.floor(finiteOr(merged.threadCount, fallback.threadCount, 0)),
      threadSpread: finiteOr(merged.threadSpread, fallback.threadSpread, 0),
      tearScale: finiteOr(merged.tearScale, fallback.tearScale, 0.1),
      eyeScale: finiteOr(merged.eyeScale, fallback.eyeScale, 0.1),
      poolScale: finiteOr(merged.poolScale, fallback.poolScale, 0.2),
      arc: finiteOr(merged.arc, fallback.arc, 0),
      lateral: finiteOr(merged.lateral, fallback.lateral, 0),
      originHeight: finiteOr(merged.originHeight, fallback.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, fallback.targetHeight, 0),
      lightPeak: finiteOr(merged.lightPeak, fallback.lightPeak, 0),
    };
    this.castRoot.name = "sombra-corrosiva-vfx-root";
    this.batchedRenderer.name = "sombra-corrosiva-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castSombraCorrosiva(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("SombraCorrosivaVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as SombraCorrosivaCast | undefined;
      oldest?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new SombraCorrosivaCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.resources,
      this.config,
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

  getPhase(): SombraCorrosivaPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    const order: SombraCorrosivaPhase[] = ["charge", "flight", "impact", "residual"];
    let phase: SombraCorrosivaPhase | "idle" = "idle";
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

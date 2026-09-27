import {
  ConeGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createAvalancheImpactSystems,
  createAvalancheLingerSystem,
  createAvalancheParticleMaterials,
  createAvalancheWaveSystem,
  disposeAvalancheParticleMaterials,
  type AvalancheParticleMaterials,
  type AvalanchePointSystems,
} from "./AvalancheParticleSystems";
import {
  createAvalancheTextures,
  disposeAvalancheTextures,
  type AvalancheTextureSet,
} from "./AvalancheTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface AvalancheVfxConfig {
  waveDuration: number;
  maxConcurrentCasts: number;
  dustEmission: number;
  debrisPerPoint: number;
  coneHalfAngle: number;
  maxRange: number;
  impactPoints: number;
  cleanupDelay: number;
  originHeight: number;
}

export const DEFAULT_AVALANCHE_VFX_CONFIG: AvalancheVfxConfig = {
  waveDuration: 0.25,
  maxConcurrentCasts: 3,
  dustEmission: 70,
  debrisPerPoint: 14,
  coneHalfAngle: 0.42,
  maxRange: 6.5,
  impactPoints: 5,
  cleanupDelay: 1.15,
  originHeight: 0.08,
};

type CastPhase = "wave" | "aftermath";

export type AvalanchePhase = CastPhase | "idle";

interface AvalancheSharedResources {
  textures: AvalancheTextureSet;
  particleMaterials: AvalancheParticleMaterials;
  arcGeometry: TorusGeometry;
  arcMaterial: MeshBasicMaterial;
  bodyGeometry: ConeGeometry;
  bodyMaterial: MeshBasicMaterial;
}

const FORWARD = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const IMPACT_FIRST_FRACTION = 0.3;
const IMPACT_LAST_FRACTION = 1;

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function createSharedResources(): AvalancheSharedResources {
  const textures = createAvalancheTextures();
  const particleMaterials = createAvalancheParticleMaterials(textures);
  const arcGeometry = new TorusGeometry(1, 0.085, 8, 48, Math.PI * 0.92);
  const arcMaterial = new MeshBasicMaterial({
    color: 0x8a7354,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
  });
  const bodyGeometry = new ConeGeometry(1, 1, 28, 1, true);
  bodyGeometry.rotateX(-Math.PI / 2);
  bodyGeometry.translate(0, 0, 0.5);
  const bodyMaterial = new MeshBasicMaterial({
    color: 0x7a6448,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
  });
  return {
    textures,
    particleMaterials,
    arcGeometry,
    arcMaterial,
    bodyGeometry,
    bodyMaterial,
  };
}

class AvalancheCast {
  private readonly waveDust: ParticleSystem;
  private readonly linger: ParticleSystem;
  private readonly points: Array<{
    axial: number;
    fraction: number;
    position: Vector3;
    systems: AvalanchePointSystems;
    triggered: boolean;
    triggerTime: number;
  }> = [];
  private readonly systems: ParticleSystem[];
  private readonly pivot = new Group();
  private readonly arc: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly body: Mesh<ConeGeometry, MeshBasicMaterial>;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly axis: Vector3;
  private readonly distance: number;
  private phase: CastPhase = "wave";
  private waveElapsed = 0;
  private cleanupElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    private readonly shared: AvalancheSharedResources,
    private readonly config: AvalancheVfxConfig,
    origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: AvalancheCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    const offset = this.target.clone().sub(origin);
    this.distance = MathUtils.clamp(offset.length(), 0.8, this.config.maxRange);
    this.axis = offset.lengthSq() > 1e-9
      ? offset.clone().normalize()
      : FORWARD.clone();

    this.waveDust = createAvalancheWaveSystem(shared.particleMaterials, this.config);
    this.linger = createAvalancheLingerSystem(shared.particleMaterials);
    this.points = this.createImpactPoints(origin);
    this.systems = [
      this.waveDust,
      this.linger,
      ...this.points.flatMap((point) => point.systems.all),
    ];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.pivot.name = "avalanche-wave-root";
    this.pivot.position.copy(origin);
    this.pivot.quaternion.setFromUnitVectors(FORWARD, this.axis);
    this.arc = new Mesh(shared.arcGeometry, shared.arcMaterial.clone());
    this.arc.name = "avalanche-wave-arc";
    this.arc.rotation.x = Math.PI / 2;
    this.arc.renderOrder = 11;
    this.body = new Mesh(shared.bodyGeometry, shared.bodyMaterial.clone());
    this.body.name = "avalanche-wave-body";
    this.body.renderOrder = 10;
    this.pivot.add(this.body, this.arc);
    this.castRoot.add(this.pivot);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xd9a94f, 9);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xd9a94f, 0, 9, 2);
      this.isPooledLight = false;
    }
    if (this.light) this.castRoot.add(this.light);

    this.waveDust.play();
    this.waveDust.emitter.visible = true;
    this.updateWave(0);
  }

  getPhase(): CastPhase {
    return this.phase;
  }

  getOrigin(): Vector3 {
    return this.pivot.position;
  }

  getState() {
    return {
      phase: this.phase,
      progress: Math.min(1, this.waveElapsed / this.config.waveDuration),
      elapsed: this.waveElapsed,
      cleanupElapsed: this.cleanupElapsed,
      origin: this.pivot.position.toArray(),
      target: this.target.toArray(),
      distance: this.distance,
      axis: this.axis.toArray(),
      front: this.frontPosition(this.currentFrontDistance()).toArray(),
      triggeredCount: this.points.reduce(
        (count, point) => count + (point.triggered ? 1 : 0),
        0,
      ),
      impacts: this.points.map((point) => ({
        position: point.position.toArray(),
        fraction: point.fraction,
        triggered: point.triggered,
        triggerTime: point.triggerTime,
      })),
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
    if (this.phase === "wave") {
      this.updateWave(deltaTime);
      return;
    }
    this.updateAftermath(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.pivot);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.pivot.remove(this.body, this.arc);
    this.arc.material.dispose();
    this.body.material.dispose();
    this.onDispose(this);
  }

  private createImpactPoints(origin: Vector3): Array<{
    axial: number;
    fraction: number;
    position: Vector3;
    systems: AvalanchePointSystems;
    triggered: boolean;
    triggerTime: number;
  }> {
    const count = Math.max(1, Math.floor(this.config.impactPoints));
    const right = new Vector3().crossVectors(UP, this.axis);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const points: Array<{
      axial: number;
      fraction: number;
      position: Vector3;
      systems: AvalanchePointSystems;
      triggered: boolean;
      triggerTime: number;
    }> = [];
    for (let index = 0; index < count; index += 1) {
      const spread = count === 1 ? 0 : index / (count - 1);
      const fraction = IMPACT_FIRST_FRACTION
        + (IMPACT_LAST_FRACTION - IMPACT_FIRST_FRACTION) * spread;
      const axial = this.distance * fraction;
      const lateralAngle = this.config.coneHalfAngle * (spread * 2 - 1) * 0.85;
      const position = origin.clone()
        .addScaledVector(this.axis, axial)
        .addScaledVector(right, Math.sin(lateralAngle) * axial);
      const systems = createAvalancheImpactSystems(
        this.shared.particleMaterials,
        this.config,
      );
      for (const system of systems.all) {
        system.emitter.position.copy(position);
      }
      points.push({
        axial,
        fraction,
        position,
        systems,
        triggered: false,
        triggerTime: -1,
      });
    }
    return points;
  }

  private currentFrontDistance(): number {
    return this.distance * Math.min(1, this.waveElapsed / this.config.waveDuration);
  }

  private frontPosition(frontDistance: number): Vector3 {
    return this.pivot.position.clone().addScaledVector(this.axis, frontDistance);
  }

  private frontRadius(frontDistance: number): number {
    return Math.tan(this.config.coneHalfAngle) * frontDistance + 0.35;
  }

  private triggerPoint(point: (typeof this.points)[number], elapsed: number): void {
    point.triggered = true;
    point.triggerTime = elapsed;
    for (const system of point.systems.all) {
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
  }

  private updateWave(deltaTime: number): void {
    this.waveElapsed = Math.min(
      this.waveElapsed + deltaTime,
      this.config.waveDuration,
    );
    const progress = MathUtils.clamp(
      this.waveElapsed / this.config.waveDuration,
      0,
      1,
    );
    const frontDistance = this.distance * progress;
    const front = this.frontPosition(frontDistance);

    this.waveDust.emitter.position.copy(front);
    this.waveDust.emitter.updateWorldMatrix(true, false);

    for (const point of this.points) {
      if (!point.triggered && progress + 1e-9 >= point.fraction) {
        this.triggerPoint(point, this.waveElapsed);
      }
    }

    const radius = this.frontRadius(frontDistance);
    this.arc.position.set(0, 0, frontDistance);
    this.arc.scale.set(radius, radius, Math.min(1.5, 0.55 + progress));
    this.arc.material.opacity = 0.8 * (1 - progress * 0.3);
    this.body.scale.set(radius * 0.96, 0.9 + progress * 0.8, Math.max(frontDistance, 0.01));
    this.body.material.opacity = 0.5 * Math.min(1, progress * 5) * (1 - progress * 0.2);
    if (this.light) {
      this.light.position.copy(front);
      this.light.intensity = 1.4 + Math.sin(progress * Math.PI) * 2.4;
    }

    if (progress >= 1) this.finishWave(front);
  }

  private finishWave(front: Vector3): void {
    this.phase = "aftermath";
    this.waveDust.endEmit();
    this.linger.emitter.position.copy(front);
    this.linger.emitter.visible = true;
    this.linger.restart();
    this.linger.play();
  }

  private updateAftermath(deltaTime: number): void {
    this.cleanupElapsed += deltaTime;
    const fade = MathUtils.clamp(1 - this.cleanupElapsed / 0.2, 0, 1);
    this.arc.material.opacity *= fade;
    this.body.material.opacity *= fade;
    this.arc.visible = this.arc.material.opacity > 0.004;
    this.body.visible = this.body.material.opacity > 0.004;
    if (this.light) {
      this.light.intensity *= Math.pow(0.001, deltaTime * 3);
      if (this.light.intensity < 0.02) this.light.intensity = 0;
    }
    if (this.cleanupElapsed >= this.config.cleanupDelay) this.dispose();
  }
}

export class AvalancheVfxController {
  private readonly shared: AvalancheSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<AvalancheCast>();
  private readonly config: AvalancheVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<AvalancheVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_AVALANCHE_VFX_CONFIG, ...config };
    this.config = {
      waveDuration: finiteOr(merged.waveDuration, DEFAULT_AVALANCHE_VFX_CONFIG.waveDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_AVALANCHE_VFX_CONFIG.maxConcurrentCasts, 1)),
      dustEmission: finiteOr(merged.dustEmission, DEFAULT_AVALANCHE_VFX_CONFIG.dustEmission, 0),
      debrisPerPoint: Math.floor(finiteOr(merged.debrisPerPoint, DEFAULT_AVALANCHE_VFX_CONFIG.debrisPerPoint, 1)),
      coneHalfAngle: finiteOr(merged.coneHalfAngle, DEFAULT_AVALANCHE_VFX_CONFIG.coneHalfAngle, 0.05),
      maxRange: finiteOr(merged.maxRange, DEFAULT_AVALANCHE_VFX_CONFIG.maxRange, 1),
      impactPoints: Math.floor(finiteOr(merged.impactPoints, DEFAULT_AVALANCHE_VFX_CONFIG.impactPoints, 1)),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_AVALANCHE_VFX_CONFIG.cleanupDelay, 0.1),
      originHeight: finiteOr(merged.originHeight, DEFAULT_AVALANCHE_VFX_CONFIG.originHeight, 0),
    };
    this.shared = createSharedResources();
    this.castRoot.name = "avalanche-vfx-root";
    this.batchedRenderer.name = "avalanche-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castAvalanche(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("AvalancheVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as
        | AvalancheCast
        | undefined;
      oldestCast?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const cast = new AvalancheCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      launchOrigin,
      target.clone(),
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

  getPhase(): AvalanchePhase {
    if (this.casts.size === 0) return "idle";
    let hasWave = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "wave") hasWave = true;
    }
    return hasWave ? "wave" : "aftermath";
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
    this.shared.arcGeometry.dispose();
    this.shared.arcMaterial.dispose();
    this.shared.bodyGeometry.dispose();
    this.shared.bodyMaterial.dispose();
    disposeAvalancheParticleMaterials(this.shared.particleMaterials);
    disposeAvalancheTextures(this.shared.textures);
    this.castRoot.clear();
  }
}

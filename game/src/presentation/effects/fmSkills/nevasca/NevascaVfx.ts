import {
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  Matrix4,
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
import { NevascaResources } from "./NevascaResources";
import { createNevascaSystems } from "./NevascaParticleSystems";

export interface NevascaVfxConfig {
  telegraphDuration: number;
  stormDuration: number;
  peakDuration: number;
  residualDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  radius: number;
  vortexCount: number;
  vortexRadius: number;
  vortexSpeed: number;
  crystalEmission: number;
  shardCount: number;
  shardSpeed: number;
  snowEmission: number;
  snowCount: number;
  mistEmission: number;
  mistCount: number;
  coreCount: number;
  coreSize: number;
  coreInterval: number;
  crystalCount: number;
  crystalSpeed: number;
  coneScale: number;
  frostScale: number;
  lightPeak: number;
}

export const DEFAULT_NEVASCA_VFX_CONFIG: NevascaVfxConfig = {
  telegraphDuration: 0.14,
  stormDuration: 0.34,
  peakDuration: 0.16,
  residualDuration: 0.5,
  fadeDuration: 0.34,
  maxConcurrentCasts: 2,
  radius: 3.8,
  vortexCount: 26,
  vortexRadius: 0.9,
  vortexSpeed: 3.4,
  crystalEmission: 56,
  shardCount: 22,
  shardSpeed: 6.8,
  snowEmission: 50,
  snowCount: 14,
  mistEmission: 26,
  mistCount: 10,
  coreCount: 4,
  coreSize: 1.5,
  coreInterval: 0.045,
  crystalCount: 12,
  crystalSpeed: 5.6,
  coneScale: 1.85,
  frostScale: 5,
  lightPeak: 4,
};

export type NevascaPhase = "telegraph" | "storm" | "peak" | "residual";

const LIGHT_COLOR = 0x9fd8ff;

interface CrystalSeed {
  angle: number;
  offset: number;
  lean: number;
  spin: number;
  scale: number;
  height: number;
  delay: number;
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class NevascaCast {
  private readonly particles: ReturnType<typeof createNevascaSystems>;
  private readonly systems: ParticleSystem[];
  private readonly crystals: InstancedMesh<BufferGeometry, MeshBasicMaterial>;
  private readonly crystalMaterial: MeshBasicMaterial;
  private readonly cone: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly coneMaterial: MeshBasicMaterial;
  private readonly frost: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly frostMaterial: MeshBasicMaterial;
  private readonly rim: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly rimMaterial: MeshBasicMaterial;
  private readonly rimInner: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly rimInnerMaterial: MeshBasicMaterial;
  private readonly light: PointLight;
  private readonly seeds: CrystalSeed[] = [];
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly spinQuaternion = new Quaternion();
  private readonly upAxis = new Vector3(0, 1, 0);
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly axis = new Vector3();
  private phase: NevascaPhase = "telegraph";
  private phaseElapsed = 0;
  private phaseStartedAt = 0;
  private elapsed = 0;
  private coreStarted = 0;
  private shardsStarted = false;
  private highestCrystal = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    resources: NevascaResources,
    private readonly config: NevascaVfxConfig,
    private readonly center: Vector3,
    private readonly onDispose: (cast: NevascaCast) => void,
  ) {
    this.particles = createNevascaSystems(resources, config);
    this.systems = [
      this.particles.vortex,
      this.particles.crystals,
      this.particles.shards,
      this.particles.snow,
      this.particles.mist,
      ...this.particles.cores,
    ];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.crystalMaterial = resources.crystalMaterial.clone();
    this.crystals = new InstancedMesh(resources.crystalGeometry, this.crystalMaterial, config.crystalCount);
    this.crystals.name = "nevasca-crystals";
    this.crystals.instanceMatrix.setUsage(DynamicDrawUsage);
    this.crystals.frustumCulled = false;
    this.crystals.renderOrder = 12;
    this.crystals.position.set(center.x, 0, center.z);
    this.crystals.visible = false;
    this.castRoot.add(this.crystals);
    for (let index = 0; index < config.crystalCount; index += 1) {
      const seed: CrystalSeed = {
        angle: (index / config.crystalCount) * Math.PI * 2 + (index % 3) * 0.16,
        offset: config.radius * (0.42 + (index % 4) * 0.145),
        lean: -0.38 - (index % 5) * 0.075,
        spin: 0.6 + (index % 6) * 0.18,
        scale: 0.72 + (index % 5) * 0.2,
        height: 0.16 + (index % 4) * 0.13,
        delay: (index % 6) * 0.016,
      };
      this.seeds.push(seed);
      this.writeCrystal(index, 0);
    }
    this.crystals.instanceMatrix.needsUpdate = true;

    this.coneMaterial = resources.coneMaterial.clone();
    this.cone = new Mesh(resources.coneShellGeometry, this.coneMaterial);
    this.cone.name = "nevasca-cone";
    this.cone.position.set(center.x, 0.02, center.z);
    this.cone.scale.setScalar(0.001);
    this.cone.renderOrder = 11;
    this.cone.visible = false;
    this.castRoot.add(this.cone);

    this.frostMaterial = resources.materials.ground.clone();
    this.frostMaterial.opacity = 0;
    this.frost = new Mesh(resources.groundGeometry, this.frostMaterial);
    this.frost.name = "nevasca-frost";
    this.frost.position.set(center.x, 0.045, center.z);
    this.frost.scale.setScalar(config.frostScale * 0.2);
    this.frost.renderOrder = 9;
    this.castRoot.add(this.frost);

    this.rimMaterial = resources.arcMaterial.clone();
    this.rim = new Mesh(resources.arcGeometry, this.rimMaterial);
    this.rim.name = "nevasca-rim-0";
    this.rim.position.set(center.x, 0.06, center.z);
    this.rim.renderOrder = 12;
    this.castRoot.add(this.rim);

    this.rimInnerMaterial = resources.arcCoreMaterial.clone();
    this.rimInner = new Mesh(resources.arcSmallGeometry, this.rimInnerMaterial);
    this.rimInner.name = "nevasca-rim-1";
    this.rimInner.position.set(center.x, 0.09, center.z);
    this.rimInner.renderOrder = 12;
    this.castRoot.add(this.rimInner);

    this.light = new PointLight(LIGHT_COLOR, 0, 10, 2);
    this.light.position.set(center.x, 1.3, center.z);
    this.castRoot.add(this.light);

    this.start(this.particles.vortex);
    this.particles.vortex.emitter.position.set(center.x, 0.5, center.z);
    this.updateTelegraph();
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  private writeCrystal(index: number, progress: number): void {
    const seed = this.seeds[index]!;
    const growth = MathUtils.clamp((progress - seed.delay) / Math.max(0.05, 1 - seed.delay), 0, 1);
    const eased = 1 - Math.pow(1 - growth, 2.2);
    const radius = seed.offset * (0.86 + eased * 0.14);
    const height = seed.height + eased * 1.06;
    this.position.set(
      Math.cos(seed.angle) * radius,
      height,
      Math.sin(seed.angle) * radius,
    );
    this.axis.set(Math.sin(seed.angle), 0.24, -Math.cos(seed.angle)).normalize();
    this.quaternion.setFromAxisAngle(this.axis, seed.lean * eased);
    this.spinQuaternion.setFromAxisAngle(this.upAxis, seed.angle + this.elapsed * seed.spin * 0.12);
    this.quaternion.multiply(this.spinQuaternion);
    const scale = Math.max(0.001, seed.scale * (0.24 + eased * 0.76));
    this.scale.set(scale, scale, scale);
    this.matrix.compose(this.position, this.quaternion, this.scale);
    this.crystals.setMatrixAt(index, this.matrix);
    this.highestCrystal = Math.max(this.highestCrystal, height);
  }

  private writeCrystalBreak(index: number, progress: number): void {
    const seed = this.seeds[index]!;
    const flight = MathUtils.clamp((progress - seed.delay) / Math.max(0.05, 1 - seed.delay), 0, 1);
    const radius = seed.offset + flight * (this.config.radius * 0.42 + this.config.crystalSpeed * 0.1);
    const height = (seed.height + 1.06) * (1 - flight * 0.62) + flight * 0.4;
    this.position.set(Math.cos(seed.angle) * radius, Math.max(0.02, height), Math.sin(seed.angle) * radius);
    this.axis.set(Math.sin(seed.angle), 0.3, -Math.cos(seed.angle)).normalize();
    this.quaternion.setFromAxisAngle(this.axis, seed.lean - flight * 1.4);
    this.spinQuaternion.setFromAxisAngle(this.upAxis, seed.angle + this.elapsed * 3.4);
    this.quaternion.multiply(this.spinQuaternion);
    const scale = Math.max(0.001, seed.scale * (1 - flight * 0.72));
    this.scale.set(scale, scale * (1 - flight * 0.4), scale);
    this.matrix.compose(this.position, this.quaternion, this.scale);
    this.crystals.setMatrixAt(index, this.matrix);
    this.highestCrystal = Math.max(this.highestCrystal, Math.max(0.02, height));
  }

  getPhase(): NevascaPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      progress: MathUtils.clamp(this.phaseElapsed / this.currentPhaseDuration(), 0, 1),
      elapsed: this.elapsed,
      phaseStartedAt: this.phaseStartedAt,
      center: this.center.toArray(),
      radius: this.config.radius,
      lightIntensity: this.light.intensity,
      rimOpacity: this.rimMaterial.opacity,
      rimInnerOpacity: this.rimInnerMaterial.opacity,
      frostOpacity: this.frostMaterial.opacity,
      coneOpacity: this.coneMaterial.opacity,
      coneScale: this.cone.scale.x,
      crystalsVisible: this.crystals.visible,
      crystalHeight: this.highestCrystal,
      coresStarted: this.coreStarted,
      shardsStarted: this.shardsStarted,
      crystalMaterialOpacity: this.crystalMaterial.opacity,
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
    if (this.phase === "telegraph") this.updateTelegraph();
    else if (this.phase === "storm") this.updateStorm();
    else if (this.phase === "peak") this.updatePeak();
    else this.updateResidual();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(this.crystals, this.cone, this.frost, this.rim, this.rimInner, this.light);
    this.crystalMaterial.dispose();
    this.coneMaterial.dispose();
    this.frostMaterial.dispose();
    this.rimMaterial.dispose();
    this.rimInnerMaterial.dispose();
    this.light.dispose();
    this.onDispose(this);
  }

  private currentPhaseDuration(): number {
    if (this.phase === "telegraph") return this.config.telegraphDuration;
    if (this.phase === "storm") return this.config.stormDuration;
    if (this.phase === "peak") return this.config.peakDuration;
    return this.config.residualDuration + this.config.fadeDuration;
  }

  private updateTelegraph(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.telegraphDuration, 0, 1);
    const spin = this.elapsed * 1.6;
    this.rim.rotation.y = spin;
    this.rimInner.rotation.y = -spin * 1.35;
    this.rimMaterial.opacity = 0.9 * progress;
    this.rimInnerMaterial.opacity = 0.74 * progress;
    this.frostMaterial.opacity = 0.3 * progress;
    this.frost.scale.setScalar(this.config.frostScale * (0.2 + progress * 0.28));
    this.cone.visible = true;
    this.cone.scale.setScalar(this.config.coneScale * 0.06 * progress);
    this.coneMaterial.opacity = 0.22 * progress;
    this.crystals.visible = false;
    this.particles.vortex.emitter.position.set(this.center.x, 0.4 + progress * 0.3, this.center.z);
    this.light.intensity = this.config.lightPeak * (0.12 + progress * 0.34);
    if (this.phaseElapsed + 1e-9 >= this.config.telegraphDuration) this.triggerStorm();
  }

  private triggerStorm(): void {
    this.phase = "storm";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.vortex.endEmit();
    this.crystals.visible = true;
    this.start(this.particles.crystals);
    this.particles.crystals.emitter.position.set(this.center.x, 0.45, this.center.z);
  }

  private updateStorm(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.stormDuration, 0, 1);
    const eased = MathUtils.clamp(progress / 0.72, 0, 1);
    this.rim.rotation.y = this.elapsed * 2.4;
    this.rimInner.rotation.y = -this.elapsed * 3.2;
    this.rimMaterial.opacity = 0.9;
    this.rimInnerMaterial.opacity = 0.74;
    this.frostMaterial.opacity = 0.26 * (1 - progress * 0.25);
    this.frost.scale.setScalar(this.config.frostScale * (0.48 + progress * 0.2));
    this.cone.visible = true;
    this.cone.scale.setScalar(this.config.coneScale * (0.06 + eased * 0.94));
    this.coneMaterial.opacity = 0.22 + eased * 0.16;
    this.crystalMaterial.opacity = 0.96;
    for (let index = 0; index < this.seeds.length; index += 1) this.writeCrystal(index, progress);
    this.crystals.instanceMatrix.needsUpdate = true;
    this.particles.crystals.emitter.position.set(this.center.x, 0.5 + progress * 1.3, this.center.z);
    this.particles.vortex.emitter.visible = this.particles.vortex.particleNum > 0;
    this.light.intensity = this.config.lightPeak * (0.4 + eased * 0.5);
    if (this.phaseElapsed + 1e-9 >= this.config.stormDuration) this.triggerPeak();
  }

  private triggerPeak(): void {
    this.phase = "peak";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.crystals.endEmit();
    this.shardsStarted = true;
    this.particles.shards.emitter.position.set(this.center.x, 0.62, this.center.z);
    this.start(this.particles.shards);
  }

  private updatePeak(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.peakDuration, 0, 1);
    const collapse = MathUtils.clamp((progress - 0.34) / 0.66, 0, 1);
    this.rim.rotation.y = this.elapsed * 3.1;
    this.rimInner.rotation.y = -this.elapsed * 4.2;
    this.rimMaterial.opacity = 0.9 * (1 - collapse * 0.55);
    this.rimInnerMaterial.opacity = 0.74 * (1 - collapse * 0.4);
    this.coneMaterial.opacity = 0.32 * Math.pow(1 - collapse, 1.4);
    this.cone.scale.setScalar(this.config.coneScale * (1 + collapse * 0.22));
    this.cone.visible = collapse < 0.98;
    this.crystalMaterial.opacity = 0.96 * (1 - collapse * 0.85);
    for (let index = 0; index < this.seeds.length; index += 1) this.writeCrystalBreak(index, progress);
    this.crystals.instanceMatrix.needsUpdate = true;
    const due = Math.min(this.config.coreCount, Math.floor(this.phaseElapsed / this.config.coreInterval) + 1);
    while (this.coreStarted < due) {
      const core = this.particles.cores[this.coreStarted]!;
      const angle = this.coreStarted * 1.9;
      const offset = this.config.radius * (0.2 + (this.coreStarted % 3) * 0.24);
      core.emitter.position.set(
        this.center.x + Math.cos(angle) * offset,
        0.5 + (this.coreStarted % 2) * 0.42,
        this.center.z + Math.sin(angle) * offset,
      );
      this.start(core);
      this.coreStarted += 1;
    }
    this.light.intensity = this.config.lightPeak * (1 - collapse * 0.55);
    if (this.phaseElapsed + 1e-9 >= this.config.peakDuration) this.triggerResidual();
  }

  private triggerResidual(): void {
    this.phase = "residual";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.crystals.visible = false;
    this.particles.shards.endEmit();
    this.particles.snow.emitter.position.set(this.center.x, 1.1, this.center.z);
    this.start(this.particles.snow);
    this.particles.mist.emitter.position.set(this.center.x, 0.35, this.center.z);
    this.start(this.particles.mist);
  }

  private updateResidual(): void {
    const fadeStart = this.config.residualDuration;
    const fadeProgress = MathUtils.clamp((this.phaseElapsed - fadeStart) / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - fadeProgress, 2);
    this.rimMaterial.opacity = 0.4 * fade;
    this.rimInnerMaterial.opacity = 0.34 * fade;
    this.rim.rotation.y = this.elapsed * 0.9;
    this.rimInner.rotation.y = -this.elapsed * 1.2;
    this.frostMaterial.opacity = 0.22 * fade;
    this.frost.scale.setScalar(this.config.frostScale * (0.68 + this.phaseElapsed * 0.12));
    this.cone.visible = false;
    this.light.intensity = this.config.lightPeak * 0.1 * fade;
    if (this.phaseElapsed + 1e-9 >= this.config.residualDuration + this.config.fadeDuration) this.dispose();
  }
}

export class NevascaVfxController {
  private readonly resources = new NevascaResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<NevascaCast>();
  private readonly config: NevascaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<NevascaVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_NEVASCA_VFX_CONFIG, ...config };
    const fallback = DEFAULT_NEVASCA_VFX_CONFIG;
    this.config = {
      telegraphDuration: finiteOr(merged.telegraphDuration, fallback.telegraphDuration, 0.02),
      stormDuration: finiteOr(merged.stormDuration, fallback.stormDuration, 0.02),
      peakDuration: finiteOr(merged.peakDuration, fallback.peakDuration, 0.02),
      residualDuration: finiteOr(merged.residualDuration, fallback.residualDuration, 0.1),
      fadeDuration: finiteOr(merged.fadeDuration, fallback.fadeDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, fallback.maxConcurrentCasts, 1)),
      radius: finiteOr(merged.radius, fallback.radius, 0.5),
      vortexCount: Math.floor(finiteOr(merged.vortexCount, fallback.vortexCount, 0)),
      vortexRadius: finiteOr(merged.vortexRadius, fallback.vortexRadius, 0.05),
      vortexSpeed: finiteOr(merged.vortexSpeed, fallback.vortexSpeed, 0),
      crystalEmission: finiteOr(merged.crystalEmission, fallback.crystalEmission, 0),
      shardCount: Math.floor(finiteOr(merged.shardCount, fallback.shardCount, 0)),
      shardSpeed: finiteOr(merged.shardSpeed, fallback.shardSpeed, 0.2),
      snowEmission: finiteOr(merged.snowEmission, fallback.snowEmission, 0),
      snowCount: Math.floor(finiteOr(merged.snowCount, fallback.snowCount, 0)),
      mistEmission: finiteOr(merged.mistEmission, fallback.mistEmission, 0),
      mistCount: Math.floor(finiteOr(merged.mistCount, fallback.mistCount, 0)),
      coreCount: Math.floor(finiteOr(merged.coreCount, fallback.coreCount, 1)),
      coreSize: finiteOr(merged.coreSize, fallback.coreSize, 0.1),
      coreInterval: finiteOr(merged.coreInterval, fallback.coreInterval, 0.02),
      crystalCount: Math.floor(finiteOr(merged.crystalCount, fallback.crystalCount, 1)),
      crystalSpeed: finiteOr(merged.crystalSpeed, fallback.crystalSpeed, 0),
      coneScale: finiteOr(merged.coneScale, fallback.coneScale, 0.2),
      frostScale: finiteOr(merged.frostScale, fallback.frostScale, 0.2),
      lightPeak: finiteOr(merged.lightPeak, fallback.lightPeak, 0),
    };
    this.castRoot.name = "nevasca-vfx-root";
    this.batchedRenderer.name = "nevasca-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castNevasca(center: Vector3): void {
    if (this.disposed) throw new Error("NevascaVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as NevascaCast | undefined;
      oldest?.dispose();
    }
    const ground = center.clone();
    ground.y = Math.max(center.y, 0);
    const cast = new NevascaCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.resources,
      this.config,
      ground,
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

  getPhase(): NevascaPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    const order: NevascaPhase[] = ["telegraph", "storm", "peak", "residual"];
    let phase: NevascaPhase | "idle" = "idle";
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

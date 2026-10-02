import {
  AdditiveBlending,
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
import { createTempestadeBrasaSystems } from "./TempestadeBrasaParticleSystems";
import { TempestadeBrasaResources } from "./TempestadeBrasaResources";

export interface TempestadeBrasaVfxConfig {
  telegraphDuration: number;
  stormDuration: number;
  peakDuration: number;
  residualDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  radius: number;
  emberCount: number;
  emberEmission: number;
  rainEmission: number;
  rainCount: number;
  rainHeight: number;
  rainSpeed: number;
  cinderEmission: number;
  coreCount: number;
  coreSize: number;
  coreInterval: number;
  debrisCount: number;
  debrisSpeed: number;
  dustCount: number;
  ashEmission: number;
  scorchScale: number;
  crackCount: number;
  lightPeak: number;
}

export const DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG: TempestadeBrasaVfxConfig = {
  telegraphDuration: 0.18,
  stormDuration: 0.34,
  peakDuration: 0.16,
  residualDuration: 0.5,
  fadeDuration: 0.34,
  maxConcurrentCasts: 2,
  radius: 3.6,
  emberCount: 22,
  emberEmission: 90,
  rainEmission: 88,
  rainCount: 24,
  rainHeight: 4.4,
  rainSpeed: 9,
  cinderEmission: 110,
  coreCount: 4,
  coreSize: 1.5,
  coreInterval: 0.075,
  debrisCount: 24,
  debrisSpeed: 6.4,
  dustCount: 18,
  ashEmission: 70,
  scorchScale: 7.4,
  crackCount: 7,
  lightPeak: 4.2,
};

export type TempestadeBrasaPhase = "telegraph" | "storm" | "peak" | "residual";

const LIGHT_COLOR = 0xff8a33;
const UP = new Vector3(0, 1, 0);
const DEBRIS_GRAVITY = 14;

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

interface DebrisSeed {
  angle: number;
  speed: number;
  lift: number;
  spin: number;
  size: number;
  delay: number;
  scale: number;
}

function debrisSeeds(count: number, radius: number, speed: number): DebrisSeed[] {
  const seeds: DebrisSeed[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + Math.sin(index * 2.3) * 0.35;
    const reach = radius * (0.22 + Math.abs(Math.sin(index * 1.7)) * 0.72);
    seeds.push({
      angle,
      speed: speed * (0.42 + Math.abs(Math.sin(index * 3.1)) * 0.58),
      lift: 3.4 + Math.abs(Math.cos(index * 1.3)) * 3.6,
      spin: 2.4 + Math.abs(Math.sin(index * 4.7)) * 7,
      size: 0.34 + Math.abs(Math.cos(index * 2.9)) * 0.5,
      delay: Math.abs(Math.sin(index * 5.3)) * 0.16,
      scale: reach,
    });
  }
  return seeds;
}

class TempestadeBrasaCast {
  private readonly particles: ReturnType<typeof createTempestadeBrasaSystems>;
  private readonly systems: ParticleSystem[];
  private readonly cores: ParticleSystem[];
  private readonly rimArcs: Mesh<BufferGeometry, MeshBasicMaterial>[] = [];
  private readonly cracks: Mesh<BufferGeometry, MeshBasicMaterial>[] = [];
  private readonly scorch: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly scorchMaterial: MeshBasicMaterial;
  private readonly flash: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly flashMaterial: MeshBasicMaterial;
  private readonly debris: InstancedMesh<BufferGeometry, MeshBasicMaterial>;
  private readonly seeds: DebrisSeed[];
  private readonly light: PointLight;
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly corePositions: Vector3[] = [];
  private phase: TempestadeBrasaPhase = "telegraph";
  private phaseElapsed = 0;
  private phaseStartedAt = 0;
  private elapsed = 0;
  private coresStarted = 0;
  private flashFired = false;
  private highestDebris = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    resources: TempestadeBrasaResources,
    private readonly config: TempestadeBrasaVfxConfig,
    private readonly center: Vector3,
    private readonly onDispose: (cast: TempestadeBrasaCast) => void,
  ) {
    this.particles = createTempestadeBrasaSystems(resources, {
      ...config,
      areaRadius: config.radius,
    });
    this.cores = this.particles.cores;
    this.systems = [
      this.particles.embers,
      this.particles.rain,
      this.particles.cinders,
      this.particles.dust,
      this.particles.ash,
      ...this.cores,
    ];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    for (const system of [this.particles.embers, this.particles.rain, this.particles.cinders,
      this.particles.dust, this.particles.ash]) {
      system.emitter.position.copy(center);
    }
    for (let index = 0; index < this.cores.length; index += 1) {
      const spread = config.radius * (0.24 + index * 0.15);
      const angle = index * 2.2 + 0.6;
      const core = new Vector3(
        center.x + Math.cos(angle) * spread,
        center.y + 0.06,
        center.z + Math.sin(angle) * spread,
      );
      this.corePositions.push(core);
      this.cores[index]!.emitter.position.copy(core);
    }
    this.particles.rain.emitter.position.set(center.x, center.y + config.rainHeight, center.z);

    for (let index = 0; index < 2; index += 1) {
      const geometry = index === 0 ? resources.rimArcGeometry : resources.rimArcSmallGeometry;
      const material = (index === 0 ? resources.rimMaterial : resources.rimCoreMaterial).clone();
      material.blending = AdditiveBlending;
      material.opacity = 0;
      const arc = new Mesh(geometry, material);
      arc.name = `tempestade-brasa-rim-${index}`;
      arc.position.set(center.x, 0.02, center.z);
      arc.rotation.y = index * 1.9;
      arc.scale.setScalar(index === 0 ? 1 : 1.02);
      arc.renderOrder = 10;
      this.rimArcs.push(arc);
      this.castRoot.add(arc);
    }

    const crackMaterial = resources.crackMaterial.clone();
    for (let index = 0; index < config.crackCount; index += 1) {
      const material = crackMaterial.clone();
      material.opacity = 0;
      const crack = new Mesh(resources.crackGeometry, material);
      crack.name = `tempestade-brasa-crack-${index}`;
      const angle = (index / config.crackCount) * Math.PI * 2 + 0.4;
      crack.position.set(center.x, 0.01, center.z);
      crack.rotation.y = angle;
      crack.scale.set(
        config.radius * (0.5 + Math.abs(Math.sin(index * 1.9)) * 0.42),
        1,
        0.8 + Math.abs(Math.sin(index * 1.9)) * 0.7,
      );
      crack.renderOrder = 9;
      this.cracks.push(crack);
      this.castRoot.add(crack);
    }

    this.scorchMaterial = resources.materials.scorch.clone();
    this.scorchMaterial.opacity = 0;
    this.scorch = new Mesh(resources.horizontalGeometry, this.scorchMaterial);
    this.scorch.name = "tempestade-brasa-scorch";
    this.scorch.position.set(center.x, 0.035, center.z);
    this.scorch.scale.setScalar(config.scorchScale);
    this.scorch.renderOrder = 8;
    this.castRoot.add(this.scorch);

    this.flashMaterial = resources.materials.flash.clone();
    this.flashMaterial.opacity = 0;
    this.flash = new Mesh(resources.horizontalGeometry, this.flashMaterial);
    this.flash.name = "tempestade-brasa-flash";
    this.flash.position.set(center.x, center.y + 0.12, center.z);
    this.flash.scale.setScalar(config.radius * 1.3);
    this.flash.renderOrder = 14;
    this.castRoot.add(this.flash);

    this.seeds = debrisSeeds(config.debrisCount, config.radius, config.debrisSpeed);
    this.debris = new InstancedMesh(resources.coalGeometry, resources.coalMaterial.clone(), config.debrisCount);
    this.debris.name = "tempestade-brasa-debris";
    this.debris.frustumCulled = false;
    this.debris.instanceMatrix.setUsage(DynamicDrawUsage);
    this.debris.visible = false;
    this.castRoot.add(this.debris);

    this.light = new PointLight(LIGHT_COLOR, 0, config.radius * 3.4, 2);
    this.light.position.set(center.x, 1.1, center.z);
    this.castRoot.add(this.light);

    this.start(this.particles.embers);
    this.updateTelegraph(0);
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  getPhase(): TempestadeBrasaPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      progress: MathUtils.clamp(this.phaseElapsed / this.currentPhaseDuration(), 0, 1),
      elapsed: this.elapsed,
      phaseStartedAt: this.phaseStartedAt,
      center: this.center.toArray(),
      coresStarted: this.coresStarted,
      flashFired: this.flashFired,
      lightIntensity: this.light.intensity,
      rimOpacity: this.rimArcs[0]?.material.opacity ?? 0,
      crackOpacity: this.cracks[0]?.material.opacity ?? 0,
      scorchOpacity: this.scorchMaterial.opacity,
      flashOpacity: this.flashMaterial.opacity,
      debrisVisible: this.debris.visible,
      debrisHeight: this.highestDebris,
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
    if (this.phase === "telegraph") this.updateTelegraph(deltaTime);
    else if (this.phase === "storm") this.updateStorm(deltaTime);
    else if (this.phase === "peak") this.updatePeak(deltaTime);
    else this.updateResidual(deltaTime);
    this.updateDebris(deltaTime);
    this.updateRim();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    for (const arc of this.rimArcs) {
      this.castRoot.remove(arc);
      arc.material.dispose();
    }
    for (const crack of this.cracks) {
      this.castRoot.remove(crack);
      crack.material.dispose();
    }
    this.castRoot.remove(this.scorch, this.flash, this.debris, this.light);
    this.scorchMaterial.dispose();
    this.flashMaterial.dispose();
    this.debris.material.dispose();
    this.debris.dispose();
    this.light.dispose();
    this.onDispose(this);
  }

  private currentPhaseDuration(): number {
    if (this.phase === "telegraph") return this.config.telegraphDuration;
    if (this.phase === "storm") return this.config.stormDuration;
    if (this.phase === "peak") return this.config.peakDuration;
    return this.config.residualDuration + this.config.fadeDuration;
  }

  private updateTelegraph(deltaTime: number): void {
    void deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.telegraphDuration, 0, 1);
    for (const arc of this.rimArcs) arc.material.opacity = progress * 0.72;
    for (const crack of this.cracks) crack.material.opacity = progress * 0.78;
    this.light.intensity = this.config.lightPeak * progress * 0.24;
    if (this.phaseElapsed + 1e-9 >= this.config.telegraphDuration) this.triggerStorm();
  }

  private triggerStorm(): void {
    this.phase = "storm";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.embers.endEmit();
    this.particles.rain.emitter.position.set(this.center.x, this.center.y + this.config.rainHeight, this.center.z);
    this.start(this.particles.rain);
    this.particles.cinders.emitter.position.set(this.center.x, this.center.y + 0.35, this.center.z);
    this.start(this.particles.cinders);
    this.debris.visible = true;
  }

  private updateStorm(deltaTime: number): void {
    void deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.stormDuration, 0, 1);
    const coresDue = Math.min(
      this.cores.length,
      Math.floor(this.phaseElapsed / this.config.coreInterval) + 1,
    );
    while (this.coresStarted < coresDue) {
      this.start(this.cores[this.coresStarted]!);
      this.coresStarted += 1;
    }
    for (const arc of this.rimArcs) arc.material.opacity = 0.72 + progress * 0.2;
    for (const crack of this.cracks) crack.material.opacity = 0.78 + progress * 0.2;
    this.scorchMaterial.opacity = progress * 0.3;
    this.light.intensity = this.config.lightPeak * (0.3 + progress * 0.55);
    if (this.phaseElapsed + 1e-9 >= this.config.stormDuration) this.triggerPeak();
  }

  private triggerPeak(): void {
    this.phase = "peak";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.rain.endEmit();
    this.particles.cinders.endEmit();
    this.flashFired = true;
    this.flashMaterial.opacity = 0.95;
    this.light.intensity = this.config.lightPeak;
    for (const arc of this.rimArcs) arc.scale.setScalar(1.12);
  }

  private updatePeak(deltaTime: number): void {
    void deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.peakDuration, 0, 1);
    const fade = Math.pow(1 - progress, 1.6);
    this.flashMaterial.opacity = 0.95 * fade;
    this.flash.scale.setScalar(this.config.radius * (1.5 + progress * 0.9));
    for (const arc of this.rimArcs) {
      arc.material.opacity = Math.max(0, (0.92 - progress * 0.62) * fade + 0.12);
      arc.scale.setScalar(1.12 + progress * 0.26);
    }
    this.light.intensity = this.config.lightPeak * fade;
    this.scorchMaterial.opacity = 0.3 + progress * 0.42;
    if (this.phaseElapsed + 1e-9 >= this.config.peakDuration) this.triggerResidual();
  }

  private triggerResidual(): void {
    this.phase = "residual";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.dust.emitter.position.set(this.center.x, this.center.y + 0.2, this.center.z);
    this.particles.ash.emitter.position.set(this.center.x, this.center.y + 0.25, this.center.z);
    this.start(this.particles.dust);
    this.start(this.particles.ash);
  }

  private updateResidual(deltaTime: number): void {
    void deltaTime;
    const melt = MathUtils.clamp(this.phaseElapsed / 0.42, 0, 1);
    const fadeStart = this.config.residualDuration;
    const fadeProgress = MathUtils.clamp((this.phaseElapsed - fadeStart) / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - fadeProgress, 2);
    this.scorchMaterial.opacity = 0.72 * fade;
    for (const arc of this.rimArcs) arc.material.opacity = 0.14 * fade;
    for (const crack of this.cracks) crack.material.opacity = 0.9 * Math.max(0, 1 - melt) * fade;
    this.light.intensity = this.config.lightPeak * 0.1 * fade;
    if (this.phaseElapsed + 1e-9 >= this.config.residualDuration + this.config.fadeDuration) this.dispose();
  }

  private updateRim(): void {
    this.rimArcs[0]!.rotation.y = this.elapsed * 0.42;
    this.rimArcs[1]!.rotation.y = -this.elapsed * 0.68 + 1.9;
  }

  private updateDebris(deltaTime: number): void {
    void deltaTime;
    const airborne = this.phase !== "telegraph";
    if (!airborne) {
      this.debris.visible = false;
      this.highestDebris = 0;
      return;
    }
    this.debris.visible = true;
    const local = this.phase === "storm"
      ? this.phaseElapsed
      : this.config.stormDuration + (this.phase === "peak" ? this.phaseElapsed : this.config.peakDuration + this.phaseElapsed);
    let highest = 0;
    for (let index = 0; index < this.seeds.length; index += 1) {
      const seed = this.seeds[index]!;
      const life = Math.max(0, local - seed.delay);
      const landing = 2 * seed.lift / DEBRIS_GRAVITY;
      const flight = Math.min(life, landing);
      const height = seed.lift * flight - 0.5 * DEBRIS_GRAVITY * flight * flight;
      const reach = seed.speed * flight;
      const fadeOut = MathUtils.clamp((life - landing - 0.12) / 0.3, 0, 1);
      const appear = MathUtils.clamp(life * 6, 0, 1);
      this.position.set(
        this.center.x + Math.cos(seed.angle) * (seed.scale + reach * 0.4),
        this.center.y + Math.max(0, height),
        this.center.z + Math.sin(seed.angle) * (seed.scale + reach * 0.4),
      );
      this.quaternion.setFromAxisAngle(UP, seed.angle + life * seed.spin);
      const scale = seed.size * (1 - fadeOut) * appear;
      this.scale.set(scale, scale, scale);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.debris.setMatrixAt(index, this.matrix);
      if (this.position.y > highest) highest = this.position.y;
    }
    this.debris.instanceMatrix.needsUpdate = true;
    this.highestDebris = highest;
  }
}

export class TempestadeBrasaVfxController {
  private readonly resources = new TempestadeBrasaResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<TempestadeBrasaCast>();
  private readonly config: TempestadeBrasaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<TempestadeBrasaVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG, ...config };
    const fallback = DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG;
    this.config = {
      telegraphDuration: finiteOr(merged.telegraphDuration, fallback.telegraphDuration, 0.02),
      stormDuration: finiteOr(merged.stormDuration, fallback.stormDuration, 0.05),
      peakDuration: finiteOr(merged.peakDuration, fallback.peakDuration, 0.02),
      residualDuration: finiteOr(merged.residualDuration, fallback.residualDuration, 0.1),
      fadeDuration: finiteOr(merged.fadeDuration, fallback.fadeDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, fallback.maxConcurrentCasts, 1)),
      radius: finiteOr(merged.radius, fallback.radius, 0.4),
      emberCount: Math.floor(finiteOr(merged.emberCount, fallback.emberCount, 0)),
      emberEmission: finiteOr(merged.emberEmission, fallback.emberEmission, 0),
      rainEmission: finiteOr(merged.rainEmission, fallback.rainEmission, 0),
      rainCount: Math.floor(finiteOr(merged.rainCount, fallback.rainCount, 0)),
      rainHeight: finiteOr(merged.rainHeight, fallback.rainHeight, 0.6),
      rainSpeed: finiteOr(merged.rainSpeed, fallback.rainSpeed, 1),
      cinderEmission: finiteOr(merged.cinderEmission, fallback.cinderEmission, 0),
      coreCount: Math.floor(finiteOr(merged.coreCount, fallback.coreCount, 1)),
      coreSize: finiteOr(merged.coreSize, fallback.coreSize, 0.2),
      coreInterval: finiteOr(merged.coreInterval, fallback.coreInterval, 0.01),
      debrisCount: Math.floor(finiteOr(merged.debrisCount, fallback.debrisCount, 0)),
      debrisSpeed: finiteOr(merged.debrisSpeed, fallback.debrisSpeed, 0.5),
      dustCount: Math.floor(finiteOr(merged.dustCount, fallback.dustCount, 0)),
      ashEmission: finiteOr(merged.ashEmission, fallback.ashEmission, 0),
      scorchScale: finiteOr(merged.scorchScale, fallback.scorchScale, 0.5),
      crackCount: Math.floor(finiteOr(merged.crackCount, fallback.crackCount, 0)),
      lightPeak: finiteOr(merged.lightPeak, fallback.lightPeak, 0),
    };
    this.castRoot.name = "tempestade-brasa-vfx-root";
    this.batchedRenderer.name = "tempestade-brasa-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castTempestadeBrasa(center: Vector3): void {
    if (this.disposed) throw new Error("TempestadeBrasaVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as TempestadeBrasaCast | undefined;
      oldest?.dispose();
    }
    const grounded = new Vector3(center.x, Math.max(center.y, 0), center.z);
    const cast = new TempestadeBrasaCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.resources,
      this.config,
      grounded,
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

  getPhase(): TempestadeBrasaPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    const order: TempestadeBrasaPhase[] = ["telegraph", "storm", "peak", "residual"];
    let phase: TempestadeBrasaPhase | "idle" = "idle";
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

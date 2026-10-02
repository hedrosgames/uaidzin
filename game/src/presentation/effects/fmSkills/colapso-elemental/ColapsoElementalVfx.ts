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
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { ColapsoElementalResources } from "./ColapsoElementalResources";
import { createColapsoElementalSystems } from "./ColapsoElementalParticleSystems";

export interface ColapsoElementalVfxConfig {
  telegraphDuration: number;
  collapseDuration: number;
  ruptureDuration: number;
  residualDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  radius: number;
  orbitRadius: number;
  orbitCount: number;
  orbitSpeed: number;
  emberEmission: number;
  fragmentCount: number;
  fragmentSpeed: number;
  waveEmission: number;
  waveCount: number;
  dustEmission: number;
  dustCount: number;
  coreCount: number;
  coreSize: number;
  coreInterval: number;
  shardCount: number;
  shardSpeed: number;
  shardLift: number;
  discScale: number;
  lightPeak: number;
}

export const DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG: ColapsoElementalVfxConfig = {
  telegraphDuration: 0.16,
  collapseDuration: 0.32,
  ruptureDuration: 0.18,
  residualDuration: 0.46,
  fadeDuration: 0.34,
  maxConcurrentCasts: 2,
  radius: 4.4,
  orbitRadius: 1.75,
  orbitCount: 4,
  orbitSpeed: 3.2,
  emberEmission: 40,
  fragmentCount: 22,
  fragmentSpeed: 8.2,
  waveEmission: 38,
  waveCount: 12,
  dustEmission: 30,
  dustCount: 10,
  coreCount: 4,
  coreSize: 1.8,
  coreInterval: 0.042,
  shardCount: 24,
  shardSpeed: 8.4,
  shardLift: 2.4,
  discScale: 1,
  lightPeak: 4.4,
};

export type ColapsoElementalPhase = "telegraph" | "collapse" | "rupture" | "residual";

const LIGHT_COLOR = 0xffc078;
const ELEMENT_TINTS = [0xff752b, 0x65bfff, 0xac58ef, 0xffd65c] as const;
const ELEMENT_OFFSETS = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5] as const;

interface ShardSeed {
  variant: number;
  angle: number;
  speed: number;
  lift: number;
  spin: number;
  scale: number;
  delay: number;
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class ColapsoElementalCast {
  private readonly particles: ReturnType<typeof createColapsoElementalSystems>;
  private readonly systems: ParticleSystem[];
  private readonly orbitCores: Mesh<BufferGeometry, MeshBasicMaterial>[] = [];
  private readonly orbitMaterials: MeshBasicMaterial[] = [];
  private readonly heart: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly heartMaterial: MeshBasicMaterial;
  private readonly disc: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly discMaterial: MeshBasicMaterial;
  private readonly discInner: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly discInnerMaterial: MeshBasicMaterial;
  private readonly shardMeshes: InstancedMesh<BufferGeometry, MeshBasicMaterial>[] = [];
  private readonly shardMaterials: MeshBasicMaterial[] = [];
  private readonly seeds: ShardSeed[] = [];
  private readonly light: PointLight;
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly axis = new Vector3();
  private phase: ColapsoElementalPhase = "telegraph";
  private phaseElapsed = 0;
  private phaseStartedAt = 0;
  private elapsed = 0;
  private coreStarted = 0;
  private orbitDistance = 0;
  private highestShard = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    resources: ColapsoElementalResources,
    private readonly config: ColapsoElementalVfxConfig,
    private readonly center: Vector3,
    private readonly onDispose: (cast: ColapsoElementalCast) => void,
  ) {
    this.particles = createColapsoElementalSystems(resources, config);
    this.systems = [
      this.particles.orbit,
      this.particles.fragments,
      this.particles.wave,
      this.particles.dust,
      ...this.particles.cores,
    ];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    for (let index = 0; index < config.orbitCount; index += 1) {
      const material = resources.coreMeshMaterial.clone();
      material.color.setHex(ELEMENT_TINTS[index % ELEMENT_TINTS.length]!);
      const core = new Mesh(resources.coreGeometry, material);
      core.name = `colapso-elemental-orbit-${index}`;
      core.scale.setScalar(0.001);
      core.renderOrder = 13;
      core.position.set(center.x, center.y + 1.05, center.z);
      this.orbitCores.push(core);
      this.orbitMaterials.push(material);
      this.castRoot.add(core);
    }

    this.heartMaterial = resources.coreMeshMaterial.clone();
    this.heartMaterial.color.setHex(0x180e27);
    this.heartMaterial.vertexColors = false;
    this.heart = new Mesh(resources.coreGeometry, this.heartMaterial);
    this.heart.name = "colapso-elemental-heart";
    this.heart.position.set(center.x, center.y + 1.05, center.z);
    this.heart.scale.setScalar(0.001);
    this.heart.renderOrder = 14;
    this.castRoot.add(this.heart);

    this.discMaterial = resources.discMaterial.clone();
    this.discMaterial.opacity = 0;
    this.disc = new Mesh(resources.discGeometry, this.discMaterial);
    this.disc.name = "colapso-elemental-disc";
    this.disc.position.set(center.x, center.y + 0.06, center.z);
    this.disc.scale.setScalar(0.001);
    this.disc.renderOrder = 11;
    this.disc.visible = false;
    this.castRoot.add(this.disc);

    this.discInnerMaterial = resources.discInnerMaterial.clone();
    this.discInnerMaterial.opacity = 0;
    this.discInner = new Mesh(resources.discInnerGeometry, this.discInnerMaterial);
    this.discInner.name = "colapso-elemental-disc-inner";
    this.discInner.position.set(center.x, center.y + 0.1, center.z);
    this.discInner.scale.setScalar(0.001);
    this.discInner.renderOrder = 12;
    this.discInner.visible = false;
    this.castRoot.add(this.discInner);

    const perVariant = Math.max(1, Math.ceil(config.shardCount / 4));
    for (let variant = 0; variant < 4; variant += 1) {
      const material = resources.shardMaterials[variant]!.clone();
      const mesh = new InstancedMesh(resources.shardGeometries[variant]!, material, perVariant);
      mesh.name = `colapso-elemental-shards-${variant}`;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.renderOrder = 12;
      mesh.visible = false;
      this.castRoot.add(mesh);
      this.shardMeshes.push(mesh);
      this.shardMaterials.push(material);
      for (let slot = 0; slot < perVariant; slot += 1) {
        const seed: ShardSeed = {
          variant,
          angle: (variant * perVariant + slot) / (perVariant * 4) * Math.PI * 2 + 0.18,
          speed: 0.72 + ((slot * 3 + variant) % 5) * 0.16,
          lift: 0.5 + ((slot + variant) % 4) * 0.28,
          spin: 1.6 + ((slot + variant * 2) % 5) * 0.7,
          scale: 0.72 + ((slot + variant) % 4) * 0.22,
          delay: ((slot * 2 + variant) % 5) * 0.018,
        };
        this.seeds.push(seed);
        this.writeShard(variant, slot, 0);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    this.light = new PointLight(LIGHT_COLOR, 0, 12, 2);
    this.light.position.set(center.x, center.y + 1.1, center.z);
    this.castRoot.add(this.light);

    this.particles.orbit.emitter.position.set(center.x, center.y + 1.05, center.z);
    this.start(this.particles.orbit);
    this.updateTelegraph();
  }

  private start(system: ParticleSystem): void {
    system.restart();
    system.play();
    system.emitter.visible = true;
  }

  private writeShard(variant: number, slot: number, progress: number): void {
    const seed = this.seeds[variant * this.shardMeshes[variant]!.count + slot] ?? this.seeds[0]!;
    const mesh = this.shardMeshes[variant]!;
    const flight = MathUtils.clamp((progress - seed.delay) / Math.max(0.05, 1 - seed.delay), 0, 1);
    const overshoot = Math.max(0, progress - 1);
    const speed = this.config.shardSpeed * seed.speed;
    const radius = this.config.radius * (0.16 + flight * 0.86) + overshoot * speed * 0.16;
    const height = Math.max(
      0.04,
      this.center.y + 0.34 + speed * seed.lift * 0.16 * flight
        - this.config.shardLift * flight * flight
        - overshoot * overshoot * this.config.shardLift * 1.1,
    );
    this.position.set(
      this.center.x + Math.cos(seed.angle) * radius,
      height,
      this.center.z + Math.sin(seed.angle) * radius,
    );
    this.axis.set(Math.sin(seed.angle), 0.4, -Math.cos(seed.angle)).normalize();
    this.quaternion.setFromAxisAngle(this.axis, seed.spin * flight);
    const scale = Math.max(0.001, seed.scale * (1 - flight * 0.55));
    this.scale.set(scale, scale, scale);
    this.matrix.compose(this.position, this.quaternion, this.scale);
    mesh.setMatrixAt(slot, this.matrix);
    this.highestShard = Math.max(this.highestShard, height);
  }

  getPhase(): ColapsoElementalPhase {
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
      orbitDistance: this.orbitDistance,
      orbitCount: this.orbitCores.length,
      orbitScale: this.orbitCores[0]?.scale.x ?? 0,
      heartScale: this.heart.scale.x,
      heartVisible: this.heart.visible,
      discOpacity: this.discMaterial.opacity,
      discScale: this.disc.scale.x,
      discVisible: this.disc.visible,
      shardsVisible: this.shardMeshes[0]?.visible ?? false,
      shardHeight: this.highestShard,
      coreStarted: this.coreStarted,
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
    else if (this.phase === "collapse") this.updateCollapse();
    else if (this.phase === "rupture") this.updateRupture();
    else this.updateResidual();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(this.heart, this.disc, this.discInner, this.light);
    for (const core of this.orbitCores) this.castRoot.remove(core);
    for (const mesh of this.shardMeshes) {
      this.castRoot.remove(mesh);
      mesh.dispose();
    }
    for (const material of this.orbitMaterials) material.dispose();
    for (const material of this.shardMaterials) material.dispose();
    this.heartMaterial.dispose();
    this.discMaterial.dispose();
    this.discInnerMaterial.dispose();
    this.light.dispose();
    this.onDispose(this);
  }

  private currentPhaseDuration(): number {
    if (this.phase === "telegraph") return this.config.telegraphDuration;
    if (this.phase === "collapse") return this.config.collapseDuration;
    if (this.phase === "rupture") return this.config.ruptureDuration;
    return this.config.residualDuration + this.config.fadeDuration;
  }

  private updateOrbit(distance: number, spin: number, size: number): void {
    this.orbitDistance = distance;
    for (let index = 0; index < this.orbitCores.length; index += 1) {
      const core = this.orbitCores[index]!;
      const angle = ELEMENT_OFFSETS[index % ELEMENT_OFFSETS.length]! + spin;
      const bob = Math.sin(this.elapsed * 5.4 + index * 1.7) * 0.12;
      core.position.set(
        this.center.x + Math.cos(angle) * distance,
        this.center.y + 1.05 + bob * distance * 0.6,
        this.center.z + Math.sin(angle) * distance,
      );
      const variant = index % ELEMENT_TINTS.length;
      const width = variant === 1 ? 0.72 : variant === 2 ? 0.86 : 1.08;
      const height = variant === 1 ? 1.65 : variant === 3 ? 0.8 : 1.12;
      core.scale.set(size * width, size * height, size * width);
      core.rotation.y = this.elapsed * 2.2 + index;
      core.rotation.x = this.elapsed * 1.4;
    }
  }

  private updateTelegraph(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.telegraphDuration, 0, 1);
    const spin = this.elapsed * this.config.orbitSpeed;
    this.updateOrbit(this.config.orbitRadius * (0.6 + progress * 0.4), spin, 0.2 + progress * 0.22);
    this.heart.visible = true;
    this.heart.scale.setScalar(0.18 + progress * 0.28);
    this.heartMaterial.opacity = 0.5 + progress * 0.42;
    this.heart.rotation.y = this.elapsed * 3.4;
    this.particles.orbit.emitter.position.set(this.center.x, this.center.y + 1.05, this.center.z);
    this.light.intensity = this.config.lightPeak * (0.1 + progress * 0.3);
    if (this.phaseElapsed + 1e-9 >= this.config.telegraphDuration) this.triggerCollapse();
  }

  private triggerCollapse(): void {
    this.phase = "collapse";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.orbit.endEmit();
  }

  private updateCollapse(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.collapseDuration, 0, 1);
    const eased = Math.pow(progress, 1.7);
    const distance = this.config.orbitRadius * (1 - eased * 0.86);
    const spin = this.elapsed * this.config.orbitSpeed * (1 + progress * 1.6);
    this.updateOrbit(Math.max(0.14, distance), spin, 0.42 * (1 - progress * 0.55));
    const squeeze = MathUtils.clamp((progress - 0.55) / 0.45, 0, 1);
    this.heart.visible = squeeze < 0.92;
    this.heart.scale.setScalar(Math.max(0.001, 0.46 * (1 - progress * 0.35) * (1 - squeeze * 0.75)));
    this.heartMaterial.opacity = 0.92 + Math.sin(this.elapsed * 46) * 0.06 * progress;
    this.heart.rotation.y = this.elapsed * 5.2;
    this.particles.orbit.emitter.visible = this.particles.orbit.particleNum > 0;
    this.light.intensity = this.config.lightPeak * (0.4 + progress * 0.55);
    if (this.phaseElapsed + 1e-9 >= this.config.collapseDuration) this.triggerRupture();
  }

  private triggerRupture(): void {
    this.phase = "rupture";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.heart.visible = false;
    this.disc.visible = true;
    this.discInner.visible = true;
    this.disc.scale.setScalar(this.config.discScale * 0.16);
    this.discInner.scale.setScalar(this.config.discScale * 0.2);
    this.discMaterial.opacity = 0.9;
    this.discInnerMaterial.opacity = 0.4;
    for (const mesh of this.shardMeshes) mesh.visible = true;
    this.particles.fragments.emitter.position.set(this.center.x, this.center.y + 0.5, this.center.z);
    this.start(this.particles.fragments);
    this.particles.wave.emitter.position.set(this.center.x, this.center.y + 0.22, this.center.z);
    this.start(this.particles.wave);
    this.light.intensity = this.config.lightPeak;
  }

  private updateRupture(): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.ruptureDuration, 0, 1);
    const expand = 1 - Math.pow(1 - progress, 2.6);
    this.disc.scale.setScalar(this.config.discScale * (0.16 + expand * 0.84));
    this.discInner.scale.setScalar(this.config.discScale * (0.2 + expand * 0.72));
    this.discMaterial.opacity = 0.34 + 0.56 * Math.pow(1 - progress, 0.7);
    this.discInnerMaterial.opacity = 0.13 + 0.27 * Math.pow(1 - progress, 1.1);
    this.disc.rotation.y = this.elapsed * 1.4;
    this.discInner.rotation.y = -this.elapsed * 2.1;
    const spin = this.elapsed * this.config.orbitSpeed * 3.4;
    this.updateOrbit(this.config.orbitRadius * (0.16 + progress * 0.5), spin, 0.42 * (1 - progress * 0.9));
    for (let variant = 0; variant < this.shardMeshes.length; variant += 1) {
      const mesh = this.shardMeshes[variant]!;
      for (let slot = 0; slot < mesh.count; slot += 1) this.writeShard(variant, slot, progress);
      mesh.instanceMatrix.needsUpdate = true;
    }
    const due = Math.min(this.config.coreCount, Math.floor(this.phaseElapsed / this.config.coreInterval) + 1);
    while (this.coreStarted < due) {
      const core = this.particles.cores[this.coreStarted]!;
      const angle = ELEMENT_OFFSETS[this.coreStarted % ELEMENT_OFFSETS.length]! + this.elapsed * 2.4;
      const offset = this.config.radius * (0.18 + (this.coreStarted % 3) * 0.2);
      core.emitter.position.set(
        this.center.x + Math.cos(angle) * offset,
        this.center.y + 0.42 + (this.coreStarted % 2) * 0.4,
        this.center.z + Math.sin(angle) * offset,
      );
      this.start(core);
      this.coreStarted += 1;
    }
    this.light.intensity = this.config.lightPeak * (0.08 + 0.92 * Math.pow(1 - progress, 1.3));
    if (this.phaseElapsed + 1e-9 >= this.config.ruptureDuration) this.triggerResidual();
  }

  private triggerResidual(): void {
    this.phase = "residual";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.particles.fragments.endEmit();
    for (const core of this.orbitCores) core.visible = false;
    this.discMaterial.opacity = 0.43;
    this.discInnerMaterial.opacity = 0.15;
    this.particles.dust.emitter.position.set(this.center.x, this.center.y + 0.3, this.center.z);
    this.start(this.particles.dust);
  }

  private updateResidual(): void {
    const total = this.config.residualDuration + this.config.fadeDuration;
    const decay = MathUtils.clamp(this.phaseElapsed / total, 0, 1);
    const fade = Math.pow(1 - decay, 1.7);
    this.discMaterial.opacity = 0.43 * fade;
    this.discInnerMaterial.opacity = 0.15 * fade;
    this.disc.scale.setScalar(this.config.discScale * (1.02 + decay * 0.05));
    this.discInner.scale.setScalar(this.config.discScale * (0.94 + decay * 0.03));
    this.disc.rotation.y = this.elapsed * 0.7;
    this.discInner.rotation.y = -this.elapsed * 0.9;
    const drift = 1 + decay * 0.75;
    for (let variant = 0; variant < this.shardMeshes.length; variant += 1) {
      const mesh = this.shardMeshes[variant]!;
      for (let slot = 0; slot < mesh.count; slot += 1) this.writeShard(variant, slot, drift);
      mesh.instanceMatrix.needsUpdate = true;
      this.shardMaterials[variant]!.opacity = 0.94 * fade;
      mesh.visible = fade > 0.03;
    }
    this.light.intensity = this.config.lightPeak * 0.08 * fade;
    if (this.phaseElapsed + 1e-9 >= this.config.residualDuration + this.config.fadeDuration) this.dispose();
  }
}

export class ColapsoElementalVfxController {
  private readonly resources = new ColapsoElementalResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<ColapsoElementalCast>();
  private readonly config: ColapsoElementalVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<ColapsoElementalVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG, ...config };
    const fallback = DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG;
    this.config = {
      telegraphDuration: finiteOr(merged.telegraphDuration, fallback.telegraphDuration, 0.02),
      collapseDuration: finiteOr(merged.collapseDuration, fallback.collapseDuration, 0.02),
      ruptureDuration: finiteOr(merged.ruptureDuration, fallback.ruptureDuration, 0.02),
      residualDuration: finiteOr(merged.residualDuration, fallback.residualDuration, 0.1),
      fadeDuration: finiteOr(merged.fadeDuration, fallback.fadeDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, fallback.maxConcurrentCasts, 1)),
      radius: finiteOr(merged.radius, fallback.radius, 0.5),
      orbitRadius: finiteOr(merged.orbitRadius, fallback.orbitRadius, 0.1),
      orbitCount: Math.floor(finiteOr(merged.orbitCount, fallback.orbitCount, 1)),
      orbitSpeed: finiteOr(merged.orbitSpeed, fallback.orbitSpeed, 0),
      emberEmission: finiteOr(merged.emberEmission, fallback.emberEmission, 0),
      fragmentCount: Math.floor(finiteOr(merged.fragmentCount, fallback.fragmentCount, 0)),
      fragmentSpeed: finiteOr(merged.fragmentSpeed, fallback.fragmentSpeed, 0.2),
      waveEmission: finiteOr(merged.waveEmission, fallback.waveEmission, 0),
      waveCount: Math.floor(finiteOr(merged.waveCount, fallback.waveCount, 0)),
      dustEmission: finiteOr(merged.dustEmission, fallback.dustEmission, 0),
      dustCount: Math.floor(finiteOr(merged.dustCount, fallback.dustCount, 0)),
      coreCount: Math.floor(finiteOr(merged.coreCount, fallback.coreCount, 1)),
      coreSize: finiteOr(merged.coreSize, fallback.coreSize, 0.1),
      coreInterval: finiteOr(merged.coreInterval, fallback.coreInterval, 0.02),
      shardCount: Math.floor(finiteOr(merged.shardCount, fallback.shardCount, 4)),
      shardSpeed: finiteOr(merged.shardSpeed, fallback.shardSpeed, 0.2),
      shardLift: finiteOr(merged.shardLift, fallback.shardLift, 0),
      discScale: finiteOr(merged.discScale, fallback.discScale, 0.1),
      lightPeak: finiteOr(merged.lightPeak, fallback.lightPeak, 0),
    };
    this.castRoot.name = "colapso-elemental-vfx-root";
    this.batchedRenderer.name = "colapso-elemental-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castColapsoElemental(center: Vector3): void {
    if (this.disposed) throw new Error("ColapsoElementalVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as ColapsoElementalCast | undefined;
      oldest?.dispose();
    }
    const ground = center.clone();
    ground.y = Math.max(center.y, 0);
    const cast = new ColapsoElementalCast(
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

  getPhase(): ColapsoElementalPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    const order: ColapsoElementalPhase[] = ["telegraph", "collapse", "rupture", "residual"];
    let phase: ColapsoElementalPhase | "idle" = "idle";
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

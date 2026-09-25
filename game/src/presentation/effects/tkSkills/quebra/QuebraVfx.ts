import {
  AdditiveBlending,
  DoubleSide,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PointLight,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TetrahedronGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createQuebraImpactSystems,
  createQuebraParticleMaterials,
  disposeQuebraParticleMaterials,
  type QuebraImpactSystems,
  type QuebraParticleMaterials,
} from "./QuebraParticleSystems";
import {
  createQuebraTextures,
  disposeQuebraTextures,
  type QuebraTextureSet,
} from "./QuebraTextures";

export interface QuebraVfxConfig {
  impactDuration: number;
  cleanupDelay: number;
  maxConcurrentCasts: number;
  shardCount: number;
  shardMinSpeed: number;
  shardMaxSpeed: number;
  sparkEmission: number;
  moteEmission: number;
  targetHeight: number;
}

export const DEFAULT_QUEBRA_VFX_CONFIG: QuebraVfxConfig = {
  impactDuration: 0.1,
  cleanupDelay: 0.5,
  maxConcurrentCasts: 3,
  shardCount: 16,
  shardMinSpeed: 2.6,
  shardMaxSpeed: 6.4,
  sparkEmission: 56,
  moteEmission: 20,
  targetHeight: 1.05,
};

export type QuebraCastPhase = "impact";

interface QuebraSharedResources {
  textures: QuebraTextureSet;
  particleMaterials: QuebraParticleMaterials;
  shardGeometry: TetrahedronGeometry;
  shockGeometry: RingGeometry;
  shockMaterial: MeshBasicMaterial;
  flashGeometry: SphereGeometry;
  flashMaterial: MeshBasicMaterial;
}

function createSharedResources(
  textures: QuebraTextureSet,
): QuebraSharedResources {
  const particleMaterials = createQuebraParticleMaterials(textures);
  const shardGeometry = new TetrahedronGeometry(0.15);
  shardGeometry.scale(1.35, 0.6, 0.9);
  const shockGeometry = new RingGeometry(0.26, 0.4, 48);
  const shockMaterial = new MeshBasicMaterial({
    color: 0xe8c547,
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
    color: 0xfff3d0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  return {
    textures,
    particleMaterials,
    shardGeometry,
    shockGeometry,
    shockMaterial,
    flashGeometry,
    flashMaterial,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

interface ShardState {
  position: Vector3;
  velocity: Vector3;
  rotation: Vector3;
  angularVelocity: Vector3;
  scale: number;
}

class QuebraCast {
  private readonly shards: InstancedMesh;
  private readonly shardStates: ShardState[] = [];
  private readonly impactSystems: QuebraImpactSystems;
  private readonly systems: ParticleSystem[];
  private readonly dummy = new Object3D();
  private readonly shock: Mesh;
  private readonly shockMaterial: MeshBasicMaterial;
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly light: PointLight;
  private elapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: QuebraSharedResources,
    private readonly config: QuebraVfxConfig,
    target: Vector3,
    private readonly onDispose: (cast: QuebraCast) => void,
  ) {
    this.impactSystems = createQuebraImpactSystems(shared.particleMaterials, config);
    this.systems = this.impactSystems.all;
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.shards = new InstancedMesh(shared.shardGeometry, shared.particleMaterials.mote, config.shardCount);
    this.shards.name = "quebra-shards";
    this.castRoot.add(this.shards);
    this.seedShards(target);
    this.writeShardMatrices();

    this.shockMaterial = shared.shockMaterial.clone();
    this.shock = new Mesh(shared.shockGeometry, this.shockMaterial);
    this.shock.name = "quebra-shock";
    this.shock.rotation.x = -Math.PI / 2;
    this.shock.renderOrder = 11;
    this.castRoot.add(this.shock);

    this.flash = new Mesh(shared.flashGeometry, shared.flashMaterial.clone());
    this.flash.name = "quebra-flash";
    this.castRoot.add(this.flash);

    this.light = new PointLight(0xffe9b0, 0, 6.5, 2);
    this.castRoot.add(this.light);

    for (const system of this.systems) {
      system.emitter.position.copy(target);
      system.emitter.quaternion.identity();
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.shock.position.copy(target);
    this.flash.position.copy(target);
    this.light.position.copy(target);
    this.light.intensity = 5.4;
    this.shock.scale.setScalar(0.2);
    this.shockMaterial.opacity = 0.4;
    this.flash.scale.setScalar(0.16);
    this.flash.material.opacity = 1;
  }

  getPhase(): QuebraCastPhase {
    return "impact";
  }

  getTarget(): Vector3 {
    return this.impactSystems.sparks.emitter.position;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getShardSnapshot() {
    return this.shardStates.map((shard) => ({
      position: shard.position.toArray(),
      rotation: shard.rotation.toArray(),
      scale: shard.scale,
    }));
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
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
    const decay = MathUtils.clamp(1 - this.elapsed / this.config.cleanupDelay, 0, 1);
    for (const shard of this.shardStates) {
      shard.velocity.y -= 9.8 * deltaTime;
      shard.position.addScaledVector(shard.velocity, deltaTime);
      if (shard.position.y < 0.03) {
        shard.position.y = 0.03;
        shard.velocity.multiplyScalar(0.42);
        shard.velocity.y = Math.abs(shard.velocity.y) * 0.3;
      }
      shard.rotation.addScaledVector(shard.angularVelocity, deltaTime);
      shard.scale = decay;
    }
    this.writeShardMatrices();
    const flashProgress = MathUtils.clamp(this.elapsed / this.config.impactDuration, 0, 1);
    const flashFade = Math.pow(1 - flashProgress, 2);
    this.flash.scale.setScalar(0.16 + flashProgress * 0.7);
    this.flash.material.opacity = flashFade;
    this.flash.visible = flashProgress < 1;
    const shockProgress = MathUtils.clamp(this.elapsed / this.config.impactDuration, 0, 1);
    this.shock.scale.setScalar(0.2 + shockProgress * 2.4);
    this.shockMaterial.opacity = flashFade * 0.4;
    this.light.intensity = 5.4 * flashFade;
    if (this.elapsed >= this.config.cleanupDelay) this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.shards, this.shock, this.flash, this.light);
    this.shards.dispose();
    this.shockMaterial.dispose();
    this.flash.material.dispose();
    this.onDispose(this);
  }

  private seedShards(target: Vector3): void {
    for (let index = 0; index < this.config.shardCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.42;
      const speed = MathUtils.lerp(
        this.config.shardMinSpeed,
        this.config.shardMaxSpeed,
        Math.random(),
      );
      const direction = new Vector3(
        Math.cos(angle) * Math.cos(elevation),
        Math.sin(elevation) + 0.35,
        Math.sin(angle) * Math.cos(elevation),
      ).normalize();
      this.shardStates.push({
        position: target.clone().add(new Vector3(
          (Math.random() - 0.5) * 0.24,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.24,
        )),
        velocity: direction.multiplyScalar(speed),
        rotation: new Vector3(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
        angularVelocity: new Vector3(
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 24,
        ),
        scale: 1,
      });
    }
  }

  private writeShardMatrices(): void {
    for (let index = 0; index < this.shardStates.length; index += 1) {
      const shard = this.shardStates[index];
      this.dummy.position.copy(shard.position);
      this.dummy.rotation.set(shard.rotation.x, shard.rotation.y, shard.rotation.z);
      this.dummy.scale.setScalar(Math.max(shard.scale, 0.001));
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(index, this.dummy.matrix);
    }
    this.shards.instanceMatrix.needsUpdate = true;
  }
}

export class QuebraVfxController {
  private readonly textures: QuebraTextureSet;
  private readonly shared: QuebraSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<QuebraCast>();
  private readonly config: QuebraVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<QuebraVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_QUEBRA_VFX_CONFIG, ...config };
    this.config = {
      impactDuration: finiteOr(merged.impactDuration, DEFAULT_QUEBRA_VFX_CONFIG.impactDuration, 0.01),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_QUEBRA_VFX_CONFIG.cleanupDelay, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_QUEBRA_VFX_CONFIG.maxConcurrentCasts, 1)),
      shardCount: Math.floor(finiteOr(merged.shardCount, DEFAULT_QUEBRA_VFX_CONFIG.shardCount, 1)),
      shardMinSpeed: finiteOr(merged.shardMinSpeed, DEFAULT_QUEBRA_VFX_CONFIG.shardMinSpeed, 0.1),
      shardMaxSpeed: finiteOr(merged.shardMaxSpeed, DEFAULT_QUEBRA_VFX_CONFIG.shardMaxSpeed, 0.2),
      sparkEmission: finiteOr(merged.sparkEmission, DEFAULT_QUEBRA_VFX_CONFIG.sparkEmission, 0),
      moteEmission: finiteOr(merged.moteEmission, DEFAULT_QUEBRA_VFX_CONFIG.moteEmission, 0),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_QUEBRA_VFX_CONFIG.targetHeight, 0),
    };
    this.textures = createQuebraTextures();
    this.shared = createSharedResources(this.textures);
    this.castRoot.name = "quebra-vfx-root";
    this.batchedRenderer.name = "quebra-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castQuebra(target: Vector3): void {
    if (this.disposed) throw new Error("QuebraVfxController descartado");
    if (!isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as QuebraCast | undefined;
      oldestCast?.dispose();
    }
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new QuebraCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      impactTarget,
      (finishedCast) => this.casts.delete(finishedCast),
    );
    this.casts.add(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed) return;
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

  getPhase(): QuebraCastPhase | "idle" {
    return this.casts.size > 0 ? "impact" : "idle";
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap((cast) => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map((cast) => ({
      phase: cast.getPhase(),
      elapsed: cast.getElapsed(),
      target: cast.getTarget().toArray(),
      shards: cast.getShardSnapshot(),
    }));
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
    this.shared.shardGeometry.dispose();
    this.shared.shockGeometry.dispose();
    this.shared.shockMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterial.dispose();
    disposeQuebraParticleMaterials(this.shared.particleMaterials);
    disposeQuebraTextures(this.textures);
    this.castRoot.clear();
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
}

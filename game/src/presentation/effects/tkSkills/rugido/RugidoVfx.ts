import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createRugidoEmissionSystems,
  createRugidoParticleMaterials,
  disposeRugidoParticleMaterials,
  type RugidoEmissionSystems,
  type RugidoParticleMaterials,
} from "./RugidoParticleSystems";
import {
  createRugidoTextures,
  disposeRugidoTextures,
  type RugidoTextureSet,
} from "./RugidoTextures";
import type { TkLightPool } from "../../TkLightPool";
import { createTaperedArcGeometry } from "../../vfxKit/stylizedGeometry";

export interface RugidoVfxConfig {
  waveDuration: number;
  waveDelay: number;
  flashDuration: number;
  cleanupDelay: number;
  maxConcurrentCasts: number;
  streakEmission: number;
  dustEmission: number;
  emberCount: number;
  chestHeight: number;
  waveRadius: number;
  waveRadiusSecondary: number;
}

export const DEFAULT_RUGIDO_VFX_CONFIG: RugidoVfxConfig = {
  waveDuration: 0.25,
  waveDelay: 0.09,
  flashDuration: 0.16,
  cleanupDelay: 0.95,
  maxConcurrentCasts: 3,
  streakEmission: 96,
  dustEmission: 48,
  emberCount: 26,
  chestHeight: 1.25,
  waveRadius: 3.8,
  waveRadiusSecondary: 2.75,
};

export type RugidoCastPhase = "roar";

const SHADOW_CORE = new Color(0x533976);
const SHADOW_EDGE = new Color(0xc49be0);

interface RugidoSharedResources {
  textures: RugidoTextureSet;
  particleMaterials: RugidoParticleMaterials;
  ringGeometry: RingGeometry;
  ringSecondaryGeometry: RingGeometry;
  ringMaterial: MeshBasicMaterial;
  ringSecondaryMaterial: MeshBasicMaterial;
  shellGeometry: SphereGeometry;
  shellMaterial: MeshBasicMaterial;
  flashGeometry: SphereGeometry;
  flashMaterial: MeshBasicMaterial;
  clawGeometry: BufferGeometry;
  clawMaterial: MeshStandardMaterial;
}

function createSharedResources(
  textures: RugidoTextureSet,
  particleMaterials: RugidoParticleMaterials,
): RugidoSharedResources {
  const ringGeometry = new RingGeometry(0.3, 0.46, 56);
  const ringSecondaryGeometry = new RingGeometry(0.24, 0.52, 56);
  const ringMaterial = new MeshBasicMaterial({
    color: 0x9c72bc,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const ringSecondaryMaterial = new MeshBasicMaterial({
    color: 0x644789,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const shellGeometry = new SphereGeometry(1, 24, 16);
  const shellMaterial = new MeshBasicMaterial({
    color: 0x613d85,
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
    map: textures.ember,
    color: 0x9e6bcc,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return {
    textures,
    particleMaterials,
    ringGeometry,
    ringSecondaryGeometry,
    ringMaterial,
    ringSecondaryMaterial,
    shellGeometry,
    shellMaterial,
    flashGeometry,
    flashMaterial,
    clawGeometry: createTaperedArcGeometry(1, 0.22, Math.PI * 0.86, 0.06),
    clawMaterial: new MeshStandardMaterial({
      color: 0x58356f,
      emissive: 0x9d63bc,
      emissiveIntensity: 0.42,
      roughness: 0.85,
      metalness: 0,
      flatShading: true,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    }),
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

class RugidoCast {
  private readonly emission: RugidoEmissionSystems;
  private readonly systems: ParticleSystem[];
  private readonly ring: Mesh;
  private readonly ringMaterial: MeshBasicMaterial;
  private readonly ringSecondary: Mesh;
  private readonly ringSecondaryMaterial: MeshBasicMaterial;
  private readonly shell: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly claws: InstancedMesh<BufferGeometry, MeshStandardMaterial>;
  private readonly clawPose = new Object3D();
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private elapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: RugidoSharedResources,
    private readonly config: RugidoVfxConfig,
    origin: Vector3,
    private readonly onDispose: (cast: RugidoCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.emission = createRugidoEmissionSystems(shared.particleMaterials, config);
    this.systems = this.emission.all;
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.ringMaterial = shared.ringMaterial.clone();
    this.ring = new Mesh(shared.ringGeometry, this.ringMaterial);
    this.ring.name = "rugido-ring-1";
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 11;
    this.castRoot.add(this.ring);

    this.ringSecondaryMaterial = shared.ringSecondaryMaterial.clone();
    this.ringSecondary = new Mesh(shared.ringSecondaryGeometry, this.ringSecondaryMaterial);
    this.ringSecondary.name = "rugido-ring-2";
    this.ringSecondary.rotation.x = -Math.PI / 2;
    this.ringSecondary.renderOrder = 10;
    this.ringSecondary.visible = false;
    this.castRoot.add(this.ringSecondary);

    this.shell = new Mesh(shared.shellGeometry, shared.shellMaterial.clone());
    this.shell.name = "rugido-shell";
    this.castRoot.add(this.shell);

    this.flash = new Mesh(shared.flashGeometry, shared.flashMaterial.clone());
    this.flash.name = "rugido-flash";
    this.castRoot.add(this.flash);
    this.claws = new InstancedMesh(shared.clawGeometry, shared.clawMaterial.clone(), 3);
    this.claws.name = "tk-fear-shadow-talons";
    this.claws.position.copy(origin);
    this.claws.instanceMatrix.setUsage(DynamicDrawUsage);
    this.claws.frustumCulled = false;
    this.claws.material.opacity = 0;
    this.castRoot.add(this.claws);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xa56cc9, 9);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xa56cc9, 0, 9, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.name = "rugido-light";
      this.castRoot.add(this.light);
      this.light.position.copy(origin);
      this.light.intensity = 2.8;
    }

    for (const system of this.systems) {
      system.emitter.position.copy(origin);
      system.emitter.quaternion.identity();
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.emission.streaks.emitter.rotation.x = -Math.PI / 2;
    this.emission.streaks.emitter.position.copy(origin);
    this.emission.dust.emitter.position.set(origin.x, 0.06, origin.z);

    this.ring.position.copy(origin);
    this.ringSecondary.position.copy(origin);
    this.shell.position.copy(origin);
    this.flash.position.copy(origin);

    this.ring.scale.setScalar(0.35);
    this.ringMaterial.opacity = 0.9;
    this.ringSecondary.scale.setScalar(0.3);
    this.shell.scale.setScalar(0.35);
    this.shell.material.opacity = 0.2;
    this.flash.scale.setScalar(0.32);
    this.flash.material.opacity = 1;
    this.flash.material.color.copy(SHADOW_CORE);
  }

  getPhase(): RugidoCastPhase {
    return "roar";
  }

  getOrigin(): Vector3 {
    return this.emission.streaks.emitter.position;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getState() {
    return {
      phase: this.getPhase(),
      elapsed: this.elapsed,
      origin: this.getOrigin().toArray(),
      ringScale: this.ring.scale.x,
      ringOpacity: this.ringMaterial.opacity,
      ringSecondaryVisible: this.ringSecondary.visible,
      ringSecondaryScale: this.ringSecondary.scale.x,
      shellScale: this.shell.scale.x,
      flashOpacity: this.flash.material.opacity,
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
    for (const system of this.systems) {
      system.emitter.updateWorldMatrix(true, false);
    }
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;
    const clawProgress = MathUtils.clamp(this.elapsed / 0.58, 0, 1);
    const clawReveal = Math.min(1, clawProgress * 5);
    const clawFade = Math.pow(1 - clawProgress, 1.2);
    this.claws.material.opacity = clawReveal * clawFade * 0.88;
    for (let index = 0; index < 3; index++) {
      this.clawPose.position.set((index - 1) * 0.48, 0.7 - clawProgress * 0.38, -0.3);
      this.clawPose.rotation.set(0.14, (index - 1) * 0.25, -Math.PI / 2 + (index - 1) * 0.28);
      this.clawPose.scale.set(0.85 + clawReveal * 0.22, 0.65 + clawReveal * 0.35, 1);
      this.clawPose.updateMatrix();
      this.claws.setMatrixAt(index, this.clawPose.matrix);
    }
    this.claws.instanceMatrix.needsUpdate = true;
    this.claws.visible = clawProgress < 1;
    const waveProgress = MathUtils.clamp(this.elapsed / this.config.waveDuration, 0, 1);
    const waveFade = Math.pow(1 - waveProgress, 1.6);
    this.ring.scale.setScalar(MathUtils.lerp(0.35, this.config.waveRadius, waveProgress));
    this.ringMaterial.opacity = waveFade * 0.9;
    this.ring.visible = waveProgress < 1;

    const secondaryProgress = MathUtils.clamp(
      (this.elapsed - this.config.waveDelay) / (this.config.waveDuration * 1.2),
      0,
      1,
    );
    this.ringSecondary.visible = secondaryProgress > 0 && secondaryProgress < 1;
    if (this.ringSecondary.visible) {
      const secondaryFade = Math.pow(1 - secondaryProgress, 1.6);
      this.ringSecondary.scale.setScalar(
        MathUtils.lerp(0.3, this.config.waveRadiusSecondary, secondaryProgress),
      );
      this.ringSecondaryMaterial.opacity = secondaryFade * 0.7;
    }

    const shellProgress = MathUtils.clamp(this.elapsed / 0.28, 0, 1);
    this.shell.scale.setScalar(MathUtils.lerp(0.35, 3, shellProgress));
    this.shell.material.opacity = Math.pow(1 - shellProgress, 2) * 0.07;
    this.shell.visible = shellProgress < 1;

    const flashProgress = MathUtils.clamp(this.elapsed / this.config.flashDuration, 0, 1);
    this.flash.scale.setScalar(0.32 + flashProgress * 0.8);
    this.flash.material.opacity = Math.pow(1 - flashProgress, 2);
    this.flash.material.color.lerpColors(SHADOW_CORE, SHADOW_EDGE, flashProgress);
    this.flash.visible = flashProgress < 1;

    const lightProgress = MathUtils.clamp(this.elapsed / 0.4, 0, 1);
    if (this.light) this.light.intensity = 2.8 * Math.pow(1 - lightProgress, 1.5);

    if (this.elapsed >= this.config.cleanupDelay) this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(this.ring, this.ringSecondary, this.shell, this.flash, this.claws);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.ringMaterial.dispose();
    this.ringSecondaryMaterial.dispose();
    this.shell.material.dispose();
    this.flash.material.dispose();
    this.claws.material.dispose();
    this.claws.dispose();
    this.onDispose(this);
  }
}

export class RugidoVfxController {
  private readonly textures: RugidoTextureSet;
  private readonly shared: RugidoSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<RugidoCast>();
  private readonly config: RugidoVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<RugidoVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_RUGIDO_VFX_CONFIG, ...config };
    this.config = {
      waveDuration: finiteOr(merged.waveDuration, DEFAULT_RUGIDO_VFX_CONFIG.waveDuration, 0.05),
      waveDelay: finiteOr(merged.waveDelay, DEFAULT_RUGIDO_VFX_CONFIG.waveDelay, 0),
      flashDuration: finiteOr(merged.flashDuration, DEFAULT_RUGIDO_VFX_CONFIG.flashDuration, 0.01),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_RUGIDO_VFX_CONFIG.cleanupDelay, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_RUGIDO_VFX_CONFIG.maxConcurrentCasts, 1)),
      streakEmission: finiteOr(merged.streakEmission, DEFAULT_RUGIDO_VFX_CONFIG.streakEmission, 0),
      dustEmission: finiteOr(merged.dustEmission, DEFAULT_RUGIDO_VFX_CONFIG.dustEmission, 0),
      emberCount: Math.floor(finiteOr(merged.emberCount, DEFAULT_RUGIDO_VFX_CONFIG.emberCount, 0)),
      chestHeight: finiteOr(merged.chestHeight, DEFAULT_RUGIDO_VFX_CONFIG.chestHeight, 0.1),
      waveRadius: finiteOr(merged.waveRadius, DEFAULT_RUGIDO_VFX_CONFIG.waveRadius, 0.5),
      waveRadiusSecondary: finiteOr(merged.waveRadiusSecondary, DEFAULT_RUGIDO_VFX_CONFIG.waveRadiusSecondary, 0.5),
    };
    this.textures = createRugidoTextures();
    this.shared = createSharedResources(this.textures, createRugidoParticleMaterials(this.textures));
    this.castRoot.name = "rugido-vfx-root";
    this.batchedRenderer.name = "rugido-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castRugido(origin: Vector3): void {
    if (this.disposed) throw new Error("RugidoVfxController descartado");
    if (!isFiniteVector3(origin)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as RugidoCast | undefined;
      oldestCast?.dispose();
    }
    const castOrigin = origin.clone();
    castOrigin.y = Math.max(origin.y, this.config.chestHeight * 0.5);
    const cast = new RugidoCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      castOrigin,
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

  getPhase(): RugidoCastPhase | "idle" {
    return this.casts.size > 0 ? "roar" : "idle";
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap((cast) => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map((cast) => cast.getState());
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
    this.shared.ringGeometry.dispose();
    this.shared.ringSecondaryGeometry.dispose();
    this.shared.ringMaterial.dispose();
    this.shared.ringSecondaryMaterial.dispose();
    this.shared.shellGeometry.dispose();
    this.shared.shellMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterial.dispose();
    this.shared.clawGeometry.dispose();
    this.shared.clawMaterial.dispose();
    disposeRugidoParticleMaterials(this.shared.particleMaterials);
    disposeRugidoTextures(this.textures);
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

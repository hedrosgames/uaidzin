import {
  AdditiveBlending,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  type Texture,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createPurificarAscendSystems,
  createPurificarParticleMaterials,
  disposePurificarParticleMaterials,
  type PurificarAscendSystems,
  type PurificarParticleMaterials,
} from "./PurificarParticleSystems";
import {
  createPurificarTextures,
  disposePurificarTextures,
  type PurificarTextureSet,
} from "./PurificarTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface PurificarVfxConfig {
  convergeDuration: number;
  bloomDuration: number;
  ascendDuration: number;
  cleanupDelay: number;
  maxConcurrentCasts: number;
  moteCount: number;
  convergeRadius: number;
  convergeHeight: number;
  spinSpeed: number;
  targetHeight: number;
}

export const DEFAULT_PURIFICAR_VFX_CONFIG: PurificarVfxConfig = {
  convergeDuration: 0.3,
  bloomDuration: 0.15,
  ascendDuration: 0.85,
  cleanupDelay: 1.3,
  maxConcurrentCasts: 3,
  moteCount: 42,
  convergeRadius: 1.5,
  convergeHeight: 2.1,
  spinSpeed: 5.6,
  targetHeight: 1.05,
};

export type PurificarCastPhase = "converge" | "bloom" | "ascend";

interface PurificarSharedResources {
  textures: PurificarTextureSet;
  particleMaterials: PurificarParticleMaterials;
  moteMaterial: SpriteMaterial;
  haloMaterial: SpriteMaterial;
  flashGeometry: SphereGeometry;
  flashMaterial: MeshBasicMaterial;
  ringGeometry: RingGeometry;
  ringMaterial: MeshBasicMaterial;
}

function createSpriteMaterial(map: Texture, opacity: number): SpriteMaterial {
  return new SpriteMaterial({
    map,
    color: 0xffffff,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

function createSharedResources(textures: PurificarTextureSet): PurificarSharedResources {
  const particleMaterials = createPurificarParticleMaterials(textures);
  const flashGeometry = new SphereGeometry(1, 16, 12);
  const flashMaterial = new MeshBasicMaterial({
    color: 0xfff6dc,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const ringGeometry = new RingGeometry(0.86, 1.0, 64);
  const ringMaterial = new MeshBasicMaterial({
    color: 0xe8cf8a,
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
    moteMaterial: createSpriteMaterial(textures.mote, 1),
    haloMaterial: createSpriteMaterial(textures.halo, 1),
    flashGeometry,
    flashMaterial,
    ringGeometry,
    ringMaterial,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

interface MoteState {
  angle: number;
  radius: number;
  height: number;
  spin: number;
  riseSpeed: number;
  outwardSpeed: number;
  size: number;
  halo: boolean;
  opacity: number;
}

class PurificarCast {
  private readonly motes: Group;
  private readonly moteSprites: Sprite[] = [];
  private readonly moteMaterials: SpriteMaterial[] = [];
  private readonly moteStates: MoteState[] = [];
  private readonly ascendSystems: PurificarAscendSystems;
  private readonly systems: ParticleSystem[];
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly ring: Mesh;
  private readonly ringMaterial: MeshBasicMaterial;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly textures: PurificarTextureSet;
  private phase: PurificarCastPhase = "converge";
  private elapsed = 0;
  private totalTime = 0;
  private ascendElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: PurificarSharedResources,
    private readonly config: PurificarVfxConfig,
    private readonly target: Vector3,
    castSeed: number,
    private readonly onDispose: (cast: PurificarCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.textures = shared.textures;
    this.ascendSystems = createPurificarAscendSystems(shared.particleMaterials);
    this.systems = this.ascendSystems.all;
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.motes = new Group();
    this.motes.name = "purificar-motes";
    this.castRoot.add(this.motes);
    this.seedMotes(castSeed);

    this.flash = new Mesh(shared.flashGeometry, shared.flashMaterial.clone());
    this.flash.name = "purificar-flash";
    this.flash.visible = false;
    this.castRoot.add(this.flash);

    this.ringMaterial = shared.ringMaterial.clone();
    this.ring = new Mesh(shared.ringGeometry, this.ringMaterial);
    this.ring.name = "purificar-ring";
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.ring.renderOrder = 10;
    this.castRoot.add(this.ring);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xf5e3ac, 7);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xf5e3ac, 0, 7, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.castRoot.add(this.light);
      this.light.position.copy(target);
    }

    this.flash.position.copy(target);
    this.ring.position.set(target.x, target.y, target.z);
  }

  getPhase(): PurificarCastPhase {
    return this.phase;
  }

  getTarget(): Vector3 {
    return this.target;
  }

  getElapsed(): number {
    return this.totalTime;
  }

  getMoteSnapshot() {
    return this.moteSprites.map((sprite) => sprite.position.toArray());
  }

  getRingState() {
    return {
      position: this.ring.position.toArray(),
      scale: this.ring.scale.x,
      visible: this.ring.visible,
      opacity: this.ringMaterial.opacity,
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
    this.totalTime += deltaTime;
    if (this.phase === "converge") this.updateConverge(deltaTime);
    else if (this.phase === "bloom") this.updateBloom(deltaTime);
    else this.updateAscend(deltaTime);
    if (this.totalTime >= this.config.cleanupDelay) this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.motes, this.flash, this.ring);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    for (const material of this.moteMaterials) material.dispose();
    this.motes.clear();
    this.flash.material.dispose();
    this.ringMaterial.dispose();
    this.onDispose(this);
  }

  private seedMotes(castSeed: number): void {
    const random = mulberry32(0x9e3779b9 ^ Math.imul(castSeed, 0x85ebca6b));
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < this.config.moteCount; index += 1) {
      const halo = index % 4 === 3;
      const material = createSpriteMaterial(
        halo ? this.textures.halo : this.textures.mote,
        0,
      );
      const sprite = new Sprite(material);
      const size = halo
        ? 0.42 + random() * 0.4
        : 0.12 + random() * 0.22;
      sprite.scale.setScalar(size);
      sprite.renderOrder = halo ? 7 : 9;
      this.moteSprites.push(sprite);
      this.moteMaterials.push(material);
      this.motes.add(sprite);
      this.moteStates.push({
        angle: goldenAngle * index + random() * 0.35,
        radius: this.config.convergeRadius * (0.68 + random() * 0.32),
        height: this.config.convergeHeight * (0.08 + random() * 0.92),
        spin: this.config.spinSpeed * (0.8 + random() * 0.45),
        riseSpeed: 1.5 + random() * 1.5,
        outwardSpeed: 0.45 + random() * 0.65,
        size,
        halo,
        opacity: 0,
      });
      sprite.position.set(
        this.target.x + Math.cos(this.moteStates[index].angle) * this.moteStates[index].radius,
        this.target.y + this.moteStates[index].height,
        this.target.z + Math.sin(this.moteStates[index].angle) * this.moteStates[index].radius,
      );
    }
  }

  private updateConverge(_deltaTime: number): void {
    const progress = MathUtils.clamp(this.elapsed / this.config.convergeDuration, 0, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    this.applySpiral(ease, ease, 0.55 + progress * 0.45);
    if (this.light) this.light.intensity = 0.4 + ease * 2.2;
    if (progress >= 1) {
      this.phase = "bloom";
      this.elapsed = 0;
    }
  }

  private updateBloom(_deltaTime: number): void {
    const progress = MathUtils.clamp(this.elapsed / this.config.bloomDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.applyBloomCluster(progress);
    this.flash.visible = true;
    this.flash.scale.setScalar(0.08 + progress * 0.62);
    this.flash.material.opacity = 0.92 * fade;
    if (this.light) this.light.intensity = 2.6 + 2.8 * (1 - progress) + progress * 0.6;
    if (progress >= 1) {
      this.phase = "ascend";
      this.elapsed = 0;
      this.ascendElapsed = 0;
      this.flash.visible = false;
      this.triggerAscend();
    }
  }

  private updateAscend(deltaTime: number): void {
    this.ascendElapsed += deltaTime;
    const progress = MathUtils.clamp(this.ascendElapsed / this.config.ascendDuration, 0, 1);
    for (let index = 0; index < this.moteStates.length; index += 1) {
      const state = this.moteStates[index];
      const sprite = this.moteSprites[index];
      state.angle += state.spin * 0.35 * deltaTime;
      state.radius += state.outwardSpeed * deltaTime;
      state.height += state.riseSpeed * deltaTime;
      sprite.position.set(
        this.target.x + Math.cos(state.angle) * state.radius,
        this.target.y + state.height,
        this.target.z + Math.sin(state.angle) * state.radius,
      );
      state.opacity = Math.pow(1 - progress, 1.4) * (state.halo ? 0.4 : 0.85);
      sprite.scale.setScalar(state.size * (1 + progress * 1.3));
    }
    const ringProgress = MathUtils.clamp(this.ascendElapsed / (this.config.ascendDuration * 0.82), 0, 1);
    this.ring.visible = ringProgress < 1;
    this.ring.position.set(
      this.target.x,
      this.target.y + 0.25 + ringProgress * 1.9,
      this.target.z,
    );
    this.ring.scale.setScalar(0.3 + ringProgress * 2.2);
    this.ringMaterial.opacity = Math.pow(1 - ringProgress, 1.6) * 0.5;
    if (this.light) this.light.intensity = 3.2 * Math.pow(1 - progress, 1.8);
  }

  private applySpiral(radiusEase: number, heightEase: number, opacityGain: number): void {
    for (let index = 0; index < this.moteStates.length; index += 1) {
      const state = this.moteStates[index];
      const sprite = this.moteSprites[index];
      state.angle += state.spin * (1 / 60);
      const radius = state.radius * (1 - radiusEase);
      const height = state.height * (1 - heightEase) + 0.04 * heightEase;
      sprite.position.set(
        this.target.x + Math.cos(state.angle) * radius,
        this.target.y + height,
        this.target.z + Math.sin(state.angle) * radius,
      );
      state.opacity = opacityGain * (state.halo ? 0.4 : 0.85);
    }
  }

  private applyBloomCluster(progress: number): void {
    const spread = 0.16 * (1 - progress) + 0.05;
    for (let index = 0; index < this.moteStates.length; index += 1) {
      const state = this.moteStates[index];
      const sprite = this.moteSprites[index];
      state.angle += state.spin * 0.5 * (1 / 60);
      const radius = spread * (0.3 + (index % 5) / 5);
      const height = 0.02 + (index % 7) / 7 * spread * 2.2;
      sprite.position.set(
        this.target.x + Math.cos(state.angle) * radius,
        this.target.y + height,
        this.target.z + Math.sin(state.angle) * radius,
      );
      state.opacity = (state.halo ? 0.5 : 0.95) * (1 - progress * 0.25);
    }
  }

  private triggerAscend(): void {
    for (const system of this.systems) {
      system.emitter.position.copy(this.target);
      system.emitter.quaternion.identity();
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
  }
}

export class PurificarVfxController {
  private readonly textures: PurificarTextureSet;
  private readonly shared: PurificarSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<PurificarCast>();
  private readonly config: PurificarVfxConfig;
  private accumulator = 0;
  private castSequence = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<PurificarVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_PURIFICAR_VFX_CONFIG, ...config };
    this.config = {
      convergeDuration: finiteOr(merged.convergeDuration, DEFAULT_PURIFICAR_VFX_CONFIG.convergeDuration, 0.05),
      bloomDuration: finiteOr(merged.bloomDuration, DEFAULT_PURIFICAR_VFX_CONFIG.bloomDuration, 0.02),
      ascendDuration: finiteOr(merged.ascendDuration, DEFAULT_PURIFICAR_VFX_CONFIG.ascendDuration, 0.1),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_PURIFICAR_VFX_CONFIG.cleanupDelay, 0.2),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_PURIFICAR_VFX_CONFIG.maxConcurrentCasts, 1)),
      moteCount: Math.floor(finiteOr(merged.moteCount, DEFAULT_PURIFICAR_VFX_CONFIG.moteCount, 4)),
      convergeRadius: finiteOr(merged.convergeRadius, DEFAULT_PURIFICAR_VFX_CONFIG.convergeRadius, 0.2),
      convergeHeight: finiteOr(merged.convergeHeight, DEFAULT_PURIFICAR_VFX_CONFIG.convergeHeight, 0.2),
      spinSpeed: finiteOr(merged.spinSpeed, DEFAULT_PURIFICAR_VFX_CONFIG.spinSpeed, 0.5),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_PURIFICAR_VFX_CONFIG.targetHeight, 0),
    };
    this.textures = createPurificarTextures();
    this.shared = createSharedResources(this.textures);
    this.castRoot.name = "purificar-vfx-root";
    this.batchedRenderer.name = "purificar-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castPurificar(target: Vector3): void {
    if (this.disposed) throw new Error("PurificarVfxController descartado");
    if (!isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as PurificarCast | undefined;
      oldestCast?.dispose();
    }
    const castTarget = target.clone();
    castTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new PurificarCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      castTarget,
      this.castSequence,
      (finishedCast) => this.casts.delete(finishedCast),
      this.lightPool,
    );
    this.castSequence += 1;
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

  getPhase(): PurificarCastPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let lowest: PurificarCastPhase = "ascend";
    for (const cast of this.casts) {
      if (cast.getPhase() === "converge") return "converge";
      if (cast.getPhase() === "bloom") lowest = "bloom";
    }
    return lowest;
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap((cast) => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map((cast) => ({
      phase: cast.getPhase(),
      elapsed: cast.getElapsed(),
      target: cast.getTarget().toArray(),
      motes: cast.getMoteSnapshot(),
      ring: cast.getRingState(),
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
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterial.dispose();
    this.shared.ringGeometry.dispose();
    this.shared.ringMaterial.dispose();
    this.shared.moteMaterial.dispose();
    this.shared.haloMaterial.dispose();
    disposePurificarParticleMaterials(this.shared.particleMaterials);
    disposePurificarTextures(this.textures);
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

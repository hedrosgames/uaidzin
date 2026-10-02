import {
  BufferGeometry,
  Color,
  DodecahedronGeometry,
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
  Scene,
  ShaderMaterial,
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
} from "../avalanche/AvalancheParticleSystems";
import {
  createAvalancheTextures,
  disposeAvalancheTextures,
  type AvalancheTextureSet,
} from "../avalanche/AvalancheTextures";
import type { TkLightPool } from "../../TkLightPool";
import { createBrokenRingGeometry } from "../../vfxKit/stylizedGeometry";

export interface EarthquakeVfxConfig {
  waveDuration: number;
  maxConcurrentCasts: number;
  dustEmission: number;
  debrisPerPoint: number;
  radialDustPoints: number;
  impactPoints: number;
  maxRadius: number;
  cleanupDelay: number;
  originHeight: number;
}

export const DEFAULT_EARTHQUAKE_VFX_CONFIG: EarthquakeVfxConfig = {
  waveDuration: 0.34,
  maxConcurrentCasts: 2,
  dustEmission: 44,
  debrisPerPoint: 10,
  radialDustPoints: 8,
  impactPoints: 12,
  maxRadius: 6,
  cleanupDelay: 1.15,
  originHeight: 0.08,
};

type EarthquakePhase = "wave" | "aftermath";

interface EarthquakeSharedResources {
  textures: AvalancheTextureSet;
  particleMaterials: AvalancheParticleMaterials;
  ringGeometry: BufferGeometry;
  ringMaterial: MeshBasicMaterial;
  bandGeometry: BufferGeometry;
  bandMaterial: MeshBasicMaterial;
  rockGeometry: DodecahedronGeometry;
  rockMaterial: MeshStandardMaterial;
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function finiteVector(vector: Vector3): boolean {
  return Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

function createSharedResources(): EarthquakeSharedResources {
  const textures = createAvalancheTextures();
  const particleMaterials = createAvalancheParticleMaterials(textures);
  const ringGeometry = createBrokenRingGeometry(0.965, 1, 80);
  const ringMaterial = new MeshBasicMaterial({
    color: 0xb69468,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
  });
  const bandGeometry = createBrokenRingGeometry(0.82, 0.96, 80);
  const bandMaterial = new MeshBasicMaterial({
    color: 0x66513b,
    vertexColors: true,
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
    ringGeometry,
    ringMaterial,
    bandGeometry,
    bandMaterial,
    rockGeometry: new DodecahedronGeometry(0.42, 0),
    rockMaterial: new MeshStandardMaterial({
      color: 0xab885c,
      roughness: 0.96,
      metalness: 0,
      flatShading: true,
    }),
  };
}

class EarthquakeCast {
  private readonly root = new Group();
  private readonly ring: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly band: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly rocks: InstancedMesh;
  private readonly rockPose = new Object3D();
  private readonly rockAngles: Float32Array;
  private readonly rockFractions: Float32Array;
  private readonly waveDust: ParticleSystem[] = [];
  private readonly linger: ParticleSystem;
  private readonly impacts: Array<{
    fraction: number;
    position: Vector3;
    systems: AvalanchePointSystems;
    triggered: boolean;
  }> = [];
  private readonly systems: ParticleSystem[];
  private readonly light: PointLight | null;
  private readonly pooledLight: boolean;
  private elapsed = 0;
  private cleanupElapsed = 0;
  private phase: EarthquakePhase = "wave";
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: EarthquakeSharedResources,
    private readonly config: EarthquakeVfxConfig,
    private readonly origin: Vector3,
    private readonly radius: number,
    private readonly onDispose: (cast: EarthquakeCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.root.name = "tk-earthquake-wave-root";
    this.root.position.copy(origin);

    this.ring = new Mesh(shared.ringGeometry, shared.ringMaterial.clone());
    this.ring.name = "tk-earthquake-wave-ring";
    this.ring.rotation.x = Math.PI / 2;
    this.ring.renderOrder = 11;
    this.ring.scale.setScalar(0.01);

    this.band = new Mesh(shared.bandGeometry, shared.bandMaterial.clone());
    this.band.name = "tk-earthquake-wave-band";
    this.band.rotation.x = -Math.PI / 2;
    this.band.position.y = 0.012;
    this.band.renderOrder = 10;
    this.band.scale.setScalar(0.01);

    this.root.add(this.band, this.ring);
    const rockCount = config.impactPoints * 2;
    this.rocks = new InstancedMesh(shared.rockGeometry, shared.rockMaterial, rockCount);
    this.rocks.name = "tk-earthquake-faceted-plates";
    this.rocks.instanceMatrix.setUsage(DynamicDrawUsage);
    this.rocks.frustumCulled = false;
    this.rockAngles = new Float32Array(rockCount);
    this.rockFractions = new Float32Array(rockCount);
    const tint = new Color();
    for (let index = 0; index < rockCount; index++) {
      this.rockAngles[index] = index * Math.PI * (3 - Math.sqrt(5));
      this.rockFractions[index] = 0.26 + (index % 4) * 0.23;
      tint.setHex(index % 3 === 0 ? 0xe5c69a : index % 3 === 1 ? 0xb69c79 : 0x81715b);
      this.rocks.setColorAt(index, tint);
    }
    this.root.add(this.rocks);
    this.castRoot.add(this.root);

    for (let index = 0; index < this.config.radialDustPoints; index += 1) {
      const system = createAvalancheWaveSystem(shared.particleMaterials, this.config);
      system.emitter.position.copy(origin);
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
      system.play();
      system.emitter.visible = true;
      this.waveDust.push(system);
    }

    this.linger = createAvalancheLingerSystem(shared.particleMaterials);
    this.linger.emitter.position.copy(origin);
    scene.add(this.linger.emitter);
    batchedRenderer.addSystem(this.linger);

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < this.config.impactPoints; index += 1) {
      const band = index % 4;
      const fraction = 0.3 + band * (0.7 / 3);
      const angle = index * goldenAngle;
      const distance = radius * fraction;
      const position = origin.clone().add(new Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance,
      ));
      const systems = createAvalancheImpactSystems(shared.particleMaterials, this.config);
      for (const system of systems.all) {
        system.emitter.position.copy(position);
        scene.add(system.emitter);
        batchedRenderer.addSystem(system);
      }
      this.impacts.push({ fraction, position, systems, triggered: false });
    }

    this.systems = [
      ...this.waveDust,
      this.linger,
      ...this.impacts.flatMap((impact) => impact.systems.all),
    ];

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xd5a052, Math.max(8, radius * 1.8));
      this.pooledLight = true;
    } else {
      this.light = new PointLight(0xd5a052, 0, Math.max(8, radius * 1.8), 2);
      this.pooledLight = false;
    }
    if (this.light) {
      this.light.position.set(origin.x, origin.y + 0.45, origin.z);
      this.castRoot.add(this.light);
    }

    this.updateWave(0);
    this.updateRocks();
  }

  getPhase(): EarthquakePhase {
    return this.phase;
  }

  getParticleCount(): number {
    return this.systems.reduce((sum, system) => sum + system.particleNum, 0);
  }

  getSystems(): ParticleSystem[] {
    return this.systems;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      radius: this.radius,
      frontRadius: this.currentRadius(),
      triggeredCount: this.impacts.reduce(
        (count, impact) => count + (impact.triggered ? 1 : 0),
        0,
      ),
    };
  }

  prepareFrame(): void {
    for (const system of this.waveDust) {
      system.emitter.updateWorldMatrix(true, false);
    }
    for (const impact of this.impacts) {
      if (!impact.triggered) continue;
      for (const system of impact.systems.all) {
        system.emitter.updateWorldMatrix(true, false);
      }
    }
    if (this.phase === "aftermath") {
      this.linger.emitter.updateWorldMatrix(true, false);
    }
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    if (this.phase === "wave") {
      this.updateWave(deltaTime);
    } else this.updateAftermath(deltaTime);
    if (!this.disposed) this.updateRocks();
  }

  private updateRocks(): void {
    const time = this.elapsed + this.cleanupElapsed;
    for (let index = 0; index < this.rockAngles.length; index++) {
      const fraction = this.rockFractions[index]!;
      const at = this.config.waveDuration * (1 - Math.sqrt(1 - fraction));
      const age = time - at;
      const rise = MathUtils.clamp(age / 0.09, 0, 1);
      const settle = MathUtils.clamp((age - 0.14) / 0.58, 0, 1);
      const presence = rise * (1 - settle * settle);
      const angle = this.rockAngles[index]!;
      const size = (0.65 + (index % 3) * 0.18) * Math.min(1, this.radius / 3);
      this.rockPose.position.set(
        Math.cos(angle) * this.radius * fraction,
        -0.18 + presence * (0.24 + (index % 3) * 0.12),
        Math.sin(angle) * this.radius * fraction,
      );
      this.rockPose.rotation.set(0.2 + rise * 0.38, angle, Math.sin(index * 2.3) * 0.24);
      this.rockPose.scale.set(size * presence * 1.25, size * presence * 0.58, size * presence);
      this.rockPose.updateMatrix();
      this.rocks.setMatrixAt(index, this.rockPose.matrix);
    }
    this.rocks.instanceMatrix.needsUpdate = true;
  }

  private currentRadius(): number {
    const progress = MathUtils.clamp(this.elapsed / this.config.waveDuration, 0, 1);
    return this.radius * (1 - Math.pow(1 - progress, 2));
  }

  private updateWave(deltaTime: number): void {
    this.elapsed = Math.min(this.elapsed + deltaTime, this.config.waveDuration);
    const progress = MathUtils.clamp(this.elapsed / this.config.waveDuration, 0, 1);
    const frontRadius = this.currentRadius();

    for (let index = 0; index < this.waveDust.length; index += 1) {
      const angle = index / this.waveDust.length * Math.PI * 2;
      this.waveDust[index]!.emitter.position.set(
        this.origin.x + Math.cos(angle) * frontRadius,
        this.origin.y,
        this.origin.z + Math.sin(angle) * frontRadius,
      );
    }

    for (const impact of this.impacts) {
      if (impact.triggered || frontRadius + 1e-9 < this.radius * impact.fraction) continue;
      impact.triggered = true;
      for (const system of impact.systems.all) {
        system.emitter.visible = true;
        system.restart();
        system.play();
      }
    }

    const scale = Math.max(0.01, frontRadius);
    this.ring.scale.setScalar(scale);
    this.band.scale.setScalar(scale);
    this.ring.material.opacity = 0.66 * (1 - progress * 0.28);
    this.band.material.opacity = 0.28 * Math.min(1, progress * 5) * (1 - progress * 0.35);

    if (this.light) {
      this.light.intensity = 0.6 + Math.sin(progress * Math.PI) * 1.5;
    }

    if (progress >= 1) this.finishWave();
  }

  private finishWave(): void {
    this.phase = "aftermath";
    for (const system of this.waveDust) system.endEmit();
    this.linger.emitter.visible = true;
    this.linger.restart();
    this.linger.play();
  }

  private updateAftermath(deltaTime: number): void {
    this.cleanupElapsed += deltaTime;
    const fade = MathUtils.clamp(1 - this.cleanupElapsed / 0.24, 0, 1);
    this.ring.material.opacity *= fade;
    this.band.material.opacity *= fade;
    this.ring.visible = this.ring.material.opacity > 0.004;
    this.band.visible = this.band.material.opacity > 0.004;
    if (this.light) {
      this.light.intensity *= Math.pow(0.001, deltaTime * 3);
      if (this.light.intensity < 0.02) this.light.intensity = 0;
    }
    if (this.cleanupElapsed >= this.config.cleanupDelay) this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(this.root);
    if (this.pooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.ring.material.dispose();
    this.band.material.dispose();
    this.rocks.dispose();
    this.onDispose(this);
  }
}

export class EarthquakeVfxController {
  private readonly shared: EarthquakeSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<EarthquakeCast>();
  private readonly config: EarthquakeVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<EarthquakeVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_EARTHQUAKE_VFX_CONFIG, ...config };
    this.config = {
      waveDuration: finiteOr(merged.waveDuration, DEFAULT_EARTHQUAKE_VFX_CONFIG.waveDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_EARTHQUAKE_VFX_CONFIG.maxConcurrentCasts, 1)),
      dustEmission: finiteOr(merged.dustEmission, DEFAULT_EARTHQUAKE_VFX_CONFIG.dustEmission, 0),
      debrisPerPoint: Math.floor(finiteOr(merged.debrisPerPoint, DEFAULT_EARTHQUAKE_VFX_CONFIG.debrisPerPoint, 1)),
      radialDustPoints: Math.floor(finiteOr(merged.radialDustPoints, DEFAULT_EARTHQUAKE_VFX_CONFIG.radialDustPoints, 4)),
      impactPoints: Math.floor(finiteOr(merged.impactPoints, DEFAULT_EARTHQUAKE_VFX_CONFIG.impactPoints, 4)),
      maxRadius: finiteOr(merged.maxRadius, DEFAULT_EARTHQUAKE_VFX_CONFIG.maxRadius, 1),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_EARTHQUAKE_VFX_CONFIG.cleanupDelay, 0.1),
      originHeight: finiteOr(merged.originHeight, DEFAULT_EARTHQUAKE_VFX_CONFIG.originHeight, 0),
    };
    this.shared = createSharedResources();
    this.castRoot.name = "tk-earthquake-vfx-root";
    this.batchedRenderer.name = "tk-earthquake-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castEarthquake(origin: Vector3, radius: number): void {
    if (this.disposed) throw new Error("EarthquakeVfxController descartado");
    if (!finiteVector(origin) || !Number.isFinite(radius)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as EarthquakeCast | undefined;
      oldest?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const cast = new EarthquakeCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      launchOrigin,
      MathUtils.clamp(radius, 0.8, this.config.maxRadius),
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
    let steps = 0;
    while (this.accumulator + 1e-9 >= 1 / 60 && steps < 6) {
      this.updateFrame(1 / 60, width, height);
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
      steps += 1;
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
    let count = 0;
    for (const cast of this.casts) count += cast.getParticleCount();
    return count;
  }

  getPhase(): EarthquakePhase | "idle" {
    if (this.casts.size === 0) return "idle";
    for (const cast of this.casts) {
      if (cast.getPhase() === "wave") return "wave";
    }
    return "aftermath";
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
    this.shared.ringGeometry.dispose();
    this.shared.ringMaterial.dispose();
    this.shared.bandGeometry.dispose();
    this.shared.bandMaterial.dispose();
    this.shared.rockGeometry.dispose();
    this.shared.rockMaterial.dispose();
    disposeAvalancheParticleMaterials(this.shared.particleMaterials);
    disposeAvalancheTextures(this.shared.textures);
    this.castRoot.clear();
  }
}

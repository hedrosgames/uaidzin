import {
  AdditiveBlending,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  type Texture,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { createFireBurstFlameTexture } from "../../fireBurst/FireBurstFlameTexture";
import {
  createGolpeEmberPuff,
  createGolpeImpactSparks,
  createGolpeParticleMaterials,
  createGolpeSlashSparks,
  disposeGolpeParticleMaterials,
  type GolpeParticleMaterials,
} from "./GolpeParticleSystems";
import {
  createGolpeTextures,
  disposeGolpeTextures,
  type GolpeTextureSet,
} from "./GolpeTextures";

export interface GolpeVfxConfig {
  swingDuration: number;
  cleanupDelay: number;
  maxConcurrentCasts: number;
  arcRadius: number;
  arcSpan: number;
  sweepArc: number;
  originHeight: number;
  slashSparkCount: number;
  groundSparkCount: number;
  emberCount: number;
}

export const DEFAULT_GOLPE_VFX_CONFIG: GolpeVfxConfig = {
  swingDuration: 0.09,
  cleanupDelay: 0.45,
  maxConcurrentCasts: 4,
  arcRadius: 1.95,
  arcSpan: 1.9,
  sweepArc: 0.78,
  originHeight: 1.18,
  slashSparkCount: 30,
  groundSparkCount: 36,
  emberCount: 14,
};

type GolpePhase = "swing" | "afterglow";

interface GolpeSharedResources {
  textures: GolpeTextureSet;
  flameTexture: Texture;
  particleMaterials: GolpeParticleMaterials;
  arcGeometry: TorusGeometry;
  edgeGeometry: TorusGeometry;
  arcMaterial: MeshStandardMaterial;
  edgeMaterial: MeshBasicMaterial;
}

function createArcGeometry(radius: number, span: number): TorusGeometry {
  const geometry = new TorusGeometry(radius, 0.052, 8, 60, span);
  geometry.rotateZ(Math.PI / 2 - span / 2);
  return geometry;
}

function createEdgeGeometry(radius: number, span: number): TorusGeometry {
  const geometry = new TorusGeometry(radius, 0.02, 4, 60, span);
  geometry.rotateZ(Math.PI / 2 - span / 2);
  return geometry;
}

function createSharedResources(config: GolpeVfxConfig): GolpeSharedResources {
  const textures = createGolpeTextures();
  const flameTexture = createFireBurstFlameTexture();
  const particleMaterials = createGolpeParticleMaterials(textures, flameTexture);
  const arcMaterial = new MeshStandardMaterial({
    map: textures.metal,
    color: 0x8a8378,
    emissive: 0xff7a1a,
    emissiveMap: textures.metal,
    emissiveIntensity: 2.6,
    roughness: 0.35,
    metalness: 0.85,
    transparent: true,
    opacity: 1,
  });
  const edgeMaterial = new MeshBasicMaterial({
    color: 0xffc266,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return {
    textures,
    flameTexture,
    particleMaterials,
    arcGeometry: createArcGeometry(config.arcRadius, config.arcSpan),
    edgeGeometry: createEdgeGeometry(config.arcRadius, config.arcSpan),
    arcMaterial,
    edgeMaterial,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

class GolpeCast {
  private readonly castGroup: Group;
  private readonly swingGroup: Group;
  private readonly arc: Mesh<TorusGeometry, MeshStandardMaterial>;
  private readonly edge: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly light: PointLight;
  private readonly slashSparks: ParticleSystem;
  private readonly impactSparks: ParticleSystem;
  private readonly emberPuff: ParticleSystem;
  private readonly systems: ParticleSystem[];
  private readonly direction: Vector3;
  private readonly startSweep: number;
  private readonly endSweep: number;
  private phase: GolpePhase = "swing";
  private swingElapsed = 0;
  private afterglowElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: GolpeSharedResources,
    private readonly config: GolpeVfxConfig,
    position: Vector3,
    direction: Vector3,
    private readonly onDispose: (cast: GolpeCast) => void,
  ) {
    this.direction = direction.clone();
    this.startSweep = config.sweepArc;
    this.endSweep = -config.sweepArc;

    this.castGroup = new Group();
    this.castGroup.name = "tk-golpe-cast";
    this.castGroup.position.copy(position);
    this.castGroup.rotation.y = Math.atan2(direction.x, direction.z);

    const tiltGroup = new Group();
    tiltGroup.name = "tk-golpe-tilt";
    tiltGroup.rotation.x = 0.14;

    const planeGroup = new Group();
    planeGroup.name = "tk-golpe-plane";
    planeGroup.rotation.y = Math.PI / 2;

    this.swingGroup = new Group();
    this.swingGroup.name = "tk-golpe-swing";
    this.swingGroup.rotation.z = this.startSweep;

    this.arc = new Mesh(shared.arcGeometry, shared.arcMaterial.clone());
    this.arc.name = "tk-golpe-arc";
    this.arc.renderOrder = 8;
    this.edge = new Mesh(shared.edgeGeometry, shared.edgeMaterial.clone());
    this.edge.name = "tk-golpe-edge";
    this.edge.renderOrder = 9;

    this.swingGroup.add(this.arc, this.edge);
    planeGroup.add(this.swingGroup);
    tiltGroup.add(planeGroup);
    this.castGroup.add(tiltGroup);

    this.light = new PointLight(0xff8a2a, 0, 6.5, 2);
    this.castGroup.add(this.light);
    this.castRoot.add(this.castGroup);

    const forward = direction.clone().normalize();
    this.slashSparks = createGolpeSlashSparks(shared.particleMaterials, config);
    this.slashSparks.emitter.position.copy(
      position.clone().addScaledVector(forward, config.arcRadius * 0.72),
    );
    this.impactSparks = createGolpeImpactSparks(shared.particleMaterials, config);
    this.emberPuff = createGolpeEmberPuff(shared.particleMaterials, config);
    this.emberPuff.emitter.position.copy(
      position.clone().addScaledVector(forward, config.arcRadius * 0.5),
    );
    this.emberPuff.emitter.position.y = Math.max(0.4, position.y - 0.55);
    this.systems = [this.slashSparks, this.impactSparks, this.emberPuff];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    this.slashSparks.emitter.visible = true;
    this.slashSparks.play();

    this.updateSwing(0);
  }

  getPhase(): GolpePhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.phase === "swing"
        ? this.swingElapsed
        : this.config.swingDuration + this.afterglowElapsed,
      progress: Math.min(1, this.swingElapsed / this.config.swingDuration),
      sweep: this.swingGroup.rotation.z,
      arcPosition: this.castGroup.position.toArray(),
      direction: this.direction.toArray(),
      afterglowAge: this.afterglowElapsed,
    };
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
  }

  getSystems(): ParticleSystem[] {
    return [...this.systems];
  }

  prepareFrame(): void {
    for (const system of this.systems) {
      system.emitter.updateWorldMatrix(true, false);
    }
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    if (this.phase === "swing") {
      this.updateSwing(deltaTime);
      return;
    }
    this.updateAfterglow(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.castGroup);
    this.arc.material.dispose();
    this.edge.material.dispose();
    this.onDispose(this);
  }

  private updateSwing(deltaTime: number): void {
    this.swingElapsed = Math.min(
      this.swingElapsed + deltaTime,
      this.config.swingDuration,
    );
    const progress = MathUtils.clamp(
      this.swingElapsed / this.config.swingDuration,
      0,
      1,
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    this.swingGroup.rotation.z = this.startSweep
      + (this.endSweep - this.startSweep) * eased;
    const grow = 0.92 + progress * 0.16;
    this.arc.scale.setScalar(grow);
    this.edge.scale.setScalar(grow);
    this.arc.material.emissiveIntensity = 2.6 * (1 - progress * 0.35);
    this.edge.material.opacity = 0.95 * (1 - progress * 0.5);
    this.light.intensity = 1.2 + Math.sin(progress * Math.PI) * 2.4;
    if (progress >= 1) this.triggerAfterglow();
  }

  private triggerAfterglow(): void {
    this.phase = "afterglow";
    this.impactSparks.emitter.position.set(
      this.castGroup.position.x + this.direction.x * this.config.arcRadius * 0.8,
      0.32,
      this.castGroup.position.z + this.direction.z * this.config.arcRadius * 0.8,
    );
    this.impactSparks.emitter.visible = true;
    this.impactSparks.restart();
    this.impactSparks.play();
    this.emberPuff.emitter.visible = true;
    this.emberPuff.restart();
    this.emberPuff.play();
    this.light.intensity = 3.4;
  }

  private updateAfterglow(deltaTime: number): void {
    this.afterglowElapsed += deltaTime;
    const fadeWindow = Math.max(
      1e-4,
      this.config.cleanupDelay - this.config.swingDuration,
    );
    const fade = Math.pow(
      1 - MathUtils.clamp(this.afterglowElapsed / fadeWindow, 0, 1),
      1.6,
    );
    this.arc.material.emissiveIntensity = 1.7 * fade;
    this.arc.material.opacity = 0.9 * fade;
    this.edge.material.opacity = 0.5 * fade;
    this.light.intensity = 3.4 * fade;
    if (this.afterglowElapsed >= fadeWindow) this.dispose();
  }
}

export class GolpeVfxController {
  private readonly shared: GolpeSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<GolpeCast>();
  private readonly config: GolpeVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<GolpeVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_GOLPE_VFX_CONFIG, ...config };
    const finiteOr = (value: number, fallback: number, minimum: number) =>
      Number.isFinite(value) ? Math.max(minimum, value) : fallback;
    this.config = {
      swingDuration: finiteOr(merged.swingDuration, DEFAULT_GOLPE_VFX_CONFIG.swingDuration, 1 / 240),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_GOLPE_VFX_CONFIG.cleanupDelay, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(
        merged.maxConcurrentCasts,
        DEFAULT_GOLPE_VFX_CONFIG.maxConcurrentCasts,
        1,
      )),
      arcRadius: finiteOr(merged.arcRadius, DEFAULT_GOLPE_VFX_CONFIG.arcRadius, 0.2),
      arcSpan: finiteOr(merged.arcSpan, DEFAULT_GOLPE_VFX_CONFIG.arcSpan, 0.2),
      sweepArc: finiteOr(merged.sweepArc, DEFAULT_GOLPE_VFX_CONFIG.sweepArc, 0),
      originHeight: finiteOr(merged.originHeight, DEFAULT_GOLPE_VFX_CONFIG.originHeight, 0),
      slashSparkCount: Math.floor(finiteOr(merged.slashSparkCount, DEFAULT_GOLPE_VFX_CONFIG.slashSparkCount, 0)),
      groundSparkCount: Math.floor(finiteOr(merged.groundSparkCount, DEFAULT_GOLPE_VFX_CONFIG.groundSparkCount, 0)),
      emberCount: Math.floor(finiteOr(merged.emberCount, DEFAULT_GOLPE_VFX_CONFIG.emberCount, 0)),
    };
    if (this.config.cleanupDelay < this.config.swingDuration) {
      this.config.cleanupDelay = this.config.swingDuration + 0.1;
    }
    this.shared = createSharedResources(this.config);
    this.castRoot.name = "tk-golpe-vfx-root";
    this.batchedRenderer.name = "tk-golpe-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castGolpe(origin: Vector3, direction: Vector3): void {
    if (this.disposed) throw new Error("GolpeVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(direction)) return;
    const horizontal = new Vector3(direction.x, 0, direction.z);
    if (horizontal.lengthSq() < 1e-8) return;
    horizontal.normalize();
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as GolpeCast | undefined;
      oldestCast?.dispose();
    }
    const position = origin.clone();
    position.y = Math.max(origin.y, this.config.originHeight);
    const cast = new GolpeCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      position,
      horizontal,
      (finishedCast) => this.casts.delete(finishedCast),
    );
    this.casts.add(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed) return;
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

  getPhase(): GolpePhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasAfterglow = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "afterglow") hasAfterglow = true;
    }
    return hasAfterglow ? "afterglow" : "swing";
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
    this.shared.arcGeometry.dispose();
    this.shared.edgeGeometry.dispose();
    this.shared.arcMaterial.dispose();
    this.shared.edgeMaterial.dispose();
    this.shared.flameTexture.dispose();
    disposeGolpeParticleMaterials(this.shared.particleMaterials);
    disposeGolpeTextures(this.shared.textures);
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

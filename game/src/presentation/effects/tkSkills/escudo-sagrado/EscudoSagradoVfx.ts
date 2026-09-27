import {
  AdditiveBlending,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  BufferAttribute,
  type BufferGeometry,
  type Texture,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { createFireBurstFlameTexture } from "../../fireBurst/FireBurstFlameTexture";
import {
  createEscudoSagradoFlash,
  createEscudoSagradoImpactSparks,
  createEscudoSagradoMotes,
  createEscudoSagradoParticleMaterials,
  disposeEscudoSagradoParticleMaterials,
  type EscudoSagradoParticleMaterials,
} from "./EscudoSagradoParticleSystems";
import {
  createEscudoSagradoTextures,
  disposeEscudoSagradoTextures,
  type EscudoSagradoTextureSet,
} from "./EscudoSagradoTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface EscudoSagradoVfxConfig {
  materializeDuration: number;
  lingerDuration: number;
  maxConcurrentCasts: number;
  domeRadius: number;
  domePhiLength: number;
  domeThetaStart: number;
  domeThetaLength: number;
  originHeight: number;
  flashCount: number;
  impactSparkCount: number;
  moteRate: number;
  impactMoment: number;
}

export const DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG: EscudoSagradoVfxConfig = {
  materializeDuration: 0.9,
  lingerDuration: 0.55,
  maxConcurrentCasts: 4,
  domeRadius: 1.15,
  domePhiLength: 1.5,
  domeThetaStart: 0.52,
  domeThetaLength: 1.08,
  originHeight: 1.12,
  flashCount: 20,
  impactSparkCount: 42,
  moteRate: 26,
  impactMoment: 0.42,
};

type EscudoPhase = "materialize" | "linger";

interface EscudoSharedResources {
  textures: EscudoSagradoTextureSet;
  flameTexture: Texture;
  particleMaterials: EscudoSagradoParticleMaterials;
  domeGeometry: BufferGeometry;
  topRimGeometry: TorusGeometry;
  bottomRimGeometry: TorusGeometry;
  domeMaterial: MeshBasicMaterial;
  rimMaterial: MeshBasicMaterial;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createDomeGeometry(
  radius: number,
  phiLength: number,
  thetaStart: number,
  thetaLength: number,
): BufferGeometry {
  const geometry = new SphereGeometry(
    radius,
    10,
    8,
    Math.PI / 2 - phiLength / 2,
    phiLength,
    thetaStart,
    thetaLength,
  ).toNonIndexed();
  const positions = geometry.getAttribute("position") as BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const random = mulberry32(4177);
  for (let face = 0; face < positions.count / 3; face += 1) {
    const brightness = 0.78 + random() * 0.44;
    for (let corner = 0; corner < 3; corner += 1) {
      const index = face * 3 + corner;
      colors[index * 3] = brightness;
      colors[index * 3 + 1] = brightness * 0.97;
      colors[index * 3 + 2] = brightness * 0.9;
    }
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

function createRimGeometry(
  radius: number,
  phiLength: number,
  theta: number,
): TorusGeometry {
  const ringRadius = radius * Math.sin(theta);
  const geometry = new TorusGeometry(ringRadius, 0.022, 4, 48, phiLength);
  geometry.rotateX(Math.PI / 2);
  geometry.rotateY(phiLength / 2 - Math.PI / 2);
  return geometry;
}

function createSharedResources(config: EscudoSagradoVfxConfig): EscudoSharedResources {
  const textures = createEscudoSagradoTextures();
  const flameTexture = createFireBurstFlameTexture();
  const particleMaterials = createEscudoSagradoParticleMaterials(
    textures,
    flameTexture,
  );
  const domeMaterial = new MeshBasicMaterial({
    map: textures.dome,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const rimMaterial = new MeshBasicMaterial({
    color: 0xffd97a,
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
    flameTexture,
    particleMaterials,
    domeGeometry: createDomeGeometry(
      config.domeRadius,
      config.domePhiLength,
      config.domeThetaStart,
      config.domeThetaLength,
    ),
    topRimGeometry: createRimGeometry(
      config.domeRadius,
      config.domePhiLength,
      config.domeThetaStart,
    ),
    bottomRimGeometry: createRimGeometry(
      config.domeRadius,
      config.domePhiLength,
      config.domeThetaStart + config.domeThetaLength,
    ),
    domeMaterial,
    rimMaterial,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

class EscudoSagradoCast {
  private readonly castGroup: Group;
  private readonly domeGroup: Group;
  private readonly dome: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly topRim: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly bottomRim: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly flash: ParticleSystem;
  private readonly impactSparks: ParticleSystem;
  private readonly motes: ParticleSystem;
  private readonly systems: ParticleSystem[];
  private readonly direction: Vector3;
  private phase: EscudoPhase = "materialize";
  private materializeElapsed = 0;
  private lingerElapsed = 0;
  private impactTriggered = false;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: EscudoSharedResources,
    private readonly config: EscudoSagradoVfxConfig,
    position: Vector3,
    direction: Vector3,
    private readonly onDispose: (cast: EscudoSagradoCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.direction = direction.clone();

    this.castGroup = new Group();
    this.castGroup.name = "tk-escudo-cast";
    this.castGroup.position.copy(position);
    this.castGroup.rotation.y = Math.atan2(direction.x, direction.z);

    this.domeGroup = new Group();
    this.domeGroup.name = "tk-escudo-dome-group";
    this.domeGroup.scale.setScalar(0.62);

    this.dome = new Mesh(shared.domeGeometry, shared.domeMaterial.clone());
    this.dome.name = "tk-escudo-dome";
    this.dome.renderOrder = 7;

    this.topRim = new Mesh(shared.topRimGeometry, shared.rimMaterial.clone());
    this.topRim.name = "tk-escudo-rim-top";
    this.topRim.renderOrder = 8;

    this.bottomRim = new Mesh(shared.bottomRimGeometry, shared.rimMaterial.clone());
    this.bottomRim.name = "tk-escudo-rim-bottom";
    this.bottomRim.renderOrder = 8;

    this.domeGroup.add(this.dome, this.topRim, this.bottomRim);
    this.castGroup.add(this.domeGroup);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xffc23f, 7);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xffc23f, 0, 7, 2);
      this.isPooledLight = false;
    }
    if (this.light) this.castGroup.add(this.light);
    this.castRoot.add(this.castGroup);

    const forward = direction.clone().normalize();
    this.flash = createEscudoSagradoFlash(shared.particleMaterials, config);
    this.flash.emitter.position.copy(position.clone().addScaledVector(forward, config.domeRadius * 0.7));
    this.impactSparks = createEscudoSagradoImpactSparks(shared.particleMaterials, config);
    this.motes = createEscudoSagradoMotes(
      shared.particleMaterials,
      config,
      config.materializeDuration,
    );
    this.motes.emitter.position.copy(position.clone().addScaledVector(forward, config.domeRadius * 0.92));
    this.systems = [this.flash, this.impactSparks, this.motes];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    this.flash.emitter.visible = true;
    this.flash.play();

    this.updateMaterialize(0);
  }

  getPhase(): EscudoPhase {
    return this.phase;
  }

  getState() {
    const materializing = this.phase === "materialize";
    const elapsed = materializing
      ? this.materializeElapsed
      : this.config.materializeDuration + this.lingerElapsed;
    return {
      phase: this.phase,
      elapsed,
      progress: Math.min(1, this.materializeElapsed / this.config.materializeDuration),
      domeScale: this.domeGroup.scale.x,
      domeOpacity: this.dome.material.opacity,
      impactTriggered: this.impactTriggered,
      domePosition: this.castGroup.position.toArray(),
      direction: this.direction.toArray(),
      lingerAge: this.lingerElapsed,
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
    if (this.phase === "materialize") {
      this.updateMaterialize(deltaTime);
      return;
    }
    this.updateLinger(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.castGroup);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castGroup.remove(this.light);
      this.light.dispose();
    }
    this.dome.material.dispose();
    this.topRim.material.dispose();
    this.bottomRim.material.dispose();
    this.onDispose(this);
  }

  private updateMaterialize(deltaTime: number): void {
    this.materializeElapsed = Math.min(
      this.materializeElapsed + deltaTime,
      this.config.materializeDuration,
    );
    const progress = MathUtils.clamp(
      this.materializeElapsed / this.config.materializeDuration,
      0,
      1,
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    this.domeGroup.scale.setScalar(0.62 + eased * 0.38);
    this.dome.material.opacity = 0.85 * Math.min(1, progress * 1.6);
    const pulse = 1 + Math.sin(progress * Math.PI * 3) * 0.05 * (1 - progress);
    this.topRim.material.opacity = 0.95 * eased * pulse;
    this.bottomRim.material.opacity = 0.8 * eased * pulse;
    if (this.light) this.light.intensity = 0.8 + Math.sin(progress * Math.PI) * 2.6;
    if (!this.impactTriggered && this.materializeElapsed >= this.config.impactMoment) {
      this.triggerImpact();
    }
    if (progress >= 1) this.triggerLinger();
  }

  private triggerImpact(): void {
    this.impactTriggered = true;
    const forward = this.direction.clone().normalize();
    this.impactSparks.emitter.position.copy(
      this.castGroup.position.clone().addScaledVector(
        forward,
        this.config.domeRadius * 0.96,
      ),
    );
    this.impactSparks.emitter.position.y = Math.max(
      0.5,
      this.castGroup.position.y,
    );
    this.impactSparks.emitter.visible = true;
    this.impactSparks.restart();
    this.impactSparks.play();
    if (this.light) this.light.intensity = 3.6;
  }

  private triggerLinger(): void {
    this.phase = "linger";
    this.motes.emitter.visible = true;
    this.motes.restart();
    this.motes.play();
  }

  private updateLinger(deltaTime: number): void {
    this.lingerElapsed += deltaTime;
    const fadeWindow = Math.max(1e-4, this.config.lingerDuration);
    const fade = Math.pow(
      1 - MathUtils.clamp(this.lingerElapsed / fadeWindow, 0, 1),
      1.5,
    );
    const breathe = 1 + Math.sin(this.lingerElapsed * 9) * 0.012 * fade;
    this.domeGroup.scale.setScalar(breathe);
    this.dome.material.opacity = 0.85 * fade;
    this.topRim.material.opacity = 0.95 * fade;
    this.bottomRim.material.opacity = 0.8 * fade;
    if (this.light) this.light.intensity = 2.2 * fade;
    if (this.lingerElapsed >= fadeWindow) this.dispose();
  }
}

export class EscudoSagradoVfxController {
  private readonly shared: EscudoSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<EscudoSagradoCast>();
  private readonly config: EscudoSagradoVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<EscudoSagradoVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG, ...config };
    const finiteOr = (value: number, fallback: number, minimum: number) =>
      Number.isFinite(value) ? Math.max(minimum, value) : fallback;
    this.config = {
      materializeDuration: finiteOr(
        merged.materializeDuration,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.materializeDuration,
        0.05,
      ),
      lingerDuration: finiteOr(
        merged.lingerDuration,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.lingerDuration,
        0.05,
      ),
      maxConcurrentCasts: Math.floor(finiteOr(
        merged.maxConcurrentCasts,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.maxConcurrentCasts,
        1,
      )),
      domeRadius: finiteOr(
        merged.domeRadius,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.domeRadius,
        0.2,
      ),
      domePhiLength: finiteOr(
        merged.domePhiLength,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.domePhiLength,
        0.1,
      ),
      domeThetaStart: finiteOr(
        merged.domeThetaStart,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.domeThetaStart,
        0,
      ),
      domeThetaLength: finiteOr(
        merged.domeThetaLength,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.domeThetaLength,
        0.1,
      ),
      originHeight: finiteOr(
        merged.originHeight,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.originHeight,
        0,
      ),
      flashCount: Math.floor(finiteOr(
        merged.flashCount,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.flashCount,
        0,
      )),
      impactSparkCount: Math.floor(finiteOr(
        merged.impactSparkCount,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.impactSparkCount,
        0,
      )),
      moteRate: Math.floor(finiteOr(
        merged.moteRate,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.moteRate,
        0,
      )),
      impactMoment: finiteOr(
        merged.impactMoment,
        DEFAULT_ESCUDO_SAGRADO_VFX_CONFIG.impactMoment,
        0.01,
      ),
    };
    if (this.config.impactMoment >= this.config.materializeDuration) {
      this.config.impactMoment = this.config.materializeDuration * 0.5;
    }
    this.shared = createSharedResources(this.config);
    this.castRoot.name = "tk-escudo-sagrado-vfx-root";
    this.batchedRenderer.name = "tk-escudo-sagrado-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castEscudo(origin: Vector3, direction: Vector3): void {
    if (this.disposed) throw new Error("EscudoSagradoVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(direction)) return;
    const horizontal = new Vector3(direction.x, 0, direction.z);
    if (horizontal.lengthSq() < 1e-8) return;
    horizontal.normalize();
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as EscudoSagradoCast | undefined;
      oldestCast?.dispose();
    }
    const position = origin.clone();
    position.y = Math.max(origin.y, this.config.originHeight);
    const cast = new EscudoSagradoCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      position,
      horizontal,
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

  getPhase(): EscudoPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasLinger = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "linger") hasLinger = true;
    }
    return hasLinger ? "linger" : "materialize";
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
    this.shared.domeGeometry.dispose();
    this.shared.topRimGeometry.dispose();
    this.shared.bottomRimGeometry.dispose();
    this.shared.domeMaterial.dispose();
    this.shared.rimMaterial.dispose();
    this.shared.flameTexture.dispose();
    disposeEscudoSagradoParticleMaterials(this.shared.particleMaterials);
    disposeEscudoSagradoTextures(this.shared.textures);
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

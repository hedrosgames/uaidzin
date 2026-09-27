import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { LinkProjectile } from "../../vfxKit/linkProjectile";
import {
  createAncoraChainSystems,
  createAncoraImpactSystems,
  createAncoraParticleMaterials,
  disposeAncoraParticleMaterials,
  type AncoraImpactSystems,
  type AncoraParticleMaterials,
} from "./AncoraParticleSystems";
import {
  createAncoraTextures,
  disposeAncoraTextures,
  type AncoraTextureSet,
} from "./AncoraTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface AncoraVfxConfig {
  chainDuration: number;
  fallDuration: number;
  plantedDuration: number;
  dissolveDuration: number;
  dropHeight: number;
  maxConcurrentCasts: number;
  trailEmission: number;
  sparkBurstCount: number;
  shardBurstCount: number;
  plumeBurstCount: number;
  lightIntensity: number;
  originHeight: number;
  targetHeight: number;
  anchorScale: number;
}

export const DEFAULT_ANCORA_VFX_CONFIG: AncoraVfxConfig = {
  chainDuration: 0.35,
  fallDuration: 0.3,
  plantedDuration: 0.5,
  dissolveDuration: 0.2,
  dropHeight: 9,
  maxConcurrentCasts: 3,
  trailEmission: 40,
  sparkBurstCount: 30,
  shardBurstCount: 16,
  plumeBurstCount: 18,
  lightIntensity: 7.5,
  originHeight: 1.1,
  targetHeight: 0.05,
  anchorScale: 1,
};

type CastPhase = "chain" | "fall" | "impact";

interface AncoraSharedResources {
  textures: AncoraTextureSet;
  particleMaterials: AncoraParticleMaterials;
  chainGeometry: TorusGeometry;
  chainMaterial: MeshStandardMaterial;
  tipGeometry: ConeGeometry;
  tipMaterial: MeshStandardMaterial;
  shankGeometry: CylinderGeometry;
  stockGeometry: BoxGeometry;
  ringGeometry: TorusGeometry;
  pointGeometry: ConeGeometry;
  flukeGeometry: BoxGeometry;
  ironMaterial: MeshStandardMaterial;
  rimMaterial: MeshBasicMaterial;
  shockGeometry: RingGeometry;
  shockMaterial: MeshBasicMaterial;
  flashGeometry: SphereGeometry;
  flashMaterial: MeshBasicMaterial;
  glowGeometry: PlaneGeometry;
  glowMaterial: MeshBasicMaterial;
}

const IRON_COLOR = 0x241c14;
const GOLD_COLOR = 0xd4a017;
const EMBER_COLOR = 0xc4452a;
const ANCHOR_TIP_OFFSET = 1.56;
const ANCHOR_TOP_OFFSET = 3.05;

function createSharedResources(): AncoraSharedResources {
  const textures = createAncoraTextures();
  const particleMaterials = createAncoraParticleMaterials(textures);
  const chainGeometry = new TorusGeometry(0.11, 0.028, 6, 16);
  chainGeometry.scale(0.74, 1.12, 1);
  const chainMaterial = new MeshStandardMaterial({
    map: textures.spectral,
    color: 0x8a7f68,
    emissive: 0x8a6a12,
    emissiveIntensity: 0.35,
    roughness: 0.44,
    metalness: 0.7,
  });
  const tipGeometry = new ConeGeometry(0.15, 0.5, 4);
  tipGeometry.scale(0.7, 1, 1);
  tipGeometry.translate(0, -0.25, 0);
  const tipMaterial = new MeshStandardMaterial({
    color: 0x9c8a5a,
    emissive: 0x6b4a08,
    emissiveIntensity: 0.4,
    roughness: 0.36,
    metalness: 0.74,
  });
  const shankGeometry = new CylinderGeometry(0.075, 0.13, 2.4, 10);
  const stockGeometry = new BoxGeometry(1.15, 0.2, 0.2);
  const ringGeometry = new TorusGeometry(0.28, 0.062, 8, 20);
  const pointGeometry = new ConeGeometry(0.15, 0.72, 6);
  pointGeometry.rotateX(Math.PI);
  pointGeometry.translate(0, -1.2, 0);
  const flukeGeometry = new BoxGeometry(0.44, 0.52, 0.09);
  const ironMaterial = new MeshStandardMaterial({
    color: IRON_COLOR,
    emissive: GOLD_COLOR,
    emissiveIntensity: 0.16,
    roughness: 0.52,
    metalness: 0.82,
    transparent: true,
    opacity: 1,
  });
  const rimMaterial = new MeshBasicMaterial({
    color: GOLD_COLOR,
    transparent: true,
    opacity: 0.3,
    side: BackSide,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const shockGeometry = new RingGeometry(0.32, 0.48, 48);
  const shockMaterial = new MeshBasicMaterial({
    color: EMBER_COLOR,
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
    color: 0xffc894,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const glowGeometry = new PlaneGeometry(1, 1);
  const glowMaterial = new MeshBasicMaterial({
    map: textures.glow,
    color: 0xffffff,
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
    chainGeometry,
    chainMaterial,
    tipGeometry,
    tipMaterial,
    shankGeometry,
    stockGeometry,
    ringGeometry,
    pointGeometry,
    flukeGeometry,
    ironMaterial,
    rimMaterial,
    shockGeometry,
    shockMaterial,
    flashGeometry,
    flashMaterial,
    glowGeometry,
    glowMaterial,
  };
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return (
    Number.isFinite(vector.x) &&
    Number.isFinite(vector.y) &&
    Number.isFinite(vector.z)
  );
}

class AncoraCast {
  readonly systems: ParticleSystem[];
  private readonly anchor: Group;
  private readonly anchorMaterial: MeshStandardMaterial;
  private readonly rimMaterial: MeshBasicMaterial;
  private readonly rim: Mesh;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly shock: Mesh;
  private readonly shockMaterial: MeshBasicMaterial;
  private readonly flash: Mesh;
  private readonly flashMaterial: MeshBasicMaterial;
  private readonly groundGlow: Mesh;
  private readonly groundGlowMaterial: MeshBasicMaterial;
  private readonly impactSystems: AncoraImpactSystems;
  private readonly chain: LinkProjectile;
  private readonly castRoot: Group;
  private readonly target: Vector3;
  private readonly config: AncoraVfxConfig;
  private phase: CastPhase = "chain";
  private elapsed = 0;
  private impactElapsed = 0;
  private wispsFired = false;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    castRoot: Group,
    shared: AncoraSharedResources,
    config: AncoraVfxConfig,
    origin: Vector3,
    target: Vector3,
    private readonly onDispose: (cast: AncoraCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.castRoot = castRoot;
    this.target = target;
    this.config = config;

    this.anchorMaterial = shared.ironMaterial.clone();
    this.rimMaterial = shared.rimMaterial.clone();
    this.anchor = new Group();
    this.anchor.name = "tk-ancora-anchor";
    const shank = new Mesh(shared.shankGeometry, this.anchorMaterial);
    const stock = new Mesh(shared.stockGeometry, this.anchorMaterial);
    stock.position.y = 0.95;
    const ring = new Mesh(shared.ringGeometry, this.anchorMaterial);
    ring.position.y = 1.42;
    const point = new Mesh(shared.pointGeometry, this.anchorMaterial);
    const flukeLeft = new Mesh(shared.flukeGeometry, this.anchorMaterial);
    flukeLeft.position.set(-0.24, -1.22, 0);
    flukeLeft.rotation.z = 0.62;
    const flukeRight = new Mesh(shared.flukeGeometry, this.anchorMaterial);
    flukeRight.position.set(0.24, -1.22, 0);
    flukeRight.rotation.z = -0.62;
    this.rim = new Mesh(shared.shankGeometry, this.rimMaterial);
    this.rim.scale.setScalar(1.06);
    this.rim.visible = false;
    this.anchor.add(
      shank, stock, ring, point, flukeLeft, flukeRight, this.rim,
    );
    this.anchor.scale.setScalar(config.anchorScale);
    this.anchor.position.set(
      target.x,
      target.y + ANCHOR_TIP_OFFSET + config.dropHeight,
      target.z,
    );
    this.anchor.visible = false;
    castRoot.add(this.anchor);

    this.shockMaterial = shared.shockMaterial.clone();
    this.shock = new Mesh(shared.shockGeometry, this.shockMaterial);
    this.shock.name = "tk-ancora-shock";
    this.shock.rotation.x = -Math.PI / 2;
    this.shock.position.set(target.x, target.y + 0.02, target.z);
    this.shock.visible = false;
    this.shock.renderOrder = 11;
    castRoot.add(this.shock);

    this.flashMaterial = shared.flashMaterial.clone();
    this.flash = new Mesh(shared.flashGeometry, this.flashMaterial);
    this.flash.name = "tk-ancora-flash";
    this.flash.visible = false;
    castRoot.add(this.flash);

    this.groundGlowMaterial = shared.glowMaterial.clone();
    this.groundGlow = new Mesh(shared.glowGeometry, this.groundGlowMaterial);
    this.groundGlow.name = "tk-ancora-glow";
    this.groundGlow.rotation.x = -Math.PI / 2;
    this.groundGlow.position.set(target.x, target.y + 0.015, target.z);
    this.groundGlow.visible = false;
    this.groundGlow.renderOrder = 10;
    castRoot.add(this.groundGlow);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xd4583b, 9 * config.anchorScale);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xd4583b, 0, 9 * config.anchorScale, 2);
      this.isPooledLight = false;
    }
    if (this.light) castRoot.add(this.light);

    this.impactSystems = createAncoraImpactSystems(
      shared.particleMaterials,
      config,
      config.anchorScale,
    );
    const chainSystems = createAncoraChainSystems(shared.particleMaterials, config);
    const chainTarget = target.clone();
    chainTarget.y = target.y + ANCHOR_TOP_OFFSET;
    const mid = origin.clone().lerp(chainTarget, 0.5);
    mid.y -= 0.7;
    const curve = new CatmullRomCurve3([origin.clone(), mid, chainTarget]);
    curve.arcLengthDivisions = 128;
    this.chain = new LinkProjectile(
      castRoot,
      {
        linkGeometry: shared.chainGeometry,
        linkMaterial: shared.chainMaterial,
        tipGeometry: shared.tipGeometry,
        tipMaterial: shared.tipMaterial,
      },
      curve,
      Math.random() * Math.PI * 2,
      chainSystems.all,
      {
        objectName: "tk-ancora-chain",
        tipName: "tk-ancora-chain-tip",
        spacing: 0.2,
        maxLinks: 96,
        spinSpeed: 2.4,
      },
    );
    this.systems = [...chainSystems.all, ...this.impactSystems.all];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    for (const system of chainSystems.all) system.play();
  }

  getPhase(): CastPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      impactAge: this.impactElapsed,
      dissolveProgress:
        this.phase === "impact" && this.impactElapsed > this.config.plantedDuration
          ? MathUtils.clamp(
              (this.impactElapsed - this.config.plantedDuration)
                / this.config.dissolveDuration,
              0,
              1,
            )
          : 0,
      chain: this.chain.getState(),
      anchorVisible: this.anchor.visible,
      anchorPosition: this.anchor.position.toArray(),
      anchorDrop:
        1
        - MathUtils.clamp(
            (this.anchor.position.y - this.target.y - ANCHOR_TIP_OFFSET)
              / this.config.dropHeight,
            0,
            1,
          ),
      planted:
        this.phase === "impact" && this.impactElapsed < this.config.plantedDuration,
      shockVisible: this.shock.visible,
      flashVisible: this.flash.visible,
      target: this.target.toArray(),
    };
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
  }

  prepareFrame(): void {
    for (const system of this.systems) {
      system.emitter.updateWorldMatrix(true, false);
    }
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;
    if (this.phase === "chain") this.updateChain();
    else if (this.phase === "fall") this.updateFall();
    else this.updateImpact(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.chain.dispose();
    this.castRoot.remove(
      this.anchor, this.shock, this.flash, this.groundGlow,
    );
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.anchorMaterial.dispose();
    this.rimMaterial.dispose();
    this.shockMaterial.dispose();
    this.flashMaterial.dispose();
    this.groundGlowMaterial.dispose();
    this.onDispose(this);
  }

  private updateChain(): void {
    const progress = MathUtils.clamp(
      this.elapsed / this.config.chainDuration,
      0,
      1,
    );
    this.chain.update(progress, this.elapsed);
    if (this.light) {
      this.light.position.copy(this.chain.head);
      this.light.intensity = 0.7 + progress * 1.4;
    }
    if (progress >= 1) this.startFall();
  }

  private startFall(): void {
    this.phase = "fall";
    this.chain.hide();
    for (const system of this.systems) system.endEmit();
    this.anchor.visible = true;
    this.anchor.position.set(
      this.target.x,
      this.target.y + ANCHOR_TIP_OFFSET + this.config.dropHeight,
      this.target.z,
    );
    if (this.light) {
      this.light.position.set(
        this.target.x,
        this.target.y + ANCHOR_TIP_OFFSET + this.config.dropHeight,
        this.target.z,
      );
      this.light.intensity = 1.6;
    }
  }

  private updateFall(): void {
    const fallElapsed = this.elapsed - this.config.chainDuration;
    const progress = MathUtils.clamp(
      fallElapsed / this.config.fallDuration,
      0,
      1,
    );
    const eased = progress * progress;
    const y = this.target.y + ANCHOR_TIP_OFFSET
      + this.config.dropHeight * (1 - eased);
    this.anchor.position.set(this.target.x, y, this.target.z);
    this.anchor.rotation.y = progress * 1.1;
    if (this.light) {
      this.light.position.copy(this.anchor.position);
      this.light.intensity = 1.6 + progress * 2.2;
    }
    if (progress >= 1) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.impactElapsed = 0;
    this.anchor.rotation.y = Math.round(this.anchor.rotation.y / Math.PI) * Math.PI;
    this.anchor.position.set(
      this.target.x,
      this.target.y + ANCHOR_TIP_OFFSET,
      this.target.z,
    );
    this.rim.visible = true;
    for (const system of this.impactSystems.all) {
      system.emitter.position.copy(this.target);
      system.emitter.quaternion.identity();
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.shock.scale.setScalar(0.26 * this.config.anchorScale);
    this.shockMaterial.opacity = 0.42;
    this.shock.visible = true;
    this.flash.position.set(
      this.target.x,
      this.target.y + 0.3 * this.config.anchorScale,
      this.target.z,
    );
    this.flash.scale.setScalar(0.2 * this.config.anchorScale);
    this.flashMaterial.opacity = 1;
    this.flash.visible = true;
    this.groundGlow.scale.setScalar(2.8 * this.config.anchorScale);
    this.groundGlowMaterial.opacity = 0.8;
    this.groundGlow.visible = true;
    if (this.light) {
      this.light.position.set(
        this.target.x,
        this.target.y + 0.6 * this.config.anchorScale,
        this.target.z,
      );
      this.light.intensity = this.config.lightIntensity * this.config.anchorScale;
    }
  }

  private updateImpact(deltaTime: number): void {
    this.impactElapsed += deltaTime;
    const scale = this.config.anchorScale;
    const shockProgress = MathUtils.clamp(this.impactElapsed / 0.3, 0, 1);
    const shockFade = Math.pow(1 - shockProgress, 2);
    this.shock.scale.setScalar((0.26 + shockProgress * 4.2) * scale);
    this.shockMaterial.opacity = shockFade * 0.42;
    this.shock.visible = shockFade > 0.01;
    const flashProgress = MathUtils.clamp(this.impactElapsed / 0.15, 0, 1);
    const flashScale = (0.2 + flashProgress * 0.74) * scale;
    this.flash.scale.setScalar(flashScale);
    this.flashMaterial.opacity = Math.pow(1 - flashProgress, 2);
    this.flash.visible = flashProgress < 1;
    const glowFade = Math.pow(
      1 - MathUtils.clamp(
        this.impactElapsed
          / (this.config.plantedDuration + this.config.dissolveDuration),
        0,
        1,
      ),
      1.3,
    );
    this.groundGlowMaterial.opacity = glowFade * 0.8;
    this.groundGlow.visible = glowFade > 0.01;
    const lightFade = Math.pow(
      1 - MathUtils.clamp(this.impactElapsed / 0.5, 0, 1),
      1.6,
    );
    if (this.light) {
      this.light.intensity = this.config.lightIntensity * scale * lightFade;
    }

    const dissolveProgress = MathUtils.clamp(
      (this.impactElapsed - this.config.plantedDuration)
        / this.config.dissolveDuration,
      0,
      1,
    );
    if (dissolveProgress <= 0) {
      const pulse = 0.16 + Math.sin(this.impactElapsed * 18) * 0.05;
      this.anchorMaterial.emissiveIntensity = pulse;
      return;
    }
    if (!this.wispsFired) {
      this.wispsFired = true;
      this.impactSystems.wisps.restart();
      this.impactSystems.wisps.play();
      this.impactSystems.plume.emitter.position.set(
        this.target.x,
        this.target.y + 0.4 * scale,
        this.target.z,
      );
    }
    const fade = Math.pow(1 - dissolveProgress, 1.4);
    this.anchorMaterial.opacity = fade;
    this.rimMaterial.opacity = 0.3 * fade;
    this.anchor.scale.setScalar(this.config.anchorScale * (1 + dissolveProgress * 0.07));
    this.anchor.position.y += deltaTime * 0.5;
    if (dissolveProgress >= 1) this.dispose();
  }
}

export class AncoraVfxController {
  private readonly textures: AncoraTextureSet;
  private readonly shared: AncoraSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<AncoraCast>();
  private readonly config: AncoraVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<AncoraVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_ANCORA_VFX_CONFIG, ...config };
    this.config = {
      chainDuration: finiteOr(merged.chainDuration, DEFAULT_ANCORA_VFX_CONFIG.chainDuration, 0.05),
      fallDuration: finiteOr(merged.fallDuration, DEFAULT_ANCORA_VFX_CONFIG.fallDuration, 0.05),
      plantedDuration: finiteOr(merged.plantedDuration, DEFAULT_ANCORA_VFX_CONFIG.plantedDuration, 0),
      dissolveDuration: finiteOr(merged.dissolveDuration, DEFAULT_ANCORA_VFX_CONFIG.dissolveDuration, 0.05),
      dropHeight: finiteOr(merged.dropHeight, DEFAULT_ANCORA_VFX_CONFIG.dropHeight, 1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_ANCORA_VFX_CONFIG.maxConcurrentCasts, 1)),
      trailEmission: finiteOr(merged.trailEmission, DEFAULT_ANCORA_VFX_CONFIG.trailEmission, 0),
      sparkBurstCount: Math.floor(finiteOr(merged.sparkBurstCount, DEFAULT_ANCORA_VFX_CONFIG.sparkBurstCount, 1)),
      shardBurstCount: Math.floor(finiteOr(merged.shardBurstCount, DEFAULT_ANCORA_VFX_CONFIG.shardBurstCount, 1)),
      plumeBurstCount: Math.floor(finiteOr(merged.plumeBurstCount, DEFAULT_ANCORA_VFX_CONFIG.plumeBurstCount, 1)),
      lightIntensity: finiteOr(merged.lightIntensity, DEFAULT_ANCORA_VFX_CONFIG.lightIntensity, 0.1),
      originHeight: finiteOr(merged.originHeight, DEFAULT_ANCORA_VFX_CONFIG.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_ANCORA_VFX_CONFIG.targetHeight, 0),
      anchorScale: finiteOr(merged.anchorScale, DEFAULT_ANCORA_VFX_CONFIG.anchorScale, 0.1),
    };
    this.textures = createAncoraTextures();
    this.shared = createSharedResources();
    this.castRoot.name = "tk-ancora-vfx-root";
    this.batchedRenderer.name = "tk-ancora-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castAncora(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("AncoraVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as AncoraCast | undefined;
      oldestCast?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new AncoraCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      launchOrigin,
      impactTarget,
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

  getPhase(): CastPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasImpact = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "impact") hasImpact = true;
    }
    if (hasImpact) return "impact";
    let hasFall = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "fall") hasFall = true;
    }
    return hasFall ? "fall" : "chain";
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap((cast) => cast.systems);
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
    this.shared.chainGeometry.dispose();
    this.shared.chainMaterial.dispose();
    this.shared.tipGeometry.dispose();
    this.shared.tipMaterial.dispose();
    this.shared.shankGeometry.dispose();
    this.shared.stockGeometry.dispose();
    this.shared.ringGeometry.dispose();
    this.shared.pointGeometry.dispose();
    this.shared.flukeGeometry.dispose();
    this.shared.ironMaterial.dispose();
    this.shared.rimMaterial.dispose();
    this.shared.shockGeometry.dispose();
    this.shared.shockMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterial.dispose();
    this.shared.glowGeometry.dispose();
    this.shared.glowMaterial.dispose();
    disposeAncoraParticleMaterials(this.shared.particleMaterials);
    disposeAncoraTextures(this.textures);
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
  }
}

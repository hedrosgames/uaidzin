import {
  AdditiveBlending,
  CatmullRomCurve3,
  ConeGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { LinkProjectile } from "../../vfxKit/linkProjectile";
import type { LinkProjectileConfig } from "../../vfxKit/linkProjectile";
import {
  createBastiaoChainSparks,
  createBastiaoCloseSystems,
  createBastiaoDescentSystems,
  createBastiaoJointSystems,
  createBastiaoParticleMaterials,
  disposeBastiaoParticleMaterials,
  type BastiaoChainSparks,
  type BastiaoCloseSystems,
  type BastiaoDescentSystems,
  type BastiaoJointSystems,
  type BastiaoParticleMaterials,
} from "./BastiaoParticleSystems";
import {
  createBastiaoTextures,
  disposeBastiaoTextures,
  type BastiaoTextureSet,
} from "./BastiaoTextures";
import type { TkLightPool } from "../../TkLightPool";

export const BASTIAO_STAKE_COUNT = 4;

export interface BastiaoVfxConfig {
  riseDuration: number;
  chainTravel: number;
  chainDelay: number;
  holdDuration: number;
  descendDuration: number;
  cleanupDelay: number;
  maxConcurrentCasts: number;
  circleRadius: number;
  stakeHeight: number;
  stakeRadius: number;
  chainSag: number;
  dustEmission: number;
  jointBurstCount: number;
  chainSparkCount: number;
  closeSparkCount: number;
  pulseBurstCount: number;
  descentBurstCount: number;
  lightPeak: number;
  lightRise: number;
  innerRingRadius: number;
  outerRingRadius: number;
  originHeight: number;
}

export const DEFAULT_BASTIAO_VFX_CONFIG: BastiaoVfxConfig = {
  riseDuration: 0.45,
  chainTravel: 0.25,
  chainDelay: 0.08,
  holdDuration: 1.2,
  descendDuration: 0.35,
  cleanupDelay: 0.15,
  maxConcurrentCasts: 2,
  circleRadius: 2.2,
  stakeHeight: 2.6,
  stakeRadius: 0.13,
  chainSag: 0.38,
  dustEmission: 26,
  jointBurstCount: 16,
  chainSparkCount: 20,
  closeSparkCount: 44,
  pulseBurstCount: 26,
  descentBurstCount: 22,
  lightPeak: 6,
  lightRise: 1.6,
  innerRingRadius: 1.35,
  outerRingRadius: 1.95,
  originHeight: 1.1,
};

type CastPhase = "rise" | "chains" | "hold" | "descend";

interface BastiaoSharedResources {
  textures: BastiaoTextureSet;
  particleMaterials: BastiaoParticleMaterials;
  shaftGeometry: ConeGeometry;
  bandGeometry: TorusGeometry;
  flashGeometry: SphereGeometry;
  ringGeometry: PlaneGeometry;
  ironMaterial: MeshStandardMaterial;
  goldMaterial: MeshStandardMaterial;
  linkGeometry: TorusGeometry;
  tipGeometry: ConeGeometry;
  linkMaterialTemplate: MeshBasicMaterial;
  tipMaterialTemplate: MeshBasicMaterial;
}

function createSharedResources(): BastiaoSharedResources {
  const textures = createBastiaoTextures();
  const particleMaterials = createBastiaoParticleMaterials(textures);
  const shaftGeometry = new ConeGeometry(1, 1, 9);
  shaftGeometry.translate(0, 0.5, 0);
  const bandGeometry = new TorusGeometry(1, 0.055, 8, 20);
  bandGeometry.rotateX(Math.PI / 2);
  const flashGeometry = new SphereGeometry(1, 16, 12);
  const ringGeometry = new PlaneGeometry(1, 1);
  ringGeometry.rotateX(-Math.PI / 2);
  const ironMaterial = new MeshStandardMaterial({
    color: 0x4a4238,
    emissive: 0x1a1208,
    emissiveIntensity: 0.3,
    roughness: 0.38,
    metalness: 0.82,
  });
  const goldMaterial = new MeshStandardMaterial({
    color: 0xd4a017,
    emissive: 0xd4a017,
    emissiveIntensity: 0.85,
    roughness: 0.3,
    metalness: 0.75,
  });
  const linkGeometry = new TorusGeometry(0.1, 0.03, 6, 14);
  linkGeometry.scale(0.78, 1.18, 1);
  const tipGeometry = new ConeGeometry(0.13, 0.42, 4);
  tipGeometry.translate(0, -0.21, 0);
  const linkMaterialTemplate = new MeshBasicMaterial({
    map: textures.spectral,
    color: 0xd8e0ee,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const tipMaterialTemplate = linkMaterialTemplate.clone();
  tipMaterialTemplate.color.set(0xf0e6d0);
  return {
    textures,
    particleMaterials,
    shaftGeometry,
    bandGeometry,
    flashGeometry,
    ringGeometry,
    ironMaterial,
    goldMaterial,
    linkGeometry,
    tipGeometry,
    linkMaterialTemplate,
    tipMaterialTemplate,
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

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

interface BastiaoStake {
  angle: number;
  position: Vector3;
  top: Vector3;
  group: Group;
  joint: BastiaoJointSystems;
  descent: BastiaoDescentSystems;
  descentTriggered: boolean;
}

interface BastiaoChain {
  projectile: LinkProjectile;
  sparks: BastiaoChainSparks;
  material: MeshBasicMaterial;
  tipMaterial: MeshBasicMaterial;
  start: number;
  connected: boolean;
}

class BastiaoCast {
  private readonly stakes: BastiaoStake[] = [];
  private readonly chains: BastiaoChain[] = [];
  private readonly closeSystems: BastiaoCloseSystems;
  private readonly systems: ParticleSystem[] = [];
  private readonly rings: Mesh[] = [];
  private readonly ringMaterials: MeshBasicMaterial[] = [];
  private readonly flash: Mesh;
  private readonly flashMaterial: MeshBasicMaterial;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly riseEnd: number;
  private readonly closeTime: number;
  private readonly holdEnd: number;
  private readonly descendEnd: number;
  private elapsed = 0;
  private closeFired = false;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: BastiaoSharedResources,
    private readonly config: BastiaoVfxConfig,
    private readonly origin: Vector3,
    private readonly onDispose: (cast: BastiaoCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.riseEnd = config.riseDuration;
    this.closeTime = this.riseEnd + (BASTIAO_STAKE_COUNT - 1) * config.chainDelay + config.chainTravel;
    this.holdEnd = this.closeTime + config.holdDuration;
    this.descendEnd = this.holdEnd + config.descendDuration;
    for (let index = 0; index < BASTIAO_STAKE_COUNT; index += 1) {
      this.stakes.push(this.createStake(scene, batchedRenderer, shared, config, index));
    }
    for (let index = 0; index < BASTIAO_STAKE_COUNT; index += 1) {
      this.chains.push(this.createChain(scene, batchedRenderer, shared, index));
    }
    this.closeSystems = createBastiaoCloseSystems(shared.particleMaterials, config);
    for (const system of this.closeSystems.all) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
      this.systems.push(system);
    }
    this.createRing(shared, 0, config.innerRingRadius * 2.78);
    this.createRing(shared, 1, config.outerRingRadius * 2.29);

    this.flashMaterial = new MeshBasicMaterial({
      color: 0xffe9a8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.flash = new Mesh(shared.flashGeometry, this.flashMaterial);
    this.flash.name = "tk-bastiao-caster-flash";
    this.flash.position.set(origin.x, origin.y + 1.25, origin.z);
    this.flash.visible = false;
    this.castRoot.add(this.flash);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xffc84a, 11);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xffc84a, 0, 11, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.set(origin.x, origin.y + 1.3, origin.z);
      this.castRoot.add(this.light);
    }

    for (const stake of this.stakes) {
      for (const system of stake.joint.all) system.play();
    }
  }

  private createStake(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    shared: BastiaoSharedResources,
    config: BastiaoVfxConfig,
    index: number,
  ): BastiaoStake {
    const angle = index * Math.PI * 2 / BASTIAO_STAKE_COUNT + Math.PI / BASTIAO_STAKE_COUNT;
    const position = new Vector3(
      this.origin.x + Math.cos(angle) * config.circleRadius,
      this.origin.y,
      this.origin.z + Math.sin(angle) * config.circleRadius,
    );
    const group = new Group();
    group.name = "tk-bastiao-stake";
    group.position.set(position.x, position.y - (config.stakeHeight + 0.25), position.z);
    const shaft = new Mesh(shared.shaftGeometry, shared.ironMaterial);
    shaft.name = "tk-bastiao-stake-shaft";
    shaft.scale.set(config.stakeRadius, config.stakeHeight, config.stakeRadius);
    const band = new Mesh(shared.bandGeometry, shared.goldMaterial);
    band.name = "tk-bastiao-stake-band";
    band.scale.set(config.stakeRadius * 1.25, 1, config.stakeRadius * 1.25);
    band.position.y = config.stakeHeight * 0.86;
    group.add(shaft, band);
    this.castRoot.add(group);

    const top = new Vector3(position.x, position.y + config.stakeHeight, position.z);
    const joint = createBastiaoJointSystems(shared.particleMaterials, config);
    const descent = createBastiaoDescentSystems(shared.particleMaterials, config);
    for (const system of [...joint.all, ...descent.all]) {
      system.emitter.position.set(position.x, position.y + 0.08, position.z);
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
      this.systems.push(system);
    }
    return { angle, position, top, group, joint, descent, descentTriggered: false };
  }

  private createChain(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    shared: BastiaoSharedResources,
    index: number,
  ): BastiaoChain {
    const from = this.stakes[index].top;
    const to = this.stakes[(index + 1) % BASTIAO_STAKE_COUNT].top;
    const mid = from.clone().lerp(to, 0.5);
    mid.y -= this.config.chainSag;
    const quarter = from.clone().lerp(to, 0.25);
    quarter.y -= this.config.chainSag * 0.62;
    const threeQuarter = from.clone().lerp(to, 0.75);
    threeQuarter.y -= this.config.chainSag * 0.62;
    const curve = new CatmullRomCurve3([from, quarter, mid, threeQuarter, to]);
    curve.arcLengthDivisions = 128;
    const material = shared.linkMaterialTemplate.clone();
    const tipMaterial = shared.tipMaterialTemplate.clone();
    const projectile = new LinkProjectile(
      this.castRoot,
      {
        linkGeometry: shared.linkGeometry,
        linkMaterial: material,
        tipGeometry: shared.tipGeometry,
        tipMaterial: tipMaterial,
      },
      curve,
      index * Math.PI / 2,
      [],
      {
        objectName: "tk-bastiao-chain",
        tipName: "tk-bastiao-chain-tip",
        spacing: 0.19,
        maxLinks: 96,
        spinSpeed: 2.4,
      } satisfies LinkProjectileConfig,
    );
    const sparks = createBastiaoChainSparks(shared.particleMaterials, this.config);
    for (const system of sparks.all) {
      system.emitter.position.copy(to);
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
      this.systems.push(system);
    }
    return {
      projectile,
      sparks,
      material,
      tipMaterial,
      start: this.riseEnd + index * this.config.chainDelay,
      connected: false,
    };
  }

  private createRing(
    shared: BastiaoSharedResources,
    index: number,
    scale: number,
  ): void {
    const material = new MeshBasicMaterial({
      map: index === 0 ? shared.textures.innerRing : shared.textures.outerRing,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    const ring = new Mesh(shared.ringGeometry, material);
    ring.name = index === 0 ? "tk-bastiao-ring-inner" : "tk-bastiao-ring-outer";
    ring.position.set(this.origin.x, this.origin.y + 0.03 + index * 0.012, this.origin.z);
    ring.scale.set(scale, 1, scale);
    ring.userData.baseScale = scale;
    ring.renderOrder = 10;
    ring.visible = false;
    this.castRoot.add(ring);
    this.rings.push(ring);
    this.ringMaterials.push(material);
  }

  getPhase(): CastPhase {
    if (this.elapsed < this.riseEnd) return "rise";
    if (this.elapsed < this.closeTime) return "chains";
    if (this.elapsed < this.holdEnd) return "hold";
    return "descend";
  }

  getState() {
    return {
      phase: this.getPhase(),
      elapsed: this.elapsed,
      riseProgress: MathUtils.clamp(this.elapsed / this.riseEnd, 0, 1),
      closeProgress: MathUtils.clamp(
        (this.elapsed - this.closeTime) / 0.3,
        0,
        1,
      ),
      target: this.origin.toArray(),
      lightIntensity: this.light?.intensity ?? 0,
      stakes: this.stakes.map((stake) => ({
        position: stake.position.toArray(),
        top: stake.top.toArray(),
        baseY: stake.group.position.y,
        risen: stake.group.position.y >= stake.position.y - 1e-6,
      })),
      chains: this.chains.map((chain) => ({
        connected: chain.connected,
        particles: chain.sparks.burst.particleNum,
        ...chain.projectile.getState(),
      })),
      rings: this.rings.map((ring, index) => ({
        visible: ring.visible,
        opacity: this.ringMaterials[index].opacity,
        rotation: ring.rotation.z,
      })),
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
    this.updateStakes();
    this.updateChains();
    this.updateRings(deltaTime);
    this.updateLight();
    if (this.elapsed >= this.descendEnd + this.config.cleanupDelay) this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    for (const chain of this.chains) {
      chain.projectile.dispose();
      chain.material.dispose();
      chain.tipMaterial.dispose();
    }
    for (const stake of this.stakes) this.castRoot.remove(stake.group);
    for (let index = 0; index < this.rings.length; index += 1) {
      this.castRoot.remove(this.rings[index]);
      this.ringMaterials[index].dispose();
    }
    this.castRoot.remove(this.flash);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.flashMaterial.dispose();
    this.onDispose(this);
  }

  private updateStakes(): void {
    const rise = easeOutCubic(MathUtils.clamp(this.elapsed / this.config.riseDuration, 0, 1));
    const descend = MathUtils.clamp(
      (this.elapsed - this.holdEnd) / this.config.descendDuration,
      0,
      1,
    );
    const offset = (rise - descend * descend) * (this.config.stakeHeight + 0.25);
    for (const stake of this.stakes) {
      stake.group.position.y = stake.position.y - (this.config.stakeHeight + 0.25) + offset;
      stake.group.rotation.y = stake.angle + this.elapsed * 0.4;
      if (descend > 0 && !stake.descentTriggered) {
        stake.descentTriggered = true;
        stake.descent.groundDust.emitter.visible = true;
        stake.descent.groundDust.restart();
        stake.descent.groundDust.play();
      }
      if (descend > 0) stake.group.visible = descend < 1;
    }
  }

  private updateChains(): void {
    for (let index = 0; index < this.chains.length; index += 1) {
      const chain = this.chains[index];
      const local = this.elapsed - chain.start;
      const progress = MathUtils.clamp(local / this.config.chainTravel, 0, 1);
      chain.projectile.update(progress, local);
      if (progress >= 1 && !chain.connected) {
        chain.connected = true;
        const destination = this.stakes[(index + 1) % BASTIAO_STAKE_COUNT].top;
        for (const system of chain.sparks.all) {
          system.emitter.position.copy(destination);
          system.emitter.visible = true;
          system.restart();
          system.play();
        }
      }
    }
    if (this.elapsed >= this.closeTime && !this.closeFired) this.triggerClose();
  }

  private triggerClose(): void {
    this.closeFired = true;
    this.flash.scale.setScalar(0.24);
    this.flashMaterial.opacity = 1;
    this.flash.visible = true;
    for (const system of this.closeSystems.all) {
      system.emitter.position.set(this.origin.x, this.origin.y + 0.15, this.origin.z);
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    if (this.light) this.light.position.set(this.origin.x, this.origin.y + 1.3, this.origin.z);
  }

  private updateRings(deltaTime: number): void {
    const fadeIn = MathUtils.clamp(this.elapsed / this.config.riseDuration, 0, 1);
    const fadeOut = 1 - MathUtils.clamp(
      (this.elapsed - this.holdEnd) / this.config.descendDuration,
      0,
      1,
    );
    const closePulse = MathUtils.clamp(1 - (this.elapsed - this.closeTime) / 0.3, 0, 1);
    const base = 0.16 + fadeIn * 0.66;
    for (let index = 0; index < this.rings.length; index += 1) {
      const ring = this.rings[index];
      const material = this.ringMaterials[index];
      material.opacity = base * fadeOut + closePulse * 0.2;
      ring.visible = material.opacity > 0.01 && fadeOut > 0.01;
      ring.rotation.z += (index === 0 ? 0.95 : -0.62) * deltaTime;
      const pulse = 1 + closePulse * 0.05 * (index === 0 ? 1 : 0.6);
      const baseScale = ring.userData.baseScale as number;
      ring.scale.set(baseScale * pulse, 1, baseScale * pulse);
    }
  }

  private updateLight(): void {
    const rise = MathUtils.clamp(this.elapsed / this.config.riseDuration, 0, 1);
    const chainGlow = MathUtils.clamp(
      (this.elapsed - this.riseEnd) / Math.max(this.closeTime - this.riseEnd, 1e-6),
      0,
      1,
    );
    const closeFade = MathUtils.clamp(1 - (this.elapsed - this.closeTime) / 0.4, 0, 1);
    const descend = MathUtils.clamp(
      (this.elapsed - this.holdEnd) / this.config.descendDuration,
      0,
      1,
    );
    const holdLevel = this.config.lightRise * 0.75 + Math.sin(this.elapsed * 9) * 0.18;
    const peak = this.config.lightPeak * Math.pow(closeFade, 2);
    const level = Math.max(
      rise * this.config.lightRise * 0.5 + chainGlow * this.config.lightRise * 0.5,
      this.elapsed >= this.closeTime ? peak + holdLevel * (1 - descend) : 0,
    );
    if (this.light) this.light.intensity = descend >= 1 ? 0 : level;
  }
}

export class BastiaoVfxController {
  private readonly shared = createSharedResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<BastiaoCast>();
  private readonly config: BastiaoVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<BastiaoVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_BASTIAO_VFX_CONFIG, ...config };
    const numeric = (
      value: number,
      key: keyof BastiaoVfxConfig,
      minimum: number,
    ): number => finiteOr(value, DEFAULT_BASTIAO_VFX_CONFIG[key] as number, minimum);
    this.config = {
      riseDuration: numeric(merged.riseDuration, "riseDuration", 0.05),
      chainTravel: numeric(merged.chainTravel, "chainTravel", 0.05),
      chainDelay: numeric(merged.chainDelay, "chainDelay", 0.01),
      holdDuration: numeric(merged.holdDuration, "holdDuration", 0.1),
      descendDuration: numeric(merged.descendDuration, "descendDuration", 0.05),
      cleanupDelay: numeric(merged.cleanupDelay, "cleanupDelay", 0.05),
      maxConcurrentCasts: Math.floor(numeric(merged.maxConcurrentCasts, "maxConcurrentCasts", 1)),
      circleRadius: numeric(merged.circleRadius, "circleRadius", 0.5),
      stakeHeight: numeric(merged.stakeHeight, "stakeHeight", 0.5),
      stakeRadius: numeric(merged.stakeRadius, "stakeRadius", 0.02),
      chainSag: numeric(merged.chainSag, "chainSag", 0),
      dustEmission: numeric(merged.dustEmission, "dustEmission", 0),
      jointBurstCount: Math.floor(numeric(merged.jointBurstCount, "jointBurstCount", 1)),
      chainSparkCount: Math.floor(numeric(merged.chainSparkCount, "chainSparkCount", 1)),
      closeSparkCount: Math.floor(numeric(merged.closeSparkCount, "closeSparkCount", 1)),
      pulseBurstCount: Math.floor(numeric(merged.pulseBurstCount, "pulseBurstCount", 1)),
      descentBurstCount: Math.floor(numeric(merged.descentBurstCount, "descentBurstCount", 1)),
      lightPeak: numeric(merged.lightPeak, "lightPeak", 0.1),
      lightRise: numeric(merged.lightRise, "lightRise", 0.1),
      innerRingRadius: numeric(merged.innerRingRadius, "innerRingRadius", 0.2),
      outerRingRadius: numeric(merged.outerRingRadius, "outerRingRadius", 0.2),
      originHeight: numeric(merged.originHeight, "originHeight", 0),
    };
    this.castRoot.name = "tk-bastiao-vfx-root";
    this.batchedRenderer.name = "tk-bastiao-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castBastiao(origin: Vector3): void {
    if (this.disposed) throw new Error("BastiaoVfxController descartado");
    if (!isFiniteVector3(origin)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as BastiaoCast | undefined;
      oldestCast?.dispose();
    }
    const castOrigin = origin.clone();
    castOrigin.y = Math.max(origin.y, 0.02);
    const cast = new BastiaoCast(
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
    const order: CastPhase[] = ["rise", "chains", "hold", "descend"];
    let earliest: CastPhase = "descend";
    for (const cast of this.casts) {
      const phase = cast.getPhase();
      if (order.indexOf(phase) < order.indexOf(earliest)) earliest = phase;
    }
    return earliest;
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
    const shared = this.shared;
    shared.shaftGeometry.dispose();
    shared.bandGeometry.dispose();
    shared.flashGeometry.dispose();
    shared.ringGeometry.dispose();
    shared.ironMaterial.dispose();
    shared.goldMaterial.dispose();
    shared.linkGeometry.dispose();
    shared.tipGeometry.dispose();
    shared.linkMaterialTemplate.dispose();
    shared.tipMaterialTemplate.dispose();
    disposeBastiaoParticleMaterials(shared.particleMaterials);
    disposeBastiaoTextures(shared.textures);
    this.castRoot.clear();
  }
}

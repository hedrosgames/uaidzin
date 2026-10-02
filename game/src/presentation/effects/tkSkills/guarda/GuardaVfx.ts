import {
  AdditiveBlending,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Texture,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { createFireBurstFlameTexture } from "../../fireBurst/FireBurstFlameTexture";
import {
  createGuardaAuraMotes,
  createGuardaFlash,
  createGuardaParticleMaterials,
  createGuardaWaveSparks,
  disposeGuardaParticleMaterials,
  type GuardaParticleMaterials,
} from "./GuardaParticleSystems";
import {
  createGuardaTextures,
  disposeGuardaTextures,
  type GuardaTextureSet,
} from "./GuardaTextures";
import type { TkLightPool } from "../../TkLightPool";
import { createShieldGeometry } from "../../vfxKit/stylizedGeometry";

export interface GuardaVfxConfig {
  riseDuration: number;
  shieldDuration: number;
  fadeDuration: number;
  waveTimes: [number, number, number];
  maxConcurrentCasts: number;
  shellRadius: number;
  shellPhiLength: number;
  shellThetaStart: number;
  shellThetaLength: number;
  forwardOffset: number;
  originHeight: number;
  auraInnerRadius: number;
  auraOuterRadius: number;
  auraSpan: number;
  rippleDuration: number;
  sparkCount: number;
  flashCount: number;
  moteRate: number;
}

export const DEFAULT_GUARDA_VFX_CONFIG: GuardaVfxConfig = {
  riseDuration: 0.22,
  shieldDuration: 1.5,
  fadeDuration: 0.4,
  waveTimes: [0.25, 0.5, 0.75],
  maxConcurrentCasts: 4,
  shellRadius: 1.0,
  shellPhiLength: 1.7,
  shellThetaStart: 0.42,
  shellThetaLength: 1.35,
  forwardOffset: 0.62,
  originHeight: 1.0,
  auraInnerRadius: 0.55,
  auraOuterRadius: 1.0,
  auraSpan: 2.2,
  rippleDuration: 0.45,
  sparkCount: 46,
  flashCount: 14,
  moteRate: 22,
};

type GuardaPhase = "rise" | "hold" | "fade";

interface GuardaSharedResources {
  textures: GuardaTextureSet;
  flameTexture: Texture;
  particleMaterials: GuardaParticleMaterials;
  shellGeometry: BufferGeometry;
  rimTopGeometry: TorusGeometry;
  rimBottomGeometry: TorusGeometry;
  rippleGeometry: TorusGeometry;
  auraGeometry: RingGeometry;
  shellMaterial: MeshStandardMaterial;
  rimMaterial: MeshBasicMaterial;
  auraMaterial: MeshBasicMaterial;
  rippleMaterial: MeshBasicMaterial;
}

function createShellGeometry(
  radius: number,
  _phiLength: number,
  _thetaStart: number,
  _thetaLength: number,
): BufferGeometry {
  const geometry = createShieldGeometry(radius * 1.12, radius * 1.38, 0.085);
  geometry.translate(0, 0.12, radius * 0.48);
  return geometry;
}

function createArcRingGeometry(
  radius: number,
  tube: number,
  arcLength: number,
): TorusGeometry {
  const geometry = new TorusGeometry(radius, tube, 4, 48, arcLength);
  geometry.rotateX(Math.PI / 2);
  geometry.rotateY(arcLength / 2 - Math.PI / 2);
  return geometry;
}

function createAuraGeometry(
  innerRadius: number,
  outerRadius: number,
  span: number,
): RingGeometry {
  const geometry = new RingGeometry(
    innerRadius,
    outerRadius,
    40,
    1,
    -Math.PI / 2 - span / 2,
    span,
  );
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function createSharedResources(config: GuardaVfxConfig): GuardaSharedResources {
  const textures = createGuardaTextures();
  const flameTexture = createFireBurstFlameTexture();
  const particleMaterials = createGuardaParticleMaterials(
    textures,
    flameTexture,
  );
  const shellMaterial = new MeshStandardMaterial({
    color: 0x7795a4,
    emissive: 0x354451,
    emissiveIntensity: 0.22,
    roughness: 0.6,
    metalness: 0.35,
    flatShading: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
  });
  const rimMaterial = new MeshBasicMaterial({
    color: 0xd4a017,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const auraMaterial = new MeshBasicMaterial({
    color: 0x8a6a2a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const rippleMaterial = new MeshBasicMaterial({
    color: 0xa33b3b,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const midTheta = config.shellThetaStart + config.shellThetaLength / 2;
  const midRingRadius = config.shellRadius * Math.sin(midTheta);
  return {
    textures,
    flameTexture,
    particleMaterials,
    shellGeometry: createShellGeometry(
      config.shellRadius,
      config.shellPhiLength,
      config.shellThetaStart,
      config.shellThetaLength,
    ),
    rimTopGeometry: createArcRingGeometry(
      config.shellRadius * Math.sin(config.shellThetaStart),
      0.024,
      config.shellPhiLength,
    ),
    rimBottomGeometry: createArcRingGeometry(
      config.shellRadius * Math.sin(config.shellThetaStart + config.shellThetaLength),
      0.024,
      config.shellPhiLength,
    ),
    rippleGeometry: createArcRingGeometry(midRingRadius, 0.03, config.shellPhiLength),
    auraGeometry: createAuraGeometry(
      config.auraInnerRadius,
      config.auraOuterRadius,
      config.auraSpan,
    ),
    shellMaterial,
    rimMaterial,
    auraMaterial,
    rippleMaterial,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

class GuardaCast {
  private readonly castGroup: Group;
  private readonly shellGroup: Group;
  private readonly shell: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly rimTop: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly rimBottom: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly aura: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly ripples: Mesh<TorusGeometry, MeshBasicMaterial>[] = [];
  private readonly rippleAges = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly waveSparks: ParticleSystem;
  private readonly flash: ParticleSystem;
  private readonly motes: ParticleSystem;
  private readonly systems: ParticleSystem[];
  private readonly direction: Vector3;
  private readonly wavesDone = [false, false, false];
  private phase: GuardaPhase = "rise";
  private elapsed = 0;
  private lightPulse = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: GuardaSharedResources,
    private readonly config: GuardaVfxConfig,
    position: Vector3,
    direction: Vector3,
    private readonly onDispose: (cast: GuardaCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.direction = direction.clone().normalize();

    this.castGroup = new Group();
    this.castGroup.name = "tk-guarda-cast";
    this.castGroup.position.set(position.x, 0, position.z);
    this.castGroup.rotation.y = Math.atan2(this.direction.x, this.direction.z);

    this.shellGroup = new Group();
    this.shellGroup.name = "tk-guarda-shell-group";
    this.shellGroup.position.set(0, config.originHeight, config.forwardOffset);
    this.shellGroup.scale.setScalar(0.55);

    this.shell = new Mesh(shared.shellGeometry, shared.shellMaterial.clone());
    this.shell.name = "tk-guarda-shell";
    this.shell.renderOrder = 7;

    this.rimTop = new Mesh(shared.rimTopGeometry, shared.rimMaterial.clone());
    this.rimTop.name = "tk-guarda-rim-top";
    this.rimTop.position.y = config.shellRadius * Math.cos(config.shellThetaStart);
    this.rimTop.renderOrder = 8;

    this.rimBottom = new Mesh(shared.rimBottomGeometry, shared.rimMaterial.clone());
    this.rimBottom.name = "tk-guarda-rim-bottom";
    this.rimBottom.position.y = config.shellRadius * Math.cos(config.shellThetaStart + config.shellThetaLength);
    this.rimBottom.renderOrder = 8;

    for (let index = 0; index < 3; index += 1) {
      const ripple = new Mesh(shared.rippleGeometry, shared.rippleMaterial.clone());
      ripple.name = `tk-guarda-ripple-${index}`;
      ripple.position.y = config.shellRadius
        * Math.cos(config.shellThetaStart + config.shellThetaLength / 2);
      ripple.visible = false;
      ripple.renderOrder = 9;
      this.ripples.push(ripple);
    }

    this.aura = new Mesh(shared.auraGeometry, shared.auraMaterial.clone());
    this.aura.name = "tk-guarda-aura";
    this.aura.position.set(0, 0.03, config.forwardOffset);
    this.aura.renderOrder = 6;

    this.shellGroup.add(this.shell, this.rimTop, this.rimBottom, ...this.ripples);
    this.castGroup.add(this.shellGroup, this.aura);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xd4a017, 7);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xd4a017, 0, 7, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.set(0, config.originHeight, config.forwardOffset * 0.8);
      this.castGroup.add(this.light);
    }
    this.castRoot.add(this.castGroup);

    const forward = this.direction;
    const frontPoint = position.clone().addScaledVector(
      forward,
      config.forwardOffset + config.shellRadius * 0.7,
    );
    frontPoint.y = config.originHeight;

    this.waveSparks = createGuardaWaveSparks(shared.particleMaterials, config);
    this.waveSparks.emitter.position.copy(frontPoint);
    this.flash = createGuardaFlash(shared.particleMaterials, config);
    this.flash.emitter.position.copy(frontPoint);
    const motesPosition = position.clone().addScaledVector(forward, config.forwardOffset * 0.8);
    this.motes = createGuardaAuraMotes(
      shared.particleMaterials,
      config,
      config.shieldDuration + config.fadeDuration,
    );
    this.motes.emitter.position.set(motesPosition.x, 0.05, motesPosition.z);
    this.systems = [this.waveSparks, this.flash, this.motes];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    this.motes.emitter.visible = true;
    this.motes.play();

    this.update(0);
  }

  getPhase(): GuardaPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      progress: Math.min(1, this.elapsed / this.config.shieldDuration),
      shellScale: this.shellGroup.scale.x,
      shellOpacity: this.shell.material.opacity,
      auraOpacity: this.aura.material.opacity,
      wavesTriggered: this.wavesDone.filter(Boolean).length,
      rippleAges: this.rippleAges.map((age) => Number.isFinite(age) ? age : -1),
      shellPosition: this.shellGroup.getWorldPosition(new Vector3()).toArray(),
      position: this.castGroup.position.toArray(),
      direction: this.direction.toArray(),
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
    this.elapsed = Math.min(
      this.elapsed + deltaTime,
      this.config.shieldDuration + this.config.fadeDuration,
    );
    this.updatePhase();
    for (let index = 0; index < 3; index += 1) {
      if (!this.wavesDone[index] && this.elapsed >= this.config.waveTimes[index]) {
        this.triggerWave(index);
      }
    }
    this.updateRipples(deltaTime);
    this.lightPulse = Math.max(0, this.lightPulse - deltaTime * 5.5);
    const factor = this.visibilityFactor();
    const breathe = this.phase === "rise"
      ? 1
      : 1 + Math.sin(this.elapsed * 7.5) * 0.012 * factor;
    this.shellGroup.scale.setScalar((0.55 + this.riseEase() * 0.45) * breathe);
    this.shell.material.opacity = 0.82 * factor;
    this.shellGroup.position.y = this.config.originHeight - (1 - this.riseEase()) * 0.65;
    this.rimTop.material.opacity = 0.48 * factor;
    this.rimBottom.material.opacity = 0.32 * factor;
    this.aura.material.opacity = 0.16 * factor * (1 + Math.sin(this.elapsed * 6.5) * 0.18);
    this.aura.rotation.y += deltaTime * 0.4;
    if (this.light) this.light.intensity = (0.9 + this.lightPulse * 3.4) * factor;
    if (this.elapsed >= this.config.shieldDuration + this.config.fadeDuration) {
      this.dispose();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    this.castRoot.remove(this.castGroup);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castGroup.remove(this.light);
      this.light.dispose();
    }
    this.shell.material.dispose();
    this.rimTop.material.dispose();
    this.rimBottom.material.dispose();
    this.aura.material.dispose();
    for (const ripple of this.ripples) ripple.material.dispose();
    this.onDispose(this);
  }

  private riseEase(): number {
    const progress = MathUtils.clamp(this.elapsed / this.config.riseDuration, 0, 1);
    return 1 - Math.pow(1 - progress, 3);
  }

  private visibilityFactor(): number {
    if (this.elapsed < this.config.shieldDuration) {
      return Math.min(1, (this.elapsed / this.config.riseDuration) * 0.9 + 0.1);
    }
    const fade = 1 - MathUtils.clamp(
      (this.elapsed - this.config.shieldDuration) / this.config.fadeDuration,
      0,
      1,
    );
    return Math.pow(fade, 1.4);
  }

  private updatePhase(): void {
    if (this.elapsed < this.config.riseDuration) this.phase = "rise";
    else if (this.elapsed < this.config.shieldDuration) this.phase = "hold";
    else this.phase = "fade";
  }

  private triggerWave(index: number): void {
    this.wavesDone[index] = true;
    this.rippleAges[index] = 0;
    this.ripples[index].visible = true;
    this.waveSparks.emitter.visible = true;
    this.waveSparks.restart();
    this.waveSparks.play();
    this.flash.emitter.visible = true;
    this.flash.restart();
    this.flash.play();
    this.lightPulse = 1;
  }

  private updateRipples(deltaTime: number): void {
    for (let index = 0; index < 3; index += 1) {
      if (!Number.isFinite(this.rippleAges[index])) continue;
      this.rippleAges[index] += deltaTime;
      const progress = MathUtils.clamp(
        this.rippleAges[index] / this.config.rippleDuration,
        0,
        1,
      );
      if (progress >= 1) {
        this.ripples[index].visible = false;
        this.ripples[index].material.opacity = 0;
        this.rippleAges[index] = Number.POSITIVE_INFINITY;
        continue;
      }
      this.ripples[index].scale.setScalar(0.72 + progress * 0.56);
      this.ripples[index].material.opacity = Math.pow(1 - progress, 2) * 0.9;
    }
  }
}

export class GuardaVfxController {
  private readonly shared: GuardaSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<GuardaCast>();
  private readonly config: GuardaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<GuardaVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_GUARDA_VFX_CONFIG, ...config };
    const finiteOr = (value: number, fallback: number, minimum: number) =>
      Number.isFinite(value) ? Math.max(minimum, value) : fallback;
    this.config = {
      riseDuration: finiteOr(merged.riseDuration, DEFAULT_GUARDA_VFX_CONFIG.riseDuration, 0.05),
      shieldDuration: finiteOr(merged.shieldDuration, DEFAULT_GUARDA_VFX_CONFIG.shieldDuration, 0.1),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_GUARDA_VFX_CONFIG.fadeDuration, 0.05),
      waveTimes: [...merged.waveTimes] as [number, number, number],
      maxConcurrentCasts: Math.floor(finiteOr(
        merged.maxConcurrentCasts,
        DEFAULT_GUARDA_VFX_CONFIG.maxConcurrentCasts,
        1,
      )),
      shellRadius: finiteOr(merged.shellRadius, DEFAULT_GUARDA_VFX_CONFIG.shellRadius, 0.2),
      shellPhiLength: finiteOr(merged.shellPhiLength, DEFAULT_GUARDA_VFX_CONFIG.shellPhiLength, 0.1),
      shellThetaStart: finiteOr(merged.shellThetaStart, DEFAULT_GUARDA_VFX_CONFIG.shellThetaStart, 0),
      shellThetaLength: finiteOr(merged.shellThetaLength, DEFAULT_GUARDA_VFX_CONFIG.shellThetaLength, 0.1),
      forwardOffset: finiteOr(merged.forwardOffset, DEFAULT_GUARDA_VFX_CONFIG.forwardOffset, 0),
      originHeight: finiteOr(merged.originHeight, DEFAULT_GUARDA_VFX_CONFIG.originHeight, 0.1),
      auraInnerRadius: finiteOr(merged.auraInnerRadius, DEFAULT_GUARDA_VFX_CONFIG.auraInnerRadius, 0.05),
      auraOuterRadius: finiteOr(merged.auraOuterRadius, DEFAULT_GUARDA_VFX_CONFIG.auraOuterRadius, 0.1),
      auraSpan: finiteOr(merged.auraSpan, DEFAULT_GUARDA_VFX_CONFIG.auraSpan, 0.2),
      rippleDuration: finiteOr(merged.rippleDuration, DEFAULT_GUARDA_VFX_CONFIG.rippleDuration, 0.05),
      sparkCount: Math.floor(finiteOr(merged.sparkCount, DEFAULT_GUARDA_VFX_CONFIG.sparkCount, 0)),
      flashCount: Math.floor(finiteOr(merged.flashCount, DEFAULT_GUARDA_VFX_CONFIG.flashCount, 0)),
      moteRate: Math.floor(finiteOr(merged.moteRate, DEFAULT_GUARDA_VFX_CONFIG.moteRate, 0)),
    };
    this.shared = createSharedResources(this.config);
    this.castRoot.name = "tk-guarda-vfx-root";
    this.batchedRenderer.name = "tk-guarda-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castGuarda(origin: Vector3, direction: Vector3): void {
    if (this.disposed) throw new Error("GuardaVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(direction)) return;
    const horizontal = new Vector3(direction.x, 0, direction.z);
    if (horizontal.lengthSq() < 1e-8) return;
    horizontal.normalize();
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as GuardaCast | undefined;
      oldestCast?.dispose();
    }
    const cast = new GuardaCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      origin.clone(),
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

  getPhase(): GuardaPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasFade = false;
    let hasHold = false;
    for (const cast of this.casts) {
      const phase = cast.getPhase();
      if (phase === "fade") hasFade = true;
      if (phase === "hold") hasHold = true;
    }
    if (hasFade) return "fade";
    if (hasHold) return "hold";
    return "rise";
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
    this.shared.shellGeometry.dispose();
    this.shared.rimTopGeometry.dispose();
    this.shared.rimBottomGeometry.dispose();
    this.shared.rippleGeometry.dispose();
    this.shared.auraGeometry.dispose();
    this.shared.shellMaterial.dispose();
    this.shared.rimMaterial.dispose();
    this.shared.auraMaterial.dispose();
    this.shared.rippleMaterial.dispose();
    this.shared.flameTexture.dispose();
    disposeGuardaParticleMaterials(this.shared.particleMaterials);
    disposeGuardaTextures(this.shared.textures);
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

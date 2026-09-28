import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createDesafioHaloEmbers,
  createDesafioMarkDust,
  createDesafioParticleMaterials,
  createDesafioSnapSparks,
  disposeDesafioParticleMaterials,
  type DesafioParticleMaterials,
} from "./DesafioParticleSystems";
import {
  createDesafioTextures,
  disposeDesafioTextures,
  type DesafioTextureSet,
} from "./DesafioTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface DesafioVfxConfig {
  aimDuration: number;
  holdDuration: number;
  cleanupDelay: number;
  maxConcurrentCasts: number;
  originHeight: number;
  targetHeight: number;
  markRadius: number;
  haloEmberEmission: number;
  snapSparkCount: number;
  markDustCount: number;
}

export const DEFAULT_DESAFIO_VFX_CONFIG: DesafioVfxConfig = {
  aimDuration: 0.6,
  holdDuration: 0.6,
  cleanupDelay: 0.3,
  maxConcurrentCasts: 3,
  originHeight: 1.12,
  targetHeight: 0.95,
  markRadius: 0.78,
  haloEmberEmission: 16,
  snapSparkCount: 3,
  markDustCount: 12,
};

type DesafioPhase = "aim" | "hold" | "seal";

interface DesafioSharedResources {
  textures: DesafioTextureSet;
  particleMaterials: DesafioParticleMaterials;
  coreGeometry: CylinderGeometry;
  sheathGeometry: CylinderGeometry;
  ringInnerGeometry: TorusGeometry;
  ringOuterGeometry: TorusGeometry;
  tickGeometry: CylinderGeometry;
  haloGeometry: TorusGeometry;
  flashGeometry: SphereGeometry;
}

function createSharedResources(config: DesafioVfxConfig): DesafioSharedResources {
  const textures = createDesafioTextures();
  const particleMaterials = createDesafioParticleMaterials(textures);
  const coreGeometry = new CylinderGeometry(0.018, 0.018, 1, 8, 1, true);
  const sheathGeometry = new CylinderGeometry(0.055, 0.055, 1, 10, 1, true);
  const ringInnerGeometry = new TorusGeometry(config.markRadius * 0.62, 0.016, 6, 48);
  const ringOuterGeometry = new TorusGeometry(config.markRadius, 0.012, 6, 56);
  ringInnerGeometry.rotateX(-Math.PI / 2);
  ringOuterGeometry.rotateX(-Math.PI / 2);
  const tickGeometry = new CylinderGeometry(0.014, 0.014, 0.17, 5);
  tickGeometry.rotateZ(Math.PI / 2);
  const haloGeometry = new TorusGeometry(0.42, 0.02, 6, 40);
  haloGeometry.rotateX(-Math.PI / 2);
  const flashGeometry = new SphereGeometry(1, 14, 10);
  return {
    textures,
    particleMaterials,
    coreGeometry,
    sheathGeometry,
    ringInnerGeometry,
    ringOuterGeometry,
    tickGeometry,
    haloGeometry,
    flashGeometry,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

class DesafioCast {
  private readonly castGroup: Group;
  private readonly beamGroup: Group;
  private readonly core: Mesh<CylinderGeometry, MeshBasicMaterial>;
  private readonly sheath: Mesh<CylinderGeometry, MeshBasicMaterial>;
  private readonly markGroup: Group;
  private readonly ringA: Group;
  private readonly ringB: Group;
  private readonly halo: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly glow: Sprite;
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly haloEmbers: ParticleSystem;
  private readonly snapSparks: ParticleSystem;
  private readonly markDust: ParticleSystem;
  private readonly systems: ParticleSystem[];
  private readonly origin: Vector3;
  private readonly target: Vector3;
  private readonly beamDirection: Vector3;
  private readonly beamMidpoint: Vector3;
  private readonly beamTremorAxis: Vector3;
  private phase: DesafioPhase = "aim";
  private elapsed = 0;
  private phaseElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: DesafioSharedResources,
    private readonly config: DesafioVfxConfig,
    origin: Vector3,
    target: Vector3,
    private readonly onDispose: (cast: DesafioCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.origin = origin.clone();
    this.target = target.clone();
    this.beamDirection = target.clone().sub(origin).normalize();
    this.beamMidpoint = origin.clone().add(target).multiplyScalar(0.5);
    const flat = new Vector3(this.beamDirection.x, 0, this.beamDirection.z);
    this.beamTremorAxis = Math.abs(flat.lengthSq()) > 1e-8
      ? flat.cross(new Vector3(0, 1, 0)).normalize()
      : new Vector3(1, 0, 0);

    this.castGroup = new Group();
    this.castGroup.name = "tk-desafio-cast";

    const beamLength = origin.distanceTo(target);
    this.beamGroup = new Group();
    this.beamGroup.name = "tk-desafio-beam";
    this.beamGroup.position.copy(this.beamMidpoint);
    this.beamGroup.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      this.beamDirection,
    );
    this.core = new Mesh(shared.coreGeometry, new MeshBasicMaterial({
      color: 0xffd9c4,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    }));
    this.core.name = "tk-desafio-beam-core";
    this.core.scale.set(1, beamLength, 1);
    this.core.renderOrder = 11;
    this.sheath = new Mesh(shared.sheathGeometry, new MeshBasicMaterial({
      map: shared.textures.beam,
      color: 0xd46a5a,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    }));
    this.sheath.name = "tk-desafio-beam-sheath";
    this.sheath.scale.set(1, beamLength, 1);
    this.sheath.renderOrder = 10;
    this.beamGroup.add(this.sheath, this.core);
    this.castGroup.add(this.beamGroup);

    const groundY = Math.max(0, target.y - config.targetHeight) + 0.02;
    this.markGroup = new Group();
    this.markGroup.name = "tk-desafio-mark";
    this.markGroup.position.set(target.x, groundY, target.z);

    const markMaterial = new MeshBasicMaterial({
      map: shared.textures.beam,
      color: 0xd46a5a,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    });
    this.ringA = new Group();
    this.ringA.name = "tk-desafio-mark-ring-a";
    this.ringB = new Group();
    this.ringB.name = "tk-desafio-mark-ring-b";
    const ringInner = new Mesh(shared.ringInnerGeometry, markMaterial);
    const ringOuter = new Mesh(shared.ringOuterGeometry, markMaterial);
    this.ringA.add(ringInner);
    this.ringB.add(ringOuter);
    for (let index = 0; index < 4; index += 1) {
      const angleInner = (index / 4) * Math.PI * 2;
      const tickInner = new Mesh(shared.tickGeometry, markMaterial);
      tickInner.position.set(Math.cos(angleInner) * config.markRadius * 0.62, 0, Math.sin(angleInner) * config.markRadius * 0.62);
      tickInner.rotation.y = -angleInner;
      this.ringA.add(tickInner);
      const angleOuter = angleInner + Math.PI / 4;
      const tickOuter = new Mesh(shared.tickGeometry, markMaterial);
      tickOuter.position.set(Math.cos(angleOuter) * config.markRadius, 0, Math.sin(angleOuter) * config.markRadius);
      tickOuter.rotation.y = -angleOuter;
      tickOuter.scale.setScalar(0.72);
      this.ringB.add(tickOuter);
    }
    this.markGroup.add(this.ringA, this.ringB);
    this.castGroup.add(this.markGroup);

    this.halo = new Mesh(shared.haloGeometry, new MeshBasicMaterial({
      map: shared.textures.beam,
      color: 0xd46a5a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    }));
    this.halo.name = "tk-desafio-halo";
    this.halo.position.set(target.x, target.y, target.z);
    this.halo.renderOrder = 10;
    this.castGroup.add(this.halo);

    this.glow = new Sprite(new SpriteMaterial({
      map: shared.textures.glow,
      color: 0xd46a5a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    }));
    this.glow.name = "tk-desafio-glow";
    this.glow.position.copy(this.target);
    this.castGroup.add(this.glow);

    this.flash = new Mesh(shared.flashGeometry, new MeshBasicMaterial({
      color: 0xffcdb0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }));
    this.flash.name = "tk-desafio-flash";
    this.flash.visible = false;
    this.flash.position.copy(this.target);
    this.castGroup.add(this.flash);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xd4573f, 7);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xd4573f, 0, 7, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.copy(this.target);
      this.castGroup.add(this.light);
    }
    this.castRoot.add(this.castGroup);

    this.haloEmbers = createDesafioHaloEmbers(shared.particleMaterials, config);
    this.haloEmbers.emitter.position.copy(this.target);
    this.snapSparks = createDesafioSnapSparks(shared.particleMaterials, config);
    this.snapSparks.emitter.position.copy(this.target);
    this.markDust = createDesafioMarkDust(shared.particleMaterials, config);
    this.markDust.emitter.position.set(target.x, groundY + 0.06, target.z);
    this.systems = [this.haloEmbers, this.snapSparks, this.markDust];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    this.haloEmbers.emitter.visible = true;
    this.haloEmbers.play();
    this.markDust.emitter.visible = true;
    this.markDust.play();

    this.updateAim(0);
  }

  getPhase(): DesafioPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      progress: this.getPhaseProgress(),
      markRotationA: this.ringA.rotation.y,
      markRotationB: this.ringB.rotation.y,
      beamVisible: this.beamGroup.visible,
      beamMidpoint: this.beamGroup.position.toArray(),
      haloHeight: this.halo.position.y,
      origin: this.origin.toArray(),
      target: this.target.toArray(),
      sealAge: this.phase === "seal" ? this.phaseElapsed : 0,
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
    this.elapsed += deltaTime;
    this.phaseElapsed += deltaTime;
    if (this.phase === "aim") {
      this.updateAim(deltaTime);
      return;
    }
    if (this.phase === "hold") {
      this.updateHold(deltaTime);
      return;
    }
    this.updateSeal(deltaTime);
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
    this.core.material.dispose();
    this.sheath.material.dispose();
    (this.ringA.children[0] as Mesh<TorusGeometry, MeshBasicMaterial>).material.dispose();
    this.halo.material.dispose();
    this.glow.material.dispose();
    this.flash.material.dispose();
    this.castGroup.clear();
    this.onDispose(this);
  }

  private getPhaseProgress(): number {
    const duration = this.phase === "aim"
      ? this.config.aimDuration
      : this.phase === "hold"
        ? this.config.holdDuration
        : this.config.cleanupDelay;
    return MathUtils.clamp(this.phaseElapsed / duration, 0, 1);
  }

  private updateAim(deltaTime: number): void {
    this.phaseElapsed = Math.min(this.phaseElapsed, this.config.aimDuration);
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.aimDuration, 0, 1);
    const pulse = Math.sin(this.elapsed * 21.6);
    const tremor = Math.sin(this.elapsed * 46.7) * this.beamTremorAxis.x * 0.014;
    const tremorY = Math.sin(this.elapsed * 31.3 + 1.4) * 0.012;
    this.beamGroup.position.set(
      this.beamMidpoint.x + tremor,
      this.beamMidpoint.y + tremorY,
      this.beamMidpoint.z + Math.sin(this.elapsed * 46.7) * this.beamTremorAxis.z * 0.014,
    );
    const coreScale = 1 + pulse * 0.3;
    this.core.scale.set(coreScale, this.origin.distanceTo(this.target), coreScale);
    this.sheath.scale.set(1 + pulse * 0.14, this.origin.distanceTo(this.target), 1 + pulse * 0.14);
    this.core.material.opacity = 0.8 + pulse * 0.2;
    this.sheath.material.opacity = 0.58 + Math.sin(this.elapsed * 17.3) * 0.12;

    this.ringA.rotation.y = this.elapsed * 2.4;
    this.ringB.rotation.y = -this.elapsed * 1.7;
    const markGrow = 0.55 + 0.45 * Math.min(1, this.phaseElapsed / 0.18);
    this.markGroup.scale.setScalar(markGrow);

    this.halo.position.y = this.target.y + 0.12 + progress * 0.5;
    this.halo.material.opacity = 0.4 + Math.sin(this.elapsed * 9.4) * 0.16;
    this.halo.scale.setScalar(1 - progress * 0.24);
    this.glow.material.opacity = 0.28 + progress * 0.3;
    this.glow.scale.setScalar(1.15 + progress * 0.55);
    if (this.light) this.light.intensity = 1.1 + Math.sin(this.elapsed * 12.8) * 0.55 + progress * 0.9;

    if (this.phaseElapsed >= this.config.aimDuration) this.enterHold();
    void deltaTime;
  }

  private enterHold(): void {
    this.phase = "hold";
    this.phaseElapsed = 0;
    this.beamGroup.visible = false;
    this.haloEmbers.endEmit();
  }

  private updateHold(deltaTime: number): void {
    void deltaTime;
    this.phaseElapsed = Math.min(this.phaseElapsed, this.config.holdDuration);
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.holdDuration, 0, 1);
    this.ringA.rotation.y = this.elapsed * 2.4;
    this.ringB.rotation.y = -this.elapsed * 1.7;
    this.halo.position.y = this.target.y + 0.62 + progress * 0.7;
    this.halo.material.opacity = (0.56 - progress * 0.3) + Math.sin(this.elapsed * 9.4) * 0.1;
    this.halo.scale.setScalar(0.76 - progress * 0.3);
    this.glow.material.opacity = 0.58 + progress * 0.24;
    this.glow.scale.setScalar(1.7 + progress * 0.5);
    if (this.light) this.light.intensity = 2 + progress * 2.4 + Math.sin(this.elapsed * 18.2) * 0.5;
    if (this.phaseElapsed >= this.config.holdDuration) this.enterSeal();
  }

  private enterSeal(): void {
    this.phase = "seal";
    this.phaseElapsed = 0;
    this.snapSparks.emitter.visible = true;
    this.snapSparks.restart();
    this.snapSparks.play();
    this.flash.visible = true;
    this.flash.scale.setScalar(0.12);
    this.flash.material.opacity = 1;
    if (this.light) this.light.intensity = 6.6;
    this.halo.visible = false;
    this.glow.visible = false;
  }

  private updateSeal(deltaTime: number): void {
    void deltaTime;
    this.phaseElapsed = Math.min(this.phaseElapsed, this.config.cleanupDelay);
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.cleanupDelay, 0, 1);
    const flashProgress = MathUtils.clamp(this.phaseElapsed / 0.14, 0, 1);
    this.flash.scale.setScalar(0.12 + flashProgress * 0.66);
    this.flash.material.opacity = Math.pow(1 - flashProgress, 2);
    this.flash.visible = flashProgress < 1;
    if (this.light) this.light.intensity = 6.6 * Math.pow(1 - progress, 2);
    this.markGroup.scale.setScalar(Math.max(0.001, 1 - progress * 2.6));
    this.markGroup.visible = progress < 0.4;
    if (this.phaseElapsed >= this.config.cleanupDelay) this.dispose();
  }
}

export class DesafioVfxController {
  private readonly shared: DesafioSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<DesafioCast>();
  private readonly config: DesafioVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<DesafioVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_DESAFIO_VFX_CONFIG, ...config };
    const finiteOr = (value: number, fallback: number, minimum: number) =>
      Number.isFinite(value) ? Math.max(minimum, value) : fallback;
    this.config = {
      aimDuration: finiteOr(merged.aimDuration, DEFAULT_DESAFIO_VFX_CONFIG.aimDuration, 0.05),
      holdDuration: finiteOr(merged.holdDuration, DEFAULT_DESAFIO_VFX_CONFIG.holdDuration, 0.05),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_DESAFIO_VFX_CONFIG.cleanupDelay, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(
        merged.maxConcurrentCasts,
        DEFAULT_DESAFIO_VFX_CONFIG.maxConcurrentCasts,
        1,
      )),
      originHeight: finiteOr(merged.originHeight, DEFAULT_DESAFIO_VFX_CONFIG.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_DESAFIO_VFX_CONFIG.targetHeight, 0),
      markRadius: finiteOr(merged.markRadius, DEFAULT_DESAFIO_VFX_CONFIG.markRadius, 0.1),
      haloEmberEmission: Math.floor(finiteOr(
        merged.haloEmberEmission,
        DEFAULT_DESAFIO_VFX_CONFIG.haloEmberEmission,
        0,
      )),
      snapSparkCount: Math.floor(finiteOr(
        merged.snapSparkCount,
        DEFAULT_DESAFIO_VFX_CONFIG.snapSparkCount,
        0,
      )),
      markDustCount: Math.floor(finiteOr(
        merged.markDustCount,
        DEFAULT_DESAFIO_VFX_CONFIG.markDustCount,
        0,
      )),
    };
    this.shared = createSharedResources(this.config);
    this.castRoot.name = "tk-desafio-vfx-root";
    this.batchedRenderer.name = "tk-desafio-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castDesafio(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("DesafioVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (origin.distanceToSquared(target) < 1e-6) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as DesafioCast | undefined;
      oldestCast?.dispose();
    }
    const castOrigin = origin.clone();
    castOrigin.y = Math.max(origin.y, this.config.originHeight);
    const castTarget = target.clone();
    castTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new DesafioCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      castOrigin,
      castTarget,
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

  getPhase(): DesafioPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasSeal = false;
    let hasHold = false;
    for (const cast of this.casts) {
      const phase = cast.getPhase();
      if (phase === "seal") hasSeal = true;
      if (phase === "hold") hasHold = true;
    }
    if (hasSeal) return "seal";
    return hasHold ? "hold" : "aim";
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
    this.shared.coreGeometry.dispose();
    this.shared.sheathGeometry.dispose();
    this.shared.ringInnerGeometry.dispose();
    this.shared.ringOuterGeometry.dispose();
    this.shared.tickGeometry.dispose();
    this.shared.haloGeometry.dispose();
    this.shared.flashGeometry.dispose();
    disposeDesafioParticleMaterials(this.shared.particleMaterials);
    disposeDesafioTextures(this.shared.textures);
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

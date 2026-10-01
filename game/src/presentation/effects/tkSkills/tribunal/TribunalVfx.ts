import {
  AdditiveBlending,
  CylinderGeometry,
  DodecahedronGeometry,
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
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createTribunalDescentSystems,
  createTribunalFinalSystems,
  createTribunalParticleMaterials,
  createTribunalTouchdownSystems,
  disposeTribunalParticleMaterials,
  type TribunalDescentSystems,
  type TribunalFinalSystems,
  type TribunalParticleMaterials,
  type TribunalTouchdownSystems,
} from "./TribunalParticleSystems";
import {
  createTribunalTextures,
  disposeTribunalTextures,
  type TribunalTextureSet,
} from "./TribunalTextures";
import type { TkLightPool } from "../../TkLightPool";

export const TRIBUNAL_PILLAR_COUNT = 5;

export interface TribunalVfxConfig {
  descentDuration: number;
  fissureDuration: number;
  finalDuration: number;
  cleanupDelay: number;
  maxConcurrentCasts: number;
  circleRadius: number;
  pillarHeight: number;
  pillarRadius: number;
  stoneRise: number;
  trailEmission: number;
  sparkEmission: number;
  touchdownBurstCount: number;
  finalBurstCount: number;
  lightIntensity: number;
  finalLightIntensity: number;
  targetHeight: number;
}

export const DEFAULT_TRIBUNAL_VFX_CONFIG: TribunalVfxConfig = {
  descentDuration: 0.25,
  fissureDuration: 0.38,
  finalDuration: 0.3,
  cleanupDelay: 0.95,
  maxConcurrentCasts: 2,
  circleRadius: 4.2,
  pillarHeight: 9,
  pillarRadius: 0.34,
  stoneRise: 0.42,
  trailEmission: 48,
  sparkEmission: 22,
  touchdownBurstCount: 24,
  finalBurstCount: 44,
  lightIntensity: 6,
  finalLightIntensity: 9.6,
  targetHeight: 0.05,
};

type CastPhase = "descent" | "fissures" | "impact";

interface TribunalSharedResources {
  textures: TribunalTextureSet;
  particleMaterials: TribunalParticleMaterials;
  columnGeometry: CylinderGeometry;
  coreGeometry: CylinderGeometry;
  headGeometry: SphereGeometry;
  columnMaterial: MeshBasicMaterial;
  coreMaterial: MeshBasicMaterial;
  headMaterial: MeshBasicMaterial;
  shockGeometry: RingGeometry;
  shockMaterial: MeshBasicMaterial;
  flashGeometry: SphereGeometry;
  flashMaterial: MeshBasicMaterial;
  fissureGeometry: PlaneGeometry;
  stoneGeometry: DodecahedronGeometry;
  stoneMaterial: MeshStandardMaterial;
}

function createSharedResources(): TribunalSharedResources {
  const textures = createTribunalTextures();
  const particleMaterials = createTribunalParticleMaterials(textures);
  const columnGeometry = new CylinderGeometry(1, 1.3, 1, 18, 1, true);
  columnGeometry.translate(0, -0.5, 0);
  const coreGeometry = new CylinderGeometry(1, 1.2, 1, 12, 1, true);
  coreGeometry.translate(0, -0.5, 0);
  const headGeometry = new SphereGeometry(0.3, 16, 12);
  const columnMaterial = new MeshBasicMaterial({
    map: textures.beam,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const coreMaterial = columnMaterial.clone();
  coreMaterial.opacity = 0;
  const headMaterial = new MeshBasicMaterial({
    map: textures.beam,
    color: 0xffe9a8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const shockGeometry = new RingGeometry(0.34, 0.5, 48);
  const shockMaterial = new MeshBasicMaterial({
    color: 0xffd060,
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
    color: 0xfff3c8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const fissureGeometry = new PlaneGeometry(1, 0.16);
  fissureGeometry.rotateX(-Math.PI / 2);
  const stoneGeometry = new DodecahedronGeometry(0.09, 0);
  const stoneMaterial = new MeshStandardMaterial({
    color: 0x4a3a26,
    emissive: 0xd4a017,
    emissiveIntensity: 0.4,
    roughness: 0.7,
    metalness: 0.2,
  });
  return {
    textures,
    particleMaterials,
    columnGeometry,
    coreGeometry,
    headGeometry,
    columnMaterial,
    coreMaterial,
    headMaterial,
    shockGeometry,
    shockMaterial,
    flashGeometry,
    flashMaterial,
    fissureGeometry,
    stoneGeometry,
    stoneMaterial,
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

interface TribunalPillar {
  angle: number;
  position: Vector3;
  column: Mesh;
  core: Mesh;
  head: Mesh;
  shock: Mesh;
  shockMaterial: MeshBasicMaterial;
  flash: Mesh;
  flashMaterial: MeshBasicMaterial;
  systems: TribunalDescentSystems;
  touchdown: TribunalTouchdownSystems;
}

interface TribunalFissure {
  strip: Mesh;
  material: MeshBasicMaterial;
  length: number;
  start: number;
}

class TribunalCast {
  private readonly pillars: TribunalPillar[] = [];
  private readonly fissures: TribunalFissure[] = [];
  private readonly stones: Mesh[] = [];
  private readonly finalSystems: TribunalFinalSystems;
  private readonly systems: ParticleSystem[] = [];
  private readonly finalFlash: Mesh;
  private readonly finalFlashMaterial: MeshBasicMaterial;
  private readonly finalShock: Mesh;
  private readonly finalShockMaterial: MeshBasicMaterial;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private phase: CastPhase = "descent";
  private elapsed = 0;
  private impactElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: TribunalSharedResources,
    private readonly config: TribunalVfxConfig,
    private readonly target: Vector3,
    private readonly onDispose: (cast: TribunalCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    for (let index = 0; index < TRIBUNAL_PILLAR_COUNT; index += 1) {
      const angle = index * Math.PI * 2 / TRIBUNAL_PILLAR_COUNT + Math.PI / TRIBUNAL_PILLAR_COUNT;
      this.pillars.push(this.createPillar(scene, batchedRenderer, shared, config, angle));
    }
    for (let index = 0; index < TRIBUNAL_PILLAR_COUNT; index += 1) {
      const current = this.pillars[index].position;
      const next = this.pillars[(index + 1) % TRIBUNAL_PILLAR_COUNT].position;
      this.fissures.push(this.createFissure(shared, current, next, index));
      this.stones.push(this.createStone(shared, current, next, index));
    }
    this.finalSystems = createTribunalFinalSystems(shared.particleMaterials, config);
    for (const system of this.finalSystems.all) {
      system.emitter.position.set(this.target.x, this.target.y + 0.1, this.target.z);
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
      this.systems.push(system);
    }

    this.finalFlashMaterial = shared.flashMaterial.clone();
    this.finalFlash = new Mesh(shared.flashGeometry, this.finalFlashMaterial);
    this.finalFlash.name = "tk-tribunal-final-core";
    this.finalFlash.visible = false;
    this.finalShockMaterial = shared.shockMaterial.clone();
    this.finalShock = new Mesh(shared.shockGeometry, this.finalShockMaterial);
    this.finalShock.name = "tk-tribunal-final-shock";
    this.finalShock.rotation.x = -Math.PI / 2;
    this.finalShock.position.set(this.target.x, this.target.y + 0.03, this.target.z);
    this.finalShock.visible = false;
    this.finalShock.renderOrder = 11;
    this.castRoot.add(this.finalFlash, this.finalShock);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xffc84a, 12);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xffc84a, 0, 12, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.set(this.target.x, this.target.y + 2.4, this.target.z);
      this.castRoot.add(this.light);
    }
  }

  private createPillar(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    shared: TribunalSharedResources,
    config: TribunalVfxConfig,
    angle: number,
  ): TribunalPillar {
    const position = new Vector3(
      this.target.x + Math.cos(angle) * config.circleRadius,
      this.target.y,
      this.target.z + Math.sin(angle) * config.circleRadius,
    );
    const column = new Mesh(shared.columnGeometry, shared.columnMaterial.clone());
    column.name = "tk-tribunal-pillar";
    column.scale.set(config.pillarRadius, 0.001, config.pillarRadius);
    column.position.set(position.x, this.target.y + config.pillarHeight, position.z);
    column.renderOrder = 9;
    const core = new Mesh(shared.coreGeometry, shared.coreMaterial.clone());
    core.name = "tk-tribunal-pillar-core";
    core.position.copy(column.position);
    core.renderOrder = 9;
    const head = new Mesh(shared.headGeometry, shared.headMaterial.clone());
    head.name = "tk-tribunal-pillar-head";
    head.position.set(position.x, position.y + config.pillarHeight, position.z);
    head.scale.setScalar(0.32);
    head.renderOrder = 10;
    const shockMaterial = shared.shockMaterial.clone();
    const shock = new Mesh(shared.shockGeometry, shockMaterial);
    shock.name = "tk-tribunal-shock";
    shock.rotation.x = -Math.PI / 2;
    shock.position.set(position.x, position.y + 0.02, position.z);
    shock.visible = false;
    shock.renderOrder = 11;
    const flashMaterial = shared.flashMaterial.clone();
    const flash = new Mesh(shared.flashGeometry, flashMaterial);
    flash.name = "tk-tribunal-flash";
    flash.visible = false;
    this.castRoot.add(column, core, head, shock, flash);

    const systems = createTribunalDescentSystems(shared.particleMaterials, config);
    const touchdown = createTribunalTouchdownSystems(shared.particleMaterials, config);
    for (const system of [...systems.all, ...touchdown.all]) {
      system.emitter.position.copy(head.position);
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
      this.systems.push(system);
    }
    for (const system of systems.all) system.play();
    return {
      angle,
      position,
      column,
      core,
      head,
      shock,
      shockMaterial,
      flash,
      flashMaterial,
      systems,
      touchdown,
    };
  }

  private createFissure(
    shared: TribunalSharedResources,
    from: Vector3,
    to: Vector3,
    index: number,
  ): TribunalFissure {
    const midX = (from.x + to.x) / 2;
    const midZ = (from.z + to.z) / 2;
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const material = new MeshBasicMaterial({
      map: shared.textures.fissure,
      color: 0xffd870,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    const strip = new Mesh(shared.fissureGeometry, material);
    strip.name = `tk-tribunal-fissure-${index}`;
    strip.position.set(midX, this.target.y + 0.025 + index * 0.001, midZ);
    strip.rotation.y = -Math.atan2(to.z - from.z, to.x - from.x);
    strip.scale.set(0.05, 1, 0.7);
    strip.renderOrder = 10;
    strip.visible = false;
    this.castRoot.add(strip);
    return { strip, material, length, start: index * 0.05 };
  }

  private createStone(
    shared: TribunalSharedResources,
    from: Vector3,
    to: Vector3,
    index: number,
  ): Mesh {
    const stone = new Mesh(shared.stoneGeometry, shared.stoneMaterial);
    stone.name = `tk-tribunal-stone-${index}`;
    const outward = new Vector3(
      (from.x + to.x) / 2 - this.target.x,
      0,
      (from.z + to.z) / 2 - this.target.z,
    ).normalize();
    stone.position.set(
      (from.x + to.x) / 2 + outward.x * 0.28,
      this.target.y + 0.05,
      (from.z + to.z) / 2 + outward.z * 0.28,
    );
    stone.rotation.set(index, index * 1.3, index * 0.7);
    stone.visible = false;
    this.castRoot.add(stone);
    return stone;
  }

  getPhase(): CastPhase {
    return this.phase;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      progress: this.phase === "descent"
        ? Math.min(1, this.elapsed / this.config.descentDuration)
        : 1,
      fissureProgress: this.phase === "descent"
        ? 0
        : this.phase === "impact" ? 1 : Math.min(1, this.elapsed / this.config.fissureDuration),
      impactAge: this.impactElapsed,
      target: this.target.toArray(),
      light: this.light?.position.toArray() ?? [0, 0, 0],
      lightIntensity: this.light?.intensity ?? 0,
      pillars: this.pillars.map((pillar) => ({
        position: pillar.position.toArray(),
        head: pillar.head.position.toArray(),
        landed: pillar.head.position.y <= pillar.position.y + 1e-6,
        columnOpacity: (pillar.column.material as MeshBasicMaterial).opacity,
      })),
      fissures: this.fissures.map((fissure) => ({
        visible: fissure.strip.visible,
        extension: fissure.strip.scale.x / Math.max(fissure.length, 1e-6),
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
    if (this.phase === "descent") {
      this.updateDescent(deltaTime);
      return;
    }
    if (this.phase === "fissures") {
      this.updateFissures(deltaTime);
      return;
    }
    this.updateImpact(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    for (const pillar of this.pillars) {
      for (const system of pillar.systems.all) system.dispose();
      for (const system of pillar.touchdown.all) system.dispose();
      this.castRoot.remove(pillar.column, pillar.core, pillar.head, pillar.shock, pillar.flash);
      (pillar.column.material as MeshBasicMaterial).dispose();
      (pillar.core.material as MeshBasicMaterial).dispose();
      (pillar.head.material as MeshBasicMaterial).dispose();
      pillar.shockMaterial.dispose();
      pillar.flashMaterial.dispose();
    }
    for (const fissure of this.fissures) {
      this.castRoot.remove(fissure.strip);
      fissure.material.dispose();
    }
    for (const stone of this.stones) this.castRoot.remove(stone);
    this.castRoot.remove(this.finalFlash, this.finalShock);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.finalFlashMaterial.dispose();
    this.finalShockMaterial.dispose();
    this.onDispose(this);
  }

  private updateDescent(_deltaTime: number): void {
    const progress = MathUtils.clamp(this.elapsed / this.config.descentDuration, 0, 1);
    const eased = progress * progress;
    const headY = this.target.y + this.config.pillarHeight * (1 - eased);
    for (const pillar of this.pillars) {
      pillar.head.position.set(pillar.position.x, headY, pillar.position.z);
      const columnTop = this.target.y + this.config.pillarHeight;
      const columnSpan = Math.max(columnTop - headY, 0.001);
      pillar.column.scale.set(this.config.pillarRadius, columnSpan, this.config.pillarRadius);
      pillar.core.scale.set(this.config.pillarRadius * 0.42, columnSpan, this.config.pillarRadius * 0.42);
      (pillar.column.material as MeshBasicMaterial).opacity = 0.55 + progress * 0.35;
      (pillar.core.material as MeshBasicMaterial).opacity = 0.85;
      for (const system of pillar.systems.all) {
        system.emitter.position.copy(pillar.head.position);
      }
    }
    this.moveLightAlongCircle(this.target.y + 2.2 + eased * 0.6, progress * this.config.lightIntensity * 0.6);
    if (progress >= 1) this.triggerTouchdown();
  }

  private triggerTouchdown(): void {
    this.phase = "fissures";
    this.elapsed = 0;
    for (const pillar of this.pillars) {
      pillar.head.visible = false;
      for (const system of pillar.systems.all) system.endEmit();
      for (const system of pillar.touchdown.all) {
        system.emitter.position.set(pillar.position.x, pillar.position.y + 0.12, pillar.position.z);
        system.emitter.visible = true;
        system.restart();
        system.play();
      }
      pillar.flash.position.set(pillar.position.x, pillar.position.y + 0.3, pillar.position.z);
      pillar.flash.scale.setScalar(0.16);
      pillar.flashMaterial.opacity = 1;
      pillar.flash.visible = true;
      pillar.shock.scale.setScalar(0.2);
      pillar.shockMaterial.opacity = 0.3;
      pillar.shock.visible = true;
    }
    if (this.light) {
      this.light.position.set(this.target.x, this.target.y + 1.6, this.target.z);
      this.light.intensity = this.config.lightIntensity;
    }
  }

  private updateFissures(deltaTime: number): void {
    const progress = MathUtils.clamp(this.elapsed / this.config.fissureDuration, 0, 1);
    for (const pillar of this.pillars) {
      const flashProgress = MathUtils.clamp(this.elapsed / 0.16, 0, 1);
      pillar.flash.scale.setScalar(0.16 + flashProgress * 0.5);
      pillar.flashMaterial.opacity = Math.pow(1 - flashProgress, 2) * 0.9;
      pillar.flash.visible = flashProgress < 1;
      const shockProgress = MathUtils.clamp(this.elapsed / 0.3, 0, 1);
      pillar.shock.scale.setScalar(0.2 + shockProgress * 2.4);
      pillar.shockMaterial.opacity = Math.pow(1 - shockProgress, 2) * 0.3;
      pillar.shock.visible = shockProgress < 1;
    }
    for (const fissure of this.fissures) {
      const local = this.elapsed - fissure.start;
      const extend = MathUtils.clamp(local / 0.14, 0, 1);
      fissure.strip.visible = extend > 0;
      fissure.strip.scale.set(
        Math.max(fissure.length * easeOutCubic(extend), 0.05),
        1,
        0.7 + extend * 0.35,
      );
      fissure.material.opacity = extend * 0.95;
    }
    for (const stone of this.stones) {
      stone.visible = progress > 0.15;
      const rise = MathUtils.clamp((progress - 0.15) / 0.5, 0, 1) * this.config.stoneRise;
      stone.position.y = this.target.y + 0.05 + rise;
      stone.rotation.y += deltaTime * 2.4;
    }
    this.moveLightAlongCircle(
      this.target.y + 2.2,
      this.config.lightIntensity * (0.75 + Math.sin(progress * Math.PI * 4) * 0.25),
      progress,
    );
    if (progress >= 1) this.triggerFinalImpact();
  }

  private triggerFinalImpact(): void {
    this.phase = "impact";
    this.impactElapsed = 0;
    this.finalFlash.position.set(this.target.x, this.target.y + 0.5, this.target.z);
    this.finalFlash.scale.setScalar(0.26);
    this.finalFlashMaterial.opacity = 1;
    this.finalFlash.visible = true;
    this.finalShock.scale.setScalar(0.3);
    this.finalShockMaterial.opacity = 0.38;
    this.finalShock.visible = true;
    for (const system of this.finalSystems.all) {
      system.emitter.position.set(this.target.x, this.target.y + 0.1, this.target.z);
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    if (this.light) {
      this.light.position.set(this.target.x, this.target.y + 0.8, this.target.z);
      this.light.intensity = this.config.finalLightIntensity;
    }
  }

  private updateImpact(deltaTime: number): void {
    this.impactElapsed += deltaTime;
    for (const pillar of this.pillars) {
      const fade = MathUtils.clamp(1 - this.impactElapsed / 0.55, 0, 1);
      (pillar.column.material as MeshBasicMaterial).opacity = 0.9 * fade * fade;
      (pillar.core.material as MeshBasicMaterial).opacity = 0.85 * fade * fade;
      pillar.column.visible = fade > 0.01;
      pillar.core.visible = fade > 0.01;
    }
    for (const fissure of this.fissures) {
      const close = MathUtils.clamp((this.impactElapsed - 0.45) / 0.5, 0, 1);
      fissure.material.opacity = Math.max(0, 0.95 * (1 - close));
      fissure.strip.scale.x = Math.max(
        fissure.length * (1 - close * 0.4),
        0.05,
      );
      fissure.strip.visible = close < 1;
    }
    for (const stone of this.stones) {
      const settle = MathUtils.clamp(this.impactElapsed / 0.35, 0, 1);
      stone.position.y = this.target.y + 0.05 + this.config.stoneRise * (1 - settle) * (1 - settle);
      stone.rotation.y += deltaTime * 1.6;
      stone.visible = settle < 1;
    }
    const shockProgress = MathUtils.clamp(this.impactElapsed / 0.34, 0, 1);
    this.finalShock.scale.setScalar(0.3 + shockProgress * 5.4);
    this.finalShockMaterial.opacity = Math.pow(1 - shockProgress, 2) * 0.38;
    this.finalShock.visible = shockProgress < 1;
    const flashProgress = MathUtils.clamp(this.impactElapsed / 0.2, 0, 1);
    this.finalFlash.scale.setScalar(0.26 + flashProgress * 1.05);
    this.finalFlashMaterial.opacity = Math.pow(1 - flashProgress, 2);
    this.finalFlash.visible = flashProgress < 1;
    if (this.light) {
      this.light.intensity = this.config.finalLightIntensity
        * Math.pow(MathUtils.clamp(1 - this.impactElapsed / 0.6, 0, 1), 2);
    }
    if (this.impactElapsed >= this.config.cleanupDelay) this.dispose();
  }

  private moveLightAlongCircle(height: number, intensity: number, progress = 0): void {
    if (!this.light) return;
    const sweep = progress * Math.PI * 2 + Math.PI / TRIBUNAL_PILLAR_COUNT;
    this.light.position.set(
      this.target.x + Math.cos(sweep) * this.config.circleRadius,
      height,
      this.target.z + Math.sin(sweep) * this.config.circleRadius,
    );
    this.light.intensity = intensity;
  }
}

export class TribunalVfxController {
  private readonly shared = createSharedResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<TribunalCast>();
  private readonly config: TribunalVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<TribunalVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_TRIBUNAL_VFX_CONFIG, ...config };
    this.config = {
      descentDuration: finiteOr(merged.descentDuration, DEFAULT_TRIBUNAL_VFX_CONFIG.descentDuration, 0.05),
      fissureDuration: finiteOr(merged.fissureDuration, DEFAULT_TRIBUNAL_VFX_CONFIG.fissureDuration, 0.05),
      finalDuration: finiteOr(merged.finalDuration, DEFAULT_TRIBUNAL_VFX_CONFIG.finalDuration, 0.05),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_TRIBUNAL_VFX_CONFIG.cleanupDelay, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_TRIBUNAL_VFX_CONFIG.maxConcurrentCasts, 1)),
      circleRadius: finiteOr(merged.circleRadius, DEFAULT_TRIBUNAL_VFX_CONFIG.circleRadius, 0.5),
      pillarHeight: finiteOr(merged.pillarHeight, DEFAULT_TRIBUNAL_VFX_CONFIG.pillarHeight, 1),
      pillarRadius: finiteOr(merged.pillarRadius, DEFAULT_TRIBUNAL_VFX_CONFIG.pillarRadius, 0.05),
      stoneRise: finiteOr(merged.stoneRise, DEFAULT_TRIBUNAL_VFX_CONFIG.stoneRise, 0),
      trailEmission: finiteOr(merged.trailEmission, DEFAULT_TRIBUNAL_VFX_CONFIG.trailEmission, 0),
      sparkEmission: finiteOr(merged.sparkEmission, DEFAULT_TRIBUNAL_VFX_CONFIG.sparkEmission, 0),
      touchdownBurstCount: Math.floor(finiteOr(merged.touchdownBurstCount, DEFAULT_TRIBUNAL_VFX_CONFIG.touchdownBurstCount, 1)),
      finalBurstCount: Math.floor(finiteOr(merged.finalBurstCount, DEFAULT_TRIBUNAL_VFX_CONFIG.finalBurstCount, 1)),
      lightIntensity: finiteOr(merged.lightIntensity, DEFAULT_TRIBUNAL_VFX_CONFIG.lightIntensity, 0.1),
      finalLightIntensity: finiteOr(merged.finalLightIntensity, DEFAULT_TRIBUNAL_VFX_CONFIG.finalLightIntensity, 0.1),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_TRIBUNAL_VFX_CONFIG.targetHeight, 0),
    };
    this.castRoot.name = "tk-tribunal-vfx-root";
    this.batchedRenderer.name = "tk-tribunal-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castTribunal(target: Vector3): void {
    if (this.disposed) throw new Error("TribunalVfxController descartado");
    if (!isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as TribunalCast | undefined;
      oldestCast?.dispose();
    }
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new TribunalCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
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
    let hasFissures = false;
    for (const cast of this.casts) {
      const phase = cast.getPhase();
      if (phase === "impact") hasImpact = true;
      if (phase === "fissures") hasFissures = true;
    }
    if (hasImpact) return "impact";
    if (hasFissures) return "fissures";
    return "descent";
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
    this.shared.columnGeometry.dispose();
    this.shared.coreGeometry.dispose();
    this.shared.headGeometry.dispose();
    this.shared.columnMaterial.dispose();
    this.shared.coreMaterial.dispose();
    this.shared.headMaterial.dispose();
    this.shared.shockGeometry.dispose();
    this.shared.shockMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterial.dispose();
    this.shared.fissureGeometry.dispose();
    this.shared.stoneGeometry.dispose();
    this.shared.stoneMaterial.dispose();
    disposeTribunalParticleMaterials(this.shared.particleMaterials);
    disposeTribunalTextures(this.shared.textures);
    this.castRoot.clear();
  }
}

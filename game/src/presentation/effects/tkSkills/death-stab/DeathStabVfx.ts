import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  RingGeometry,
  Scene,
  Vector3,
} from "three";
import type { TkLightPool } from "../../TkLightPool";

export interface DeathStabVfxConfig {
  travelDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  originHeight: number;
  targetHeight: number;
  baseRadius: number;
  tipRadius: number;
  lightPeak: number;
}

export const DEFAULT_DEATH_STAB_VFX_CONFIG: DeathStabVfxConfig = {
  travelDuration: 0.14,
  fadeDuration: 0.12,
  maxConcurrentCasts: 4,
  originHeight: 1,
  targetHeight: 0.85,
  baseRadius: 0.26,
  tipRadius: 0.055,
  lightPeak: 4.5,
};

type DeathStabPhase = "travel" | "fade";

interface DeathStabSharedResources {
  impactGeometry: RingGeometry;
  impactMaterial: MeshBasicMaterial;
}

const UP = new Vector3(0, 1, 0);

function createSharedResources(): DeathStabSharedResources {
  return {
    impactGeometry: new RingGeometry(0.34, 0.52, 40),
    impactMaterial: new MeshBasicMaterial({
      color: 0x8fd0ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    }),
  };
}

function finiteVector(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

class DeathStabCast {
  private readonly root = new Group();
  private readonly beam: Mesh<CylinderGeometry, MeshBasicMaterial>;
  private readonly material: MeshBasicMaterial;
  private readonly impactMaterial: MeshBasicMaterial;
  private readonly impactRing: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly direction = new Vector3();
  private readonly start = new Vector3();
  private readonly target = new Vector3();
  private readonly head = new Vector3();
  private readonly midpoint = new Vector3();
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private readonly distance: number;
  private elapsed = 0;
  private phase: DeathStabPhase = "travel";
  private disposed = false;

  constructor(
    private readonly castRoot: Group,
    shared: DeathStabSharedResources,
    private readonly config: DeathStabVfxConfig,
    origin: Vector3,
    target: Vector3,
    private readonly onDispose: (cast: DeathStabCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.start.copy(origin);
    this.start.y = Math.max(this.start.y, this.config.originHeight);
    this.target.copy(target);
    this.target.y = Math.max(this.target.y, this.config.targetHeight);
    this.direction.copy(this.target).sub(this.start);
    this.distance = Math.max(this.direction.length(), 0.001);
    this.direction.divideScalar(this.distance);
    const geometry = new CylinderGeometry(
      this.config.tipRadius,
      this.config.baseRadius,
      1,
      10,
      1,
      true,
    );
    this.material = new MeshBasicMaterial({
      color: 0x4aa8ff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.beam = new Mesh(geometry, this.material);
    this.beam.name = "tk-death-stab-wind";
    this.beam.renderOrder = 15;
    this.beam.visible = false;
    this.impactMaterial = shared.impactMaterial.clone();
    this.impactRing = new Mesh(shared.impactGeometry, this.impactMaterial);
    this.impactRing.name = "tk-death-stab-impact";
    this.impactRing.rotation.x = -Math.PI / 2;
    this.impactRing.position.set(target.x, Math.max(0.06, target.y + 0.06), target.z);
    this.impactRing.scale.setScalar(0.3);
    this.impactRing.visible = false;
    this.impactRing.renderOrder = 14;
    this.root.add(this.beam, this.impactRing);
    this.castRoot.add(this.root);
    if (this.lightPool) {
      this.light = this.lightPool.acquire(0x4aa8ff, 6);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0x4aa8ff, 0, 6, 2);
      this.isPooledLight = false;
    }
    if (this.light) this.castRoot.add(this.light);
  }

  getPhase(): DeathStabPhase {
    return this.phase;
  }

  getParticleCount(): number {
    return 0;
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;
    if (this.phase === "travel") {
      const progress = MathUtils.clamp(this.elapsed / this.config.travelDuration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const revealed = Math.max(0.02, this.distance * eased);
      this.head.copy(this.start).addScaledVector(this.direction, revealed);
      this.midpoint.copy(this.start).add(this.head).multiplyScalar(0.5);
      this.beam.visible = true;
      this.beam.position.copy(this.midpoint);
      this.beam.quaternion.setFromUnitVectors(UP, this.direction);
      this.beam.scale.set(1, revealed, 1);
      this.material.opacity = 0.92 - progress * 0.12;
      if (this.light) {
        this.light.position.copy(this.head);
        this.light.intensity = this.config.lightPeak * Math.sin(progress * Math.PI);
      }
      if (progress < 1) return;
      this.impactRing.visible = true;
      this.impactMaterial.opacity = 0.88;
      this.phase = "fade";
      this.elapsed = 0;
      return;
    }
    const progress = MathUtils.clamp(this.elapsed / this.config.fadeDuration, 0, 1);
    const fade = 1 - progress;
    this.beam.scale.x = 1 + progress * 0.35;
    this.beam.scale.z = 1 + progress * 0.35;
    this.material.opacity = 0.8 * fade * fade;
    this.impactRing.scale.setScalar(0.3 + progress * 1.9);
    this.impactMaterial.opacity = 0.88 * fade * fade;
    if (this.light) this.light.intensity = this.config.lightPeak * 0.3 * fade;
    if (progress >= 1) this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.castRoot.remove(this.root);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.beam.geometry.dispose();
    this.material.dispose();
    this.impactMaterial.dispose();
    this.onDispose(this);
  }
}

export class DeathStabVfxController {
  private readonly casts = new Set<DeathStabCast>();
  private readonly castRoot = new Group();
  private readonly shared = createSharedResources();
  private readonly config: DeathStabVfxConfig;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<DeathStabVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_DEATH_STAB_VFX_CONFIG, ...config };
    this.config = {
      travelDuration: finiteOr(merged.travelDuration, DEFAULT_DEATH_STAB_VFX_CONFIG.travelDuration, 0.04),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_DEATH_STAB_VFX_CONFIG.fadeDuration, 0.04),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_DEATH_STAB_VFX_CONFIG.maxConcurrentCasts, 1)),
      originHeight: finiteOr(merged.originHeight, DEFAULT_DEATH_STAB_VFX_CONFIG.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_DEATH_STAB_VFX_CONFIG.targetHeight, 0),
      baseRadius: finiteOr(merged.baseRadius, DEFAULT_DEATH_STAB_VFX_CONFIG.baseRadius, 0.02),
      tipRadius: finiteOr(merged.tipRadius, DEFAULT_DEATH_STAB_VFX_CONFIG.tipRadius, 0.01),
      lightPeak: finiteOr(merged.lightPeak, DEFAULT_DEATH_STAB_VFX_CONFIG.lightPeak, 0),
    };
    this.castRoot.name = "tk-death-stab-vfx-root";
    this.scene.add(this.castRoot);
  }

  castDeathStab(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("DeathStabVfxController descartado");
    if (!finiteVector(origin) || !finiteVector(target)) return;
    if (origin.distanceToSquared(target) < 1e-8) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as DeathStabCast | undefined;
      oldest?.dispose();
    }
    const cast = new DeathStabCast(
      this.castRoot,
      this.shared,
      this.config,
      origin,
      target,
      (finishedCast) => this.casts.delete(finishedCast),
      this.lightPool,
    );
    this.casts.add(cast);
  }

  update(deltaTime: number): void {
    if (this.disposed || this.casts.size === 0) return;
    const frameDelta = Number.isFinite(deltaTime) ? MathUtils.clamp(deltaTime, 0, 0.1) : 0;
    for (const cast of [...this.casts]) cast.update(frameDelta);
  }

  clear(): void {
    for (const cast of [...this.casts]) cast.dispose();
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    return 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.castRoot);
    this.shared.impactGeometry.dispose();
    this.shared.impactMaterial.dispose();
    this.castRoot.clear();
  }
}

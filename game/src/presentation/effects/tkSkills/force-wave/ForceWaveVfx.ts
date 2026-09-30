import {
  AdditiveBlending,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Scene,
  TorusGeometry,
  Vector3,
} from "three";
import type { TkLightPool } from "../../TkLightPool";

export interface ForceWaveVfxConfig {
  travelDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  originHeight: number;
  targetHeight: number;
  radius: number;
  thickness: number;
  arcSpan: number;
  lightPeak: number;
}

export const DEFAULT_FORCE_WAVE_VFX_CONFIG: ForceWaveVfxConfig = {
  travelDuration: 0.16,
  fadeDuration: 0.12,
  maxConcurrentCasts: 4,
  originHeight: 0.95,
  targetHeight: 0.8,
  radius: 0.78,
  thickness: 0.075,
  arcSpan: 2.55,
  lightPeak: 2.8,
};

type ForceWavePhase = "travel" | "fade";

interface ForceWaveSharedResources {
  waveGeometry: TorusGeometry;
  waveMaterial: MeshBasicMaterial;
  coreMaterial: MeshBasicMaterial;
}

function createSharedResources(config: ForceWaveVfxConfig): ForceWaveSharedResources {
  const waveGeometry = new TorusGeometry(
    config.radius,
    config.thickness,
    8,
    42,
    config.arcSpan,
  );
  waveGeometry.rotateZ((Math.PI - config.arcSpan) / 2);
  const waveMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const coreMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return { waveGeometry, waveMaterial, coreMaterial };
}

function finiteVector(vector: Vector3): boolean {
  return Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z);
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

class ForceWaveCast {
  private readonly root = new Group();
  private readonly waveMaterial: MeshBasicMaterial;
  private readonly coreMaterial: MeshBasicMaterial;
  private readonly wave: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly core: Mesh<TorusGeometry, MeshBasicMaterial>;
  private readonly direction = new Vector3();
  private readonly start = new Vector3();
  private readonly end = new Vector3();
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private elapsed = 0;
  private phase: ForceWavePhase = "travel";
  private disposed = false;

  constructor(
    private readonly castRoot: Group,
    shared: ForceWaveSharedResources,
    private readonly config: ForceWaveVfxConfig,
    origin: Vector3,
    target: Vector3,
    private readonly onDispose: (cast: ForceWaveCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    this.start.copy(origin);
    this.end.copy(target);
    this.direction.copy(target).sub(origin);
    this.direction.y = 0;
    if (this.direction.lengthSq() > 1e-8) this.direction.normalize();
    else this.direction.set(0, 0, 1);

    this.root.name = "tk-force-wave-cast";
    this.root.position.copy(this.start);
    this.root.rotation.y = Math.atan2(this.direction.x, this.direction.z);

    this.waveMaterial = shared.waveMaterial.clone();
    this.coreMaterial = shared.coreMaterial.clone();
    this.wave = new Mesh(shared.waveGeometry, this.waveMaterial);
    this.wave.name = "tk-force-wave-crest";
    this.wave.renderOrder = 10;
    this.wave.scale.set(0.92, 1, 0.92);

    this.core = new Mesh(shared.waveGeometry, this.coreMaterial);
    this.core.name = "tk-force-wave-core";
    this.core.renderOrder = 11;
    this.core.scale.set(0.76, 0.76, 0.76);

    this.root.add(this.wave, this.core);
    this.castRoot.add(this.root);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xffffff, 4.5);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xffffff, 0, 4.5, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.set(0, 0.1, 0);
      this.root.add(this.light);
    }
  }

  getPhase(): ForceWavePhase {
    return this.phase;
  }

  getParticleCount(): number {
    return 2;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      position: this.root.position.toArray(),
      scale: this.wave.scale.toArray(),
      opacity: this.waveMaterial.opacity,
    };
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;
    const travelProgress = MathUtils.clamp(
      this.elapsed / this.config.travelDuration,
      0,
      1,
    );
    const eased = 1 - Math.pow(1 - travelProgress, 3);
    this.root.position.lerpVectors(this.start, this.end, eased);
    const pulse = 1 + Math.sin(travelProgress * Math.PI) * 0.18;
    this.wave.scale.setScalar((0.92 + travelProgress * 0.28) * pulse);
    this.core.scale.setScalar(0.72 + travelProgress * 0.24);
    this.waveMaterial.opacity = 0.78 - travelProgress * 0.14;
    this.coreMaterial.opacity = 1 - travelProgress * 0.18;
    if (this.light) {
      this.light.intensity = this.config.lightPeak * Math.sin(travelProgress * Math.PI);
    }

    if (travelProgress < 1) return;
    if (this.phase === "travel") {
      this.phase = "fade";
      this.elapsed = 0;
      return;
    }

    const fadeProgress = MathUtils.clamp(
      this.elapsed / this.config.fadeDuration,
      0,
      1,
    );
    const fade = 1 - fadeProgress;
    this.wave.scale.setScalar(1.18 + fadeProgress * 0.38);
    this.core.scale.setScalar(0.96 + fadeProgress * 0.22);
    this.waveMaterial.opacity = 0.64 * fade * fade;
    this.coreMaterial.opacity = 0.82 * fade * fade;
    if (this.light) this.light.intensity = this.config.lightPeak * 0.45 * fade;
    if (fadeProgress >= 1) this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.castRoot.remove(this.root);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.root.remove(this.light);
      this.light.dispose();
    }
    this.waveMaterial.dispose();
    this.coreMaterial.dispose();
    this.onDispose(this);
  }
}

export class ForceWaveVfxController {
  private readonly config: ForceWaveVfxConfig;
  private readonly shared: ForceWaveSharedResources;
  private readonly castRoot = new Group();
  private readonly casts = new Set<ForceWaveCast>();
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<ForceWaveVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_FORCE_WAVE_VFX_CONFIG, ...config };
    this.config = {
      travelDuration: finiteOr(
        merged.travelDuration,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.travelDuration,
        0.04,
      ),
      fadeDuration: finiteOr(
        merged.fadeDuration,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.fadeDuration,
        0.04,
      ),
      maxConcurrentCasts: Math.floor(finiteOr(
        merged.maxConcurrentCasts,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.maxConcurrentCasts,
        1,
      )),
      originHeight: finiteOr(
        merged.originHeight,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.originHeight,
        0,
      ),
      targetHeight: finiteOr(
        merged.targetHeight,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.targetHeight,
        0,
      ),
      radius: finiteOr(
        merged.radius,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.radius,
        0.1,
      ),
      thickness: finiteOr(
        merged.thickness,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.thickness,
        0.01,
      ),
      arcSpan: MathUtils.clamp(
        finiteOr(merged.arcSpan, DEFAULT_FORCE_WAVE_VFX_CONFIG.arcSpan, 0.2),
        0.2,
        Math.PI * 1.8,
      ),
      lightPeak: finiteOr(
        merged.lightPeak,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.lightPeak,
        0,
      ),
    };
    this.shared = createSharedResources(this.config);
    this.castRoot.name = "tk-force-wave-vfx-root";
    this.scene.add(this.castRoot);
  }

  castForceWave(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("ForceWaveVfxController descartado");
    if (!finiteVector(origin) || !finiteVector(target)) return;
    const start = origin.clone();
    start.y = Math.max(origin.y, this.config.originHeight);
    const end = target.clone();
    end.y = Math.max(target.y, this.config.targetHeight);
    if (start.distanceToSquared(end) < 1e-8) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as ForceWaveCast | undefined;
      oldest?.dispose();
    }
    const cast = new ForceWaveCast(
      this.castRoot,
      this.shared,
      this.config,
      start,
      end,
      (finishedCast) => this.casts.delete(finishedCast),
      this.lightPool,
    );
    this.casts.add(cast);
  }

  update(deltaTime: number): void {
    if (this.disposed || this.casts.size === 0) return;
    const frameDelta = Number.isFinite(deltaTime)
      ? MathUtils.clamp(deltaTime, 0, 0.1)
      : 0;
    for (const cast of [...this.casts]) cast.update(frameDelta);
  }

  clear(): void {
    for (const cast of [...this.casts]) cast.dispose();
  }

  getActiveCastCount(): number {
    return this.casts.size;
  }

  getParticleCount(): number {
    let count = 0;
    for (const cast of this.casts) count += cast.getParticleCount();
    return count;
  }

  getPhase(): ForceWavePhase | "idle" {
    if (this.casts.size === 0) return "idle";
    for (const cast of this.casts) {
      if (cast.getPhase() === "fade") return "fade";
    }
    return "travel";
  }

  getCastStates() {
    return [...this.casts].map((cast) => cast.getState());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.castRoot);
    this.shared.waveGeometry.dispose();
    this.shared.waveMaterial.dispose();
    this.shared.coreMaterial.dispose();
    this.castRoot.clear();
  }
}

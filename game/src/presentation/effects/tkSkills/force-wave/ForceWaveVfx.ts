import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  MathUtils,
  Mesh,
  PointLight,
  Scene,
  ShaderMaterial,
  Vector3,
} from "three";
import type { TkLightPool } from "../../TkLightPool";

export interface ForceWaveVfxConfig {
  travelDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  groundHeight: number;
  startWidth: number;
  endWidth: number;
  lightPeak: number;
}

export const DEFAULT_FORCE_WAVE_VFX_CONFIG: ForceWaveVfxConfig = {
  travelDuration: 0.16,
  fadeDuration: 0.12,
  maxConcurrentCasts: 4,
  groundHeight: 0.12,
  startWidth: 1.65,
  endWidth: 0.16,
  lightPeak: 2.8,
};

type ForceWavePhase = "travel" | "fade";

interface ForceWaveSharedResources {
  geometry: BufferGeometry;
  material: ShaderMaterial;
}

function createGeometry(startWidth: number, endWidth: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([
    -startWidth * 0.5, 0, 0,
    startWidth * 0.5, 0, 0,
    -endWidth * 0.5, 0, 1,
    endWidth * 0.5, 0, 1,
  ], 3));
  geometry.setAttribute("uv", new Float32BufferAttribute([
    0, 0,
    1, 0,
    0, 1,
    1, 1,
  ], 2));
  geometry.setIndex([0, 2, 1, 2, 3, 1]);
  geometry.computeVertexNormals();
  return geometry;
}

function createMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      opacity: { value: 0.82 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        float sideFade = smoothstep(0.0, 0.16, vUv.x) * smoothstep(0.0, 0.16, 1.0 - vUv.x);
        float lengthFade = mix(1.0, 0.48, vUv.y);
        float alpha = opacity * sideFade * lengthFade;
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

function createSharedResources(config: ForceWaveVfxConfig): ForceWaveSharedResources {
  return {
    geometry: createGeometry(config.startWidth, config.endWidth),
    material: createMaterial(),
  };
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
  private readonly material: ShaderMaterial;
  private readonly wave: Mesh<BufferGeometry, ShaderMaterial>;
  private readonly direction = new Vector3();
  private readonly distance: number;
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
    this.direction.copy(target).sub(origin);
    this.direction.y = 0;
    this.distance = Math.max(this.direction.length(), 0.0001);
    this.direction.divideScalar(this.distance);

    this.root.name = "tk-force-wave-cast";
    this.root.position.set(origin.x, this.config.groundHeight, origin.z);
    this.root.rotation.y = Math.atan2(this.direction.x, this.direction.z);

    this.material = shared.material.clone();
    this.wave = new Mesh(shared.geometry, this.material);
    this.wave.name = "tk-force-wave-cone";
    this.wave.renderOrder = 10;
    this.wave.scale.set(1, 1, 0.001);
    this.root.add(this.wave);
    this.castRoot.add(this.root);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xffffff, 4.5);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xffffff, 0, 4.5, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.set(0, 0.12, 0);
      this.root.add(this.light);
    }
  }

  getPhase(): ForceWavePhase {
    return this.phase;
  }

  getParticleCount(): number {
    return 1;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      position: this.root.position.toArray(),
      scale: this.wave.scale.toArray(),
      opacity: this.material.uniforms.opacity.value as number,
      distance: this.distance,
    };
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;

    if (this.phase === "travel") {
      const progress = MathUtils.clamp(
        this.elapsed / this.config.travelDuration,
        0,
        1,
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      const length = Math.max(0.001, this.distance * eased);
      this.wave.scale.z = length;
      this.material.uniforms.opacity.value = 0.82 - progress * 0.12;
      if (this.light) {
        this.light.position.z = length;
        this.light.intensity = this.config.lightPeak * Math.sin(progress * Math.PI);
      }
      if (progress < 1) return;
      this.phase = "fade";
      this.elapsed = 0;
      return;
    }

    const progress = MathUtils.clamp(
      this.elapsed / this.config.fadeDuration,
      0,
      1,
    );
    const fade = 1 - progress;
    this.wave.scale.x = 1 + progress * 0.12;
    this.material.uniforms.opacity.value = 0.7 * fade * fade;
    if (this.light) {
      this.light.position.z = this.distance;
      this.light.intensity = this.config.lightPeak * 0.35 * fade;
    }
    if (progress >= 1) this.dispose();
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
    this.material.dispose();
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
      groundHeight: finiteOr(
        merged.groundHeight,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.groundHeight,
        0,
      ),
      startWidth: finiteOr(
        merged.startWidth,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.startWidth,
        0.1,
      ),
      endWidth: finiteOr(
        merged.endWidth,
        DEFAULT_FORCE_WAVE_VFX_CONFIG.endWidth,
        0.02,
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
    const horizontalTarget = target.clone();
    horizontalTarget.y = origin.y;
    if (origin.distanceToSquared(horizontalTarget) < 1e-8) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as ForceWaveCast | undefined;
      oldest?.dispose();
    }
    const cast = new ForceWaveCast(
      this.castRoot,
      this.shared,
      this.config,
      origin,
      horizontalTarget,
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
    this.shared.geometry.dispose();
    this.shared.material.dispose();
    this.castRoot.clear();
  }
}

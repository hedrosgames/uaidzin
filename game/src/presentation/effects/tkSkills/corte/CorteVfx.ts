import {
  AdditiveBlending,
  CatmullRomCurve3,
  Group,
  MathUtils,
  Mesh,
  PointLight,
  Scene,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createCorteParticleMaterials,
  createCorteSlashSystems,
  disposeCorteParticleMaterials,
  type CorteParticleMaterials,
  type CorteSlashSystems,
} from "./CorteParticleSystems";
import {
  createCorteTextures,
  disposeCorteTextures,
  type CorteTextureSet,
} from "./CorteTextures";

export interface CorteVfxConfig {
  slashDuration: number;
  slashDelay: number;
  fadeDuration: number;
  cleanupDelay: number;
  maxConcurrentCasts: number;
  sparkEmission: number;
  glintBurst: number;
  originHeight: number;
  targetHeight: number;
  arcSpan: number;
  arcTilt: number;
  arcTiltJitter: number;
  bladeRadius: number;
}

export const DEFAULT_CORTE_VFX_CONFIG: CorteVfxConfig = {
  slashDuration: 0.08,
  slashDelay: 0.08,
  fadeDuration: 0.2,
  cleanupDelay: 0.06,
  maxConcurrentCasts: 4,
  sparkEmission: 30,
  glintBurst: 12,
  originHeight: 1.05,
  targetHeight: 1.05,
  arcSpan: 1.15,
  arcTilt: 0.38,
  arcTiltJitter: 0.06,
  bladeRadius: 0.05,
};

type CastPhase = "slash" | "fade";

export const CORTE_BLADE_NAME = "tk-corte-blade";

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D map;
uniform float uProgress;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  if (vUv.x > uProgress || uOpacity <= 0.001) discard;
  vec4 texel = texture2D(map, vUv);
  float head = smoothstep(uProgress - 0.12, uProgress, vUv.x);
  vec3 color = texel.rgb * (1.0 + head * 1.8);
  float alpha = texel.a * uOpacity * (0.55 + head * 0.45);
  gl_FragColor = vec4(color, alpha);
}`;

interface CorteSharedResources {
  textures: CorteTextureSet;
  particleMaterials: CorteParticleMaterials;
}

function createSlashCurve(
  origin: Vector3,
  target: Vector3,
  sign: number,
  config: CorteVfxConfig,
): CatmullRomCurve3 {
  const toTarget = target.clone().sub(origin);
  const reach = Math.max(toTarget.length(), 1.2);
  const forward =
    toTarget.lengthSq() < 1e-8 ? FORWARD.clone() : toTarget.normalize();
  const right = new Vector3().crossVectors(UP, forward);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new Vector3().crossVectors(forward, right).normalize();
  const tilt =
    (config.arcTilt + (Math.random() - 0.5) * 2 * config.arcTiltJitter) * sign;
  const tiltedUp = up.clone().applyAxisAngle(forward, tilt);
  const tiltedRight = right.clone().applyAxisAngle(forward, tilt);
  const center = origin.clone().addScaledVector(forward, -reach * 0.35);
  const radius = reach / (1 - 0.35);
  const start = sign > 0 ? -config.arcSpan : config.arcSpan;
  const end = -start;
  const points: Vector3[] = [];
  for (let index = 0; index <= 24; index += 1) {
    const t = index / 24;
    const angle = start + (end - start) * t;
    points.push(
      center
        .clone()
        .addScaledVector(forward, Math.cos(angle) * radius)
        .addScaledVector(tiltedUp, Math.sin(angle) * radius)
        .addScaledVector(tiltedRight, Math.sin(angle) * radius * 0.12),
    );
  }
  const curve = new CatmullRomCurve3(points);
  curve.arcLengthDivisions = 128;
  return curve;
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

interface SlashState {
  readonly curve: CatmullRomCurve3;
  readonly mesh: Mesh<TubeGeometry, ShaderMaterial>;
  readonly systems: CorteSlashSystems;
  readonly start: number;
  readonly head: Vector3;
  progress: number;
  opacity: number;
  finished: boolean;
  active: boolean;
}

class CorteCast {
  private readonly slashes: SlashState[] = [];
  private readonly light: PointLight;
  private elapsed = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: CorteSharedResources,
    private readonly config: CorteVfxConfig,
    origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: CorteCast) => void,
  ) {
    const signs = [1, -1];
    for (let index = 0; index < signs.length; index += 1) {
      const curve = createSlashCurve(origin, target, signs[index], config);
      const geometry = new TubeGeometry(
        curve,
        48,
        config.bladeRadius,
        8,
        false,
      );
      const material = new ShaderMaterial({
        uniforms: {
          map: { value: shared.textures.blade },
          uProgress: { value: 0 },
          uOpacity: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      });
      const mesh = new Mesh(geometry, material);
      mesh.name = CORTE_BLADE_NAME;
      mesh.visible = false;
      mesh.renderOrder = 8;
      mesh.frustumCulled = false;
      this.castRoot.add(mesh);
      const systems = createCorteSlashSystems(shared.particleMaterials, config);
      for (const system of systems.all) {
        this.scene.add(system.emitter);
        this.batchedRenderer.addSystem(system);
      }
      this.slashes.push({
        curve,
        mesh,
        systems,
        start: index * config.slashDelay,
        head: new Vector3(),
        progress: 0,
        opacity: 0,
        finished: false,
        active: false,
      });
    }
    this.light = new PointLight(0xf0e6d0, 0, 5.5, 2);
    this.castRoot.add(this.light);
    this.light.position.copy(this.target);
  }

  getPhase(): CastPhase {
    return this.elapsed < this.config.slashDelay + this.config.slashDuration
      ? "slash"
      : "fade";
  }

  getState() {
    return {
      phase: this.getPhase(),
      elapsed: this.elapsed,
      target: this.target.toArray(),
      slashes: this.slashes.map((slash) => ({
        progress: slash.progress,
        opacity: slash.opacity,
        visible: slash.mesh.visible,
        head: slash.head.toArray(),
        controlPoints: slash.curve.points.map((point) => point.toArray()),
        length: slash.curve.getLength(),
      })),
    };
  }

  getParticleCount(): number {
    return this.slashes.reduce(
      (total, slash) =>
        total +
        slash.systems.all.reduce(
          (count, system) => count + system.particleNum,
          0,
        ),
      0,
    );
  }

  getSystems(): ParticleSystem[] {
    return this.slashes.flatMap((slash) => slash.systems.all);
  }

  prepareFrame(): void {
    for (const slash of this.slashes) {
      for (const system of slash.systems.all) {
        system.emitter.updateWorldMatrix(true, false);
      }
    }
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;
    for (const slash of this.slashes) {
      this.updateSlash(slash);
    }
    const fadeStart = this.config.slashDelay + this.config.slashDuration;
    const fadeProgress = MathUtils.clamp(
      (this.elapsed - fadeStart) / this.config.fadeDuration,
      0,
      1,
    );
    this.light.intensity = Math.max(
      0,
      3.2 * (1 - fadeProgress) + (fadeProgress < 1 ? 0.4 : 0),
    );
    if (
      this.elapsed >=
      fadeStart + this.config.fadeDuration + this.config.cleanupDelay
    ) {
      this.dispose();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const slash of this.slashes) {
      for (const system of slash.systems.all) system.dispose();
      this.castRoot.remove(slash.mesh);
      slash.mesh.geometry.dispose();
      slash.mesh.material.dispose();
    }
    this.castRoot.remove(this.light);
    this.onDispose(this);
  }

  private updateSlash(slash: SlashState): void {
    const local = this.elapsed - slash.start;
    if (local < 0) {
      slash.progress = 0;
      slash.opacity = 0;
      slash.mesh.visible = false;
      return;
    }
    if (local <= this.config.slashDuration) {
      if (!slash.active) {
        slash.active = true;
        slash.systems.sparks.emitter.visible = true;
        slash.systems.sparks.play();
      }
      slash.progress = MathUtils.clamp(
        local / this.config.slashDuration,
        0,
        1,
      );
      slash.opacity = 1;
      slash.curve.getPointAt(slash.progress, slash.head);
      slash.mesh.visible = true;
      slash.mesh.material.uniforms.uProgress.value = slash.progress;
      slash.mesh.material.uniforms.uOpacity.value = 1;
      slash.systems.sparks.emitter.position.copy(slash.head);
      return;
    }
    if (!slash.finished) {
      slash.finished = true;
      slash.progress = 1;
      slash.curve.getPointAt(1, slash.head);
      slash.systems.sparks.endEmit();
      slash.systems.sparks.emitter.visible = false;
      slash.systems.glint.emitter.position.copy(slash.head);
      slash.systems.glint.emitter.visible = true;
      slash.systems.glint.restart();
      slash.systems.glint.play();
    }
    slash.opacity = Math.max(
      0,
      1 -
        MathUtils.clamp(
          (local - this.config.slashDuration) / this.config.fadeDuration,
          0,
          1,
        ),
    );
    slash.mesh.material.uniforms.uOpacity.value = slash.opacity;
    slash.mesh.visible = slash.opacity > 0.001;
  }
}

export class CorteVfxController {
  private readonly textures = createCorteTextures();
  private readonly shared: CorteSharedResources;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<CorteCast>();
  private readonly config: CorteVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<CorteVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_CORTE_VFX_CONFIG, ...config };
    this.config = {
      slashDuration: finiteOr(merged.slashDuration, DEFAULT_CORTE_VFX_CONFIG.slashDuration, 0.02),
      slashDelay: finiteOr(merged.slashDelay, DEFAULT_CORTE_VFX_CONFIG.slashDelay, 0),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_CORTE_VFX_CONFIG.fadeDuration, 0.05),
      cleanupDelay: finiteOr(merged.cleanupDelay, DEFAULT_CORTE_VFX_CONFIG.cleanupDelay, 0),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_CORTE_VFX_CONFIG.maxConcurrentCasts, 1)),
      sparkEmission: finiteOr(merged.sparkEmission, DEFAULT_CORTE_VFX_CONFIG.sparkEmission, 0),
      glintBurst: Math.floor(finiteOr(merged.glintBurst, DEFAULT_CORTE_VFX_CONFIG.glintBurst, 0)),
      originHeight: finiteOr(merged.originHeight, DEFAULT_CORTE_VFX_CONFIG.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, DEFAULT_CORTE_VFX_CONFIG.targetHeight, 0),
      arcSpan: finiteOr(merged.arcSpan, DEFAULT_CORTE_VFX_CONFIG.arcSpan, 0.3),
      arcTilt: finiteOr(merged.arcTilt, DEFAULT_CORTE_VFX_CONFIG.arcTilt, 0),
      arcTiltJitter: finiteOr(merged.arcTiltJitter, DEFAULT_CORTE_VFX_CONFIG.arcTiltJitter, 0),
      bladeRadius: finiteOr(merged.bladeRadius, DEFAULT_CORTE_VFX_CONFIG.bladeRadius, 0.01),
    };
    this.shared = {
      textures: this.textures,
      particleMaterials: createCorteParticleMaterials(this.textures),
    };
    this.castRoot.name = "corte-vfx-root";
    this.batchedRenderer.name = "corte-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castCorte(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("CorteVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as
        | CorteCast
        | undefined;
      oldestCast?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const slashTarget = target.clone();
    slashTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new CorteCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      launchOrigin,
      slashTarget,
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

  getPhase(): CastPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasSlash = false;
    for (const cast of this.casts) {
      if (cast.getPhase() === "slash") hasSlash = true;
    }
    return hasSlash ? "slash" : "fade";
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
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return;
    }
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
    disposeCorteParticleMaterials(this.shared.particleMaterials);
    disposeCorteTextures(this.textures);
    this.castRoot.clear();
  }
}

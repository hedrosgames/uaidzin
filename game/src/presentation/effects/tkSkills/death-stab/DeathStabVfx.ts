import { Group, MathUtils, Scene, ShaderMaterial, Vector2, Vector3 } from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import type { TkLightPool } from "../../TkLightPool";
import { createDeathStabResources, disposeDeathStabResources } from "./DeathStabResources";
import { createDeathStabBursts, createMainWave } from "./DeathStabParticleSystems";

export interface DeathStabVfxConfig {
  travelDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  originHeight: number;
  targetHeight: number;
  waveCount: number;
  waveInterval: number;
}

export const DEFAULT_DEATH_STAB_VFX_CONFIG: DeathStabVfxConfig = {
  travelDuration: 0.14,
  fadeDuration: 0.14,
  maxConcurrentCasts: 4,
  originHeight: 1.05,
  targetHeight: 0.85,
  waveCount: 5,
  waveInterval: 0.028,
};

interface ScheduledBurst {
  system: ParticleSystem;
  at: number;
  started: boolean;
}

interface DeathStabCast {
  root: Group;
  bursts: ScheduledBurst[];
  origin: Vector3;
  target: Vector3;
  direction: Vector3;
  elapsed: number;
  travel: number;
  lastArrival: number;
  duration: number;
}

const FORWARD = new Vector3(0, 0, 1);
const finiteVector = (point: Vector3) => [point.x, point.y, point.z].every(Number.isFinite);

export class DeathStabVfxController {
  private readonly casts = new Set<DeathStabCast>();
  private readonly castRoot = new Group();
  private readonly renderer = new BatchedRenderer();
  private readonly resources = createDeathStabResources();
  private readonly config: DeathStabVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(private readonly scene: Scene, config: Partial<DeathStabVfxConfig> = {}, _lightPool?: TkLightPool) {
    this.config = { ...DEFAULT_DEATH_STAB_VFX_CONFIG };
    for (const key of Object.keys(this.config) as (keyof DeathStabVfxConfig)[]) {
      const supplied = config[key];
      if (supplied !== undefined && Number.isFinite(supplied)) this.config[key] = supplied;
    }
    this.config.travelDuration = MathUtils.clamp(this.config.travelDuration, 0.08, 0.18);
    this.config.fadeDuration = MathUtils.clamp(this.config.fadeDuration, 0.12, 0.2);
    this.config.waveInterval = MathUtils.clamp(this.config.waveInterval, 0.02, 0.03);
    this.config.waveCount = Math.floor(MathUtils.clamp(this.config.waveCount, 3, 6));
    this.config.maxConcurrentCasts = Math.floor(MathUtils.clamp(this.config.maxConcurrentCasts, 1, 8));
    this.castRoot.name = "tk-death-stab-vfx-root";
    this.renderer.name = "tk-death-stab-quarks";
    this.scene.add(this.castRoot, this.renderer);
  }

  castDeathStab(origin: Vector3, target: Vector3, attackPoint?: Vector3): void {
    if (this.disposed) throw new Error("DeathStabVfxController descartado");
    if (!finiteVector(origin) || !finiteVector(target) || (attackPoint && !finiteVector(attackPoint))) return;
    if (origin.distanceToSquared(target) < 1e-8) return;
    const start = attackPoint?.clone() ?? origin.clone().add(new Vector3(0, this.config.originHeight, 0));
    const end = target.clone().add(new Vector3(0, this.config.targetHeight, 0));
    const direction = end.clone().sub(start);
    const distance = direction.length();
    if (distance < 1e-4) return;
    direction.divideScalar(distance);
    if (this.casts.size >= this.config.maxConcurrentCasts) this.removeCast(this.casts.values().next().value!);
    const travel = MathUtils.clamp(this.config.travelDuration * distance / 4, 0.08, 0.18);
    const lastArrival = travel + (this.config.waveCount - 1) * this.config.waveInterval;
    const root = new Group();
    root.name = "DeathStab";
    const cast: DeathStabCast = { root, bursts: [], origin: start, target: end, direction,
      elapsed: 0, travel, lastArrival, duration: lastArrival + this.config.fadeDuration };
    this.castRoot.add(root);
    const side = new Vector3().crossVectors(direction, Math.abs(direction.y) > 0.95 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)).normalize();
    const up = new Vector3().crossVectors(side, direction).normalize();
    for (let index = 0; index < this.config.waveCount; index++) {
      const offset = side.clone().multiplyScalar(Math.sin(index * 2.4) * 0.065)
        .addScaledVector(up, Math.cos(index * 1.7) * 0.055);
      const wave = createMainWave(this.resources, distance, travel, index);
      this.schedule(cast, wave, index * this.config.waveInterval, start.clone().add(offset));
    }
    const bursts = createDeathStabBursts(this.resources, distance, travel);
    this.schedule(cast, bursts.release, 0, start);
    this.schedule(cast, bursts.trail, 0.02, start);
    this.schedule(cast, bursts.streaks, 0, start);
    this.schedule(cast, bursts.curls, travel * 0.4, start.clone().lerp(end, 0.45));
    this.schedule(cast, bursts.impact, travel, end);
    this.schedule(cast, bursts.fragments, travel, end);
    this.schedule(cast, bursts.pressure, lastArrival, end);
    this.schedule(cast, bursts.overshoot, travel, end);
    this.casts.add(cast);
    this.startDueBursts(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed || !Number.isFinite(deltaTime) || deltaTime <= 0 || this.casts.size === 0) return;
    this.accumulator += Math.min(deltaTime, 0.25);
    for (const batch of this.renderer.batches) {
      const material = batch.material;
      if (material instanceof ShaderMaterial && material.uniforms.resolution?.value instanceof Vector2) {
        material.uniforms.resolution.value.set(Math.max(1, width), Math.max(1, height));
      }
    }
    while (this.accumulator + 1e-9 >= 1 / 60) {
      for (const cast of this.casts) this.startDueBursts(cast);
      this.castRoot.updateMatrixWorld(true);
      this.renderer.update(1 / 60);
      for (const cast of this.casts) {
        cast.elapsed += 1 / 60;
        if (cast.elapsed + 1e-9 >= cast.duration) this.removeCast(cast);
      }
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
    }
  }

  clear(): void {
    for (const cast of this.casts) this.removeCast(cast);
    this.accumulator = 0;
    this.renderer.update(0);
  }

  getActiveCastCount(): number { return this.casts.size; }
  getSystems(): ParticleSystem[] { return [...this.casts].flatMap(cast => cast.bursts.map(burst => burst.system)); }
  getParticleCount(): number { return this.getSystems().reduce((sum, system) => sum + system.particleNum, 0); }
  getPhase(): "idle" | "travel" | "impact" | "fade" {
    if (!this.casts.size) return "idle";
    const cast = [...this.casts][this.casts.size - 1]!;
    if (cast.elapsed < cast.travel) return "travel";
    return cast.elapsed < cast.lastArrival ? "impact" : "fade";
  }

  getCastStates() {
    return [...this.casts].map(cast => ({
      elapsed: cast.elapsed, travel: cast.travel, lastArrival: cast.lastArrival, duration: cast.duration,
      origin: cast.origin.toArray(), target: cast.target.toArray(), direction: cast.direction.toArray(),
      waves: cast.bursts.filter(burst => burst.system.emitter.name === "DeathStab_MainWaves").map(burst => ({
        at: burst.at, started: burst.started,
        positions: burst.system.particles.slice(0, burst.system.particleNum).map(particle => [particle.position.x, particle.position.y, particle.position.z]),
      })),
    }));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.castRoot, this.renderer);
    for (const batch of this.renderer.batches) {
      batch.geometry.dispose();
      if (Array.isArray(batch.material)) batch.material.forEach(material => material.dispose());
      else batch.material.dispose();
    }
    this.renderer.clear();
    this.renderer.batches.length = 0;
    this.renderer.systemToBatchIndex.clear();
    disposeDeathStabResources(this.resources);
  }

  private schedule(cast: DeathStabCast, system: ParticleSystem, at: number, position: Vector3): void {
    system.emitter.position.copy(position);
    system.emitter.quaternion.setFromUnitVectors(FORWARD, cast.direction);
    cast.root.add(system.emitter);
    this.renderer.addSystem(system);
    cast.bursts.push({ system, at, started: false });
  }

  private startDueBursts(cast: DeathStabCast): void {
    for (const burst of cast.bursts) {
      if (burst.started || cast.elapsed + 1e-9 < burst.at) continue;
      burst.started = true;
      burst.system.emitter.visible = true;
      burst.system.restart();
      burst.system.play();
    }
  }

  private removeCast(cast: DeathStabCast): void {
    for (const burst of cast.bursts) {
      burst.system.emitter.removeFromParent();
      burst.system.dispose();
    }
    cast.root.removeFromParent();
    cast.root.clear();
    this.casts.delete(cast);
  }
}

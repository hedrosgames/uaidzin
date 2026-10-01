import {
  AdditiveBlending,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createSeloAmbientSystems,
  createSeloBurstSystems,
  createSeloParticleMaterials,
  disposeSeloParticleMaterials,
  type SeloAmbientSystems,
  type SeloBurstSystems,
  type SeloParticleMaterials,
} from "./SeloParticleSystems";
import {
  createSeloTextures,
  disposeSeloTextures,
} from "./SeloTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface SeloVfxConfig {
  sealDuration: number;
  activeDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  dustEmission: number;
  moteEmission: number;
  burstCount: number;
  innerRadius: number;
  outerRadius: number;
  innerSpin: number;
  outerSpin: number;
}

export const DEFAULT_SELO_VFX_CONFIG: SeloVfxConfig = {
  sealDuration: 0.45,
  activeDuration: 2.1,
  fadeDuration: 0.5,
  maxConcurrentCasts: 2,
  dustEmission: 22,
  moteEmission: 14,
  burstCount: 30,
  innerRadius: 0.9,
  outerRadius: 1.4,
  innerSpin: 1.05,
  outerSpin: -0.68,
};

type SeloPhase = "materialize" | "sealed" | "fade";

const FLASH_COLOR = 0xffb8f2;
const LIGHT_COLOR = 0xa84cff;

interface SeloRing {
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  spin: number;
  finalScale: number;
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function createRingMesh(
  geometry: PlaneGeometry,
  material: MeshBasicMaterial,
  radius: number,
  spin: number,
): SeloRing {
  const mesh = new Mesh(geometry, material);
  mesh.name = "selo-ring";
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 11;
  mesh.visible = false;
  return { mesh, spin, finalScale: (radius * 2) / geometry.parameters.width };
}

class SeloCast {
  private readonly ambientSystems: SeloAmbientSystems;
  private readonly burstSystems: SeloBurstSystems;
  private readonly systems: ParticleSystem[];
  private readonly rings: [SeloRing, SeloRing];
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private phase: SeloPhase = "materialize";
  private phaseElapsed = 0;
  private spinAngle = 0;
  private pulseTime = 0;
  private flashElapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: {
      particleMaterials: SeloParticleMaterials;
      innerGeometry: PlaneGeometry;
      outerGeometry: PlaneGeometry;
      flashGeometry: SphereGeometry;
      innerMaterial: MeshBasicMaterial;
      outerMaterial: MeshBasicMaterial;
      flashMaterial: MeshBasicMaterial;
    },
    private readonly config: SeloVfxConfig,
    center: Vector3,
    private readonly onDispose: (cast: SeloCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    scene.add(this.castRoot);
    this.ambientSystems = createSeloAmbientSystems(shared.particleMaterials, config);
    this.burstSystems = createSeloBurstSystems(shared.particleMaterials, config);
    this.systems = [...this.ambientSystems.all, ...this.burstSystems.all];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    const innerMaterial = shared.innerMaterial.clone();
    const outerMaterial = shared.outerMaterial.clone();
    this.rings = [
      createRingMesh(shared.innerGeometry, innerMaterial, config.innerRadius, config.innerSpin),
      createRingMesh(shared.outerGeometry, outerMaterial, config.outerRadius, config.outerSpin),
    ];
    for (const ring of this.rings) this.castRoot.add(ring.mesh);
    this.rings[0].mesh.name = "selo-ring-inner";
    this.rings[1].mesh.name = "selo-ring-outer";

    this.flash = new Mesh(shared.flashGeometry, shared.flashMaterial.clone());
    this.flash.name = "selo-flash";
    this.flash.visible = false;
    this.castRoot.add(this.flash);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(LIGHT_COLOR, 7.5);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(LIGHT_COLOR, 0, 7.5, 2);
      this.isPooledLight = false;
    }
    if (this.light) {
      this.light.position.set(0, 0.85, 0);
      this.castRoot.add(this.light);
    }

    this.place(center);
    this.triggerMaterialize();
  }

  getPhase(): SeloPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.pulseTime,
      pulseTime: this.pulseTime,
      spinAngle: this.spinAngle,
      rings: this.rings.map((ring) => ({
        rotation: ring.mesh.rotation.z,
        opacity: ring.mesh.material.opacity,
        scale: ring.mesh.scale.x,
        visible: ring.mesh.visible,
      })),
      flash: {
        opacity: this.flash.material.opacity,
        scale: this.flash.scale.x,
        visible: this.flash.visible,
      },
      position: this.castRoot.position.toArray(),
      lightIntensity: this.light?.intensity ?? 0,
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
    this.pulseTime += deltaTime;
    this.spinAngle += deltaTime;
    if (this.phase === "materialize") this.updateMaterialize(deltaTime);
    else if (this.phase === "sealed") this.updateSealed(deltaTime);
    else this.updateFade(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) {
      system.emitter.removeFromParent();
      system.dispose();
    }
    for (const ring of this.rings) ring.mesh.material.dispose();
    this.flash.material.dispose();
    this.castRoot.remove(this.flash);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    for (const ring of this.rings) this.castRoot.remove(ring.mesh);
    this.castRoot.removeFromParent();
    this.castRoot.clear();
    this.onDispose(this);
  }

  private place(center: Vector3): void {
    const position = center.clone();
    position.y = 0.02;
    this.castRoot.position.copy(position);
  }

  private triggerMaterialize(): void {
    this.phase = "materialize";
    this.phaseElapsed = 0;
    this.ambientSystems.dust.emitter.visible = true;
    this.ambientSystems.dust.restart();
    this.ambientSystems.dust.play();
    for (const ring of this.rings) {
      ring.mesh.scale.setScalar(ring.finalScale * 0.3);
      ring.mesh.material.opacity = 0;
      ring.mesh.visible = true;
    }
    if (this.light) this.light.intensity = 0.8;
  }

  private updateMaterialize(deltaTime: number): void {
    this.phaseElapsed += deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.sealDuration, 0, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    for (const ring of this.rings) {
      ring.mesh.scale.setScalar(ring.finalScale * (0.3 + ease * 0.7));
      ring.mesh.rotation.z += ring.spin * deltaTime * (1.6 - ease * 0.6);
      ring.mesh.material.opacity = ease * 0.92;
    }
    if (this.light) this.light.intensity = 0.8 + ease * 1.4;
    if (this.phaseElapsed + 1e-9 >= this.config.sealDuration) this.triggerSealed();
  }

  private triggerSealed(): void {
    this.phase = "sealed";
    this.phaseElapsed = 0;
    this.flashElapsed = 0;
    for (const system of this.burstSystems.all) {
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.ambientSystems.motes.emitter.visible = true;
    this.ambientSystems.motes.restart();
    this.ambientSystems.motes.play();
    this.flash.position.set(0, 0.28, 0);
    this.flash.scale.setScalar(0.16);
    this.flash.material.opacity = 1;
    this.flash.visible = true;
    if (this.light) this.light.intensity = 6.4;
  }

  private updateSealed(deltaTime: number): void {
    this.phaseElapsed += deltaTime;
    for (const ring of this.rings) {
      ring.mesh.rotation.z += ring.spin * deltaTime;
      ring.mesh.material.opacity = 0.92 + Math.sin(this.pulseTime * 3.6) * 0.08;
    }
    this.flashElapsed += deltaTime;
    const flashProgress = MathUtils.clamp(this.flashElapsed / 0.24, 0, 1);
    this.flash.scale.setScalar(0.16 + flashProgress * 0.78);
    this.flash.material.opacity = Math.pow(1 - flashProgress, 2);
    this.flash.visible = flashProgress < 1;
    if (this.light) {
      this.light.intensity = Math.max(
        1.5 + Math.sin(this.pulseTime * 3.6) * 0.5,
        6.4 * Math.pow(1 - flashProgress, 2),
      );
    }
    if (this.phaseElapsed + 1e-9 >= this.config.activeDuration) this.triggerFade();
  }

  private triggerFade(): void {
    this.phase = "fade";
    this.phaseElapsed = 0;
    for (const system of this.systems) system.endEmit();
  }

  private updateFade(deltaTime: number): void {
    this.phaseElapsed += deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    for (const ring of this.rings) {
      ring.mesh.rotation.z += ring.spin * deltaTime;
      ring.mesh.material.opacity = fade * 0.92;
      ring.mesh.scale.multiplyScalar(1 + deltaTime * 0.22);
    }
    if (this.light) this.light.intensity = 1.5 * fade;
    if (this.phaseElapsed + 1e-9 >= this.config.fadeDuration) this.dispose();
  }
}

export class SeloVfxController {
  private readonly textures = createSeloTextures();
  private readonly particleMaterials: SeloParticleMaterials;
  private readonly innerGeometry: PlaneGeometry;
  private readonly outerGeometry: PlaneGeometry;
  private readonly flashGeometry = new SphereGeometry(1, 16, 12);
  private readonly innerMaterial: MeshBasicMaterial;
  private readonly outerMaterial: MeshBasicMaterial;
  private readonly flashMaterial: MeshBasicMaterial;
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<SeloCast>();
  private readonly config: SeloVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<SeloVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_SELO_VFX_CONFIG, ...config };
    this.config = {
      sealDuration: finiteOr(merged.sealDuration, DEFAULT_SELO_VFX_CONFIG.sealDuration, 0.05),
      activeDuration: finiteOr(merged.activeDuration, DEFAULT_SELO_VFX_CONFIG.activeDuration, 0.1),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_SELO_VFX_CONFIG.fadeDuration, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_SELO_VFX_CONFIG.maxConcurrentCasts, 1)),
      dustEmission: finiteOr(merged.dustEmission, DEFAULT_SELO_VFX_CONFIG.dustEmission, 0),
      moteEmission: finiteOr(merged.moteEmission, DEFAULT_SELO_VFX_CONFIG.moteEmission, 0),
      burstCount: Math.floor(finiteOr(merged.burstCount, DEFAULT_SELO_VFX_CONFIG.burstCount, 1)),
      innerRadius: finiteOr(merged.innerRadius, DEFAULT_SELO_VFX_CONFIG.innerRadius, 0.2),
      outerRadius: finiteOr(merged.outerRadius, DEFAULT_SELO_VFX_CONFIG.outerRadius, 0.3),
      innerSpin: finiteOr(merged.innerSpin, DEFAULT_SELO_VFX_CONFIG.innerSpin, 0.05),
      outerSpin: finiteOr(merged.outerSpin, DEFAULT_SELO_VFX_CONFIG.outerSpin, -2),
    };
    this.particleMaterials = createSeloParticleMaterials(this.textures);
    this.innerGeometry = new PlaneGeometry(this.config.innerRadius * 2.2, this.config.innerRadius * 2.2);
    this.outerGeometry = new PlaneGeometry(this.config.outerRadius * 2.2, this.config.outerRadius * 2.2);
    this.innerMaterial = new MeshBasicMaterial({
      map: this.textures.innerRing,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.outerMaterial = new MeshBasicMaterial({
      map: this.textures.outerRing,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.flashMaterial = new MeshBasicMaterial({
      color: FLASH_COLOR,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.batchedRenderer.name = "selo-batched-renderer";
    this.scene.add(this.batchedRenderer);
  }

  castSelo(center: Vector3, duration?: number): void {
    if (this.disposed) throw new Error("SeloVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as SeloCast | undefined;
      oldestCast?.dispose();
    }
    const activeDuration = duration === undefined
      ? this.config.activeDuration
      : finiteOr(duration, this.config.activeDuration, 0.1);
    const cast = new SeloCast(
      this.scene,
      this.batchedRenderer,
      new Group(),
      {
        particleMaterials: this.particleMaterials,
        innerGeometry: this.innerGeometry,
        outerGeometry: this.outerGeometry,
        flashGeometry: this.flashGeometry,
        innerMaterial: this.innerMaterial,
        outerMaterial: this.outerMaterial,
        flashMaterial: this.flashMaterial,
      },
      { ...this.config, activeDuration },
      center,
      (finishedCast) => this.casts.delete(finishedCast),
      this.lightPool,
    );
    this.casts.add(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
    const frameDelta = Number.isFinite(deltaTime) ? MathUtils.clamp(deltaTime, 0, 0.1) : 0;
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

  getPhase(): SeloPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasMaterialize = false;
    let hasSealed = false;
    for (const cast of this.casts) {
      const phase = cast.getPhase();
      if (phase === "materialize") hasMaterialize = true;
      if (phase === "sealed") hasSealed = true;
    }
    if (hasMaterialize) return "materialize";
    if (hasSealed) return "sealed";
    return "fade";
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
    for (const batch of this.batchedRenderer.batches) {
      const material = batch.material;
      if (!(material instanceof ShaderMaterial)) continue;
      const value = material.uniforms.resolution?.value;
      if (value instanceof Vector2) value.copy(this.batchResolution);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.scene.remove(this.batchedRenderer);
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
    this.innerGeometry.dispose();
    this.outerGeometry.dispose();
    this.flashGeometry.dispose();
    this.innerMaterial.dispose();
    this.outerMaterial.dispose();
    this.flashMaterial.dispose();
    disposeSeloParticleMaterials(this.particleMaterials);
    disposeSeloTextures(this.textures);
  }
}

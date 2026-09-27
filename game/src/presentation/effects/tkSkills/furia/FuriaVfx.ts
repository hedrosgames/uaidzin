import {
  AdditiveBlending,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createFuriaParticleMaterials,
  createFuriaAuraSystems,
  createFuriaBurstSystems,
  disposeFuriaParticleMaterials,
  type FuriaParticleMaterials,
  type FuriaAuraSystems,
  type FuriaBurstSystems,
} from "./FuriaParticleSystems";
import {
  createFuriaTextures,
  disposeFuriaTextures,
  type FuriaTextureSet,
} from "./FuriaTextures";
import {
  DEFAULT_FURIA_PALETTE,
  DESCUIDADO_PALETTE,
  type FuriaPalette,
} from "./FuriaPalette";

export { DEFAULT_FURIA_PALETTE, DESCUIDADO_PALETTE, type FuriaPalette };

export interface FuriaVfxConfig {
  auraDuration: number;
  activationDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  emberEmission: number;
  burstCount: number;
  ringRadius: number;
  palette?: FuriaPalette;
}

export const DEFAULT_FURIA_VFX_CONFIG: FuriaVfxConfig = {
  auraDuration: 2.0,
  activationDuration: 0.1,
  fadeDuration: 0.5,
  maxConcurrentCasts: 2,
  emberEmission: 26,
  burstCount: 30,
  ringRadius: 1.35,
};

type FuriaPhase = "activation" | "active" | "fade";

const AURA_RING_VERTEX =  `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const AURA_RING_FRAGMENT =  `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vLocal;
  void main() {
    float radius = length(vLocal);
    float normalized = radius / 1.35;
    float band = smoothstep(0.58, 0.78, normalized) * (1.0 - smoothstep(0.86, 1.0, normalized));
    float pulse = 0.62 + 0.38 * sin(uTime * 4.4);
    float waves = 0.5 + 0.5 * sin(normalized * 21.0 - uTime * 6.2);
    float alpha = band * (0.42 + 0.34 * pulse) * (0.72 + 0.28 * waves) * uIntensity;
    vec3 color = uColor * (0.85 + 0.75 * pulse * waves);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createAuraRingMaterial(palette: FuriaPalette = DEFAULT_FURIA_PALETTE): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uColor: { value: palette.ringColor },
    },
    vertexShader: AURA_RING_VERTEX,
    fragmentShader: AURA_RING_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
}

function createSharedResources(
  textures: FuriaTextureSet,
): {
  particleMaterials: FuriaParticleMaterials;
  ringGeometry: PlaneGeometry;
} {
  const particleMaterials = createFuriaParticleMaterials(textures);
  const ringGeometry = new PlaneGeometry(2.7, 2.7);
  return { particleMaterials, ringGeometry };
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class FuriaCast {
  private readonly auraSystems: FuriaAuraSystems;
  private readonly burstSystems: FuriaBurstSystems;
  private readonly systems: ParticleSystem[];
  private readonly ring: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly light: PointLight;
  private phase: FuriaPhase = "activation";
  private activationElapsed = 0;
  private activeElapsed = 0;
  private fadeElapsed = 0;
  private pulseTime = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: {
      particleMaterials: FuriaParticleMaterials;
      ringGeometry: PlaneGeometry;
    },
    private readonly config: FuriaVfxConfig,
    center: Vector3,
    private readonly onDispose: (cast: FuriaCast) => void,
  ) {
    scene.add(this.castRoot);
    const palette = config.palette ?? DEFAULT_FURIA_PALETTE;
    this.auraSystems = createFuriaAuraSystems(shared.particleMaterials, config, palette);
    this.burstSystems = createFuriaBurstSystems(shared.particleMaterials, config, palette);
    this.systems = [...this.auraSystems.all, ...this.burstSystems.all];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.ring = new Mesh(shared.ringGeometry, createAuraRingMaterial(palette));
    this.ring.name = "furia-aura-ring";
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 11;
    this.castRoot.add(this.ring);

    this.light = new PointLight(palette.lightColor, 0, 6.5, 2);
    this.castRoot.add(this.light);

    this.place(center);
    this.triggerActivation();
  }

  getPhase(): FuriaPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.activationElapsed + this.activeElapsed + this.fadeElapsed,
      pulseTime: this.pulseTime,
      ring: {
        opacity: this.ring.material.uniforms.uIntensity.value as number,
        scale: this.ring.scale.x,
      },
      position: this.castRoot.position.toArray(),
      lightIntensity: this.light.intensity,
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
    if (this.phase === "activation") this.updateActivation(deltaTime);
    else if (this.phase === "active") this.updateActive(deltaTime);
    else this.updateFade(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.ring, this.light);
    this.ring.material.dispose();
    this.castRoot.removeFromParent();
    this.castRoot.clear();
    this.onDispose(this);
  }

  private place(center: Vector3): void {
    const position = center.clone();
    position.y = 0.02;
    this.castRoot.position.copy(position);
    this.ring.position.set(0, 0.01, 0);
    this.light.position.set(0, 0.9, 0);
  }

  private triggerActivation(): void {
    this.phase = "activation";
    this.activationElapsed = 0;
    for (const system of this.burstSystems.all) {
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.auraSystems.embers.emitter.visible = true;
    this.auraSystems.embers.restart();
    this.auraSystems.embers.play();
    this.ring.scale.setScalar(0.24);
    this.ring.material.uniforms.uIntensity.value = 1;
    this.light.intensity = 5.4;
  }

  private updateActivation(deltaTime: number): void {
    this.activationElapsed += deltaTime;
    const progress = MathUtils.clamp(
      this.activationElapsed / this.config.activationDuration,
      0,
      1,
    );
    const ease = 1 - Math.pow(1 - progress, 3);
    this.ring.scale.setScalar(0.24 + ease * 0.76);
    this.pulseTime += deltaTime;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    this.light.intensity = 5.4 * (1 - progress * 0.72);
    if (progress >= 1) {
      this.phase = "active";
      this.activeElapsed = 0;
    }
  }

  private updateActive(deltaTime: number): void {
    this.activeElapsed += deltaTime;
    this.pulseTime += deltaTime;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    this.light.intensity = 1.5 + Math.sin(this.pulseTime * 4.4) * 0.55;
    const breathe = 1 + Math.sin(this.pulseTime * 2.6) * 0.035;
    this.ring.scale.setScalar(breathe);
    if (this.activeElapsed >= this.config.auraDuration) this.triggerFade();
  }

  private triggerFade(): void {
    this.phase = "fade";
    this.fadeElapsed = 0;
    for (const system of this.systems) system.endEmit();
  }

  private updateFade(deltaTime: number): void {
    this.fadeElapsed += deltaTime;
    this.pulseTime += deltaTime;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    const progress = MathUtils.clamp(this.fadeElapsed / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.ring.material.uniforms.uIntensity.value = fade;
    this.light.intensity = 1.5 * fade;
    this.ring.scale.setScalar(1 + progress * 0.14);
    if (this.fadeElapsed >= this.config.fadeDuration) this.dispose();
  }
}

export class FuriaVfxController {
  private readonly textures: FuriaTextureSet;
  private readonly shared: {
    particleMaterials: FuriaParticleMaterials;
    ringGeometry: PlaneGeometry;
  };
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<FuriaCast>();
  private readonly config: FuriaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<FuriaVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_FURIA_VFX_CONFIG, ...config };
    const palette = config.palette ?? DEFAULT_FURIA_PALETTE;
    this.textures = createFuriaTextures(palette);
    this.shared = createSharedResources(this.textures);
    this.config = {
      auraDuration: finiteOr(merged.auraDuration, DEFAULT_FURIA_VFX_CONFIG.auraDuration, 0.1),
      activationDuration: finiteOr(merged.activationDuration, DEFAULT_FURIA_VFX_CONFIG.activationDuration, 0.02),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_FURIA_VFX_CONFIG.fadeDuration, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_FURIA_VFX_CONFIG.maxConcurrentCasts, 1)),
      emberEmission: finiteOr(merged.emberEmission, DEFAULT_FURIA_VFX_CONFIG.emberEmission, 0),
      burstCount: Math.floor(finiteOr(merged.burstCount, DEFAULT_FURIA_VFX_CONFIG.burstCount, 1)),
      ringRadius: finiteOr(merged.ringRadius, DEFAULT_FURIA_VFX_CONFIG.ringRadius, 0.4),
      palette,
    };
    this.castRoot.name = "furia-vfx-root";
    this.batchedRenderer.name = "furia-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castFuria(center: Vector3, duration?: number): void {
    if (this.disposed) throw new Error("FuriaVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as FuriaCast | undefined;
      oldestCast?.dispose();
    }
    const auraDuration = duration === undefined
      ? this.config.auraDuration
      : finiteOr(duration, this.config.auraDuration, 0.1);
    const cast = new FuriaCast(
      this.scene,
      this.batchedRenderer,
      new Group(),
      this.shared,
      { ...this.config, auraDuration },
      center,
      (finishedCast) => this.casts.delete(finishedCast),
    );
    this.casts.add(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed) return;
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

  getPhase(): FuriaPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasActivation = false;
    let hasActive = false;
    for (const cast of this.casts) {
      const phase = cast.getPhase();
      if (phase === "activation") hasActivation = true;
      if (phase === "active") hasActive = true;
    }
    if (hasActivation) return "activation";
    if (hasActive) return "active";
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
    this.shared.ringGeometry.dispose();
    disposeFuriaParticleMaterials(this.shared.particleMaterials);
    disposeFuriaTextures(this.textures);
    this.castRoot.clear();
  }
}

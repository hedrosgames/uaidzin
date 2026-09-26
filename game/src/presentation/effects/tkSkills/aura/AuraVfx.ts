import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createAuraParticleMaterials,
  createAuraShimmerSystems,
  disposeAuraParticleMaterials,
  type AuraParticleMaterials,
  type AuraShimmerSystems,
} from "./AuraParticleSystems";
import {
  createAuraTextures,
  disposeAuraTextures,
  type AuraTextureSet,
} from "./AuraTextures";

export interface AuraVfxConfig {
  duration: number;
  activationDuration: number;
  fadeDuration: number;
  pulseInterval: number;
  maxConcurrentCasts: number;
  shimmerEmission: number;
  moteCount: number;
  bodyRadius: number;
  ringRadius: number;
}

export const DEFAULT_AURA_VFX_CONFIG: AuraVfxConfig = {
  duration: 8,
  activationDuration: 0.5,
  fadeDuration: 1.2,
  pulseInterval: 1,
  maxConcurrentCasts: 2,
  shimmerEmission: 14,
  moteCount: 14,
  bodyRadius: 0.7,
  ringRadius: 1.1,
};

type AuraPhase = "activation" | "active" | "fade";

interface OrbitMote {
  sprite: Sprite;
  radius: number;
  baseHeight: number;
  angularSpeed: number;
  bobFrequency: number;
  bobAmplitude: number;
  size: number;
  phase: number;
}

const GROUND_RING_VERTEX =  `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GROUND_RING_FRAGMENT =  `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPulseInterval;
  uniform vec3 uColor;
  varying vec2 vLocal;
  void main() {
    float radius = length(vLocal);
    float normalized = radius / 1.1;
    float band = smoothstep(0.42, 0.72, normalized) * (1.0 - smoothstep(0.88, 1.0, normalized));
    float pulse = 0.5 + 0.5 * sin(uTime * 6.2831853 / max(uPulseInterval, 0.05));
    float waves = 0.5 + 0.5 * sin(normalized * 16.0 - uTime * 2.4);
    float alpha = band * (0.18 + 0.2 * pulse) * (0.78 + 0.22 * waves) * uIntensity;
    vec3 color = uColor * (0.9 + 0.5 * pulse * waves);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createGroundRingMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uPulseInterval: { value: 1 },
      uColor: { value: new Color(0.83, 0.63, 0.09) },
    },
    vertexShader: GROUND_RING_VERTEX,
    fragmentShader: GROUND_RING_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
}

function createSharedResources(
  textures: AuraTextureSet,
): {
  particleMaterials: AuraParticleMaterials;
  ringGeometry: PlaneGeometry;
} {
  const particleMaterials = createAuraParticleMaterials(textures);
  const ringGeometry = new PlaneGeometry(2.2, 2.2);
  return { particleMaterials, ringGeometry };
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class AuraCast {
  private readonly shimmerSystems: AuraShimmerSystems;
  private readonly systems: ParticleSystem[];
  private readonly ring: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly halo: Sprite;
  private readonly haloMaterial: SpriteMaterial;
  private readonly moteMaterial: SpriteMaterial;
  private readonly motes: OrbitMote[] = [];
  private readonly light: PointLight;
  private phase: AuraPhase = "activation";
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
      particleMaterials: AuraParticleMaterials;
      ringGeometry: PlaneGeometry;
      textures: AuraTextureSet;
    },
    private readonly config: AuraVfxConfig,
    center: Vector3,
    private readonly onDispose: (cast: AuraCast) => void,
  ) {
    scene.add(this.castRoot);
    this.shimmerSystems = createAuraShimmerSystems(shared.particleMaterials, config);
    this.systems = [...this.shimmerSystems.all];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.ring = new Mesh(shared.ringGeometry, createGroundRingMaterial());
    this.ring.name = "tk-aura-ground-ring";
    this.ring.material.uniforms.uPulseInterval.value = config.pulseInterval;
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 11;
    this.castRoot.add(this.ring);

    this.haloMaterial = new SpriteMaterial({
      map: shared.textures.halo,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      color: new Color(0.94, 0.78, 0.34),
      opacity: 0,
    });
    this.halo = new Sprite(this.haloMaterial);
    this.halo.name = "tk-aura-halo";
    this.halo.position.y = 1;
    this.halo.renderOrder = 9;
    this.castRoot.add(this.halo);

    this.moteMaterial = new SpriteMaterial({
      map: shared.textures.mote,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      color: new Color(0.98, 0.88, 0.52),
      opacity: 0,
    });
    for (let index = 0; index < config.moteCount; index += 1) {
      const sprite = new Sprite(this.moteMaterial);
      sprite.name = `tk-aura-mote-${index}`;
      sprite.renderOrder = 10;
      this.castRoot.add(sprite);
      const fraction = index / Math.max(1, config.moteCount);
      this.motes.push({
        sprite,
        radius: 0.5 + 0.28 * Math.abs(Math.sin(index * 2.3999632)),
        baseHeight: 0.3 + 1.4 * fraction,
        angularSpeed: (index % 2 === 0 ? 1 : -1) * (0.55 + 0.5 * Math.abs(Math.cos(index * 1.7))),
        bobFrequency: 0.9 + 0.7 * Math.abs(Math.sin(index * 3.1)),
        bobAmplitude: 0.06 + 0.08 * Math.abs(Math.cos(index * 2.9)),
        size: 0.08 + 0.09 * Math.abs(Math.sin(index * 4.7)),
        phase: index * 0.6180339,
      });
    }

    this.light = new PointLight(0xd4a017, 0, 5.5, 2);
    this.castRoot.add(this.light);

    this.place(center);
    this.triggerActivation();
  }

  getPhase(): AuraPhase {
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
      haloOpacity: this.haloMaterial.opacity,
      moteOpacity: this.moteMaterial.opacity,
      lightIntensity: this.light.intensity,
      position: this.castRoot.position.toArray(),
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
    this.castRoot.remove(this.ring, this.halo, this.light);
    for (const mote of this.motes) this.castRoot.remove(mote.sprite);
    this.ring.material.dispose();
    this.haloMaterial.dispose();
    this.moteMaterial.dispose();
    this.castRoot.removeFromParent();
    this.castRoot.clear();
    this.onDispose(this);
  }

  private place(center: Vector3): void {
    const position = center.clone();
    position.y = 0.02;
    this.castRoot.position.copy(position);
    this.ring.position.set(0, 0.01, 0);
    this.light.position.set(0, 1, 0);
  }

  private triggerActivation(): void {
    this.phase = "activation";
    this.activationElapsed = 0;
    this.shimmerSystems.shimmer.emitter.visible = true;
    this.shimmerSystems.shimmer.restart();
    this.shimmerSystems.shimmer.play();
    this.ring.scale.setScalar(0.3);
    this.ring.material.uniforms.uIntensity.value = 0;
  }

  private updateActivation(deltaTime: number): void {
    this.activationElapsed += deltaTime;
    const progress = MathUtils.clamp(
      this.activationElapsed / this.config.activationDuration,
      0,
      1,
    );
    const ease = 1 - Math.pow(1 - progress, 3);
    this.pulseTime += deltaTime;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    this.ring.scale.setScalar(0.3 + ease * 0.7);
    this.ring.material.uniforms.uIntensity.value = ease;
    this.haloMaterial.opacity = ease * 0.5;
    this.moteMaterial.opacity = ease * 0.85;
    this.light.intensity = ease * 1.1;
    this.updateMotes();
    if (this.activationElapsed + 1e-9 >= this.config.activationDuration) {
      this.phase = "active";
      this.activeElapsed = 0;
    }
  }

  private updateActive(deltaTime: number): void {
    this.activeElapsed += deltaTime;
    this.pulseTime += deltaTime;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    const pulse = 0.5 + 0.5 * Math.sin((this.pulseTime * Math.PI * 2) / Math.max(this.config.pulseInterval, 0.05));
    this.ring.material.uniforms.uIntensity.value = 0.82 + pulse * 0.18;
    const breathe = 1 + Math.sin(this.pulseTime * 1.6) * 0.03;
    this.ring.scale.setScalar(breathe);
    this.haloMaterial.opacity = 0.38 + pulse * 0.2;
    this.halo.scale.setScalar(1.7 + pulse * 0.22);
    this.moteMaterial.opacity = 0.7 + pulse * 0.25;
    this.light.intensity = 0.95 + pulse * 0.4;
    this.updateMotes();
    if (this.activeElapsed + 1e-9 >= this.config.duration) this.triggerFade();
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
    this.ring.material.uniforms.uIntensity.value = fade * 0.85;
    this.haloMaterial.opacity = 0.5 * fade;
    this.moteMaterial.opacity = 0.85 * fade;
    this.light.intensity = 1.1 * fade;
    this.ring.scale.setScalar(1 + progress * 0.1);
    this.updateMotes();
    if (this.fadeElapsed + 1e-9 >= this.config.fadeDuration) this.dispose();
  }

  private updateMotes(): void {
    for (const mote of this.motes) {
      const angle = mote.phase + this.pulseTime * mote.angularSpeed;
      mote.sprite.position.set(
        Math.cos(angle) * mote.radius,
        mote.baseHeight + Math.sin(this.pulseTime * mote.bobFrequency + mote.phase) * mote.bobAmplitude,
        Math.sin(angle) * mote.radius,
      );
      mote.sprite.scale.setScalar(mote.size);
    }
  }
}

export class AuraVfxController {
  private readonly textures = createAuraTextures();
  private readonly shared = createSharedResources(this.textures);
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<AuraCast>();
  private readonly config: AuraVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<AuraVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_AURA_VFX_CONFIG, ...config };
    this.config = {
      duration: finiteOr(merged.duration, DEFAULT_AURA_VFX_CONFIG.duration, 0.1),
      activationDuration: finiteOr(merged.activationDuration, DEFAULT_AURA_VFX_CONFIG.activationDuration, 0.02),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_AURA_VFX_CONFIG.fadeDuration, 0.1),
      pulseInterval: finiteOr(merged.pulseInterval, DEFAULT_AURA_VFX_CONFIG.pulseInterval, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_AURA_VFX_CONFIG.maxConcurrentCasts, 1)),
      shimmerEmission: finiteOr(merged.shimmerEmission, DEFAULT_AURA_VFX_CONFIG.shimmerEmission, 0),
      moteCount: Math.floor(finiteOr(merged.moteCount, DEFAULT_AURA_VFX_CONFIG.moteCount, 0)),
      bodyRadius: finiteOr(merged.bodyRadius, DEFAULT_AURA_VFX_CONFIG.bodyRadius, 0.1),
      ringRadius: finiteOr(merged.ringRadius, DEFAULT_AURA_VFX_CONFIG.ringRadius, 0.3),
    };
    this.castRoot.name = "aura-vfx-root";
    this.batchedRenderer.name = "aura-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castAura(center: Vector3, duration?: number): void {
    if (this.disposed) throw new Error("AuraVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as AuraCast | undefined;
      oldestCast?.dispose();
    }
    const auraDuration = duration === undefined
      ? this.config.duration
      : finiteOr(duration, this.config.duration, 0.1);
    const cast = new AuraCast(
      this.scene,
      this.batchedRenderer,
      new Group(),
      { ...this.shared, textures: this.textures },
      { ...this.config, duration: auraDuration },
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

  getPhase(): AuraPhase | "idle" {
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
    disposeAuraParticleMaterials(this.shared.particleMaterials);
    disposeAuraTextures(this.textures);
    this.castRoot.clear();
  }
}

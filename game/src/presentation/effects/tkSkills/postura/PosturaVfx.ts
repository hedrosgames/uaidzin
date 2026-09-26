import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import {
  createPosturaParticleMaterials,
  createPosturaSparkSystems,
  disposePosturaParticleMaterials,
  type PosturaParticleMaterials,
  type PosturaSparkSystems,
} from "./PosturaParticleSystems";
import {
  createPosturaTextures,
  disposePosturaTextures,
  type PosturaTextureSet,
} from "./PosturaTextures";

export interface PosturaVfxConfig {
  duration: number;
  activationDuration: number;
  fadeDuration: number;
  resistInterval: number;
  maxConcurrentCasts: number;
  ringRadius: number;
  sparkEmission: number;
  moteEmission: number;
}

export const DEFAULT_POSTURA_VFX_CONFIG: PosturaVfxConfig = {
  duration: 6,
  activationDuration: 0.3,
  fadeDuration: 0.9,
  resistInterval: 1.4,
  maxConcurrentCasts: 2,
  ringRadius: 1.25,
  sparkEmission: 12,
  moteEmission: 6,
};

type PosturaPhase = "activation" | "active" | "fade";

const IRON = new Color(0.14, 0.11, 0.078);
const GOLD = new Color(0.83, 0.63, 0.09);
const GOLD_BRIGHT = new Color(0.93, 0.78, 0.32);

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
  uniform float uRadius;
  uniform vec3 uIron;
  uniform vec3 uGold;
  varying vec2 vLocal;
  void main() {
    float radius = length(vLocal) / max(uRadius, 0.001);
    float breath = 0.5 + 0.5 * sin(uTime * 1.35);
    float rim = smoothstep(0.78, 0.9, radius) * (1.0 - smoothstep(0.94, 1.0, radius));
    float innerRim = smoothstep(0.6, 0.7, radius) * (1.0 - smoothstep(0.74, 0.84, radius));
    float disc = 1.0 - smoothstep(0.6, 0.9, radius);
    float segments = 0.6 + 0.4 * step(0.55, fract(radius * 9.0 + 0.5 * sin(atan(vLocal.y, vLocal.x) * 12.0 + uTime * 0.4)));
    vec3 ironColor = uIron * (0.75 + 0.35 * breath);
    float ironAlpha = disc * 0.62 * uIntensity;
    vec3 goldColor = uGold * (0.85 + 0.7 * breath);
    float rimAlpha = (rim * (0.62 + 0.3 * breath) + innerRim * 0.24 * segments) * uIntensity;
    vec3 color = ironColor * ironAlpha + goldColor * rimAlpha * 1.35;
    float alpha = clamp(ironAlpha + rimAlpha, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createGroundRingMaterial(radius: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uRadius: { value: radius },
      uIron: { value: IRON.clone() },
      uGold: { value: GOLD.clone() },
    },
    vertexShader: GROUND_RING_VERTEX,
    fragmentShader: GROUND_RING_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

function createSharedResources(
  textures: PosturaTextureSet,
): {
  particleMaterials: PosturaParticleMaterials;
  groundGeometry: PlaneGeometry;
  closureGeometry: RingGeometry;
} {
  const particleMaterials = createPosturaParticleMaterials(textures);
  const groundGeometry = new PlaneGeometry(2.9, 2.9);
  const closureGeometry = new RingGeometry(0.88, 1, 64);
  return { particleMaterials, groundGeometry, closureGeometry };
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function createClosureRing(
  shared: { closureGeometry: RingGeometry },
  order: number,
): Mesh<RingGeometry, MeshBasicMaterial> {
  const material = new MeshBasicMaterial({
    color: GOLD_BRIGHT.clone(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const ring = new Mesh(shared.closureGeometry, material);
  ring.name = `tk-postura-closure-ring-${order}`;
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 12;
  ring.visible = false;
  return ring;
}

class PosturaCast {
  private readonly sparkSystems: PosturaSparkSystems;
  private readonly systems: ParticleSystem[];
  private readonly groundRing: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly closureRings: Mesh<RingGeometry, MeshBasicMaterial>[] = [];
  private readonly flash: Sprite;
  private readonly flashMaterial: SpriteMaterial;
  private readonly light: PointLight;
  private phase: PosturaPhase = "activation";
  private activationElapsed = 0;
  private activeElapsed = 0;
  private fadeElapsed = 0;
  private breathTime = 0;
  private nextResist = 0;
  private resistCount = 0;
  private seed: number;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: {
      particleMaterials: PosturaParticleMaterials;
      groundGeometry: PlaneGeometry;
      closureGeometry: RingGeometry;
      textures: PosturaTextureSet;
    },
    private readonly config: PosturaVfxConfig,
    center: Vector3,
    private readonly onDispose: (cast: PosturaCast) => void,
  ) {
    this.seed = Math.floor(Math.random() * 2147483647) || 1;
    scene.add(this.castRoot);
    this.sparkSystems = createPosturaSparkSystems(shared.particleMaterials, config);
    this.systems = [...this.sparkSystems.all];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.groundRing = new Mesh(shared.groundGeometry, createGroundRingMaterial(config.ringRadius));
    this.groundRing.name = "tk-postura-ground-ring";
    this.groundRing.rotation.x = -Math.PI / 2;
    this.groundRing.renderOrder = 11;
    this.groundRing.scale.setScalar(0.35);
    this.castRoot.add(this.groundRing);

    for (let index = 0; index < 2; index += 1) {
      const ring = createClosureRing(shared, index);
      this.castRoot.add(ring);
      this.closureRings.push(ring);
    }

    this.flashMaterial = new SpriteMaterial({
      map: shared.textures.flash,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      color: new Color(0.95, 0.82, 0.45),
      opacity: 0,
    });
    this.flash = new Sprite(this.flashMaterial);
    this.flash.name = "tk-postura-flash";
    this.flash.position.y = 0.85;
    this.flash.renderOrder = 10;
    this.castRoot.add(this.flash);

    this.light = new PointLight(0xd4a017, 0, 5, 2);
    this.light.position.set(0, 0.9, 0);
    this.castRoot.add(this.light);

    this.place(center);
    this.triggerActivation();
  }

  getPhase(): PosturaPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.activationElapsed + this.activeElapsed + this.fadeElapsed,
      breathTime: this.breathTime,
      resists: this.resistCount,
      ring: {
        opacity: this.groundRing.material.uniforms.uIntensity.value as number,
        scale: this.groundRing.scale.x,
      },
      closure: this.closureRings.map((ring) => ({
        opacity: ring.material.opacity,
        scale: ring.scale.x,
      })),
      flashOpacity: this.flashMaterial.opacity,
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
    this.castRoot.remove(this.groundRing, this.flash, this.light);
    for (const ring of this.closureRings) this.castRoot.remove(ring);
    this.groundRing.material.dispose();
    this.flashMaterial.dispose();
    for (const ring of this.closureRings) ring.material.dispose();
    this.castRoot.removeFromParent();
    this.castRoot.clear();
    this.onDispose(this);
  }

  private random(): number {
    this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
    return this.seed / 2147483648;
  }

  private place(center: Vector3): void {
    const position = center.clone();
    position.y = 0.02;
    this.castRoot.position.copy(position);
    this.groundRing.position.set(0, 0.01, 0);
    this.sparkSystems.burst.emitter.position.set(position.x, 0.14, position.z);
    this.sparkSystems.burst.emitter.rotation.set(-Math.PI / 2, 0, 0);
    this.sparkSystems.ambient.emitter.position.set(position.x, 0.1, position.z);
    this.sparkSystems.ambient.emitter.rotation.set(-Math.PI / 2, 0, 0);
  }

  private triggerActivation(): void {
    this.phase = "activation";
    this.activationElapsed = 0;
    for (const system of this.systems) system.emitter.visible = false;
    this.sparkSystems.burst.pause();
    this.sparkSystems.ambient.restart();
    this.sparkSystems.ambient.pause();
  }

  private updateActivation(deltaTime: number): void {
    this.activationElapsed += deltaTime;
    const progress = MathUtils.clamp(
      this.activationElapsed / this.config.activationDuration,
      0,
      1,
    );
    const close = 1 - Math.pow(1 - progress, 2);
    this.breathTime += deltaTime;

    for (let index = 0; index < this.closureRings.length; index += 1) {
      const ring = this.closureRings[index];
      const startScale = index === 0 ? 3.4 : 2.6;
      const endScale = index === 0 ? 1.1 : 0.72;
      ring.visible = progress < 1;
      ring.material.opacity = (index === 0 ? 0.85 : 0.6) * Math.sin(progress * Math.PI * 0.9 + 0.35) * 1.2;
      ring.material.opacity = MathUtils.clamp(ring.material.opacity, 0, index === 0 ? 0.9 : 0.65);
      ring.scale.setScalar(MathUtils.lerp(startScale, endScale, close));
      ring.position.y = 0.03 + close * 0.1;
    }

    this.groundRing.scale.setScalar(0.35 + close * 0.65);
    this.groundRing.material.uniforms.uIntensity.value = close;
    this.groundRing.material.uniforms.uTime.value = this.breathTime;

    this.flash.scale.setScalar(1.4 + close * 0.9);
    this.flashMaterial.opacity = Math.pow(1 - progress, 1.4) * 0.9;
    this.light.intensity = (1 - Math.pow(1 - progress, 2)) * 2.4;

    if (progress >= 1) {
      this.phase = "active";
      this.activeElapsed = 0;
      this.nextResist = 0.5 + this.random() * this.config.resistInterval * 0.6;
      this.sparkSystems.ambient.emitter.visible = true;
      this.sparkSystems.ambient.restart();
      this.sparkSystems.ambient.play();
      for (const ring of this.closureRings) ring.visible = false;
      this.flashMaterial.opacity = 0;
    }
  }

  private updateActive(deltaTime: number): void {
    this.activeElapsed += deltaTime;
    this.breathTime += deltaTime;
    this.groundRing.material.uniforms.uTime.value = this.breathTime;
    const breath = 0.5 + 0.5 * Math.sin(this.breathTime * 1.35);
    this.groundRing.material.uniforms.uIntensity.value = 0.72 + breath * 0.2;
    this.groundRing.scale.setScalar(1 + Math.sin(this.breathTime * 0.8) * 0.025);
    this.light.intensity = 0.55 + breath * 0.3;

    if (this.activeElapsed >= this.nextResist) this.triggerResist();

    if (this.activeElapsed >= this.config.duration) {
      this.phase = "fade";
      this.fadeElapsed = 0;
      for (const system of this.systems) system.endEmit();
    }
  }

  private triggerResist(): void {
    this.resistCount += 1;
    this.nextResist = this.activeElapsed
      + 0.9 + this.random() * this.config.resistInterval;
    this.sparkSystems.burst.emitter.visible = true;
    this.sparkSystems.burst.restart();
    this.sparkSystems.burst.play();
    this.light.intensity = 1.5;
    this.groundRing.material.uniforms.uIntensity.value = 1;
  }

  private updateFade(deltaTime: number): void {
    this.fadeElapsed += deltaTime;
    this.breathTime += deltaTime;
    this.groundRing.material.uniforms.uTime.value = this.breathTime;
    const progress = MathUtils.clamp(this.fadeElapsed / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.groundRing.material.uniforms.uIntensity.value = fade * 0.8;
    this.light.intensity = 0.6 * fade;
    this.groundRing.scale.setScalar(1 + progress * 0.08);
    if (this.fadeElapsed >= this.config.fadeDuration) this.dispose();
  }
}

export class PosturaVfxController {
  private readonly textures = createPosturaTextures();
  private readonly shared = createSharedResources(this.textures);
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<PosturaCast>();
  private readonly config: PosturaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<PosturaVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_POSTURA_VFX_CONFIG, ...config };
    this.config = {
      duration: finiteOr(merged.duration, DEFAULT_POSTURA_VFX_CONFIG.duration, 0.1),
      activationDuration: finiteOr(merged.activationDuration, DEFAULT_POSTURA_VFX_CONFIG.activationDuration, 0.02),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_POSTURA_VFX_CONFIG.fadeDuration, 0.1),
      resistInterval: finiteOr(merged.resistInterval, DEFAULT_POSTURA_VFX_CONFIG.resistInterval, 0.2),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_POSTURA_VFX_CONFIG.maxConcurrentCasts, 1)),
      ringRadius: finiteOr(merged.ringRadius, DEFAULT_POSTURA_VFX_CONFIG.ringRadius, 0.3),
      sparkEmission: Math.floor(finiteOr(merged.sparkEmission, DEFAULT_POSTURA_VFX_CONFIG.sparkEmission, 0)),
      moteEmission: finiteOr(merged.moteEmission, DEFAULT_POSTURA_VFX_CONFIG.moteEmission, 0),
    };
    this.batchedRenderer.name = "postura-batched-renderer";
    this.scene.add(this.batchedRenderer);
  }

  castPostura(center: Vector3, duration?: number): void {
    if (this.disposed) throw new Error("PosturaVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as PosturaCast | undefined;
      oldestCast?.dispose();
    }
    const stanceDuration = duration === undefined
      ? this.config.duration
      : finiteOr(duration, this.config.duration, 0.1);
    const cast = new PosturaCast(
      this.scene,
      this.batchedRenderer,
      new Group(),
      { ...this.shared, textures: this.textures },
      { ...this.config, duration: stanceDuration },
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

  getPhase(): PosturaPhase | "idle" {
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
    this.shared.groundGeometry.dispose();
    this.shared.closureGeometry.dispose();
    disposePosturaParticleMaterials(this.shared.particleMaterials);
    disposePosturaTextures(this.textures);
  }
}

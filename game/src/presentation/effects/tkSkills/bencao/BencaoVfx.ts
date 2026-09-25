import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
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
  createBencaoParticleMaterials,
  createBencaoAuraSystems,
  createBencaoBurstSystems,
  disposeBencaoParticleMaterials,
  type BencaoParticleMaterials,
  type BencaoAuraSystems,
  type BencaoBurstSystems,
} from "./BencaoParticleSystems";
import {
  createBencaoTextures,
  disposeBencaoTextures,
  type BencaoTextureSet,
} from "./BencaoTextures";

export interface BencaoVfxConfig {
  activationDuration: number;
  blessingDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  moteEmission: number;
  burstCount: number;
  ringRadius: number;
  columnHeight: number;
  columnRadius: number;
}

export const DEFAULT_BENCAO_VFX_CONFIG: BencaoVfxConfig = {
  activationDuration: 0.1,
  blessingDuration: 0.9,
  fadeDuration: 0.35,
  maxConcurrentCasts: 2,
  moteEmission: 22,
  burstCount: 26,
  ringRadius: 1.15,
  columnHeight: 2.6,
  columnRadius: 0.62,
};

type BencaoPhase = "activation" | "active" | "fade";

const GROUND_RING_VERTEX = `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GROUND_RING_FRAGMENT = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vLocal;
  void main() {
    float radius = length(vLocal);
    float normalized = radius / 1.35;
    float band = smoothstep(0.52, 0.72, normalized) * (1.0 - smoothstep(0.86, 1.0, normalized));
    float innerBand = smoothstep(0.1, 0.3, normalized) * (1.0 - smoothstep(0.42, 0.58, normalized)) * 0.4;
    float pulse = 0.62 + 0.38 * sin(uTime * 3.4);
    float waves = 0.5 + 0.5 * sin(normalized * 19.0 - uTime * 5.0);
    float alpha = (band * (0.46 + 0.3 * pulse) + innerBand * pulse * 0.5) * (0.74 + 0.26 * waves) * uIntensity;
    vec3 color = uColor * (0.85 + 0.85 * pulse * waves);
    gl_FragColor = vec4(color, alpha);
  }
`;

const COLUMN_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const COLUMN_FRAGMENT = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float heightFade = pow(1.0 - vUv.y, 1.55);
    float baseFade = smoothstep(0.0, 0.08, vUv.y);
    float streaks = 0.62 + 0.38 * sin(vUv.x * 37.699 + uTime * 2.2);
    float rise = 0.72 + 0.28 * sin(vUv.y * 9.0 - uTime * 3.4);
    float alpha = heightFade * baseFade * streaks * rise * uIntensity * 0.55;
    vec3 color = uColor * (0.9 + 0.6 * rise);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createGroundRingMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
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

function createColumnMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uColor: { value: new Color(0.94, 0.9, 0.82) },
    },
    vertexShader: COLUMN_VERTEX,
    fragmentShader: COLUMN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
}

function createSharedResources(
  textures: BencaoTextureSet,
): {
  particleMaterials: BencaoParticleMaterials;
  ringGeometry: PlaneGeometry;
  columnGeometry: CylinderGeometry;
} {
  const particleMaterials = createBencaoParticleMaterials(textures);
  const ringGeometry = new PlaneGeometry(2.7, 2.7);
  const columnGeometry = new CylinderGeometry(0.62, 0.78, 2.6, 24, 1, true);
  return { particleMaterials, ringGeometry, columnGeometry };
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class BencaoCast {
  private readonly auraSystems: BencaoAuraSystems;
  private readonly burstSystems: BencaoBurstSystems;
  private readonly systems: ParticleSystem[];
  private readonly ring: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly column: Mesh<CylinderGeometry, ShaderMaterial>;
  private readonly topGlow: Sprite;
  private readonly light: PointLight;
  private phase: BencaoPhase = "activation";
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
      particleMaterials: BencaoParticleMaterials;
      ringGeometry: PlaneGeometry;
      columnGeometry: CylinderGeometry;
    },
    private readonly config: BencaoVfxConfig,
    center: Vector3,
    private readonly onDispose: (cast: BencaoCast) => void,
  ) {
    scene.add(this.castRoot);
    this.auraSystems = createBencaoAuraSystems(shared.particleMaterials, config);
    this.burstSystems = createBencaoBurstSystems(shared.particleMaterials, config);
    this.systems = [...this.auraSystems.all, ...this.burstSystems.all];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.ring = new Mesh(shared.ringGeometry, createGroundRingMaterial());
    this.ring.name = "bencao-ground-ring";
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 11;
    this.castRoot.add(this.ring);

    this.column = new Mesh(shared.columnGeometry, createColumnMaterial());
    this.column.name = "bencao-column";
    this.column.renderOrder = 9;
    this.castRoot.add(this.column);

    this.topGlow = new Sprite(new SpriteMaterial({
      map: shared.particleMaterials.spark.map,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
      opacity: 0,
    }));
    this.topGlow.name = "bencao-top-glow";
    this.topGlow.renderOrder = 12;
    this.castRoot.add(this.topGlow);

    this.light = new PointLight(0xe8c547, 0, 6.5, 2);
    this.castRoot.add(this.light);

    this.place(center);
    this.triggerActivation();
  }

  getPhase(): BencaoPhase {
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
      column: {
        intensity: this.column.material.uniforms.uIntensity.value as number,
        scaleY: this.column.scale.y,
      },
      topGlow: {
        intensity: this.topGlow.material.opacity,
        position: this.topGlow.position.toArray(),
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
    this.castRoot.remove(this.ring, this.column, this.topGlow, this.light);
    this.ring.material.dispose();
    this.column.material.dispose();
    this.topGlow.material.dispose();
    this.castRoot.removeFromParent();
    this.castRoot.clear();
    this.onDispose(this);
  }

  private place(center: Vector3): void {
    const position = center.clone();
    position.y = 0.02;
    this.castRoot.position.copy(position);
    this.ring.position.set(0, 0.01, 0);
    this.column.position.set(0, this.config.columnHeight / 2, 0);
    this.topGlow.position.set(0, this.config.columnHeight, 0);
    this.light.position.set(0, 1.1, 0);
  }

  private triggerActivation(): void {
    this.phase = "activation";
    this.activationElapsed = 0;
    for (const system of this.burstSystems.all) {
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.auraSystems.motes.emitter.visible = true;
    this.auraSystems.motes.restart();
    this.auraSystems.motes.play();
    this.ring.scale.setScalar(0.24);
    this.ring.material.uniforms.uIntensity.value = 1;
    this.column.scale.set(0.4, 0.05, 0.4);
    this.column.material.uniforms.uIntensity.value = 1;
    this.topGlow.scale.setScalar(0.1);
    this.light.intensity = 4.6;
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
    this.column.scale.set(
      0.4 + ease * 0.6,
      0.05 + ease * 0.95,
      0.4 + ease * 0.6,
    );
    this.topGlow.scale.setScalar(0.1 + ease * 0.9);
    this.topGlow.material.opacity = ease;
    this.pulseTime += deltaTime;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    this.column.material.uniforms.uTime.value = this.pulseTime;
    this.light.intensity = 4.6 * (1 - progress * 0.65);
    if (this.activationElapsed + 1e-9 >= this.config.activationDuration) {
      this.phase = "active";
      this.activeElapsed = 0;
    }
  }

  private updateActive(deltaTime: number): void {
    this.activeElapsed += deltaTime;
    this.pulseTime += deltaTime;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    this.column.material.uniforms.uTime.value = this.pulseTime;
    this.light.intensity = 1.6 + Math.sin(this.pulseTime * 3.4) * 0.5;
    const breathe = 1 + Math.sin(this.pulseTime * 2.2) * 0.03;
    this.ring.scale.setScalar(breathe);
    this.topGlow.material.opacity = 0.78 + Math.sin(this.pulseTime * 3.0) * 0.16;
    const bob = Math.sin(this.pulseTime * 2.4) * 0.06;
    this.topGlow.position.y = this.config.columnHeight + bob;
    const columnBreathe = 1 + Math.sin(this.pulseTime * 2.8) * 0.02;
    this.column.scale.x = columnBreathe;
    this.column.scale.z = columnBreathe;
    if (this.activeElapsed + 1e-9 >= this.config.blessingDuration) this.triggerFade();
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
    this.column.material.uniforms.uTime.value = this.pulseTime;
    const progress = MathUtils.clamp(this.fadeElapsed / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.ring.material.uniforms.uIntensity.value = fade;
    this.column.material.uniforms.uIntensity.value = fade;
    this.topGlow.material.opacity = fade * 0.8;
    this.topGlow.position.y = this.config.columnHeight + progress * 0.4;
    this.light.intensity = 1.6 * fade;
    this.ring.scale.setScalar(1 + progress * 0.16);
    this.column.scale.set(1 + progress * 0.08, 1, 1 + progress * 0.08);
    if (this.fadeElapsed + 1e-9 >= this.config.fadeDuration) this.dispose();
  }
}

export class BencaoVfxController {
  private readonly textures = createBencaoTextures();
  private readonly shared = createSharedResources(this.textures);
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<BencaoCast>();
  private readonly config: BencaoVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<BencaoVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_BENCAO_VFX_CONFIG, ...config };
    this.config = {
      activationDuration: finiteOr(merged.activationDuration, DEFAULT_BENCAO_VFX_CONFIG.activationDuration, 0.02),
      blessingDuration: finiteOr(merged.blessingDuration, DEFAULT_BENCAO_VFX_CONFIG.blessingDuration, 0.1),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_BENCAO_VFX_CONFIG.fadeDuration, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_BENCAO_VFX_CONFIG.maxConcurrentCasts, 1)),
      moteEmission: finiteOr(merged.moteEmission, DEFAULT_BENCAO_VFX_CONFIG.moteEmission, 0),
      burstCount: Math.floor(finiteOr(merged.burstCount, DEFAULT_BENCAO_VFX_CONFIG.burstCount, 1)),
      ringRadius: finiteOr(merged.ringRadius, DEFAULT_BENCAO_VFX_CONFIG.ringRadius, 0.4),
      columnHeight: finiteOr(merged.columnHeight, DEFAULT_BENCAO_VFX_CONFIG.columnHeight, 0.5),
      columnRadius: finiteOr(merged.columnRadius, DEFAULT_BENCAO_VFX_CONFIG.columnRadius, 0.1),
    };
    this.castRoot.name = "bencao-vfx-root";
    this.batchedRenderer.name = "bencao-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castBencao(center: Vector3, duration?: number): void {
    if (this.disposed) throw new Error("BencaoVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as BencaoCast | undefined;
      oldestCast?.dispose();
    }
    const blessingDuration = duration === undefined
      ? this.config.blessingDuration
      : finiteOr(duration, this.config.blessingDuration, 0.1);
    const cast = new BencaoCast(
      this.scene,
      this.batchedRenderer,
      new Group(),
      this.shared,
      { ...this.config, blessingDuration },
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

  getPhase(): BencaoPhase | "idle" {
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
    this.shared.columnGeometry.dispose();
    disposeBencaoParticleMaterials(this.shared.particleMaterials);
    disposeBencaoTextures(this.textures);
    this.castRoot.clear();
  }
}

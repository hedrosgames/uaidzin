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
  createProvocacaoAuraSystems,
  createProvocacaoBurstSystems,
  createProvocacaoParticleMaterials,
  disposeProvocacaoParticleMaterials,
  type ProvocacaoAuraSystems,
  type ProvocacaoBurstSystems,
  type ProvocacaoParticleMaterials,
} from "./ProvocacaoParticleSystems";
import {
  createProvocacaoTextures,
  disposeProvocacaoTextures,
  type ProvocacaoTextureSet,
} from "./ProvocacaoTextures";
import type { TkLightPool } from "../../TkLightPool";

export interface ProvocacaoVfxConfig {
  shockDuration: number;
  surgeDuration: number;
  fadeDuration: number;
  maxConcurrentCasts: number;
  emberEmission: number;
  burstCount: number;
  ringMaxRadius: number;
  lineLength: number;
  haloScale: number;
}

export const DEFAULT_PROVOCACAO_VFX_CONFIG: ProvocacaoVfxConfig = {
  shockDuration: 0.22,
  surgeDuration: 0.58,
  fadeDuration: 0.3,
  maxConcurrentCasts: 2,
  emberEmission: 22,
  burstCount: 34,
  ringMaxRadius: 2.6,
  lineLength: 1.7,
  haloScale: 1.05,
};

export const PROVOCACAO_TOTAL_DURATION =
  DEFAULT_PROVOCACAO_VFX_CONFIG.shockDuration +
  DEFAULT_PROVOCACAO_VFX_CONFIG.surgeDuration +
  DEFAULT_PROVOCACAO_VFX_CONFIG.fadeDuration;

type ProvocacaoPhase = "shock" | "surge" | "fade";

const RING_VERTEX =  `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAGMENT =  `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uRadius;
  uniform vec3 uBlood;
  uniform vec3 uGold;
  varying vec2 vLocal;
  void main() {
    float normalized = length(vLocal) / uRadius;
    float mainBand = smoothstep(0.84, 0.96, normalized) * (1.0 - smoothstep(0.985, 1.0, normalized));
    float goldRim = smoothstep(0.93, 0.972, normalized) * (1.0 - smoothstep(0.988, 1.0, normalized));
    float trail = smoothstep(0.42, 0.9, normalized) * 0.22;
    float waves = 0.5 + 0.5 * sin(normalized * 26.0 - uTime * 11.0);
    float alpha = (mainBand * (0.86 + 0.3 * waves) + trail * waves) * uIntensity;
    vec3 color = mix(uBlood, uGold, goldRim) * (1.0 + goldRim * 0.85 + waves * 0.3);
    gl_FragColor = vec4(color, alpha);
  }
`;

const LINE_VERTEX =  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LINE_FRAGMENT =  `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uHead;
  uniform vec3 uBlood;
  uniform vec3 uGold;
  varying vec2 vUv;
  void main() {
    float distance = vUv.x;
    float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float body = smoothstep(0.0, max(uHead, 0.001), distance) * step(distance, uHead);
    float head = smoothstep(uHead - 0.16, uHead - 0.01, distance) * (1.0 - smoothstep(uHead, uHead + 0.03, distance));
    float zigzag = 0.72 + 0.28 * sin(distance * 34.0 - uTime * 20.0);
    float alpha = (body * (0.4 + 0.22 * zigzag) + head * 1.35) * across * uIntensity;
    vec3 color = mix(uBlood, uGold, head * 0.8) * (1.0 + head * 1.1);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createRingMaterial(ringMaxRadius: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uRadius: { value: ringMaxRadius },
      uBlood: { value: new Color(0xa33b3b) },
      uGold: { value: new Color(0xd4a017) },
    },
    vertexShader: RING_VERTEX,
    fragmentShader: RING_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
}

function createLineMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uHead: { value: 0 },
      uBlood: { value: new Color(0xa33b3b) },
      uGold: { value: new Color(0xd4a017) },
    },
    vertexShader: LINE_VERTEX,
    fragmentShader: LINE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
}

function createSharedResources(
  textures: ProvocacaoTextureSet,
  config: ProvocacaoVfxConfig,
): {
  particleMaterials: ProvocacaoParticleMaterials;
  ringGeometry: PlaneGeometry;
  lineGeometry: PlaneGeometry;
} {
  return {
    particleMaterials: createProvocacaoParticleMaterials(textures),
    ringGeometry: new PlaneGeometry(config.ringMaxRadius * 2, config.ringMaxRadius * 2),
    lineGeometry: new PlaneGeometry(config.lineLength, 0.1),
  };
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

interface ProvocacaoShared {
  particleMaterials: ProvocacaoParticleMaterials;
  ringGeometry: PlaneGeometry;
  lineGeometry: PlaneGeometry;
}

class ProvocacaoCast {
  private readonly burstSystems: ProvocacaoBurstSystems;
  private readonly auraSystems: ProvocacaoAuraSystems;
  private readonly systems: ParticleSystem[];
  private readonly ring: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly lineMaterial: ShaderMaterial;
  private readonly lines: Group;
  private readonly halo: Sprite;
  private readonly light: PointLight | null;
  private readonly isPooledLight: boolean;
  private phase: ProvocacaoPhase = "shock";
  private shockElapsed = 0;
  private surgeElapsed = 0;
  private fadeElapsed = 0;
  private pulseTime = 0;
  private lineHead = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: ProvocacaoShared,
    private readonly config: ProvocacaoVfxConfig,
    center: Vector3,
    private readonly onDispose: (cast: ProvocacaoCast) => void,
    private readonly lightPool?: TkLightPool,
  ) {
    scene.add(this.castRoot);
    this.burstSystems = createProvocacaoBurstSystems(shared.particleMaterials, config);
    this.auraSystems = createProvocacaoAuraSystems(shared.particleMaterials, config);
    this.systems = [...this.burstSystems.all, ...this.auraSystems.all];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }

    this.ring = new Mesh(shared.ringGeometry, createRingMaterial(config.ringMaxRadius));
    this.ring.name = "provocacao-shock-ring";
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 11;
    this.castRoot.add(this.ring);

    this.lineMaterial = createLineMaterial();
    this.lines = new Group();
    this.lines.name = "provocacao-attention-lines";
    for (let index = 0; index < 3; index += 1) {
      const angle = (index / 3) * Math.PI * 2 + Math.PI / 6;
      const pivot = new Group();
      pivot.rotation.y = -angle;
      const line = new Mesh(shared.lineGeometry, this.lineMaterial);
      line.name = "provocacao-attention-line";
      line.rotation.x = -Math.PI / 2;
      line.position.set(config.lineLength / 2, 0.55, 0);
      line.renderOrder = 12;
      pivot.add(line);
      this.lines.add(pivot);
    }
    this.castRoot.add(this.lines);

    this.halo = new Sprite(new SpriteMaterial({
      map: shared.particleMaterials.ember.map,
      color: new Color(1, 0.38, 0.28),
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    }));
    this.halo.name = "provocacao-halo";
    this.halo.renderOrder = 13;
    this.castRoot.add(this.halo);

    if (this.lightPool) {
      this.light = this.lightPool.acquire(0xd8493a, 7);
      this.isPooledLight = true;
    } else {
      this.light = new PointLight(0xd8493a, 0, 7, 2);
      this.isPooledLight = false;
    }
    if (this.light) this.castRoot.add(this.light);

    this.place(center);
    this.triggerShock();
  }

  getPhase(): ProvocacaoPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      elapsed: this.shockElapsed + this.surgeElapsed + this.fadeElapsed,
      pulseTime: this.pulseTime,
      ring: {
        scale: this.ring.scale.x,
        opacity: this.ring.material.uniforms.uIntensity.value as number,
      },
      lines: {
        head: this.lineHead,
        intensity: this.lineMaterial.uniforms.uIntensity.value as number,
      },
      halo: {
        intensity: this.halo.material.opacity,
        scale: this.halo.scale.x,
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
    if (this.phase === "shock") this.updateShock(deltaTime);
    else if (this.phase === "surge") this.updateSurge(deltaTime);
    else this.updateFade(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.castRoot.remove(this.ring, this.lines, this.halo);
    if (this.isPooledLight) {
      this.lightPool?.release(this.light);
    } else if (this.light) {
      this.castRoot.remove(this.light);
      this.light.dispose();
    }
    this.ring.material.dispose();
    this.lineMaterial.dispose();
    this.halo.material.dispose();
    this.lines.clear();
    this.castRoot.removeFromParent();
    this.castRoot.clear();
    this.onDispose(this);
  }

  private place(center: Vector3): void {
    const position = center.clone();
    position.y = 0.02;
    this.castRoot.position.copy(position);
    this.ring.position.set(0, 0.01, 0);
    this.halo.position.set(0, 1.18, 0);
    this.halo.scale.setScalar(0.1);
    if (this.light) this.light.position.set(0, 1, 0);
  }

  private triggerShock(): void {
    this.phase = "shock";
    this.shockElapsed = 0;
    for (const system of this.burstSystems.all) {
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.auraSystems.embers.emitter.visible = true;
    this.auraSystems.embers.restart();
    this.auraSystems.embers.play();
    this.ring.scale.setScalar(0.18);
    this.ring.material.uniforms.uIntensity.value = 1;
    this.lineMaterial.uniforms.uIntensity.value = 1;
    this.halo.material.opacity = 0.95;
    if (this.light) this.light.intensity = 6.2;
  }

  private updateShock(deltaTime: number): void {
    this.shockElapsed += deltaTime;
    this.pulseTime += deltaTime;
    const progress = MathUtils.clamp(this.shockElapsed / this.config.shockDuration, 0, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    this.ring.scale.setScalar(0.18 + ease * 0.82);
    this.lineHead = MathUtils.clamp(this.shockElapsed / (this.config.shockDuration + 0.13), 0, 1);
    this.lineMaterial.uniforms.uHead.value = this.lineHead;
    this.halo.scale.setScalar(this.config.haloScale * (0.4 + ease * 0.6));
    if (this.light) this.light.intensity = 6.2 * (1 - progress * 0.68);
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    this.lineMaterial.uniforms.uTime.value = this.pulseTime;
    if (this.shockElapsed >= this.config.shockDuration) {
      this.phase = "surge";
      this.surgeElapsed = 0;
    }
  }

  private updateSurge(deltaTime: number): void {
    this.surgeElapsed += deltaTime;
    this.pulseTime += deltaTime;
    const surgeProgress = MathUtils.clamp(this.surgeElapsed / this.config.surgeDuration, 0, 1);
    this.ring.scale.setScalar(1 + surgeProgress * 0.06);
    this.lineHead = MathUtils.clamp(
      (this.config.shockDuration + this.surgeElapsed) / (this.config.shockDuration + 0.13),
      0,
      1,
    );
    this.lineMaterial.uniforms.uHead.value = this.lineHead;
    this.lineMaterial.uniforms.uIntensity.value = 1 - surgeProgress * 0.55;
    const aggression = 1 + Math.sin(this.pulseTime * 9.2) * 0.16 + Math.sin(this.pulseTime * 15.7) * 0.06;
    this.halo.scale.setScalar(this.config.haloScale * aggression);
    this.halo.material.opacity = 0.72 + Math.sin(this.pulseTime * 9.2) * 0.2;
    if (this.light) this.light.intensity = 1.9 + Math.sin(this.pulseTime * 9.2) * 0.75;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    this.lineMaterial.uniforms.uTime.value = this.pulseTime;
    if (this.surgeElapsed >= this.config.surgeDuration) this.triggerFade();
  }

  private triggerFade(): void {
    this.phase = "fade";
    this.fadeElapsed = 0;
    for (const system of this.systems) system.endEmit();
  }

  private updateFade(deltaTime: number): void {
    this.fadeElapsed += deltaTime;
    this.pulseTime += deltaTime;
    const progress = MathUtils.clamp(this.fadeElapsed / this.config.fadeDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.ring.material.uniforms.uIntensity.value = fade;
    this.lineMaterial.uniforms.uIntensity.value = fade * 0.45;
    this.halo.material.opacity = 0.7 * fade;
    this.halo.scale.setScalar(this.config.haloScale * (1 + (1 - fade) * 0.3));
    if (this.light) this.light.intensity = 1.9 * fade;
    this.ring.material.uniforms.uTime.value = this.pulseTime;
    this.lineMaterial.uniforms.uTime.value = this.pulseTime;
    if (this.fadeElapsed >= this.config.fadeDuration) this.dispose();
  }
}

export class ProvocacaoVfxController {
  private readonly textures = createProvocacaoTextures();
  private readonly shared: ProvocacaoShared;
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<ProvocacaoCast>();
  private readonly config: ProvocacaoVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<ProvocacaoVfxConfig> = {},
    private readonly lightPool?: TkLightPool,
  ) {
    const merged = { ...DEFAULT_PROVOCACAO_VFX_CONFIG, ...config };
    this.config = {
      shockDuration: finiteOr(merged.shockDuration, DEFAULT_PROVOCACAO_VFX_CONFIG.shockDuration, 0.02),
      surgeDuration: finiteOr(merged.surgeDuration, DEFAULT_PROVOCACAO_VFX_CONFIG.surgeDuration, 0.05),
      fadeDuration: finiteOr(merged.fadeDuration, DEFAULT_PROVOCACAO_VFX_CONFIG.fadeDuration, 0.05),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, DEFAULT_PROVOCACAO_VFX_CONFIG.maxConcurrentCasts, 1)),
      emberEmission: finiteOr(merged.emberEmission, DEFAULT_PROVOCACAO_VFX_CONFIG.emberEmission, 0),
      burstCount: Math.floor(finiteOr(merged.burstCount, DEFAULT_PROVOCACAO_VFX_CONFIG.burstCount, 1)),
      ringMaxRadius: finiteOr(merged.ringMaxRadius, DEFAULT_PROVOCACAO_VFX_CONFIG.ringMaxRadius, 0.5),
      lineLength: finiteOr(merged.lineLength, DEFAULT_PROVOCACAO_VFX_CONFIG.lineLength, 0.3),
      haloScale: finiteOr(merged.haloScale, DEFAULT_PROVOCACAO_VFX_CONFIG.haloScale, 0.2),
    };
    this.shared = createSharedResources(this.textures, this.config);
    this.castRoot.name = "provocacao-vfx-root";
    this.batchedRenderer.name = "provocacao-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castProvocacao(center: Vector3, duration?: number): void {
    if (this.disposed) throw new Error("ProvocacaoVfxController descartado");
    if (!isFiniteVector3(center)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldestCast = this.casts.values().next().value as ProvocacaoCast | undefined;
      oldestCast?.dispose();
    }
    const total = duration === undefined
      ? PROVOCACAO_TOTAL_DURATION
      : finiteOr(duration, PROVOCACAO_TOTAL_DURATION, 0.12);
    const factor = total / PROVOCACAO_TOTAL_DURATION;
    const cast = new ProvocacaoCast(
      this.scene,
      this.batchedRenderer,
      new Group(),
      this.shared,
      {
        ...this.config,
        shockDuration: this.config.shockDuration * factor,
        surgeDuration: this.config.surgeDuration * factor,
        fadeDuration: this.config.fadeDuration * factor,
      },
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

  getPhase(): ProvocacaoPhase | "idle" {
    if (this.casts.size === 0) return "idle";
    let hasShock = false;
    let hasSurge = false;
    for (const cast of this.casts) {
      const phase = cast.getPhase();
      if (phase === "shock") hasShock = true;
      if (phase === "surge") hasSurge = true;
    }
    if (hasShock) return "shock";
    if (hasSurge) return "surge";
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
    this.shared.lineGeometry.dispose();
    disposeProvocacaoParticleMaterials(this.shared.particleMaterials);
    disposeProvocacaoTextures(this.textures);
    this.castRoot.clear();
  }
}

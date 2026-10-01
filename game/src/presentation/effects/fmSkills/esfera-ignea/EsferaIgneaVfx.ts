import {
  AdditiveBlending,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PointLight,
  Quaternion,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { BatchedRenderer, type ParticleSystem } from "three.quarks";
import { createFireBurstFlameTexture } from "../../fireBurst/FireBurstFlameTexture";
import { CometTail } from "../../vfxKit/cometTail";
import { createArcCurve } from "../../vfxKit/curveTrajectory";
import {
  createEsferaIgneaChargeSystems,
  createEsferaIgneaFlightSystems,
  createEsferaIgneaImpactSystems,
  createEsferaIgneaParticleMaterials,
  disposeEsferaIgneaParticleMaterials,
  type EsferaIgneaChargeSystems,
  type EsferaIgneaFlightSystems,
  type EsferaIgneaImpactSystems,
  type EsferaIgneaParticleMaterials,
} from "./EsferaIgneaParticleSystems";
import {
  createEsferaIgneaTextures,
  disposeEsferaIgneaTextures,
  type EsferaIgneaTextureSet,
} from "./EsferaIgneaTextures";

export interface EsferaIgneaVfxConfig {
  chargeDuration: number;
  speed: number;
  minFlightDuration: number;
  maxFlightDuration: number;
  impactDuration: number;
  maxConcurrentCasts: number;
  envelopeEmission: number;
  emberEmission: number;
  impactBurstCount: number;
  arc: number;
  lateral: number;
  tailLength: number;
  tailSpacing: number;
  maxTailShards: number;
  coreRadius: number;
  shellRadius: number;
  lightPeak: number;
  originHeight: number;
  targetHeight: number;
}

export const DEFAULT_ESFERA_IGNEA_VFX_CONFIG: EsferaIgneaVfxConfig = {
  chargeDuration: 0.12,
  speed: 26,
  minFlightDuration: 0.18,
  maxFlightDuration: 0.42,
  impactDuration: 0.62,
  maxConcurrentCasts: 3,
  envelopeEmission: 48,
  emberEmission: 40,
  impactBurstCount: 34,
  arc: 0.1,
  lateral: 0.05,
  tailLength: 0.18,
  tailSpacing: 0.05,
  maxTailShards: 90,
  coreRadius: 0.38,
  shellRadius: 0.68,
  lightPeak: 5.4,
  originHeight: 1.05,
  targetHeight: 0.9,
};

type CastPhase = "charge" | "flight" | "impact";

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

interface EsferaIgneaSharedResources {
  textures: EsferaIgneaTextureSet;
  flameTexture: EsferaIgneaTextureSet["hotCore"];
  particleMaterials: EsferaIgneaParticleMaterials;
  coreGeometry: IcosahedronGeometry;
  coreMaterial: MeshStandardMaterial;
  heartGeometry: SphereGeometry;
  heartMaterialTemplate: MeshBasicMaterial;
  shellGeometry: TorusGeometry;
  shellMaterial: MeshStandardMaterial;
  shardGeometry: OctahedronGeometry;
  shardMaterial: MeshStandardMaterial;
  flashGeometry: SphereGeometry;
  flashMaterialTemplate: MeshBasicMaterial;
  ringGeometry: RingGeometry;
  ringMaterialTemplate: MeshBasicMaterial;
  scorchGeometry: RingGeometry;
  scorchMaterialTemplate: MeshBasicMaterial;
  debrisGeometry: TetrahedronGeometry;
  debrisMaterial: MeshStandardMaterial;
}

function createSharedResources(): EsferaIgneaSharedResources {
  const textures = createEsferaIgneaTextures();
  const flameTexture = createFireBurstFlameTexture();
  const particleMaterials = createEsferaIgneaParticleMaterials(flameTexture, textures.ember);
  const coreGeometry = new IcosahedronGeometry(1, 1);
  const coreMaterial = new MeshStandardMaterial({
    map: textures.coreSurface,
    color: 0x1d120c,
    emissiveMap: textures.coreFissure,
    emissive: 0xff7a1a,
    emissiveIntensity: 0.46,
    roughness: 0.74,
    metalness: 0.28,
    flatShading: true,
  });
  const heartGeometry = new SphereGeometry(1, 12, 8);
  const heartMaterialTemplate = new MeshBasicMaterial({
    map: textures.hotCore,
    color: 0xffd790,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const shellGeometry = new TorusGeometry(1, 0.062, 6, 22, Math.PI * 1.42);
  const shellMaterial = new MeshStandardMaterial({
    map: textures.shellBand,
    color: 0x8f7038,
    emissive: 0xff7a1a,
    emissiveIntensity: 0.22,
    roughness: 0.3,
    metalness: 0.9,
  });
  const shardGeometry = new OctahedronGeometry(0.5, 0);
  shardGeometry.scale(0.45, 1.5, 0.45);
  const shardMaterial = new MeshStandardMaterial({
    color: 0x7a5228,
    emissive: 0xff6a12,
    emissiveIntensity: 0.9,
    roughness: 0.46,
    metalness: 0.66,
  });
  const flashGeometry = new SphereGeometry(1, 14, 10);
  const flashMaterialTemplate = new MeshBasicMaterial({
    map: textures.hotCore,
    color: 0xfff2c4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const ringGeometry = new RingGeometry(0.34, 0.52, 48);
  const ringMaterialTemplate = new MeshBasicMaterial({
    color: 0xffc46a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const scorchGeometry = new RingGeometry(0.18, 0.96, 40);
  const scorchMaterialTemplate = new MeshBasicMaterial({
    map: textures.scorch,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const debrisGeometry = new TetrahedronGeometry(0.5, 0);
  const debrisMaterial = new MeshStandardMaterial({
    color: 0x241610,
    emissive: 0xff5a0a,
    emissiveIntensity: 1.1,
    roughness: 0.7,
    metalness: 0.3,
    flatShading: true,
  });
  return {
    textures,
    flameTexture,
    particleMaterials,
    coreGeometry,
    coreMaterial,
    heartGeometry,
    heartMaterialTemplate,
    shellGeometry,
    shellMaterial,
    shardGeometry,
    shardMaterial,
    flashGeometry,
    flashMaterialTemplate,
    ringGeometry,
    ringMaterialTemplate,
    scorchGeometry,
    scorchMaterialTemplate,
    debrisGeometry,
    debrisMaterial,
  };
}

function isFiniteVector3(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function finiteOr(value: number, fallback: number, minimum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, value);
}

class EsferaIgneaCast {
  private readonly chargeSystems: EsferaIgneaChargeSystems;
  private readonly flightSystems: EsferaIgneaFlightSystems;
  private readonly impactSystems: EsferaIgneaImpactSystems;
  private readonly systems: ParticleSystem[];
  private readonly curve;
  private readonly tail: CometTail;
  private readonly core: Mesh<IcosahedronGeometry, MeshStandardMaterial>;
  private readonly heart: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly heartMaterial: MeshBasicMaterial;
  private readonly shells: Mesh<TorusGeometry, MeshStandardMaterial>[] = [];
  private readonly shellAxes: Quaternion[] = [];
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly flashMaterial: MeshBasicMaterial;
  private readonly ring: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly ringMaterial: MeshBasicMaterial;
  private readonly scorch: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly scorchMaterial: MeshBasicMaterial;
  private readonly light: PointLight;
  private readonly debris: InstancedMesh<TetrahedronGeometry, MeshStandardMaterial>;
  private readonly debrisDirections: Vector3[] = [];
  private readonly debrisSpin: Vector3[] = [];
  private readonly debrisDummy = new Object3D();
  private readonly debrisCount: number;
  private readonly head = new Vector3();
  private readonly tangent = new Vector3();
  private readonly reverseTangent = new Vector3();
  private readonly emitterOrientation = new Quaternion();
  private readonly flightDuration: number;
  private phase: CastPhase = "charge";
  private phaseElapsed = 0;
  private elapsed = 0;
  private disposed = false;
  private chargeGlow: Mesh<SphereGeometry, MeshBasicMaterial> | null = null;
  private chargeGlowMaterial: MeshBasicMaterial | null = null;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: EsferaIgneaSharedResources,
    private readonly config: EsferaIgneaVfxConfig,
    private readonly origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: EsferaIgneaCast) => void,
  ) {
    this.chargeSystems = createEsferaIgneaChargeSystems(shared.particleMaterials);
    this.flightSystems = createEsferaIgneaFlightSystems(shared.particleMaterials, config);
    this.impactSystems = createEsferaIgneaImpactSystems(shared.particleMaterials, config);
    this.systems = [
      ...this.chargeSystems.all,
      ...this.flightSystems.all,
      ...this.impactSystems.all,
    ];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    for (const system of this.chargeSystems.all) system.play();
    this.chargeSystems.motes.emitter.position.copy(origin);

    this.chargeGlowMaterial = shared.heartMaterialTemplate.clone();
    this.chargeGlowMaterial.opacity = 0;
    this.chargeGlow = new Mesh(shared.heartGeometry, this.chargeGlowMaterial);
    this.chargeGlow.name = "esfera-ignea-charge";
    this.chargeGlow.position.copy(origin);
    this.chargeGlow.visible = false;
    this.chargeGlow.renderOrder = 9;
    this.castRoot.add(this.chargeGlow);

    const distance = Math.max(origin.distanceTo(target), 0.0001);
    this.flightDuration = MathUtils.clamp(
      distance / config.speed,
      config.minFlightDuration,
      config.maxFlightDuration,
    );
    this.curve = createArcCurve(origin, target, 0, {
      arc: config.arc,
      lateral: config.lateral,
    });

    this.core = new Mesh(shared.coreGeometry, shared.coreMaterial);
    this.core.name = "esfera-ignea-core";
    this.core.position.copy(origin);
    this.core.scale.setScalar(config.coreRadius * 0.4);
    this.core.renderOrder = 8;
    this.castRoot.add(this.core);

    this.heartMaterial = shared.heartMaterialTemplate.clone();
    this.heart = new Mesh(shared.heartGeometry, this.heartMaterial);
    this.heart.name = "esfera-ignea-heart";
    this.heart.position.copy(origin);
    this.heart.scale.setScalar(config.coreRadius * 0.62);
    this.heart.renderOrder = 9;
    this.castRoot.add(this.heart);

    const shellTilt = [0, 0.92, -1.36];
    for (let index = 0; index < 3; index += 1) {
      const shell = new Mesh(shared.shellGeometry, shared.shellMaterial);
      shell.name = `esfera-ignea-shell-${index}`;
      shell.position.copy(origin);
      shell.scale.setScalar(config.shellRadius);
      shell.renderOrder = 8;
      this.castRoot.add(shell);
      this.shells.push(shell);
      this.shellAxes.push(
        new Quaternion().setFromAxisAngle(new Vector3(0.4, 1, 0.2).normalize(), shellTilt[index]),
      );
    }

    this.tail = new CometTail(
      this.castRoot,
      { shardGeometry: shared.shardGeometry, shardMaterial: shared.shardMaterial },
      this.curve,
      {
        objectName: "esfera-ignea-tail",
        spacing: config.tailSpacing,
        maxShards: config.maxTailShards,
        tailLength: config.tailLength,
        headScale: 0.17,
        tailScale: 0.015,
        spinSpeed: 12,
        wake: [this.flightSystems.wake],
      },
    );

    this.flashMaterial = shared.flashMaterialTemplate.clone();
    this.flash = new Mesh(shared.flashGeometry, this.flashMaterial);
    this.flash.name = "esfera-ignea-flash";
    this.flash.position.copy(target);
    this.flash.visible = false;
    this.flash.renderOrder = 12;
    this.castRoot.add(this.flash);

    this.ringMaterial = shared.ringMaterialTemplate.clone();
    this.ring = new Mesh(shared.ringGeometry, this.ringMaterial);
    this.ring.name = "esfera-ignea-ring";
    this.ring.position.copy(target);
    this.ring.visible = false;
    this.ring.renderOrder = 12;
    this.castRoot.add(this.ring);

    this.scorchMaterial = shared.scorchMaterialTemplate.clone();
    this.scorch = new Mesh(shared.scorchGeometry, this.scorchMaterial);
    this.scorch.name = "esfera-ignea-scorch";
    this.scorch.position.copy(target);
    this.scorch.rotation.x = -Math.PI / 2;
    this.scorch.visible = false;
    this.scorch.renderOrder = 11;
    this.castRoot.add(this.scorch);

    this.light = new PointLight(0xff7a1a, 0, 8, 2);
    this.light.position.copy(origin);
    this.castRoot.add(this.light);

    this.debrisCount = 14;
    this.debris = new InstancedMesh(shared.debrisGeometry, shared.debrisMaterial, this.debrisCount);
    this.debris.name = "esfera-ignea-debris";
    this.debris.count = 0;
    this.debris.frustumCulled = false;
    this.debris.instanceMatrix.setUsage(DynamicDrawUsage);
    this.castRoot.add(this.debris);
    for (let index = 0; index < this.debrisCount; index += 1) {
      const direction = new Vector3(
        Math.random() - 0.5,
        Math.random() * 0.85 + 0.12,
        Math.random() - 0.5,
      );
      if (direction.lengthSq() < 0.0001) direction.set(0, 1, 0);
      this.debrisDirections.push(direction.normalize());
      this.debrisSpin.push(new Vector3(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
      ));
    }
    this.updateCharge(0);
  }

  getPhase(): CastPhase {
    return this.phase;
  }

  getState() {
    return {
      phase: this.phase,
      progress: MathUtils.clamp(this.phaseElapsed / this.currentPhaseDuration(), 0, 1),
      elapsed: this.elapsed,
      phaseElapsed: this.phaseElapsed,
      head: this.head.toArray(),
      tangent: this.tangent.toArray(),
      target: this.target.toArray(),
      flightDuration: this.flightDuration,
      lightIntensity: this.light.intensity,
      coreScale: this.core.scale.x,
      tail: this.tail.getState(),
    };
  }

  getParticleCount(): number {
    return this.systems.reduce((total, system) => total + system.particleNum, 0);
  }

  getSystems(): ParticleSystem[] {
    return this.systems;
  }

  prepareFrame(): void {
    for (const system of this.systems) system.emitter.updateWorldMatrix(true, false);
  }

  update(deltaTime: number): void {
    if (this.disposed) return;
    this.elapsed += deltaTime;
    this.phaseElapsed += deltaTime;
    if (this.phase === "charge") this.updateCharge(deltaTime);
    else if (this.phase === "flight") this.updateFlight(deltaTime);
    else this.updateImpact(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.tail.dispose();
    this.castRoot.remove(
      this.core,
      this.heart,
      ...this.shells,
      this.flash,
      this.ring,
      this.scorch,
      this.debris,
      this.light,
    );
    if (this.chargeGlow) this.castRoot.remove(this.chargeGlow);
    this.heartMaterial.dispose();
    this.flashMaterial.dispose();
    this.ringMaterial.dispose();
    this.scorchMaterial.dispose();
    this.chargeGlowMaterial?.dispose();
    this.onDispose(this);
  }

  private currentPhaseDuration(): number {
    if (this.phase === "charge") return this.config.chargeDuration;
    if (this.phase === "flight") return this.flightDuration;
    return this.config.impactDuration;
  }

  private updateCharge(deltaTime: number): void {
    void deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.chargeDuration, 0, 1);
    if (this.chargeGlow && this.chargeGlowMaterial) {
      this.chargeGlow.visible = true;
      const squash = 1 - Math.sin(progress * Math.PI) * 0.24;
      this.chargeGlow.scale.set(
        this.config.coreRadius * (0.5 + progress * 0.7) * squash,
        this.config.coreRadius * (0.5 + progress * 0.7) / squash,
        this.config.coreRadius * (0.5 + progress * 0.7) * squash,
      );
      this.chargeGlowMaterial.opacity = progress * 0.9;
    }
    this.light.intensity = progress * 2.2;
    this.chargeSystems.motes.emitter.position.copy(this.origin);
    if (this.phaseElapsed >= this.config.chargeDuration) this.triggerFlight();
  }

  private triggerFlight(): void {
    this.phase = "flight";
    this.phaseElapsed = 0;
    for (const system of this.chargeSystems.all) system.endEmit();
    if (this.chargeGlow) this.chargeGlow.visible = false;
    for (const system of this.flightSystems.all) {
      system.emitter.position.copy(this.origin);
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.tail.startWake();
  }

  private updateFlight(deltaTime: number): void {
    void deltaTime;
    this.phaseElapsed = Math.min(this.phaseElapsed, this.flightDuration);
    const linear = MathUtils.clamp(this.phaseElapsed / this.flightDuration, 0, 1);
    const eased = 1 - Math.pow(1 - linear, 1.7);
    const launchPop = Math.max(1 - this.phaseElapsed / 0.09, 0);
    this.curve.getPointAt(eased, this.head);
    this.curve.getTangentAt(eased, this.tangent);
    if (this.tangent.lengthSq() < 0.001) this.tangent.copy(FORWARD);
    this.tangent.normalize();
    const spin = this.elapsed * 6.4;
    const grow = (0.62 + eased * 0.5) * (1 + launchPop * 0.38);
    this.core.position.copy(this.head);
    this.core.rotation.set(spin * 0.7, spin, spin * 0.35);
    this.heart.position.copy(this.head);
    this.core.scale.setScalar(this.config.coreRadius * grow);
    this.heart.scale.setScalar(this.config.coreRadius * grow * 1.25);
    this.heartMaterial.opacity = 0.58 + Math.sin(this.elapsed * 22) * 0.08;
    for (let index = 0; index < this.shells.length; index += 1) {
      const shell = this.shells[index];
      shell.position.copy(this.head);
      shell.quaternion.setFromUnitVectors(UP, this.tangent);
      shell.quaternion.multiply(this.shellAxes[index]);
      const wobble = 1 + Math.sin(this.elapsed * 5 + index) * 0.07;
      shell.scale.setScalar(this.config.shellRadius * grow * wobble);
    }
    this.tail.update(eased, this.elapsed);
    this.reverseTangent.copy(this.tangent).negate();
    this.emitterOrientation.setFromUnitVectors(FORWARD, this.reverseTangent);
    this.flightSystems.envelope.emitter.quaternion.copy(this.emitterOrientation);
    this.flightSystems.embers.emitter.quaternion.copy(this.emitterOrientation);
    this.flightSystems.orbiters.emitter.quaternion.copy(this.emitterOrientation);
    this.light.position.copy(this.head);
    this.light.intensity = 1.8 + Math.sin(linear * Math.PI) * 2.6 + launchPop * 2.4;
    for (const system of this.flightSystems.all) {
      system.emitter.position.copy(this.head);
    }
    if (this.phaseElapsed >= this.flightDuration) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.phaseElapsed = 0;
    this.head.copy(this.target);
    for (const system of this.flightSystems.all) system.endEmit();
    this.reverseTangent.copy(this.tangent).negate();
    this.emitterOrientation.setFromUnitVectors(FORWARD, this.reverseTangent);
    for (const system of this.impactSystems.all) {
      system.emitter.position.copy(this.target);
      system.emitter.quaternion.copy(this.emitterOrientation);
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.core.visible = false;
    this.heart.visible = false;
    this.tail.hide();
    this.flash.position.copy(this.target);
    this.flash.scale.setScalar(this.config.coreRadius * 0.6);
    this.flashMaterial.opacity = 1;
    this.flash.visible = true;
    this.ring.position.copy(this.target);
    this.ring.quaternion.setFromUnitVectors(FORWARD, this.tangent);
    this.ring.scale.setScalar(0.2);
    this.ringMaterial.opacity = 0.6;
    this.ring.visible = true;
    this.scorch.position.copy(this.target);
    this.scorch.quaternion.setFromUnitVectors(FORWARD, this.tangent);
    this.scorch.scale.setScalar(0.2);
    this.scorchMaterial.opacity = 0.95;
    this.scorch.visible = true;
    this.debris.count = this.debrisCount;
    this.light.position.copy(this.target);
    this.light.intensity = this.config.lightPeak;
  }

  private updateImpact(deltaTime: number): void {
    void deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.impactDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    const overshoot = 1 + Math.sin(Math.min(progress * 2.4, 1) * Math.PI) * 0.32;
    this.flash.scale.setScalar(this.config.coreRadius * (0.6 + Math.min(progress * 5, 1) * 1.7));
    this.flashMaterial.opacity = fade * 0.72;
    this.flash.visible = progress < 0.9;
    this.ring.scale.setScalar(0.2 + Math.sqrt(progress) * 2.6);
    this.ringMaterial.opacity = fade * 0.6;
    this.ring.visible = progress < 1;
    this.scorch.scale.setScalar(0.2 + progress * 1.5 * overshoot);
    this.scorchMaterial.opacity = Math.sqrt(1 - progress) * 0.82;
    this.scorch.visible = progress < 1;
    for (let index = 0; index < this.shells.length; index += 1) {
      const shell = this.shells[index];
      shell.visible = progress < 0.7;
      const burst = 1 + progress * 5.4;
      shell.scale.setScalar(this.config.shellRadius * burst);
      shell.rotation.x += deltaTime * (5 + index * 3);
      shell.rotation.y -= deltaTime * (4 + index * 2);
    }
    for (let index = 0; index < this.debrisCount; index += 1) {
      const direction = this.debrisDirections[index];
      const spin = this.debrisSpin[index];
      const time = this.phaseElapsed;
      this.debrisDummy.position.copy(this.target).addScaledVector(direction, time * 5.2);
      this.debrisDummy.position.y -= 3.4 * time * time;
      this.debrisDummy.rotation.set(
        spin.x * time,
        spin.y * time,
        spin.z * time,
      );
      const scale = Math.max(0.3 * (1 - progress * 0.85), 0.001);
      this.debrisDummy.scale.setScalar(scale);
      this.debrisDummy.updateMatrix();
      this.debris.setMatrixAt(index, this.debrisDummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;
    this.light.intensity = this.config.lightPeak * Math.pow(1 - progress, 3);
    if (this.phaseElapsed >= this.config.impactDuration) this.dispose();
  }
}

export class EsferaIgneaVfxController {
  private readonly shared = createSharedResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<EsferaIgneaCast>();
  private readonly config: EsferaIgneaVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<EsferaIgneaVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_ESFERA_IGNEA_VFX_CONFIG, ...config };
    const fallback = DEFAULT_ESFERA_IGNEA_VFX_CONFIG;
    this.config = {
      chargeDuration: finiteOr(merged.chargeDuration, fallback.chargeDuration, 0.02),
      speed: finiteOr(merged.speed, fallback.speed, 1),
      minFlightDuration: finiteOr(merged.minFlightDuration, fallback.minFlightDuration, 0.02),
      maxFlightDuration: finiteOr(merged.maxFlightDuration, fallback.maxFlightDuration, 0.05),
      impactDuration: finiteOr(merged.impactDuration, fallback.impactDuration, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, fallback.maxConcurrentCasts, 1)),
      envelopeEmission: finiteOr(merged.envelopeEmission, fallback.envelopeEmission, 0),
      emberEmission: finiteOr(merged.emberEmission, fallback.emberEmission, 0),
      impactBurstCount: Math.floor(finiteOr(merged.impactBurstCount, fallback.impactBurstCount, 1)),
      arc: finiteOr(merged.arc, fallback.arc, 0),
      lateral: finiteOr(merged.lateral, fallback.lateral, 0),
      tailLength: finiteOr(merged.tailLength, fallback.tailLength, 0.01),
      tailSpacing: finiteOr(merged.tailSpacing, fallback.tailSpacing, 0.01),
      maxTailShards: Math.floor(finiteOr(merged.maxTailShards, fallback.maxTailShards, 4)),
      coreRadius: finiteOr(merged.coreRadius, fallback.coreRadius, 0.02),
      shellRadius: finiteOr(merged.shellRadius, fallback.shellRadius, 0.02),
      lightPeak: finiteOr(merged.lightPeak, fallback.lightPeak, 0),
      originHeight: finiteOr(merged.originHeight, fallback.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, fallback.targetHeight, 0),
    };
    this.castRoot.name = "esfera-ignea-vfx-root";
    this.batchedRenderer.name = "esfera-ignea-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castEsferaIgnea(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("EsferaIgneaVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as EsferaIgneaCast | undefined;
      oldest?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new EsferaIgneaCast(
      this.scene,
      this.batchedRenderer,
      this.castRoot,
      this.shared,
      this.config,
      launchOrigin,
      impactTarget,
      (finished) => this.casts.delete(finished),
    );
    this.casts.add(cast);
  }

  update(deltaTime: number, width = 1, height = 1): void {
    if (this.disposed || this.casts.size === 0) return;
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
    let impact = false;
    for (const cast of this.casts) if (cast.getPhase() === "impact") impact = true;
    if (impact) return "impact";
    let flight = false;
    for (const cast of this.casts) if (cast.getPhase() === "flight") flight = true;
    return flight ? "flight" : "charge";
  }

  getSystems(): ParticleSystem[] {
    return [...this.casts].flatMap((cast) => cast.getSystems());
  }

  getCastStates() {
    return [...this.casts].map((cast) => cast.getState());
  }

  private updateFrame(deltaTime: number, width: number, height: number): void {
    for (const cast of this.casts) {
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
    this.shared.coreGeometry.dispose();
    this.shared.coreMaterial.dispose();
    this.shared.heartGeometry.dispose();
    this.shared.heartMaterialTemplate.dispose();
    this.shared.shellGeometry.dispose();
    this.shared.shellMaterial.dispose();
    this.shared.shardGeometry.dispose();
    this.shared.shardMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterialTemplate.dispose();
    this.shared.ringGeometry.dispose();
    this.shared.ringMaterialTemplate.dispose();
    this.shared.scorchGeometry.dispose();
    this.shared.scorchMaterialTemplate.dispose();
    this.shared.debrisGeometry.dispose();
    this.shared.debrisMaterial.dispose();
    this.shared.flameTexture.dispose();
    disposeEsferaIgneaParticleMaterials(this.shared.particleMaterials);
    disposeEsferaIgneaTextures(this.shared.textures);
    this.castRoot.clear();
  }
}

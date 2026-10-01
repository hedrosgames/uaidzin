import {
  AdditiveBlending,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
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
import { CometTail } from "../../vfxKit/cometTail";
import { createArcCurve } from "../../vfxKit/curveTrajectory";
import {
  createLancaGlacialChargeSystems,
  createLancaGlacialFlightSystems,
  createLancaGlacialImpactSystems,
  createLancaGlacialParticleMaterials,
  disposeLancaGlacialParticleMaterials,
  type LancaGlacialChargeSystems,
  type LancaGlacialFlightSystems,
  type LancaGlacialImpactSystems,
  type LancaGlacialParticleMaterials,
} from "./LancaGlacialParticleSystems";
import { createLancaGlacialFrostTexture } from "./LancaGlacialFrostTexture";
import {
  createLancaGlacialTextures,
  disposeLancaGlacialTextures,
  type LancaGlacialTextureSet,
} from "./LancaGlacialTextures";

export interface LancaGlacialVfxConfig {
  chargeDuration: number;
  speed: number;
  minFlightDuration: number;
  maxFlightDuration: number;
  impactDuration: number;
  maxConcurrentCasts: number;
  mantleEmission: number;
  glintEmission: number;
  shatterCount: number;
  arc: number;
  lateral: number;
  tailLength: number;
  tailSpacing: number;
  maxTailShards: number;
  bladeRadius: number;
  socketRadius: number;
  shardRadius: number;
  haftLength: number;
  lightPeak: number;
  originHeight: number;
  targetHeight: number;
}

export const DEFAULT_LANCA_GLACIAL_VFX_CONFIG: LancaGlacialVfxConfig = {
  chargeDuration: 0.1,
  speed: 34,
  minFlightDuration: 0.14,
  maxFlightDuration: 0.34,
  impactDuration: 0.58,
  maxConcurrentCasts: 3,
  mantleEmission: 36,
  glintEmission: 44,
  shatterCount: 32,
  arc: 0.05,
  lateral: 0.04,
  tailLength: 0.16,
  tailSpacing: 0.045,
  maxTailShards: 80,
  bladeRadius: 0.3,
  socketRadius: 0.13,
  shardRadius: 0.34,
  haftLength: 2.6,
  lightPeak: 4.2,
  originHeight: 1.05,
  targetHeight: 0.9,
};

type CastPhase = "charge" | "flight" | "impact";

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

interface LancaGlacialSharedResources {
  textures: LancaGlacialTextureSet;
  frostTexture: LancaGlacialTextureSet["coldCore"];
  particleMaterials: LancaGlacialParticleMaterials;
  bladeGeometry: ConeGeometry;
  bladeMaterial: MeshStandardMaterial;
  socketGeometry: CylinderGeometry;
  socketMaterial: MeshStandardMaterial;
  haftGeometry: CylinderGeometry;
  haftMaterial: MeshStandardMaterial;
  heartGeometry: SphereGeometry;
  heartMaterialTemplate: MeshBasicMaterial;
  shardGeometry: TetrahedronGeometry;
  shardMaterial: MeshStandardMaterial;
  collarGeometry: TorusGeometry;
  collarMaterial: MeshStandardMaterial;
  flashGeometry: SphereGeometry;
  flashMaterialTemplate: MeshBasicMaterial;
  fractureGeometry: RingGeometry;
  fractureMaterialTemplate: MeshBasicMaterial;
  frostGeometry: RingGeometry;
  frostMaterialTemplate: MeshBasicMaterial;
  debrisGeometry: TetrahedronGeometry;
  debrisMaterial: MeshStandardMaterial;
}

function createSharedResources(): LancaGlacialSharedResources {
  const textures = createLancaGlacialTextures();
  const frostTexture = createLancaGlacialFrostTexture();
  const particleMaterials = createLancaGlacialParticleMaterials(frostTexture, textures.glint);
  const bladeGeometry = new ConeGeometry(1, 2.4, 6, 1);
  bladeGeometry.translate(0, 0.55, 0);
  const bladeMaterial = new MeshStandardMaterial({
    map: textures.iceBlade,
    emissiveMap: textures.iceFissure,
    emissive: 0x9fd4ec,
    emissiveIntensity: 0.62,
    color: 0x9bbfd4,
    roughness: 0.16,
    metalness: 0.08,
    flatShading: true,
  });
  const socketGeometry = new CylinderGeometry(1, 1.12, 1, 10, 1);
  const socketMaterial = new MeshStandardMaterial({
    map: textures.ironSocket,
    color: 0x5a5148,
    emissive: 0x1a2a33,
    emissiveIntensity: 0.3,
    roughness: 0.52,
    metalness: 0.82,
  });
  const haftGeometry = new CylinderGeometry(1, 0.86, 1, 8, 1);
  const haftMaterial = new MeshStandardMaterial({
    map: textures.ironSocket,
    color: 0x3a332b,
    emissive: 0x101c22,
    emissiveIntensity: 0.22,
    roughness: 0.66,
    metalness: 0.74,
  });
  const heartGeometry = new SphereGeometry(1, 12, 8);
  const heartMaterialTemplate = new MeshBasicMaterial({
    map: textures.coldCore,
    color: 0xdff2ff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const shardGeometry = new TetrahedronGeometry(1, 0);
  const shardMaterial = new MeshStandardMaterial({
    color: 0xa8d4e8,
    emissive: 0x4a8fb4,
    emissiveIntensity: 0.6,
    roughness: 0.18,
    metalness: 0.1,
    flatShading: true,
  });
  const collarGeometry = new TorusGeometry(1, 0.14, 6, 18);
  const collarMaterial = new MeshStandardMaterial({
    map: textures.ironSocket,
    color: 0x8a6a30,
    emissive: 0x2a3d47,
    emissiveIntensity: 0.4,
    roughness: 0.34,
    metalness: 0.88,
  });
  const flashGeometry = new SphereGeometry(1, 16, 12);
  const flashMaterialTemplate = new MeshBasicMaterial({
    map: textures.coldCore,
    color: 0xdff2ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const fractureGeometry = new RingGeometry(0.2, 0.98, 6, 1);
  const fractureMaterialTemplate = new MeshBasicMaterial({
    map: textures.fracture,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const frostGeometry = new RingGeometry(0.16, 0.94, 40);
  const frostMaterialTemplate = new MeshBasicMaterial({
    map: textures.frostDecal,
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
    color: 0x9cc4d8,
    emissive: 0x3f7f9e,
    emissiveIntensity: 0.8,
    roughness: 0.14,
    metalness: 0.12,
    flatShading: true,
  });
  return {
    textures,
    frostTexture,
    particleMaterials,
    bladeGeometry,
    bladeMaterial,
    socketGeometry,
    socketMaterial,
    haftGeometry,
    haftMaterial,
    heartGeometry,
    heartMaterialTemplate,
    shardGeometry,
    shardMaterial,
    collarGeometry,
    collarMaterial,
    flashGeometry,
    flashMaterialTemplate,
    fractureGeometry,
    fractureMaterialTemplate,
    frostGeometry,
    frostMaterialTemplate,
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

class LancaGlacialCast {
  private readonly chargeSystems: LancaGlacialChargeSystems;
  private readonly flightSystems: LancaGlacialFlightSystems;
  private readonly impactSystems: LancaGlacialImpactSystems;
  private readonly systems: ParticleSystem[];
  private readonly curve;
  private readonly tail: CometTail;
  private readonly blade: Mesh<ConeGeometry, MeshStandardMaterial>;
  private readonly socket: Mesh<CylinderGeometry, MeshStandardMaterial>;
  private readonly haft: Mesh<CylinderGeometry, MeshStandardMaterial>;
  private readonly heart: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly heartMaterial: MeshBasicMaterial;
  private readonly collar: Mesh<TorusGeometry, MeshStandardMaterial>;
  private readonly shards: Mesh<TetrahedronGeometry, MeshStandardMaterial>[] = [];
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly flashMaterial: MeshBasicMaterial;
  private readonly fracture: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly fractureMaterial: MeshBasicMaterial;
  private readonly frost: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly frostMaterial: MeshBasicMaterial;
  private readonly light: PointLight;
  private readonly debris: InstancedMesh<TetrahedronGeometry, MeshStandardMaterial>;
  private readonly debrisDirections: Vector3[] = [];
  private readonly debrisSpin: Vector3[] = [];
  private readonly debrisDummy = new Object3D();
  private readonly debrisCount: number;
  private readonly shardBurstDirections: Vector3[] = [
    new Vector3(),
    new Vector3(),
    new Vector3(),
  ];
  private burstAge = 0;
  private readonly head = new Vector3();
  private readonly tangent = new Vector3();
  private readonly reverseTangent = new Vector3();
  private readonly emitterOrientation = new Quaternion();
  private readonly flightDuration: number;
  private readonly orientation = new Quaternion();
  private readonly side = new Vector3();
  private readonly up = new Vector3();
  private phase: CastPhase = "charge";
  private phaseElapsed = 0;
  private phaseStartedAt = 0;
  private elapsed = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: LancaGlacialSharedResources,
    private readonly config: LancaGlacialVfxConfig,
    private readonly origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: LancaGlacialCast) => void,
  ) {
    this.chargeSystems = createLancaGlacialChargeSystems(shared.particleMaterials);
    this.flightSystems = createLancaGlacialFlightSystems(shared.particleMaterials, config);
    this.impactSystems = createLancaGlacialImpactSystems(shared.particleMaterials, config);
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
    this.chargeSystems.crystals.emitter.position.copy(origin);

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

    this.blade = new Mesh(shared.bladeGeometry, shared.bladeMaterial);
    this.blade.name = "lanca-glacial-blade";
    this.blade.position.copy(origin);
    this.blade.scale.setScalar(config.bladeRadius);
    this.blade.renderOrder = 8;
    this.castRoot.add(this.blade);

    this.socket = new Mesh(shared.socketGeometry, shared.socketMaterial);
    this.socket.name = "lanca-glacial-socket";
    this.socket.position.copy(origin);
    this.socket.scale.set(config.socketRadius, config.socketRadius * 2.4, config.socketRadius);
    this.socket.renderOrder = 8;
    this.castRoot.add(this.socket);

    this.haft = new Mesh(shared.haftGeometry, shared.haftMaterial);
    this.haft.name = "lanca-glacial-haft";
    this.haft.position.copy(origin);
    this.haft.scale.set(config.socketRadius * 0.62, config.haftLength, config.socketRadius * 0.62);
    this.haft.renderOrder = 8;
    this.castRoot.add(this.haft);

    this.heartMaterial = shared.heartMaterialTemplate.clone();
    this.heart = new Mesh(shared.heartGeometry, this.heartMaterial);
    this.heart.name = "lanca-glacial-heart";
    this.heart.position.copy(origin);
    this.heart.scale.setScalar(config.bladeRadius * 0.9);
    this.heart.renderOrder = 9;
    this.castRoot.add(this.heart);

    this.collar = new Mesh(shared.collarGeometry, shared.collarMaterial);
    this.collar.name = "lanca-glacial-collar";
    this.collar.position.copy(origin);
    this.collar.scale.setScalar(config.bladeRadius * 1.05);
    this.collar.renderOrder = 8;
    this.castRoot.add(this.collar);

    for (let index = 0; index < 3; index += 1) {
      const shard = new Mesh(shared.shardGeometry, shared.shardMaterial);
      shard.name = `lanca-glacial-shard-${index}`;
      shard.position.copy(origin);
      shard.scale.setScalar(config.shardRadius);
      shard.renderOrder = 8;
      this.castRoot.add(shard);
      this.shards.push(shard);
    }

    this.tail = new CometTail(
      this.castRoot,
      { shardGeometry: shared.shardGeometry, shardMaterial: shared.shardMaterial },
      this.curve,
      {
        objectName: "lanca-glacial-tail",
        spacing: config.tailSpacing,
        maxShards: config.maxTailShards,
        tailLength: config.tailLength,
        headScale: 0.14,
        tailScale: 0.012,
        spinSpeed: 16,
        wake: [this.flightSystems.wake],
      },
    );

    this.flashMaterial = shared.flashMaterialTemplate.clone();
    this.flash = new Mesh(shared.flashGeometry, this.flashMaterial);
    this.flash.name = "lanca-glacial-flash";
    this.flash.position.copy(target);
    this.flash.visible = false;
    this.flash.renderOrder = 12;
    this.castRoot.add(this.flash);

    this.fractureMaterial = shared.fractureMaterialTemplate.clone();
    this.fracture = new Mesh(shared.fractureGeometry, this.fractureMaterial);
    this.fracture.name = "lanca-glacial-fracture";
    this.fracture.position.copy(target);
    this.fracture.visible = false;
    this.fracture.renderOrder = 12;
    this.castRoot.add(this.fracture);

    this.frostMaterial = shared.frostMaterialTemplate.clone();
    this.frost = new Mesh(shared.frostGeometry, this.frostMaterial);
    this.frost.name = "lanca-glacial-frost";
    this.frost.position.copy(target);
    this.frost.rotation.x = -Math.PI / 2;
    this.frost.visible = false;
    this.frost.renderOrder = 11;
    this.castRoot.add(this.frost);

    this.light = new PointLight(0x9fd4ec, 0, 7.5, 2);
    this.light.position.copy(origin);
    this.castRoot.add(this.light);

    this.debrisCount = 16;
    this.debris = new InstancedMesh(shared.debrisGeometry, shared.debrisMaterial, this.debrisCount);
    this.debris.name = "lanca-glacial-debris";
    this.debris.count = 0;
    this.debris.frustumCulled = false;
    this.debris.instanceMatrix.setUsage(DynamicDrawUsage);
    this.castRoot.add(this.debris);
    for (let index = 0; index < this.debrisCount; index += 1) {
      const direction = new Vector3(
        Math.random() - 0.5,
        Math.random() * 0.8 + 0.15,
        Math.random() - 0.5,
      );
      if (direction.lengthSq() < 0.0001) direction.set(0, 1, 0);
      this.debrisDirections.push(direction.normalize());
      this.debrisSpin.push(new Vector3(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
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
      phaseStartedAt: this.phaseStartedAt,
      head: this.head.toArray(),
      tangent: this.tangent.toArray(),
      origin: this.origin.toArray(),
      target: this.target.toArray(),
      flightDuration: this.flightDuration,
      lightIntensity: this.light.intensity,
      bladeScale: this.blade.scale.x,
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
      this.blade,
      this.socket,
      this.haft,
      this.heart,
      this.collar,
      ...this.shards,
      this.flash,
      this.fracture,
      this.frost,
      this.debris,
      this.light,
    );
    this.heartMaterial.dispose();
    this.flashMaterial.dispose();
    this.fractureMaterial.dispose();
    this.frostMaterial.dispose();
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
    this.blade.visible = false;
    this.socket.visible = false;
    this.heart.scale.setScalar(this.config.bladeRadius * (0.4 + progress * 1.1));
    this.heartMaterial.opacity = 0.3 + progress * 0.6;
    this.collar.scale.setScalar(this.config.bladeRadius * (0.5 + progress * 0.9));
    this.light.intensity = progress * 1.8;
    this.chargeSystems.crystals.emitter.position.copy(this.origin);
    if (this.phaseElapsed >= this.config.chargeDuration) this.triggerFlight();
  }

  private triggerFlight(): void {
    this.phase = "flight";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    for (const system of this.chargeSystems.all) system.endEmit();
    this.blade.visible = true;
    this.socket.visible = true;
    this.haft.visible = true;
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
    const eased = 1 - Math.pow(1 - linear, 2.1);
    const launchPop = Math.max(1 - this.phaseElapsed / 0.07, 0);
    this.curve.getPointAt(eased, this.head);
    this.curve.getTangentAt(eased, this.tangent);
    if (this.tangent.lengthSq() < 0.001) this.tangent.copy(FORWARD);
    this.tangent.normalize();
    this.orientation.setFromUnitVectors(UP, this.tangent);
    const grow = (0.86 + eased * 0.24) * (1 + launchPop * 0.3);
    this.blade.position.copy(this.head);
    this.blade.quaternion.copy(this.orientation);
    this.blade.scale.setScalar(this.config.bladeRadius * grow);
    this.socket.position.copy(this.head).addScaledVector(this.tangent, -0.42 * this.config.bladeRadius);
    this.socket.quaternion.copy(this.orientation);
    this.haft.position.copy(this.head)
      .addScaledVector(this.tangent, -this.config.haftLength * 0.5 - 0.2 * this.config.bladeRadius);
    this.haft.quaternion.copy(this.orientation);
    this.heart.position.copy(this.head).addScaledVector(this.tangent, 0.16 * this.config.bladeRadius);
    this.heart.scale.setScalar(this.config.bladeRadius * grow * 0.95);
    this.heartMaterial.opacity = 0.5 + Math.sin(this.elapsed * 20) * 0.08;
    this.collar.position.copy(this.head).addScaledVector(this.tangent, -0.16 * this.config.bladeRadius);
    this.collar.quaternion.copy(this.orientation);
    this.collar.rotateX(Math.PI / 2);
    const spin = this.elapsed * 7.2;
    this.side.crossVectors(this.tangent, UP);
    if (this.side.lengthSq() < 0.001) this.side.set(1, 0, 0);
    this.side.normalize();
    this.up.crossVectors(this.side, this.tangent).normalize();
    for (let index = 0; index < this.shards.length; index += 1) {
      const shard = this.shards[index];
      const angle = spin * (index % 2 === 0 ? 1 : -1) + index * 2.1;
      const radius = this.config.shardRadius * grow * (1 + index * 0.18);
      shard.position.copy(this.head)
        .addScaledVector(this.side, Math.cos(angle) * radius)
        .addScaledVector(this.up, Math.sin(angle) * radius * 0.8)
        .addScaledVector(this.tangent, Math.sin(angle * 0.6) * radius * 0.4);
      shard.rotation.set(spin * 1.3, spin * 0.8 + index, spin);
      shard.scale.setScalar(0.16 * grow);
    }
    this.tail.update(eased, this.elapsed);
    this.light.position.copy(this.head);
    this.light.intensity = 2 + Math.sin(linear * Math.PI) * 2.2 + launchPop * 2;
    for (const system of this.flightSystems.all) {
      system.emitter.position.copy(this.head);
    }
    this.reverseTangent.copy(this.tangent).negate();
    this.emitterOrientation.setFromUnitVectors(FORWARD, this.reverseTangent);
    this.flightSystems.mantle.emitter.quaternion.copy(this.emitterOrientation);
    this.flightSystems.glints.emitter.quaternion.copy(this.emitterOrientation);
    this.flightSystems.orbiters.emitter.quaternion.copy(this.emitterOrientation);
    if (this.phaseElapsed >= this.flightDuration) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
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
    this.blade.visible = false;
    this.socket.visible = false;
    this.haft.visible = false;
    this.heart.visible = false;
    this.collar.visible = false;
    this.debris.count = this.debrisCount;
    this.burstAge = 0;
    this.side.crossVectors(this.tangent, UP);
    if (this.side.lengthSq() < 0.001) this.side.set(1, 0, 0);
    this.side.normalize();
    this.up.crossVectors(this.side, this.tangent).normalize();
    for (let index = 0; index < this.shards.length; index += 1) {
      const shard = this.shards[index];
      shard.visible = true;
      const angle = (index / this.shards.length) * Math.PI * 2;
      this.shardBurstDirections[index]
        .copy(this.side).multiplyScalar(Math.cos(angle))
        .addScaledVector(this.up, Math.sin(angle))
        .addScaledVector(this.tangent, 0.5)
        .normalize();
    }
    this.tail.hide();
    this.flash.position.copy(this.target);
    this.flash.scale.setScalar(this.config.bladeRadius);
    this.flashMaterial.opacity = 0.9;
    this.flash.visible = true;
    this.fracture.position.copy(this.target);
    this.fracture.quaternion.setFromUnitVectors(FORWARD, this.tangent);
    this.fracture.scale.setScalar(0.2);
    this.fractureMaterial.opacity = 0.9;
    this.fracture.visible = true;
    this.frost.position.copy(this.target);
    this.frost.scale.setScalar(0.2);
    this.frostMaterial.opacity = 0.8;
    this.frost.visible = true;
    this.light.position.copy(this.target);
    this.light.intensity = this.config.lightPeak;
  }

  private updateImpact(deltaTime: number): void {
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.impactDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.flash.scale.setScalar(this.config.bladeRadius * (1 + Math.min(progress * 6, 1) * 2.4));
    this.flashMaterial.opacity = fade * 0.74;
    this.flash.visible = progress < 0.85;
    this.fracture.scale.setScalar(0.2 + Math.sqrt(progress) * 2.2);
    this.fractureMaterial.opacity = fade * 0.9;
    this.fracture.visible = progress < 1;
    this.frost.scale.setScalar(0.2 + progress * 1.8);
    this.frostMaterial.opacity = Math.sqrt(1 - progress) * 0.68;
    this.frost.visible = progress < 1;
    this.burstAge += deltaTime;
    for (let index = 0; index < this.shards.length; index += 1) {
      const shard = this.shards[index];
      shard.visible = progress < 0.8;
      const travel = this.burstAge * 6.4;
      shard.position.copy(this.target).addScaledVector(this.shardBurstDirections[index], travel);
      shard.position.y -= 2.2 * this.burstAge * this.burstAge;
      shard.rotation.set(
        this.debrisSpin[index].x * this.burstAge,
        this.debrisSpin[index].y * this.burstAge,
        this.debrisSpin[index].z * this.burstAge,
      );
      shard.scale.setScalar(Math.max(0.34 * (1 - progress * 0.8), 0.001));
    }
    for (let index = 0; index < this.debrisCount; index += 1) {
      const direction = this.debrisDirections[index];
      const spin = this.debrisSpin[index];
      this.debrisDummy.position.copy(this.target).addScaledVector(direction, this.burstAge * 5.4);
      this.debrisDummy.position.y -= 3.1 * this.burstAge * this.burstAge;
      this.debrisDummy.rotation.set(spin.x * this.burstAge, spin.y * this.burstAge, spin.z * this.burstAge);
      const scale = Math.max(0.26 * (1 - progress * 0.85), 0.001);
      this.debrisDummy.scale.setScalar(scale);
      this.debrisDummy.updateMatrix();
      this.debris.setMatrixAt(index, this.debrisDummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;
    this.light.intensity = this.config.lightPeak * Math.pow(1 - progress, 3);
    if (this.phaseElapsed >= this.config.impactDuration) this.dispose();
  }
}

export class LancaGlacialVfxController {
  private readonly shared = createSharedResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<LancaGlacialCast>();
  private readonly config: LancaGlacialVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<LancaGlacialVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_LANCA_GLACIAL_VFX_CONFIG, ...config };
    const fallback = DEFAULT_LANCA_GLACIAL_VFX_CONFIG;
    this.config = {
      chargeDuration: finiteOr(merged.chargeDuration, fallback.chargeDuration, 0.02),
      speed: finiteOr(merged.speed, fallback.speed, 1),
      minFlightDuration: finiteOr(merged.minFlightDuration, fallback.minFlightDuration, 0.02),
      maxFlightDuration: finiteOr(merged.maxFlightDuration, fallback.maxFlightDuration, 0.05),
      impactDuration: finiteOr(merged.impactDuration, fallback.impactDuration, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, fallback.maxConcurrentCasts, 1)),
      mantleEmission: finiteOr(merged.mantleEmission, fallback.mantleEmission, 0),
      glintEmission: finiteOr(merged.glintEmission, fallback.glintEmission, 0),
      shatterCount: Math.floor(finiteOr(merged.shatterCount, fallback.shatterCount, 1)),
      arc: finiteOr(merged.arc, fallback.arc, 0),
      lateral: finiteOr(merged.lateral, fallback.lateral, 0),
      tailLength: finiteOr(merged.tailLength, fallback.tailLength, 0.01),
      tailSpacing: finiteOr(merged.tailSpacing, fallback.tailSpacing, 0.01),
      maxTailShards: Math.floor(finiteOr(merged.maxTailShards, fallback.maxTailShards, 4)),
      bladeRadius: finiteOr(merged.bladeRadius, fallback.bladeRadius, 0.02),
      socketRadius: finiteOr(merged.socketRadius, fallback.socketRadius, 0.01),
      shardRadius: finiteOr(merged.shardRadius, fallback.shardRadius, 0.02),
      haftLength: finiteOr(merged.haftLength, fallback.haftLength, 0.1),
      lightPeak: finiteOr(merged.lightPeak, fallback.lightPeak, 0),
      originHeight: finiteOr(merged.originHeight, fallback.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, fallback.targetHeight, 0),
    };
    this.castRoot.name = "lanca-glacial-vfx-root";
    this.batchedRenderer.name = "lanca-glacial-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castLancaGlacial(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("LancaGlacialVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as LancaGlacialCast | undefined;
      oldest?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new LancaGlacialCast(
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
    this.shared.bladeGeometry.dispose();
    this.shared.bladeMaterial.dispose();
    this.shared.socketGeometry.dispose();
    this.shared.socketMaterial.dispose();
    this.shared.haftGeometry.dispose();
    this.shared.haftMaterial.dispose();
    this.shared.heartGeometry.dispose();
    this.shared.heartMaterialTemplate.dispose();
    this.shared.shardGeometry.dispose();
    this.shared.shardMaterial.dispose();
    this.shared.collarGeometry.dispose();
    this.shared.collarMaterial.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterialTemplate.dispose();
    this.shared.fractureGeometry.dispose();
    this.shared.fractureMaterialTemplate.dispose();
    this.shared.frostGeometry.dispose();
    this.shared.frostMaterialTemplate.dispose();
    this.shared.debrisGeometry.dispose();
    this.shared.debrisMaterial.dispose();
    this.shared.frostTexture.dispose();
    disposeLancaGlacialParticleMaterials(this.shared.particleMaterials);
    disposeLancaGlacialTextures(this.shared.textures);
    this.castRoot.clear();
  }
}

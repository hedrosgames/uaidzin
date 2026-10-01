import {
  AdditiveBlending,
  BoxGeometry,
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
import { CometTail } from "../../vfxKit/cometTail";
import { createJaggedCurve } from "../../vfxKit/curveTrajectory";
import {
  createChoqueVitalArcSystems,
  createChoqueVitalChargeSystems,
  createChoqueVitalImpactSystems,
  createChoqueVitalParticleMaterials,
  disposeChoqueVitalParticleMaterials,
  type ChoqueVitalArcSystems,
  type ChoqueVitalChargeSystems,
  type ChoqueVitalImpactSystems,
  type ChoqueVitalParticleMaterials,
} from "./ChoqueVitalParticleSystems";
import {
  createChoqueVitalTextures,
  disposeChoqueVitalTextures,
  type ChoqueVitalTextureSet,
} from "./ChoqueVitalTextures";

export interface ChoqueVitalVfxConfig {
  chargeDuration: number;
  speed: number;
  minFlightDuration: number;
  maxFlightDuration: number;
  impactDuration: number;
  maxConcurrentCasts: number;
  sparkEmission: number;
  coronaEmission: number;
  impactBurstCount: number;
  railSpacing: number;
  maxRails: number;
  railRadius: number;
  nodeRadius: number;
  ringRadius: number;
  jitter: number;
  tailLength: number;
  tailSpacing: number;
  maxTailShards: number;
  lightPeak: number;
  originHeight: number;
  targetHeight: number;
}

export const DEFAULT_CHOQUE_VITAL_VFX_CONFIG: ChoqueVitalVfxConfig = {
  chargeDuration: 0.09,
  speed: 44,
  minFlightDuration: 0.1,
  maxFlightDuration: 0.26,
  impactDuration: 0.5,
  maxConcurrentCasts: 3,
  sparkEmission: 60,
  coronaEmission: 34,
  impactBurstCount: 36,
  railSpacing: 0.2,
  maxRails: 128,
  railRadius: 0.062,
  nodeRadius: 0.16,
  ringRadius: 0.38,
  jitter: 0.34,
  tailLength: 0.14,
  tailSpacing: 0.04,
  maxTailShards: 72,
  lightPeak: 3.8,
  originHeight: 1.05,
  targetHeight: 0.9,
};

type CastPhase = "charge" | "arc" | "impact";

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);
const RAIL_AXIS = new Vector3(0, 1, 0);

interface ChoqueVitalSharedResources {
  textures: ChoqueVitalTextureSet;
  particleMaterials: ChoqueVitalParticleMaterials;
  railGeometry: BoxGeometry;
  railMaterial: MeshStandardMaterial;
  nodeGeometry: OctahedronGeometry;
  nodeMaterial: MeshStandardMaterial;
  ringGeometry: TorusGeometry;
  ringMaterial: MeshStandardMaterial;
  strikerGeometry: IcosahedronGeometry;
  strikerMaterialTemplate: MeshBasicMaterial;
  flashGeometry: SphereGeometry;
  flashMaterialTemplate: MeshBasicMaterial;
  ringShockGeometry: RingGeometry;
  ringShockMaterialTemplate: MeshBasicMaterial;
  scorchGeometry: RingGeometry;
  scorchMaterialTemplate: MeshBasicMaterial;
  debrisGeometry: TetrahedronGeometry;
  debrisMaterial: MeshStandardMaterial;
}

function createSharedResources(): ChoqueVitalSharedResources {
  const textures = createChoqueVitalTextures();
  const particleMaterials = createChoqueVitalParticleMaterials(textures.spark, textures.chargeCore);
  const railGeometry = new BoxGeometry(1, 1, 1);
  const railMaterial = new MeshStandardMaterial({
    map: textures.ironRail,
    color: 0x7d7060,
    emissive: 0xffb43a,
    emissiveIntensity: 0.52,
    roughness: 0.38,
    metalness: 0.8,
  });
  const nodeGeometry = new OctahedronGeometry(1, 0);
  const nodeMaterial = new MeshStandardMaterial({
    map: textures.runeBand,
    color: 0x8f6c30,
    emissive: 0xffc44f,
    emissiveIntensity: 0.42,
    roughness: 0.34,
    metalness: 0.92,
    flatShading: true,
  });
  const ringGeometry = new TorusGeometry(1, 0.075, 6, 20, Math.PI * 1.35);
  const ringMaterial = new MeshStandardMaterial({
    map: textures.runeBand,
    color: 0xb98c34,
    emissive: 0xffc44f,
    emissiveIntensity: 0.62,
    roughness: 0.3,
    metalness: 0.9,
  });
  const strikerGeometry = new IcosahedronGeometry(1, 1);
  const strikerMaterialTemplate = new MeshBasicMaterial({
    map: textures.chargeCore,
    color: 0xfff6d8,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const flashGeometry = new SphereGeometry(1, 12, 8);
  const flashMaterialTemplate = new MeshBasicMaterial({
    map: textures.chargeCore,
    color: 0xfff6d8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const ringShockGeometry = new RingGeometry(0.26, 0.5, 44);
  const ringShockMaterialTemplate = new MeshBasicMaterial({
    color: 0xffd88a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const scorchGeometry = new RingGeometry(0.16, 0.98, 36);
  const scorchMaterialTemplate = new MeshBasicMaterial({
    map: textures.scorchRing,
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
    color: 0x2a241c,
    emissive: 0xff8c14,
    emissiveIntensity: 0.5,
    roughness: 0.54,
    metalness: 0.62,
    flatShading: true,
  });
  return {
    textures,
    particleMaterials,
    railGeometry,
    railMaterial,
    nodeGeometry,
    nodeMaterial,
    ringGeometry,
    ringMaterial,
    strikerGeometry,
    strikerMaterialTemplate,
    flashGeometry,
    flashMaterialTemplate,
    ringShockGeometry,
    ringShockMaterialTemplate,
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

class ChoqueVitalCast {
  private readonly chargeSystems: ChoqueVitalChargeSystems;
  private readonly arcSystems: ChoqueVitalArcSystems;
  private readonly impactSystems: ChoqueVitalImpactSystems;
  private readonly systems: ParticleSystem[];
  private readonly curve;
  private readonly tail: CometTail;
  private readonly rails: InstancedMesh<BoxGeometry, MeshStandardMaterial>;
  private readonly railPoints: Vector3[] = [];
  private readonly railQuats: Quaternion[] = [];
  private readonly railDummy = new Object3D();
  private readonly twist = new Quaternion();
  private readonly nodes: Mesh<OctahedronGeometry, MeshStandardMaterial>[] = [];
  private readonly rings: Mesh<TorusGeometry, MeshStandardMaterial>[] = [];
  private readonly strikerMaterial: MeshBasicMaterial;
  private readonly striker: Mesh<IcosahedronGeometry, MeshBasicMaterial>;
  private readonly flash: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly flashMaterial: MeshBasicMaterial;
  private readonly ringShock: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly ringShockMaterial: MeshBasicMaterial;
  private readonly scorch: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly scorchMaterial: MeshBasicMaterial;
  private readonly debris: InstancedMesh<TetrahedronGeometry, MeshStandardMaterial>;
  private readonly debrisDirections: Vector3[] = [];
  private readonly debrisSpin: Vector3[] = [];
  private readonly debrisDummy = new Object3D();
  private readonly debrisCount = 14;
  private readonly light: PointLight;
  private readonly head = new Vector3();
  private readonly tangent = new Vector3();
  private readonly reverseTangent = new Vector3();
  private readonly emitterOrientation = new Quaternion();
  private readonly side = new Vector3();
  private readonly up = new Vector3();
  private readonly orientation = new Quaternion();
  private readonly flightDuration: number;
  private phase: CastPhase = "charge";
  private phaseElapsed = 0;
  private phaseStartedAt = 0;
  private elapsed = 0;
  private impactAge = 0;
  private disposed = false;

  constructor(
    scene: Scene,
    batchedRenderer: BatchedRenderer,
    private readonly castRoot: Group,
    shared: ChoqueVitalSharedResources,
    private readonly config: ChoqueVitalVfxConfig,
    private readonly origin: Vector3,
    private readonly target: Vector3,
    private readonly onDispose: (cast: ChoqueVitalCast) => void,
  ) {
    this.chargeSystems = createChoqueVitalChargeSystems(shared.particleMaterials);
    this.arcSystems = createChoqueVitalArcSystems(shared.particleMaterials, config);
    this.impactSystems = createChoqueVitalImpactSystems(shared.particleMaterials, config);
    this.systems = [
      ...this.chargeSystems.all,
      ...this.arcSystems.all,
      ...this.impactSystems.all,
    ];
    for (const system of this.systems) {
      scene.add(system.emitter);
      batchedRenderer.addSystem(system);
    }
    for (const system of this.chargeSystems.all) system.play();
    this.chargeSystems.motes.emitter.position.copy(origin);

    const distance = Math.max(origin.distanceTo(target), 0.0001);
    this.flightDuration = MathUtils.clamp(
      distance / config.speed,
      config.minFlightDuration,
      config.maxFlightDuration,
    );
    this.curve = createJaggedCurve(origin, target, 0, { amplitude: config.jitter, steps: 7, amplitudeJitter: 0.7 });

    const length = Math.max(this.curve.getLength(), 0.0001);
    const count = MathUtils.clamp(
      Math.ceil(length / config.railSpacing) + 1,
      2,
      config.maxRails,
    );
    for (let index = 0; index < count; index += 1) {
      const t = index / (count - 1);
      this.railPoints.push(this.curve.getPointAt(t));
      const tangent = this.curve.getTangentAt(t);
      if (tangent.lengthSq() < 0.001) tangent.copy(FORWARD);
      this.railQuats.push(
        new Quaternion().setFromUnitVectors(RAIL_AXIS, tangent.normalize()),
      );
    }
    this.rails = new InstancedMesh(shared.railGeometry, shared.railMaterial, count);
    this.rails.name = "choque-vital-rails";
    this.rails.count = 0;
    this.rails.frustumCulled = false;
    this.rails.instanceMatrix.setUsage(DynamicDrawUsage);
    this.castRoot.add(this.rails);

    for (let index = 0; index < 3; index += 1) {
      const node = new Mesh(shared.nodeGeometry, shared.nodeMaterial);
      node.name = `choque-vital-node-${index}`;
      node.position.copy(origin);
      node.scale.setScalar(config.nodeRadius);
      node.renderOrder = 8;
      this.castRoot.add(node);
      this.nodes.push(node);
    }
    for (let index = 0; index < 2; index += 1) {
      const ring = new Mesh(shared.ringGeometry, shared.ringMaterial);
      ring.name = `choque-vital-ring-${index}`;
      ring.position.copy(origin);
      ring.scale.setScalar(config.ringRadius);
      ring.renderOrder = 8;
      this.castRoot.add(ring);
      this.rings.push(ring);
    }

    this.strikerMaterial = shared.strikerMaterialTemplate.clone();
    this.striker = new Mesh(shared.strikerGeometry, this.strikerMaterial);
    this.striker.name = "choque-vital-striker";
    this.striker.position.copy(origin);
    this.striker.scale.setScalar(config.nodeRadius * 1.4);
    this.striker.renderOrder = 9;
    this.castRoot.add(this.striker);

    this.tail = new CometTail(
      this.castRoot,
      { shardGeometry: shared.debrisGeometry, shardMaterial: shared.debrisMaterial },
      this.curve,
      {
        objectName: "choque-vital-tail",
        spacing: config.tailSpacing,
        maxShards: config.maxTailShards,
        tailLength: config.tailLength,
        headScale: 0.11,
        tailScale: 0.01,
        spinSpeed: 20,
      },
    );

    this.flashMaterial = shared.flashMaterialTemplate.clone();
    this.flash = new Mesh(shared.flashGeometry, this.flashMaterial);
    this.flash.name = "choque-vital-flash";
    this.flash.position.copy(target);
    this.flash.visible = false;
    this.flash.renderOrder = 12;
    this.castRoot.add(this.flash);

    this.ringShockMaterial = shared.ringShockMaterialTemplate.clone();
    this.ringShock = new Mesh(shared.ringShockGeometry, this.ringShockMaterial);
    this.ringShock.name = "choque-vital-ring-shock";
    this.ringShock.position.copy(target);
    this.ringShock.visible = false;
    this.ringShock.renderOrder = 12;
    this.castRoot.add(this.ringShock);

    this.scorchMaterial = shared.scorchMaterialTemplate.clone();
    this.scorch = new Mesh(shared.scorchGeometry, this.scorchMaterial);
    this.scorch.name = "choque-vital-scorch";
    this.scorch.position.copy(target);
    this.scorch.rotation.x = -Math.PI / 2;
    this.scorch.visible = false;
    this.scorch.renderOrder = 11;
    this.castRoot.add(this.scorch);

    this.light = new PointLight(0xffc44f, 0, 6.5, 2);
    this.light.position.copy(origin);
    this.castRoot.add(this.light);

    this.debris = new InstancedMesh(shared.debrisGeometry, shared.debrisMaterial, this.debrisCount);
    this.debris.name = "choque-vital-debris";
    this.debris.count = 0;
    this.debris.frustumCulled = false;
    this.debris.instanceMatrix.setUsage(DynamicDrawUsage);
    this.castRoot.add(this.debris);
    for (let index = 0; index < this.debrisCount; index += 1) {
      const direction = new Vector3(
        Math.random() - 0.5,
        Math.random() * 0.7,
        Math.random() - 0.5,
      );
      if (direction.lengthSq() < 0.0001) direction.set(0, 1, 0);
      this.debrisDirections.push(direction.normalize());
      this.debrisSpin.push(new Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
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
      railsVisible: this.rails.count,
      railsCapacity: this.railPoints.length,
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
    else if (this.phase === "arc") this.updateArc(deltaTime);
    else this.updateImpact(deltaTime);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const system of this.systems) system.dispose();
    this.tail.dispose();
    this.castRoot.remove(
      this.rails,
      ...this.nodes,
      ...this.rings,
      this.striker,
      this.flash,
      this.ringShock,
      this.scorch,
      this.debris,
      this.light,
    );
    this.strikerMaterial.dispose();
    this.flashMaterial.dispose();
    this.ringShockMaterial.dispose();
    this.scorchMaterial.dispose();
    this.onDispose(this);
  }

  private currentPhaseDuration(): number {
    if (this.phase === "charge") return this.config.chargeDuration;
    if (this.phase === "arc") return this.flightDuration;
    return this.config.impactDuration;
  }

  private updateCharge(deltaTime: number): void {
    void deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.chargeDuration, 0, 1);
    const pulse = 1 + Math.sin(this.elapsed * 48) * 0.12;
    this.striker.visible = true;
    this.striker.scale.setScalar(this.config.nodeRadius * (0.7 + progress * 1.5) * pulse);
    this.strikerMaterial.opacity = 0.35 + progress * 0.6;
    for (let index = 0; index < this.rings.length; index += 1) {
      const ring = this.rings[index];
      ring.visible = true;
      ring.position.copy(this.origin);
      ring.scale.setScalar(this.config.ringRadius * (0.4 + progress * 1.1));
      ring.rotation.set(this.elapsed * (6 + index * 4), this.elapsed * (4 + index * 3), 0);
    }
    this.light.position.copy(this.origin);
    this.light.intensity = 0.6 + progress * 2.4;
    this.chargeSystems.motes.emitter.position.copy(this.origin);
    if (this.phaseElapsed >= this.config.chargeDuration) this.triggerArc();
  }

  private triggerArc(): void {
    this.phase = "arc";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    for (const system of this.chargeSystems.all) system.endEmit();
    for (const system of this.arcSystems.all) {
      system.emitter.position.copy(this.origin);
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
  }

  private updateArc(deltaTime: number): void {
    void deltaTime;
    this.phaseElapsed = Math.min(this.phaseElapsed, this.flightDuration);
    const linear = MathUtils.clamp(this.phaseElapsed / this.flightDuration, 0, 1);
    const eased = 1 - Math.pow(1 - linear, 2.4);
    this.curve.getPointAt(eased, this.head);
    this.curve.getTangentAt(eased, this.tangent);
    if (this.tangent.lengthSq() < 0.001) this.tangent.copy(FORWARD);
    this.tangent.normalize();
    this.orientation.setFromUnitVectors(UP, this.tangent);
    this.side.crossVectors(this.tangent, UP);
    if (this.side.lengthSq() < 0.001) this.side.set(1, 0, 0);
    this.side.normalize();
    this.up.crossVectors(this.side, this.tangent).normalize();

    const flick = 0.82 + Math.abs(Math.sin(this.elapsed * 62)) * 0.34;
    const reached = Math.min(
      this.railPoints.length,
      Math.floor(eased * (this.railPoints.length - 1)) + 1,
    );
    for (let index = 0; index < reached; index += 1) {
      this.railDummy.position.copy(this.railPoints[index]);
      this.twist.setFromAxisAngle(RAIL_AXIS, (index % 2) * (Math.PI / 2));
      this.railDummy.quaternion.copy(this.railQuats[index]).multiply(this.twist);
      const scale = this.config.railRadius * flick * (index === 0 ? 1.5 : 1);
      this.railDummy.scale.set(scale, this.config.railSpacing * 1.6, scale);
      this.railDummy.updateMatrix();
      this.rails.setMatrixAt(index, this.railDummy.matrix);
    }
    this.rails.count = reached;
    this.rails.instanceMatrix.needsUpdate = true;

    this.striker.visible = true;
    this.striker.position.copy(this.head);
    this.striker.scale.setScalar(this.config.nodeRadius * 1.5 * flick);
    this.strikerMaterial.opacity = 0.58 + Math.abs(Math.sin(this.elapsed * 62)) * 0.24;

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      node.visible = true;
      const lag = Math.max(eased - (index + 1) * 0.16, 0);
      this.curve.getPointAt(lag, node.position);
      node.rotation.set(this.elapsed * 9, this.elapsed * 7 + index, this.elapsed * 5);
      node.scale.setScalar(this.config.nodeRadius * (0.45 + lag * 1.2) * flick);
    }
    for (let index = 0; index < this.rings.length; index += 1) {
      const ring = this.rings[index];
      ring.visible = true;
      ring.position.copy(this.head);
      ring.quaternion.copy(this.orientation);
      ring.rotateZ(this.elapsed * (5 + index * 3));
      ring.rotateX(this.elapsed * (3 + index * 2));
      ring.scale.setScalar(this.config.ringRadius * (0.7 + eased * 0.5) * flick);
    }
    this.tail.update(eased, this.elapsed);
    this.light.position.copy(this.head);
    this.light.intensity = 2.2 + Math.sin(linear * Math.PI) * 2.4;
    this.reverseTangent.copy(this.tangent).negate();
    this.emitterOrientation.setFromUnitVectors(FORWARD, this.reverseTangent);
    for (const system of this.arcSystems.all) {
      system.emitter.position.copy(this.head);
      system.emitter.quaternion.copy(this.emitterOrientation);
    }
    if (this.phaseElapsed >= this.flightDuration) this.triggerImpact();
  }

  private triggerImpact(): void {
    this.phase = "impact";
    this.phaseElapsed = 0;
    this.phaseStartedAt = this.elapsed;
    this.impactAge = 0;
    this.head.copy(this.target);
    for (const system of this.arcSystems.all) system.endEmit();
    for (const system of this.impactSystems.all) {
      system.emitter.position.copy(this.target);
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
    this.rails.count = 0;
    this.striker.visible = false;
    for (const node of this.nodes) node.visible = false;
    for (const ring of this.rings) ring.visible = true;
    this.tail.hide();
    this.flash.position.copy(this.target);
    this.flash.scale.setScalar(0.3);
    this.flashMaterial.opacity = 1;
    this.flash.visible = true;
    this.ringShock.position.copy(this.target);
    this.ringShock.quaternion.setFromUnitVectors(FORWARD, this.tangent);
    this.ringShock.scale.setScalar(0.2);
    this.ringShockMaterial.opacity = 0.95;
    this.ringShock.visible = true;
    this.scorch.position.copy(this.target);
    this.scorch.quaternion.setFromUnitVectors(FORWARD, this.tangent);
    this.scorch.scale.setScalar(0.2);
    this.scorchMaterial.opacity = 0.85;
    this.scorch.visible = true;
    this.debris.count = this.debrisCount;
    this.light.position.copy(this.target);
    this.light.intensity = this.config.lightPeak;
  }

  private updateImpact(deltaTime: number): void {
    this.impactAge += deltaTime;
    const progress = MathUtils.clamp(this.phaseElapsed / this.config.impactDuration, 0, 1);
    const fade = Math.pow(1 - progress, 2);
    this.flash.scale.setScalar(0.3 + Math.min(progress * 6, 1) * 1.6);
    this.flashMaterial.opacity = fade * 0.74;
    this.flash.visible = progress < 0.8;
    this.ringShock.scale.setScalar(0.2 + Math.sqrt(progress) * 3.4);
    this.ringShockMaterial.opacity = fade * 0.95;
    this.ringShock.visible = progress < 1;
    this.scorch.scale.setScalar(0.2 + progress * 1.6);
    this.scorchMaterial.opacity = Math.sqrt(1 - progress) * 0.7;
    this.scorch.visible = progress < 1;
    for (let index = 0; index < this.rings.length; index += 1) {
      const ring = this.rings[index];
      ring.visible = progress < 0.8;
      ring.position.copy(this.target);
      ring.rotation.set(this.impactAge * (7 + index * 4), this.impactAge * (5 + index * 3), 0);
      ring.scale.setScalar(this.config.ringRadius * (1 + progress * 7));
    }
    for (let index = 0; index < this.debrisCount; index += 1) {
      this.debrisDummy.position
        .copy(this.target)
        .addScaledVector(this.debrisDirections[index], this.impactAge * 5.8);
      this.debrisDummy.position.y -= 3.6 * this.impactAge * this.impactAge;
      const spin = this.debrisSpin[index];
      this.debrisDummy.rotation.set(
        spin.x * this.impactAge,
        spin.y * this.impactAge,
        spin.z * this.impactAge,
      );
      this.debrisDummy.scale.setScalar(Math.max(0.34 * (1 - progress * 0.85), 0.001));
      this.debrisDummy.updateMatrix();
      this.debris.setMatrixAt(index, this.debrisDummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;
    this.light.intensity = this.config.lightPeak * Math.pow(1 - progress, 3);
    if (this.phaseElapsed >= this.config.impactDuration) this.dispose();
  }
}

export class ChoqueVitalVfxController {
  private readonly shared = createSharedResources();
  private readonly castRoot = new Group();
  private readonly batchedRenderer = new BatchedRenderer();
  private readonly batchResolution = new Vector2(1, 1);
  private readonly casts = new Set<ChoqueVitalCast>();
  private readonly config: ChoqueVitalVfxConfig;
  private accumulator = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    config: Partial<ChoqueVitalVfxConfig> = {},
  ) {
    const merged = { ...DEFAULT_CHOQUE_VITAL_VFX_CONFIG, ...config };
    const fallback = DEFAULT_CHOQUE_VITAL_VFX_CONFIG;
    this.config = {
      chargeDuration: finiteOr(merged.chargeDuration, fallback.chargeDuration, 0.02),
      speed: finiteOr(merged.speed, fallback.speed, 1),
      minFlightDuration: finiteOr(merged.minFlightDuration, fallback.minFlightDuration, 0.02),
      maxFlightDuration: finiteOr(merged.maxFlightDuration, fallback.maxFlightDuration, 0.05),
      impactDuration: finiteOr(merged.impactDuration, fallback.impactDuration, 0.1),
      maxConcurrentCasts: Math.floor(finiteOr(merged.maxConcurrentCasts, fallback.maxConcurrentCasts, 1)),
      sparkEmission: finiteOr(merged.sparkEmission, fallback.sparkEmission, 0),
      coronaEmission: finiteOr(merged.coronaEmission, fallback.coronaEmission, 0),
      impactBurstCount: Math.floor(finiteOr(merged.impactBurstCount, fallback.impactBurstCount, 1)),
      railSpacing: finiteOr(merged.railSpacing, fallback.railSpacing, 0.02),
      maxRails: Math.floor(finiteOr(merged.maxRails, fallback.maxRails, 4)),
      railRadius: finiteOr(merged.railRadius, fallback.railRadius, 0.005),
      nodeRadius: finiteOr(merged.nodeRadius, fallback.nodeRadius, 0.02),
      ringRadius: finiteOr(merged.ringRadius, fallback.ringRadius, 0.02),
      jitter: finiteOr(merged.jitter, fallback.jitter, 0),
      tailLength: finiteOr(merged.tailLength, fallback.tailLength, 0.01),
      tailSpacing: finiteOr(merged.tailSpacing, fallback.tailSpacing, 0.01),
      maxTailShards: Math.floor(finiteOr(merged.maxTailShards, fallback.maxTailShards, 4)),
      lightPeak: finiteOr(merged.lightPeak, fallback.lightPeak, 0),
      originHeight: finiteOr(merged.originHeight, fallback.originHeight, 0),
      targetHeight: finiteOr(merged.targetHeight, fallback.targetHeight, 0),
    };
    this.castRoot.name = "choque-vital-vfx-root";
    this.batchedRenderer.name = "choque-vital-batched-renderer";
    this.scene.add(this.castRoot, this.batchedRenderer);
  }

  castChoqueVital(origin: Vector3, target: Vector3): void {
    if (this.disposed) throw new Error("ChoqueVitalVfxController descartado");
    if (!isFiniteVector3(origin) || !isFiniteVector3(target)) return;
    if (this.casts.size >= this.config.maxConcurrentCasts) {
      const oldest = this.casts.values().next().value as ChoqueVitalCast | undefined;
      oldest?.dispose();
    }
    const launchOrigin = origin.clone();
    launchOrigin.y = Math.max(origin.y, this.config.originHeight);
    const impactTarget = target.clone();
    impactTarget.y = Math.max(target.y, this.config.targetHeight);
    const cast = new ChoqueVitalCast(
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
    let arc = false;
    for (const cast of this.casts) if (cast.getPhase() === "arc") arc = true;
    return arc ? "arc" : "charge";
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
    this.shared.railGeometry.dispose();
    this.shared.railMaterial.dispose();
    this.shared.nodeGeometry.dispose();
    this.shared.nodeMaterial.dispose();
    this.shared.ringGeometry.dispose();
    this.shared.ringMaterial.dispose();
    this.shared.strikerGeometry.dispose();
    this.shared.strikerMaterialTemplate.dispose();
    this.shared.flashGeometry.dispose();
    this.shared.flashMaterialTemplate.dispose();
    this.shared.ringShockGeometry.dispose();
    this.shared.ringShockMaterialTemplate.dispose();
    this.shared.scorchGeometry.dispose();
    this.shared.scorchMaterialTemplate.dispose();
    this.shared.debrisGeometry.dispose();
    this.shared.debrisMaterial.dispose();
    disposeChoqueVitalParticleMaterials(this.shared.particleMaterials);
    disposeChoqueVitalTextures(this.shared.textures);
    this.castRoot.clear();
  }
}

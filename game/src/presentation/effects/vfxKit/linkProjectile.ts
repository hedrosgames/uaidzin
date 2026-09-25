import {
  CatmullRomCurve3,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  BufferGeometry,
  Material,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { type Behavior, type Particle, type ParticleSystem } from "three.quarks";

const LINK_AXIS = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

export class CurveEmissionPlacement implements Behavior {
  readonly type = "CurveEmissionPlacement";
  start = 0;
  end = 0;
  private readonly point = new Vector3();

  constructor(private readonly curve: CatmullRomCurve3) {}

  initialize(particle: Particle): void {
    this.curve.getPointAt(
      this.start + Math.random() * (this.end - this.start),
      this.point,
    );
    particle.position.set(this.point.x, this.point.y, this.point.z);
  }

  update(): void {}
  frameUpdate(): void {}
  reset(): void {
    this.start = 0;
    this.end = 0;
  }
  toJSON() {
    return { type: this.type };
  }
  clone(): CurveEmissionPlacement {
    return new CurveEmissionPlacement(this.curve);
  }
}

export interface LinkProjectileResources {
  linkGeometry: BufferGeometry;
  linkMaterial: Material;
  tipGeometry: BufferGeometry;
  tipMaterial: Material;
}

export interface LinkProjectileConfig {
  objectName: string;
  tipName: string;
  spacing: number;
  maxLinks: number;
  spinSpeed: number;
}

export class LinkProjectile {
  readonly head = new Vector3();
  readonly tangent = new Vector3();
  readonly emitters: ParticleSystem[];
  private readonly curve: CatmullRomCurve3;
  private readonly mesh: InstancedMesh;
  private readonly tip: Mesh;
  private readonly positions: Vector3[] = [];
  private readonly orientations: Quaternion[] = [];
  private readonly dummy = new Object3D();
  private readonly twist = new Quaternion();
  private readonly emitterDirection = new Vector3();
  private readonly length: number;
  private readonly spacing: number;
  private readonly phase: number;
  private readonly spinSpeed: number;
  private readonly emissionPlacement: CurveEmissionPlacement;

  constructor(
    private readonly root: Group,
    resources: LinkProjectileResources,
    curve: CatmullRomCurve3,
    phase: number,
    systems: ParticleSystem[],
    config: LinkProjectileConfig,
  ) {
    this.curve = curve;
    this.phase = phase;
    this.spinSpeed = config.spinSpeed;
    this.emitters = systems;
    this.emissionPlacement = new CurveEmissionPlacement(this.curve);
    for (const system of this.emitters) system.behaviors.push(this.emissionPlacement);
    this.length = this.curve.getLength();
    const count = MathUtils.clamp(
      Math.ceil(this.length / config.spacing) + 1,
      2,
      config.maxLinks,
    );
    this.spacing = this.length / (count - 1);
    for (let index = 0; index < count; index += 1) {
      const t = index / (count - 1);
      this.positions.push(this.curve.getPointAt(t));
      const tangent = this.curve.getTangentAt(t);
      if (tangent.lengthSq() < 0.001) tangent.copy(FORWARD);
      this.orientations.push(
        new Quaternion().setFromUnitVectors(LINK_AXIS, tangent.normalize()),
      );
    }
    this.mesh = new InstancedMesh(
      resources.linkGeometry,
      resources.linkMaterial,
      count,
    );
    this.mesh.name = config.objectName;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.tip = new Mesh(resources.tipGeometry, resources.tipMaterial);
    this.tip.name = config.tipName;
    root.add(this.mesh, this.tip);
    this.update(0, 0);
  }

  update(progress: number, elapsed: number): void {
    this.emissionPlacement.start = this.emissionPlacement.end;
    this.emissionPlacement.end = progress;
    this.curve.getPointAt(progress, this.head);
    this.curve.getTangentAt(progress, this.tangent);
    if (this.tangent.lengthSq() < 0.001) this.tangent.copy(FORWARD);
    this.tangent.normalize();
    this.tip.position.copy(this.head);
    this.tip.quaternion.setFromUnitVectors(LINK_AXIS, this.tangent);
    const spin = this.phase + elapsed * this.spinSpeed;
    this.twist.setFromAxisAngle(LINK_AXIS, spin);
    this.tip.quaternion.multiply(this.twist);
    const count =
      this.length < 0.0001
        ? 1
        : Math.min(
            this.positions.length,
            Math.floor((progress * this.length) / this.spacing) + 1,
          );
    for (let index = 0; index < count; index += 1) {
      this.dummy.position.copy(this.positions[index]);
      this.twist.setFromAxisAngle(LINK_AXIS, spin + ((index % 2) * Math.PI) / 2);
      this.dummy.quaternion.copy(this.orientations[index]).multiply(this.twist);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.emitterDirection.copy(this.tangent).negate();
    for (const system of this.emitters) {
      system.emitter.position.copy(this.head);
      system.emitter.quaternion.setFromUnitVectors(FORWARD, this.emitterDirection);
    }
  }

  getState() {
    return {
      head: this.head.toArray(),
      visibleLinks: this.mesh.visible ? this.mesh.count : 0,
      tipVisible: this.tip.visible,
      tipRotation: this.tip.quaternion.toArray(),
      controlPoints: this.curve.points.map((point) => point.toArray()),
      length: this.length,
    };
  }

  hide(): void {
    this.mesh.visible = false;
    this.tip.visible = false;
  }

  dispose(): void {
    this.root.remove(this.mesh, this.tip);
    this.mesh.dispose();
  }
}

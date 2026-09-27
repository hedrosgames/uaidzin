import {
  CatmullRomCurve3,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  Object3D,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import type { ParticleSystem } from "three.quarks";
import { CurveEmissionPlacement } from "./linkProjectile";

const TAIL_AXIS = new Vector3(0, 1, 0);
const FALLBACK_TANGENT = new Vector3(0, 0, 1);

export interface CometTailResources {
  shardGeometry: BufferGeometry;
  shardMaterial: Material;
}

export interface CometTailConfig {
  objectName: string;
  spacing: number;
  maxShards: number;
  tailLength: number;
  headScale: number;
  tailScale: number;
  spinSpeed: number;
  wake?: ParticleSystem[];
}

export class CometTail {
  readonly mesh: InstancedMesh;
  readonly wakeSystems: ParticleSystem[];
  private readonly curve: CatmullRomCurve3;
  private readonly length: number;
  private readonly step: number;
  private readonly dummy = new Object3D();
  private readonly spin = new Quaternion();
  private readonly tangent = new Vector3();
  private readonly placements: CurveEmissionPlacement[] = [];
  private visibleShards = 0;

  constructor(
    private readonly root: Group,
    resources: CometTailResources,
    curve: CatmullRomCurve3,
    private readonly config: CometTailConfig,
  ) {
    this.curve = curve;
    this.length = Math.max(curve.getLength(), 0.0001);
    this.step = Math.max(this.config.spacing / this.length, 0.0005);
    this.mesh = new InstancedMesh(
      resources.shardGeometry,
      resources.shardMaterial,
      Math.max(Math.floor(this.config.maxShards), 1),
    );
    this.mesh.name = config.objectName;
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    root.add(this.mesh);
    this.wakeSystems = config.wake ?? [];
    for (const system of this.wakeSystems) {
      const placement = new CurveEmissionPlacement(this.curve);
      this.placements.push(placement);
      system.behaviors.push(placement);
    }
  }

  startWake(): void {
    for (const system of this.wakeSystems) {
      system.emitter.visible = true;
      system.restart();
      system.play();
    }
  }

  update(progress: number, elapsed: number): void {
    const head = MathUtils.clamp(progress, 0, 1);
    const tail = Math.max(0, head - this.config.tailLength);
    const span = head - tail;
    for (const placement of this.placements) {
      placement.start = tail;
      placement.end = head;
    }
    const count =
      span <= 1e-6
        ? 0
        : Math.min(
            this.config.maxShards,
            Math.floor(span / this.step) + 1,
          );
    for (let index = 0; index < count; index += 1) {
      const ratio = count > 1 ? index / (count - 1) : 1;
      const t = tail + span * ratio;
      this.curve.getPointAt(t, this.dummy.position);
      this.curve.getTangentAt(t, this.tangent);
      if (this.tangent.lengthSq() < 0.001) this.tangent.copy(FALLBACK_TANGENT);
      this.dummy.quaternion.setFromUnitVectors(TAIL_AXIS, this.tangent.normalize());
      this.spin.setFromAxisAngle(TAIL_AXIS, elapsed * this.config.spinSpeed + index * 0.7);
      this.dummy.quaternion.multiply(this.spin);
      const scale = this.config.tailScale
        + (this.config.headScale - this.config.tailScale) * ratio;
      this.dummy.scale.setScalar(Math.max(scale, 0.0001));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(index, this.dummy.matrix);
    }
    this.mesh.count = count;
    this.visibleShards = count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getState() {
    return {
      shards: this.visibleShards,
      capacity: this.mesh.instanceMatrix.count,
      curveLength: this.length,
      tailLength: this.config.tailLength,
    };
  }

  hide(): void {
    this.mesh.visible = false;
    for (const system of this.wakeSystems) system.endEmit();
  }

  show(): void {
    this.mesh.visible = true;
  }

  dispose(): void {
    this.root.remove(this.mesh);
    this.mesh.dispose();
    for (let index = 0; index < this.wakeSystems.length; index += 1) {
      const behaviors = this.wakeSystems[index].behaviors;
      const placement = this.placements[index];
      const at = behaviors.indexOf(placement);
      if (at >= 0) behaviors.splice(at, 1);
    }
  }
}

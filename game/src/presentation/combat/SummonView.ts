import {
  BoxGeometry,
  ConeGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Shape,
  type BufferGeometry,
  type Scene,
} from "three";
import type { SummonActor } from "../../domain/combat/SummonRuntime";

type SummonKind = "condor" | "lobo" | "urso" | "tigre" | "dragao";
type GeometryKind = "body" | "box" | "cone" | "wing";

function createWingGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.8, 0.2);
  shape.lineTo(1.18, -0.46);
  shape.lineTo(0.72, -0.36);
  shape.lineTo(0.4, -0.55);
  shape.lineTo(0.08, -0.22);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: 0.045, steps: 1, bevelEnabled: false });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export class SummonView {
  private readonly meshes = new Map<string, Group>();
  private readonly live = new Set<string>();
  private readonly prototypes = new Map<SummonKind, Group>();
  private readonly geometries = new Map<GeometryKind, BufferGeometry>();
  private readonly materials = new Map<number, MeshStandardMaterial>();
  private disposed = false;

  constructor(private readonly scene: Scene) {}

  sync(actors: SummonActor[]): void {
    if (this.disposed) return;
    this.live.clear();
    for (const actor of actors) {
      if (!actor.alive || !Number.isFinite(actor.x) || !Number.isFinite(actor.z)) continue;
      this.live.add(actor.uid);
      const kind = this.resolveKind(actor);
      let mesh = this.meshes.get(actor.uid);
      if (!mesh || mesh.userData.summonKind !== kind) {
        if (mesh) this.removeModel(mesh);
        mesh = this.prototypeFor(kind).clone(true);
        mesh.name = `summon-${kind}-${actor.uid}`;
        mesh.userData.summonKind = kind;
        mesh.position.set(actor.x, 0, actor.z);
        this.scene.add(mesh);
        this.meshes.set(actor.uid, mesh);
      }
      const dx = actor.x - mesh.position.x;
      const dz = actor.z - mesh.position.z;
      if (dx * dx + dz * dz > 1e-8) mesh.rotation.y = Math.atan2(dx, dz);
      mesh.position.set(actor.x, 0, actor.z);
      const ratio = Number.isFinite(actor.hp) && Number.isFinite(actor.maxHp) && actor.maxHp > 0
        ? MathUtils.clamp(actor.hp / actor.maxHp, 0, 1)
        : 1;
      mesh.scale.setScalar(0.75 + ratio * 0.25);
    }
    for (const [uid, mesh] of this.meshes) {
      if (this.live.has(uid)) continue;
      this.removeModel(mesh);
      this.meshes.delete(uid);
    }
  }

  clear(): void {
    for (const mesh of this.meshes.values()) this.removeModel(mesh);
    this.meshes.clear();
    this.live.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.clear();
    for (const prototype of this.prototypes.values()) this.removeModel(prototype);
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.prototypes.clear();
    this.geometries.clear();
    this.materials.clear();
    this.disposed = true;
  }

  private removeModel(root: Group): void {
    root.traverse(object => {
      if (object instanceof InstancedMesh) object.dispose();
    });
    root.removeFromParent();
  }

  private resolveKind(actor: SummonActor): SummonKind {
    if (actor.kind === "condor" || actor.kind === "lobo" || actor.kind === "urso" || actor.kind === "tigre" || actor.kind === "dragao") {
      return actor.kind;
    }
    return actor.role === "ranged" ? "condor" : actor.role === "tank" ? "urso" : actor.role === "elite" ? "dragao" : "lobo";
  }

  private geometryFor(kind: GeometryKind): BufferGeometry {
    const cached = this.geometries.get(kind);
    if (cached) return cached;
    const geometry = kind === "box" ? new BoxGeometry(1, 1, 1)
      : kind === "cone" ? new ConeGeometry(1, 1, 6)
      : kind === "wing" ? createWingGeometry()
      : new IcosahedronGeometry(1, 0);
    this.geometries.set(kind, geometry);
    return geometry;
  }

  private materialFor(color: number): MeshStandardMaterial {
    const cached = this.materials.get(color);
    if (cached) return cached;
    const material = new MeshStandardMaterial({ color, roughness: 0.78, flatShading: true });
    this.materials.set(color, material);
    return material;
  }

  private addPart(root: Group, name: string, geometry: GeometryKind, color: number,
    position: [number, number, number], scale: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0]): Mesh {
    const mesh = new Mesh(this.geometryFor(geometry), this.materialFor(color));
    mesh.name = `${root.name}-${name}`;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  }

  private prototypeFor(kind: SummonKind): Group {
    const cached = this.prototypes.get(kind);
    if (cached) return cached;
    const root = kind === "condor" ? this.createCondor() : this.createQuadruped(kind);
    this.compactPrototype(root);
    this.prototypes.set(kind, root);
    return root;
  }

  private compactPrototype(root: Group): void {
    const batches = new Map<string, Mesh<BufferGeometry, MeshStandardMaterial>[]>();
    for (const child of root.children) {
      const part = child as Mesh<BufferGeometry, MeshStandardMaterial>;
      if (part.scale.x < 0 || part.geometry.type === "ExtrudeGeometry") continue;
      const key = `${part.geometry.uuid}:${part.material.uuid}`;
      let parts = batches.get(key);
      if (!parts) {
        parts = [];
        batches.set(key, parts);
      }
      parts.push(part);
    }
    for (const parts of batches.values()) {
      const first = parts[0];
      const batch = new InstancedMesh(first.geometry, first.material, parts.length);
      batch.name = first.name;
      batch.userData.parts = parts.map(part => part.name);
      batch.castShadow = true;
      parts.forEach((part, index) => {
        part.updateMatrix();
        batch.setMatrixAt(index, part.matrix);
        root.remove(part);
      });
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingSphere();
      root.add(batch);
    }
  }

  private addEyes(root: Group, width: number, height: number, forward: number): void {
    for (const side of [-1, 1]) {
      this.addPart(root, `eye-${side}`, "body", 0xe6bf66,
        [side * width, height, forward], [0.035, 0.035, 0.035]);
    }
  }

  private createCondor(): Group {
    const root = new Group();
    root.name = "summon-condor";
    this.addPart(root, "body", "body", 0x3c3430, [0, 1.12, 0], [0.25, 0.24, 0.4]);
    this.addPart(root, "collar", "body", 0xd6c8a6, [0, 1.25, 0.28], [0.2, 0.17, 0.16]);
    this.addPart(root, "head", "body", 0x795541, [0, 1.34, 0.42], [0.15, 0.16, 0.17]);
    this.addPart(root, "beak", "cone", 0xb69a52, [0, 1.3, 0.62], [0.07, 0.25, 0.08], [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      this.addPart(root, `wing-${side}`, "wing", 0x584638,
        [side * 0.12, 1.14, 0], [side * 1.05, 1, 0.9]);
      this.addPart(root, `talon-${side}`, "cone", 0xb69a52,
        [side * 0.12, 0.85, 0], [0.045, 0.22, 0.06], [Math.PI, 0, 0]);
    }
    this.addPart(root, "tail", "box", 0x3c3430, [0, 1.06, -0.5], [0.24, 0.05, 0.45]);
    this.addEyes(root, 0.12, 1.39, 0.5);
    return root;
  }

  private createQuadruped(kind: Exclude<SummonKind, "condor">): Group {
    const root = new Group();
    root.name = `summon-${kind}`;
    const bear = kind === "urso";
    const dragon = kind === "dragao";
    const tiger = kind === "tigre";
    const color = bear ? 0x65472e : dragon ? 0x566348 : tiger ? 0xc18135 : 0x73818a;
    const width = bear ? 0.5 : dragon ? 0.42 : 0.34;
    const height = bear ? 0.74 : dragon ? 0.76 : 0.64;
    this.addPart(root, "body", "body", color, [0, height, 0], [width, bear ? 0.5 : 0.35, 0.66]);
    this.addPart(root, "head", "body", color, [0, height + 0.18, 0.65],
      [bear ? 0.34 : 0.25, bear ? 0.3 : 0.24, dragon ? 0.35 : 0.26]);
    this.addPart(root, "muzzle", "body", bear ? 0xa48157 : dragon ? 0x92946a : 0xd5c6a5,
      [0, height + 0.05, 0.91], [bear ? 0.24 : 0.19, 0.14, dragon ? 0.29 : 0.22]);
    this.addPart(root, "nose", "body", 0x292722, [0, height + 0.1, dragon ? 1.14 : 1.09], [0.09, 0.065, 0.08]);
    for (const side of [-1, 1]) {
      for (const forward of [-1, 1]) {
        this.addPart(root, `paw-${side}-${forward}`, "box", color,
          [side * width * 0.72, 0.28, forward * 0.4], [bear ? 0.24 : 0.15, 0.55, bear ? 0.25 : 0.18]);
      }
      this.addPart(root, `ear-${side}`, bear || tiger ? "body" : "cone", color,
        [side * (bear ? 0.28 : 0.19), height + 0.48, 0.61],
        [bear ? 0.13 : 0.1, bear ? 0.13 : 0.26, 0.1]);
    }
    this.addEyes(root, bear ? 0.22 : 0.17, height + 0.24, 0.81);
    if (tiger) this.addTigerStripes(root);
    if (dragon) this.addDragonWings(root);
    this.addTail(root, kind, color, height);
    return root;
  }

  private addTigerStripes(root: Group): void {
    for (const side of [-1, 1]) {
      for (let stripe = 0; stripe < 3; stripe++) {
        this.addPart(root, `stripe-${side}-${stripe}`, "box", 0x342c22,
          [side * 0.31, 0.72, (stripe - 1) * 0.3], [0.045, 0.32, 0.1], [0.25, 0, side * 0.2]);
      }
    }
  }

  private addDragonWings(root: Group): void {
    for (const side of [-1, 1]) {
      this.addPart(root, `wing-${side}`, "wing", 0x894b32,
        [side * 0.22, 1.03, -0.12], [side * 1.15, 1, 1.05], [0, 0, side * 0.22]);
      this.addPart(root, `horn-${side}`, "cone", 0xd2b773,
        [side * 0.17, 1.29, 0.7], [0.055, 0.34, 0.06], [-0.35, 0, side * 0.2]);
    }
    for (let spine = 0; spine < 3; spine++) {
      this.addPart(root, `spine-${spine}`, "cone", 0xb38a4e,
        [0, 1.16, (spine - 1) * 0.28], [0.08, 0.22, 0.12]);
    }
  }

  private addTail(root: Group, kind: SummonKind, color: number, height: number): void {
    if (kind === "urso") {
      this.addPart(root, "tail", "body", color, [0, height, -0.69], [0.13, 0.13, 0.13]);
      return;
    }
    const segments = kind === "lobo" ? 1 : 3;
    for (let segment = 0; segment < segments; segment++) {
      this.addPart(root, `tail-${segment}`, "cone", color,
        [Math.sin(segment * 0.6) * 0.14, height - segment * 0.055, -0.74 - segment * 0.27],
        [kind === "lobo" ? 0.16 : 0.075, 0.56 - segment * 0.08, kind === "lobo" ? 0.16 : 0.075],
        [-Math.PI / 2 - segment * 0.12, 0, 0]);
    }
  }
}

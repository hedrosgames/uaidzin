import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  TorusGeometry,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type WeaponSetId =
  | "dual-axe"
  | "axe-shield"
  | "sword-shield"
  | "dual-sword"
  | "greatsword"
  | "dual-gloves"
  | "staff-shield"
  | "greatstaff"
  | "bow";

export const WEAPON_SET_IDS: readonly WeaponSetId[] = [
  "dual-axe",
  "axe-shield",
  "sword-shield",
  "dual-sword",
  "greatsword",
  "dual-gloves",
  "staff-shield",
  "greatstaff",
  "bow",
];

export const WEAPON_SET_LABEL: Record<WeaponSetId, string> = {
  "dual-axe": "Machados duplos",
  "axe-shield": "Machado e escudo",
  "sword-shield": "Espada e escudo",
  "dual-sword": "Espadas duplas",
  greatsword: "Espadão",
  "dual-gloves": "Garras",
  "staff-shield": "Cajado e escudo",
  greatstaff: "Cajadão",
  bow: "Arco",
};

export function isWeaponSetId(id: string): id is WeaponSetId {
  return (WEAPON_SET_IDS as readonly string[]).includes(id);
}

type WeaponModelId = "axe" | "sword" | "greatsword" | "staff" | "greatstaff" | "bow" | "shield" | "glove";
type Side = "left" | "right";
type Mount = "grip" | "forearm" | "palm";

interface WeaponModelSpec {
  url: string | null;
  sourceHeight: number;
  length: number;
  grip: number;
  mount: Mount;
  restTiltDeg: number;
  restShift: number;
}

const MODEL_SPECS: Record<WeaponModelId, WeaponModelSpec> = {
  axe: { url: "/weapons/axe/axe.glb", sourceHeight: 1, length: 1.575, grip: 0.3, mount: "grip", restTiltDeg: 30, restShift: 0 },
  sword: { url: "/weapons/sword.glb", sourceHeight: 1, length: 1.575, grip: 0.15, mount: "grip", restTiltDeg: 30, restShift: 0 },
  greatsword: { url: "/weapons/sword-2.glb", sourceHeight: 1, length: 2.635, grip: 0.14, mount: "grip", restTiltDeg: 15, restShift: 0 },
  staff: { url: "/weapons/staff.glb", sourceHeight: 1, length: 1.43, grip: 0.3, mount: "grip", restTiltDeg: 30, restShift: 0 },
  greatstaff: { url: "/weapons/staff.glb", sourceHeight: 1, length: 2.0655, grip: 0.3, mount: "grip", restTiltDeg: 20, restShift: 0 },
  bow: { url: "/weapons/bow.glb", sourceHeight: 1, length: 1.92, grip: 0.5, mount: "grip", restTiltDeg: 90, restShift: 0 },
  shield: { url: null, sourceHeight: 1, length: 0.52, grip: 0.5, mount: "forearm", restTiltDeg: 0, restShift: 0 },
  glove: { url: null, sourceHeight: 1, length: 0.38, grip: 0.5, mount: "palm", restTiltDeg: 0, restShift: 0 },
};

const SET_LOADOUT: Record<WeaponSetId, { right?: WeaponModelId; left?: WeaponModelId }> = {
  "dual-axe": { right: "axe", left: "axe" },
  "axe-shield": { right: "axe", left: "shield" },
  "sword-shield": { right: "sword", left: "shield" },
  "dual-sword": { right: "sword", left: "sword" },
  greatsword: { right: "greatsword" },
  "dual-gloves": { right: "glove", left: "glove" },
  "staff-shield": { right: "staff", left: "shield" },
  greatstaff: { right: "greatstaff" },
  bow: { left: "bow" },
};

const BONE = {
  hand: { left: "mixamorigLeftHand", right: "mixamorigRightHand" },
  forearm: { left: "mixamorigLeftForeArm", right: "mixamorigRightForeArm" },
  index: { left: "mixamorigLeftHandIndex1", right: "mixamorigRightHandIndex1" },
  pinky: { left: "mixamorigLeftHandPinky1", right: "mixamorigRightHandPinky1" },
  middle: { left: "mixamorigLeftHandMiddle1", right: "mixamorigRightHandMiddle1" },
} as const;

const GRIP_ALONG_FINGERS = 0.5;
const GRIP_INTO_PALM = 0.28;
const SHIELD_OFF_ARM = 0.16;
const SHIELD_HAND_BIAS = 0.68;
const SHIELD_BONE_LIFT = 0.04;

interface Attachment {
  anchor: Object3D;
  visual: Group;
  offset: Vector3;
  rotation: Quaternion;
  ownsGeometry: boolean;
}

interface HandFrame {
  center: Vector3;
  fingers: Vector3;
  knuckles: Vector3;
  palm: Vector3;
  fingerLength: number;
}

function findBone(model: Object3D, name: string): Object3D | null {
  let hit: Object3D | null = null;
  model.traverse((obj) => {
    if (!hit && (obj.name === name || obj.name === name.replace("mixamorig", "mixamorig:"))) hit = obj;
  });
  return hit;
}

function hardenWeaponMaterials(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = mats.map((mat) => {
      const src = mat as MeshStandardMaterial;
      const std = new MeshStandardMaterial({
        map: src.map ?? null,
        color: 0xffffff,
        side: DoubleSide,
        roughness: 0.7,
        metalness: 0.05,
      });
      if (std.map) {
        std.map.colorSpace = "srgb";
        std.map.needsUpdate = true;
      }
      src.dispose();
      return std;
    });
    mesh.material = next.length === 1 ? next[0]! : next;
  });
}

function makeShieldPlaceholder(size: number): Group {
  const g = new Group();
  const face = new Mesh(
    new CylinderGeometry(size / 2, size / 2, 0.035, 24),
    new MeshStandardMaterial({ color: 0x3a4e7a, roughness: 0.6, metalness: 0.2 }),
  );
  face.rotation.x = Math.PI / 2;
  g.add(face);
  const rim = new Mesh(
    new TorusGeometry(size / 2, 0.022, 10, 32),
    new MeshStandardMaterial({ color: 0xc9a23a, roughness: 0.45, metalness: 0.5 }),
  );
  g.add(rim);
  const boss = new Mesh(
    new CylinderGeometry(size * 0.12, size * 0.16, 0.05, 16),
    new MeshStandardMaterial({ color: 0xc9a23a, roughness: 0.45, metalness: 0.5 }),
  );
  boss.rotation.x = Math.PI / 2;
  boss.position.z = 0.03;
  g.add(boss);
  return g;
}

function makeGlovePlaceholder(size: number): Group {
  const g = new Group();
  const steel = new MeshStandardMaterial({ color: 0x5fd7e6, roughness: 0.35, metalness: 0.3 });
  const gold = new MeshStandardMaterial({ color: 0xd4a017, roughness: 0.45, metalness: 0.5 });
  const cuff = new Mesh(new BoxGeometry(size * 0.6, size * 0.55, size * 0.5), gold);
  cuff.position.y = size * 0.1;
  g.add(cuff);
  const band = new Mesh(new BoxGeometry(size * 0.66, size * 0.12, size * 0.56), steel);
  band.position.y = -size * 0.14;
  g.add(band);
  for (const dx of [-0.2, 0, 0.2]) {
    const claw = new Mesh(new ConeGeometry(size * 0.07, size * 0.9, 8), steel);
    claw.position.set(dx * size, size * 0.8, size * 0.08);
    g.add(claw);
  }
  return g;
}

export class WeaponRig {
  private readonly loader = new GLTFLoader();
  private readonly prototypes = new Map<WeaponModelId, Promise<Object3D | null>>();
  private attachments: Attachment[] = [];
  private currentSet: WeaponSetId | null = null;
  private model: Object3D | null = null;
  private generation = 0;
  private readonly rootInverse = new Matrix4();
  private readonly anchorMatrix = new Matrix4();
  private readonly anchorPos = new Vector3();
  private readonly anchorQuat = new Quaternion();
  private readonly anchorScale = new Vector3();
  private readonly tmp = new Vector3();

  getVisualRoots(): Object3D[] {
    return this.attachments.map((a) => a.visual);
  }

  getSet(): WeaponSetId | null {
    return this.currentSet;
  }

  bindModel(model: Object3D): void {
    this.model = model;
    this.clear();
  }

  clear(): void {
    this.generation += 1;
    for (const a of this.attachments) {
      a.visual.removeFromParent();
      if (!a.ownsGeometry) continue;
      a.visual.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m.dispose();
      });
    }
    this.attachments = [];
  }

  async equip(root: Group, set: WeaponSetId): Promise<void> {
    this.clear();
    this.currentSet = set;
    const model = this.model;
    if (!model) return;
    const gen = this.generation;
    const loadout = SET_LOADOUT[set];
    const jobs: Promise<void>[] = [];
    for (const side of ["right", "left"] as const) {
      const id = loadout[side];
      if (!id) continue;
      jobs.push(this.attach(root, model, side, id, gen));
    }
    await Promise.all(jobs);
    this.sync(root);
  }

  sync(root: Group): void {
    if (!this.attachments.length) return;
    root.updateWorldMatrix(true, false);
    this.rootInverse.copy(root.matrixWorld).invert();
    for (const a of this.attachments) {
      a.anchor.updateWorldMatrix(true, false);
      this.anchorMatrix.multiplyMatrices(this.rootInverse, a.anchor.matrixWorld);
      this.anchorMatrix.decompose(this.anchorPos, this.anchorQuat, this.anchorScale);
      this.tmp.copy(a.offset).applyQuaternion(this.anchorQuat);
      a.visual.position.copy(this.anchorPos).add(this.tmp);
      a.visual.quaternion.copy(this.anchorQuat).multiply(a.rotation);
    }
  }

  private async attach(root: Group, model: Object3D, side: Side, id: WeaponModelId, gen: number): Promise<void> {
    const spec = MODEL_SPECS[id];
    const hand = findBone(model, BONE.hand[side]);
    if (!hand) return;
    const frame = this.measureHand(model, hand, side);
    if (!frame) return;
    const built = await this.buildVisual(id, spec);
    if (!built || gen !== this.generation) return;

    const anchor = spec.mount === "forearm" ? findBone(model, BONE.forearm[side]) ?? hand : hand;
    const visual = new Group();
    visual.name = `weapon-${side}-${id}`;
    const placement = this.placeOn(anchor, frame, spec);
    if (spec.mount === "grip") built.body.position.y = -spec.grip * spec.length;
    visual.add(built.body);
    root.add(visual);
    this.attachments.push({
      anchor,
      visual,
      offset: placement.offset,
      rotation: placement.rotation,
      ownsGeometry: built.ownsGeometry,
    });
  }

  private measureHand(model: Object3D, hand: Object3D, side: Side): HandFrame | null {
    const index = findBone(model, BONE.index[side]);
    const pinky = findBone(model, BONE.pinky[side]);
    const middle = findBone(model, BONE.middle[side]);
    if (!index || !pinky || !middle) return null;
    model.updateWorldMatrix(true, true);
    const hp = hand.getWorldPosition(new Vector3());
    const ip = index.getWorldPosition(new Vector3());
    const pp = pinky.getWorldPosition(new Vector3());
    const mp = middle.getWorldPosition(new Vector3());
    const fingers = mp.clone().sub(hp);
    const fingerLength = fingers.length();
    fingers.normalize();
    const knuckles = ip.clone().sub(pp).normalize();
    const palm = new Vector3().crossVectors(fingers, knuckles).normalize();
    if (side === "right") palm.negate();
    const center = hp
      .clone()
      .addScaledVector(fingers, fingerLength * GRIP_ALONG_FINGERS)
      .addScaledVector(palm, fingerLength * GRIP_INTO_PALM);
    return { center, fingers, knuckles, palm, fingerLength };
  }

  private placeOn(anchor: Object3D, frame: HandFrame, spec: WeaponModelSpec): { offset: Vector3; rotation: Quaternion } {
    anchor.updateWorldMatrix(true, false);
    const anchorPos = anchor.getWorldPosition(new Vector3());
    const anchorRot = new Matrix4().extractRotation(anchor.matrixWorld);
    const anchorRotInv = anchorRot.clone().invert();
    const toLocal = (v: Vector3) => v.clone().applyMatrix4(anchorRotInv);

    let worldCenter: Vector3;
    let up: Vector3;
    let forward: Vector3;
    if (spec.mount === "forearm") {
      const boneDir = new Vector3().setFromMatrixColumn(anchorRot, 1).normalize();
      const outward = frame.palm.clone().negate();
      outward.addScaledVector(boneDir, -outward.dot(boneDir)).normalize();
      const handPos = frame.center.clone().addScaledVector(frame.fingers, -frame.fingerLength * GRIP_ALONG_FINGERS);
      const mid = anchorPos.clone().lerp(handPos, SHIELD_HAND_BIAS);
      worldCenter = mid
        .addScaledVector(outward, SHIELD_OFF_ARM)
        .addScaledVector(boneDir, SHIELD_BONE_LIFT);
      up = boneDir;
      forward = outward;
    } else if (spec.mount === "palm") {
      worldCenter = frame.center.clone().addScaledVector(frame.palm, -frame.fingerLength * GRIP_INTO_PALM * 1.6);
      up = frame.fingers.clone();
      forward = frame.palm.clone().negate();
    } else {
      const tilt = MathUtils.degToRad(spec.restTiltDeg);
      worldCenter = frame.center.clone().addScaledVector(frame.knuckles, spec.restShift);
      up = frame.knuckles
        .clone()
        .multiplyScalar(Math.cos(tilt))
        .addScaledVector(frame.fingers, Math.sin(tilt))
        .normalize();
      forward = frame.palm.clone().negate();
    }
    const right = new Vector3().crossVectors(up, forward).normalize();
    forward = new Vector3().crossVectors(right, up).normalize();
    const basis = new Matrix4().makeBasis(right, up, forward);
    const worldQuat = new Quaternion().setFromRotationMatrix(basis);
    const anchorQuat = new Quaternion().setFromRotationMatrix(anchorRot);
    const rotation = anchorQuat.clone().invert().multiply(worldQuat);
    const offset = toLocal(worldCenter.clone().sub(anchorPos));
    return { offset, rotation };
  }

  private async buildVisual(
    id: WeaponModelId,
    spec: WeaponModelSpec,
  ): Promise<{ body: Object3D; ownsGeometry: boolean } | null> {
    if (id === "shield") return { body: makeShieldPlaceholder(spec.length), ownsGeometry: true };
    if (id === "glove") return { body: makeGlovePlaceholder(spec.length), ownsGeometry: true };
    const proto = await this.loadPrototype(id, spec);
    if (!proto) return null;
    const inst = proto.clone(true);
    inst.scale.setScalar(spec.length / spec.sourceHeight);
    return { body: inst, ownsGeometry: false };
  }

  private loadPrototype(id: WeaponModelId, spec: WeaponModelSpec): Promise<Object3D | null> {
    let pending = this.prototypes.get(id);
    if (!pending) {
      pending = spec.url
        ? this.loader
            .loadAsync(spec.url)
            .then((gltf) => {
              hardenWeaponMaterials(gltf.scene);
              return gltf.scene as Object3D | null;
            })
            .catch(() => null)
        : Promise.resolve(null);
      this.prototypes.set(id, pending);
    }
    return pending;
  }
}

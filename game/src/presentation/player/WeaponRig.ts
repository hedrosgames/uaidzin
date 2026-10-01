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
import { makePaintedCharacterMaterial } from "../rendering/PaintedCharacter";
import {
  WEAPON_SETS,
  type WeaponModelId,
  type WeaponSetId,
} from "./WeaponSetCatalog";

export type { WeaponSetId } from "./WeaponSetCatalog";
export {
  WEAPON_SET_IDS,
  WEAPON_SET_LABEL,
  isWeaponSetId,
} from "./WeaponSetCatalog";

type Side = "left" | "right";
type Mount = "grip" | "forearm" | "palm" | "bowRest";

interface WeaponModelSpec {
  url: string | null;
  sourceHeight: number;
  length: number;
  grip: number;
  mount: Mount;
  restTiltDeg: number;
  restShift: number;
  restRollDeg: number;
}

const MODEL_SPECS: Record<WeaponModelId, WeaponModelSpec> = {
  axe: { url: "/weapons/axe/axe.glb", sourceHeight: 1, length: 1.45, grip: 0.32, mount: "grip", restTiltDeg: 22, restShift: 0.03, restRollDeg: 0 },
  sword: { url: "/weapons/sword.glb", sourceHeight: 1, length: 1.5, grip: 0.28, mount: "grip", restTiltDeg: 22, restShift: 0.03, restRollDeg: 0 },
  greatsword: { url: "/weapons/sword-2.glb", sourceHeight: 1, length: 2.635, grip: 0.14, mount: "grip", restTiltDeg: 15, restShift: 0, restRollDeg: 0 },
  staff: { url: "/weapons/staff.glb", sourceHeight: 1, length: 1.55, grip: 0.28, mount: "grip", restTiltDeg: 22, restShift: 0.04, restRollDeg: 0 },
  greatstaff: { url: "/weapons/staff.glb", sourceHeight: 1, length: 2.0655, grip: 0.3, mount: "grip", restTiltDeg: 20, restShift: 0, restRollDeg: 0 },
  bow: { url: "/weapons/bow.glb", sourceHeight: 1, length: 1.55, grip: 0.5, mount: "bowRest", restTiltDeg: 0, restShift: 0, restRollDeg: 0 },
  shield: { url: null, sourceHeight: 1, length: 0.52, grip: 0.5, mount: "forearm", restTiltDeg: 0, restShift: 0, restRollDeg: 0 },
  glove: { url: null, sourceHeight: 1, length: 0.38, grip: 0.5, mount: "palm", restTiltDeg: 0, restShift: 0, restRollDeg: 0 },
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
const WORLD_UP = new Vector3(0, 1, 0);

interface Attachment {
  anchor: Object3D;
  visual: Group;
  socket: Group | null;
  ownsGeometry: boolean;
  bowRest: boolean;
  bowRestReach: number;
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
      const std = makePaintedCharacterMaterial(src);
      std.side = DoubleSide;
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

export interface WeaponGltfLoader {
  loadAsync(url: string): Promise<{ scene: Object3D }>;
}

export class WeaponRig {
  private readonly loader: WeaponGltfLoader;
  private readonly prototypes = new Map<WeaponModelId, Promise<Object3D | null>>();
  private attachments: Attachment[] = [];
  private currentSetId: WeaponSetId | null = null;
  private model: Object3D | null = null;
  private generation = 0;
  private readonly rootInverse = new Matrix4();
  private readonly anchorPos = new Vector3();
  private readonly anchorScale = new Vector3();
  private readonly tmp = new Vector3();
  private readonly rootQuat = new Quaternion();
  private readonly invRootQuat = new Quaternion();
  private readonly worldQuat = new Quaternion();
  private readonly bowForward = new Vector3();
  private readonly bowSpan = new Vector3();
  private readonly bowRight = new Vector3();
  private readonly bowBasis = new Matrix4();

  constructor(loader?: WeaponGltfLoader) {
    this.loader = loader ?? new GLTFLoader();
  }

  getVisualRoots(): Object3D[] {
    return this.attachments.map((a) => a.visual);
  }

  getAttackPoint(result: Vector3): boolean {
    const attachment = this.attachments.find(({ visual }) => visual.name.startsWith("weapon-right-"))
      ?? this.attachments.find(({ visual }) => !visual.name.endsWith("shield"));
    if (!attachment) return false;
    const id = attachment.visual.name.replace(/^weapon-(right|left)-/, "") as WeaponModelId;
    const spec = MODEL_SPECS[id];
    if (!spec) return false;
    attachment.visual.updateWorldMatrix(true, false);
    result.set(0, spec.length * (1 - spec.grip), 0);
    attachment.visual.localToWorld(result);
    return true;
  }

  get currentSet(): WeaponSetId | null {
    return this.currentSetId;
  }

  getSet(): WeaponSetId | null {
    return this.currentSetId;
  }

  bindModel(model: Object3D): void {
    this.model = model;
    this.clear();
  }

  clear(): void {
    this.generation += 1;
    this.currentSetId = null;
    for (const a of this.attachments) {
      const node = a.socket ?? a.visual;
      node.removeFromParent();
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
    const model = this.model;
    if (!model) return;
    const gen = this.generation;
    const loadout = WEAPON_SETS[set];
    const jobs: Promise<void>[] = [];
    for (const side of ["right", "left"] as const) {
      const id = loadout[side];
      if (!id) continue;
      jobs.push(this.attach(root, model, side, id, gen));
    }
    await Promise.all(jobs);
    if (gen !== this.generation) return;
    this.currentSetId = set;
    this.sync(root);
  }

  sync(root: Group): void {
    if (!this.attachments.length) return;
    for (const a of this.attachments) {
      if (a.bowRest) this.syncBowRest(root, a);
    }
  }

  private unitSocket(anchor: Object3D): Group {
    anchor.updateWorldMatrix(true, false);
    const socket = new Group();
    socket.name = "weapon-socket";
    anchor.add(socket);
    socket.position.set(0, 0, 0);
    socket.quaternion.identity();
    anchor.getWorldScale(this.tmp);
    socket.scale.set(
      this.tmp.x !== 0 ? 1 / this.tmp.x : 1,
      this.tmp.y !== 0 ? 1 / this.tmp.y : 1,
      this.tmp.z !== 0 ? 1 / this.tmp.z : 1,
    );
    return socket;
  }

  private syncBowRest(root: Group, a: Attachment): void {
    root.updateWorldMatrix(true, false);
    this.rootInverse.copy(root.matrixWorld).invert();
    root.matrixWorld.decompose(this.tmp, this.rootQuat, this.anchorScale);
    this.bowForward.set(0, 0, -1).applyQuaternion(this.rootQuat).normalize();
    this.bowSpan.crossVectors(WORLD_UP, this.bowForward);
    if (this.bowSpan.lengthSq() < 1e-6) this.bowSpan.set(1, 0, 0);
    else this.bowSpan.normalize();
    a.anchor.updateWorldMatrix(true, false);
    a.anchor.getWorldPosition(this.anchorPos);
    this.tmp
      .copy(this.anchorPos)
      .addScaledVector(this.bowSpan, a.bowRestReach * 0.14)
      .addScaledVector(this.bowForward, a.bowRestReach * 0.05)
      .addScaledVector(WORLD_UP, -a.bowRestReach * 0.22);
    this.bowRight.crossVectors(this.bowSpan, this.bowForward).normalize();
    this.bowForward.crossVectors(this.bowRight, this.bowSpan).normalize();
    this.bowBasis.makeBasis(this.bowRight, this.bowSpan, this.bowForward);
    this.worldQuat.setFromRotationMatrix(this.bowBasis);
    this.tmp.applyMatrix4(this.rootInverse);
    a.visual.position.copy(this.tmp);
    this.invRootQuat.copy(this.rootQuat).invert();
    a.visual.quaternion.copy(this.invRootQuat.multiply(this.worldQuat));
  }

  private async attach(
    root: Group,
    model: Object3D,
    side: Side,
    id: WeaponModelId,
    gen: number,
  ): Promise<void> {
    const spec = MODEL_SPECS[id];
    const hand = findBone(model, BONE.hand[side]);
    if (!hand) return;
    const frame = this.measureHand(model, hand, side);
    if (!frame) return;
    const built = await this.buildVisual(id, spec);
    if (!built || gen !== this.generation) {
      if (built?.ownsGeometry) {
        built.body.traverse((obj) => {
          const mesh = obj as Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) m.dispose();
        });
      }
      return;
    }

    const visual = new Group();
    visual.name = `weapon-${side}-${id}`;
    if (spec.mount === "grip" || spec.mount === "bowRest") {
      built.body.position.y = -spec.grip * spec.length;
    }
    visual.add(built.body);

    if (spec.mount === "bowRest") {
      root.add(visual);
      this.attachments.push({
        anchor: hand,
        visual,
        socket: null,
        ownsGeometry: built.ownsGeometry,
        bowRest: true,
        bowRestReach: frame.fingerLength,
      });
      return;
    }

    const anchor = spec.mount === "forearm" ? findBone(model, BONE.forearm[side]) ?? hand : hand;
    const socket = this.unitSocket(anchor);
    const placement = this.placeOn(anchor, frame, spec);
    visual.position.copy(placement.offset);
    visual.quaternion.copy(placement.rotation);
    socket.add(visual);
    this.attachments.push({
      anchor,
      visual,
      socket,
      ownsGeometry: built.ownsGeometry,
      bowRest: false,
      bowRestReach: 0,
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

  private placeOn(
    anchor: Object3D,
    frame: HandFrame,
    spec: WeaponModelSpec,
  ): { offset: Vector3; rotation: Quaternion } {
    anchor.updateWorldMatrix(true, false);
    const anchorPos = anchor.getWorldPosition(new Vector3());
    const anchorRot = new Matrix4().extractRotation(anchor.matrixWorld);
    const anchorRotInv = anchorRot.clone().invert();
    const anchorQuat = new Quaternion().setFromRotationMatrix(anchorRot);

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
    const rotation = anchorQuat.clone().invert().multiply(worldQuat);
    if (spec.restRollDeg !== 0) {
      rotation.multiply(
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), MathUtils.degToRad(spec.restRollDeg)),
      );
    }
    const offset = worldCenter.clone().sub(anchorPos).applyMatrix4(anchorRotInv);
    return { offset, rotation };
  }

  private async buildVisual(
    id: WeaponModelId,
    spec: WeaponModelSpec,
  ): Promise<{ body: Object3D; ownsGeometry: boolean } | null> {
    if (id === "shield" || id === "glove") {
      const body = id === "shield" ? makeShieldPlaceholder(spec.length) : makeGlovePlaceholder(spec.length);
      hardenWeaponMaterials(body);
      return { body, ownsGeometry: true };
    }
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
            .catch(() => {
              this.prototypes.delete(id);
              return null;
            })
        : Promise.resolve(null);
      this.prototypes.set(id, pending);
    }
    return pending;
  }
}

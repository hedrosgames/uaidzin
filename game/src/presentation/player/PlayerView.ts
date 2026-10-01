import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Bone,
  Box3,
  DoubleSide,
  Group,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SkinnedMesh,
  Vector3,
  VectorKeyframeTrack,
  type Texture,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import {
  SHARED_IDLE_URL,
  humanAnimUrl,
  humanCombatUrl,
  idleAnimUrl,
  type HumanAttackClip,
} from "./PlayerAnimCatalog";
import { ArmorAura } from "./ArmorAura";
import { makePaintedCharacterMaterial } from "../rendering/PaintedCharacter";
import { loadPaintedCharacterAtlas } from "../rendering/PaintedCharacterAtlas";
import { normalizeArmorAppearance, type ArmorAppearance } from "../../../public/boot/assets/armor-appearance.mjs";
import { repairCharacterGeometry } from "../../../public/boot/assets/character-geometry.mjs";
import {
  CLASS_WEAPON_SET,
  attackClipForWeapon,
  basicAnimForWeapon,
  idleClipForWeapon,
  isPlayerClassId,
  type PlayerClassId,
  type WeaponIdleId,
  type WeaponSetId,
} from "./WeaponSetCatalog";
import { WeaponRig } from "./WeaponRig";

const HIPS_POSITION_TRACK = /Hips\.position$/;
const RUN_REF_SPEED = 3.4;

function hipsRestFromClip(clip: AnimationClip): Vector3 | null {
  const track = clip.tracks.find((t) => HIPS_POSITION_TRACK.test(t.name));
  if (!track || track.values.length < 3) return null;
  return new Vector3(track.values[0], track.values[1], track.values[2]);
}

function applyClassStandingPose(model: Object3D, clip: AnimationClip | undefined): void {
  if (!clip) return;
  for (const track of clip.tracks) {
    const separator = track.name.lastIndexOf(".");
    const bone = model.getObjectByName(track.name.slice(0, separator)) as Bone | undefined;
    if (!bone?.isBone) continue;
    const property = track.name.slice(separator + 1);
    if (property === "position") bone.position.fromArray(track.values);
    else if (property === "quaternion") bone.quaternion.fromArray(track.values);
    else if (property === "scale") bone.scale.fromArray(track.values);
  }
  model.updateMatrixWorld(true);
}

function pinHipsToRest(clip: AnimationClip, rest: Vector3): AnimationClip {
  const tracks = clip.tracks.map((track) => {
    if (!HIPS_POSITION_TRACK.test(track.name)) return track;
    const duration = Math.max(clip.duration, 1 / 30);
    return new VectorKeyframeTrack(
      track.name,
      [0, duration],
      [rest.x, rest.y, rest.z, rest.x, rest.y, rest.z],
    );
  });
  return new AnimationClip(clip.name, clip.duration, tracks);
}

const GHOST_NAME = "PlayerOcclusionGhost";

export type PlayerAnim =
  | "idle"
  | "run"
  | "attack"
  | "cast"
  | "hit_gut"
  | "hit_right"
  | "death";

export type { PlayerClassId } from "./WeaponSetCatalog";
export { isPlayerClassId } from "./WeaponSetCatalog";

const CLASS_MODEL: Record<PlayerClassId, string> = {
  TK: "/models/player/TK/TK.glb",
  FM: "/models/player/FM/FM.glb",
  BM: "/models/player/BM/BM.glb",
  HT: "/models/player/HT/HT.glb",
};

const FIXED_ANIM_URLS: Record<Exclude<PlayerAnim, "idle" | "attack">, string> = {
  run: humanCombatUrl("run"),
  cast: humanCombatUrl("cast"),
  hit_gut: humanCombatUrl("hit_gut"),
  hit_right: humanCombatUrl("hit_right"),
  death: humanCombatUrl("death"),
};

const ONE_SHOT: ReadonlySet<PlayerAnim> = new Set([
  "attack",
  "cast",
  "hit_gut",
  "hit_right",
  "death",
]);

const TARGET_HEIGHT = 1.72 * 1.1;

export interface PlayerGltfLoader {
  loadAsync(url: string): Promise<{ scene: Object3D; animations: AnimationClip[] }>;
}

export class PlayerView {
  readonly root = new Group();
  private readonly loader: PlayerGltfLoader;
  private mixer: AnimationMixer | null = null;
  private readonly actions = new Map<PlayerAnim, AnimationAction>();
  private model: Object3D | null = null;
  private current: PlayerAnim | "" = "";
  private busyUntil = 0;
  private dead = false;
  private moving = false;
  private classId: PlayerClassId = "TK";
  private armorAppearance: ArmorAppearance = "gold";
  private appliedArmorAppearance: ArmorAppearance | null = null;
  private armorAppearanceGen = 0;
  private readonly originalMaterials = new Map<Mesh, MeshStandardMaterial[]>();
  private readonly armorAura = new ArmorAura();
  private readonly ghosts: Mesh[] = [];
  private readonly weaponRig: WeaponRig;
  private weaponSet: WeaponSetId | null = null;
  private attackClip: HumanAttackClip = "attack";
  private idleClip: WeaponIdleId = "class";
  private classIdleClip: AnimationClip | null = null;
  private attackBindGen = 0;
  private idleBindGen = 0;
  private loadGen = 0;
  private weaponSetGen = 0;
  private moveSpeed = COMBAT_BALANCE.player.speed;
  private hipsRest: Vector3 | null = null;
  ready = false;

  constructor(loader?: PlayerGltfLoader) {
    this.root.name = "PlayerRoot";
    this.loader = loader ?? new GLTFLoader();
    this.weaponRig = new WeaponRig(this.loader);
  }

  async load(classId: string = "TK"): Promise<void> {
    const id: PlayerClassId = isPlayerClassId(classId) ? classId : "TK";
    const loadToken = ++this.loadGen;
    this.classId = id;
    this.ready = false;
    this.dead = false;
    this.current = "";
    this.busyUntil = 0;
    this.actions.clear();
    if (this.model) {
      this.disposeObject(this.model);
      this.root.remove(this.model);
      this.model = null;
    }
    this.mixer = null;
    this.hipsRest = null;
    this.classIdleClip = null;
    this.idleClip = "class";
    this.clearGhosts();
    this.originalMaterials.clear();
    this.appliedArmorAppearance = null;
    const loadedAppearance = this.armorAppearance;

    const animEntries = Object.entries(FIXED_ANIM_URLS) as Array<
      [Exclude<PlayerAnim, "idle" | "attack">, string]
    >;

    const [base, sharedIdleGltf, loadedAnims, paintedAtlas] = await Promise.all([
      this.loader.loadAsync(CLASS_MODEL[id]),
      id === "TK"
        ? this.loader.loadAsync(SHARED_IDLE_URL).catch(() => null)
        : Promise.resolve(null),
      Promise.all(
        animEntries.map(async ([name, url]) => {
          const gltf = await this.loader.loadAsync(url);
          return [name, gltf] as const;
        }),
      ),
      this.loader instanceof GLTFLoader ? loadPaintedCharacterAtlas(id, loadedAppearance) : Promise.resolve(null),
    ]);

    if (loadToken !== this.loadGen) {
      this.disposeObject(base.scene);
      if (sharedIdleGltf) this.disposeObject(sharedIdleGltf.scene);
      for (const [, gltf] of loadedAnims) {
        this.disposeObject(gltf.scene);
      }
      return;
    }

    const model = base.scene;
    model.name = id;
    repairCharacterGeometry(model, id);
    this.hardenMaterials(model, paintedAtlas);
    this.appliedArmorAppearance = loadedAppearance;

    this.model = model;
    this.root.add(model);
    applyClassStandingPose(model, base.animations[0]);

    this.mixer = new AnimationMixer(model);

    const embeddedIdle = base.animations[0] ?? null;
    if (embeddedIdle) {
      embeddedIdle.name = "idle";
      this.classIdleClip = embeddedIdle;
      this.hipsRest = hipsRestFromClip(embeddedIdle);
    }

    if (id === "TK" && sharedIdleGltf) {
      const donorIdle = sharedIdleGltf.animations[0] ?? null;
      this.disposeObject(sharedIdleGltf.scene);
      if (donorIdle) {
        this.classIdleClip = this.adaptExternalClip(donorIdle);
        this.classIdleClip.name = "idle";
      }
    }

    for (const [name, gltf] of loadedAnims) {
      const raw = gltf.animations[0] ?? null;
      const clip = raw ? this.adaptExternalClip(raw) : null;
      this.disposeObject(gltf.scene);
      if (!clip || !this.mixer) continue;
      clip.name = name;
      this.actions.set(name, this.mixer.clipAction(clip));
    }

    this.fitStandingHeight(model);
    if (this.classIdleClip && this.mixer) {
      this.actions.set("idle", this.mixer.clipAction(this.classIdleClip));
    }
    this.play("idle", true);
    this.buildGhosts(model);
    this.weaponRig.bindModel(model);

    const targetSet = this.weaponSet ?? CLASS_WEAPON_SET[id];
    const weaponToken = ++this.weaponSetGen;
    await this.applyWeaponSet(targetSet, weaponToken, loadToken);
    if (loadToken !== this.loadGen) return;
    await this.setArmorAppearance(this.armorAppearance);
    if (loadToken !== this.loadGen) return;
    this.ready = true;
  }

  async setArmorAppearance(appearance: ArmorAppearance): Promise<void> {
    this.armorAppearance = normalizeArmorAppearance(appearance);
    const token = ++this.armorAppearanceGen;
    const loadToken = this.loadGen;
    if (!this.model || this.appliedArmorAppearance === this.armorAppearance) return;
    const requested = this.armorAppearance;
    const atlas = this.loader instanceof GLTFLoader
      ? await loadPaintedCharacterAtlas(this.classId, requested)
      : null;
    if (token !== this.armorAppearanceGen || loadToken !== this.loadGen || !this.model) return;
    this.hardenMaterials(this.model, atlas);
    this.appliedArmorAppearance = requested;
  }

  getArmorAppearance(): ArmorAppearance {
    return this.appliedArmorAppearance ?? this.armorAppearance;
  }

  async setWeaponSet(set: WeaponSetId): Promise<void> {
    this.weaponSet = set;
    const weaponToken = ++this.weaponSetGen;
    const loadToken = this.loadGen;
    if (!this.model || !this.mixer) return;
    await this.applyWeaponSet(set, weaponToken, loadToken);
  }

  async clearWeapons(): Promise<void> {
    this.weaponSet = null;
    const weaponToken = ++this.weaponSetGen;
    const loadToken = this.loadGen;
    this.weaponRig.clear();
    this.armorAura.apply([]);
    if (!this.model || !this.mixer) return;
    this.attackClip = "attack";
    await this.bindAttackClipSafe("attack", weaponToken, loadToken);
    if (weaponToken !== this.weaponSetGen || loadToken !== this.loadGen) return;
    await this.bindIdleClip("class", weaponToken, loadToken);
    if (!this.dead) this.play(this.moving ? "run" : "idle", true);
  }

  private async applyWeaponSet(
    set: WeaponSetId,
    weaponToken: number,
    loadToken: number,
  ): Promise<void> {
    const nextAttack = attackClipForWeapon(set);
    if (nextAttack !== this.attackClip || !this.actions.has("attack")) {
      this.attackClip = nextAttack;
      await this.bindAttackClipSafe(nextAttack, weaponToken, loadToken);
      if (weaponToken !== this.weaponSetGen || loadToken !== this.loadGen) return;
    }
    await this.bindIdleForWeapon(set, weaponToken, loadToken);
    if (weaponToken !== this.weaponSetGen || loadToken !== this.loadGen) return;
    if (this.mixer) {
      for (let i = 0; i < 12; i++) this.mixer.update(1 / 30);
    }
    await this.weaponRig.equip(this.root, set);
    if (weaponToken !== this.weaponSetGen || loadToken !== this.loadGen) return;
    this.armorAura.apply(this.weaponRig.getVisualRoots());
    if (!this.dead) this.play(this.moving ? "run" : "idle", true);
  }

  getWeaponSet(): WeaponSetId | null {
    return this.weaponRig.getSet();
  }

  getWeaponRig(): WeaponRig {
    return this.weaponRig;
  }
  getAttackPoint(out: Vector3): Vector3 {
    const hand = this.model?.getObjectByName("mixamorigRightHand")
      ?? this.model?.getObjectByName("mixamorig:RightHand");
    if (hand) return hand.getWorldPosition(out);
    this.root.updateWorldMatrix(true, false);
    return this.root.localToWorld(out.set(0, 1.05, 0.35));
  }

  setArmorAuraEnabled(on: boolean): void {
    if (this.armorAura.isEnabled() === on) return;
    this.armorAura.setEnabled(on);
  }

  isArmorAuraEnabled(): boolean {
    return this.armorAura.isEnabled();
  }

  getArmorAuraShellCount(): number {
    return this.armorAura.getShellCount();
  }

  setOcclusionGhostVisible(visible: boolean): void {
    for (const ghost of this.ghosts) ghost.visible = visible;
  }

  getClassId(): PlayerClassId {
    return this.classId;
  }

  getAnimationMixer(): AnimationMixer | null {
    return this.mixer;
  }

  setMoveSpeed(speed: number): void {
    this.moveSpeed = Math.max(0.1, speed);
    this.syncRunTimeScale();
  }

  setPose(x: number, z: number, facing: number, moving: boolean, y = 0): void {
    this.root.position.set(x, y, z);
    this.root.rotation.set(0, facing, 0);
    this.moving = moving;
    if (!this.ready || this.dead) return;
    if (performance.now() < this.busyUntil) return;
    const want: PlayerAnim = moving ? "run" : "idle";
    if (this.current !== want) this.play(want, true);
    else if (want === "run") this.syncRunTimeScale();
  }

  playAttack(attackSpeedMul = 1): "attack" | "cast" {
    const set = this.weaponRig.getSet() ?? this.weaponSet;
    const anim: "attack" | "cast" = set ? basicAnimForWeapon(set) : "attack";
    this.playOneShot(anim, attackSpeedMul);
    return anim;
  }

  playCast(castSpeedMul = 1): void {
    this.playOneShot("cast", castSpeedMul);
  }

  playHit(): void {
  }

  isBusy(): boolean {
    return !this.dead && this.busyUntil > 0 && performance.now() < this.busyUntil;
  }

  getBusyRemainingSec(): number {
    if (!this.isBusy()) return 0;
    return Math.max(0, (this.busyUntil - performance.now()) / 1000);
  }

  playDeath(): void {
    const action = this.actions.get("death");
    if (action) {
      action.stop();
      action.reset();
      action.weight = 1;
    }
    this.dead = true;
    this.busyUntil = 0;
    this.current = "";
    this.playOneShot("death");
  }

  clearDeath(): void {
    if (!this.dead && this.current !== "death") return;
    this.dead = false;
    this.busyUntil = 0;
    this.mixer?.stopAllAction();
    this.current = "";
    if (this.ready) this.play(this.moving ? "run" : "idle", true);
  }

  isDeadPose(): boolean {
    return this.dead;
  }

  getAnimDurationSec(name: PlayerAnim): number {
    const action = this.actions.get(name);
    if (!action) return 1.2;
    return Math.max(0.25, action.getClip().duration / Math.max(action.timeScale, 0.01));
  }

  getCombatAnimProbe(): {
    weaponSet: WeaponSetId | null;
    attackClipId: HumanAttackClip;
    idleClipId: WeaponIdleId;
    basicAnim: "attack" | "cast";
    attackDurationSec: number;
    attackActionReady: boolean;
  } {
    const set = this.weaponRig.getSet() ?? this.weaponSet;
    const action = this.actions.get("attack");
    return {
      weaponSet: set,
      attackClipId: this.attackClip,
      idleClipId: this.idleClip,
      basicAnim: set ? basicAnimForWeapon(set) : "attack",
      attackDurationSec: this.getAnimDurationSec("attack"),
      attackActionReady: !!(this.ready && action && action.getClip()),
    };
  }

  update(dt: number): void {
    this.mixer?.update(dt);
    this.armorAura.update(dt);
    this.weaponRig.sync(this.root);
    if (
      this.busyUntil > 0 &&
      performance.now() >= this.busyUntil &&
      !this.dead &&
      this.current !== "idle" &&
      this.current !== "run"
    ) {
      this.busyUntil = 0;
      this.play(this.moving ? "run" : "idle", true);
    }
  }

  private fitStandingHeight(model: Object3D): void {
    model.scale.setScalar(1);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    const boneBox = new Box3();
    const tip = new Vector3();
    const inv = model.matrixWorld.clone().invert();
    let found = false;
    model.traverse((obj) => {
      if (!(obj as Bone).isBone) return;
      obj.getWorldPosition(tip);
      tip.applyMatrix4(inv);
      if (!found) {
        boneBox.set(tip.clone(), tip.clone());
        found = true;
      } else {
        boneBox.expandByPoint(tip);
      }
    });
    if (!found) boneBox.setFromObject(model);

    const center = boneBox.getCenter(new Vector3());
    const height = Math.max(boneBox.max.y - boneBox.min.y, 0.001);
    const scale = TARGET_HEIGHT / height;

    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -boneBox.min.y * scale, -center.z * scale);
    model.updateMatrixWorld(true);
  }

  private adaptExternalClip(clip: AnimationClip): AnimationClip {
    if (!this.hipsRest) return clip;
    return pinHipsToRest(clip, this.hipsRest);
  }

  private clearGhosts(): void {
    for (const ghost of this.ghosts) {
      ghost.removeFromParent();
      const mat = ghost.material;
      if (mat && !Array.isArray(mat)) mat.dispose();
    }
    this.ghosts.length = 0;
  }

  private buildGhosts(model: Object3D): void {
    this.clearGhosts();
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (mesh.name === GHOST_NAME) return;

      const mat = new MeshBasicMaterial({
        color: 0x7ec8ff,
        transparent: true,
        opacity: 0.42,
        depthTest: false,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      });

      let ghost: Mesh;
      if ((mesh as SkinnedMesh).isSkinnedMesh) {
        const skinned = mesh as SkinnedMesh;
        const s = new SkinnedMesh(skinned.geometry, mat);
        s.bind(skinned.skeleton, skinned.bindMatrix);
        s.bindMode = skinned.bindMode;
        s.frustumCulled = false;
        ghost = s;
      } else {
        ghost = new Mesh(mesh.geometry, mat);
      }

      ghost.name = GHOST_NAME;
      ghost.renderOrder = 30;
      ghost.visible = false;
      ghost.castShadow = false;
      ghost.receiveShadow = false;
      ghost.position.copy(mesh.position);
      ghost.quaternion.copy(mesh.quaternion);
      ghost.scale.copy(mesh.scale);
      const parent = mesh.parent ?? model;
      parent.add(ghost);
      this.ghosts.push(ghost);
    });
  }

  private hardenMaterials(model: Object3D, atlas: Texture | null): void {
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || mesh.name === GHOST_NAME) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const current = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const mats = this.originalMaterials.get(mesh) ?? current as MeshStandardMaterial[];
      if (!this.originalMaterials.has(mesh)) this.originalMaterials.set(mesh, mats);
      const next: MeshStandardMaterial[] = [];
      for (const mat of mats) {
        if (!mat) continue;
        const src = mat as MeshStandardMaterial;
        const std = makePaintedCharacterMaterial(src, atlas);
        if (src.map) std.userData.originalAtlas = src.map;
        std.side = DoubleSide;
        if (std.map) {
          std.map.colorSpace = "srgb";
          std.map.needsUpdate = true;
        }
        next.push(std);
      }
      if (current !== mats) for (const mat of current) mat?.dispose();
      mesh.material = next.length === 1 ? next[0]! : next;
      if ((mesh as SkinnedMesh).isSkinnedMesh) {
        (mesh as SkinnedMesh).frustumCulled = false;
      }
    });
  }

  private disposeObject(root: Object3D): void {
    root.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name === GHOST_NAME) {
        const mat = mesh.material;
        if (mat && !Array.isArray(mat)) mat.dispose();
        return;
      }
      mesh.geometry?.dispose();
      for (const original of this.originalMaterials.get(mesh) ?? []) original.dispose();
      this.originalMaterials.delete(mesh);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const std = mat as MeshStandardMaterial;
        if (!std.map?.userData.paintedAtlas) std.map?.dispose();
        (std.userData.originalAtlas as Texture | undefined)?.dispose();
        std.dispose();
      }
    });
  }

  private async bindIdleForWeapon(
    set: WeaponSetId,
    weaponToken?: number,
    loadToken?: number,
  ): Promise<void> {
    const want = idleClipForWeapon(set);
    if (want === this.idleClip && this.actions.has("idle")) return;
    try {
      await this.bindIdleClip(want, weaponToken, loadToken);
    } catch {
      if (
        (weaponToken !== undefined && weaponToken !== this.weaponSetGen) ||
        (loadToken !== undefined && loadToken !== this.loadGen)
      ) {
        return;
      }
      if (want === "class") return;
      await this.bindIdleClip("class", weaponToken, loadToken);
    }
  }

  private async bindIdleClip(
    clipId: WeaponIdleId,
    weaponToken?: number,
    loadToken?: number,
  ): Promise<void> {
    if (!this.mixer) return;
    const gen = ++this.idleBindGen;
    let next: AnimationClip | null = null;
    if (clipId === "class") {
      next = this.classIdleClip;
    } else {
      const gltf = await this.loader.loadAsync(idleAnimUrl(clipId));
      if (
        !this.mixer ||
        gen !== this.idleBindGen ||
        (weaponToken !== undefined && weaponToken !== this.weaponSetGen) ||
        (loadToken !== undefined && loadToken !== this.loadGen)
      ) {
        this.disposeObject(gltf.scene);
        return;
      }
      const raw = gltf.animations[0] ?? null;
      this.disposeObject(gltf.scene);
      if (!raw) throw new Error("idle clip missing");
      next = this.adaptExternalClip(raw);
    }
    if (
      !next ||
      !this.mixer ||
      gen !== this.idleBindGen ||
      (weaponToken !== undefined && weaponToken !== this.weaponSetGen) ||
      (loadToken !== undefined && loadToken !== this.loadGen)
    ) {
      return;
    }
    const prev = this.actions.get("idle");
    const wasIdle = this.current === "idle";
    if (prev) {
      const prevClip = prev.getClip();
      prev.stop();
      if (prevClip !== this.classIdleClip) this.mixer.uncacheClip(prevClip);
    }
    next.name = "idle";
    this.idleClip = clipId;
    this.actions.set("idle", this.mixer.clipAction(next));
    if (wasIdle || this.current === "") this.play("idle", true);
  }

  private async bindAttackClipSafe(
    clipId: HumanAttackClip,
    weaponToken?: number,
    loadToken?: number,
  ): Promise<void> {
    try {
      await this.bindAttackClip(clipId, weaponToken, loadToken);
    } catch {
      if (
        (weaponToken !== undefined && weaponToken !== this.weaponSetGen) ||
        (loadToken !== undefined && loadToken !== this.loadGen)
      ) {
        return;
      }
      if (clipId === "attack") return;
      this.attackClip = "attack";
      await this.bindAttackClip("attack", weaponToken, loadToken);
    }
  }

  private async bindAttackClip(
    clipId: HumanAttackClip,
    weaponToken?: number,
    loadToken?: number,
  ): Promise<void> {
    if (!this.mixer) return;
    const gen = ++this.attackBindGen;
    const gltf = await this.loader.loadAsync(humanAnimUrl(clipId));
    if (
      !this.mixer ||
      gen !== this.attackBindGen ||
      (weaponToken !== undefined && weaponToken !== this.weaponSetGen) ||
      (loadToken !== undefined && loadToken !== this.loadGen)
    ) {
      this.disposeObject(gltf.scene);
      return;
    }
    const raw = gltf.animations[0] ?? null;
    this.disposeObject(gltf.scene);
    if (!raw) throw new Error("attack clip missing");
    const clip = this.adaptExternalClip(raw);
    if (
      !this.mixer ||
      gen !== this.attackBindGen ||
      (weaponToken !== undefined && weaponToken !== this.weaponSetGen) ||
      (loadToken !== undefined && loadToken !== this.loadGen)
    ) {
      return;
    }
    const prev = this.actions.get("attack");
    if (prev) {
      prev.stop();
      this.mixer.uncacheClip(prev.getClip());
    }
    clip.name = "attack";
    this.attackClip = clipId;
    this.actions.set("attack", this.mixer.clipAction(clip));
    if (this.current === "attack") this.play("attack", false);
  }

  private syncRunTimeScale(): void {
    const action = this.actions.get("run");
    if (!action) return;
    action.setEffectiveTimeScale(
      MathUtils.clamp(this.moveSpeed / RUN_REF_SPEED, 0.75, 1.85),
    );
  }

  private playOneShot(name: PlayerAnim, attackSpeedMul?: number): void {
    if (!this.ready || (this.dead && name !== "death")) return;
    const action = this.actions.get(name);
    if (!action) return;
    if (name === "attack" || name === "cast") {
      const cap = name === "cast"
        ? COMBAT_BALANCE.skillCastAnimSpeedMax
        : COMBAT_BALANCE.attackAnimSpeedMax;
      const floor = COMBAT_BALANCE.basicAttackSpeedFloor;
      const scale = attackSpeedMul != null
        ? Math.min(cap, Math.max(floor, attackSpeedMul))
        : 1;
      action.setEffectiveTimeScale(scale);
    }
    this.play(name, false);
    const clip = action.getClip();
    const durationMs = Math.max(0.2, clip.duration / Math.max(action.timeScale, 0.01)) * 1000;
    this.busyUntil = performance.now() + durationMs * 0.92;
  }

  private play(name: PlayerAnim, loop: boolean): void {
    const next = this.actions.get(name);
    if (!next || !this.mixer) return;
    const prevName = this.current;
    const prev = prevName ? this.actions.get(prevName) : undefined;
    next.reset();
    next.setLoop(loop && !ONE_SHOT.has(name) ? LoopRepeat : LoopOnce, Infinity);
    next.clampWhenFinished = ONE_SHOT.has(name);
    next.enabled = true;
    if (name === "run") this.syncRunTimeScale();
    if (prev && prev !== next) {
      next.crossFadeFrom(prev, 0.18, false);
    } else {
      next.fadeIn(0.12);
    }
    next.play();
    this.current = name;
  }
}

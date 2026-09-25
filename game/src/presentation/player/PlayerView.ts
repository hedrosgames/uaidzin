import {
  AnimationAction,
  AnimationMixer,
  Bone,
  Box3,
  DoubleSide,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SkinnedMesh,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  attackClipForWeapon,
  humanAnimUrl,
  humanCombatUrl,
  type HumanAttackClip,
} from "./PlayerAnimCatalog";
import { ArmorAura } from "./ArmorAura";
import { WeaponRig, type WeaponSetId } from "./WeaponRig";

const GHOST_NAME = "PlayerOcclusionGhost";

export type PlayerAnim =
  | "idle"
  | "run"
  | "attack"
  | "cast"
  | "hit_gut"
  | "hit_right"
  | "death";

export type PlayerClassId = "TK" | "FM" | "BM" | "HT";

const CLASS_MODEL: Record<PlayerClassId, string> = {
  TK: "/models/player/TK/TK.glb",
  FM: "/models/player/FM/FM.glb",
  BM: "/models/player/BM/BM.glb",
  HT: "/models/player/HT/HT.glb",
};

const CLASS_WEAPON_SET: Record<PlayerClassId, WeaponSetId> = {
  TK: "axe-shield",
  FM: "greatstaff",
  BM: "dual-gloves",
  HT: "dual-sword",
};

const WEAPON_ATTACK_ANIM: Record<WeaponSetId, Extract<PlayerAnim, "attack" | "cast">> = {
  "dual-axe": "attack",
  "axe-shield": "attack",
  "sword-shield": "attack",
  "dual-sword": "attack",
  greatsword: "attack",
  "dual-gloves": "attack",
  "staff-shield": "cast",
  greatstaff: "cast",
  bow: "cast",
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

export function isPlayerClassId(id: string): id is PlayerClassId {
  return id === "TK" || id === "FM" || id === "BM" || id === "HT";
}

export class PlayerView {
  readonly root = new Group();
  private readonly loader = new GLTFLoader();
  private mixer: AnimationMixer | null = null;
  private readonly actions = new Map<PlayerAnim, AnimationAction>();
  private model: Object3D | null = null;
  private current: PlayerAnim | "" = "";
  private busyUntil = 0;
  private dead = false;
  private hitFlip = false;
  private moving = false;
  private classId: PlayerClassId = "TK";
  private readonly armorAura = new ArmorAura();
  private readonly ghosts: Mesh[] = [];
  private readonly weaponRig = new WeaponRig();
  private weaponSet: WeaponSetId | null = null;
  private attackClip: HumanAttackClip = "attack";
  private attackBindGen = 0;
  ready = false;

  constructor() {
    this.root.name = "PlayerRoot";
  }

  async load(classId: string = "TK"): Promise<void> {
    const id: PlayerClassId = isPlayerClassId(classId) ? classId : "TK";
    this.classId = id;
    this.ready = false;
    this.dead = false;
    this.current = "";
    this.busyUntil = 0;
    this.actions.clear();
    this.mixer = null;
    this.clearGhosts();

    const base = await this.loader.loadAsync(CLASS_MODEL[id]);
    const model = base.scene;
    model.name = id;
    this.hardenMaterials(model);

    if (this.model) {
      this.disposeObject(this.model);
      this.root.remove(this.model);
    }
    this.model = model;
    this.root.add(model);

    this.mixer = new AnimationMixer(model);

    const idleClip = base.animations[0];
    if (idleClip) {
      idleClip.name = "idle";
      this.actions.set("idle", this.mixer.clipAction(idleClip));
    }

    this.attackClip = attackClipForWeapon(this.weaponSet ?? CLASS_WEAPON_SET[id]);
    await this.bindAttackClipSafe(this.attackClip);

    const entries = Object.entries(FIXED_ANIM_URLS) as Array<
      [Exclude<PlayerAnim, "idle" | "attack">, string]
    >;
    const loaded = await Promise.all(
      entries.map(async ([name, url]) => {
        const gltf = await this.loader.loadAsync(url);
        const clip = gltf.animations[0] ?? null;
        this.disposeObject(gltf.scene);
        return [name, clip] as const;
      }),
    );

    for (const [name, clip] of loaded) {
      if (!clip || !this.mixer) continue;
      clip.name = name;
      this.actions.set(name, this.mixer.clipAction(clip));
    }

    this.play("idle", true);
    for (let i = 0; i < 20; i++) this.mixer.update(1 / 30);
    this.fitStandingHeight(model);
    this.buildGhosts(model);
    this.weaponRig.bindModel(model);
    await this.weaponRig.equip(this.root, this.weaponSet ?? CLASS_WEAPON_SET[id]);
    this.armorAura.apply(this.weaponRig.getVisualRoots());
    this.ready = true;
  }

  async setWeaponSet(set: WeaponSetId): Promise<void> {
    this.weaponSet = set;
    if (!this.model) return;
    const nextAttack = attackClipForWeapon(set);
    if (nextAttack !== this.attackClip) {
      this.attackClip = nextAttack;
      await this.bindAttackClipSafe(nextAttack);
    }
    await this.weaponRig.equip(this.root, set);
    this.armorAura.apply(this.weaponRig.getVisualRoots());
  }

  getWeaponSet(): WeaponSetId | null {
    return this.weaponRig.getSet();
  }

  setArmorAuraEnabled(on: boolean): void {
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

  setPose(x: number, z: number, facing: number, moving: boolean): void {
    this.root.position.set(x, 0, z);
    this.root.rotation.set(0, facing, 0);
    this.moving = moving;
    if (!this.ready || this.dead) return;
    if (performance.now() < this.busyUntil) return;
    const want: PlayerAnim = moving ? "run" : "idle";
    if (this.current !== want) this.play(want, true);
  }

  playAttack(): void {
    const set = this.weaponRig.getSet() ?? this.weaponSet ?? CLASS_WEAPON_SET[this.classId];
    this.playOneShot(WEAPON_ATTACK_ANIM[set]);
  }

  playCast(): void {
    this.playOneShot("cast");
  }

  playHit(): void {
    this.hitFlip = !this.hitFlip;
    this.playOneShot(this.hitFlip ? "hit_gut" : "hit_right");
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
    const death = this.actions.get("death");
    if (death) {
      death.fadeOut(0.05);
      death.stop();
      death.reset();
      death.weight = 0;
    }
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
    if (this.mixer) {
      for (let i = 0; i < 10; i++) this.mixer.update(1 / 30);
    }
    model.updateMatrixWorld(true);

    const boneBox = new Box3();
    const tip = new Vector3();
    let found = false;
    model.traverse((obj) => {
      if (!(obj as Bone).isBone) return;
      obj.getWorldPosition(tip);
      if (!found) {
        boneBox.set(tip.clone(), tip.clone());
        found = true;
      } else {
        boneBox.expandByPoint(tip);
      }
    });
    if (!found) boneBox.setFromObject(model);

    const height = Math.max(boneBox.max.y - boneBox.min.y, 0.001);
    const scale = TARGET_HEIGHT / height;
    model.scale.setScalar(scale);
    model.position.y = -boneBox.min.y * scale;
    model.updateMatrixWorld(true);
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

  private hardenMaterials(model: Object3D): void {
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const next: MeshStandardMaterial[] = [];
      for (const mat of mats) {
        if (!mat) continue;
        const src = mat as MeshStandardMaterial;
        const std = new MeshStandardMaterial({
          map: src.map ?? null,
          color: src.color?.clone?.() ?? 0xffffff,
          normalMap: src.normalMap ?? null,
          roughnessMap: "roughnessMap" in src ? src.roughnessMap : null,
          aoMap: src.aoMap ?? null,
          side: DoubleSide,
          transparent: false,
          opacity: 1,
          depthWrite: true,
          metalness: 0,
          roughness: 0.75,
        });
        if (std.map) {
          std.map.colorSpace = "srgb";
          std.map.needsUpdate = true;
        }
        src.dispose();
        next.push(std);
      }
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
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const std = mat as MeshStandardMaterial;
        std.map?.dispose();
        std.dispose();
      }
    });
  }

  private async bindAttackClipSafe(clipId: HumanAttackClip): Promise<void> {
    try {
      await this.bindAttackClip(clipId);
    } catch {
      if (clipId === "attack") return;
      this.attackClip = "attack";
      await this.bindAttackClip("attack");
    }
  }

  private async bindAttackClip(clipId: HumanAttackClip): Promise<void> {
    if (!this.mixer) return;
    const gen = ++this.attackBindGen;
    const gltf = await this.loader.loadAsync(humanAnimUrl(clipId));
    if (!this.mixer || gen !== this.attackBindGen) {
      this.disposeObject(gltf.scene);
      return;
    }
    const clip = gltf.animations[0] ?? null;
    this.disposeObject(gltf.scene);
    if (!clip) throw new Error("attack clip missing");
    const prev = this.actions.get("attack");
    if (prev) {
      prev.stop();
      this.mixer.uncacheClip(prev.getClip());
    }
    clip.name = "attack";
    this.actions.set("attack", this.mixer.clipAction(clip));
    if (this.current === "attack") this.play("attack", false);
  }

  private playOneShot(name: PlayerAnim): void {
    if (!this.ready || (this.dead && name !== "death")) return;
    const action = this.actions.get(name);
    if (!action) return;
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
    if (prev && prev !== next) {
      next.crossFadeFrom(prev, 0.15, false);
    } else {
      next.fadeIn(0.1);
    }
    next.play();
    this.current = name;
  }
}

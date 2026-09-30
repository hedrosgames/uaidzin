import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  CapsuleGeometry,
  Color,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SkinnedMesh,
  Vector3,
  VectorKeyframeTrack,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { EnemyArchetype } from "../../data/balance/combat";
import type { EnemyModel } from "../../domain/enemies/EnemyModel";
import type { EnemyService } from "../../domain/enemies/EnemyService";
import type { EffectManager } from "../effects/EffectManager";
import { makePaintedCharacterMaterial } from "../rendering/PaintedCharacter";

const ENEMY_BASE_HEIGHT = 1.72;
const WOLF_BASE_HEIGHT = 1.05;

const DEFAULT_COLORS: Record<EnemyArchetype, number> = {
  fixed: 0xc45c26,
  chaser: 0xe23b3b,
  ranged: 0xc45cff,
};

const DEFAULT_MODELS: Record<EnemyArchetype, string> = {
  fixed: "/models/enemies/skeleton-normal.glb",
  chaser: "/models/enemies/skeleton-normal.glb",
  ranged: "/models/enemies/skeleton-special.glb",
};

const gltfLoader = new GLTFLoader();

export interface ModelPrototype {
  root: Object3D;
  animations: AnimationClip[];
}

const modelPrototypes = new Map<string, Promise<ModelPrototype>>();

function loadModelPrototype(url: string): Promise<ModelPrototype> {
  const existing = modelPrototypes.get(url);
  if (existing) return existing;

  const promise = new Promise<ModelPrototype>((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((obj) => {
          const m = obj as Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
            m.userData.occlusionIgnore = true;
          }
        });
        resolve({ root, animations: gltf.animations || [] });
      },
      undefined,
      (err) => {
        modelPrototypes.delete(url);
        reject(err);
      },
    );
  }).catch((err) => {
    modelPrototypes.delete(url);
    throw err;
  });

  modelPrototypes.set(url, promise);
  return promise;
}

export const SHARED_CLIP_URLS = {
  run: "/models/player/shared/anims/run.glb",
  cast: "/models/player/shared/anims/cast.glb",
  hit_gut: "/models/player/shared/anims/hit_gut.glb",
  hit_right: "/models/player/shared/anims/hit_right.glb",
  death: "/models/player/shared/anims/death.glb",
  idle_2h: "/models/anims/human/idle_2h.glb",
  attack_swipe: "/models/anims/human/attack_swipe.glb",
  mutant_idle: "/models/anims/mutant/idle.glb",
  mutant_run: "/models/anims/mutant/run.glb",
  mutant_attack: "/models/anims/mutant/attack.glb",
  mutant_death: "/models/anims/mutant/death.glb",
};

const HELD_WEAPONS: Record<string, { url: string; x: number; y: number; z: number; tilt: number; scale: number; grip: number }> = {
  caveira_campo: { url: "/models/enemies/skeleton-axe.glb", x: -0.33, y: 0.29, z: 0.03, tilt: 0.3, scale: 0.42, grip: 0.3 },
};

const heldWeaponPrototypes = new Map<string, Promise<Object3D | null>>();

function releaseClonedModel(root: Object3D, ownedMaterials: boolean): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !ownedMaterials || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) mat?.dispose();
  });
  root.removeFromParent();
}

function attachHeldWeapon(monsterId: string | undefined, model: Object3D): void {
  const spec = monsterId ? HELD_WEAPONS[monsterId] : undefined;
  if (!spec) return;
  let pending = heldWeaponPrototypes.get(spec.url);
  if (!pending) {
    pending = gltfLoader.loadAsync(spec.url).then((gltf) => gltf.scene).catch(() => null);
    heldWeaponPrototypes.set(spec.url, pending);
  }
  void pending.then((proto) => {
    if (!proto) return;
    const pivot = new Group();
    pivot.name = "held-weapon";
    pivot.position.set(spec.x, spec.y, spec.z);
    pivot.rotation.x = spec.tilt;
    pivot.scale.setScalar(spec.scale);
    const weapon = proto.clone(true);
    weapon.position.y = -spec.grip;
    weapon.traverse((obj) => {
      const m = obj as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.userData.occlusionIgnore = true;
    });
    pivot.add(weapon);
    model.add(pivot);
  });
}

const sharedClips = new Map<string, Promise<AnimationClip | null>>();

function loadSharedClip(key: keyof typeof SHARED_CLIP_URLS): Promise<AnimationClip | null> {
  const existing = sharedClips.get(key);
  if (existing) return existing;

  const url = SHARED_CLIP_URLS[key];
  const promise = new Promise<AnimationClip | null>((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const raw = gltf.animations[0] ?? null;
        resolve(raw);
      },
      undefined,
      (err) => {
        sharedClips.delete(key);
        reject(err);
      },
    );
  }).catch(() => {
    sharedClips.delete(key);
    return null;
  });

  sharedClips.set(key, promise);
  return promise;
}

export interface EnemyModelLoader {
  loadModel(url: string): Promise<ModelPrototype>;
  loadClip(key: keyof typeof SHARED_CLIP_URLS): Promise<AnimationClip | null>;
}

function hipsRestFromClip(clip: AnimationClip | null | undefined): Vector3 | null {
  if (!clip) return null;
  const track = clip.tracks.find(
    (t) => /Hips\.position$/i.test(t.name) || (t.name.includes("Hips") && t.name.endsWith(".position")),
  );
  if (!track || track.values.length < 3) return null;
  return new Vector3(track.values[0], track.values[1], track.values[2]);
}

function adaptClipTracks(
  clip: AnimationClip,
  model: Object3D,
  hipsRest?: Vector3 | null,
  external = true,
): AnimationClip {
  const nodeNames = new Set<string>();
  model.traverse((o) => {
    if (o.name) nodeNames.add(o.name);
  });

  const adaptedTracks: (typeof clip.tracks)[number][] = [];
  for (const track of clip.tracks) {
    const dotIdx = track.name.lastIndexOf(".");
    if (dotIdx === -1) {
      adaptedTracks.push(track);
      continue;
    }
    const nodeName = track.name.substring(0, dotIdx);
    const propName = track.name.substring(dotIdx);

    let resolvedName = nodeName;
    if (!nodeNames.has(nodeName)) {
      const clean = nodeName.replace(/^mixamorig[:_]?/i, "");
      if (nodeNames.has(clean)) {
        resolvedName = clean;
      } else if (nodeNames.has(`mixamorig:${clean}`)) {
        resolvedName = `mixamorig:${clean}`;
      } else if (nodeNames.has(`mixamorig${clean}`)) {
        resolvedName = `mixamorig${clean}`;
      }
    }

    if (!nodeNames.has(resolvedName)) continue;

    if (external) {
      const bone = model.getObjectByName(resolvedName) as Object3D & { isBone?: boolean };
      if (!bone?.isBone || propName === ".scale") continue;
      if (propName === ".position" && !/Hips/i.test(resolvedName)) continue;
    }

    const rest = hipsRest ?? (external ? model.getObjectByName(resolvedName)?.position : null);
    if (rest && propName === ".position" && /Hips/i.test(resolvedName)) {
      const duration = Math.max(clip.duration, 1 / 30);
      adaptedTracks.push(
        new VectorKeyframeTrack(
          resolvedName + propName,
          [0, duration],
          [rest.x, rest.y, rest.z, rest.x, rest.y, rest.z],
        ),
      );
      continue;
    }

    if (resolvedName !== nodeName) {
      const cloned = track.clone();
      cloned.name = resolvedName + propName;
      adaptedTracks.push(cloned);
    } else {
      adaptedTracks.push(track);
    }
  }

  return new AnimationClip(clip.name, clip.duration, adaptedTracks);
}

interface EnemyInstanceController {
  id: string;
  token: number;
  mesh: Mesh;
  model?: Object3D;
  mixer?: AnimationMixer;
  actions: Map<string, AnimationAction>;
  currentAnim: string;
  lastX: number;
  lastZ: number;
  isMoving: boolean;
  attackTimer: number;
  hitTimer: number;
  isDying: boolean;
  deathFinished: boolean;
  proceduralPhase: number;
  isProceduralMesh: boolean;
  baseX: number;
  baseY: number;
  baseZ: number;
  modelUrl?: string;
  standardMaterials: MeshStandardMaterial[];
  lastHpRatio: number;
  lastColor: string | number;
  lastFlashing: boolean;
  lastDying: boolean;
  play(name: "idle" | "run" | "attack" | "hit" | "death", force?: boolean): void;
  update(dt: number): void;
}

export class EnemyRuntimeView {
  private readonly group = new Group();
  private readonly meshes = new Map<string, Mesh>();
  private readonly controllers = new Map<string, EnemyInstanceController>();
  private readonly scratchColor = new Color();
  private effects: EffectManager | null = null;
  private disposed = false;
  private inflightModels = 0;
  private modelWaiters: Array<() => void> = [];

  constructor(parent: Group, private readonly loader?: EnemyModelLoader) {
    this.group.name = "enemies-view";
    this.group.userData.occlusionIgnore = true;
    parent.add(this.group);
  }

  whenModelsSettled(): Promise<void> {
    if (this.inflightModels === 0) return Promise.resolve();
    return new Promise((resolve) => this.modelWaiters.push(resolve));
  }

  private trackModel(work: Promise<void>): void {
    this.inflightModels += 1;
    void work.finally(() => {
      this.inflightModels = Math.max(0, this.inflightModels - 1);
      if (this.inflightModels > 0) return;
      const waiters = this.modelWaiters;
      this.modelWaiters = [];
      for (const wait of waiters) wait();
    });
  }

  bindEffects(effects: EffectManager): void {
    this.effects = effects;
  }

  hideAll(): void {
    for (const ctrl of this.controllers.values()) {
      ctrl.mesh.visible = false;
      if (ctrl.mixer) ctrl.mixer.stopAllAction();
    }
  }

  playAttack(id: string): void {
    const ctrl = this.controllers.get(id);
    if (!ctrl || ctrl.isDying) return;
    ctrl.attackTimer = 0.55;
    ctrl.play("attack");
  }

  playHit(id: string): void {
    const ctrl = this.controllers.get(id);
    if (!ctrl || ctrl.isDying) return;
    ctrl.hitTimer = 0.25;
    ctrl.play("hit");
  }

  playDeath(id: string): void {
    const ctrl = this.controllers.get(id);
    if (!ctrl) return;
    ctrl.isDying = true;
    ctrl.deathFinished = false;
    ctrl.play("death");
  }

  update(dt: number): void {
    for (const ctrl of this.controllers.values()) {
      ctrl.update(dt);
    }
  }

  sync(service: EnemyService, dt?: number): void {
    const aliveIds = new Set<string>();
    for (let i = 0; i < service.enemies.length; i++) {
      aliveIds.add(service.enemies[i]!.id);
    }

    for (const [id, mesh] of this.meshes) {
      if (!aliveIds.has(id) && !this.effects?.isDying(mesh)) {
        mesh.visible = false;
      }
    }

    for (const enemy of service.enemies) {
      let ctrl = this.controllers.get(enemy.id);
      let mesh = this.meshes.get(enemy.id);

      if (!ctrl || !mesh || ctrl.modelUrl !== enemy.modelUrl) {
        if (ctrl) this.destroyEnemy(enemy.id);
        mesh = this.createEnemyRepresentation(enemy);
        mesh.name = enemy.id;
        this.meshes.set(enemy.id, mesh);
        this.group.add(mesh);
        ctrl = this.controllers.get(enemy.id)!;
      }

      if (!enemy.alive) {
        if (!ctrl.isDying) {
          ctrl.isDying = true;
          ctrl.deathFinished = false;
          ctrl.play("death");
        }
      } else {
        if (ctrl.isDying) {
          ctrl.isDying = false;
          ctrl.deathFinished = false;
          ctrl.currentAnim = "";
        }
        if (ctrl.attackTimer <= 0 && ctrl.hitTimer <= 0) {
          if (ctrl.isMoving) {
            ctrl.play("run");
          } else {
            ctrl.play("idle");
          }
        }
      }

      const dying = ctrl.isDying || (this.effects?.isDying(mesh) ?? false);
      mesh.visible = enemy.alive || dying;
      if (enemy.alive && !dying && mesh.userData.baseScale) {
        mesh.scale.copy(mesh.userData.baseScale);
      }
      if (!mesh.visible) continue;

      const scale = enemy.modelScale > 0 ? enemy.modelScale : 1.0;
      const baseHeight = 0.55 * scale;
      mesh.position.set(enemy.x, baseHeight, enemy.z);
      mesh.rotation.y = enemy.facing;

      const dx = enemy.x - ctrl.lastX;
      const dz = enemy.z - ctrl.lastZ;
      ctrl.lastX = enemy.x;
      ctrl.lastZ = enemy.z;
      ctrl.isMoving = Math.hypot(dx, dz) > 0.002;

      const flashing = this.effects?.isFlashing(mesh) ?? false;
      const colorVal = enemy.color ? enemy.color : DEFAULT_COLORS[enemy.archetype];
      const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;

      if (
        ratio !== ctrl.lastHpRatio ||
        colorVal !== ctrl.lastColor ||
        flashing !== ctrl.lastFlashing ||
        dying !== ctrl.lastDying
      ) {
        ctrl.lastHpRatio = ratio;
        ctrl.lastColor = colorVal;
        ctrl.lastFlashing = flashing;
        ctrl.lastDying = dying;

        if (!flashing && !dying) {
          this.scratchColor.set(colorVal).multiplyScalar(0.15 * ratio);
          for (let i = 0; i < ctrl.standardMaterials.length; i++) {
            const std = ctrl.standardMaterials[i]!;
            if (std.emissive) {
              std.emissive.copy(this.scratchColor);
              std.emissiveIntensity = 1;
            }
          }
        }
      }
    }

    if (dt && dt > 0) {
      this.update(dt);
    }
  }

  getMesh(id: string): Mesh | undefined {
    return this.meshes.get(id);
  }

  getController(id: string): EnemyInstanceController | undefined {
    return this.controllers.get(id);
  }

  listAll(): Array<{ id: string; mesh: Mesh }> {
    return Array.from(this.meshes.entries()).map(([id, mesh]) => ({ id, mesh }));
  }

  private destroyEnemy(id: string): void {
    const ctrl = this.controllers.get(id);
    if (!ctrl) return;
    if (ctrl.mixer) {
      ctrl.mixer.stopAllAction();
      ctrl.mixer.uncacheRoot(ctrl.model ?? ctrl.mesh);
    }
    if (ctrl.model) releaseClonedModel(ctrl.model, true);
    ctrl.mesh.geometry.dispose();
    (ctrl.mesh.material as MeshStandardMaterial).dispose();
    this.group.remove(ctrl.mesh);
    this.controllers.delete(id);
    this.meshes.delete(id);
  }

  private createEnemyRepresentation(enemy: EnemyModel): Mesh {
    const scale = enemy.modelScale > 0 ? enemy.modelScale : 1.0;
    const colorHex = enemy.color ? new Color(enemy.color).getHex() : DEFAULT_COLORS[enemy.archetype];

    const placeholderMat = new MeshStandardMaterial({ color: colorHex, roughness: 0.55 });
    const placeholderMesh = new Mesh(
      new CapsuleGeometry(0.32 * scale, 0.55 * scale, 4, 10),
      placeholderMat,
    );
    placeholderMesh.position.y = 0.55 * scale;
    placeholderMesh.userData.occlusionIgnore = true;
    placeholderMesh.userData.baseScale = placeholderMesh.scale.clone();

    const ctrl: EnemyInstanceController = {
      id: enemy.id,
      token: 1,
      mesh: placeholderMesh,
      actions: new Map<string, AnimationAction>(),
      currentAnim: "",
      lastX: enemy.x,
      lastZ: enemy.z,
      isMoving: false,
      attackTimer: 0,
      hitTimer: 0,
      isDying: false,
      deathFinished: false,
      proceduralPhase: Math.random() * 6.28,
      isProceduralMesh: false,
      baseX: 0,
      baseY: -0.55 * scale,
      baseZ: 0,
      modelUrl: enemy.modelUrl,
      standardMaterials: [placeholderMat],
      lastHpRatio: -1,
      lastColor: -1,
      lastFlashing: false,
      lastDying: false,
      play(name: "idle" | "run" | "attack" | "hit" | "death", force = false): void {
        const nextAction = ctrl.actions.get(name);
        if (!force && ctrl.currentAnim === name && (name === "idle" || name === "run") && (ctrl.isProceduralMesh || nextAction?.isRunning())) return;
        if (!force && ctrl.currentAnim === "death" && name !== "death") return;

        if (nextAction && ctrl.mixer) {
          const prevAction = ctrl.currentAnim ? ctrl.actions.get(ctrl.currentAnim) : undefined;
          nextAction.reset();
          const isLoop = name === "idle" || name === "run";
          nextAction.setLoop(isLoop ? LoopRepeat : LoopOnce, isLoop ? Infinity : 1);
          nextAction.clampWhenFinished = !isLoop;
          nextAction.enabled = true;
          if (prevAction && prevAction !== nextAction && prevAction.isRunning()) {
            nextAction.crossFadeFrom(prevAction, 0.18, false);
          } else {
            nextAction.fadeIn(0.12);
          }
          nextAction.play();
        }
        ctrl.currentAnim = name;
      },
      update(dt: number): void {
        if (ctrl.mixer) {
          if (ctrl.mesh.visible && (!ctrl.isDying || !ctrl.deathFinished)) {
            ctrl.mixer.update(dt);
          }
        }

        if (ctrl.attackTimer > 0) {
          ctrl.attackTimer -= dt;
          if (ctrl.attackTimer <= 0 && ctrl.currentAnim === "attack") {
            ctrl.play(ctrl.isMoving ? "run" : "idle");
          }
        }

        if (ctrl.hitTimer > 0) {
          ctrl.hitTimer -= dt;
          if (ctrl.hitTimer <= 0 && ctrl.currentAnim === "hit") {
            ctrl.play(ctrl.isMoving ? "run" : "idle");
          }
        }

        if (ctrl.isProceduralMesh && ctrl.model) {
          ctrl.proceduralPhase += dt * (ctrl.isMoving ? 9 : 2.5);
          if (ctrl.currentAnim === "death") {
            ctrl.model.rotation.x = Math.min(Math.PI / 2, ctrl.model.rotation.x + dt * 4);
            ctrl.model.position.y = Math.max(ctrl.baseY - 0.4, ctrl.model.position.y - dt * 0.6);
            if (ctrl.model.rotation.x >= Math.PI / 2) {
              ctrl.deathFinished = true;
            }
          } else if (ctrl.currentAnim === "attack") {
            const swing = Math.sin(Math.min(1, Math.max(0, (0.55 - ctrl.attackTimer) / 0.55)) * Math.PI);
            ctrl.model.rotation.x = -swing * 0.45;
            ctrl.model.position.z = ctrl.baseZ + swing * 0.2;
          } else if (ctrl.hitTimer > 0) {
            ctrl.model.rotation.x = 0.28;
            ctrl.model.position.z = ctrl.baseZ - 0.12;
          } else if (ctrl.isMoving) {
            ctrl.model.position.y = ctrl.baseY + Math.abs(Math.sin(ctrl.proceduralPhase)) * 0.08;
            ctrl.model.rotation.z = Math.sin(ctrl.proceduralPhase * 0.5) * 0.07;
            ctrl.model.rotation.x = 0.05;
            ctrl.model.position.z = ctrl.baseZ;
          } else {
            ctrl.model.position.y = ctrl.baseY + Math.sin(ctrl.proceduralPhase) * 0.02;
            ctrl.model.rotation.z = 0;
            ctrl.model.rotation.x = 0;
            ctrl.model.position.z = ctrl.baseZ;
          }
        }
      },
    };

    this.controllers.set(enemy.id, ctrl);

    {
      const url = enemy.modelUrl?.trim() || DEFAULT_MODELS[enemy.archetype];
      const isSkeletonSpecial = url.includes("skeleton-special") || enemy.monsterId === "caveira_especial";
      const isSkeletonNormal = url.includes("skeleton-normal") || enemy.monsterId === "caveira_normal";
      const isWolf = url.includes("/wolf");
      const token = ctrl.token;

      const modelLoader = this.loader?.loadModel ?? loadModelPrototype;
      const clipLoader = this.loader?.loadClip ?? loadSharedClip;

      this.trackModel(modelLoader(url)
        .then(async (proto) => {
          const instance = SkeletonUtils.clone(proto.root);
          if (this.disposed || this.controllers.get(enemy.id) !== ctrl || ctrl.token !== token) {
            releaseClonedModel(instance, false);
            return;
          }
          const baseHeight = 0.55 * scale;
          const standing = isWolf ? await clipLoader("mutant_idle") : proto.animations[0];
          if (standing) {
            for (const track of standing.tracks) {
              const separator = track.name.lastIndexOf(".");
              const node = instance.getObjectByName(track.name.slice(0, separator));
              if (!node || !track.name.endsWith(".quaternion")) continue;
              node.quaternion.fromArray(track.values);
            }
          }
          instance.updateMatrixWorld(true);
          const rawBox = new Box3();
          instance.traverse((node) => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const skin = mesh as SkinnedMesh;
            if (skin.isSkinnedMesh) {
              skin.skeleton.update();
              skin.computeBoundingBox();
            } else mesh.geometry.computeBoundingBox();
            const bounds = skin.isSkinnedMesh ? skin.boundingBox : mesh.geometry.boundingBox;
            if (bounds) rawBox.union(bounds.clone().applyMatrix4(mesh.matrixWorld));
          });
          const rawSize = rawBox.getSize(new Vector3());
          const rawCenter = rawBox.getCenter(new Vector3());
          const targetHeight = (isWolf ? WOLF_BASE_HEIGHT : rawSize.y > 10 ? 1.8 : ENEMY_BASE_HEIGHT) * scale;
          const fitted = targetHeight / Math.max(0.001, rawSize.y);
          instance.scale.multiplyScalar(fitted);
          const posX = -rawCenter.x * fitted;
          const posY = -rawBox.min.y * fitted - baseHeight;
          const posZ = -rawCenter.z * fitted;
          instance.position.set(posX, posY, posZ);

          let hasSkinned = false;
          const stdMats: MeshStandardMaterial[] = [];
          instance.traverse((obj) => {
            const m = obj as Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
              m.userData.occlusionIgnore = true;
              if (m.material) {
                const originals = Array.isArray(m.material) ? m.material : [m.material];
                const painted = originals.map((material) =>
                  material instanceof MeshStandardMaterial && enemy.monsterId !== "caveira_campo"
                    ? makePaintedCharacterMaterial(material)
                    : material.clone());
                for (const material of painted) {
                  if (material instanceof MeshStandardMaterial) stdMats.push(material);
                }
                m.material = Array.isArray(m.material) ? painted : painted[0]!;
              }
              if ((m as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) {
                hasSkinned = true;
              }
            }
          });

          ctrl.model = instance;
          ctrl.baseX = posX;
          ctrl.baseY = posY;
          ctrl.baseZ = posZ;
          ctrl.isProceduralMesh = !hasSkinned;
          ctrl.standardMaterials = stdMats;
          attachHeldWeapon(enemy.monsterId, instance);

          const mixer = new AnimationMixer(instance);
          mixer.addEventListener("finished", (e: unknown) => {
            const ev = e as { action?: AnimationAction };
            if (ev?.action?.getClip()?.name === "death" || ctrl.currentAnim === "death") {
              ctrl.deathFinished = true;
            }
          });
          ctrl.mixer = mixer;

          let idleClip: AnimationClip | null = null;
          let runClip: AnimationClip | null = null;
          let attackClip: AnimationClip | null = null;
          let hitClip: AnimationClip | null = null;
          let deathClip: AnimationClip | null = null;
          let hipsRest: Vector3 | null = null;

          if (isSkeletonSpecial) {
            const [idleShared, rClip, aClip, hClip, dClip] = await Promise.all([
              proto.animations[0] ? Promise.resolve(null) : clipLoader("idle_2h"),
              clipLoader("run"),
              clipLoader("cast"),
              clipLoader("hit_gut"),
              clipLoader("death"),
            ]);
            idleClip = proto.animations[0] ? proto.animations[0].clone() : idleShared;
            hipsRest = hipsRestFromClip(proto.animations[0]);
            runClip = rClip;
            attackClip = aClip;
            hitClip = hClip;
            deathClip = dClip;
          } else if (isSkeletonNormal) {
            const [iClip, rClip, aClip, hClip, dClip] = await Promise.all([
              clipLoader("idle_2h"),
              clipLoader("run"),
              clipLoader("attack_swipe"),
              clipLoader("hit_right"),
              clipLoader("death"),
            ]);
            idleClip = iClip;
            runClip = rClip;
            attackClip = aClip;
            hitClip = hClip;
            deathClip = dClip;
          } else if (isWolf) {
            const [iClip, rClip, aClip, hClip, dClip] = await Promise.all([
              clipLoader("mutant_idle"),
              clipLoader("mutant_run"),
              clipLoader("mutant_attack"),
              clipLoader("hit_gut"),
              clipLoader("mutant_death"),
            ]);
            hipsRest = instance.getObjectByName("mixamorigHips")?.position.clone() ?? null;
            idleClip = iClip;
            runClip = rClip;
            attackClip = aClip;
            hitClip = hClip;
            deathClip = dClip;
          }

          if (this.disposed || this.controllers.get(enemy.id) !== ctrl || ctrl.token !== token) {
            releaseClonedModel(instance, true);
            return;
          }

          if (idleClip) {
            const embedded = isSkeletonSpecial && proto.animations.length > 0;
            const rest = hipsRest ?? instance.getObjectByName("mixamorigHips")?.position.clone();
            const adapted = adaptClipTracks(idleClip, instance, rest, !embedded);
            adapted.name = "idle";
            ctrl.actions.set("idle", mixer.clipAction(adapted));
          }
          if (runClip) {
            const adapted = adaptClipTracks(runClip, instance, hipsRest);
            adapted.name = "run";
            ctrl.actions.set("run", mixer.clipAction(adapted));
          }
          if (attackClip) {
            const adapted = adaptClipTracks(attackClip, instance, hipsRest);
            adapted.name = "attack";
            ctrl.actions.set("attack", mixer.clipAction(adapted));
          }
          if (hitClip) {
            const adapted = adaptClipTracks(hitClip, instance, hipsRest);
            adapted.name = "hit";
            ctrl.actions.set("hit", mixer.clipAction(adapted));
          }
          if (deathClip) {
            const adapted = adaptClipTracks(deathClip, instance, hipsRest);
            adapted.name = "death";
            ctrl.actions.set("death", mixer.clipAction(adapted));
          }

          placeholderMesh.add(instance);
          placeholderMat.visible = false;

          if (ctrl.isDying || !enemy.alive) {
            ctrl.play("death", true);
          } else {
            ctrl.play(ctrl.isMoving ? "run" : "idle", true);
          }
        })
        .catch(() => {
          placeholderMat.visible = true;
        }));
    }

    return placeholderMesh;
  }

  dispose(): void {
    this.disposed = true;
    for (const ctrl of this.controllers.values()) {
      ctrl.token += 1;
      if (ctrl.mixer) {
        ctrl.mixer.stopAllAction();
        ctrl.mixer.uncacheRoot(ctrl.model ?? ctrl.mesh);
      }
      if (ctrl.model) releaseClonedModel(ctrl.model, true);
      ctrl.mesh.geometry.dispose();
      (ctrl.mesh.material as MeshStandardMaterial).dispose();
      this.group.remove(ctrl.mesh);
    }
    this.controllers.clear();
    this.meshes.clear();
  }
}

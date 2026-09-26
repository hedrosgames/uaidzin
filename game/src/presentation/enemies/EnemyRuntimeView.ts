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
  Vector3,
  VectorKeyframeTrack,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { EnemyArchetype } from "../../data/balance/combat";
import type { EnemyModel } from "../../domain/enemies/EnemyModel";
import type { EnemyService } from "../../domain/enemies/EnemyService";
import type { EffectManager } from "../effects/EffectManager";

const DEFAULT_COLORS: Record<EnemyArchetype, number> = {
  fixed: 0xc45c26,
  chaser: 0xe23b3b,
  ranged: 0xc45cff,
};

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

interface ModelPrototype {
  root: Object3D;
  animations: AnimationClip[];
}

const modelPrototypes = new Map<string, Promise<ModelPrototype>>();

function loadModelPrototype(url: string): Promise<ModelPrototype> {
  const existing = modelPrototypes.get(url);
  if (existing) return existing;

  const promise = new Promise<ModelPrototype>((resolve, reject) => {
    if (url.toLowerCase().endsWith(".fbx")) {
      fbxLoader.load(
        url,
        (fbx) => {
          fbx.traverse((obj) => {
            const m = obj as Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
              m.userData.occlusionIgnore = true;
            }
          });
          resolve({ root: fbx, animations: fbx.animations || [] });
        },
        undefined,
        (err) => reject(err),
      );
    } else {
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
        (err) => reject(err),
      );
    }
  });

  modelPrototypes.set(url, promise);
  return promise;
}

const SHARED_CLIP_URLS = {
  run: "/models/player/shared/anims/run.glb",
  cast: "/models/player/shared/anims/cast.glb",
  hit_gut: "/models/player/shared/anims/hit_gut.glb",
  hit_right: "/models/player/shared/anims/hit_right.glb",
  death: "/models/player/shared/anims/death.glb",
  idle_2h: "/models/anims/human/idle_2h.glb",
  attack_swipe: "/models/anims/human/attack_swipe.glb",
};

const sharedClips = new Map<string, Promise<AnimationClip | null>>();

function loadSharedClip(key: keyof typeof SHARED_CLIP_URLS): Promise<AnimationClip | null> {
  const existing = sharedClips.get(key);
  if (existing) return existing;

  const url = SHARED_CLIP_URLS[key];
  const promise = new Promise<AnimationClip | null>((resolve) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const raw = gltf.animations[0] ?? null;
        resolve(raw);
      },
      undefined,
      () => resolve(null),
    );
  });

  sharedClips.set(key, promise);
  return promise;
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

    if (hipsRest && propName === ".position" && /Hips/i.test(resolvedName)) {
      const duration = Math.max(clip.duration, 1 / 30);
      adaptedTracks.push(
        new VectorKeyframeTrack(
          resolvedName + propName,
          [0, duration],
          [hipsRest.x, hipsRest.y, hipsRest.z, hipsRest.x, hipsRest.y, hipsRest.z],
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
  proceduralPhase: number;
  isProceduralMesh: boolean;
  baseX: number;
  baseY: number;
  baseZ: number;
  play(name: "idle" | "run" | "attack" | "hit" | "death", force?: boolean): void;
  update(dt: number): void;
}

export class EnemyRuntimeView {
  private readonly group = new Group();
  private readonly meshes = new Map<string, Mesh>();
  private readonly controllers = new Map<string, EnemyInstanceController>();
  private effects: EffectManager | null = null;

  constructor(parent: Group) {
    this.group.name = "enemies-view";
    this.group.userData.occlusionIgnore = true;
    parent.add(this.group);
  }

  bindEffects(effects: EffectManager): void {
    this.effects = effects;
  }

  hideAll(): void {
    for (const mesh of this.meshes.values()) {
      mesh.visible = false;
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
    ctrl.play("death");
  }

  update(dt: number): void {
    for (const ctrl of this.controllers.values()) {
      ctrl.update(dt);
    }
  }

  sync(service: EnemyService, dt?: number): void {
    const aliveIds = new Set(service.enemies.map((e) => e.id));

    for (const [id, mesh] of this.meshes) {
      if (!aliveIds.has(id) && !this.effects?.isDying(mesh)) {
        mesh.visible = false;
      }
    }

    for (const enemy of service.enemies) {
      let ctrl = this.controllers.get(enemy.id);
      let mesh = this.meshes.get(enemy.id);

      if (!ctrl || !mesh) {
        mesh = this.createEnemyRepresentation(enemy);
        mesh.name = enemy.id;
        this.meshes.set(enemy.id, mesh);
        this.group.add(mesh);
        ctrl = this.controllers.get(enemy.id)!;
      }

      const dying = this.effects?.isDying(mesh) ?? false;
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

      if (!enemy.alive) {
        if (!ctrl.isDying) {
          ctrl.isDying = true;
          ctrl.play("death");
        }
      } else {
        if (ctrl.isDying) {
          ctrl.isDying = false;
        }
        if (ctrl.attackTimer <= 0 && ctrl.hitTimer <= 0) {
          if (ctrl.isMoving) {
            ctrl.play("run");
          } else {
            ctrl.play("idle");
          }
        }
      }

      const flashing = this.effects?.isFlashing(mesh) ?? false;
      if (!flashing && !dying) {
        const colorVal = enemy.color ? new Color(enemy.color) : new Color(DEFAULT_COLORS[enemy.archetype]);
        const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        const emissiveColor = colorVal.clone().multiplyScalar(0.15 * ratio);

        mesh.traverse((obj) => {
          if (obj === mesh) return;
          const m = obj as Mesh;
          if (m.isMesh && m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) {
              const std = mat as MeshStandardMaterial;
              if (std.emissive) {
                std.emissive.copy(emissiveColor);
                std.emissiveIntensity = 1;
              }
            }
          }
        });
      }
    }

    if (dt && dt > 0) {
      this.update(dt);
    }
  }

  getMesh(id: string): Mesh | undefined {
    return this.meshes.get(id);
  }

  listAll(): Array<{ id: string; mesh: Mesh }> {
    return Array.from(this.meshes.entries()).map(([id, mesh]) => ({ id, mesh }));
  }

  private createEnemyRepresentation(enemy: EnemyModel): Mesh {
    const scale = enemy.modelScale > 0 ? enemy.modelScale : 1.0;
    const colorHex = enemy.color ? new Color(enemy.color).getHex() : DEFAULT_COLORS[enemy.archetype];

    const placeholderMesh = new Mesh(
      new CapsuleGeometry(0.32 * scale, 0.55 * scale, 4, 10),
      new MeshStandardMaterial({ color: colorHex, roughness: 0.55 }),
    );
    placeholderMesh.position.y = 0.55 * scale;
    placeholderMesh.userData.occlusionIgnore = true;
    placeholderMesh.userData.baseScale = placeholderMesh.scale.clone();

    const ctrl: EnemyInstanceController = {
      id: enemy.id,
      mesh: placeholderMesh,
      actions: new Map<string, AnimationAction>(),
      currentAnim: "",
      lastX: enemy.x,
      lastZ: enemy.z,
      isMoving: false,
      attackTimer: 0,
      hitTimer: 0,
      isDying: false,
      proceduralPhase: Math.random() * 6.28,
      isProceduralMesh: false,
      baseX: 0,
      baseY: -0.55 * scale,
      baseZ: 0,
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
          ctrl.mixer.update(dt);
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

    if (enemy.modelUrl && enemy.modelUrl.trim().length > 0) {
      const url = enemy.modelUrl;
      const isSkeletonSpecial = url.includes("skeleton-special") || enemy.monsterId === "caveira_especial";
      const isSkeletonNormal = url.includes("skeleton-normal") || enemy.monsterId === "caveira_normal";

      loadModelPrototype(url)
        .then(async (proto) => {
          const instance = SkeletonUtils.clone(proto.root);
          const baseHeight = 0.55 * scale;
          const rawBox = new Box3().setFromObject(instance);
          const rawSize = rawBox.getSize(new Vector3());
          const rawCenter = rawBox.getCenter(new Vector3());
          const targetHeight = (rawSize.y > 10 ? 1.8 : 1.72) * scale;
          const s = targetHeight / Math.max(0.001, rawSize.y);
          instance.scale.setScalar(s);
          const posX = -rawCenter.x * s;
          const posY = -rawBox.min.y * s - baseHeight;
          const posZ = -rawCenter.z * s;
          instance.position.set(posX, posY, posZ);

          let hasSkinned = false;
          instance.traverse((obj) => {
            const m = obj as Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
              m.userData.occlusionIgnore = true;
              if (m.material) {
                if (Array.isArray(m.material)) {
                  m.material = m.material.map((mat) => mat.clone());
                } else {
                  m.material = m.material.clone();
                }
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

          const mixer = new AnimationMixer(instance);
          ctrl.mixer = mixer;

          let idleClip: AnimationClip | null = null;
          let runClip: AnimationClip | null = null;
          let attackClip: AnimationClip | null = null;
          let hitClip: AnimationClip | null = null;
          let deathClip: AnimationClip | null = null;
          let hipsRest: Vector3 | null = null;

          if (isSkeletonSpecial) {
            idleClip = proto.animations[0] ? proto.animations[0].clone() : null;
            hipsRest = hipsRestFromClip(proto.animations[0]);
            if (!idleClip) {
              idleClip = await loadSharedClip("idle_2h");
            }
            runClip = await loadSharedClip("run");
            attackClip = await loadSharedClip("cast");
            hitClip = await loadSharedClip("hit_gut");
            deathClip = await loadSharedClip("death");
          } else if (isSkeletonNormal) {
            idleClip = await loadSharedClip("idle_2h");
            runClip = await loadSharedClip("run");
            attackClip = await loadSharedClip("attack_swipe");
            hitClip = await loadSharedClip("hit_right");
            deathClip = await loadSharedClip("death");
          }

          if (idleClip) {
            const adapted = adaptClipTracks(idleClip, instance);
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
          const mat = placeholderMesh.material as MeshStandardMaterial;
          mat.opacity = 0;
          mat.transparent = true;
          mat.depthWrite = false;
          ctrl.play(ctrl.isMoving ? "run" : "idle", true);
        })
        .catch(() => {
          placeholderMesh.visible = true;
        });
    }

    return placeholderMesh;
  }

  dispose(): void {
    for (const ctrl of this.controllers.values()) {
      if (ctrl.mixer) {
        ctrl.mixer.stopAllAction();
        ctrl.mixer.uncacheRoot(ctrl.model ?? ctrl.mesh);
      }
      if (ctrl.model) {
        ctrl.model.traverse((obj) => {
          const m = obj as Mesh;
          if (m.isMesh && m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) mat.dispose();
          }
        });
      }
      ctrl.mesh.geometry.dispose();
      (ctrl.mesh.material as MeshStandardMaterial).dispose();
      this.group.remove(ctrl.mesh);
    }
    this.controllers.clear();
    this.meshes.clear();
  }
}

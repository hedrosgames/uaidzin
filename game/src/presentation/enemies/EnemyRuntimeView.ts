import {
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
const gltfPrototypes = new Map<string, Promise<Object3D>>();

function loadModelPrototype(url: string): Promise<Object3D> {
  const existing = gltfPrototypes.get(url);
  if (existing) return existing;

  const promise = new Promise<Object3D>((resolve, reject) => {
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
        resolve(root);
      },
      undefined,
      (err) => reject(err),
    );
  });

  gltfPrototypes.set(url, promise);
  return promise;
}

export class EnemyRuntimeView {
  private readonly group = new Group();
  private readonly meshes = new Map<string, Mesh>();
  private readonly modelWrappers = new Map<string, Object3D>();
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

  sync(service: EnemyService): void {
    const aliveIds = new Set(service.enemies.map((e) => e.id));

    for (const [id, mesh] of this.meshes) {
      if (!aliveIds.has(id) && !this.effects?.isDying(mesh)) {
        mesh.visible = false;
      }
    }

    for (const enemy of service.enemies) {
      let mesh = this.meshes.get(enemy.id);
      if (!mesh) {
        mesh = this.createEnemyRepresentation(enemy);
        mesh.name = enemy.id;
        this.meshes.set(enemy.id, mesh);
        this.group.add(mesh);
      }

      const dying = this.effects?.isDying(mesh) ?? false;
      mesh.visible = enemy.alive || dying;
      if (!mesh.visible) continue;

      const scale = enemy.modelScale > 0 ? enemy.modelScale : 1.0;
      const baseHeight = 0.55 * scale;
      mesh.position.set(enemy.x, baseHeight, enemy.z);
      mesh.rotation.y = enemy.facing;

      const flashing = this.effects?.isFlashing(mesh) ?? false;
      if (!flashing && !dying) {
        const colorVal = enemy.color ? new Color(enemy.color) : new Color(DEFAULT_COLORS[enemy.archetype]);
        const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        const emissiveColor = colorVal.multiplyScalar(0.15 * ratio);

        mesh.traverse((obj) => {
          const m = obj as Mesh;
          if (m.isMesh && m.material) {
            const mat = m.material as MeshStandardMaterial;
            if (mat.emissive) {
              mat.emissive.copy(emissiveColor);
              mat.emissiveIntensity = 1;
            }
          }
        });
      }
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

    if (enemy.modelUrl && enemy.modelUrl.trim().length > 0) {
      loadModelPrototype(enemy.modelUrl)
        .then((proto) => {
          const instance = proto.clone(true);
          instance.scale.setScalar(scale);
          instance.position.set(0, -0.55 * scale, 0);
          placeholderMesh.visible = false;
          placeholderMesh.add(instance);
          placeholderMesh.visible = true;
          (placeholderMesh.material as MeshStandardMaterial).opacity = 0;
          (placeholderMesh.material as MeshStandardMaterial).transparent = true;
        })
        .catch(() => {
          placeholderMesh.visible = true;
        });
    }

    return placeholderMesh;
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
      this.group.remove(mesh);
    }
    this.meshes.clear();
    this.modelWrappers.clear();
  }
}

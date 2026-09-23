import { CapsuleGeometry, Group, Mesh, MeshStandardMaterial, Color } from "three";
import type { EnemyArchetype } from "../../data/balance/combat";
import type { EnemyService } from "../../domain/enemies/EnemyService";
import type { EffectManager } from "../effects/EffectManager";

const COLORS: Record<EnemyArchetype, number> = {
  fixed: 0xc45c26,
  chaser: 0xe23b3b,
  ranged: 0xc45cff,
};



export class EnemyRuntimeView {
  private readonly group = new Group();
  private readonly meshes = new Map<string, Mesh>();
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
        mesh = this.createMesh(enemy.archetype);
        mesh.name = enemy.id;
        this.meshes.set(enemy.id, mesh);
        this.group.add(mesh);
      }

      const dying = this.effects?.isDying(mesh) ?? false;
      mesh.visible = enemy.alive || dying;
      if (!mesh.visible) continue;

      mesh.position.set(enemy.x, 0.55, enemy.z);
      mesh.rotation.y = enemy.facing;

      const flashing = this.effects?.isFlashing(mesh) ?? false;
      if (!flashing && !dying) {
        const mat = mesh.material as MeshStandardMaterial;
        const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        mat.emissive = new Color(COLORS[enemy.archetype]).multiplyScalar(0.15 * ratio);
        mat.emissiveIntensity = 1;
      }
    }
  }

  getMesh(id: string): Mesh | undefined {
    return this.meshes.get(id);
  }

  
  listAll(): Array<{ id: string; mesh: Mesh }> {
    return Array.from(this.meshes.entries()).map(([id, mesh]) => ({ id, mesh }));
  }

  private createMesh(archetype: EnemyArchetype): Mesh {
    const mesh = new Mesh(
      new CapsuleGeometry(0.32, 0.55, 4, 10),
      new MeshStandardMaterial({ color: COLORS[archetype], roughness: 0.55 }),
    );
    mesh.position.y = 0.55;
    mesh.userData.occlusionIgnore = true;
    return mesh;
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
      this.group.remove(mesh);
    }
    this.meshes.clear();
  }
}

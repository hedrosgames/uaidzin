import { CapsuleGeometry, Mesh, MeshStandardMaterial, type Scene } from "three";
import type { SummonActor } from "../../domain/combat/SummonRuntime";

const ROLE_COLOR: Record<SummonActor["role"], number> = {
  ranged: 0x8a7048,
  melee: 0x6a8f4a,
  tank: 0x6a5a48,
  elite: 0xc45c26,
};

export class SummonView {
  private readonly meshes = new Map<string, Mesh>();

  constructor(private readonly scene: Scene) {}

  sync(actors: SummonActor[]): void {
    const live = new Set<string>();
    for (const actor of actors) {
      if (!actor.alive) continue;
      live.add(actor.uid);
      let mesh = this.meshes.get(actor.uid);
      if (!mesh) {
        mesh = new Mesh(
          new CapsuleGeometry(0.28, 0.55, 3, 6),
          new MeshStandardMaterial({ color: ROLE_COLOR[actor.role], roughness: 0.7 }),
        );
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.meshes.set(actor.uid, mesh);
      }
      mesh.position.set(actor.x, 0.7, actor.z);
      const ratio = actor.maxHp > 0 ? actor.hp / actor.maxHp : 1;
      mesh.scale.setScalar(0.75 + ratio * 0.25);
    }
    for (const [uid, mesh] of this.meshes) {
      if (live.has(uid)) continue;
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      const mat = mesh.material;
      if (!Array.isArray(mat)) mat.dispose();
      this.meshes.delete(uid);
    }
  }

  clear(): void {
    this.sync([]);
  }
}

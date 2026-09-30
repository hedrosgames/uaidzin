import { describe, expect, it } from "vitest";
import { AnimationClip, Bone, BoxGeometry, Group, Mesh, MeshStandardMaterial, VectorKeyframeTrack } from "three";
import { EnemyRuntimeView, type EnemyModelLoader } from "./EnemyRuntimeView";
import { EnemyModel } from "../../domain/enemies/EnemyModel";
import type { EnemyService } from "../../domain/enemies/EnemyService";

describe("Clipes externos de inimigos", () => {
  it("preserva as proporções e a escala quando o doador usa outra unidade", async () => {
    const root = new Group();
    root.name = "Armature";
    root.scale.setScalar(0.01);
    root.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()));
    const hips = new Bone();
    hips.name = "mixamorigHips";
    const head = new Bone();
    head.name = "mixamorigHead";
    head.position.y = 1;
    hips.add(head);
    root.add(hips);
    const clip = new AnimationClip("donor", 1, [
      new VectorKeyframeTrack("Armature.scale", [0, 1], [100, 100, 100, 100, 100, 100]),
      new VectorKeyframeTrack("mixamorigHips.position", [0, 1], [0, 100, 0, 0, 100, 0]),
      new VectorKeyframeTrack("mixamorigHead.position", [0, 1], [0, 100, 0, 0, 100, 0]),
    ]);
    const loader: EnemyModelLoader = {
      loadModel: async () => ({ root, animations: [] }),
      loadClip: async () => clip,
    };
    const view = new EnemyRuntimeView(new Group(), loader);
    const enemy = new EnemyModel({
      id: "clip", monsterId: "caveira_normal", archetype: "fixed",
      modelUrl: "/models/enemies/skeleton-normal.glb", modelScale: 1,
      x: 0, z: 0, homeX: 0, homeZ: 0, maxHp: 100, attack: 1, defense: 1,
      range: 1, attackInterval: 1, respawnSeconds: 5,
    });
    const service = { enemies: [enemy] } as unknown as EnemyService;
    view.sync(service);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const model = view.getController(enemy.id)!.model!;
    const scale = model.scale.clone();
    expect(model.scale.y).toBeCloseTo(1.72);
    view.sync(service, 0.5);
    expect(model.scale.equals(scale)).toBe(true);
    expect(model.getObjectByName("mixamorigHead")!.position.y).toBe(1);
    expect(model.getObjectByName("mixamorigHips")!.position.y).toBe(0);
    view.dispose();
  });
});

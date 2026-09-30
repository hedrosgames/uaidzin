import { describe, expect, it } from "vitest";
import { AnimationClip, BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { EnemyRuntimeView, type EnemyModelLoader, type ModelPrototype } from "./EnemyRuntimeView";
import { EnemyModel } from "../../domain/enemies/EnemyModel";
import type { EnemyService } from "../../domain/enemies/EnemyService";

function makeFakeEnemy(id: string, overrides: Partial<EnemyModel> = {}): EnemyModel {
  const model = new EnemyModel({
    id,
    monsterId: "test_mob",
    name: "Test Mob",
    archetype: "chaser",
    modelUrl: "/models/test.glb",
    modelScale: 1,
    x: 0,
    z: 0,
    homeX: 0,
    homeZ: 0,
    maxHp: 100,
    attack: 10,
    defense: 5,
    range: 1.5,
    attackInterval: 1.5,
    respawnSeconds: 5,
  });
  return Object.assign(model, overrides);
}

function makeMockLoader(): {
  loader: EnemyModelLoader;
  resolveModel: (proto: ModelPrototype) => void;
  rejectModel: (err: Error) => void;
} {
  let resolveModel!: (proto: ModelPrototype) => void;
  let rejectModel!: (err: Error) => void;
  const modelPromise = new Promise<ModelPrototype>((res, rej) => {
    resolveModel = res;
    rejectModel = rej;
  });

  const loader: EnemyModelLoader = {
    loadModel: () => modelPromise,
    loadClip: () => Promise.resolve(new AnimationClip("test", 1, [])),
  };

  return { loader, resolveModel, rejectModel };
}

describe("EnemyRuntimeView async view lifecycle", () => {
  it("anexa modelo e toca death quando o modelo chega para inimigo morto", async () => {
    const parent = new Group();
    const { loader, resolveModel } = makeMockLoader();
    const view = new EnemyRuntimeView(parent, loader);

    const enemy = makeFakeEnemy("mob_1");
    const service = { enemies: [enemy] } as unknown as EnemyService;

    view.sync(service);
    const placeholder = view.getMesh("mob_1")!;
    expect(placeholder).toBeDefined();

    view.playDeath("mob_1");
    enemy.alive = false;
    view.sync(service);

    const modelRoot = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    modelRoot.add(mesh);
    const clip = new AnimationClip("death", 1, []);

    resolveModel({ root: modelRoot, animations: [clip] });
    await new Promise((r) => setTimeout(r, 10));

    const ctrl = view.getController("mob_1");
    expect(ctrl).toBeDefined();
    expect(ctrl?.currentAnim).toBe("death");
    expect(placeholder.children.length).toBeGreaterThan(0);
    const mat = placeholder.material as MeshStandardMaterial;
    expect(mat.visible).toBe(false);
  });

  it("descarta modelo carregado apos dispose da view", async () => {
    const parent = new Group();
    const { loader, resolveModel } = makeMockLoader();
    const view = new EnemyRuntimeView(parent, loader);

    const enemy = makeFakeEnemy("mob_2");
    const service = { enemies: [enemy] } as unknown as EnemyService;
    view.sync(service);

    const placeholder = view.getMesh("mob_2")!;
    view.dispose();

    const modelRoot = new Group();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    modelRoot.add(mesh);

    resolveModel({ root: modelRoot, animations: [] });
    await new Promise((r) => setTimeout(r, 10));

    expect(placeholder.children.length).toBe(0);
  });

  it("reinicia animacao quando inimigo morto respawna", () => {
    const parent = new Group();
    const view = new EnemyRuntimeView(parent);

    const enemy = makeFakeEnemy("mob_3");
    const service = { enemies: [enemy] } as unknown as EnemyService;

    view.sync(service);
    const ctrl = view.getController("mob_3")!;
    expect(ctrl.currentAnim).toBe("idle");

    enemy.alive = false;
    view.sync(service);
    expect(ctrl.currentAnim).toBe("death");

    enemy.alive = true;
    view.sync(service);
    expect(ctrl.currentAnim).toBe("idle");
  });

  it("caveira do campo preserva o material original", async () => {
    const parent = new Group();
    const modelRoot = new Group();
    const sourceMaterial = new MeshStandardMaterial({ color: 0x8a745f });
    const sourceMesh = new Mesh(new BoxGeometry(1, 1, 1), sourceMaterial);
    modelRoot.add(sourceMesh);
    const loader: EnemyModelLoader = {
      loadModel: async () => ({ root: modelRoot, animations: [] }),
      loadClip: async () => new AnimationClip("test", 1, []),
    };
    const view = new EnemyRuntimeView(parent, loader);
    const enemy = makeFakeEnemy("campo", {
      monsterId: "caveira_campo",
      modelUrl: "/models/enemies/skeleton-normal.glb",
      color: "#8a745f",
    });
    const service = { enemies: [enemy] } as unknown as EnemyService;

    view.sync(service);
    await view.whenModelsSettled();

    const model = view.getController("campo")?.model;
    expect(model).toBeDefined();
    const mesh = model?.children.find((child) => (child as Mesh).isMesh) as Mesh | undefined;
    const material = mesh?.material as MeshStandardMaterial | undefined;
    expect(material?.userData.artProfile).not.toBe("painted-character");
    expect(material?.color.getHex()).toBe(0x8a745f);
    view.dispose();
  });
});

import { describe, expect, it } from "vitest";
import { AnimationClip, Bone, BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { PlayerView, type PlayerGltfLoader } from "./PlayerView";
import { CLASS_WEAPON_SET } from "./WeaponSetCatalog";

function makeFakeModel(): { scene: Object3D; animations: AnimationClip[] } {
  const scene = new Group();
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
  scene.add(mesh);
  const clip = new AnimationClip("idle", 1, []);
  return { scene, animations: [clip] };
}

function makeMockPlayerLoader(delayMs = 5): PlayerGltfLoader {
  return {
    loadAsync: async () => {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return makeFakeModel();
    },
  };
}

describe("PlayerView weapon set async racing", () => {
  it("load sem arma deixa as maos vazias", async () => {
    const view = new PlayerView(makeMockPlayerLoader(0));
    await view.load("TK");
    expect(view.getWeaponSet()).toBe(CLASS_WEAPON_SET.TK);
  });

  it("tres setWeaponSet rapidos: vence o ultimo", async () => {
    const loader = makeMockPlayerLoader(10);
    const view = new PlayerView(loader);
    await view.load("TK");

    const p1 = view.setWeaponSet("bow");
    const p2 = view.setWeaponSet("dual-sword");
    const p3 = view.setWeaponSet("sword-shield");

    await Promise.all([p1, p2, p3]);

    expect(view.getWeaponSet()).toBe("sword-shield");
    expect(view.getWeaponRig().currentSet).toBe("sword-shield");
  });

  it("load durante troca mantem o set pedido", async () => {
    const loader = makeMockPlayerLoader(10);
    const view = new PlayerView(loader);
    await view.load("TK");

    const pSet = view.setWeaponSet("bow");
    await view.load("TK");
    await pSet;

    expect(view.getWeaponSet()).toBe("bow");
    expect(view.getWeaponRig().currentSet).toBe("bow");
  });
});

describe("Ponto de ataque em coordenadas de mundo", () => {
  it.each(["mixamorigRightHand", "mixamorig:RightHand"])("usa a mão animada %s sem recalibrar o modelo", async name => {
    const view = new PlayerView(makeMockPlayerLoader(0));
    await view.load("TK");
    const model = view.root.getObjectByName("TK")!;
    const hand = new Bone();
    hand.name = name;
    hand.position.set(0.2, 0.6, 0.15);
    model.add(hand);
    const scale = model.scale.clone();
    view.setPose(4, -2, Math.PI / 2, false);
    const out = new Vector3();
    const expected = hand.getWorldPosition(new Vector3());
    expect(view.getAttackPoint(out)).toBe(out);
    expect(out.distanceTo(expected)).toBeLessThan(1e-8);
    hand.position.x += 0.1;
    expect(view.getAttackPoint(out).distanceTo(expected)).toBeGreaterThan(0.05);
    expect(model.scale.equals(scale)).toBe(true);
  });

  it("usa um ponto local transformado quando o modelo ainda não carregou", () => {
    const view = new PlayerView(makeMockPlayerLoader(0));
    view.setPose(4, -2, Math.PI / 2, false);
    const out = view.getAttackPoint(new Vector3());
    expect(out.x).toBeCloseTo(4.35);
    expect(out.y).toBeCloseTo(1.05);
    expect(out.z).toBeCloseTo(-2);
  });
});

describe("PlayerView transformacao de modelo", () => {
  it("ativa transformacao, remove armas e restaura base no reset", async () => {
    const view = new PlayerView(makeMockPlayerLoader(0));
    await view.load("BM");
    expect(view.getWeaponSet()).toBe(CLASS_WEAPON_SET.BM);
    expect(view.getTransformation()).toBeNull();

    await view.setTransformation("lobo");
    expect(view.getTransformation()).toBe("lobo");
    expect(view.getWeaponSet()).toBeNull();
    expect(view.root.getObjectByName("lobo")).toBeDefined();
    expect(view.root.getObjectByName("BM")).toBeUndefined();
    expect(view.playAttack()).toBe("attack");

    await view.setTransformation(null);
    expect(view.getTransformation()).toBeNull();
    expect(view.root.getObjectByName("BM")).toBeDefined();
    expect(view.root.getObjectByName("lobo")).toBeUndefined();
    expect(view.getWeaponSet()).toBe(CLASS_WEAPON_SET.BM);
  });

  it("ignora transformId invalido mantendo o estado atual", async () => {
    const view = new PlayerView(makeMockPlayerLoader(0));
    await view.load("BM");
    await view.setTransformation("invalido");
    expect(view.getTransformation()).toBeNull();
    expect(view.root.getObjectByName("BM")).toBeDefined();
  });

  it("garante depthWrite ativo nos materiais do modelo transformado", async () => {
    const loader: PlayerGltfLoader = {
      loadAsync: async () => {
        const scene = new Group();
        const mat = new MeshStandardMaterial({ transparent: true, depthWrite: false });
        const mesh = new Mesh(new BoxGeometry(1, 1, 1), mat);
        scene.add(mesh);
        return { scene, animations: [new AnimationClip("idle", 1, [])] };
      },
    };
    const view = new PlayerView(loader);
    await view.load("BM");
    await view.setTransformation("lobo");
    const loboMesh = view.root.getObjectByName("lobo")?.children.find(c => (c as Mesh).isMesh) as Mesh | undefined;
    expect(loboMesh).toBeDefined();
    const mat = loboMesh!.material as MeshStandardMaterial;
    expect(mat.depthWrite).toBe(true);
    expect(mat.depthTest).toBe(true);
  });

  it("restaura postura de morte na base ao detransformar morto", async () => {
    const view = new PlayerView(makeMockPlayerLoader(0));
    await view.load("BM");
    await view.setTransformation("urso");
    view.playDeath();
    expect(view.isDeadPose()).toBe(true);
    await view.setTransformation(null);
    expect(view.isDeadPose()).toBe(true);
    expect(view.getTransformation()).toBeNull();
  });
});

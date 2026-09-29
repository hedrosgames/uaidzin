import { describe, expect, it } from "vitest";
import { AnimationClip, BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import { PlayerView, type PlayerGltfLoader } from "./PlayerView";

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
    expect(view.getWeaponSet()).toBe("sword-shield");
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

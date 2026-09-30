import { describe, expect, it, vi } from "vitest";
import { AnimationClip, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, TextureLoader } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { armorAtlasUrl, resolveArmorAppearance } from "../../../public/boot/assets/armor-appearance.mjs";
import { PlayerView, type PlayerGltfLoader } from "./PlayerView";
import { EquipmentService } from "../../domain/items/EquipmentService";
import { InventoryService } from "../../domain/inventory/InventoryService";
import { CharacterModel } from "../../domain/character/CharacterModel";
import type { ItemInstance } from "../../domain/items/ItemModel";

describe("aparência de armadura", () => {
  it("resolve os doze peitorais e mantém ouro para item incompatível ou ausente", () => {
    for (const classId of ["TK", "FM", "BM", "HT"]) {
      for (const appearance of ["gold", "silver", "adamant"] as const) {
        const defId = `armor_chest_${classId.toLowerCase()}_${appearance}`;
        expect(resolveArmorAppearance(classId, defId)).toBe(appearance);
        expect(armorAtlasUrl(classId, appearance)).toBe(`/textures/armor-painted/${classId}/${appearance === "gold" ? "silver" : appearance}.webp`);
      }
      expect(resolveArmorAppearance(classId)).toBe("gold");
      expect(resolveArmorAppearance(classId, "armadura_leve")).toBe("gold");
    }
    expect(resolveArmorAppearance("TK", "armor_chest_fm_adamant")).toBe("gold");
  });

  it("deriva a variante do peitoral após snapshot e restauração", () => {
    const equipment = new EquipmentService(new InventoryService(), new CharacterModel({ maxHp: 100, attack: 10, defense: 5 }));
    const armor: ItemInstance = {
      uid: "armor", defId: "armor_chest_tk_adamant", name: "Peitoral", rarity: "Comum",
      slot: "armor", refine: 0, attackBonus: 0, defenseBonus: 23, stack: 1, sellValue: 1,
    };
    equipment.restoreEquipped({ armor });
    const saved = JSON.parse(JSON.stringify(equipment.snapshotEquipped()));
    equipment.restoreEquipped({});
    equipment.restoreEquipped(saved);
    expect(resolveArmorAppearance("TK", equipment.equipped.armor?.defId)).toBe("adamant");
    expect(equipment.equipped.armor).toEqual(armor);
  });

  it("troca aparência preservando modelo, rig, escala e atlas original", async () => {
    let loads = 0;
    const originalAtlas = new Texture();
    const loader: PlayerGltfLoader = {
      loadAsync: async () => {
        loads++;
        const scene = new Group();
        scene.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ map: originalAtlas })));
        return { scene, animations: [new AnimationClip("idle", 1, [])] };
      },
    };
    const view = new PlayerView(loader);
    await view.load("TK");
    const model = view.root.getObjectByName("TK")!;
    const mesh = model.children[0] as Mesh;
    const scale = model.scale.clone();
    const rig = view.getWeaponRig();
    const ghost = model.getObjectByName("PlayerOcclusionGhost") as Mesh;
    const ghostMaterial = ghost.material;
    const loadCount = loads;
    await view.setArmorAppearance("silver");
    await view.setArmorAppearance("adamant");
    expect(view.getArmorAppearance()).toBe("adamant");
    expect(view.root.getObjectByName("TK")).toBe(model);
    expect(model.scale.equals(scale)).toBe(true);
    expect(view.getWeaponRig()).toBe(rig);
    expect(ghost.material).toBe(ghostMaterial);
    expect(loads).toBe(loadCount);
    expect((mesh.material as MeshStandardMaterial).userData.originalAtlas).toBe(originalAtlas);
  });

  it("descarta a troca atrasada quando o jogador volta ao ouro", async () => {
    let finishSilver!: (texture: Texture) => void;
    const silver = new Promise<Texture>((resolve) => { finishSilver = resolve; });
    const textureSpy = vi.spyOn(TextureLoader.prototype, "loadAsync")
      .mockResolvedValueOnce(new Texture())
      .mockReturnValueOnce(silver);
    const loader = new GLTFLoader();
    const scene = new Group();
    scene.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ map: new Texture() })));
    vi.spyOn(loader, "loadAsync").mockImplementation(async () => ({
      scene: scene.clone(), animations: [new AnimationClip("idle", 1, [])],
    }) as Awaited<ReturnType<GLTFLoader["loadAsync"]>>);
    try {
      const view = new PlayerView(loader);
      await view.load("HT");
      const model = view.root.getObjectByName("HT")!;
      const mesh = model.children[0] as Mesh;
      const goldMaterial = mesh.material;
      const pending = view.setArmorAppearance("silver");
      await view.setArmorAppearance("gold");
      finishSilver(new Texture());
      await pending;
      expect(view.getArmorAppearance()).toBe("gold");
      expect(mesh.material).toBe(goldMaterial);
    } finally {
      textureSpy.mockRestore();
    }
  });
});

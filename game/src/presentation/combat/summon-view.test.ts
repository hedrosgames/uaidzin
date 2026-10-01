import { describe, expect, it, vi } from "vitest";
import { Box3, Group, InstancedMesh, Mesh, Scene, Vector3, type BufferGeometry, type Material } from "three";
import type { SummonActor } from "../../domain/combat/SummonRuntime";
import { SummonView } from "./SummonView";

const kinds = ["condor", "lobo", "urso", "tigre", "dragao"] as const;

function actor(kind: string, uid = kind): SummonActor {
  return { uid, kind, role: kind === "condor" ? "ranged" : kind === "urso" ? "tank" : kind === "dragao" ? "elite" : "melee",
    x: 0, z: 0, hp: 100, maxHp: 100, attack: 10, baseAttack: 10, baseMaxHp: 100, defense: 5, range: 2,
    interval: 1, cd: 0, splash: 0, alive: true };
}

function resources(scene: Scene): { geometries: Set<BufferGeometry>; materials: Set<Material> } {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
    else materials.add(object.material);
  });
  return { geometries, materials };
}

function hasPart(scene: Scene, name: string): boolean {
  let found = false;
  scene.traverse(object => {
    if (object.name === name || object.userData.parts?.includes(name)) found = true;
  });
  return found;
}

describe("silhuetas de invocações e recursos compartilhados", () => {
  it("distingue condor, lobo, urso, tigre e dragão sem cápsulas", () => {
    const scene = new Scene();
    const view = new SummonView(scene);
    view.sync(kinds.map(kind => actor(kind)));
    expect(scene.children).toHaveLength(5);
    const signatures = scene.children.map(root => {
      expect(root).toBeInstanceOf(Group);
      root.updateMatrixWorld(true);
      const dimensions = new Box3().setFromObject(root).getSize(new Vector3());
      return dimensions.toArray().map(value => value.toFixed(3)).join(",");
    });
    expect(new Set(signatures).size).toBe(5);
    expect(scene.getObjectByName("summon-condor-wing-1")).toBeInstanceOf(Mesh);
    expect(hasPart(scene, "summon-lobo-ear-1")).toBe(true);
    expect(hasPart(scene, "summon-urso-ear-1")).toBe(true);
    expect(hasPart(scene, "summon-tigre-stripe-1-0")).toBe(true);
    expect(hasPart(scene, "summon-dragao-horn-1")).toBe(true);
    expect(scene.getObjectByName("summon-dragao-wing-1")).toBeInstanceOf(Mesh);
    scene.traverse(object => {
      if (object instanceof Mesh) expect(object.geometry.type).not.toBe("CapsuleGeometry");
    });
    view.dispose();
  });

  it("clones do mesmo tipo compartilham materiais e geometrias", () => {
    const scene = new Scene();
    const view = new SummonView(scene);
    view.sync([actor("tigre", "primeiro"), actor("tigre", "segundo")]);
    const [first, second] = scene.children;
    expect(first).not.toBe(second);
    first.children.forEach((part, index) => {
      const left = part as Mesh;
      const right = second.children[index] as Mesh;
      expect(left.geometry).toBe(right.geometry);
      expect(left.material).toBe(right.material);
    });
    view.dispose();
  });

  it("reutiliza os mesmos recursos por 12 ciclos e libera cada recurso uma vez", () => {
    const scene = new Scene();
    const view = new SummonView(scene);
    view.sync(kinds.map(kind => actor(kind)));
    const baseline = resources(scene);
    expect(baseline.geometries.size).toBe(4);
    const disposals = [...baseline.geometries, ...baseline.materials].map(resource => vi.spyOn(resource, "dispose"));
    view.clear();
    for (let cycle = 0; cycle < 12; cycle++) {
      view.sync(kinds.map(kind => actor(kind, `${kind}-${cycle}`)));
      const current = resources(scene);
      expect(current.geometries).toEqual(baseline.geometries);
      expect(current.materials).toEqual(baseline.materials);
      scene.updateMatrixWorld(true);
      scene.traverse(object => {
        expect(object.matrixWorld.elements.every(Number.isFinite)).toBe(true);
        if (object instanceof InstancedMesh) expect([...object.instanceMatrix.array].every(Number.isFinite)).toBe(true);
      });
      view.clear();
      expect(scene.children).toHaveLength(0);
      disposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
    }
    view.dispose();
    view.dispose();
    disposals.forEach(dispose => expect(dispose).toHaveBeenCalledTimes(1));
    view.sync([actor("condor")]);
    expect(scene.children).toHaveLength(0);
  });

  it("atualiza posição e direção, limita escala por HP e remove mortos", () => {
    const scene = new Scene();
    const view = new SummonView(scene);
    const wolf = actor("lobo");
    view.sync([wolf]);
    const root = scene.children[0];
    wolf.x = 2;
    wolf.hp = 50;
    view.sync([wolf]);
    expect(scene.children[0]).toBe(root);
    expect(root.position.toArray()).toEqual([2, 0, 0]);
    expect(root.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(root.scale.x).toBeCloseTo(0.875);
    wolf.hp = -100;
    view.sync([wolf]);
    expect(root.scale.x).toBe(0.75);
    wolf.hp = Number.NaN;
    view.sync([wolf]);
    expect(root.scale.x).toBe(1);
    wolf.alive = false;
    view.sync([wolf]);
    expect(scene.children).toHaveLength(0);
    view.dispose();
  });

  it("substitui a forma quando o kind muda e ignora posição inválida", () => {
    const scene = new Scene();
    const view = new SummonView(scene);
    const creature = actor("lobo", "mesmo-uid");
    view.sync([creature]);
    const wolf = scene.children[0];
    creature.kind = "dragao";
    view.sync([creature]);
    expect(wolf.parent).toBeNull();
    expect(scene.children).toHaveLength(1);
    expect(scene.children[0].userData.summonKind).toBe("dragao");
    creature.x = Number.POSITIVE_INFINITY;
    view.sync([creature]);
    expect(scene.children).toHaveLength(0);
    view.dispose();
  });
});

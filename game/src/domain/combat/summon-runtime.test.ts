import { describe, expect, it } from "vitest";
import { BM_CONTROLE } from "../../data/classes/skills/bm";
import { SummonRuntime } from "./SummonRuntime";

function setup(id = "bm_ctrl_lobo", power = 0) {
  const summons = new SummonRuntime();
  summons.spawn(BM_CONTROLE.find(skill => skill.id === id)!.summon!, 100, 0, 0, power);
  return summons;
}

describe("invocações em combate", () => {
  it("persegue alvos fora do alcance e só ataca ao alcançar", () => {
    const summons = setup();
    const foes = [{ id: "foe", x: 10, z: 0, alive: true, defense: 0 }];
    expect(summons.tick(1, foes)).toEqual([]);
    expect(summons.actors[0].x).toBeCloseTo(2.4);
    expect(summons.tick(1, foes)).toEqual([]);
    expect(summons.tick(1, foes)).toEqual([]);
    expect(summons.tick(1, foes)[0]?.id).toBe("foe");
    expect(summons.actors[0].x).toBeCloseTo(8.47);
  });

  it("acompanha o dono sem alvo e não ultrapassa a distância de seguimento", () => {
    const summons = setup();
    summons.tick(1, [], { x: 10, z: 0 });
    expect(summons.actors[0].x).toBeCloseTo(2.4);
    summons.tick(100, [], { x: 10, z: 0 });
    expect(summons.actors[0].x).toBeCloseTo(8.6);
    summons.tick(1, [], { x: 10, z: 0 });
    expect(summons.actors[0].x).toBeCloseTo(8.6);
  });

  it("poder dinâmico aplica uma vez, preserva vida proporcional e expira", () => {
    const summons = setup();
    const actor = summons.actors[0];
    const baseAttack = actor.attack;
    const baseMaxHp = actor.maxHp;
    actor.hp = Math.round(baseMaxHp / 2);
    summons.tick(0, [], undefined, 0.35);
    expect(actor.attack).toBeCloseTo(baseAttack * 1.35);
    expect(actor.hp / actor.maxHp).toBeCloseTo(0.5, 1);
    const buffedHp = actor.hp;
    summons.tick(0, [], undefined, 0.35);
    expect(actor.attack).toBeCloseTo(baseAttack * 1.35);
    expect(actor.hp).toBe(buffedHp);
    summons.tick(0, [], undefined, 0);
    expect(actor.attack).toBe(baseAttack);
    expect(actor.maxHp).toBe(baseMaxHp);
    expect(actor.hp / actor.maxHp).toBeCloseTo(0.5, 1);
  });

  it("criatura invocada com poder não recebe o mesmo buff duas vezes", () => {
    const summons = setup("bm_ctrl_lobo", 0.35);
    const initialAttack = summons.actors[0].attack;
    summons.tick(0, [], undefined, 0.35);
    expect(summons.actors[0].attack).toBe(initialAttack);
    summons.tick(0, [], undefined, 0);
    expect(summons.actors[0].attack).toBeCloseTo(58);
  });

  it("reinvocar restaura a criatura existente e mantém um ator por tipo", () => {
    const summons = setup();
    const actor = summons.actors[0];
    actor.hp = 1;
    summons.spawn(BM_CONTROLE.find(skill => skill.id === "bm_ctrl_lobo")!.summon!, 200, 1, 2, 0);
    expect(summons.actors).toHaveLength(1);
    expect(actor.hp).toBe(actor.maxHp);
    expect(actor.attack).toBeCloseTo(116);
    expect(actor.x).toBe(1);
    expect(actor.z).toBe(2);
  });

  it("criatura morta sai da lista e não ataca", () => {
    const summons = setup();
    const actor = summons.actors[0];
    summons.damage(actor.uid, actor.maxHp, 0);
    expect(summons.tick(1, [{ id: "foe", x: 1, z: 0, alive: true, defense: 0 }])).toEqual([]);
    expect(summons.actors).toEqual([]);
  });

  it("respeita o intervalo de ataque e ignora inimigos mortos", () => {
    const summons = setup();
    const foes = [{ id: "foe", x: 1, z: 0, alive: true, defense: 0 }];
    expect(summons.tick(0.4, foes)).toHaveLength(1);
    expect(summons.tick(0.89, foes)).toHaveLength(0);
    expect(summons.tick(0.02, foes)).toHaveLength(1);
    foes[0].alive = false;
    expect(summons.tick(1, foes)).toEqual([]);
  });

  it("parede bloqueia perseguição, seguimento e ataques", () => {
    const summons = setup();
    const blocked = () => false;
    expect(summons.tick(1, [{ id: "foe", x: 1, z: 0, alive: true, defense: 0 }], undefined, undefined, blocked)).toEqual([]);
    summons.tick(1, [], { x: 10, z: 10 }, undefined, blocked);
    expect(summons.actors[0].x).toBe(0);
    expect(summons.actors[0].z).toBe(0);
  });

  it("desliza pelo eixo livre quando a diagonal encontra parede", () => {
    const summons = setup();
    summons.tick(1, [], { x: 10, z: 10 }, undefined, (_fromX, _fromZ, _toX, toZ) => toZ === 0);
    expect(summons.actors[0].x).toBeGreaterThan(0);
    expect(summons.actors[0].z).toBe(0);
  });
});

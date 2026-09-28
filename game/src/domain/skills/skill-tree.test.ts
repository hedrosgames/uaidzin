import { describe, expect, it } from "vitest";
import { SkillTreeService } from "./SkillTreeService";
import { SkillLoadout } from "../combat/SkillLoadout";

describe("SkillTreeService and SkillLoadout", () => {
  it("recompra de skill e recusada", () => {
    const tree = new SkillTreeService();
    tree.grantSkillPoints(5);
    expect(tree.canLearn("fisica", 0)).toBe(true);
    expect(tree.learn("fisica", 0)).toBe(true);
    expect(tree.hasSkill(tree.getTree("fisica")[0].id)).toBe(true);

    expect(tree.canLearn("fisica", 0)).toBe(false);
    expect(tree.learn("fisica", 0)).toBe(false);
  });

  it("loadout mantem slot limpo apos refresh", () => {
    const tree = new SkillTreeService();
    tree.grantSkillPoints(5);
    tree.learn("fisica", 0);
    tree.learn("fisica", 1);
    const s0 = tree.getTree("fisica")[0];
    const s1 = tree.getTree("fisica")[1];

    const loadout = new SkillLoadout(tree);
    expect(loadout.slots.length).toBe(10);
    loadout.assign(s0.id);
    loadout.assign(s1.id);
    expect(loadout.slots[0]?.skill.id).toBe(s0.id);
    expect(loadout.slots[1]?.skill.id).toBe(s1.id);

    loadout.clearSlot(0);
    expect(loadout.slots[0]).toBeNull();
    expect(loadout.slots[1]?.skill.id).toBe(s1.id);

    loadout.refresh();
    expect(loadout.slots[0]).toBeNull();
    expect(loadout.slots[1]?.skill.id).toBe(s1.id);
  });

  it("skill aprendida entra na 1a vaga livre", () => {
    const tree = new SkillTreeService();
    tree.grantSkillPoints(5);
    tree.learn("fisica", 0);
    tree.learn("fisica", 1);
    const s0 = tree.getTree("fisica")[0];
    const s1 = tree.getTree("fisica")[1];

    const loadout = new SkillLoadout(tree);
    loadout.assign(s0.id);
    expect(loadout.slots[0]?.skill.id).toBe(s0.id);

    loadout.assign(s1.id);
    expect(loadout.slots[1]?.skill.id).toBe(s1.id);
  });

  it("cooldown muda dinamicamente apos spendSpec", () => {
    const tree = new SkillTreeService();
    tree.grantSkillPoints(5);
    tree.learn("fisica", 0);
    const s0 = tree.getTree("fisica")[0];

    const loadout = new SkillLoadout(tree);
    loadout.assign(s0.id);
    const initialCd = loadout.slots[0]?.cooldown ?? 0;

    tree.spendSpec("fisica", 40);
    const reducedCd = loadout.slots[0]?.cooldown ?? 0;

    expect(reducedCd).toBeLessThan(initialCd);
  });
});

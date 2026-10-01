import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TK_FISICA } from "../../data/classes/skills/tk";
import { CharacterModel } from "../character/CharacterModel";
import { BuffService } from "../character/BuffService";
import { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { buildCombatMods } from "./CombatMods";
import { FormState } from "./FormState";
import { learnedPassives, SkillController } from "./SkillController";
import { SkillLoadout } from "./SkillLoadout";
import { SummonRuntime } from "./SummonRuntime";

function setup(skillId: string) {
  const tree = new SkillTreeService();
  tree.grantSkillPoints(1000);
  TK_FISICA.forEach((_skill, index) => expect(tree.learn("fisica", index)).toBe(true));
  const loadout = new SkillLoadout(tree);
  loadout.assign(skillId, 0);
  const character = new CharacterModel({ maxHp: 1000, attack: 100, defense: 100 });
  character.maxMp = 1000;
  character.mp = 1000;
  const buffs = new BuffService();
  const form = new FormState();
  const summons = new SummonRuntime();
  const controller = new SkillController(loadout, character, tree);
  const targets: AttackTarget[] = [{ id: "front", x: 0, z: 2, alive: true }];
  const cast = (dt = 0, manual = -1, foes = targets, defense = 0, resist = 0, weapon: string | null = null) =>
    controller.tick(dt, false, manual, true, foes, 0, 0, 0, () => defense, () => 0,
      () => resist, () => ({ hp: 10000, maxHp: 10000 }), buffs, form, summons, weapon);
  return { tree, loadout, character, buffs, form, controller, cast };
}

describe("TK físico comprado no runtime", () => {
  beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.9));
  afterEach(() => vi.restoreAllMocks());

  it.each(TK_FISICA.filter(skill => skill.kind !== "passive" && skill.kind !== "buff"))(
    "$name usa auto-cast, MP e cooldown reais",
    skill => {
      const s = setup(skill.id);
      const first = s.cast();
      expect(first?.slot.skill.id).toBe(skill.id);
      expect(s.character.mp).toBe(1000 - skill.mp);
      expect(s.loadout.slots[0]?.cd).toBe(skill.cooldown);
      expect(s.cast(skill.cooldown / 2)).toBeNull();
      expect(s.character.mp).toBe(1000 - skill.mp);
      s.buffs.tick(20);
      expect(s.cast(skill.cooldown / 2)?.slot.skill.id).toBe(skill.id);
      expect(s.character.mp).toBe(1000 - 2 * skill.mp);
    },
  );

  it("skills ativas entram na barra com auto-cast ligado", () => {
    const s = setup("tk_fis_force_wave");
    expect(s.loadout.slots[0]?.auto).toBe(true);
    expect(s.cast()?.slot.skill.id).toBe("tk_fis_force_wave");
  });

  it("Force Wave atinge apenas o alvo mais próximo e respeita alcance", () => {
    const s = setup("tk_fis_force_wave");
    const foes = [
      { id: "near", x: 0, z: 3, alive: true },
      { id: "far", x: 0, z: 3.01, alive: true },
    ];
    expect(s.cast(0, -1, foes)?.resolved.hits).toEqual([{ id: "near", x: 0, z: 3, damage: 125 }]);
    s.controller.reset();
    expect(s.cast(0, -1, [{ id: "outside", x: 0, z: 3.01, alive: true }])).toBeNull();
    expect(s.character.mp).toBe(994);
  });

  it("Death Stab atinge um único alvo a até 6 m e ignora 25% da defesa", () => {
    const s = setup("tk_fis_death_stab");
    const foes = [
      { id: "near", x: 0, z: 5, alive: true },
      { id: "edge", x: 0, z: 6, alive: true },
    ];
    expect(s.cast(0, -1, foes, 100)?.resolved.hits).toEqual([{ id: "near", x: 0, z: 5, damage: 89 }]);
    s.controller.reset();
    expect(s.cast(0, -1, [{ id: "outside", x: 0, z: 6.01, alive: true }], 100)).toBeNull();
  });

  it("Earthquake aplica dano da arma a todos no raio de 6 m", () => {
    const s = setup("tk_fis_earthquake");
    s.character.baseMagicAttack = 1;
    const foes = [
      { id: "front", x: 0, z: 6, alive: true },
      { id: "back", x: 0, z: -6, alive: true },
      { id: "outside", x: 0, z: 6.01, alive: true },
      { id: "dead", x: 0, z: 1, alive: false },
    ];
    const hits = s.cast(0, -1, foes, 0, 0.9)?.resolved.hits;
    expect(hits?.map(hit => hit.id)).toEqual(["front", "back"]);
    expect(hits?.map(hit => hit.damage)).toEqual([170, 170]);
  });

  it("Fire Burst atinge apenas um alvo a até 4,4 m", () => {
    const s = setup("tk_fis_fire_burst");
    s.character.baseMagicAttack = 1;
    const foes = [
      { id: "near", x: 0, z: 3, alive: true },
      { id: "edge", x: 0, z: 4.4, alive: true },
      { id: "outside", x: 0, z: 4.41, alive: true },
    ];
    const hits = s.cast(0, -1, foes, 0, 0.9)?.resolved.hits;
    expect(hits).toEqual([{ id: "near", x: 0, z: 3, damage: 260 }]);
  });

  it.each([
    ["tk_fis_atk_descuidado", "tk_reckless_atk"],
    ["tk_fis_fury", "tk_fury"],
  ] as const)("%s dura 40 s e recarrega em 10 s", (id, buffId) => {
    const s = setup(id);
    const skill = TK_FISICA.find((entry) => entry.id === id)!;
    expect(skill.cooldown).toBe(10);
    expect(s.cast(0, 0, [])?.slot.skill.id).toBe(id);
    expect(s.buffs.active.find((buff) => buff.id === buffId)?.remainingSec).toBe(40);
    expect(s.controller.slotStates(s.buffs)[0]?.cdLeft).toBe(10);
    s.loadout.tick(9.9);
    expect(s.cast(0, 0, [])).toBeNull();
    expect(s.controller.slotStates(s.buffs)[0]?.ready).toBe(false);
    s.loadout.tick(0.2);
    expect(s.controller.slotStates(s.buffs)[0]?.ready).toBe(true);
    expect(s.cast(0, 0, [])?.slot.skill.id).toBe(id);
    expect(s.buffs.active.find((buff) => buff.id === buffId)?.remainingSec).toBe(40);
  });

  it("Atk Descuidado e Fury preservam seus modificadores durante o buff", () => {
    const reckless = setup("tk_fis_atk_descuidado");
    expect(reckless.cast(0, 0, [])).not.toBeNull();
    let mods = buildCombatMods(reckless.buffs.active, [], null, reckless.form);
    expect(mods.attackMul).toBeCloseTo(1.28);
    expect(mods.defenseMul).toBeCloseTo(0.82);
    reckless.buffs.tick(40.01);
    mods = buildCombatMods(reckless.buffs.active, [], null, reckless.form);
    expect(mods.attackMul).toBe(1);
    expect(mods.defenseMul).toBe(1);

    const fury = setup("tk_fis_fury");
    expect(fury.cast(0, 0, [])).not.toBeNull();
    expect(buildCombatMods(fury.buffs.active, [], null, fury.form).attackSpeed).toBeCloseTo(0.32);
    fury.buffs.tick(40.01);
    expect(buildCombatMods(fury.buffs.active, [], null, fury.form).attackSpeed).toBe(0);
  });

  it("Earthquake, Fire Burst e Death Stab usam recarga de 2 s", () => {
    for (const id of ["tk_fis_earthquake", "tk_fis_fire_burst", "tk_fis_death_stab"]) {
      expect(TK_FISICA.find((skill) => skill.id === id)?.cooldown).toBe(2);
    }
  });

  it("Mestre Dual exige arma dupla, Increase Critical soma 12% e passivas não entram na barra", () => {
    const s = setup("tk_fis_force_wave");
    const passives = learnedPassives(s.tree);
    expect(passives.map(skill => skill.id)).toEqual(["tk_fis_mestre_dual", "tk_fis_increase_critical"]);
    for (const weapon of ["dual-axe", "dual-sword"]) {
      const mods = buildCombatMods([], passives, weapon, s.form);
      expect(mods.attackMul).toBeCloseTo(1.22);
      expect(mods.critChance).toBeCloseTo(0.12);
    }
    expect(buildCombatMods([], passives, "sword-shield", s.form).attackMul).toBe(1);
    expect(s.loadout.assign("tk_fis_mestre_dual", 1)).toBe(false);
    expect(s.loadout.assign("tk_fis_increase_critical", 2)).toBe(false);
    vi.mocked(Math.random).mockReturnValue(0.11);
    expect(s.cast()?.resolved.hits[0].damage).toBe(188);
  });

  it("auto desabilitado não dispara, cast manual permanece e MP insuficiente bloqueia", () => {
    const s = setup("tk_fis_force_wave");
    s.loadout.toggleAuto(0);
    expect(s.cast()).toBeNull();
    expect(s.character.mp).toBe(1000);
    expect(s.cast(0, 0)?.slot.skill.id).toBe("tk_fis_force_wave");
    expect(s.cast(0, 0)).toBeNull();
    s.controller.reset();
    s.character.mp = 5;
    expect(s.cast(0, 0)).toBeNull();
    expect(s.character.mp).toBe(5);
    expect(s.loadout.slots[0]?.cd).toBe(0);
  });
});

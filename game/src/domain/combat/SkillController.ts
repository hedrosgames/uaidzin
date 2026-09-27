import { SKILL_BALANCE } from "../../data/balance/skills";
import { CLASSES, type TreeId } from "../../data/classes/class-definitions";
import type { SkillDef } from "../../data/classes/skill-types";
import type { BuffService } from "../character/BuffService";
import type { CharacterModel } from "../character/CharacterModel";
import type { SkillTreeService } from "../skills/SkillTreeService";
import type { AttackTarget } from "./AttackController";
import { buildCombatMods, type CombatMods } from "./CombatMods";
import type { FormState } from "./FormState";
import type { LoadoutSlot, SkillLoadout } from "./SkillLoadout";
import { resolveSkill, selectSkillTargets, type ResolvedSkill } from "./SkillCasting";
import type { SummonRuntime } from "./SummonRuntime";

const TREE_COLOR: Record<TreeId, number> = {
  fisica: 0xc45c26,
  controle: 0x6b7cff,
  magia: 0xb07cff,
};

export interface SkillCast {
  slot: LoadoutSlot;
  resolved: ResolvedSkill;
  mods: CombatMods;
}

export function learnedPassives(tree: SkillTreeService): SkillDef[] {
  const out: SkillDef[] = [];
  const st = tree.state;
  for (const id of ["controle", "magia", "fisica"] as const) {
    for (const skill of CLASSES[st.classId].trees[id]) {
      if (skill.kind !== "passive") continue;
      if (tree.getSkillLevel(skill.id) > 0) out.push(skill);
    }
  }
  return out;
}

export class SkillController {
  constructor(
    private readonly loadout: SkillLoadout,
    private readonly character: CharacterModel | null = null,
    private readonly tree: SkillTreeService | null = null,
  ) {}

  tick(
    dt: number,
    moving: boolean,
    manualSlotIndex: number,
    targets: AttackTarget[],
    px: number,
    pz: number,
    facing: number,
    defenseOf: (id: string) => number,
    hpOf: (id: string) => { hp: number; maxHp: number },
    buffs: BuffService,
    form: FormState,
    summons: SummonRuntime,
    weaponSet: string | null,
  ): SkillCast | null {
    this.loadout.tick(dt);
    if (moving || !this.character || !this.tree) return null;
    const mods = buildCombatMods(buffs.active, learnedPassives(this.tree), weaponSet, form);
    const slot = manualSlotIndex >= 0
      ? this.manualSlot(manualSlotIndex, mods)
      : this.autoSlot(mods, buffs, form, summons, targets, px, pz, facing);
    if (!slot) return null;
    const cost = Math.max(0, Math.round(slot.skill.mp * mods.mpCostMul));
    if (!this.character.spendMp(cost)) return null;
    const resolved = resolveSkill({
      skill: slot.skill,
      attack: this.character.attack,
      maxHp: this.character.maxHp,
      px,
      pz,
      facing,
      targets,
      defenseOf,
      hpOf,
      mods,
      transformed: form.active,
      treeColor: TREE_COLOR[slot.tree],
    });
    if (!resolved) {
      this.character.regenMp(cost);
      return null;
    }
    if (mods.mpToHp > 0 && cost > 0) resolved.heal += Math.round(cost * mods.mpToHp);
    if (mods.stealth && resolved.hits.length > 0) {
      const mul = buffs.consumeStealth();
      for (const hit of resolved.hits) hit.damage = Math.max(1, Math.round(hit.damage * mul));
    }
    for (const buff of resolved.buffs) buffs.add(buff);
    if (resolved.cleanse) buffs.cleanse();
    if (resolved.transform) form.apply(resolved.transform);
    if (resolved.summons) {
      const specs = resolved.summons;
      specs.forEach((spec, index) => {
        const angle = (Math.PI * 2 * index) / specs.length;
        summons.spawn(
          spec,
          this.character!.attack * mods.attackMul,
          px + Math.sin(angle) * 1.4,
          pz + Math.cos(angle) * 1.4,
          mods.summonPower,
        );
      });
    }
    this.loadout.use(slot);
    return { slot, resolved, mods };
  }

  slotStates(): Array<{ key: number; name: string; cdRatio: number; ready: boolean; auto: boolean }> {
    return this.loadout.slots.map((slot, index) => ({
      key: index + 1,
      name: slot.skill.name,
      cdRatio: slot.cooldown > 0 ? slot.cd / slot.cooldown : 0,
      ready: slot.cd <= 0,
      auto: slot.auto,
    }));
  }

  getCooldownRatio(index: number): number {
    const slot = this.loadout.slots[index];
    if (!slot || slot.cooldown <= 0) return 0;
    return slot.cd / slot.cooldown;
  }

  slotLabels(): string[] {
    return this.loadout.slots.map((slot, index) => `${index + 1}·${slot.skill.name}${slot.auto ? "A" : ""}`);
  }

  reset(): void {
    this.loadout.resetCooldowns();
  }

  private manualSlot(index: number, mods: CombatMods): LoadoutSlot | null {
    const slot = this.loadout.slots[index];
    if (!slot || !(slot.cd <= 0) || slot.skill.kind === "passive") return null;
    if (!this.affordable(slot, mods)) return null;
    return slot;
  }

  private autoSlot(
    mods: CombatMods,
    buffs: BuffService,
    form: FormState,
    summons: SummonRuntime,
    targets: AttackTarget[],
    px: number,
    pz: number,
    facing: number,
  ): LoadoutSlot | null {
    const hpRatio = this.character && this.character.maxHp > 0 ? this.character.hp / this.character.maxHp : 1;
    let best: LoadoutSlot | null = null;
    let bestScore = -1;
    for (const slot of this.loadout.slots) {
      if (!slot.auto || !(slot.cd <= 0)) continue;
      if (!this.affordable(slot, mods)) continue;
      if (!this.autoUseful(slot, hpRatio, buffs, form, summons, targets, px, pz, facing)) continue;
      const score = this.autoScore(slot, hpRatio);
      if (score > bestScore) {
        best = slot;
        bestScore = score;
      }
    }
    return best;
  }

  private affordable(slot: LoadoutSlot, mods: CombatMods): boolean {
    if (!this.character) return false;
    const cost = Math.max(0, Math.round(slot.skill.mp * mods.mpCostMul));
    return this.character.mp >= cost;
  }

  private autoUseful(
    slot: LoadoutSlot,
    hpRatio: number,
    buffs: BuffService,
    form: FormState,
    summons: SummonRuntime,
    targets: AttackTarget[],
    px: number,
    pz: number,
    facing: number,
  ): boolean {
    const skill = slot.skill;
    if (skill.kind === "heal") return hpRatio <= SKILL_BALANCE.healAutoHpRatio;
    if (skill.kind === "buff") return !(skill.buff && buffs.has(skill.buff.id, 1));
    if (skill.kind === "transform") return !(skill.transform && form.id === skill.transform.id && form.active);
    if (skill.kind === "summon") {
      const specs = skill.pack ?? (skill.summon ? [skill.summon] : []);
      if (specs.length === 0) return false;
      return !specs.every((spec) => summons.hasKind(spec.id));
    }
    if (skill.kind === "passive") return false;
    return selectSkillTargets(skill, targets, px, pz, facing).length > 0;
  }

  private autoScore(slot: LoadoutSlot, hpRatio: number): number {
    const skill = slot.skill;
    if (skill.kind === "heal") return (1 - hpRatio) * 12 + 1;
    if (skill.kind === "buff" || skill.kind === "transform") return 3.1;
    if (skill.kind === "summon") return 2.1;
    return Math.max(0.2, skill.damageMultiplier);
  }
}

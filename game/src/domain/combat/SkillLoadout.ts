import { CLASSES, type SkillDef, type TreeId } from "../../data/classes/class-definitions";
import { SKILL_BALANCE } from "../../data/balance/skills";
import type { SkillTreeService } from "../skills/SkillTreeService";

export interface LoadoutSlot {
  skill: SkillDef;
  tree: TreeId;
  readonly cooldown: number;
  cd: number;
  auto: boolean;
}

function specFactor(raw: number): number {
  const spec = Number.isFinite(raw) ? raw : 0;
  return 1 - (Math.min(spec, SKILL_BALANCE.specializationPerTreeCap) / SKILL_BALANCE.specializationPerTreeCap) * SKILL_BALANCE.specializationCooldownPenalty;
}

export class SkillLoadout {
  slots: LoadoutSlot[] = [];
  private preferred: Array<{ skillId: string; tree: TreeId; auto: boolean }> = [];

  constructor(private readonly tree: SkillTreeService) {}

  private createSlot(skill: SkillDef, tree: TreeId, auto: boolean, cd = 0): LoadoutSlot {
    const treeService = this.tree;
    return {
      skill,
      tree,
      get cooldown(): number {
        const spec = treeService.state.specialization[tree];
        const cdScale = specFactor(spec);
        const scaled = skill.cooldown * cdScale;
        return Math.max(0.4, Number.isFinite(scaled) ? scaled : skill.cooldown);
      },
      cd: Number.isFinite(cd) ? cd : 0,
      auto,
    };
  }

  snapshot(): Array<{ skillId: string; tree: string; auto: boolean }> {
    if (this.slots.length) {
      return this.slots.map((s) => ({
        skillId: s.skill.id,
        tree: s.tree,
        auto: s.auto,
      }));
    }
    return this.preferred.map((p) => ({ ...p }));
  }

  applySaved(list: Array<{ skillId: string; tree: string; auto: boolean }> | null | undefined): void {
    this.preferred = [];
    if (!Array.isArray(list)) return;
    for (const row of list.slice(0, 4)) {
      if (!row?.skillId) continue;
      const tree = (row.tree as TreeId) || "fisica";
      this.preferred.push({
        skillId: row.skillId,
        tree,
        auto: row.auto !== false,
      });
    }
  }

  refresh(): void {
    const st = this.tree.state;
    const candidates: Array<{ skill: SkillDef; tree: TreeId }> = [];

    for (const tree of ["controle", "magia", "fisica"] as const) {
      const skills = CLASSES[st.classId].trees[tree];
      skills.forEach((skill) => {
        if (!this.tree.hasSkill(skill.id) || skill.kind === "passive") return;
        candidates.push({ skill, tree });
      });
    }

    const byId = new Map(candidates.map((c) => [c.skill.id, c] as const));
    const picked: Array<{ skill: SkillDef; tree: TreeId; auto: boolean }> = [];

    for (const pref of this.preferred) {
      const hit = byId.get(pref.skillId);
      if (!hit) continue;
      if (picked.some((p) => p.skill.id === hit.skill.id)) continue;
      picked.push({ skill: hit.skill, tree: hit.tree, auto: pref.auto });
      if (picked.length >= 4) break;
    }

    const prevCd = new Map(this.slots.map((s) => [s.skill.id, s.cd] as const));
    this.slots = picked.map((c) => {
      const remaining = prevCd.get(c.skill.id);
      return this.createSlot(c.skill, c.tree, c.auto, remaining ?? 0);
    });
    this.preferred = this.slots.map((s) => ({
      skillId: s.skill.id,
      tree: s.tree,
      auto: s.auto,
    }));
  }

  tick(dt: number): void {
    for (const s of this.slots) s.cd = Number.isFinite(s.cd) ? Math.max(0, s.cd - dt) : 0;
  }

  resetCooldowns(): void {
    for (const s of this.slots) s.cd = 0;
  }

  assign(skillId: string): boolean {
    const st = this.tree.state;
    let found: { skill: SkillDef; tree: TreeId } | null = null;
    for (const tree of ["controle", "magia", "fisica"] as const) {
      const skill = CLASSES[st.classId].trees[tree].find((item) => item.id === skillId);
      if (!skill || skill.kind === "passive") continue;
      if (!this.tree.hasSkill(skill.id)) continue;
      found = { skill, tree };
      break;
    }
    if (!found) return false;
    const picked = found;
    if (this.slots.some((slot) => slot.skill.id === picked.skill.id)) return true;
    const slot = this.createSlot(picked.skill, picked.tree, true);
    if (this.slots.length < 4) this.slots.push(slot);
    else this.slots[3] = slot;
    this.preferred = this.slots.map((item) => ({
      skillId: item.skill.id,
      tree: item.tree,
      auto: item.auto,
    }));
    return true;
  }

  clearSlot(index: number): void {
    if (index < 0 || index >= this.slots.length) return;
    this.slots.splice(index, 1);
    this.preferred = this.slots.map((item) => ({
      skillId: item.skill.id,
      tree: item.tree,
      auto: item.auto,
    }));
  }

  toggleAuto(index: number): void {
    const slot = this.slots[index];
    if (!slot) return;
    slot.auto = !slot.auto;
    this.preferred = this.slots.map((item) => ({
      skillId: item.skill.id,
      tree: item.tree,
      auto: item.auto,
    }));
  }

  bestReadyAuto(): LoadoutSlot | null {
    let best: LoadoutSlot | null = null;
    for (const s of this.slots) {
      if (!s.auto || s.cd > 0) continue;
      if (!best || s.skill.damageMultiplier > best.skill.damageMultiplier) {
        best = s;
      }
    }
    return best;
  }

  use(slot: LoadoutSlot): void {
    slot.cd = slot.cooldown;
  }
}

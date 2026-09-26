import { CLASSES, type SkillDef, type TreeId } from "../../data/classes/class-definitions";
import { SKILL_BALANCE } from "../../data/balance/skills";
import type { SkillTreeService } from "../skills/SkillTreeService";

export interface LoadoutSlot {
  skill: SkillDef;
  tree: TreeId;
  level: number;
  cooldown: number;
  
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
    const candidates: Array<{ skill: SkillDef; tree: TreeId; level: number; score: number }> = [];

    for (const tree of ["controle", "magia", "fisica"] as const) {
      const skills = CLASSES[st.classId].trees[tree];
      skills.forEach((skill) => {
        const level = this.tree.getSkillLevel(skill.id);
        if (level <= 0 || skill.kind === "passive") return;
        const weight = skill.kind === "damage" ? skill.damageMultiplier : skill.kind === "heal" ? 1.2 : 0.85;
        const score = weight * level * (1 + st.specialization[tree] / 40);
        candidates.push({ skill, tree, level, score });
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const byId = new Map(candidates.map((c) => [c.skill.id, c] as const));
    const picked: Array<{ skill: SkillDef; tree: TreeId; level: number; auto: boolean }> = [];

    for (const pref of this.preferred) {
      const hit = byId.get(pref.skillId);
      if (!hit) continue;
      if (picked.some((p) => p.skill.id === hit.skill.id)) continue;
      picked.push({ skill: hit.skill, tree: hit.tree, level: hit.level, auto: pref.auto });
      if (picked.length >= 4) break;
    }

    for (const c of candidates) {
      if (picked.length >= 4) break;
      if (picked.some((p) => p.skill.id === c.skill.id)) continue;
      picked.push({ skill: c.skill, tree: c.tree, level: c.level, auto: true });
    }

    const prevCd = new Map(this.slots.map((s) => [s.skill.id, s.cd] as const));
    this.slots = picked.map((c) => {
      const cdScale = specFactor(st.specialization[c.tree]);
      const scaled = c.skill.cooldown * cdScale;
      const cooldown = Math.max(0.4, Number.isFinite(scaled) ? scaled : c.skill.cooldown);
      const remaining = prevCd.get(c.skill.id);
      return {
        skill: c.skill,
        tree: c.tree,
        level: c.level,
        cooldown,
        cd: remaining === undefined || !Number.isFinite(remaining) ? 0 : Math.min(cooldown, remaining),
        auto: c.auto,
      };
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
    let found: { skill: SkillDef; tree: TreeId; level: number } | null = null;
    for (const tree of ["controle", "magia", "fisica"] as const) {
      const skill = CLASSES[st.classId].trees[tree].find((item) => item.id === skillId);
      if (!skill || skill.kind === "passive") continue;
      const level = this.tree.getSkillLevel(skill.id);
      if (level <= 0) continue;
      found = { skill, tree, level };
      break;
    }
    if (!found) return false;
    const picked = found;
    if (this.slots.some((slot) => slot.skill.id === picked.skill.id)) return true;
    const cdScale = specFactor(st.specialization[picked.tree]);
    const slot: LoadoutSlot = {
      skill: picked.skill,
      tree: picked.tree,
      level: picked.level,
      cooldown: Math.max(0.4, picked.skill.cooldown * cdScale),
      cd: 0,
      auto: true,
    };
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
      if (!best || s.level * s.skill.damageMultiplier > best.level * best.skill.damageMultiplier) {
        best = s;
      }
    }
    return best;
  }

  use(slot: LoadoutSlot): void {
    slot.cd = slot.cooldown;
  }
}

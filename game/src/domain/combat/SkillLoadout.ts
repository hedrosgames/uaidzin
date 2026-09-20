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

function specFactor(spec: number): number {
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
      skills.forEach((skill, index) => {
        const level = this.tree.getSkillLevel(skill.id);
        if (level <= 0) return;

        void index;
        const score = skill.damageMultiplier * level * (1 + st.specialization[tree] / 40);
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
      const cooldown = Math.max(0.4, c.skill.cooldown * cdScale);
      const remaining = prevCd.get(c.skill.id);
      return {
        skill: c.skill,
        tree: c.tree,
        level: c.level,
        cooldown,
        cd: remaining === undefined ? 0 : Math.min(cooldown, remaining),
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
    for (const s of this.slots) s.cd = Math.max(0, s.cd - dt);
  }

  resetCooldowns(): void {
    for (const s of this.slots) s.cd = 0;
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

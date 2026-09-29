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
  slots: Array<LoadoutSlot | null> = Array.from({ length: SKILL_BALANCE.barSize }, () => null);
  private preferred: Array<{ skillId: string; tree: TreeId; auto: boolean; index: number }> = [];

  constructor(private readonly tree: SkillTreeService) {}

  private createSlot(skill: SkillDef, tree: TreeId, auto: boolean, cd = 0): LoadoutSlot {
    const treeService = this.tree;
    return {
      skill,
      tree,
      get cooldown(): number {
        const spec = tree === "livro" ? 0 : treeService.state.specialization[tree];
        const cdScale = specFactor(spec);
        const scaled = skill.cooldown * cdScale;
        return Math.max(0.4, Number.isFinite(scaled) ? scaled : skill.cooldown);
      },
      cd: Number.isFinite(cd) ? cd : 0,
      auto,
    };
  }

  private syncPreferred(): void {
    this.preferred = [];
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s) {
        this.preferred.push({
          skillId: s.skill.id,
          tree: s.tree,
          auto: s.auto,
          index: i,
        });
      }
    }
  }

  snapshot(): Array<{ skillId: string; tree: string; auto: boolean; index: number }> {
    if (this.slots.some(Boolean)) {
      const out: Array<{ skillId: string; tree: string; auto: boolean; index: number }> = [];
      for (let i = 0; i < this.slots.length; i++) {
        const s = this.slots[i];
        if (s) {
          out.push({
            skillId: s.skill.id,
            tree: s.tree,
            auto: s.auto,
            index: i,
          });
        }
      }
      return out;
    }
    return this.preferred.map((p) => ({ ...p }));
  }

  applySaved(list: Array<{ skillId: string; tree?: string; auto?: boolean; index?: number }> | null | undefined): void {
    this.preferred = [];
    this.slots = Array.from({ length: SKILL_BALANCE.barSize }, () => null);
    if (!Array.isArray(list)) return;

    const usedIndices = new Set<number>();
    const unindexed: Array<{ skillId: string; tree: TreeId; auto: boolean }> = [];

    for (const row of list) {
      if (!row?.skillId) continue;
      const tree = (row.tree as TreeId) || "fisica";
      const auto = Boolean(row.auto);
      if (typeof row.index === "number" && Number.isFinite(row.index) && row.index >= 0 && row.index < SKILL_BALANCE.barSize && !usedIndices.has(row.index)) {
        usedIndices.add(row.index);
        this.preferred.push({ skillId: row.skillId, tree, auto, index: row.index });
      } else {
        unindexed.push({ skillId: row.skillId, tree, auto });
      }
    }

    let nextIdx = 0;
    for (const row of unindexed) {
      while (nextIdx < SKILL_BALANCE.barSize && usedIndices.has(nextIdx)) {
        nextIdx++;
      }
      if (nextIdx >= SKILL_BALANCE.barSize) break;
      usedIndices.add(nextIdx);
      this.preferred.push({ ...row, index: nextIdx });
      nextIdx++;
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

    if (this.preferred.length > 0 && !this.slots.some(Boolean)) {
      for (const pref of this.preferred) {
        if (pref.index < 0 || pref.index >= this.slots.length) continue;
        const hit = byId.get(pref.skillId);
        if (!hit) continue;
        this.slots[pref.index] = this.createSlot(hit.skill, hit.tree, pref.auto);
      }
    }

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s) continue;
      const hit = byId.get(s.skill.id);
      if (!hit) {
        this.slots[i] = null;
      } else {
        this.slots[i] = this.createSlot(hit.skill, hit.tree, s.auto, s.cd);
      }
    }

    this.syncPreferred();
  }

  tick(dt: number): void {
    for (const s of this.slots) {
      if (s) s.cd = Number.isFinite(s.cd) ? Math.max(0, s.cd - dt) : 0;
    }
  }

  resetCooldowns(): void {
    for (const s of this.slots) {
      if (s) s.cd = 0;
    }
  }

  assign(skillId: string, index?: number): boolean {
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

    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i]?.skill.id === skillId) {
        this.slots[i] = null;
      }
    }

    let targetIndex = -1;
    if (typeof index === "number") {
      if (index < 0 || index >= this.slots.length) return false;
      targetIndex = index;
    } else {
      for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i] === null) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex < 0) return false;
    }

    this.slots[targetIndex] = this.createSlot(found.skill, found.tree, false);
    this.syncPreferred();
    return true;
  }

  assignToSlot(index: number, skillId: string): boolean {
    return this.assign(skillId, index);
  }

  swapSlots(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.slots.length) return false;
    if (toIndex < 0 || toIndex >= this.slots.length) return false;
    const temp = this.slots[fromIndex];
    this.slots[fromIndex] = this.slots[toIndex];
    this.slots[toIndex] = temp;
    this.syncPreferred();
    return true;
  }

  clearSlot(index: number): void {
    if (index < 0 || index >= this.slots.length) return;
    this.slots[index] = null;
    this.syncPreferred();
  }

  toggleAuto(index: number): void {
    if (index < 0 || index >= this.slots.length) return;
    const slot = this.slots[index];
    if (!slot) return;
    slot.auto = !slot.auto;
    this.syncPreferred();
  }

  bestReadyAuto(): LoadoutSlot | null {
    let best: LoadoutSlot | null = null;
    for (const s of this.slots) {
      if (!s || !s.auto || s.cd > 0) continue;
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

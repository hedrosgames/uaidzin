import { CLASSES, type ClassId, type SkillDef, type TreeId } from "../../data/classes/class-definitions";
import { SKILL_BALANCE } from "../../data/balance/skills";

export interface SkillProgress {
  level: number;
}

export interface SkillTreeState {
  classId: ClassId;
  levels: Record<string, SkillProgress>;
  
  eighthTree: TreeId | null;
  specialization: Record<TreeId, number>;
  skillPoints: number;
  specPoints: number;
}



export class SkillTreeService {
  readonly state: SkillTreeState = {
    classId: "TK",
    levels: {},
    eighthTree: null,
    specialization: { controle: 0, magia: 0, fisica: 0 },
    skillPoints: 0,
    specPoints: SKILL_BALANCE.specializationTotal,
  };

  setClass(id: ClassId): void {
    this.state.classId = id;
  }

  getTree(tree: TreeId): SkillDef[] {
    return CLASSES[this.state.classId].trees[tree];
  }

  getSkillLevel(skillId: string): number {
    return this.state.levels[skillId]?.level ?? 0;
  }

  canLearn(tree: TreeId, index: number): boolean {
    if (this.state.skillPoints <= 0) return false;
    const skills = this.getTree(tree);
    const skill = skills[index];
    if (!skill) return false;
    const lvl = this.getSkillLevel(skill.id);
    if (lvl >= SKILL_BALANCE.skillLevelCap) return false;

    if (index > 0) {
      const prev = skills[index - 1];
      if (this.getSkillLevel(prev.id) < 1) return false;
    }

    if (index === 7) {
      if (this.state.eighthTree && this.state.eighthTree !== tree) return false;
    }
    return true;
  }

  learn(tree: TreeId, index: number): boolean {
    if (!this.canLearn(tree, index)) return false;
    const skill = this.getTree(tree)[index];
    const cur = this.getSkillLevel(skill.id);
    this.state.levels[skill.id] = { level: cur + 1 };
    this.state.skillPoints -= 1;
    if (index === 7) this.state.eighthTree = tree;
    return true;
  }

  grantSkillPoints(n: number): void {
    this.state.skillPoints += n;
  }

  spendSpec(tree: TreeId, points = 1): boolean {
    if (this.state.specPoints <= 0) return false;
    if (this.state.specialization[tree] >= SKILL_BALANCE.specializationPerTreeCap) return false;
    const n = Math.min(points, this.state.specPoints, SKILL_BALANCE.specializationPerTreeCap - this.state.specialization[tree]);
    if (n <= 0) return false;
    this.state.specialization[tree] += n;
    this.state.specPoints -= n;
    return true;
  }

  resetSkills(): void {
    this.state.levels = {};
    this.state.eighthTree = null;
  }
}

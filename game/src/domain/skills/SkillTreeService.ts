import { CLASSES, type ClassId, type SkillDef, type TreeId } from "../../data/classes/class-definitions";
import { SKILL_BALANCE } from "../../data/balance/skills";

export interface SkillTreeState {
  classId: ClassId;
  learned: Set<string>;
  eighthTree: TreeId | null;
  specialization: Record<TreeId, number>;
  skillPoints: number;
  specPoints: number;
}

export class SkillTreeService {
  readonly state: SkillTreeState = {
    classId: "TK",
    learned: new Set<string>(),
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

  hasSkill(skillId: string): boolean {
    return this.state.learned.has(skillId);
  }

  getSkillLevel(skillId: string): number {
    return this.hasSkill(skillId) ? 1 : 0;
  }

  canLearn(tree: TreeId, index: number): boolean {
    if (this.state.skillPoints <= 0) return false;
    const skills = this.getTree(tree);
    const skill = skills[index];
    if (!skill) return false;
    if (this.hasSkill(skill.id)) return false;

    if (index > 0) {
      const prev = skills[index - 1];
      if (!this.hasSkill(prev.id)) return false;
    }

    if (index === 7) {
      if (this.state.eighthTree && this.state.eighthTree !== tree) return false;
    }
    return true;
  }

  learn(tree: TreeId, index: number): boolean {
    if (!this.canLearn(tree, index)) return false;
    const skill = this.getTree(tree)[index];
    this.state.learned.add(skill.id);
    this.state.skillPoints -= 1;
    if (index === 7) this.state.eighthTree = tree;
    return true;
  }

  grantSkillPoints(n: number): void {
    if (!Number.isFinite(n) || n <= 0) return;
    this.state.skillPoints += Math.floor(n);
  }

  spendSpec(tree: TreeId, points = 1): boolean {
    if (!Number.isFinite(this.state.specPoints) || !Number.isFinite(this.state.specialization[tree])) return false;
    if (!Number.isFinite(points)) return false;
    if (this.state.specPoints <= 0) return false;
    if (this.state.specialization[tree] >= SKILL_BALANCE.specializationPerTreeCap) return false;
    const n = Math.min(points, this.state.specPoints, SKILL_BALANCE.specializationPerTreeCap - this.state.specialization[tree]);
    if (n <= 0) return false;
    this.state.specialization[tree] += n;
    this.state.specPoints -= n;
    return true;
  }

  resetSkills(): void {
    this.state.learned.clear();
    this.state.eighthTree = null;
    this.state.skillPoints = 0;
    this.state.specPoints = SKILL_BALANCE.specializationTotal;
    this.state.specialization = { controle: 0, magia: 0, fisica: 0 };
  }
}

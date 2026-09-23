import type { SkillDef } from "./skill-types";

const legacyToStable = new Map<string, string>();

export function registerLegacyTree(prefix: string, skills: SkillDef[]): void {
  skills.forEach((skill, index) => {
    legacyToStable.set(`${prefix}_${index + 1}`, skill.id);
  });
}

export function remapSkillId(id: string): string {
  return legacyToStable.get(id) ?? id;
}

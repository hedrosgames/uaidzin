import { v1 } from "./proposals-v1.js";
import { v2 } from "./proposals-v2.js";
import { v3 } from "./proposals-v3.js";
import { AtelierComposition } from "./atelier-engine.js";
import { registerSkillComposition, getSkillComposition, validateSkillCompositions } from "./runtime-contract.js";

export const proposals = { V1: v1, V2: v2, V3: v3 };

export function installCompositions(skills) {
  for (const [version, entries] of Object.entries(proposals)) {
    for (const entry of entries) {
      const skill = skills.find((s) => s.id === entry.id);
      if (!skill) throw new Error(`Skill desconhecida: ${entry.id}`);
      registerSkillComposition(entry.id, version, () => new AtelierComposition(skill, entry, version));
    }
    validateSkillCompositions(skills.map((s) => s.id), version);
  }
}

export function instantiate(skillId, version, context) {
  const factory = getSkillComposition(skillId, version);
  if (!factory) throw new Error(`Proposta ausente: ${skillId} ${version}`);
  return factory().setup(context);
}

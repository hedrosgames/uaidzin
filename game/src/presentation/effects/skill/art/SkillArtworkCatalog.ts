import { BM_SKILL_ART } from "./BmSkillArt";
import { FM_SKILL_ART } from "./FmSkillArt";
import { HT_SKILL_ART } from "./HtSkillArt";
import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

const SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = { ...BM_SKILL_ART, ...FM_SKILL_ART, ...HT_SKILL_ART };

export function getSkillArtwork(skillId: string): SkillPlaceholderArt | undefined {
  return SKILL_ART[skillId];
}

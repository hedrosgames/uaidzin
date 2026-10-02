import { BM_SKILL_ART } from "./BmSkillArt";
import { FM_SKILL_ART } from "./FmSkillArt";
import { HT_SKILL_ART } from "./HtSkillArt";
import { TK_SKILL_ART } from "./TkSkillArt";
import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

const SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = { ...TK_SKILL_ART, ...BM_SKILL_ART, ...FM_SKILL_ART, ...HT_SKILL_ART };

export function getSkillArtwork(skillId: string): SkillPlaceholderArt | undefined {
  return SKILL_ART[skillId];
}

import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const BM_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  bm_fis_lobo_guerreiro: { motif: "fang", color: 0x9f8760, accent: 0xd4a017, count: 5, scale: 0.5, spread: 0.9, spin: 0.6, lift: 1.2, motion: "totem", particleRate: 28 },
  bm_fis_couro_fera: { motif: "shield", color: 0x554634, accent: 0xc6ae79, count: 4, scale: 0.5, spread: 0.85, spin: 0.3, lift: 0.8, motion: "ward", particleRate: 20 },
};

import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const HT_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  ht_fis_tiro_certeiro: { motif: "arrow", color: 0xc49a46, accent: 0xf0e6d0, count: 1, scale: 0.34, spread: 0.12, spin: 0.1, lift: 0.1, motion: "trail", particleRate: 28 },
  ht_fis_pes_ligeiros: { motif: "wing", color: 0x76bc9d, accent: 0xe5ecc5, count: 4, scale: 0.26, spread: 0.65, spin: 2.4, lift: 0.15, motion: "orbit", particleRate: 24 },
  ht_fis_mira_aguia: { motif: "star", color: 0xd4a017, accent: 0xf0e6d0, count: 4, scale: 0.24, spread: 0.55, spin: 0.6, lift: 0.85, motion: "ward", particleRate: 20 },
};

import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const HT_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  ht_fis_tiro_certeiro: { motif: "arrow", color: 0xc49a46, accent: 0xf0e6d0, count: 1, scale: 0.34, spread: 0.12, spin: 0.1, lift: 0.1, motion: "trail", particleRate: 28 },
  ht_fis_pes_ligeiros: { motif: "wing", color: 0x76bc9d, accent: 0xe5ecc5, count: 4, scale: 0.26, spread: 0.65, spin: 2.4, lift: 0.15, motion: "orbit", particleRate: 24 },
  ht_fis_mira_aguia: { motif: "star", color: 0xd4a017, accent: 0xf0e6d0, count: 4, scale: 0.24, spread: 0.55, spin: 0.6, lift: 0.85, motion: "ward", particleRate: 20 },
  ht_fis_tiro_congelante: { motif: "arrow", color: 0x7ec8e3, accent: 0xe7f7ff, count: 1, scale: 0.38, spread: 0.16, spin: 0.2, lift: 0.1, motion: "trail", particleRate: 36 },
  ht_fis_sentinela: { motif: "shield", color: 0x759b88, accent: 0xd4a017, count: 4, scale: 0.26, spread: 0.75, spin: 0.4, lift: 0.7, motion: "ward", particleRate: 18 },
  ht_fis_flecha_rasante: { motif: "arrow", color: 0xc98940, accent: 0xf8df9b, count: 1, scale: 0.46, spread: 0.1, spin: 1.2, lift: 0.06, motion: "trail", particleRate: 40 },
  ht_fis_instinto: { motif: "fang", color: 0xd4a017, accent: 0x9dc487, count: 3, scale: 0.22, spread: 0.6, spin: 1.4, lift: 0.6, motion: "orbit", particleRate: 16 },
};

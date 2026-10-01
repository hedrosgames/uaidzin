import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const BM_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  bm_fis_lobo_guerreiro: { motif: "fang", color: 0x9f8760, accent: 0xd4a017, count: 5, scale: 0.5, spread: 0.9, spin: 0.6, lift: 1.2, motion: "totem", particleRate: 28 },
  bm_fis_couro_fera: { motif: "shield", color: 0x554634, accent: 0xc6ae79, count: 4, scale: 0.5, spread: 0.85, spin: 0.3, lift: 0.8, motion: "ward", particleRate: 20 },
  bm_fis_furia_selvagem: { motif: "claw", color: 0x9e4926, accent: 0xe1a252, count: 6, scale: 0.42, spread: 0.8, spin: 2.2, lift: 1, motion: "orbit", particleRate: 36 },
  bm_fis_investida: { motif: "fang", color: 0x806843, accent: 0xe3bb72, count: 3, scale: 0.62, spread: 0.25, spin: 0.4, lift: 0.1, motion: "trail", particleRate: 34 },
  bm_fis_garra_brutal: { motif: "claw", color: 0xc08957, accent: 0xf0d0a0, count: 3, scale: 0.72, spread: 0.35, spin: -1.6, lift: 0.2, motion: "burst", particleRate: 34 },
  bm_fis_ursao: { motif: "shield", color: 0x654c36, accent: 0xccab70, count: 6, scale: 0.65, spread: 1.05, spin: 0.25, lift: 1.1, motion: "totem", particleRate: 30 },
  bm_fis_presas_aco: { motif: "fang", color: 0xb3b5ad, accent: 0xf0d897, count: 2, scale: 0.48, spread: 0.45, spin: 0.5, lift: 1.3, motion: "ward", particleRate: 16 },
  bm_fis_tita: { motif: "crystal", color: 0x89734b, accent: 0xe3bb65, count: 8, scale: 0.65, spread: 1.35, spin: 0.4, lift: 1.5, motion: "totem", particleRate: 40 },
  bm_mag_dardo_igneo: { motif: "blade", color: 0xa34620, accent: 0xf8ba52, count: 3, scale: 0.42, spread: 0.18, spin: 1.4, lift: 0, motion: "trail", particleRate: 42 },
  bm_mag_fenda_glacial: { motif: "crystal", color: 0x448ba0, accent: 0xbce1e5, count: 4, scale: 0.48, spread: 0.26, spin: 0.5, lift: 0.2, motion: "burst", particleRate: 30 },
  bm_mag_escarpa: { motif: "crystal", color: 0x776044, accent: 0xcaa76c, count: 7, scale: 0.72, spread: 0.88, spin: 0.2, lift: 0.9, motion: "burst", particleRate: 30 },
  bm_mag_voz_trovao: { motif: "bolt", color: 0xb69c53, accent: 0xffe6a2, count: 5, scale: 0.36, spread: 0.28, spin: 1.8, lift: 0, motion: "trail", particleRate: 44 },
  bm_mag_manto: { motif: "rune", color: 0x876842, accent: 0xe5c381, count: 4, scale: 0.45, spread: 1, spin: 0.7, lift: 1.1, motion: "ward", particleRate: 24 },
  bm_mag_corrente_agua: { motif: "spiral", color: 0x387b99, accent: 0x99d5df, count: 6, scale: 0.55, spread: 0.9, spin: -1.8, lift: 0.4, motion: "orbit", particleRate: 34 },
  bm_mag_muralha: { motif: "shield", color: 0x675541, accent: 0xbba273, count: 6, scale: 0.72, spread: 1.15, spin: 0.1, lift: 0.65, motion: "ward", particleRate: 22 },
  bm_mag_furia_quatro: { motif: "star", color: 0x8b6943, accent: 0xeed078, count: 8, scale: 0.58, spread: 1, spin: 1.7, lift: 0.9, motion: "burst", particleRate: 48 },
};

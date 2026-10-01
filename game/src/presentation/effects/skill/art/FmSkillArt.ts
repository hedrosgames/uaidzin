import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const FM_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  fm_fis_impacto_longinquo: { motif: "arrow", color: 0xcc985a, accent: 0xe9d6af, count: 3, scale: 0.68, spread: 0.32, spin: 0.4, lift: 0.2, motion: "trail", particleRate: 24 },
  fm_fis_olho_falcao: { motif: "wing", color: 0xb8a273, accent: 0xffe7a1, count: 2, scale: 0.84, spread: 0.62, spin: 0.7, lift: 1.25, motion: "ward", particleRate: 18 },
  fm_fis_furia_combate: { motif: "blade", color: 0xc66336, accent: 0xf5bb63, count: 4, scale: 0.56, spread: 0.88, spin: 2.4, lift: 0.85, motion: "orbit", particleRate: 30 },
  fm_fis_guarda_solida: { motif: "shield", color: 0x657c90, accent: 0xd7bb74, count: 3, scale: 0.82, spread: 0.84, spin: 0.45, lift: 0.75, motion: "ward", particleRate: 16 },
  fm_fis_conversao_vital: { motif: "spiral", color: 0x8251bc, accent: 0x79ccab, count: 5, scale: 0.45, spread: 0.62, spin: 2.8, lift: 0.9, motion: "orbit", particleRate: 28 },
  fm_fis_mestre_arco: { motif: "arrow", color: 0x9b8050, accent: 0xf2ddb1, count: 2, scale: 0.56, spread: 0.4, spin: 0.3, lift: 1.1, motion: "totem", particleRate: 12 },
  fm_fis_ponto_critico: { motif: "star", color: 0xd4a017, accent: 0xfff0c7, count: 4, scale: 0.48, spread: 0.76, spin: 1.4, lift: 1.3, motion: "orbit", particleRate: 20 },
  fm_fis_negacao_vida: { motif: "rune", color: 0x6d3c90, accent: 0xb78da8, count: 8, scale: 0.78, spread: 1.9, spin: -0.9, lift: 0.2, motion: "ward", particleRate: 36 },
  fm_ctrl_cura: { motif: "star", color: 0xe6c873, accent: 0xb8ead7, count: 5, scale: 0.46, spread: 0.64, spin: 0.7, lift: 1.2, motion: "totem", particleRate: 26 },
  fm_ctrl_julgamento: { motif: "rune", color: 0xe3c071, accent: 0xfff1c7, count: 3, scale: 0.68, spread: 0.42, spin: 1.8, lift: 0.7, motion: "trail", particleRate: 28 },
  fm_ctrl_bencao: { motif: "shield", color: 0xba9147, accent: 0xf4e7bd, count: 4, scale: 0.66, spread: 0.82, spin: 0.6, lift: 1.0, motion: "ward", particleRate: 20 },
  fm_ctrl_purificacao: { motif: "spiral", color: 0xf0e2b8, accent: 0x80c4d5, count: 6, scale: 0.5, spread: 0.86, spin: -2.1, lift: 0.9, motion: "burst", particleRate: 32 },
};

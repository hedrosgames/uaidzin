import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const FM_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  fm_fis_impacto_longinquo: {
    motif: "rock", color: 0x749fbb, accent: 0xd0e9eb, count: 1, scale: 0.8, spread: 0,
    spin: 0, lift: 0, motion: "trail", size: [1.25, 0.7, 0.72], particleRate: 20,
    secondary: { motif: "arc", color: 0xa8c8d6, accent: 0xe8e0bd, count: 2, scale: 0.5, spread: 0.12, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
  },
  fm_fis_olho_falcao: {
    motif: "rune", color: 0xd8b969, accent: 0xf7e4ab, count: 1, scale: 0.72, spread: 0,
    spin: 0, lift: 1.92, motion: "ward", layout: "focus", size: [1.1, 0.55, 1], particleRate: 12,
    secondary: { motif: "wing", color: 0x8cb3c9, accent: 0xd8e8ea, count: 2, scale: 0.45, spread: 0.4, spin: 0.2, lift: 1.76, motion: "ward", layout: "arms", particleRate: 0 },
  },
  fm_fis_furia_combate: { motif: "arc", color: 0xb64549, accent: 0xeb9a76, count: 2, scale: 0.62, spread: 0.43, spin: 1.4, lift: 0.97, motion: "ward", layout: "arms", particleRate: 18 },
  fm_fis_guarda_solida: { motif: "shield", color: 0x779eb8, accent: 0xcce5e4, count: 4, scale: 0.7, spread: 0.5, spin: 0.18, lift: 0.86, motion: "ward", layout: "shell", particleRate: 14 },
  fm_fis_conversao_vital: {
    motif: "orb", color: 0x67a6c2, accent: 0xdec477, count: 6, scale: 0.27, spread: 0.7,
    spin: -1.4, lift: 0.55, motion: "inward", colors: [0x6aafd5, 0x7bb8cf, 0xb0c0a1, 0xc7b877, 0xdab969, 0xb9d0b4], particleRate: 18,
  },
  fm_fis_mestre_arco: {
    motif: "arc", color: 0x8eabb8, accent: 0xe6d3a0, count: 2, scale: 0.45, spread: 0.24,
    spin: 0, lift: 1.05, motion: "ward", layout: "cross", particleRate: 6,
    secondary: { motif: "arrow", color: 0xc1b38e, accent: 0xf4dfb3, count: 1, scale: 0.55, spread: 0, spin: 0, lift: 1.05, motion: "ward", layout: "focus", particleRate: 0 },
  },
  fm_fis_ponto_critico: { motif: "rune", color: 0xbd9b55, accent: 0xf5dd9d, count: 3, scale: 0.54, spread: 0, spin: 0.28, lift: 1.35, motion: "ward", layout: "focus", particleRate: 12 },
  fm_fis_negacao_vida: {
    motif: "petal", color: 0x483a5d, accent: 0x95658f, count: 8, scale: 1.35, spread: 1.5,
    spin: -0.18, lift: 0.24, motion: "burst", layout: "petals", particleRate: 22,
    secondary: { motif: "arc", color: 0x79547e, accent: 0xbe89b5, count: 1, scale: 1.7, spread: 0, spin: -0.7, lift: 0.68, motion: "ward", layout: "focus", particleRate: 0 },
  },
  fm_ctrl_cura: { motif: "petal", color: 0xd9c888, accent: 0xb9dfcc, count: 3, scale: 0.62, spread: 0.54, spin: 0.35, lift: 0.35, motion: "inward", layout: "petals", particleRate: 18 },
  fm_ctrl_julgamento: {
    motif: "rune", color: 0xc3a25f, accent: 0xf6e2b2, count: 1, scale: 1.05, spread: 0,
    spin: 0, lift: 0.05, motion: "ward", layout: "focus", delivery: "target", particleRate: 16,
    secondary: { motif: "blade", color: 0xe4d4a1, accent: 0xffe4a6, count: 1, scale: 0.78, spread: 0, spin: 0, lift: 0.1, motion: "stamp", size: [0.65, 1.7, 1], particleRate: 0 },
  },
  fm_ctrl_bencao: {
    motif: "blade", color: 0xb69a57, accent: 0xeedaab, count: 5, scale: 0.32, spread: 0.54,
    spin: 0.3, lift: 1.45, motion: "ward", layout: "crown", particleRate: 14,
    secondary: { motif: "wing", color: 0xd1caa2, accent: 0xffe7b6, count: 2, scale: 0.56, spread: 0.43, spin: 0.15, lift: 1.12, motion: "ward", layout: "arms", particleRate: 0 },
  },
  fm_ctrl_purificacao: { motif: "arc", color: 0xb8d6d7, accent: 0xffedd0, count: 3, scale: 0.88, spread: 0.28, spin: -0.8, lift: 0.35, motion: "inward", layout: "shell", particleRate: 22 },
  fm_ctrl_lanca_luz: {
    motif: "arrow", color: 0xd7bc7a, accent: 0xffe9b7, count: 1, scale: 1.24, spread: 0,
    spin: 0, lift: 0, motion: "trail", size: [0.8, 1.7, 1], particleRate: 24,
    secondary: { motif: "wing", color: 0xb7ccd0, accent: 0xede3bc, count: 2, scale: 0.38, spread: 0.22, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
  },
  fm_ctrl_vontade_divina: {
    motif: "star", color: 0xdec386, accent: 0xffe7b5, count: 5, scale: 0.24, spread: 0.48,
    spin: 0.25, lift: 1.95, motion: "ward", layout: "crown", particleRate: 14,
    secondary: { motif: "arc", color: 0xa9c6ce, accent: 0xe8deb9, count: 1, scale: 0.88, spread: 0, spin: 0.25, lift: 1.8, motion: "ward", layout: "focus", size: [1, 0.3, 1], particleRate: 0 },
  },
  fm_ctrl_castigo: {
    motif: "blade", color: 0xd5b167, accent: 0xffe4a0, count: 1, scale: 1.4, spread: 0,
    spin: 0, lift: 0.1, motion: "stamp", size: [1.4, 1.8, 1], delivery: "target", particleRate: 26,
    secondary: { motif: "crystal", color: 0xaa894d, accent: 0xebd399, count: 5, scale: 0.32, spread: 0.62, spin: 0.4, lift: 0.4, motion: "burst", particleRate: 0 },
  },
  fm_ctrl_graca_ceu: {
    motif: "arc", color: 0xc2a462, accent: 0xf5e4b3, count: 6, scale: 1.4, spread: 1.65,
    spin: 0, lift: 1.2, motion: "ward", layout: "columns", size: [1, 1.8, 1], particleRate: 28,
    secondary: { motif: "wing", color: 0xb8d0c4, accent: 0xf4e8c5, count: 8, scale: 0.46, spread: 1.4, spin: 0.3, lift: 2.4, motion: "rain", particleRate: 0 },
  },
};

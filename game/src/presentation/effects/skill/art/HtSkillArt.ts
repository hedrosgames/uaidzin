import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const HT_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  ht_fis_tiro_certeiro: {
    motif: "arrow", color: 0xc6ab76, accent: 0xefe2ba, count: 1, scale: 0.86, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 18,
    secondary: { motif: "rune", color: 0x96b5a3, accent: 0xd1dabb, count: 1, scale: 0.34, spread: 0, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
    impact: { motif: "blade", color: 0xc9bb96, accent: 0xe5d6af, count: 3, scale: 0.36, spread: 0.16, spin: 0, lift: 0, motion: "burst", layout: "fan", particleRate: 0 },
  },
  ht_fis_pes_ligeiros: {
    motif: "arc", color: 0x96bdab, accent: 0xd1dec4, count: 2, scale: 0.5, spread: 0.22,
    spin: 0.7, lift: 0.18, motion: "ward", layout: "arms", size: [1.15, 0.45, 1], particleRate: 14,
    secondary: { motif: "leaf", color: 0x81a477, accent: 0xc6d19c, count: 4, scale: 0.24, spread: 0.58, spin: 1.6, lift: 0.12, motion: "orbit", particleRate: 0 },
  },
  ht_fis_mira_aguia: {
    motif: "rune", color: 0xc6a258, accent: 0xebd599, count: 1, scale: 0.75, spread: 0,
    spin: 0, lift: 1.38, motion: "ward", layout: "focus", size: [1.2, 0.5, 1], particleRate: 12,
    secondary: { motif: "wing", color: 0x9aad8c, accent: 0xd2cc9a, count: 2, scale: 0.38, spread: 0.35, spin: 0, lift: 1.42, motion: "ward", layout: "arms", particleRate: 0 },
  },
  ht_fis_tiro_congelante: {
    motif: "arrow", color: 0x7fbbc5, accent: 0xd8ece7, count: 1, scale: 0.88, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 20,
    secondary: { motif: "wing", color: 0xa2c9cd, accent: 0xe0f0e6, count: 2, scale: 0.3, spread: 0.15, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
    impact: { motif: "crystal", color: 0x8eb9c5, accent: 0xdcece7, count: 5, scale: 0.4, spread: 0.44, spin: 0.2, lift: 0, motion: "burst", particleRate: 0 },
  },
  ht_fis_sentinela: {
    motif: "arc", color: 0x709c88, accent: 0xcccd95, count: 3, scale: 0.94, spread: 0.45,
    spin: 0.55, lift: 0.2, motion: "orbit", size: [1, 0.25, 1], particleRate: 14,
    secondary: { motif: "wing", color: 0xa1b399, accent: 0xe0d6a6, count: 1, scale: 0.42, spread: 0.35, spin: 0.2, lift: 1.55, motion: "ward", particleRate: 0 },
  },
  ht_fis_flecha_rasante: {
    motif: "arrow", color: 0xb79865, accent: 0xddcaa3, count: 1, scale: 1.15, spread: 0,
    spin: 0, lift: 0, motion: "trail", size: [0.85, 1.22, 1], particleRate: 24,
    secondary: { motif: "rock", color: 0x8e815e, accent: 0xbdaa7b, count: 5, scale: 0.11, spread: 0.12, spin: 0.3, lift: 0, motion: "trail", particleRate: 0 },
  },
  ht_fis_instinto: {
    motif: "rune", color: 0xb9a35f, accent: 0xe2d392, count: 1, scale: 0.48, spread: 0,
    spin: 0, lift: 1.3, motion: "ward", layout: "focus", particleRate: 6,
    secondary: { motif: "orb", color: 0x9faf77, accent: 0xe1d18c, count: 1, scale: 0.14, spread: 0, spin: 0, lift: 1.3, motion: "ward", layout: "focus", particleRate: 0 },
  },
  ht_fis_rapid_hit: {
    motif: "arrow", color: 0xb9aa86, accent: 0xe5d7b5, count: 1, scale: 0.86, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 28,
    secondary: { motif: "blade", color: 0x86a58c, accent: 0xc9d5ae, count: 2, scale: 0.2, spread: 0.11, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
    impact: { motif: "star", color: 0xbda975, accent: 0xe1d4aa, count: 1, scale: 0.65, spread: 0, spin: 0.3, lift: 0, motion: "burst", particleRate: 0 },
  },
  ht_ctrl_garra: {
    motif: "claw", color: 0xc1a27b, accent: 0xefd5ad, count: 1, scale: 1.22, spread: 0,
    spin: 0, lift: 0, motion: "burst", layout: "fan", particleRate: 20,
    secondary: { motif: "blade", color: 0x8caa9c, accent: 0xd4d1a3, count: 2, scale: 0.3, spread: 0.28, spin: 0.7, lift: 0.1, motion: "burst", particleRate: 0 },
  },
  ht_ctrl_mais_um_golpe: { motif: "blade", color: 0xc0a575, accent: 0xe7d9b3, count: 2, scale: 0.62, spread: 0.4, spin: 1.1, lift: 0.95, motion: "ward", layout: "arms", particleRate: 16 },
  ht_ctrl_presa_ferida: {
    motif: "claw", color: 0xa76050, accent: 0xda9e71, count: 2, scale: 0.9, spread: 0.16,
    spin: 0, lift: 0, motion: "burst", layout: "fan", particleRate: 20,
    secondary: { motif: "blade", color: 0x8f5949, accent: 0xbd8765, count: 3, scale: 0.33, spread: 0.19, spin: 0, lift: 0, motion: "rain", size: [0.5, 1.8, 0.7], particleRate: 0 },
  },
  ht_ctrl_dodge: { motif: "petal", color: 0x8caaa7, accent: 0xc2d6cc, count: 2, scale: 0.72, spread: 0.34, spin: 0.15, lift: 0.86, motion: "ward", layout: "arms", size: [0.65, 1.8, 0.6], opacity: 0.28, particleRate: 6 },
  ht_ctrl_rugido: {
    motif: "arc", color: 0xb08d55, accent: 0xdfc585, count: 1, scale: 1.25, spread: 0,
    spin: 0, lift: 0.93, motion: "burst", layout: "focus", particleRate: 22,
    secondary: { motif: "claw", color: 0xb69e6b, accent: 0xe2c996, count: 4, scale: 0.36, spread: 0.48, spin: 0.25, lift: 0.83, motion: "ward", layout: "arms", particleRate: 0 },
  },
  ht_ctrl_roubo_vital: {
    motif: "claw", color: 0xa86553, accent: 0xd2a17f, count: 1, scale: 0.95, spread: 0,
    spin: 0, lift: 0, motion: "burst", layout: "fan", particleRate: 20,
    secondary: { motif: "spiral", color: 0x9b7161, accent: 0xb8c38b, count: 3, scale: 0.42, spread: 0.28, spin: -1.1, lift: 0.08, motion: "inward", particleRate: 0 },
  },
  ht_ctrl_duas_maos: {
    motif: "blade", color: 0x9dadab, accent: 0xdccda4, count: 2, scale: 0.72, spread: 0.24,
    spin: 0, lift: 1.02, motion: "ward", layout: "cross", particleRate: 6,
    secondary: { motif: "rune", color: 0xbaaa7b, accent: 0xe4d5aa, count: 1, scale: 0.33, spread: 0, spin: 0, lift: 1.05, motion: "ward", layout: "focus", particleRate: 0 },
  },
  ht_ctrl_invisibilidade: { motif: "wing", color: 0x6f7a80, accent: 0x9aa9a2, count: 6, scale: 0.4, spread: 0.46, spin: -0.28, lift: 0.93, motion: "burst", layout: "shell", opacity: 0.48, particleRate: 10 },
  ht_mag_flecha_arcana: {
    motif: "arrow", color: 0x9a7fac, accent: 0xd6c5dc, count: 1, scale: 0.86, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 22,
    secondary: { motif: "rune", color: 0xaf95c0, accent: 0xe3ceec, count: 1, scale: 0.42, spread: 0, spin: 0.65, lift: 0, motion: "trail", particleRate: 0 },
    impact: { motif: "rune", color: 0xbca2cf, accent: 0xe8d9e9, count: 1, scale: 1, spread: 0, spin: 0.25, lift: 0, motion: "burst", particleRate: 0 },
  },
  ht_mag_flecha_ignea: {
    motif: "arrow", color: 0xb26e3e, accent: 0xf0bc75, count: 1, scale: 0.9, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 24,
    secondary: { motif: "petal", color: 0xc9813d, accent: 0xefbb6d, count: 3, scale: 0.28, spread: 0.15, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
    impact: { motif: "petal", color: 0xd58a47, accent: 0xf0c17c, count: 3, scale: 0.52, spread: 0.34, spin: 0, lift: 0.1, motion: "burst", layout: "petals", particleRate: 0 },
  },
  ht_mag_flecha_glacial: {
    motif: "arrow", color: 0x73aeba, accent: 0xd3e8df, count: 1, scale: 0.9, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 22,
    secondary: { motif: "crystal", color: 0x9dc7c9, accent: 0xdfede6, count: 5, scale: 0.26, spread: 0.24, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
    impact: { motif: "crystal", color: 0x9fcbd2, accent: 0xe1f0ed, count: 6, scale: 0.65, spread: 0.4, spin: 0, lift: 0.05, motion: "burst", layout: "petals", particleRate: 0 },
  },
  ht_mag_flecha_trovao: {
    motif: "arrow", color: 0xb3a6cc, accent: 0xe6d79e, count: 1, scale: 0.87, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 26,
    secondary: { motif: "bolt", color: 0xb09ac8, accent: 0xe2d8b5, count: 2, scale: 0.44, spread: 0.19, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
    impact: { motif: "bolt", color: 0xb59dce, accent: 0xe8dca4, count: 3, scale: 0.72, spread: 0.3, spin: 0.3, lift: 0.16, motion: "burst", particleRate: 0 },
  },
  ht_mag_chuva_mistica: {
    motif: "arrow", color: 0xa994c5, accent: 0xe1d2e9, count: 12, scale: 0.64, spread: 1.6,
    spin: 0.08, lift: 3.1, motion: "rain", particleRate: 28,
    secondary: { motif: "arc", color: 0xbdbba5, accent: 0xe5dbc1, count: 1, scale: 2.45, spread: 0, spin: 0, lift: 2.5, motion: "ward", layout: "focus", size: [1, 0.5, 1], particleRate: 0 },
  },
  ht_mag_flecha_espectral: {
    motif: "arrow", color: 0x6d6688, accent: 0xb7afcd, count: 1, scale: 0.98, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 20,
    secondary: { motif: "arrow", color: 0x9186ae, accent: 0xb9acd2, count: 2, scale: 0.86, spread: 0.21, spin: 0, lift: 0, motion: "trail", opacity: 0.26, particleRate: 0 },
  },
  ht_mag_vagalume: {
    motif: "orb", color: 0xdba849, accent: 0xffd890, count: 8, scale: 0.38, spread: 1.25,
    spin: 1.1, lift: 0.66, motion: "orbit", particleRate: 26,
    secondary: { motif: "wing", color: 0xc9bb82, accent: 0xe7d4a4, count: 8, scale: 0.2, spread: 1.25, spin: 1.1, lift: 0.7, motion: "orbit", particleRate: 0 },
  },
  ht_mag_tempestade: {
    motif: "arrow", color: 0xb3a2c8, accent: 0xdfd4ba, count: 8, scale: 0.68, spread: 1.75,
    spin: 0.1, lift: 3.3, motion: "rain", particleRate: 32,
    secondary: {
      motif: "crystal", color: 0x73acbc, accent: 0xc7ded9, count: 6, scale: 0.64, spread: 1.35,
      spin: 0.1, lift: 1.7, motion: "rain", particleRate: 0,
      secondary: { motif: "bolt", color: 0xc8b572, accent: 0xe2d0a0, count: 4, scale: 0.83, spread: 1.2, spin: -0.16, lift: 2.7, motion: "rain", particleRate: 0 },
    },
  },
};

import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const BM_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  bm_fis_lobo_guerreiro: {
    motif: "wolf", color: 0x8eaeab, accent: 0xcdcea2, count: 1, scale: 1.42, spread: 0,
    spin: 0, lift: 0.75, motion: "totem", opacity: 0.64, particleRate: 18,
    secondary: { motif: "fang", color: 0xada982, accent: 0xe8d392, count: 4, scale: 0.28, spread: 0.7, spin: 0.6, lift: 0.18, motion: "orbit", particleRate: 0 },
  },
  bm_fis_couro_fera: { motif: "shield", color: 0x76634b, accent: 0xbbaf78, count: 6, scale: 0.62, spread: 0.47, spin: 0.1, lift: 0.9, motion: "ward", layout: "shell", particleRate: 16 },
  bm_fis_furia_selvagem: {
    motif: "claw", color: 0xb7673c, accent: 0xe4b765, count: 4, scale: 0.58, spread: 0.46,
    spin: 0.45, lift: 0.87, motion: "ward", layout: "arms", particleRate: 22,
    secondary: { motif: "leaf", color: 0x88764a, accent: 0xc4aa64, count: 6, scale: 0.24, spread: 0.8, spin: 1.8, lift: 0.17, motion: "orbit", particleRate: 0 },
  },
  bm_fis_investida: { motif: "wolf", color: 0x877d5b, accent: 0xd9c484, count: 1, scale: 0.98, spread: 0, spin: 0, lift: 0, motion: "charge", opacity: 0.78, particleRate: 24 },
  bm_fis_garra_brutal: {
    motif: "claw", color: 0xbda67e, accent: 0xe9d2a3, count: 3, scale: 1.25, spread: 0.24,
    spin: 0, lift: 0, motion: "burst", layout: "fan", particleRate: 22,
    secondary: { motif: "rock", color: 0x806b4d, accent: 0xc2a66c, count: 5, scale: 0.2, spread: 0.55, spin: 1.2, lift: 0, motion: "burst", particleRate: 0 },
  },
  bm_fis_ursao: {
    motif: "bear", color: 0x9c8259, accent: 0xd8bb75, count: 1, scale: 1.7, spread: 0,
    spin: 0, lift: 0.85, motion: "totem", opacity: 0.72, particleRate: 20,
    secondary: { motif: "rock", color: 0x786b51, accent: 0xc4ad76, count: 5, scale: 0.4, spread: 1.08, spin: 0.45, lift: 0.2, motion: "orbit", particleRate: 0 },
  },
  bm_fis_presas_aco: { motif: "fang", color: 0xa6b3b7, accent: 0xdfd1a6, count: 2, scale: 0.72, spread: 0.2, spin: 0, lift: 1.38, motion: "ward", layout: "cross", particleRate: 8 },
  bm_fis_tita: {
    motif: "titan", color: 0x84775d, accent: 0xc7b575, count: 1, scale: 1.65, spread: 0,
    spin: 0, lift: 0.52, motion: "totem", opacity: 0.72, particleRate: 24,
    secondary: { motif: "rock", color: 0x68744f, accent: 0xaaa776, count: 6, scale: 0.48, spread: 1.2, spin: 0.2, lift: 0.24, motion: "burst", particleRate: 0 },
  },
  bm_mag_dardo_igneo: {
    motif: "orb", color: 0xae5427, accent: 0xeaa64c, count: 1, scale: 0.92, spread: 0,
    spin: 1.4, lift: 0, motion: "trail", size: [0.65, 1.2, 0.65], particleRate: 24,
    secondary: { motif: "petal", color: 0xd27532, accent: 0xf2bd67, count: 3, scale: 0.42, spread: 0.22, spin: 0.5, lift: 0, motion: "trail", particleRate: 0 },
  },
  bm_mag_fenda_glacial: { motif: "crystal", color: 0x578c9b, accent: 0xb7d6d5, count: 5, scale: 0.78, spread: 0.18, spin: 0, lift: 0.18, motion: "charge", particleRate: 20 },
  bm_mag_escarpa: {
    motif: "rock", color: 0x88714e, accent: 0xc9ae72, count: 3, scale: 1.45, spread: 0.45,
    spin: 0, lift: 0.4, motion: "burst", layout: "columns", size: [1, 1.5, 0.75], particleRate: 22,
    secondary: { motif: "rock", color: 0x6f684a, accent: 0xad985f, count: 7, scale: 0.27, spread: 1.08, spin: 1.2, lift: 0.2, motion: "burst", particleRate: 0 },
  },
  bm_mag_voz_trovao: {
    motif: "arc", color: 0x8597c4, accent: 0xd2bfec, count: 1, scale: 1.02, spread: 0,
    spin: 0, lift: 0, motion: "trail", particleRate: 24,
    secondary: { motif: "bolt", color: 0xaa97cf, accent: 0xe3d5a1, count: 2, scale: 0.52, spread: 0.22, spin: 0, lift: 0, motion: "trail", particleRate: 0 },
  },
  bm_mag_manto: { motif: "orb", color: 0x9fa775, accent: 0xcbd5a3, count: 4, scale: 0.44, spread: 0.54, spin: 0.85, lift: 1.1, motion: "orbit", colors: [0xba6c3b, 0x67a9bd, 0x83bac7, 0xa68b5f], particleRate: 16 },
  bm_mag_corrente_agua: {
    motif: "arc", color: 0x4b8d9e, accent: 0xb8d9d5, count: 3, scale: 2.4, spread: 0.78,
    spin: -1.5, lift: 0.3, motion: "orbit", size: [1, 0.42, 1], particleRate: 24,
    secondary: { motif: "orb", color: 0x82b8bc, accent: 0xbfe0d7, count: 8, scale: 0.22, spread: 1.25, spin: -1.8, lift: 0.4, motion: "orbit", particleRate: 0 },
  },
  bm_mag_muralha: {
    motif: "rock", color: 0x897958, accent: 0xb5ba82, count: 6, scale: 0.82, spread: 0.88,
    spin: 0, lift: 0.78, motion: "ward", layout: "columns", size: [0.7, 2.2, 0.75], particleRate: 18,
    secondary: { motif: "leaf", color: 0x668052, accent: 0xb8c17a, count: 6, scale: 0.35, spread: 0.9, spin: 0.12, lift: 1.1, motion: "ward", particleRate: 0 },
  },
  bm_mag_furia_quatro: {
    motif: "wing", color: 0xd4a034, accent: 0xf3d987, count: 2, scale: 1.45, spread: 0.35,
    spin: 0.1, lift: 1.25, motion: "ward", layout: "crown", particleRate: 26,
    secondary: { motif: "star", color: 0xdfb448, accent: 0xfff0aa, count: 6, scale: 0.28, spread: 0.85, spin: 0.6, lift: 0.45, motion: "orbit", particleRate: 0 },
  },
  bm_ctrl_condor: {
    motif: "condor", color: 0x9ba69a, accent: 0xdfd6a3, count: 1, scale: 1.14, spread: 0,
    spin: 0, lift: 1.18, motion: "totem", particleRate: 18,
    secondary: { motif: "wing", color: 0xa4ad99, accent: 0xd8d4a2, count: 5, scale: 0.28, spread: 0.8, spin: 0.7, lift: 1.6, motion: "rain", particleRate: 0 },
  },
  bm_ctrl_lobo: {
    motif: "wolf", color: 0x9ca986, accent: 0xd3d59d, count: 1, scale: 1.12, spread: 0,
    spin: 0, lift: 0.58, motion: "totem", particleRate: 18,
    secondary: { motif: "leaf", color: 0x7c9863, accent: 0xb9c97b, count: 5, scale: 0.34, spread: 0.72, spin: 0.6, lift: 0.7, motion: "burst", particleRate: 0 },
  },
  bm_ctrl_chamado_boss: { motif: "fang", color: 0xb69a60, accent: 0xf0d38c, count: 2, scale: 1.05, spread: 0.26, spin: 0, lift: 1.9, motion: "ward", layout: "cross", particleRate: 18 },
  bm_ctrl_urso: {
    motif: "bear", color: 0x8d815a, accent: 0xc7c08d, count: 1, scale: 1.12, spread: 0,
    spin: 0, lift: 0.66, motion: "totem", particleRate: 18,
    secondary: { motif: "leaf", color: 0x5f8050, accent: 0xa7bb74, count: 6, scale: 0.66, spread: 0.85, spin: 0.2, lift: 0.4, motion: "burst", layout: "petals", particleRate: 0 },
  },
  bm_ctrl_tigre: {
    motif: "tiger", color: 0xc49649, accent: 0xecc17a, count: 1, scale: 1.18, spread: 0,
    spin: 0, lift: 0.7, motion: "totem", particleRate: 20,
    secondary: { motif: "claw", color: 0xb4ae8d, accent: 0xebd0a1, count: 3, scale: 0.4, spread: 0.24, spin: 0, lift: 0.16, motion: "burst", layout: "fan", particleRate: 0 },
  },
  bm_ctrl_dragao: {
    motif: "dragon", color: 0xa8673f, accent: 0xebbc76, count: 1, scale: 1.3, spread: 0,
    spin: 0, lift: 0.84, motion: "totem", particleRate: 24,
    secondary: { motif: "rock", color: 0x73533f, accent: 0xc28143, count: 6, scale: 0.37, spread: 0.93, spin: 0.4, lift: 0.3, motion: "burst", particleRate: 0 },
  },
  bm_ctrl_vinculo: {
    motif: "orb", color: 0x86aa6d, accent: 0xd1dba1, count: 2, scale: 0.44, spread: 0.32,
    spin: 0, lift: 1.1, motion: "ward", layout: "arms", particleRate: 6,
    secondary: { motif: "arc", color: 0xa5b472, accent: 0xdacf8b, count: 1, scale: 0.56, spread: 0, spin: 0, lift: 1.1, motion: "ward", layout: "focus", size: [1.2, 0.32, 1], particleRate: 0 },
  },
  bm_ctrl_exercito: {
    motif: "wolf", color: 0x8f9b76, accent: 0xd1c889, count: 1, scale: 0.96, spread: 0.86,
    spin: 0.22, lift: 0.58, motion: "totem", particleRate: 26,
    secondary: {
      motif: "condor", color: 0xadae91, accent: 0xe1d49f, count: 1, scale: 0.98, spread: 0.18,
      spin: -0.18, lift: 1.9, motion: "totem", particleRate: 0,
      secondary: { motif: "tiger", color: 0xb48b48, accent: 0xe5c27d, count: 1, scale: 0.96, spread: -0.86, spin: -0.22, lift: 0.6, motion: "totem", particleRate: 0 },
    },
  },
};

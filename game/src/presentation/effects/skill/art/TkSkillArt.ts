import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const TK_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  tk_fis_mestre_dual: {
    motif: "blade", color: 0x9dabb8, accent: 0xd9cba5, count: 2, scale: 0.88,
    spread: 0.18, spin: 0, lift: 1.28, motion: "ward", layout: "cross", particleRate: 8,
  },
  tk_fis_increase_critical: {
    motif: "blade", color: 0xc99b4d, accent: 0xffe4a2, count: 1, scale: 0.65,
    spread: 0.46, spin: 0, lift: 1.05, motion: "ward", layout: "arms", particleRate: 6,
    size: [0.55, 1.15, 0.7],
  },
  tk_ctrl_divine_armor: {
    motif: "shield", color: 0xb99755, accent: 0xf3d59a, count: 4, scale: 0.42,
    spread: 0.38, spin: 0, lift: 0.88, motion: "ward", layout: "shell", particleRate: 8,
  },
};

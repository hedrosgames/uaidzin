import type { SkillPlaceholderArt } from "./SkillPlaceholderArt";

export const FM_SKILL_ART: Readonly<Record<string, SkillPlaceholderArt>> = {
  fm_fis_impacto_longinquo: { motif: "arrow", color: 0xcc985a, accent: 0xe9d6af, count: 3, scale: 0.68, spread: 0.32, spin: 0.4, lift: 0.2, motion: "trail", particleRate: 24 },
  fm_fis_olho_falcao: { motif: "wing", color: 0xb8a273, accent: 0xffe7a1, count: 2, scale: 0.84, spread: 0.62, spin: 0.7, lift: 1.25, motion: "ward", particleRate: 18 },
  fm_fis_furia_combate: { motif: "blade", color: 0xc66336, accent: 0xf5bb63, count: 4, scale: 0.56, spread: 0.88, spin: 2.4, lift: 0.85, motion: "orbit", particleRate: 30 },
  fm_fis_guarda_solida: { motif: "shield", color: 0x657c90, accent: 0xd7bb74, count: 3, scale: 0.82, spread: 0.84, spin: 0.45, lift: 0.75, motion: "ward", particleRate: 16 },
};

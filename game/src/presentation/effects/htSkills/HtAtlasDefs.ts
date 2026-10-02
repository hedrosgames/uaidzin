import type { StylizedSkillDefinition } from "../skill/StylizedSkillVfx";

export type HtAtlasMode = "directed" | "self" | "aoe";

export type HtDedicatedVfxId =
  | "ht-tiro-certeiro" | "ht-pes-ligeiros" | "ht-mira-aguia" | "ht-tiro-congelante"
  | "ht-sentinela" | "ht-flecha-rasante" | "ht-instinto" | "ht-rapid-hit"
  | "ht-garra" | "ht-mais-um-golpe" | "ht-presa-ferida" | "ht-dodge"
  | "ht-rugido" | "ht-roubo-vital" | "ht-duas-maos" | "ht-invisibilidade"
  | "ht-flecha-arcana" | "ht-flecha-ignea" | "ht-flecha-glacial" | "ht-flecha-trovao"
  | "ht-chuva-mistica" | "ht-flecha-espectral" | "ht-vagalume" | "ht-tempestade";

export interface HtAtlasDef extends StylizedSkillDefinition {
  dedicatedId: HtDedicatedVfxId;
  mode: HtAtlasMode;
  burstCount: number;
}

function def(
  skillId: string,
  dedicatedId: HtDedicatedVfxId,
  mode: HtAtlasMode,
  overrides: Partial<Omit<HtAtlasDef, "skillId" | "dedicatedId" | "mode">> = {},
): HtAtlasDef {
  return {
    skillId, dedicatedId, mode,
    heightOffset: mode === "aoe" ? 0.08 : mode === "self" ? 1.15 : 1.05,
    duration: mode === "directed" ? 0.46 : 0.65,
    maxConcurrentCasts: 4,
    lightPeak: 1.8,
    travel: mode === "directed",
    burstCount: 1,
    ...overrides,
  };
}

export const HT_ATLAS_DEFS: Record<HtDedicatedVfxId, HtAtlasDef> = {
  "ht-tiro-certeiro": def("ht_fis_tiro_certeiro", "ht-tiro-certeiro", "directed", { duration: 0.5 }),
  "ht-pes-ligeiros": def("ht_fis_pes_ligeiros", "ht-pes-ligeiros", "self", { duration: 0.65, lightPeak: 1.5 }),
  "ht-mira-aguia": def("ht_fis_mira_aguia", "ht-mira-aguia", "self", { duration: 0.62, lightPeak: 1.6 }),
  "ht-tiro-congelante": def("ht_fis_tiro_congelante", "ht-tiro-congelante", "directed", { duration: 0.44 }),
  "ht-sentinela": def("ht_fis_sentinela", "ht-sentinela", "self", { duration: 0.7, heightOffset: 0.8, lightPeak: 1.5 }),
  "ht-flecha-rasante": def("ht_fis_flecha_rasante", "ht-flecha-rasante", "directed", { duration: 0.42, heightOffset: 0.28, lightPeak: 1.6 }),
  "ht-instinto": def("ht_fis_instinto", "ht-instinto", "self", { duration: 0.55, lightPeak: 1.4 }),
  "ht-rapid-hit": def("ht_fis_rapid_hit", "ht-rapid-hit", "directed", { duration: 0.52, lightPeak: 2.2, burstCount: 3 }),
  "ht-garra": def("ht_ctrl_garra", "ht-garra", "directed", { duration: 0.4, heightOffset: 0.95, travel: false, lightPeak: 1.6 }),
  "ht-mais-um-golpe": def("ht_ctrl_mais_um_golpe", "ht-mais-um-golpe", "self", { duration: 0.55, lightPeak: 1.5 }),
  "ht-presa-ferida": def("ht_ctrl_presa_ferida", "ht-presa-ferida", "directed", { duration: 0.45, heightOffset: 0.95, travel: false, lightPeak: 1.5 }),
  "ht-dodge": def("ht_ctrl_dodge", "ht-dodge", "self", { duration: 0.55, lightPeak: 1.2 }),
  "ht-rugido": def("ht_ctrl_rugido", "ht-rugido", "self", { duration: 0.62, lightPeak: 2 }),
  "ht-roubo-vital": def("ht_ctrl_roubo_vital", "ht-roubo-vital", "directed", { duration: 0.48, heightOffset: 0.95, travel: false, lightPeak: 1.6 }),
  "ht-duas-maos": def("ht_ctrl_duas_maos", "ht-duas-maos", "self", { duration: 0.6, lightPeak: 1.4 }),
  "ht-invisibilidade": def("ht_ctrl_invisibilidade", "ht-invisibilidade", "self", { duration: 0.68, lightPeak: 1.2 }),
  "ht-flecha-arcana": def("ht_mag_flecha_arcana", "ht-flecha-arcana", "directed", { duration: 0.44, lightPeak: 1.9 }),
  "ht-flecha-ignea": def("ht_mag_flecha_ignea", "ht-flecha-ignea", "directed", { duration: 0.46, lightPeak: 2.1 }),
  "ht-flecha-glacial": def("ht_mag_flecha_glacial", "ht-flecha-glacial", "directed", { duration: 0.48, lightPeak: 1.9 }),
  "ht-flecha-trovao": def("ht_mag_flecha_trovao", "ht-flecha-trovao", "directed", { duration: 0.45, lightPeak: 2.4 }),
  "ht-chuva-mistica": def("ht_mag_chuva_mistica", "ht-chuva-mistica", "aoe", { duration: 0.78, lightPeak: 2.2 }),
  "ht-flecha-espectral": def("ht_mag_flecha_espectral", "ht-flecha-espectral", "directed", { duration: 0.48, lightPeak: 1.7 }),
  "ht-vagalume": def("ht_mag_vagalume", "ht-vagalume", "aoe", { duration: 0.82, lightPeak: 2.3 }),
  "ht-tempestade": def("ht_mag_tempestade", "ht-tempestade", "aoe", { duration: 0.95, lightPeak: 2.6 }),
};

export const HT_DEDICATED_VFX_BY_SKILL_ID: Record<string, HtDedicatedVfxId> = Object.fromEntries(
  Object.values(HT_ATLAS_DEFS).map(entry => [entry.skillId, entry.dedicatedId]),
) as Record<string, HtDedicatedVfxId>;

export function isHtDedicatedVfx(id: string | undefined): id is HtDedicatedVfxId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(HT_ATLAS_DEFS, id);
}

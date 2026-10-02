import type { StylizedSkillDefinition } from "../skill/StylizedSkillVfx";

export type BmAtlasMode = "directed" | "self" | "aoe" | "summon";

export type BmDedicatedVfxId =
  | "bm-lobo-guerreiro" | "bm-couro-fera" | "bm-furia-selvagem" | "bm-investida"
  | "bm-garra-brutal" | "bm-ursao" | "bm-presas-aco" | "bm-tita"
  | "bm-condor" | "bm-lobo" | "bm-chamado-boss" | "bm-urso"
  | "bm-tigre" | "bm-dragao" | "bm-vinculo" | "bm-exercito"
  | "bm-dardo-igneo" | "bm-fenda-glacial" | "bm-escarpa" | "bm-voz-trovao"
  | "bm-manto" | "bm-corrente-agua" | "bm-muralha" | "bm-furia-quatro";

export interface BmAtlasDef extends StylizedSkillDefinition {
  dedicatedId: BmDedicatedVfxId;
  mode: BmAtlasMode;
}

function def(
  skillId: string,
  dedicatedId: BmDedicatedVfxId,
  mode: BmAtlasMode,
  overrides: Partial<Omit<BmAtlasDef, "skillId" | "dedicatedId" | "mode">> = {},
): BmAtlasDef {
  return {
    skillId, dedicatedId, mode,
    heightOffset: mode === "aoe" ? 0.08 : 1.05,
    duration: mode === "directed" ? 0.55 : 0.72,
    maxConcurrentCasts: 3,
    lightPeak: 1.4,
    travel: mode === "directed",
    ...overrides,
  };
}

export const BM_ATLAS_DEFS: Record<BmDedicatedVfxId, BmAtlasDef> = {
  "bm-lobo-guerreiro": def("bm_fis_lobo_guerreiro", "bm-lobo-guerreiro", "self"),
  "bm-couro-fera": def("bm_fis_couro_fera", "bm-couro-fera", "self"),
  "bm-furia-selvagem": def("bm_fis_furia_selvagem", "bm-furia-selvagem", "self", { duration: 0.6 }),
  "bm-investida": def("bm_fis_investida", "bm-investida", "directed", { duration: 0.48 }),
  "bm-garra-brutal": def("bm_fis_garra_brutal", "bm-garra-brutal", "directed", { duration: 0.42, travel: false }),
  "bm-ursao": def("bm_fis_ursao", "bm-ursao", "self"),
  "bm-presas-aco": def("bm_fis_presas_aco", "bm-presas-aco", "self", { duration: 0.5 }),
  "bm-tita": def("bm_fis_tita", "bm-tita", "self", { duration: 0.85 }),
  "bm-condor": def("bm_ctrl_condor", "bm-condor", "summon"),
  "bm-lobo": def("bm_ctrl_lobo", "bm-lobo", "summon"),
  "bm-chamado-boss": def("bm_ctrl_chamado_boss", "bm-chamado-boss", "self"),
  "bm-urso": def("bm_ctrl_urso", "bm-urso", "summon"),
  "bm-tigre": def("bm_ctrl_tigre", "bm-tigre", "summon"),
  "bm-dragao": def("bm_ctrl_dragao", "bm-dragao", "summon", { duration: 0.9, lightPeak: 2.2 }),
  "bm-vinculo": def("bm_ctrl_vinculo", "bm-vinculo", "self"),
  "bm-exercito": def("bm_ctrl_exercito", "bm-exercito", "aoe", { duration: 0.95, lightPeak: 2 }),
  "bm-dardo-igneo": def("bm_mag_dardo_igneo", "bm-dardo-igneo", "directed", { duration: 0.5, lightPeak: 2 }),
  "bm-fenda-glacial": def("bm_mag_fenda_glacial", "bm-fenda-glacial", "directed", { heightOffset: 0.24 }),
  "bm-escarpa": def("bm_mag_escarpa", "bm-escarpa", "aoe", { duration: 0.7 }),
  "bm-voz-trovao": def("bm_mag_voz_trovao", "bm-voz-trovao", "directed", { duration: 0.52, lightPeak: 2.4 }),
  "bm-manto": def("bm_mag_manto", "bm-manto", "self"),
  "bm-corrente-agua": def("bm_mag_corrente_agua", "bm-corrente-agua", "aoe", { duration: 0.75 }),
  "bm-muralha": def("bm_mag_muralha", "bm-muralha", "self", { heightOffset: 1 }),
  "bm-furia-quatro": def("bm_mag_furia_quatro", "bm-furia-quatro", "self", { duration: 0.9, heightOffset: 1.4, lightPeak: 2.6 }),
};

export const BM_DEDICATED_VFX_BY_SKILL_ID: Record<string, BmDedicatedVfxId> = Object.fromEntries(
  Object.values(BM_ATLAS_DEFS).map(entry => [entry.skillId, entry.dedicatedId]),
) as Record<string, BmDedicatedVfxId>;

export function isBmDedicatedVfx(id: string | undefined): id is BmDedicatedVfxId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(BM_ATLAS_DEFS, id);
}

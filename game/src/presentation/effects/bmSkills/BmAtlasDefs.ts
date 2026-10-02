export type BmAtlasMode = "directed" | "self" | "aoe" | "summon";

export type BmDedicatedVfxId =
  | "bm-lobo-guerreiro"
  | "bm-couro-fera"
  | "bm-furia-selvagem"
  | "bm-investida"
  | "bm-garra-brutal"
  | "bm-ursao"
  | "bm-presas-aco"
  | "bm-tita"
  | "bm-condor"
  | "bm-lobo"
  | "bm-chamado-boss"
  | "bm-urso"
  | "bm-tigre"
  | "bm-dragao"
  | "bm-vinculo"
  | "bm-exercito"
  | "bm-dardo-igneo"
  | "bm-fenda-glacial"
  | "bm-escarpa"
  | "bm-voz-trovao"
  | "bm-manto"
  | "bm-corrente-agua"
  | "bm-muralha"
  | "bm-furia-quatro";

export interface BmAtlasDef {
  skillId: string;
  dedicatedId: BmDedicatedVfxId;
  atlasUrl: string;
  tint: number;
  mode: BmAtlasMode;
  width: number;
  height: number;
  heightOffset: number;
  duration: number;
  frameCount: number;
  maxConcurrentCasts: number;
  lightPeak: number;
  additive: boolean;
  travel: boolean;
}

function atlas(skillId: string): string {
  return `/assets/vfx/spritesheets/skills/BM/${skillId}.png`;
}

function def(
  skillId: string,
  dedicatedId: BmDedicatedVfxId,
  mode: BmAtlasMode,
  tint: number,
  overrides: Partial<Omit<BmAtlasDef, "skillId" | "dedicatedId" | "atlasUrl" | "mode" | "tint">> = {},
): BmAtlasDef {
  return {
    skillId,
    dedicatedId,
    atlasUrl: atlas(skillId),
    tint,
    mode,
    width: overrides.width ?? (mode === "aoe" ? 3.4 : mode === "summon" ? 2.4 : 2.1),
    height: overrides.height ?? (mode === "aoe" ? 3.4 : mode === "summon" ? 2.6 : 1.55),
    heightOffset: overrides.heightOffset ?? (mode === "aoe" ? 0.08 : 1.05),
    duration: overrides.duration ?? (mode === "directed" ? 0.55 : 0.72),
    frameCount: overrides.frameCount ?? 16,
    maxConcurrentCasts: overrides.maxConcurrentCasts ?? 3,
    lightPeak: overrides.lightPeak ?? 1.4,
    additive: overrides.additive ?? true,
    travel: overrides.travel ?? mode === "directed",
  };
}

export const BM_ATLAS_DEFS: Record<BmDedicatedVfxId, BmAtlasDef> = {
  "bm-lobo-guerreiro": def("bm_fis_lobo_guerreiro", "bm-lobo-guerreiro", "self", 0xc8b28a, { width: 2.3, height: 2.5, heightOffset: 1.15 }),
  "bm-couro-fera": def("bm_fis_couro_fera", "bm-couro-fera", "self", 0xb8895a, { width: 2.2, height: 2.4 }),
  "bm-furia-selvagem": def("bm_fis_furia_selvagem", "bm-furia-selvagem", "self", 0xd4a017, { width: 2.15, height: 1.8, duration: 0.6 }),
  "bm-investida": def("bm_fis_investida", "bm-investida", "directed", 0xc45c26, { width: 2.4, height: 1.35, duration: 0.48, travel: true }),
  "bm-garra-brutal": def("bm_fis_garra_brutal", "bm-garra-brutal", "directed", 0xd6c7b0, { width: 2.2, height: 1.7, duration: 0.42, travel: false }),
  "bm-ursao": def("bm_fis_ursao", "bm-ursao", "self", 0xc9a66b, { width: 2.8, height: 3.0, heightOffset: 1.35 }),
  "bm-presas-aco": def("bm_fis_presas_aco", "bm-presas-aco", "self", 0xd8dde6, { width: 1.8, height: 1.8, duration: 0.5 }),
  "bm-tita": def("bm_fis_tita", "bm-tita", "self", 0xa89070, { width: 3.1, height: 3.4, heightOffset: 1.5, duration: 0.85 }),
  "bm-condor": def("bm_ctrl_condor", "bm-condor", "summon", 0xb7c4d4, { width: 2.6, height: 2.4 }),
  "bm-lobo": def("bm_ctrl_lobo", "bm-lobo", "summon", 0xc8b28a),
  "bm-chamado-boss": def("bm_ctrl_chamado_boss", "bm-chamado-boss", "self", 0xe4c86a, { width: 2.5, height: 2.8, heightOffset: 1.6 }),
  "bm-urso": def("bm_ctrl_urso", "bm-urso", "summon", 0xb8895a, { width: 2.8, height: 2.7 }),
  "bm-tigre": def("bm_ctrl_tigre", "bm-tigre", "summon", 0xd4a017, { width: 2.7, height: 2.5 }),
  "bm-dragao": def("bm_ctrl_dragao", "bm-dragao", "summon", 0xd63a20, { width: 3.2, height: 3.0, duration: 0.9, lightPeak: 2.2 }),
  "bm-vinculo": def("bm_ctrl_vinculo", "bm-vinculo", "self", 0x7ecf6a, { width: 2.0, height: 1.6, heightOffset: 1.2 }),
  "bm-exercito": def("bm_ctrl_exercito", "bm-exercito", "aoe", 0xe4c86a, { width: 4.2, height: 4.2, duration: 0.95, lightPeak: 2 }),
  "bm-dardo-igneo": def("bm_mag_dardo_igneo", "bm-dardo-igneo", "directed", 0xff8a2b, { width: 1.6, height: 1.1, duration: 0.5, travel: true, lightPeak: 2 }),
  "bm-fenda-glacial": def("bm_mag_fenda_glacial", "bm-fenda-glacial", "directed", 0x9ddfff, { width: 2.0, height: 1.6, duration: 0.55, travel: true }),
  "bm-escarpa": def("bm_mag_escarpa", "bm-escarpa", "aoe", 0xb8895a, { width: 3.8, height: 3.8, duration: 0.7 }),
  "bm-voz-trovao": def("bm_mag_voz_trovao", "bm-voz-trovao", "directed", 0xb07cff, { width: 2.2, height: 1.5, duration: 0.52, travel: true, lightPeak: 2.4 }),
  "bm-manto": def("bm_mag_manto", "bm-manto", "self", 0x7ecf6a, { width: 2.4, height: 2.6, heightOffset: 1.1 }),
  "bm-corrente-agua": def("bm_mag_corrente_agua", "bm-corrente-agua", "aoe", 0x4fc3f7, { width: 4.0, height: 4.0, duration: 0.75 }),
  "bm-muralha": def("bm_mag_muralha", "bm-muralha", "self", 0xa89070, { width: 2.8, height: 2.6, heightOffset: 1.0 }),
  "bm-furia-quatro": def("bm_mag_furia_quatro", "bm-furia-quatro", "aoe", 0xffc24a, { width: 4.8, height: 4.8, duration: 0.95, lightPeak: 2.6 }),
};

export const BM_DEDICATED_VFX_BY_SKILL_ID: Record<string, BmDedicatedVfxId> = Object.fromEntries(
  Object.values(BM_ATLAS_DEFS).map((entry) => [entry.skillId, entry.dedicatedId]),
) as Record<string, BmDedicatedVfxId>;

export function isBmDedicatedVfx(id: string | undefined): id is BmDedicatedVfxId {
  return typeof id === "string" && id in BM_ATLAS_DEFS;
}

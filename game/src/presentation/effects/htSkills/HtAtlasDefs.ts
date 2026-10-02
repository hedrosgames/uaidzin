export type HtAtlasMode = "directed" | "self" | "aoe";

export type HtDedicatedVfxId =
  | "ht-tiro-certeiro"
  | "ht-pes-ligeiros"
  | "ht-mira-aguia"
  | "ht-tiro-congelante"
  | "ht-sentinela"
  | "ht-flecha-rasante"
  | "ht-instinto"
  | "ht-rapid-hit"
  | "ht-garra"
  | "ht-mais-um-golpe"
  | "ht-presa-ferida"
  | "ht-dodge"
  | "ht-rugido"
  | "ht-roubo-vital"
  | "ht-duas-maos"
  | "ht-invisibilidade"
  | "ht-flecha-arcana"
  | "ht-flecha-ignea"
  | "ht-flecha-glacial"
  | "ht-flecha-trovao"
  | "ht-chuva-mistica"
  | "ht-flecha-espectral"
  | "ht-vagalume"
  | "ht-tempestade";

export interface HtAtlasDef {
  skillId: string;
  dedicatedId: HtDedicatedVfxId;
  atlasUrl: string;
  tint: number;
  mode: HtAtlasMode;
  width: number;
  height: number;
  heightOffset: number;
  duration: number;
  frameCount: number;
  maxConcurrentCasts: number;
  lightPeak: number;
  additive: boolean;
  travel: boolean;
  crossPlane: boolean;
  burstCount: number;
}

const HT_GENERATED_ATLASES = new Set<string>([
  "ht_fis_tiro_certeiro",
  "ht_fis_pes_ligeiros",
]);

function atlas(skillId: string, fallbackPath: string): string {
  if (HT_GENERATED_ATLASES.has(skillId)) {
    return `/assets/vfx/spritesheets/skills/HT/${skillId}.png`;
  }
  return fallbackPath;
}

function def(
  skillId: string,
  dedicatedId: HtDedicatedVfxId,
  mode: HtAtlasMode,
  tint: number,
  fallbackPath: string,
  overrides: Partial<Omit<HtAtlasDef, "skillId" | "dedicatedId" | "atlasUrl" | "mode" | "tint">> = {},
): HtAtlasDef {
  return {
    skillId,
    dedicatedId,
    atlasUrl: atlas(skillId, fallbackPath),
    tint,
    mode,
    width: overrides.width ?? (mode === "aoe" ? 4.0 : 2.2),
    height: overrides.height ?? (mode === "aoe" ? 4.0 : mode === "self" ? 2.4 : 1.2),
    heightOffset: overrides.heightOffset ?? (mode === "aoe" ? 0.08 : mode === "self" ? 1.15 : 1.05),
    duration: overrides.duration ?? (mode === "directed" ? 0.46 : 0.65),
    frameCount: overrides.frameCount ?? 16,
    maxConcurrentCasts: overrides.maxConcurrentCasts ?? 4,
    lightPeak: overrides.lightPeak ?? 1.8,
    additive: overrides.additive ?? true,
    travel: overrides.travel ?? (mode === "directed"),
    crossPlane: overrides.crossPlane ?? (mode === "directed" && (overrides.travel ?? true)),
    burstCount: overrides.burstCount ?? 1,
  };
}

const ARROW_ATLAS = "/assets/vfx/spritesheets/skills/HT/ht_fis_tiro_certeiro.png";
const BUFF_ATLAS = "/assets/vfx/spritesheets/skills/HT/ht_fis_pes_ligeiros.png";
const CLAW_ATLAS = "/assets/vfx/spritesheets/skills/BM/bm_fis_garra_brutal.png";
const ROAR_ATLAS = "/assets/vfx/spritesheets/skills/BM/bm_fis_furia_selvagem.png";
const AOE_ATLAS = "/assets/vfx/spritesheets/skills/BM/bm_mag_furia_quatro.png";
const FIRE_ATLAS = "/assets/vfx/spritesheets/skills/BM/bm_mag_dardo_igneo.png";
const ICE_ATLAS = "/assets/vfx/spritesheets/skills/BM/bm_mag_fenda_glacial.png";
const LIGHTNING_ATLAS = "/assets/vfx/spritesheets/skills/BM/bm_mag_voz_trovao.png";

export const HT_ATLAS_DEFS: Record<HtDedicatedVfxId, HtAtlasDef> = {
  "ht-tiro-certeiro": def("ht_fis_tiro_certeiro", "ht-tiro-certeiro", "directed", 0x82b8a0, ARROW_ATLAS, {
    width: 2.2,
    height: 1.1,
    duration: 0.5,
    lightPeak: 1.8,
  }),
  "ht-pes-ligeiros": def("ht_fis_pes_ligeiros", "ht-pes-ligeiros", "self", 0x76bc9d, BUFF_ATLAS, {
    width: 2.2,
    height: 2.4,
    duration: 0.65,
    lightPeak: 1.5,
  }),
  "ht-mira-aguia": def("ht_fis_mira_aguia", "ht-mira-aguia", "self", 0xd4a017, BUFF_ATLAS, {
    width: 2.1,
    height: 2.3,
    duration: 0.62,
    lightPeak: 1.6,
  }),
  "ht-tiro-congelante": def("ht_fis_tiro_congelante", "ht-tiro-congelante", "directed", 0x7ec8e3, ICE_ATLAS, {
    width: 2.2,
    height: 1.2,
    duration: 0.44,
    lightPeak: 1.8,
  }),
  "ht-sentinela": def("ht_fis_sentinela", "ht-sentinela", "self", 0x759b88, BUFF_ATLAS, {
    width: 2.6,
    height: 2.6,
    heightOffset: 0.8,
    duration: 0.70,
    lightPeak: 1.5,
  }),
  "ht-flecha-rasante": def("ht_fis_flecha_rasante", "ht-flecha-rasante", "directed", 0xc98940, ARROW_ATLAS, {
    width: 2.4,
    height: 1.0,
    heightOffset: 0.28,
    duration: 0.42,
    lightPeak: 1.6,
  }),
  "ht-instinto": def("ht_fis_instinto", "ht-instinto", "self", 0xd4a017, BUFF_ATLAS, {
    width: 1.9,
    height: 1.9,
    duration: 0.55,
    lightPeak: 1.4,
  }),
  "ht-rapid-hit": def("ht_fis_rapid_hit", "ht-rapid-hit", "directed", 0xd5b873, ARROW_ATLAS, {
    width: 2.5,
    height: 1.4,
    duration: 0.52,
    lightPeak: 2.2,
    burstCount: 3,
  }),
  "ht-garra": def("ht_ctrl_garra", "ht-garra", "directed", 0xc45c26, CLAW_ATLAS, {
    width: 2.2,
    height: 1.8,
    heightOffset: 0.95,
    duration: 0.40,
    travel: false,
    crossPlane: false,
    lightPeak: 1.6,
  }),
  "ht-mais-um-golpe": def("ht_ctrl_mais_um_golpe", "ht-mais-um-golpe", "self", 0xc69451, BUFF_ATLAS, {
    width: 2.0,
    height: 2.0,
    duration: 0.55,
    lightPeak: 1.5,
  }),
  "ht-presa-ferida": def("ht_ctrl_presa_ferida", "ht-presa-ferida", "directed", 0xa33b3b, CLAW_ATLAS, {
    width: 2.2,
    height: 1.8,
    heightOffset: 0.95,
    duration: 0.45,
    travel: false,
    crossPlane: false,
    lightPeak: 1.5,
  }),
  "ht-dodge": def("ht_ctrl_dodge", "ht-dodge", "self", 0x829cad, BUFF_ATLAS, {
    width: 2.2,
    height: 2.4,
    duration: 0.55,
    lightPeak: 1.2,
  }),
  "ht-rugido": def("ht_ctrl_rugido", "ht-rugido", "self", 0xc86d38, ROAR_ATLAS, {
    width: 2.8,
    height: 2.6,
    duration: 0.62,
    lightPeak: 2.0,
  }),
  "ht-roubo-vital": def("ht_ctrl_roubo_vital", "ht-roubo-vital", "directed", 0xa33b3b, CLAW_ATLAS, {
    width: 2.3,
    height: 1.9,
    heightOffset: 0.95,
    duration: 0.48,
    travel: false,
    crossPlane: false,
    lightPeak: 1.6,
  }),
  "ht-duas-maos": def("ht_ctrl_duas_maos", "ht-duas-maos", "self", 0xc9a26c, BUFF_ATLAS, {
    width: 2.0,
    height: 2.2,
    duration: 0.60,
    lightPeak: 1.4,
  }),
  "ht-invisibilidade": def("ht_ctrl_invisibilidade", "ht-invisibilidade", "self", 0x57476d, BUFF_ATLAS, {
    width: 2.4,
    height: 2.6,
    duration: 0.68,
    lightPeak: 1.2,
  }),
  "ht-flecha-arcana": def("ht_mag_flecha_arcana", "ht-flecha-arcana", "directed", 0xb07cff, ARROW_ATLAS, {
    width: 2.2,
    height: 1.2,
    duration: 0.44,
    lightPeak: 1.9,
  }),
  "ht-flecha-ignea": def("ht_mag_flecha_ignea", "ht-flecha-ignea", "directed", 0xff6a1a, FIRE_ATLAS, {
    width: 2.3,
    height: 1.3,
    duration: 0.46,
    lightPeak: 2.1,
  }),
  "ht-flecha-glacial": def("ht_mag_flecha_glacial", "ht-flecha-glacial", "directed", 0x7ec8e3, ICE_ATLAS, {
    width: 2.2,
    height: 1.25,
    duration: 0.48,
    lightPeak: 1.9,
  }),
  "ht-flecha-trovao": def("ht_mag_flecha_trovao", "ht-flecha-trovao", "directed", 0xb07cff, LIGHTNING_ATLAS, {
    width: 2.4,
    height: 1.4,
    duration: 0.45,
    lightPeak: 2.4,
  }),
  "ht-chuva-mistica": def("ht_mag_chuva_mistica", "ht-chuva-mistica", "aoe", 0xb07cff, AOE_ATLAS, {
    width: 4.2,
    height: 4.2,
    duration: 0.78,
    lightPeak: 2.2,
  }),
  "ht-flecha-espectral": def("ht_mag_flecha_espectral", "ht-flecha-espectral", "directed", 0x6a4a8a, ARROW_ATLAS, {
    width: 2.3,
    height: 1.2,
    duration: 0.48,
    lightPeak: 1.7,
  }),
  "ht-vagalume": def("ht_mag_vagalume", "ht-vagalume", "aoe", 0xffaa2b, AOE_ATLAS, {
    width: 4.0,
    height: 4.0,
    duration: 0.82,
    lightPeak: 2.3,
  }),
  "ht-tempestade": def("ht_mag_tempestade", "ht-tempestade", "aoe", 0xffd24a, AOE_ATLAS, {
    width: 5.0,
    height: 5.0,
    duration: 0.95,
    lightPeak: 2.6,
  }),
};

export const HT_DEDICATED_VFX_BY_SKILL_ID: Record<string, HtDedicatedVfxId> = Object.fromEntries(
  Object.values(HT_ATLAS_DEFS).map((entry) => [entry.skillId, entry.dedicatedId]),
) as Record<string, HtDedicatedVfxId>;

export function isHtDedicatedVfx(id: string | undefined): id is HtDedicatedVfxId {
  return typeof id === "string" && id in HT_ATLAS_DEFS;
}

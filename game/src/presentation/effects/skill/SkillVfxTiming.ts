import type { SkillVfxFamily, SkillVfxRequest } from "./SkillVfxTypes";
import { DEFAULT_ESFERA_IGNEA_VFX_CONFIG } from "../fmSkills/esfera-ignea/EsferaIgneaVfx";
import { DEFAULT_LANCA_GLACIAL_VFX_CONFIG } from "../fmSkills/lanca-glacial/LancaGlacialVfx";
import { DEFAULT_CHOQUE_VITAL_VFX_CONFIG } from "../fmSkills/choque-vital/ChoqueVitalVfx";
import { DEFAULT_PICADA_PECONHENTA_VFX_CONFIG } from "../fmSkills/picada-peconhenta/PicadaPeconhentaVfx";
import { DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG } from "../fmSkills/tempestade-brasa/TempestadeBrasaVfx";
import { DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG } from "../fmSkills/sombra-corrosiva/SombraCorrosivaVfx";
import { DEFAULT_NEVASCA_VFX_CONFIG } from "../fmSkills/nevasca/NevascaVfx";
import { DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG } from "../fmSkills/colapso-elemental/ColapsoElementalVfx";
import { LAMINA_ENERGIA_TIMING, laminaEnergiaEndpoints, laminaEnergiaFlightDuration } from "../tkSkills/lamina-energia/LaminaEnergiaTiming";
import { HT_ATLAS_DEFS, isHtDedicatedVfx, type HtDedicatedVfxId } from "../htSkills/HtAtlasDefs";

export function skillVfxDuration(family: SkillVfxFamily): number {
  if (family === "projectile") return 0.58;
  if (family === "arrow") return 0.5;
  if (family === "line") return 0.44;
  if (family === "melee") return 0.3;
  if (family === "aoe") return 0.72;
  if (family === "passive") return 0.64;
  if (family === "transform") return 1.05;
  if (family === "summon") return 0.92;
  return 0.86;
}

export function htSkillVfxDuration(dedicatedId: HtDedicatedVfxId): number {
  return HT_ATLAS_DEFS[dedicatedId]?.duration ?? skillVfxDuration("arrow");
}

export function skillVfxImpactDelay(request: SkillVfxRequest): number {
  const dedicated = request.profile.dedicatedVfx;
  if (dedicated === "lamina-energia") {
    const points = laminaEnergiaEndpoints(request.origin, request.target ?? request.center, request.attackPoint);
    return LAMINA_ENERGIA_TIMING.releaseDuration + laminaEnergiaFlightDuration(points.origin.distanceTo(points.target));
  }
  if (dedicated === "tempestade-brasa") return DEFAULT_TEMPESTADE_BRASA_VFX_CONFIG.telegraphDuration;
  if (dedicated === "nevasca") return DEFAULT_NEVASCA_VFX_CONFIG.telegraphDuration;
  if (dedicated === "colapso-elemental") return DEFAULT_COLAPSO_ELEMENTAL_VFX_CONFIG.telegraphDuration;
  const config = dedicated === "esfera-ignea" ? DEFAULT_ESFERA_IGNEA_VFX_CONFIG
    : dedicated === "lanca-glacial" ? DEFAULT_LANCA_GLACIAL_VFX_CONFIG
    : dedicated === "choque-vital" ? DEFAULT_CHOQUE_VITAL_VFX_CONFIG
    : dedicated === "picada-peconhenta" ? DEFAULT_PICADA_PECONHENTA_VFX_CONFIG
    : dedicated === "sombra-corrosiva" ? DEFAULT_SOMBRA_CORROSIVA_VFX_CONFIG : null;
  if (config) {
    const dx = (request.target?.x ?? request.center.x) - request.origin.x;
    const dz = (request.target?.z ?? request.center.z) - request.origin.z;
    const dy = config.targetHeight - config.originHeight;
    const flight = Math.hypot(dx, dy, dz) / config.speed;
    return config.chargeDuration + Math.min(config.maxFlightDuration, Math.max(config.minFlightDuration, flight));
  }
  if (isHtDedicatedVfx(dedicated)) {
    const def = HT_ATLAS_DEFS[dedicated];
    if (def.mode === "aoe") return 0.18;
    if (def.mode === "self") return 0;
    if (!def.travel) return skillVfxDuration("melee");
    return skillVfxDuration("arrow");
  }
  const family = request.profile.family;
  if (family === "aoe") return 0.18;
  if (["projectile", "arrow", "line", "melee"].includes(family)) return skillVfxDuration(family);
  return 0;
}

import type { SkillVfxFamily, SkillVfxRequest } from "./SkillVfxTypes";
import { DEFAULT_ESFERA_IGNEA_VFX_CONFIG } from "../fmSkills/esfera-ignea/EsferaIgneaVfx";
import { DEFAULT_LANCA_GLACIAL_VFX_CONFIG } from "../fmSkills/lanca-glacial/LancaGlacialVfx";
import { DEFAULT_CHOQUE_VITAL_VFX_CONFIG } from "../fmSkills/choque-vital/ChoqueVitalVfx";

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

export function skillVfxImpactDelay(request: SkillVfxRequest): number {
  const dedicated = request.profile.dedicatedVfx;
  const config = dedicated === "esfera-ignea" ? DEFAULT_ESFERA_IGNEA_VFX_CONFIG
    : dedicated === "lanca-glacial" ? DEFAULT_LANCA_GLACIAL_VFX_CONFIG
    : dedicated === "choque-vital" ? DEFAULT_CHOQUE_VITAL_VFX_CONFIG : null;
  if (config) {
    const dx = (request.target?.x ?? request.center.x) - request.origin.x;
    const dz = (request.target?.z ?? request.center.z) - request.origin.z;
    const dy = config.targetHeight - config.originHeight;
    const flight = Math.hypot(dx, dy, dz) / config.speed;
    return config.chargeDuration + Math.min(config.maxFlightDuration, Math.max(config.minFlightDuration, flight));
  }
  const family = request.profile.family;
  if (family === "aoe") return 0.18;
  if (["projectile", "arrow", "line", "melee"].includes(family)) return skillVfxDuration(family);
  return 0;
}

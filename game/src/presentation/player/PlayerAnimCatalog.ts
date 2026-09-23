import type { WeaponSetId } from "./WeaponRig";

export const HUMAN_ANIM_ROOT = "/models/anims/human";
export const MUTANT_ANIM_ROOT = "/models/anims/mutant";
export const LEGACY_SHARED_ANIM_ROOT = "/models/player/shared/anims";

export type HumanCombatClip =
  | "run"
  | "cast"
  | "hit_gut"
  | "hit_right"
  | "death";

export type HumanAttackClip =
  | "attack"
  | "attack_1h"
  | "attack_2h"
  | "attack_bow"
  | "attack_greatsword"
  | "attack_unarmed"
  | "attack_swipe"
  | "attack_kick";

export type HumanIdleClip = "idle_2h" | "idle_greatsword";

export type HumanCastClip = "cast" | "cast_fire" | "cast_heal";

export type MutantClip =
  | "idle"
  | "run"
  | "attack"
  | "attack_punch"
  | "death"
  | "roar";

export type BmFormMeshId = "lobo" | "urso" | "tita" | "eden";

export const BM_FORM_MESH: Record<string, BmFormMeshId> = {
  lobo: "lobo",
  wolf: "lobo",
  urso: "urso",
  bear: "urso",
  tita: "tita",
  golem: "tita",
  eden: "eden",
};

export function humanAnimUrl(clip: string): string {
  return `${HUMAN_ANIM_ROOT}/${clip}.glb`;
}

export function mutantAnimUrl(clip: MutantClip): string {
  return `${MUTANT_ANIM_ROOT}/${clip}.glb`;
}

export function attackClipForWeapon(set: WeaponSetId): HumanAttackClip {
  switch (set) {
    case "dual-sword":
    case "dual-axe":
      return "attack_1h";
    case "greatsword":
      return "attack_greatsword";
    case "dual-gloves":
      return "attack_swipe";
    case "greatstaff":
    case "staff-shield":
      return "attack_2h";
    case "bow":
      return "attack_bow";
    default:
      return "attack";
  }
}

export function idleClipForWeapon(set: WeaponSetId): HumanIdleClip | null {
  switch (set) {
    case "greatsword":
      return "idle_greatsword";
    case "greatstaff":
    case "staff-shield":
      return "idle_2h";
    default:
      return null;
  }
}

export function humanCombatUrl(clip: HumanCombatClip): string {
  if (clip === "death") {
    return `${LEGACY_SHARED_ANIM_ROOT}/death.glb`;
  }
  return humanAnimUrl(clip);
}

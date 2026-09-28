export const HUMAN_ANIM_ROOT = "/models/anims/human";
export const LEGACY_SHARED_ANIM_ROOT = "/models/player/shared/anims";
export const SHARED_IDLE_URL = `${LEGACY_SHARED_ANIM_ROOT}/idle.glb`;

export type HumanCombatClip = "run" | "cast" | "hit_gut" | "hit_right" | "death";

export type HumanAttackClip =
  | "attack"
  | "attack_1h"
  | "attack_2h"
  | "attack_bow"
  | "attack_greatsword"
  | "attack_swipe";

export type HumanIdleClip = "idle_2h" | "idle_greatsword";

export function humanAnimUrl(clip: string): string {
  return `${HUMAN_ANIM_ROOT}/${clip}.glb`;
}

export function idleAnimUrl(clip: HumanIdleClip): string {
  return humanAnimUrl(clip);
}

export function humanCombatUrl(clip: HumanCombatClip): string {
  if (clip === "death") {
    return `${LEGACY_SHARED_ANIM_ROOT}/death.glb`;
  }
  return humanAnimUrl(clip);
}

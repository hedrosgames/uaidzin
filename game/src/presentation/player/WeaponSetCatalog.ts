import catalog from "./weapon-set-catalog.json";

export type WeaponSetId =
  | "dual-axe"
  | "axe-shield"
  | "sword-shield"
  | "dual-sword"
  | "greatsword"
  | "dual-gloves"
  | "staff-shield"
  | "greatstaff"
  | "bow";

export type WeaponModelId =
  | "axe"
  | "sword"
  | "greatsword"
  | "staff"
  | "greatstaff"
  | "bow"
  | "shield"
  | "glove";

export type WeaponIdleId = "class" | "idle_2h" | "idle_greatsword";

export type WeaponAttackClipId =
  | "attack"
  | "attack_1h"
  | "attack_2h"
  | "attack_bow"
  | "attack_greatsword"
  | "attack_swipe";

export type WeaponBasicAnim = "attack" | "cast";

export type PlayerClassId = "TK" | "FM" | "BM" | "HT";

export interface WeaponSetDef {
  label: string;
  right?: WeaponModelId;
  left?: WeaponModelId;
  idle: WeaponIdleId;
  attackClip: WeaponAttackClipId;
  basicAnim: WeaponBasicAnim;
}

export const WEAPON_SET_IDS = catalog.ids as readonly WeaponSetId[];

export const WEAPON_SETS = catalog.sets as Record<WeaponSetId, WeaponSetDef>;

export const WEAPON_SET_LABEL = Object.fromEntries(
  WEAPON_SET_IDS.map((id) => [id, WEAPON_SETS[id].label]),
) as Record<WeaponSetId, string>;

export const CLASS_WEAPON_SET = catalog.classDefault as Record<PlayerClassId, WeaponSetId>;

export function isWeaponSetId(id: string): id is WeaponSetId {
  return (WEAPON_SET_IDS as readonly string[]).includes(id);
}

export function isPlayerClassId(id: string): id is PlayerClassId {
  return id === "TK" || id === "FM" || id === "BM" || id === "HT";
}

export function weaponSetDef(set: WeaponSetId): WeaponSetDef {
  return WEAPON_SETS[set];
}

export function idleClipForWeapon(set: WeaponSetId): WeaponIdleId {
  return WEAPON_SETS[set].idle;
}

export function attackClipForWeapon(set: WeaponSetId): WeaponAttackClipId {
  return WEAPON_SETS[set].attackClip;
}

export function basicAnimForWeapon(set: WeaponSetId): WeaponBasicAnim {
  return WEAPON_SETS[set].basicAnim;
}

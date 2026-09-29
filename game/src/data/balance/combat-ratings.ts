import type { CombatMods } from "../../domain/combat/CombatMods";
import { PROGRESSION_BALANCE } from "./progression";

const BASE_DES = PROGRESSION_BALANCE.baseAttributes.DES;
const MORTAL_MAX_LEVEL = PROGRESSION_BALANCE.evolutions.Mortal.maxLevel;

export const COMBAT_RATING_CAPS = {
  critChance: 1,
  evasion: 0.4,
  critFromDes: 0.4,
  evasionFromDes: 0.1,
  enemyEvasion: 0.1,
  enemyCrit: 0.5,
} as const;

export const ENEMY_DEFAULT_CRIT_CHANCE = 0.1;

export function clampEnemyEvasion(value: number): number {
  return Math.min(COMBAT_RATING_CAPS.enemyEvasion, Math.max(0, value));
}

export function clampEnemyCritChance(value?: number): number {
  const raw = value ?? ENEMY_DEFAULT_CRIT_CHANCE;
  return Math.min(COMBAT_RATING_CAPS.enemyCrit, Math.max(0, raw));
}

export const FULL_DES_AT_MAX_LEVEL =
  BASE_DES + (MORTAL_MAX_LEVEL - 1) * PROGRESSION_BALANCE.attributesPerLevel;

const MAX_DES_INVEST = FULL_DES_AT_MAX_LEVEL - BASE_DES;

const CRIT_DES_CURVE_EXP = 1.45;

function desProgress(des: number): number {
  if (MAX_DES_INVEST <= 0) return 0;
  const invested = Math.max(0, des - BASE_DES);
  return Math.min(1, invested / MAX_DES_INVEST);
}

export function critChanceFromDes(des: number): number {
  const t = desProgress(des);
  return COMBAT_RATING_CAPS.critFromDes * Math.pow(t, CRIT_DES_CURVE_EXP);
}

export function evasionFromDes(des: number): number {
  const t = desProgress(des);
  return COMBAT_RATING_CAPS.evasionFromDes * t;
}

export function applyPlayerCombatRatings(
  mods: CombatMods,
  input: { des: number; equipCritPercent?: number },
): void {
  mods.critChance += critChanceFromDes(input.des);
  mods.critChance += Math.max(0, input.equipCritPercent ?? 0) * 0.01;
  mods.critChance = Math.min(COMBAT_RATING_CAPS.critChance, Math.max(0, mods.critChance));

  mods.evasion += evasionFromDes(input.des);
  mods.evasion = Math.min(COMBAT_RATING_CAPS.evasion, Math.max(0, mods.evasion));
}

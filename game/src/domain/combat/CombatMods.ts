import type { ActiveBuff, BuffStat } from "../character/BuffService";
import type { FormState } from "./FormState";
import type { PassiveId, SkillDef } from "../../data/classes/skill-types";

export interface CombatMods {
  attackMul: number;
  damageFlat: number;
  xpMultiplier: number;
  defenseMul: number;
  maxHpMul: number;
  evasion: number;
  attackSpeed: number;
  moveSpeed: number;
  magicPower: number;
  critChance: number;
  magicResist: number;
  healPower: number;
  damageReduction: number;
  reflect: number;
  mpCostMul: number;
  mpToHp: number;
  stealth: boolean;
  nextHitMul: number;
  summonPower: number;
  summonLink: number;
  transformedCrit: number;
  isolatedBonus: number;
}

export function emptyMods(): CombatMods {
  return {
    attackMul: 1,
    damageFlat: 0,
    xpMultiplier: 1,
    defenseMul: 1,
    maxHpMul: 0,
    evasion: 0,
    attackSpeed: 0,
    moveSpeed: 0,
    magicPower: 0,
    critChance: 0,
    magicResist: 0,
    healPower: 0,
    damageReduction: 0,
    reflect: 0,
    mpCostMul: 1,
    mpToHp: 0,
    stealth: false,
    nextHitMul: 1,
    summonPower: 0,
    summonLink: 0,
    transformedCrit: 0,
    isolatedBonus: 0,
  };
}

function addStat(mods: CombatMods, stat: BuffStat, magnitude: number, nextHitMul?: number): void {
  if (stat === "attack") mods.attackMul += magnitude;
  else if (stat === "damageFlat") mods.damageFlat += magnitude;
  else if (stat === "xpMultiplier") mods.xpMultiplier += magnitude;
  else if (stat === "defense") mods.defenseMul += magnitude;
  else if (stat === "maxHp") mods.maxHpMul += magnitude;
  else if (stat === "evasion") mods.evasion += magnitude;
  else if (stat === "attackSpeed") mods.attackSpeed += magnitude;
  else if (stat === "moveSpeed") mods.moveSpeed += magnitude;
  else if (stat === "magicPower") mods.magicPower += magnitude;
  else if (stat === "crit") mods.critChance += magnitude;
  else if (stat === "magicResist") mods.magicResist += magnitude;
  else if (stat === "healPower") mods.healPower += magnitude;
  else if (stat === "damageReduction") mods.damageReduction += magnitude;
  else if (stat === "reflect") mods.reflect += magnitude;
  else if (stat === "mpCost") mods.mpCostMul += magnitude;
  else if (stat === "mpToHp") mods.mpToHp += magnitude;
  else if (stat === "summonPower") mods.summonPower += magnitude;
  else if (stat === "stealth") {
    mods.stealth = true;
    mods.nextHitMul = Math.max(mods.nextHitMul, nextHitMul ?? 1.5);
  }
}

function weaponOk(skill: SkillDef, weaponSet: string | null): boolean {
  if (!skill.weaponAny || skill.weaponAny.length === 0) return true;
  return weaponSet != null && skill.weaponAny.includes(weaponSet);
}

function applyPassive(mods: CombatMods, id: PassiveId, magnitude: number, weaponSet: string | null, skill: SkillDef, transformed: boolean): void {
  if (!weaponOk(skill, weaponSet)) return;
  if (id === "dual" || id === "bow" || id === "twoHand") mods.attackMul += magnitude;
  else if (id === "crit") mods.critChance += magnitude;
  else if (id === "evasion") mods.evasion += magnitude;
  else if (id === "damageReduction") mods.damageReduction += magnitude;
  else if (id === "transformedCrit" && transformed) mods.transformedCrit += magnitude;
  else if (id === "summonLink") mods.summonLink = Math.max(mods.summonLink, magnitude);
  else if (id === "isolated") mods.isolatedBonus += magnitude;
}

export function buildCombatMods(
  buffs: ActiveBuff[],
  passives: SkillDef[],
  weaponSet: string | null,
  form: FormState,
): CombatMods {
  const mods = emptyMods();
  for (const buff of buffs) {
    if (!buff.stat || buff.magnitude == null) continue;
    addStat(mods, buff.stat, buff.magnitude, buff.nextHitMul);
  }
  const transformed = form.active;
  for (const skill of passives) {
    if (!skill.passive) continue;
    applyPassive(mods, skill.passive.id, skill.passive.magnitude, weaponSet, skill, transformed);
  }
  if (transformed) {
    mods.attackMul *= form.attack;
    mods.defenseMul *= form.defense;
    mods.attackSpeed += form.attackSpeed;
    mods.maxHpMul += Math.max(0, form.hp - 1);
  }
  mods.defenseMul = Math.max(0.15, mods.defenseMul);
  mods.attackMul = Math.max(0.2, mods.attackMul);
  mods.damageReduction = Math.min(0.75, Math.max(0, mods.damageReduction));
  mods.evasion = Math.min(0.6, Math.max(0, mods.evasion));
  mods.magicResist = Math.min(0.75, Math.max(0, mods.magicResist));
  return mods;
}

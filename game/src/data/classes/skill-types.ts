import { SKILL_BALANCE } from "../balance/skills";

export type SkillKind = "damage" | "buff" | "passive" | "heal" | "transform" | "summon";
export type SkillShape = "single" | "line" | "aoe" | "self";
export type SkillElement =
  | "physical"
  | "holy"
  | "fire"
  | "ice"
  | "lightning"
  | "poison"
  | "shadow"
  | "earth"
  | "water"
  | "mixed";
export type SkillAuto = "damage" | "heal" | "buff" | "summon";
export type SkillPower = "weapon" | "magic";
export type BuffStat =
  | "attack"
  | "defense"
  | "maxHp"
  | "evasion"
  | "attackSpeed"
  | "moveSpeed"
  | "magicPower"
  | "crit"
  | "magicResist"
  | "healPower"
  | "damageReduction"
  | "reflect"
  | "mpCost"
  | "mpToHp"
  | "stealth"
  | "summonPower";
export type PassiveId =
  | "dual"
  | "bow"
  | "twoHand"
  | "crit"
  | "evasion"
  | "damageReduction"
  | "transformedCrit"
  | "summonLink"
  | "isolated";

export interface SkillBuffSpec {
  id: string;
  sec: number;
  stat: BuffStat;
  magnitude: number;
  nextHitMul?: number;
}

export interface SkillEnemySpec {
  slow?: number;
  slowSec?: number;
  stunSec?: number;
  stunChance?: number;
  dotRatio?: number;
  dotSec?: number;
  antiHealSec?: number;
  tauntSec?: number;
  knock?: number;
}

export interface SummonSpec {
  id: string;
  role: "ranged" | "melee" | "tank" | "elite";
  attackMul: number;
  hpMul: number;
  range: number;
  interval: number;
  splash?: number;
}

export interface TransformSpec {
  id: string;
  sec: number;
  attack: number;
  defense: number;
  hp: number;
  scale: number;
  attackSpeed?: number;
}

export interface SkillPassiveSpec {
  id: PassiveId;
  magnitude: number;
}

export interface SkillDef {
  id: string;
  name: string;
  desc?: string;
  damageMultiplier: number;
  range: number;
  cooldown: number;
  mp: number;
  kind: SkillKind;
  shape: SkillShape;
  auto: SkillAuto;
  element?: SkillElement;
  power: SkillPower;
  radius?: number;
  maxTargets?: number;
  hits?: number;
  pierce?: number;
  lifesteal?: number;
  healRatio?: number;
  cleanse?: boolean;
  executeBelow?: number;
  executeBonus?: number;
  buff?: SkillBuffSpec;
  extraBuff?: SkillBuffSpec;
  enemy?: SkillEnemySpec;
  passive?: SkillPassiveSpec;
  summon?: SummonSpec;
  pack?: SummonSpec[];
  transform?: TransformSpec;
  weaponAny?: string[];
}

export interface SkillInput {
  id: string;
  name: string;
  desc?: string;
  index: number;
  kind: SkillKind;
  shape?: SkillShape;
  auto?: SkillAuto;
  element?: SkillElement;
  power?: SkillPower;
  damageMultiplier?: number;
  range?: number;
  cooldown?: number;
  mp?: number;
  radius?: number;
  maxTargets?: number;
  hits?: number;
  pierce?: number;
  lifesteal?: number;
  healRatio?: number;
  cleanse?: boolean;
  executeBelow?: number;
  executeBonus?: number;
  buff?: SkillBuffSpec;
  extraBuff?: SkillBuffSpec;
  enemy?: SkillEnemySpec;
  passive?: SkillPassiveSpec;
  summon?: SummonSpec;
  pack?: SummonSpec[];
  transform?: TransformSpec;
  weaponAny?: string[];
}

const ELEMENT_COLOR: Record<SkillElement, number> = {
  physical: 0xc45c26,
  holy: 0xf0d080,
  fire: 0xe25822,
  ice: 0x7ec8e3,
  lightning: 0xd0b0ff,
  poison: 0x6dbf4a,
  shadow: 0x6a4a8a,
  earth: 0xa07848,
  water: 0x4aa0d8,
  mixed: 0xe0c060,
};

export function elementColor(element: SkillElement | undefined, treeFallback: number): number {
  if (!element) return treeFallback;
  return ELEMENT_COLOR[element];
}

export function skillVfx(skill: SkillDef): "burst" | "bolt" | "zone" {
  if (skill.shape === "aoe" || skill.shape === "self") return "zone";
  if (skill.shape === "line") return "bolt";
  if (skill.power === "magic" || (skill.range ?? 0) >= 5) return "bolt";
  return "burst";
}

export function defineSkill(input: SkillInput): SkillDef {
  const i = Math.min(7, Math.max(0, input.index));
  const kind = input.kind;
  const shape =
    input.shape ??
    (kind === "damage" ? "single" : "self");
  const auto =
    input.auto ??
    (kind === "heal" ? "heal" : kind === "summon" ? "summon" : kind === "buff" || kind === "transform" ? "buff" : "damage");
  const magical = input.element != null && input.element !== "physical";
  const ranged = shape === "single" && magical;
  return {
    id: input.id,
    name: input.name,
    desc: input.desc,
    kind,
    shape,
    auto,
    element: input.element,
    power: input.power ?? (magical ? "magic" : "weapon"),
    damageMultiplier:
      input.damageMultiplier ??
      (kind === "damage" ? SKILL_BALANCE.tierMult[i] : 0),
    range:
      input.range ??
      (shape === "aoe"
        ? SKILL_BALANCE.aoeRadius
        : ranged
          ? SKILL_BALANCE.rangeRanged
          : SKILL_BALANCE.rangeMelee),
    cooldown: input.cooldown ?? (kind === "passive" ? 0 : SKILL_BALANCE.tierCd[i]),
    mp: input.mp ?? (kind === "passive" ? 0 : SKILL_BALANCE.tierMp[i]),
    radius: input.radius,
    maxTargets: input.maxTargets,
    hits: input.hits,
    pierce: input.pierce,
    lifesteal: input.lifesteal,
    healRatio: input.healRatio,
    cleanse: input.cleanse,
    executeBelow: input.executeBelow,
    executeBonus: input.executeBonus,
    buff: input.buff,
    extraBuff: input.extraBuff,
    enemy: input.enemy,
    passive: input.passive,
    summon: input.summon,
    pack: input.pack,
    transform: input.transform,
    weaponAny: input.weaponAny,
  };
}

import { SKILL_BALANCE } from "../../data/balance/skills";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import type { AttackTarget } from "./AttackController";
import type { CombatMods } from "./CombatMods";
import type { SkillDef, SkillEnemySpec, SummonSpec, TransformSpec } from "../../data/classes/skill-types";
import { elementColor, skillVfx } from "../../data/classes/skill-types";
import type { ActiveBuff } from "../character/BuffService";

export interface SkillHitPlan {
  id: string;
  damage: number;
  x: number;
  z: number;
}

export interface SkillEnemyPlan {
  id: string;
  effect: SkillEnemySpec;
  dotDps: number;
}

export interface ResolvedSkill {
  hits: SkillHitPlan[];
  heal: number;
  lifesteal: number;
  buffs: ActiveBuff[];
  cleanse: boolean;
  enemyEffects: SkillEnemyPlan[];
  summons: SummonSpec[] | null;
  transform: TransformSpec | null;
  vfx: "burst" | "bolt" | "zone";
  color: number;
  aim: { x: number; z: number } | null;
}

function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

function inFront(px: number, pz: number, facing: number, target: AttackTarget, range: number): boolean {
  const dx = target.x - px;
  const dz = target.z - pz;
  const d = Math.hypot(dx, dz);
  if (d > range || d < 0.001) return false;
  const dot = (dx / d) * Math.sin(facing) + (dz / d) * Math.cos(facing);
  return dot > 0.35;
}

export function selectSkillTargets(
  skill: SkillDef,
  targets: AttackTarget[],
  px: number,
  pz: number,
  facing: number,
): AttackTarget[] {
  const alive = targets.filter((target) => target.alive);
  if (skill.shape === "self") return [];
  if (skill.shape === "aoe") {
    const radius = skill.radius ?? skill.range;
    return alive.filter((target) => dist(px, pz, target.x, target.z) <= radius);
  }
  if (skill.shape === "line") {
    return alive
      .filter((target) => inFront(px, pz, facing, target, skill.range))
      .sort((a, b) => dist(px, pz, a.x, a.z) - dist(px, pz, b.x, b.z))
      .slice(0, skill.maxTargets ?? 3);
  }
  let best: AttackTarget | null = null;
  let bestDist = skill.range;
  for (const target of alive) {
    const d = dist(px, pz, target.x, target.z);
    if (d <= bestDist) {
      best = target;
      bestDist = d;
    }
  }
  return best ? [best] : [];
}

function isolated(target: AttackTarget, targets: AttackTarget[]): boolean {
  for (const other of targets) {
    if (!other.alive || other.id === target.id) continue;
    if (dist(target.x, target.z, other.x, other.z) <= 3.5) return false;
  }
  return true;
}

function rollCrit(mods: CombatMods, transformed: boolean): boolean {
  const chance = mods.critChance + (transformed ? mods.transformedCrit : 0);
  if (chance <= 0) return false;
  return Math.random() < chance;
}

export function resolveSkill(input: {
  skill: SkillDef;
  attack: number;
  magicAttack: number;
  maxHp: number;
  px: number;
  pz: number;
  facing: number;
  targets: AttackTarget[];
  defenseOf: (id: string) => number;
  hpOf: (id: string) => { hp: number; maxHp: number };
  mods: CombatMods;
  transformed: boolean;
  treeColor: number;
  specEffectiveness: number;
}): ResolvedSkill | null {
  const specMul = Number.isFinite(input.specEffectiveness) && input.specEffectiveness > 0
    ? input.specEffectiveness
    : 1;
  const skill = input.skill;
  const picked = selectSkillTargets(skill, input.targets, input.px, input.pz, input.facing);
  const needsFoe = skill.kind === "damage" || (skill.enemy != null && skill.shape !== "self");
  const canSelf = (skill.healRatio ?? 0) > 0 || skill.kind === "buff" || skill.kind === "heal" || skill.kind === "transform" || skill.kind === "summon";
  if (needsFoe && picked.length === 0 && !canSelf) return null;

  const crit = rollCrit(input.mods, input.transformed);
  const hits: SkillHitPlan[] = [];
  const enemyEffects: SkillEnemyPlan[] = [];
  const hitCount = Math.max(1, skill.hits ?? 1);

  if (skill.damageMultiplier > 0 && picked.length > 0) {
    for (const target of picked) {
      const hp = input.hpOf(target.id);
      const ratio = hp.maxHp > 0 ? hp.hp / hp.maxHp : 1;
      const alone = input.mods.isolatedBonus > 0 && (isolated(target, input.targets) || ratio <= 0.4);
      const power = skill.power === "magic" ? input.magicAttack : input.attack;
      let atk = power * input.mods.attackMul;
      if (skill.power === "magic") atk *= 1 + input.mods.magicPower;
      if (alone) atk *= 1 + input.mods.isolatedBonus;
      const defense = Math.max(0, input.defenseOf(target.id) * (1 - (skill.pierce ?? 0)));
      let damage = Math.max(COMBAT_BALANCE.minDamage, Math.round((atk - defense) * skill.damageMultiplier));
      if (skill.executeBelow != null && ratio <= skill.executeBelow) {
        damage = Math.round(damage * (1 + (skill.executeBonus ?? 0.5)));
      }
      if (crit) damage = Math.round(damage * SKILL_BALANCE.critMultiplier);
      damage += input.mods.damageFlat;
      damage = Math.max(COMBAT_BALANCE.minDamage, Math.round(damage * specMul));
      const per = damage;
      for (let n = 0; n < hitCount; n++) {
        hits.push({ id: target.id, damage: per, x: target.x, z: target.z });
      }
      if (skill.enemy) {
        const dotDps = skill.enemy.dotRatio ? Math.max(1, damage * skill.enemy.dotRatio) : 0;
        enemyEffects.push({ id: target.id, effect: skill.enemy, dotDps });
      }
    }
  }

  const heal =
    (skill.healRatio ?? 0) > 0
      ? Math.max(
          1,
          Math.round(input.maxHp * (skill.healRatio ?? 0) * (1 + input.mods.healPower) * specMul),
        )
      : 0;
  const dealt = hits.reduce((sum, hit) => sum + hit.damage, 0);
  const lifesteal = skill.lifesteal ? Math.round(dealt * skill.lifesteal) : 0;
  const buffs: ActiveBuff[] = [];
  const pushBuff = (spec: NonNullable<SkillDef["buff"]>) => {
    buffs.push({
      id: spec.id,
      remainingSec: spec.sec,
      stacks: 1,
      magnitude: spec.magnitude * specMul,
      stat: spec.stat,
      harmful: spec.magnitude < 0,
      nextHitMul: spec.nextHitMul != null ? spec.nextHitMul * specMul : undefined,
    });
  };
  if (skill.buff) pushBuff(skill.buff);
  if (skill.extraBuff) pushBuff(skill.extraBuff);

  const aim = picked[0] ? { x: picked[0].x, z: picked[0].z } : null;
  return {
    hits,
    heal,
    lifesteal,
    buffs,
    cleanse: !!skill.cleanse,
    enemyEffects,
    summons: skill.pack ?? (skill.summon ? [skill.summon] : null),
    transform: skill.transform ?? null,
    vfx: skillVfx(skill),
    color: elementColor(skill.element, input.treeColor),
    aim,
  };
}

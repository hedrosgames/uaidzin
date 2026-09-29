export const ATTRIBUTE_STAT_RULES = {
  baseHp: 85,
  forAttack: 1,
  intMagicAttack: 1,
  desAttack: 0.5,
  desDefense: 0.5,
  desAttackSpeed: 0.25,
  consHp: 3,
} as const;

export function attackFromAttributes(for_: number, des: number): number {
  return for_ * ATTRIBUTE_STAT_RULES.forAttack + des * ATTRIBUTE_STAT_RULES.desAttack;
}

export function defenseFromAttributes(des: number): number {
  return des * ATTRIBUTE_STAT_RULES.desDefense;
}

export function magicAttackFromInt(int: number): number {
  return int * ATTRIBUTE_STAT_RULES.intMagicAttack;
}

export function attackSpeedFromDes(des: number): number {
  return des * ATTRIBUTE_STAT_RULES.desAttackSpeed;
}

export function maxHpFromCons(cons: number): number {
  return ATTRIBUTE_STAT_RULES.baseHp + cons * ATTRIBUTE_STAT_RULES.consHp;
}

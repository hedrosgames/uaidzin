export const DAMAGE_CAPS = {
  physicalAttack: 20000,
  magicAttack: 40000,
  maxHp: 60000,
  maxMp: 40000,
} as const;

export function capPhysicalAttack(value: number): number {
  return Math.min(DAMAGE_CAPS.physicalAttack, Math.max(0, Math.floor(value)));
}

export function capMagicAttack(value: number): number {
  return Math.min(DAMAGE_CAPS.magicAttack, Math.max(0, Math.floor(value)));
}

export function capMaxHp(value: number): number {
  return Math.min(DAMAGE_CAPS.maxHp, Math.max(1, Math.floor(value)));
}

export function capMaxMp(value: number): number {
  return Math.min(DAMAGE_CAPS.maxMp, Math.max(0, Math.floor(value)));
}

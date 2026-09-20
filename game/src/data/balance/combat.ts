export const COMBAT_BALANCE = {
  dodgeChance: 0.05,
  minDamage: 1,
  player: {
    maxHp: 120,
    attack: 18,
    defense: 6,
    attackRange: 2.2,
    attackInterval: 0.85,
    speed: 5.5,
    skill: {
      id: "skill_power_strike",
      name: "Golpe Poderoso",
      damageMultiplier: 2.2,
      range: 2.8,
      cooldown: 4,
    },
  },
  enemy: {
    fixed: { maxHp: 40, attack: 8, defense: 2, range: 1.6, attackInterval: 1.2, leashRadius: 2.5 },
    chaser: { maxHp: 55, attack: 10, defense: 3, range: 1.5, attackInterval: 1.1, minApproach: 1.2, speed: 3.2 },
    ranged: { maxHp: 35, attack: 9, defense: 1, range: 6, attackInterval: 1.6, preferred: 5, retreatIfCloserThan: 2.5, speed: 2.4 },
    respawnSeconds: [3, 8] as [number, number],
    leashReturnRate: 4,
    approachSpeedFactor: 0.7,
    preferredRangeFactor: 0.8,
    respawnAttackCooldown: 0.5,
  },
};

export type EnemyArchetype = "fixed" | "chaser" | "ranged";

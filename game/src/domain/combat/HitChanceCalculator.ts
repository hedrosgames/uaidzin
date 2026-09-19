import { COMBAT_BALANCE } from "../../data/balance/combat";

export function rollHitSimple(random: () => number = Math.random): boolean {
  return random() >= COMBAT_BALANCE.dodgeChance;
}

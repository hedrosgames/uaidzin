import { COMBAT_BALANCE } from "../../data/balance/combat";


export function calculateDamage(attack: number, defense: number): number {
  return Math.max(COMBAT_BALANCE.minDamage, attack - defense);
}

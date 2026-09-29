import { ECONOMY_BALANCE, type Rarity } from "../../data/balance/economy";
import type { ItemInstance } from "./ItemModel";

export type LifeCombatBonuses = {
  attack: number;
  defense: number;
  hp: number;
  crit: number;
  speed: number;
};

export function rarityLifeStep(rarity: Rarity): number {
  const idx = ECONOMY_BALANCE.rarities.indexOf(rarity);
  const steps = ECONOMY_BALANCE.life.stepByRarity;
  return steps[idx >= 0 ? idx : 0] ?? steps[0];
}

export function lifeSuccessChance(currentLife: number): number {
  const table = ECONOMY_BALANCE.life.successByTier;
  const idx = Math.max(0, Math.min(table.length - 1, currentLife));
  return table[idx];
}

export function accessoryLifeBase(item: ItemInstance): { hp: number; crit: number; damage: number; speed: number } {
  const base = item.lifeAccessoryBase;
  if (base) return base;
  const atk = Math.max(0, item.attackBonus || 0);
  const def = Math.max(0, item.defenseBonus || 0);
  return {
    hp: atk + def > 0 ? 100 : 100,
    crit: 4,
    damage: atk > 0 ? atk : 4,
    speed: 4,
  };
}

export function lifeBonusesForItem(item: ItemInstance): LifeCombatBonuses {
  const life = Math.max(0, Math.min(ECONOMY_BALANCE.life.maxTier, item.life || 0));
  if (life <= 0) {
    return { attack: 0, defense: 0, hp: 0, crit: 0, speed: 0 };
  }
  const step = rarityLifeStep(item.rarity);
  const slot = item.slot;
  if (slot === "weapon") {
    return { attack: life * step * 2, defense: 0, hp: 0, crit: 0, speed: 0 };
  }
  if (slot === "armor" || slot === "head") {
    return { attack: 0, defense: life * step * 2, hp: 0, crit: 0, speed: 0 };
  }
  if (slot === "ring1" || slot === "ring2" || slot === "neck" || slot === "ear") {
    const b = accessoryLifeBase(item);
    const scale = step / 2;
    return {
      attack: Math.round(life * b.damage * scale),
      defense: 0,
      hp: Math.round(life * b.hp * scale),
      crit: Math.round(life * b.crit * scale),
      speed: Math.round(life * b.speed * scale),
    };
  }
  return { attack: 0, defense: 0, hp: 0, crit: 0, speed: 0 };
}

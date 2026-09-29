import { ECONOMY_BALANCE } from "../../data/balance/economy";
import { ITEM_CATALOG, type ItemCatalogDef } from "../../data/items/item-catalog";
import type { ItemInstance } from "./ItemModel";

export type PrimaryStatKind = "attack" | "defense" | "hp";

export function catalogFor(item: ItemInstance): ItemCatalogDef | undefined {
  return ITEM_CATALOG[item.defId];
}

export function primaryStatKind(item: ItemInstance): PrimaryStatKind {
  const def = catalogFor(item);
  if (def?.primaryStat === "attack" || def?.primaryStat === "defense" || def?.primaryStat === "hp") {
    return def.primaryStat;
  }
  if (item.slot === "weapon") return "attack";
  if (item.slot === "armor" || item.slot === "head") return "defense";
  if (item.slot === "ring1" || item.slot === "ring2" || item.slot === "neck" || item.slot === "ear") {
    return def?.hpBonus ? "hp" : "defense";
  }
  return "defense";
}

export function refinePrimaryBonus(item: ItemInstance): { attack: number; defense: number; hp: number } {
  const out = { attack: 0, defense: 0, hp: 0 };
  if (item.refine <= 0) return out;
  const slot = item.slot;
  const rule = ECONOMY_BALANCE.refine.bonusBySlot[slot as keyof typeof ECONOMY_BALANCE.refine.bonusBySlot];
  if (!rule) return out;
  const add = item.refine * rule.perLevel;
  const kind = primaryStatKind(item);
  if (kind === "attack") out.attack = add;
  else if (kind === "defense") out.defense = add;
  else out.hp = add;
  return out;
}

export function itemSecondaryBonuses(item: ItemInstance): {
  attack: number;
  defense: number;
  crit: number;
  speed: number;
} {
  const def = catalogFor(item);
  return {
    attack: item.secondaryAttack ?? def?.secondaryAttack ?? 0,
    defense: item.secondaryDefense ?? def?.secondaryDefense ?? 0,
    crit: item.critBonus ?? def?.critBonus ?? 0,
    speed: item.speedBonus ?? def?.speedBonus ?? 0,
  };
}

export function itemPrimaryBonuses(item: ItemInstance): { attack: number; defense: number; hp: number } {
  const def = catalogFor(item);
  return {
    attack: item.attackBonus || 0,
    defense: item.defenseBonus || 0,
    hp: item.hpBonus ?? def?.hpBonus ?? 0,
  };
}

export function gearSetForItem(item: ItemInstance): number {
  const def = catalogFor(item);
  const set = def?.gearSet ?? item.gearSet;
  if (set === 2 || set === 3) return set;
  return 1;
}

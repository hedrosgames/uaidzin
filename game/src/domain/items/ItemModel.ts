import type { Rarity } from "../../data/balance/economy";

export interface ItemInstance {
  uid: string;
  defId: string;
  name: string;
  rarity: Rarity;
  slot: "weapon" | "head" | "armor" | "ring1" | "ring2" | "neck" | "ear" | "material" | "misc";
  refine: number;
  life?: number;
  lifeAccessoryBase?: { hp: number; crit: number; damage: number; speed: number };
  attackBonus: number;
  defenseBonus: number;
  stack: number;
  sellValue: number;
  attackRange?: number;
  attackInterval?: number;
  weaponSet?: string;
}

export function nextItemUid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

import type { Rarity } from "../../data/balance/economy";

export interface ItemInstance {
  uid: string;
  defId: string;
  name: string;
  rarity: Rarity;
  slot: "weapon" | "head" | "armor" | "ring1" | "ring2" | "neck" | "ear" | "material" | "misc";
  refine: number;
  attackBonus: number;
  defenseBonus: number;
  stack: number;
  sellValue: number;
}

let uidSeq = 1;
export function nextItemUid(): string {
  return `item_${uidSeq++}`;
}

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
  attackRange?: number;
  attackInterval?: number;
}

let uidSeq = 1;
export function nextItemUid(): string {
  return `item_${uidSeq++}`;
}

export function adoptItemUidSeq(uids: string[]): void {
  let next = uidSeq;
  for (const uid of uids) {
    const match = /^item_(\d+)$/.exec(uid);
    if (!match) continue;
    next = Math.max(next, Number(match[1]) + 1);
  }
  uidSeq = next;
}

import { ITEM_CATALOG } from "../items/item-catalog";

export type ConsumableRestore = {
  hp: number;
  mp: number;
  healRatio: number;
};

export function resolveConsumableRestore(defId: string, maxHp: number): ConsumableRestore | null {
  const effect = ITEM_CATALOG[defId]?.effect;
  if (!effect || effect.type !== "restore") return null;
  const hp = Math.max(0, Math.floor(effect.hp || 0));
  const mp = Math.max(0, Math.floor(effect.mp || 0));
  if (hp <= 0 && mp <= 0) return null;
  const healRatio = hp > 0 && maxHp > 0 ? hp / maxHp : 0;
  return { hp, mp, healRatio };
}

export function isPotionDefId(defId: string): boolean {
  return resolveConsumableRestore(defId, 100) != null;
}

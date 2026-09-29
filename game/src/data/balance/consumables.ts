import { ITEM_CATALOG } from "../items/item-catalog";

export const CONSUMABLE_BALANCE = {
  pocao_menor: { healRatio: 0.38 },
} as const;

export type ConsumableId = keyof typeof CONSUMABLE_BALANCE;

export function isConsumableId(defId: string): defId is ConsumableId {
  return defId in CONSUMABLE_BALANCE;
}

export type ConsumableRestore = {
  hp: number;
  mp: number;
  healRatio: number;
};

export function resolveConsumableRestore(defId: string, maxHp: number): ConsumableRestore | null {
  if (isConsumableId(defId)) {
    const spec = CONSUMABLE_BALANCE[defId];
    return {
      hp: Math.max(1, Math.round(maxHp * spec.healRatio)),
      mp: 0,
      healRatio: spec.healRatio,
    };
  }
  const effect = ITEM_CATALOG[defId]?.effect;
  if (!effect || effect.type !== "restore") return null;
  const hp = Math.max(0, Math.floor(effect.hp || 0));
  const mp = Math.max(0, Math.floor(effect.mp || 0));
  if (hp <= 0 && mp <= 0) return null;
  return { hp, mp, healRatio: 0 };
}

export function isPotionDefId(defId: string): boolean {
  return resolveConsumableRestore(defId, 100) != null;
}

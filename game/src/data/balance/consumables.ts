export const CONSUMABLE_BALANCE = {
  pocao_menor: { healRatio: 0.38 },
} as const;

export type ConsumableId = keyof typeof CONSUMABLE_BALANCE;

export function isConsumableId(defId: string): defId is ConsumableId {
  return defId in CONSUMABLE_BALANCE;
}

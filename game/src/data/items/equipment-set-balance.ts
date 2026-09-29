export const EQUIP_RARITIES = ["Comum", "Incomum", "Épico", "Lendário"] as const;
export type EquipRarity = (typeof EQUIP_RARITIES)[number];

export const GEAR_SETS = [1, 2, 3] as const;
export type GearSetId = (typeof GEAR_SETS)[number];

export const REFINE_SUCCESS_BY_GEAR_SET: Record<GearSetId, number> = {
  1: 1,
  2: 0.8,
  3: 0.5,
};

export function equipRarityIndex(rarity: string): number {
  const idx = EQUIP_RARITIES.indexOf(rarity as EquipRarity);
  return idx >= 0 ? idx : 0;
}

export function gearPowerTier(gearSet: GearSetId, rarity: string): number {
  const r = equipRarityIndex(rarity);
  return (gearSet - 1) * 2 + r;
}

export function refineSuccessMultiplier(gearSet: number): number {
  if (gearSet === 2) return REFINE_SUCCESS_BY_GEAR_SET[2];
  if (gearSet === 3) return REFINE_SUCCESS_BY_GEAR_SET[3];
  return REFINE_SUCCESS_BY_GEAR_SET[1];
}

export function weaponPrimaryAttack(powerTier: number): number {
  return 4 + powerTier * 2;
}

export function armorPrimaryDefense(powerTier: number): number {
  return 3 + powerTier * 2;
}

export function accessoryPrimaryHp(powerTier: number): number {
  return 10 + powerTier * 5;
}

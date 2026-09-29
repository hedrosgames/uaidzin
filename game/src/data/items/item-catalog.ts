import rawItems from "./items.json";
import { EQUIPMENT_SET_ITEMS } from "./equipment-set-items";

export type ItemCatalogKind =
  | "weapon"
  | "head"
  | "armor"
  | "ring1"
  | "ring2"
  | "neck"
  | "ear"
  | "material"
  | "entry"
  | "misc"
  | "consumable"
  | "currency"
  | "weapon_compat"
  | "offhand";

export type ItemEffectDef =
  | { type: "restore"; hp: number; mp: number }
  | { type: "cleanse" }
  | { type: "xp_multiplier"; magnitude: number; durationSec: number }
  | { type: "attack_flat"; magnitude: number; durationSec: number }
  | { type: "grant_xp"; amount: number }
  | { type: "composition_component" }
  | { type: "currency" }
  | { type: "revive"; cooldownSec: number }
  | { type: "learn_book"; skillId: string };

export type ItemCatalogDef = {
  id: string;
  name: string;
  slot: ItemCatalogKind;
  rarity: string;
  desc: string;
  icon: string;
  sellValue?: number;
  attackBonus?: number;
  defenseBonus?: number;
  stackable?: boolean;
  weaponSet?: string;
  classId?: string;
  gearSet?: 1 | 2 | 3;
  primaryStat?: "attack" | "defense" | "hp";
  hpBonus?: number;
  critBonus?: number;
  speedBonus?: number;
  secondaryAttack?: number;
  secondaryDefense?: number;
  effect?: ItemEffectDef;
  available?: boolean;
};

export const ITEM_CATALOG: Record<string, ItemCatalogDef> = {};

for (const item of (rawItems as ItemCatalogDef[])) {
  ITEM_CATALOG[item.id] = item;
}
for (const item of EQUIPMENT_SET_ITEMS) {
  ITEM_CATALOG[item.id] = item;
}

export function isStackable(
  itemOrDefId: string | { defId?: string; id?: string; stackable?: boolean } | null | undefined,
): boolean {
  if (!itemOrDefId) return false;
  if (typeof itemOrDefId === "string") {
    return ITEM_CATALOG[itemOrDefId]?.stackable === true;
  }
  if (typeof itemOrDefId.stackable === "boolean") {
    return itemOrDefId.stackable;
  }
  const id = itemOrDefId.defId || itemOrDefId.id;
  if (id && ITEM_CATALOG[id]) {
    return ITEM_CATALOG[id].stackable === true;
  }
  return false;
}

const DEFAULT_SLOT_ICONS: Record<string, string> = {
  weapon: "/assets/icons/eq/weapon.svg",
  head: "/assets/icons/eq/crown.svg",
  armor: "/assets/icons/eq/armor.svg",
  ring1: "/assets/icons/eq/ring.svg",
  ring2: "/assets/icons/eq/ring.svg",
  neck: "/assets/icons/eq/neck.svg",
  ear: "/assets/icons/eq/ear.svg",
  material: "/assets/icons/eq/material.svg",
  misc: "/assets/icons/items/gem.svg",
  entry: "/assets/icons/items/seal.svg",
};

export function itemHasIcon(defId: string, slot?: string, name?: string): boolean {
  if (ITEM_CATALOG[defId]?.available === false) return false;
  return !!resolveItemIcon(defId, slot, name);
}

export function resolveItemIcon(defId: string, slot?: string, _name?: string): string | null {
  const byId = ITEM_CATALOG[defId];
  if (byId?.available === false) return null;
  if (byId?.icon) return byId.icon;
  const slotKey = slot || defId.split("_")[0];
  if (slotKey && DEFAULT_SLOT_ICONS[slotKey]) return DEFAULT_SLOT_ICONS[slotKey];
  return null;
}

export function listCatalogItemsWithIcons(): ItemCatalogDef[] {
  return Object.values(ITEM_CATALOG).filter((d) => !!d.icon && d.available !== false);
}

import {
  EQUIP_RARITIES,
  armorPrimaryDefense,
  gearPowerTier,
  type GearSetId,
  weaponPrimaryAttack,
} from "./equipment-set-balance";
import type { ItemCatalogDef } from "./item-catalog";

const RARITY_SLUG: Record<string, string> = {
  Comum: "comum",
  Incomum: "incomum",
  Épico: "epico",
  Lendário: "lendario",
};

const WEAPON_VISUAL: Record<GearSetId, string> = {
  1: "sword-shield",
  2: "greatsword",
  3: "dual-gloves",
};

const ARMOR_ICON: Record<GearSetId, string> = {
  1: "/assets/icons/items/tunica.png",
  2: "/assets/icons/items/armor_chest_tk_gold.png",
  3: "/assets/icons/items/armor_chest_tk_adamant.png",
};

const WEAPON_ICON: Record<GearSetId, string> = {
  1: "/assets/icons/items/weapon_sword.png",
  2: "/assets/icons/items/weapon_greatsword.png",
  3: "/assets/icons/items/weapon_glove.png",
};

function secondaryForWeapon(rarity: string): { critBonus?: number; speedBonus?: number } {
  if (rarity === "Épico") return { speedBonus: 2 };
  if (rarity === "Lendário") return { critBonus: 3, speedBonus: 2 };
  return {};
}

function secondaryForArmor(rarity: string): { secondaryDefense?: number } {
  if (rarity === "Incomum") return { secondaryDefense: 1 };
  if (rarity === "Épico") return { secondaryDefense: 2 };
  if (rarity === "Lendário") return { secondaryDefense: 3 };
  return {};
}

function buildItems(): ItemCatalogDef[] {
  const out: ItemCatalogDef[] = [];
  for (const gearSet of [1, 2, 3] as GearSetId[]) {
    for (const rarity of EQUIP_RARITIES) {
      const tier = gearPowerTier(gearSet, rarity);
      const slug = RARITY_SLUG[rarity]!;
      const atk = weaponPrimaryAttack(tier);
      const def = armorPrimaryDefense(tier);
      out.push({
        id: `weapon_gear${gearSet}_${slug}`,
        name: `Arma do Conjunto ${gearSet} (${rarity})`,
        slot: "weapon",
        rarity,
        desc: `Conjunto de arma ${gearSet}. Primário: ataque. Refino só aumenta ataque.`,
        icon: WEAPON_ICON[gearSet],
        sellValue: 8 + tier * 4,
        attackBonus: atk,
        defenseBonus: 0,
        stackable: false,
        weaponSet: WEAPON_VISUAL[gearSet],
        gearSet,
        primaryStat: "attack",
        available: true,
        ...secondaryForWeapon(rarity),
      });
      out.push({
        id: `armor_gear${gearSet}_${slug}`,
        name: `Armadura do Conjunto ${gearSet} (${rarity})`,
        slot: "armor",
        rarity,
        desc: `Conjunto de armadura ${gearSet}. Primário: defesa. Refino só aumenta defesa.`,
        icon: ARMOR_ICON[gearSet],
        sellValue: 6 + tier * 4,
        attackBonus: 0,
        defenseBonus: def,
        stackable: false,
        gearSet,
        primaryStat: "defense",
        available: true,
        ...secondaryForArmor(rarity),
      });
    }
  }
  return out;
}

export const EQUIPMENT_SET_ITEMS: ItemCatalogDef[] = buildItems();

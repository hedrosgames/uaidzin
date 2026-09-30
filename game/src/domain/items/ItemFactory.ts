import { ECONOMY_BALANCE, type Rarity } from "../../data/balance/economy";
import { COMBAT_BALANCE } from "../../data/balance/combat";
import { ITEM_CATALOG, itemHasIcon } from "../../data/items/item-catalog";
import { nextItemUid, type ItemInstance } from "./ItemModel";

const NAMES = {
  weapon: ["Espada Curta", "Machado Leve", "Cajado Rústico", "Arco Curto"],
  head: ["Capacete", "Touca de Couro"],
  armor: ["Armadura Leve", "Túnica"],
  ring1: ["Anel de Cobre"],
  ring2: ["Anel de Ferro"],
  neck: ["Colar Simples"],
  ear: ["Brinco de Osso"],
  material: ["Poeira de Ori", "Poeira de Lac"],
  misc: ["Item"],
} as const;

function pickRarity(random: () => number = Math.random): Rarity {
  const weights = ECONOMY_BALANCE.rarityWeights;
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return ECONOMY_BALANCE.rarities[i];
  }
  return "Comum";
}

function toInstanceSlot(slot: string): ItemInstance["slot"] {
  if (
    slot === "weapon" ||
    slot === "head" ||
    slot === "armor" ||
    slot === "ring1" ||
    slot === "ring2" ||
    slot === "neck" ||
    slot === "ear" ||
    slot === "material"
  ) {
    return slot;
  }
  return "misc";
}

export function createEquipDrop(level: number, random: () => number = Math.random): ItemInstance {
  const slots: ItemInstance["slot"][] = ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"];
  const slot = slots[Math.floor(random() * slots.length)];
  const rarity = pickRarity(random);
  const ri = ECONOMY_BALANCE.rarities.indexOf(rarity);
  const names = NAMES[slot];
  const name = names[Math.floor(random() * names.length)];
  const base = ECONOMY_BALANCE.equipBaseStat(level, ri);
  const reach =
    slot === "weapon"
      ? COMBAT_BALANCE.weapon.byName[name as keyof typeof COMBAT_BALANCE.weapon.byName] || {
          attackRange: COMBAT_BALANCE.weapon.attackRange,
          attackInterval: COMBAT_BALANCE.weapon.attackInterval,
        }
      : null;
  const catalogItem = Object.values(ITEM_CATALOG).find((c) => c.name === name);
  const weaponSet = slot === "weapon" ? catalogItem?.weaponSet : undefined;
  return {
    uid: nextItemUid(),
    defId: `${slot}_${rarity.toLowerCase()}`,
    name: `${rarity} ${name}`,
    rarity,
    slot,
    refine: 0,
    life: 0,
    attackBonus: slot === "weapon" ? base * ECONOMY_BALANCE.weaponAttackMultiplier : base,
    defenseBonus: slot === "weapon" ? 0 : ECONOMY_BALANCE.equipDefenseBonus(base, ri),
    stack: 1,
    sellValue: ECONOMY_BALANCE.sellValueByRarity[ri] + base,
    attackRange: reach?.attackRange,
    attackInterval: reach?.attackInterval,
    weaponSet,
  };
}

export function createMaterial(kind: "Ori" | "Lac", qty = 1): ItemInstance {
  return {
    uid: nextItemUid(),
    defId: kind === "Ori" ? "mat_ori" : "mat_lac",
    name: kind === "Ori" ? "Poeira de Ori" : "Poeira de Lac",
    rarity: "Comum",
    slot: "material",
    refine: 0,
    attackBonus: 0,
    defenseBonus: 0,
    stack: qty,
    sellValue: kind === "Ori" ? 2 : 8,
  };
}

export function createEntrySeal(defId: string, qty = 1): ItemInstance | null {
  const def = ITEM_CATALOG[defId];
  if (!def || def.slot !== "entry" || !def.icon || !itemHasIcon(defId)) return null;
  return {
    uid: nextItemUid(),
    defId: def.id,
    name: def.name,
    rarity: "Comum",
    slot: "material",
    refine: 0,
    attackBonus: 0,
    defenseBonus: 0,
    stack: qty,
    sellValue: def.sellValue ?? 0,
  };
}

export function createFromCatalog(defId: string, qty = 1): ItemInstance | null {
  const def = ITEM_CATALOG[defId];
  if (!def || !def.icon || !itemHasIcon(defId)) return null;
  if (def.slot === "currency") {
    return {
      uid: nextItemUid(),
      defId: def.id,
      name: def.name,
      rarity: (def.rarity as Rarity) || "Comum",
      slot: "misc",
      refine: 0,
      attackBonus: 0,
      defenseBonus: 0,
      stack: Math.max(1, Math.floor(qty)),
      sellValue: def.sellValue ?? 1,
    };
  }
  if (def.slot === "entry") return createEntrySeal(defId, qty);
  if (def.slot === "material") {
    return {
      uid: nextItemUid(),
      defId: def.id === "poeira_ori" ? "mat_ori" : def.id === "poeira_lac" ? "mat_lac" : def.id,
      name: def.name,
      rarity: (def.rarity as Rarity) || "Comum",
      slot: "material",
      refine: 0,
      attackBonus: 0,
      defenseBonus: 0,
      stack: qty,
      sellValue: def.sellValue ?? 1,
    };
  }
  const slot = toInstanceSlot(def.slot);
  const reach =
    slot === "weapon"
      ? COMBAT_BALANCE.weapon.byName[def.name as keyof typeof COMBAT_BALANCE.weapon.byName] || null
      : null;
  const lifeAccessoryBase =
    slot === "ring1" || slot === "ring2" || slot === "neck" || slot === "ear"
      ? {
          hp: 100,
          crit: 4,
          damage: Math.max(4, def.attackBonus ?? 4),
          speed: 4,
        }
      : undefined;
  return {
    uid: nextItemUid(),
    defId: def.id,
    name: def.name,
    rarity: (def.rarity as Rarity) || "Comum",
    slot,
    refine: 0,
    life: 0,
    lifeAccessoryBase,
    attackBonus: def.attackBonus ?? 0,
    defenseBonus: def.defenseBonus ?? 0,
    hpBonus: def.hpBonus,
    critBonus: def.critBonus,
    speedBonus: def.speedBonus,
    secondaryAttack: def.secondaryAttack,
    secondaryDefense: def.secondaryDefense,
    gearSet: def.gearSet,
    stack: def.stackable ? Math.max(1, Math.floor(qty)) : 1,
    sellValue: def.sellValue ?? 1,
    attackRange: reach?.attackRange,
    attackInterval: reach?.attackInterval,
    weaponSet: def.weaponSet,
  };
}

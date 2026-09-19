import { ECONOMY_BALANCE, type Rarity } from "../../data/balance/economy";
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

function pickRarity(): Rarity {
  const weights = ECONOMY_BALANCE.rarityWeights;
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return ECONOMY_BALANCE.rarities[i];
  }
  return "Comum";
}

export function createEquipDrop(level: number): ItemInstance {
  const slots: ItemInstance["slot"][] = ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const rarity = pickRarity();
  const ri = ECONOMY_BALANCE.rarities.indexOf(rarity);
  const names = NAMES[slot];
  const name = names[Math.floor(Math.random() * names.length)];
  const base = 1 + Math.floor(level / 8) + ri;
  return {
    uid: nextItemUid(),
    defId: `${slot}_${rarity.toLowerCase()}`,
    name: `${rarity} ${name}`,
    rarity,
    slot,
    refine: 0,
    attackBonus: slot === "weapon" ? base * 2 : base,
    defenseBonus: slot === "weapon" ? 0 : base + ri,
    stack: 1,
    sellValue: ECONOMY_BALANCE.sellValueByRarity[ri] + base,
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

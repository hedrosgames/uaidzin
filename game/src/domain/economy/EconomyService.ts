import { ECONOMY_BALANCE } from "../../data/balance/economy";
import type { InventoryService } from "../inventory/InventoryService";
import { createEquipDrop, createMaterial } from "../items/ItemFactory";


export class EconomyService {
  constructor(private readonly inventory: InventoryService) {}

  grantKillLoot(archetype: "fixed" | "chaser" | "ranged" | "boss", isBoss: boolean): {
    gold: number;
    droppedItem: string | null;
    lostItem: boolean;
  } {
    const key = isBoss ? "boss" : archetype;
    const gold = ECONOMY_BALANCE.goldPerKill[key] ?? 2;
    this.inventory.gold += gold;

    let dropped: string | null = null;
    let lost = false;
    const dropRoll = Math.random();
    if (dropRoll < ECONOMY_BALANCE.equipDropChance || isBoss) {
      const item = createEquipDrop(1);
      const ok = this.inventory.add(item);
      if (ok) dropped = item.name;
      else {
        lost = true;
        dropped = null;
      }
    } else if (Math.random() < 0.18) {
      const mat = createMaterial(Math.random() < 0.75 ? "Ori" : "Lac", 1);
      const ok = this.inventory.add(mat);
      if (ok) dropped = mat.name;
      else lost = true;
    }
    return { gold, droppedItem: dropped, lostItem: lost };
  }
}

import { ECONOMY_BALANCE } from "../../data/balance/economy";
import type { InventoryService } from "../inventory/InventoryService";
import { createEquipDrop, createMaterial } from "../items/ItemFactory";


export class EconomyService {
  constructor(
    private readonly inventory: InventoryService,
    private readonly random: () => number = Math.random,
  ) {}

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
    const dropRoll = this.random();
    if (dropRoll < ECONOMY_BALANCE.equipDropChance || isBoss) {
      const item = createEquipDrop(1, this.random);
      const ok = this.inventory.add(item);
      if (ok) dropped = item.name;
      else {
        lost = true;
        dropped = null;
      }
    } else if (this.random() < ECONOMY_BALANCE.materialDropChance) {
      const mat = createMaterial(this.random() < ECONOMY_BALANCE.oriShare ? "Ori" : "Lac", 1);
      const ok = this.inventory.add(mat);
      if (ok) dropped = mat.name;
      else lost = true;
    }
    return { gold, droppedItem: dropped, lostItem: lost };
  }
}

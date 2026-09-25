import { ECONOMY_BALANCE } from "../../data/balance/economy";
import type { InventoryService } from "../inventory/InventoryService";
import { createEquipDrop, createMaterial } from "../items/ItemFactory";


export class EconomyService {
  dungeonIndex = 1;
  lootLevel = 1;

  constructor(
    private readonly inventory: InventoryService,
    private readonly random: () => number = Math.random,
  ) {}

  setDungeonIndexFromId(dungeonId: string): void {
    const match = /^dungeon-(\d+)$/.exec(dungeonId);
    this.dungeonIndex = match ? Number(match[1]) : 1;
  }

  grantKillLoot(archetype: "fixed" | "chaser" | "ranged" | "boss", isBoss: boolean): {
    gold: number;
    droppedItem: string | null;
    lostItem: boolean;
  } {
    const key = isBoss ? "boss" : archetype;
    let gold = ECONOMY_BALANCE.goldPerKill[key] ?? 2;
    if (this.dungeonIndex === 1) gold *= 10;
    this.inventory.gold += gold;

    let dropped: string | null = null;
    let lost = false;
    const dropRoll = this.random();
    const equipChance = isBoss ? ECONOMY_BALANCE.bossEquipDropChance : ECONOMY_BALANCE.equipDropChance;
    if (dropRoll < equipChance) {
      const item = createEquipDrop(this.lootLevel, this.random);
      const ok = this.inventory.add(item);
      if (ok) dropped = item.name;
      else {
        lost = true;
        dropped = null;
      }
    } else if (this.random() < ECONOMY_BALANCE.materialDropChance) {
      const high = isBoss || this.dungeonIndex > ECONOMY_BALANCE.oriUntilDungeon;
      const mat = createMaterial(high ? "Lac" : "Ori", 1);
      const ok = this.inventory.add(mat);
      if (ok) dropped = mat.name;
      else lost = true;
    }
    return { gold, droppedItem: dropped, lostItem: lost };
  }
}

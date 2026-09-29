import { ECONOMY_BALANCE } from "../../data/balance/economy";
import { applyGlobalKillGoldMultiplier } from "../../data/balance/gold-modifiers";
import type { InventoryService } from "../inventory/InventoryService";
import { createEquipDrop, createFromCatalog, createMaterial } from "../items/ItemFactory";

export type KillLootResult = {
  gold: number;
  droppedItem: string | null;
  lostItem: string | null;
};

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

  grantKillLoot(
    archetype: "fixed" | "chaser" | "ranged" | "boss",
    isBoss: boolean,
    monsterId?: string,
    globalGoldMultiplier = 1,
  ): KillLootResult {
    const key = isBoss ? "boss" : archetype;
    let gold = Number.isFinite(ECONOMY_BALANCE.goldPerKill[key]) ? ECONOMY_BALANCE.goldPerKill[key] : 2;
    if (this.dungeonIndex === 1) gold *= 10;
    if (!Number.isFinite(gold) || gold < 0) gold = 0;
    gold = applyGlobalKillGoldMultiplier(gold, globalGoldMultiplier);
    this.inventory.gold += gold;

    let dropped: string | null = null;
    let lost: string | null = null;
    const dropRoll = this.random();
    const equipChance = isBoss ? ECONOMY_BALANCE.bossEquipDropChance : ECONOMY_BALANCE.equipDropChance;
    if (dropRoll < equipChance) {
      const item = createEquipDrop(this.lootLevel, this.random);
      const res = this.inventory.add(item);
      if (res.ok) {
        dropped = item.name;
      } else {
        if (res.added > 0) dropped = item.name;
        lost = item.name;
      }
    } else if (this.dungeonIndex === 2 && monsterId && (monsterId === "caveira_normal" || monsterId === "caveira_especial")) {
      const chaliceChance = monsterId === "caveira_especial" ? 1 : 0.1;
      if (this.random() < chaliceChance) {
        const colorIndex = Math.floor(this.random() * 12) + 1;
        const item = createFromCatalog(`chalice_xp_${String(colorIndex).padStart(2, "0")}`);
        if (item) {
          const res = this.inventory.add(item);
          if (res.ok || res.added > 0) dropped = item.name;
          if (!res.ok) lost = item.name;
        }
      }
    } else if (this.dungeonIndex > 1 && this.random() < ECONOMY_BALANCE.xpChaliceDropChance) {
      const colorIndex = Math.floor(this.random() * 12) + 1;
      const item = createFromCatalog(`chalice_xp_${String(colorIndex).padStart(2, "0")}`);
      if (item) {
        const res = this.inventory.add(item);
        if (res.ok || res.added > 0) dropped = item.name;
        if (!res.ok) lost = item.name;
      }
    } else if (this.random() < ECONOMY_BALANCE.materialDropChance) {
      const high = isBoss || this.dungeonIndex > ECONOMY_BALANCE.oriUntilDungeon;
      const mat = createMaterial(high ? "Lac" : "Ori", 1);
      const res = this.inventory.add(mat);
      if (res.ok) {
        dropped = mat.name;
      } else {
        if (res.added > 0) dropped = mat.name;
        lost = mat.name;
      }
    }
    return { gold, droppedItem: dropped, lostItem: lost };
  }
}

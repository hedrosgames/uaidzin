import { ITEM_CATALOG } from "../../data/items/item-catalog";
import type { BuffService } from "../character/BuffService";
import type { CharacterModel } from "../character/CharacterModel";
import type { InventoryService } from "../inventory/InventoryService";

export type ItemUseResult = { ok: true; itemId: string } | { ok: false; reason: "missing" | "unsupported" | "invalid" };

export class ItemUseService {
  constructor(
    private readonly inventory: InventoryService,
    private readonly character: CharacterModel,
    private readonly buffs: BuffService,
    private readonly grantXp: (amount: number) => void,
  ) {}

  use(uid: string): ItemUseResult {
    const item = this.inventory.items.find((candidate) => candidate.uid === uid);
    if (!item) return { ok: false, reason: "missing" };

    const def = ITEM_CATALOG[item.defId];
    const effect = def?.effect;
    if (!effect) return { ok: false, reason: "unsupported" };
    if (effect.type === "composition_component") return { ok: false, reason: "unsupported" };
    if (effect.type === "restore") {
      if (this.character.isDead) return { ok: false, reason: "invalid" };
      const needsHp = effect.hp > 0 && this.character.hp < this.character.maxHp;
      const needsMp = effect.mp > 0 && this.character.mp < this.character.maxMp;
      if (!needsHp && !needsMp) return { ok: false, reason: "invalid" };
    }

    if (effect.type === "restore") {
      this.character.heal(effect.hp);
      this.character.regenMp(effect.mp);
    } else if (effect.type === "cleanse") {
      this.buffs.cleanse();
    } else if (effect.type === "xp_multiplier") {
      this.buffs.add({ id: item.defId, stat: "xpMultiplier", magnitude: effect.magnitude, remainingSec: effect.durationSec, stacks: 1 });
    } else if (effect.type === "attack_flat") {
      this.buffs.add({ id: item.defId, stat: "damageFlat", magnitude: effect.magnitude, remainingSec: effect.durationSec, stacks: 1 });
    } else if (effect.type === "grant_xp") {
      this.grantXp(effect.amount);
    } else if (effect.type === "currency") {
      this.inventory.gold += item.stack;
    }

    if (effect.type === "currency") this.inventory.remove(uid);
    else this.consumeOne(uid);
    return { ok: true, itemId: item.defId };
  }

  private consumeOne(uid: string): void {
    const item = this.inventory.items.find((candidate) => candidate.uid === uid);
    if (!item) return;
    if (item.stack > 1) {
      item.stack -= 1;
      return;
    }
    this.inventory.remove(uid);
  }
}

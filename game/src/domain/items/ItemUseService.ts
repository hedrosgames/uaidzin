import { ITEM_CATALOG } from "../../data/items/item-catalog";
import type { BuffService } from "../character/BuffService";
import type { CharacterModel } from "../character/CharacterModel";
import type { InventoryService } from "../inventory/InventoryService";

export type ItemUseResult =
  | { ok: true; itemId: string }
  | { ok: false; reason: "missing" | "unsupported" | "invalid" | "cooldown" };

export type ReviveCooldownGate = {
  remainingSec: () => number;
  start: (sec: number) => void;
};

export class ItemUseService {
  constructor(
    private readonly inventory: InventoryService,
    private readonly character: CharacterModel,
    private readonly buffs: BuffService,
    private readonly grantXp: (amount: number, defId?: string) => void,
    private readonly reviveCooldown?: ReviveCooldownGate,
    private readonly learnBookSkill?: (skillId: string) => boolean,
  ) {}

  use(uid: string): ItemUseResult {
    const item = this.inventory.items.find((candidate) => candidate.uid === uid);
    if (!item) return { ok: false, reason: "missing" };

    const def = ITEM_CATALOG[item.defId];
    const effect = def?.effect;
    if (!effect) return { ok: false, reason: "unsupported" };
    if (effect.type === "composition_component") return { ok: false, reason: "unsupported" };

    if (effect.type === "learn_book") {
      if (!this.learnBookSkill?.(effect.skillId)) return { ok: false, reason: "invalid" };
      this.consumeOne(uid);
      return { ok: true, itemId: item.defId };
    }

    if (effect.type === "revive") {
      if (!this.character.isDead) return { ok: false, reason: "invalid" };
      const left = this.reviveCooldown?.remainingSec() ?? 0;
      if (left > 0) return { ok: false, reason: "cooldown" };
      this.character.healFull();
      this.reviveCooldown?.start(effect.cooldownSec);
      this.consumeOne(uid);
      return { ok: true, itemId: item.defId };
    }

    if (effect.type === "restore") {
      if (this.character.isDead) return { ok: false, reason: "invalid" };
      const needsHp = effect.hp > 0 && this.character.hp < this.character.maxHp;
      const needsMp = effect.mp > 0 && this.character.mp < this.character.maxMp;
      if (!needsHp && !needsMp) return { ok: false, reason: "invalid" };
    }

    if (this.character.isDead) return { ok: false, reason: "invalid" };

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
      this.grantXp(effect.amount, item.defId);
    } else if (effect.type === "currency") {
      this.inventory.gold += item.stack;
      this.inventory.remove(uid);
      return { ok: true, itemId: item.defId };
    }

    this.consumeOne(uid);
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

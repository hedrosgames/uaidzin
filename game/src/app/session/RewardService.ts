import type { Object3D } from "three";
import { DUNGEON_BALANCE } from "../../data/balance/dungeon";
import { QUEST_BY_ID } from "../../data/quests/quest-definitions";
import type { ProgressionService } from "../../domain/progression/ProgressionService";
import type { CharacterModel } from "../../domain/character/CharacterModel";
import type { BuffService } from "../../domain/character/BuffService";
import type { SkillTreeService } from "../../domain/skills/SkillTreeService";
import type { SkillLoadout } from "../../domain/combat/SkillLoadout";
import type { InventoryService } from "../../domain/inventory/InventoryService";
import type { CompositionService } from "../../domain/items/CompositionService";
import type { QuestService } from "../../domain/quests/QuestService";
import type { DungeonRun } from "../../domain/dungeons/DungeonRun";
import type { EconomyService } from "../../domain/economy/EconomyService";
import type { SaveCoordinator } from "../../persistence/SaveCoordinator";
import type { EffectManager } from "../../presentation/effects/EffectManager";
import type { EventBus } from "../../core/events/EventBus";
import type { PlayerRuntime } from "../../gameplay/PlayerRuntime";
import type { DropLogKind } from "../../ui/HudModel";

export interface RewardServiceDeps {
  progression: ProgressionService;
  character: CharacterModel;
  buffs?: BuffService;
  skillTree: SkillTreeService;
  skillLoadout: SkillLoadout;
  inventory: InventoryService;
  composition: CompositionService;
  quests: QuestService;
  dungeonRun: DungeonRun;
  economy: EconomyService;
  saves: SaveCoordinator;
  effects: EffectManager;
  bus: EventBus;
  player: PlayerRuntime;
  playerMesh: () => Object3D | undefined;
  getActiveDungeonId: () => string;
  pushDropLog: (text: string, kind: DropLogKind) => void;
  showToast: (text: string, kind?: "skill" | "attr" | "level" | "dungeon") => void;
  addSessionXp: (amount: number) => void;
  onKill?: (enemyId: string) => void;
}

export class RewardService {
  private hasPendingKillCheckpoint = false;

  constructor(private readonly deps: RewardServiceDeps) {}

  grantKillXp(enemy: {
    id: string;
    archetype: string;
    isBoss: boolean;
    xpReward?: number;
    monsterId?: string;
  }): void {
    const isBoss = enemy.isBoss;
    const key = isBoss ? "boss" : (enemy.archetype as "fixed" | "chaser" | "ranged");
    let xp =
      enemy.xpReward ??
      DUNGEON_BALANCE.xpPerKill[isBoss ? "boss" : enemy.archetype as "fixed" | "chaser" | "ranged"] ??
      8;
    const xpBuff = this.deps.buffs?.active.find((buff) => buff.stat === "xpMultiplier");
    if (xpBuff) xp = Math.round(xp * (1 + (xpBuff.magnitude ?? 0)));
    this.deps.addSessionXp(xp);
    const { levelsGained } = this.deps.progression.addXp(xp);
    this.deps.dungeonRun.addKill(xp);
    this.deps.onKill?.(enemy.id);
    this.deps.economy.lootLevel = this.deps.character.level;
    const loot = this.deps.economy.grantKillLoot(key, isBoss, enemy.monsterId);
    if (loot.droppedItem) {
      const goldBit = loot.gold > 0 ? `+${loot.gold} Ouro · ` : "";
      this.deps.pushDropLog(`${goldBit}${loot.droppedItem}`, "item");
    } else if (loot.gold > 0) {
      this.deps.pushDropLog(`+${loot.gold} Ouro`, "gold");
    }
    if (loot.lostItem) {
      this.deps.pushDropLog(`Bolsa cheia: ${loot.lostItem} perdido.`, "lost");
    }
    this.applyQuestKillProgress();
    if (levelsGained > 0) {
      this.deps.skillTree.grantSkillPoints(levelsGained);
      this.deps.skillLoadout.refresh();
      this.deps.character.healFull();
      const mesh = this.deps.playerMesh();
      if (mesh) {
        this.deps.effects.levelUpPulse(mesh, {
          x: this.deps.player.x,
          z: this.deps.player.z,
        });
      }
      this.deps.effects.spawnDamageNumber(
        this.deps.player.x,
        2.2,
        this.deps.player.z,
        this.deps.progression.state.level,
        "kill",
      );
      this.deps.bus.emit("character:level-up", {
        level: this.deps.progression.state.level,
        levelsGained,
      });
    }
    this.deps.saves.markDirty(
      levelsGained > 0 ? ["character", "inventory", "progress", "skills"] : ["character", "inventory", "progress"],
      "critical",
    );
    this.hasPendingKillCheckpoint = true;
  }

  flushFrameCheckpoint(): void {
    if (!this.hasPendingKillCheckpoint) return;
    this.hasPendingKillCheckpoint = false;
    void this.deps.saves.checkpoint();
  }

  applyQuestKillProgress(): void {
    const { completedIds } = this.deps.quests.recordKill();
    for (const id of completedIds) {
      const def = QUEST_BY_ID[id];
      if (!def) continue;
      if (def.reward.xp > 0) {
        const { levelsGained } = this.deps.progression.addXp(def.reward.xp);
        if (levelsGained > 0) {
          this.deps.skillTree.grantSkillPoints(levelsGained);
          this.deps.skillLoadout.refresh();
        }
      }
      if (def.reward.gold > 0) this.deps.inventory.gold += def.reward.gold;
      this.deps.showToast(`Missão concluída: ${def.title}.`, "level");
    }
    if (completedIds.length) {
      this.deps.saves.markDirty(["character", "skills", "skillLoadout", "inventory", "progress"], "critical");
      this.hasPendingKillCheckpoint = true;
    }
  }

  tryCompose(recipeId: string, itemUid: string, random?: () => number): {
    attempted: boolean;
    success: boolean;
    message: string;
    recipeId: string;
  } {
    const result = this.deps.composition.compose(recipeId, itemUid, random);
    if (result.attempted || result.message) {
      this.deps.showToast(result.message, result.attempted ? "skill" : "dungeon");
    }
    if (result.attempted) {
      this.deps.saves.markDirty(["inventory", "equipment"], "critical");
      void this.deps.saves.checkpoint();
    }
    return result;
  }

  acceptQuest(questId: string): { ok: boolean; message: string } {
    const result = this.deps.quests.accept(questId);
    this.deps.showToast(result.message, result.ok ? "skill" : "dungeon");
    if (result.ok) {
      this.deps.saves.markDirty("progress", "critical");
      void this.deps.saves.checkpoint();
    }
    return result;
  }
}

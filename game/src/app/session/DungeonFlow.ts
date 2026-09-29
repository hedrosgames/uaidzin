import { createSceneFadeOverlay, type SceneFadeOverlay } from "../BootFlow";
import { hideGameLoading, showGameLoading } from "../../ui/LoadingScreen";
import { DUNGEON_TEST, type DungeonDef } from "../../data/dungeons/dungeon-definitions";
import { DUNGEONS_MORTAL, dungeonsAllowedForLevel, findDungeon } from "../../data/dungeons/dungeons-mortal";
import type { WorldId } from "../../world/WorldManager";
import type { DungeonEnterReason, DungeonEnterResult } from "./types";
import type { InventoryService } from "../../domain/inventory/InventoryService";
import type { ProgressionService } from "../../domain/progression/ProgressionService";
import type { CharacterModel } from "../../domain/character/CharacterModel";
import type { DungeonRun } from "../../domain/dungeons/DungeonRun";
import type { EconomyService } from "../../domain/economy/EconomyService";
import type { SaveCoordinator } from "../../persistence/SaveCoordinator";
import type { EffectManager } from "../../presentation/effects/EffectManager";
import type { SceneRenderer } from "../../presentation/rendering/SceneRenderer";
import type { EnemyService } from "../../domain/enemies/EnemyService";
import type { EventBus } from "../../core/events/EventBus";

export type LeaveReason = "timer" | "death" | "exit";

export interface DungeonFlowDeps {
  inventory: InventoryService;
  progression: ProgressionService;
  character: CharacterModel;
  dungeonRun: DungeonRun;
  economy: EconomyService;
  saves: SaveCoordinator;
  effects: EffectManager;
  renderer: SceneRenderer;
  enemies: EnemyService;
  bus: EventBus;
  enterWorld: (id: WorldId) => void | Promise<void>;
  getWorldId: () => WorldId;
  ensureSceneFade?: () => SceneFadeOverlay;
  clearDeathReturnTimer: () => void;
  clearResultHold: () => void;
}

export class DungeonFlow {
  worldFadeBusy = false;
  pendingLeaveReason: LeaveReason | null = null;
  activeDungeonId = "dungeon-test";
  private sceneFade: SceneFadeOverlay | null = null;

  constructor(private readonly deps: DungeonFlowDeps) {}

  ensureSceneFade(): SceneFadeOverlay {
    if (this.deps.ensureSceneFade) {
      return this.deps.ensureSceneFade();
    }
    if (!this.sceneFade) {
      this.sceneFade = createSceneFadeOverlay(document.body);
    }
    return this.sceneFade;
  }

  dungeonEntryGate(dungeonId: string): { ok: true; def: DungeonDef } | { ok: false; reason: DungeonEnterReason; def?: DungeonDef } {
    const def = findDungeon(dungeonId);
    if (!def) return { ok: false, reason: "missing" };
    if (this.deps.progression.state.evolution !== "Mortal") {
      return { ok: false, reason: "evolution", def };
    }
    if (this.deps.character.level < def.minLevel || this.deps.character.level > def.maxLevel) {
      return { ok: false, reason: "level", def };
    }
    if (def.entryItemId) {
      if (this.deps.inventory.countMaterial(def.entryItemId) < 1) {
        return { ok: false, reason: "entry", def };
      }
    }
    return { ok: true, def };
  }

  entryItemCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const dungeon of DUNGEONS_MORTAL) {
      const id = dungeon.entryItemId;
      if (!id || counts[id] != null) continue;
      counts[id] = this.deps.inventory.countMaterial(id);
    }
    return counts;
  }

  allDungeons(): DungeonDef[] {
    return DUNGEONS_MORTAL;
  }

  eligibleDungeons(): DungeonDef[] {
    return dungeonsAllowedForLevel(this.deps.progression.state.level);
  }

  pickDungeonForLevel(): DungeonDef {
    const list = dungeonsAllowedForLevel(this.deps.progression.state.level);
    return list[list.length - 1] ?? DUNGEON_TEST;
  }

  tryEnterDungeon(dungeonId: string): DungeonEnterResult {
    if (this.worldFadeBusy) {
      return { ok: false, reason: "busy" };
    }
    const gate = this.dungeonEntryGate(dungeonId);
    if (!gate.ok) return { ok: false, reason: gate.reason };

    if (gate.def.entryItemId) {
      if (!this.deps.inventory.consumeMaterial(gate.def.entryItemId, 1)) {
        return { ok: false, reason: "entry" };
      }
      this.deps.saves.markDirty("inventory", "critical");
    }

    void this.deps.saves.checkpoint();

    this.activeDungeonId = gate.def.id;
    this.deps.economy.setDungeonIndexFromId(gate.def.id);

    void this.executeEnterFade(gate.def.id);
    return { ok: true };
  }

  private async executeEnterFade(dungeonId: string): Promise<void> {
    this.deps.effects.clearSkillVfx();
    this.worldFadeBusy = true;
    showGameLoading();
    const fade = this.ensureSceneFade();
    try {
      await fade.fadeIn();
      try {
        await this.deps.enterWorld(dungeonId === "dungeon-1" || dungeonId === "dungeon-2" ? dungeonId : "dungeon-test");
      } catch {
        await this.deps.enterWorld("city");
      }
      await hideGameLoading();
      await fade.fadeOut();
    } finally {
      this.worldFadeBusy = false;
      this.handlePendingLeave();
      await hideGameLoading();
    }
  }

  async withWorldFade(swap: () => void | Promise<void>): Promise<void> {
    if (this.worldFadeBusy) {
      await swap();
      return;
    }
    this.deps.effects.clearSkillVfx();
    this.worldFadeBusy = true;
    const fade = this.ensureSceneFade();
    try {
      await fade.fadeIn();
      await swap();
      await fade.fadeOut();
    } finally {
      this.worldFadeBusy = false;
      this.handlePendingLeave();
    }
  }

  async leaveDungeonWithFade(reason: LeaveReason): Promise<void> {
    if (this.worldFadeBusy) {
      this.pendingLeaveReason = reason;
      return;
    }
    this.deps.effects.clearSkillVfx();
    this.worldFadeBusy = true;
    this.deps.character.isDead = false;
    this.deps.clearDeathReturnTimer();
    const fade = this.ensureSceneFade();
    try {
      await fade.fadeIn();
      const result = this.deps.dungeonRun.end(reason);
      this.deps.enemies.clear();
      this.deps.effects.hideAllHpBars();
      this.deps.renderer.playerView.clearDeath();
      this.deps.bus.emit("session:result", { text: null });
      this.deps.clearResultHold();
      this.deps.bus.emit("dungeon:completed", {
        dungeonId: result.dungeonId,
        reason: result.reason,
        kills: result.kills,
        xp: result.xpGained,
      });
      this.deps.character.healFull();
      await this.deps.enterWorld("city");
      this.deps.saves.markDirty("character", reason === "death" ? "critical" : "deferred");
      await fade.fadeOut();
    } finally {
      this.worldFadeBusy = false;
      this.handlePendingLeave();
    }
  }

  returnToCityWithFade(): void {
    if (this.worldFadeBusy) {
      this.pendingLeaveReason = "exit";
      return;
    }
    void this.withWorldFade(async () => {
      this.deps.renderer.playerView.clearDeath();
      this.deps.character.isDead = false;
      await this.deps.enterWorld("city");
      void this.deps.saves.checkpoint();
    });
  }

  finishDungeon(reason: LeaveReason): void {
    if (this.worldFadeBusy) {
      this.pendingLeaveReason = reason;
      return;
    }
    void this.leaveDungeonWithFade(reason);
  }

  private handlePendingLeave(): void {
    if (!this.pendingLeaveReason) return;
    const reason = this.pendingLeaveReason;
    this.pendingLeaveReason = null;
    if (this.deps.getWorldId() !== "city") {
      void this.leaveDungeonWithFade(reason);
    }
  }
}

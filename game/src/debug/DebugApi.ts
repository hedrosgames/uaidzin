import { isWirePanelName } from "../ui/WireUi";
import { WEAPON_SET_IDS, isWeaponSetId } from "../presentation/player/WeaponRig";
import { dungeonEnterMessage } from "../app/CityGameSession";
import { clearBootCharacter } from "../app/BootFlow";
import { saveVault } from "../persistence/SaveVault";
import type { CityGameSession } from "../app/CityGameSession";
import type { GameStateStore } from "../core/state/GameStateStore";
import type { SceneRenderer } from "../presentation/rendering/SceneRenderer";
import type { WireUi } from "../ui/WireUi";
import { createWireGameApi } from "../ui/WireGameBridge";
import { PROFILE_SECTIONS, type CharacterViewModel, type SaveTarget } from "../persistence/SaveTypes";

function assertNever(value: never): never {
  throw new Error(String(value));
}

function normalizeTimeScale(n: number): 1 | 2 | 4 | 10 {
  if (n >= 10) return 10;
  if (n >= 4) return 4;
  if (n >= 2) return 2;
  return 1;
}

export type DebugSnapshot = {
  mode: string;
  level: number;
  evolution: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  invUsed: number;
  playerX: number;
  playerZ: number;
  playerFacing: number;
  world: string | null;
  classId: string;
  playerName: string;
  panelsOpen: boolean;
  entered: boolean;
  timerPhase: string;
  timerRemaining: number;
  kills: number;
  enemiesAlive: number;
  fxCount: number;
  skillPoints: number;
  unspentPoints: number;
  skillSlots: number;
  timeScale: number;
  hasPlayerOutline: boolean;
  playerGhostVisible: boolean;
  playerDeadPose: boolean;
  deathEmitCount: number;
  autoAttackSwings: number;
  moveLock: number;
  dropLogCount: number;
};

export type DebugHost = {
  session: CityGameSession;
  state: GameStateStore;
  renderer: SceneRenderer;
  entered: boolean;
  timeScale: number;
  wireUi: WireUi | null;
  isPanelsOpen(): boolean;
  enterGame(): void;
  showToast(text: string, kind?: "skill" | "attr" | "level" | "dungeon"): void;
  pulseFrame(): void;
  currentViewModel(): CharacterViewModel;
};

export function installDebugApi(app: DebugHost): void {
  if (!import.meta.env.DEV) return;
  const w = window as unknown as { __UAIDZIN__?: unknown };
  if (import.meta.env.DEV) {
    void import("../integrations/threejs-devtools/registerThreeDevTools").then(({ registerThreeDevTools }) => {
      registerThreeDevTools({
        scene: app.renderer.scene,
        renderer: app.renderer.renderer,
        getCamera: () => app.session.camera.camera,
        getMixers: () => {
          const mixer = app.renderer.playerView.getAnimationMixer();
          return mixer ? [mixer] : [];
        },
        composer: app.renderer.getEffectComposer(),
      });
    });
  }
  const saveNow = (targets: SaveTarget[]) => {
    app.session.saves.markDirty(targets, "critical");
    return app.session.saves.checkpoint();
  };
  w.__UAIDZIN__ = {
    session: app.session,
    getState: () => app.state.getMode(),
    getSnapshot: (): DebugSnapshot => ({
      mode: app.state.getMode(),
      level: app.session.progression.state.level,
      evolution: app.session.progression.state.evolution,
      hp: app.session.character.hp,
      maxHp: app.session.character.maxHp,
      mp: app.session.character.mp,
      maxMp: app.session.character.maxMp,
      gold: app.session.inventory.gold,
      invUsed: app.session.inventory.usedSlots(),
      playerX: app.session.player.x,
      playerZ: app.session.player.z,
      playerFacing: app.session.player.facing,
      world: app.session.worlds.getCurrentId(),
      classId: app.session.skillTree.state.classId,
      playerName: app.session.character.name,
      panelsOpen: app.isPanelsOpen(),
      entered: app.entered,
      timerPhase: app.session.dungeonRun.getPhase(),
      timerRemaining: app.session.dungeonRun.getRemainingSeconds(),
      kills: app.session.dungeonRun.getKills(),
      enemiesAlive: app.session.enemies.enemies.filter((e) => e.alive).length,
      fxCount: app.session.effects.getCount(),
      skillPoints: app.session.skillTree.state.skillPoints,
      unspentPoints: app.session.progression.state.unspentAttributePoints,
      skillSlots: app.session.skillLoadout.slots.filter(Boolean).length,
      timeScale: app.timeScale,
      hasPlayerOutline: !!app.renderer.playerOutlineMesh.parent,
      playerGhostVisible: app.renderer.playerGhostMesh.visible,
      playerDeadPose: app.renderer.playerView.isDeadPose(),
      deathEmitCount: app.session.deathEmitCount,
      autoAttackSwings: app.session.autoAttackSwings,
      moveLock: app.session.getMoveLockRemaining(),
      dropLogCount: app.session.getDropLog().length,
    }),
    getDropLog: () => app.session.getDropLog(),
    clearDropLog: () => app.session.clearDropLog(),
    forcePlayerDeath: () => app.session.debug.forceDeath(),
    setArmorAuraEnabled: (on: boolean) => {
      app.session.setArmorAuraEnabled(on);
    },
    setWeaponSet: (id: string) => {
      if (!isWeaponSetId(id)) return WEAPON_SET_IDS;
      void app.renderer.playerView.setWeaponSet(id);
      return id;
    },
    getWeaponSet: () => app.renderer.playerView.getWeaponSet(),
    getCombatAnimProbe: () => app.renderer.playerView.getCombatAnimProbe(),
    openPanel: (name: string, title?: string, shopId?: string) => {
      if (app.wireUi && isWirePanelName(name)) {
        app.wireUi.open(name, { title, shopId });
      }
    },
    closePanels: () => {
      app.wireUi?.close();
    },
    skipToGame: () => {
      app.session.skillTree.setClass(app.session.skillTree.state.classId || "TK");
      app.session.skillLoadout.refresh();
      app.session.progression.recomputeCombatStats();
      app.session.character.healFull();
      app.wireUi?.close();
      app.enterGame();
    },
    setClass: (id: string) => {
      app.session.skillTree.setClass(id as never);
      app.session.progression.setClassId(id as never);
      app.session.saves.markDirty(["character", "skills", "skillLoadout"], "deferred");
      app.wireUi?.close();
    },
    enterDungeon: () => {
      const id = app.session.pickDungeonForLevel().id;
      return app.session.tryEnterDungeon(id);
    },
    enterDungeonById: (id: string) => {
      const result = app.session.tryEnterDungeon(id);
      if (result.ok) {
        app.wireUi?.close();
        return result;
      }
      switch (result.reason) {
        case "entry":
        case "level":
        case "evolution":
        case "missing":
        case "busy":
          app.showToast(dungeonEnterMessage(result.reason), "dungeon");
          break;
        default:
          assertNever(result.reason);
      }
      return result;
    },
    getPortalContext: () => ({
      level: app.session.character.level,
      evolution: app.session.progression.state.evolution,
      entryCounts: app.session.entryItemCounts(),
      dungeons: app.session.allDungeons().map((d) => ({
        id: d.id,
        name: d.name,
        minLevel: d.minLevel,
        maxLevel: d.maxLevel,
        entryItemId: d.entryItemId ?? null,
        durationSeconds: d.durationSeconds,
      })),
    }),
    listEligibleDungeons: () =>
      app.session.eligibleDungeons().map((d) => ({
        id: d.id,
        name: d.name,
        minLevel: d.minLevel,
        maxLevel: d.maxLevel,
        entryItemId: d.entryItemId ?? null,
        durationSeconds: d.durationSeconds,
      })),
    teleportPlayer: (x: number, z: number) => {
      app.session.player.setPosition(x, z);
    },
    getFxCount: () => app.session.effects.getCount(),
    learnFirstSkill: () => {
      app.session.debug.addLevels(1);
      const okLearn = app.session.skillTree.learn("fisica", 0);
      if (okLearn) {
        app.session.onSkillLearned("fisica", 0);
        if (import.meta.env.DEV) {
          const s0 = app.session.skillTree.getTree("fisica")[0];
          const slotIdx = app.session.skillLoadout.slots.findIndex((s) => s?.skill.id === s0?.id);
          if (slotIdx >= 0 && app.session.skillLoadout.slots[slotIdx]) {
            app.session.skillLoadout.slots[slotIdx]!.auto = true;
          }
        }
      }
      return { learned: okLearn, slots: app.session.skillLoadout.slots.filter(Boolean).length, names: app.session.skill.slotLabels() };
    },
    learnRandomSkill: () => {
      const result = app.session.debug.learnRandomSkill();
      if (result.learned) {
        app.showToast(`Skill ${result.skillId} aprendida`, "skill");
        app.pulseFrame();
        app.session.saves.markDirty(["skills", "skillLoadout"], "deferred");
      }
      return result;
    },
    spendRandomAttributes: () => {
      const result = app.session.debug.spendRandomAttributes();
      if (result.spent > 0) {
        app.showToast(`+${result.spent} pts · ${result.breakdown}`, "attr");
        app.pulseFrame();
      }
      return result;
    },
    setTimeScale: (n: number) => {
      app.timeScale = normalizeTimeScale(n);
      return app.timeScale;
    },
    getTimeScale: () => app.timeScale,
    getEnemyMeshState: () => app.session.allEnemyMeshStates(),
    getAliveEnemies: () =>
      app.session.enemies.enemies.filter((e) => e.alive).map((e) => ({ id: e.id, x: e.x, z: e.z })),
    toCity: () => app.session.returnToCityWithFade(),
    openInteractionById: (id: string) => {
      const world = app.session.worlds.getCurrent();
      const def = world?.interactables.find((i) => i.id === id);
      if (!def) return false;
      app.session.openInteraction(def);
      return true;
    },
    queueInteractById: (id: string) => {
      const world = app.session.worlds.getCurrent();
      const def = world?.interactables.find((i) => i.id === id);
      if (!def) return false;
      app.session.beginInteract(def);
      return true;
    },
    confirmInteraction: (id: string) => app.session.confirmInteraction(id),
    debugSetTimer: (s: number) => app.session.debug.setTimer(s),
    debugAddLevels: (n: number) => app.session.debug.addLevels(n),
    persistSave: () => saveNow([...PROFILE_SECTIONS]),
    login: (userId: string, password: string) => saveVault.login(userId, password),
    sessionUser: () => saveVault.getSession()?.user || null,
    persistAccountVault: () => saveNow(["vault"]),
    clearSave: () => {
      clearBootCharacter();
      return saveVault.wipeProfile(app.session.saveService.getProfileId());
    },
    save: {
      persist: () => saveNow([...PROFILE_SECTIONS]),
      flush: () => app.session.saves.checkpoint(),
      wipeProfile: (id?: string) => saveVault.wipeProfile(id || app.session.saveService.getProfileId()),
      wipeAccount: (user?: string) => saveVault.wipeAccount(user || saveVault.getSession()?.user || "admin"),
      wipeAll: (includeSettings?: boolean) => saveVault.wipeAll(!!includeSettings),
      status: () => saveVault.getStatus(),
      lastError: () => saveVault.getLastError(),
      writeCount: () => saveVault.getWriteCount(),
      pendingCritical: () => saveVault.hasPendingCritical(),
      writeMirror: () => saveVault.writeMirror(),
      exportProfile: () => saveVault.exportProfile(),
      importProfile: (json: string) => saveVault.importProfile(json),
    },
    vault: {
      snapshot: () => app.session.accountVault.snapshot(),
      depositGold: (n: number) => app.session.vaultTransfer.depositGold(n),
      withdrawGold: (n: number) => app.session.vaultTransfer.withdrawGold(n),
      moveToVault: (uid: string) => app.session.vaultTransfer.moveItemToVault(uid),
      moveFromVault: (uid: string) => app.session.vaultTransfer.moveItemFromVault(uid),
    },
    bags: {
      unlocked: () => app.session.bags.snapshot(),
      unlock: (i: number) => {
        app.session.bags.unlock(i);
        app.session.saves.markDirty("bags", "deferred");
      },
    },
    composer: {
      listEligible: (recipeId: string) =>
        app.session.composition.listEligible(recipeId).map((it) => ({
          uid: it.uid,
          defId: it.defId,
          name: it.name,
          refine: it.refine,
          rarity: it.rarity,
          slot: it.slot,
          attackBonus: it.attackBonus,
          defenseBonus: it.defenseBonus,
          stack: it.stack,
        })),
      canAttempt: (recipeId: string, itemUid: string) =>
        app.session.composition.canAttempt(recipeId, itemUid),
      compose: (recipeId: string, itemUid: string) => {
        const result = app.session.tryCompose(recipeId, itemUid);
        app.wireUi?.applyCharacter(app.currentViewModel());
        return result;
      },
    },
    quests: {
      list: () => app.session.quests.listForUi(),
      accept: (questId: string) => {
        const result = app.session.acceptQuest(questId);
        app.wireUi?.applyCharacter(app.currentViewModel());
        return result;
      },
    },
    wire: createWireGameApi(app.session, () => {
      app.wireUi?.applyCharacter(app.currentViewModel());
    }),
    account: {
      createSlot: (input: {
        slotIndex: number;
        classId: string;
        name: string;
        level?: number;
        gold?: number;
      }) => saveVault.createSlot(input),
      deleteSlot: (slotIndex: number) => saveVault.deleteSlot(slotIndex),
      listSlots: () => saveVault.listSlots(),
      loadSlot: async (slotIndex: number) => {
        await app.session.saves.checkpoint();
        const slots = await saveVault.listSlots();
        const summary = slots[slotIndex];
        if (!summary) return false;
        const previous = app.session.saveService.getProfileId();
        app.session.saveService.setProfileId(summary.profileId);
        const loaded = await app.session.loadSave();
        if (loaded.status !== "found") {
          app.session.saveService.setProfileId(previous);
          return false;
        }
        await app.session.reloadAccountVault();
        app.wireUi?.applyCharacter(app.currentViewModel());
        return true;
      },
    },
  };
}

import { Vector3 } from "three";
import { COMBAT_BALANCE } from "../data/balance/combat";
import { DUNGEON_BALANCE } from "../data/balance/dungeon";
import { VFX_BALANCE } from "../data/balance/vfx";
import type { EventBus } from "../core/events/EventBus";
import { CharacterModel } from "../domain/character/CharacterModel";
import { AttackController } from "../domain/combat/AttackController";
import { SkillController } from "../domain/combat/SkillController";
import { SkillLoadout } from "../domain/combat/SkillLoadout";
import { FormState } from "../domain/combat/FormState";
import { SummonRuntime } from "../domain/combat/SummonRuntime";
import { EnemyAI } from "../domain/enemies/EnemyAI";
import { EnemyService } from "../domain/enemies/EnemyService";
import { DungeonRun } from "../domain/dungeons/DungeonRun";
import { ProgressionService } from "../domain/progression/ProgressionService";
import { SkillTreeService } from "../domain/skills/SkillTreeService";
import { CompositionService } from "../domain/items/CompositionService";
import { QuestService } from "../domain/quests/QuestService";
import { InventoryService } from "../domain/inventory/InventoryService";
import { BagLockService } from "../domain/inventory/BagLockService";
import { EconomyService } from "../domain/economy/EconomyService";
import { RefinementService } from "../domain/items/RefinementService";
import { EquipmentService } from "../domain/items/EquipmentService";
import { ItemUseService } from "../domain/items/ItemUseService";
import { AccountVaultService } from "../domain/account/AccountVaultService";
import { BuffService } from "../domain/character/BuffService";
import { SaveService } from "../persistence/SaveService";
import { emptyProgress, type SavePayload, type LoadSaveResult } from "../persistence/SaveTypes";
import { saveVault } from "../persistence/SaveVault";
import { SaveCoordinator } from "../persistence/SaveCoordinator";
import { sellItem } from "../domain/economy/ShopService";
import type { DungeonDef } from "../data/dungeons/dungeon-definitions";
import { DUNGEON_TEST } from "../data/dungeons/dungeon-definitions";
import { findDungeon } from "../data/dungeons/dungeons-mortal";
import { CLASSES, type TreeId } from "../data/classes/class-definitions";
import { SKILL_TRAINING } from "../data/balance/economy";
import { isPotionDefId, resolveConsumableRestore } from "../data/balance/consumables";
import { ITEM_CATALOG, resolveItemIcon } from "../data/items/item-catalog";
import { SettingsPanel } from "../ui/SettingsPanel";
import { isWeaponSetId } from "../presentation/player/WeaponRig";
import { PROGRESSION_BALANCE } from "../data/balance/progression";
import {
  D1_GATE_Z,
  D2_LEVEL_START,
  d2ChaliceGrantXp,
} from "../data/balance/xp-progression";
import { canEngageEnemy } from "../domain/combat/CombatSpace";
import type { BootCharacter } from "./BootFlow";
import { PlayerController } from "../gameplay/PlayerController";
import type { InputService } from "../gameplay/InputService";
import type { HudModel, HudPotionSlot } from "../ui/HudModel";
import { PlayerRuntime } from "../gameplay/PlayerRuntime";
import { EnemyRuntimeView } from "../presentation/enemies/EnemyRuntimeView";
import { EffectManager } from "../presentation/effects/EffectManager";
import { GameCamera } from "../presentation/camera/GameCamera";
import { SceneRenderer } from "../presentation/rendering/SceneRenderer";
import { SummonView } from "../presentation/combat/SummonView";
import { WorldManager, type WorldId } from "../world/WorldManager";
import { InteractionPanel } from "../ui/InteractionPanel";
import type { InteractableDef } from "../world/definitions";
import { DungeonFlow, type LeaveReason } from "./session/DungeonFlow";
import { InteractionController, INTERACT_RANGE } from "./session/InteractionController";
import { CombatOrchestrator } from "./session/CombatOrchestrator";
import { GlobalKillGoldModifier } from "../domain/progression/GlobalKillGoldModifier";
import { GlobalKillXpModifier } from "../domain/progression/GlobalKillXpModifier";
import { RewardService } from "./session/RewardService";
import { VaultTransfer } from "./session/VaultTransfer";
import { SessionSnapshot } from "./session/SessionSnapshot";
import { SessionDebug } from "../debug/SessionDebug";
import type { ItemInstance } from "../domain/items/ItemModel";
import type { DungeonEnterReason, DungeonEnterResult } from "./session/types";
import { dungeonEnterMessage } from "./session/types";
import { projectWalkTarget } from "../world/collision";

export type DropLogKind = "gold" | "item" | "lost" | "info";

export interface DropLogEntry {
  id: number;
  text: string;
  kind: DropLogKind;
  atMs: number;
  life: number;
}

export type { SessionHud } from "./session/types";
export type { DungeonEnterReason, DungeonEnterResult };
export { dungeonEnterMessage };

export class CityGameSession {
  readonly player = new PlayerRuntime();
  readonly character = new CharacterModel({
    maxHp: COMBAT_BALANCE.player.maxHp,
    attack: COMBAT_BALANCE.player.attack,
    defense: COMBAT_BALANCE.player.defense,
  });
  readonly skillTree = new SkillTreeService();
  readonly progression = new ProgressionService(this.character, this.skillTree);
  readonly inventory = new InventoryService();
  readonly bags = new BagLockService();
  readonly accountVault = new AccountVaultService();
  readonly buffs = new BuffService();
  readonly economy = new EconomyService(this.inventory);
  readonly refinement = new RefinementService(this.inventory);
  readonly itemUse: ItemUseService;
  readonly equipment = new EquipmentService(this.inventory, this.character);
  readonly composition = new CompositionService(this.inventory, this.equipment);
  readonly quests = new QuestService(() => this.progressState.quests);
  readonly saveService = new SaveService();
  readonly saves = new SaveCoordinator(
    saveVault,
    () => this.snapshot.buildSavePayload(),
    () => this.accountVault.snapshot(),
  );
  readonly controller: PlayerController;
  readonly worlds: WorldManager;
  readonly camera: GameCamera;
  readonly enemies = new EnemyService();
  readonly attack = new AttackController();
  readonly skillLoadout = new SkillLoadout(this.skillTree);
  readonly skill = new SkillController(this.skillLoadout, this.character, this.skillTree);
  readonly form = new FormState();
  readonly summons = new SummonRuntime();
  readonly enemyAi = new EnemyAI();
  readonly dungeonRun = new DungeonRun();
  readonly globalKillXp = new GlobalKillXpModifier();
  readonly globalKillGold = new GlobalKillGoldModifier();
  readonly effects: EffectManager;
  readonly enemyView: EnemyRuntimeView;
  private readonly summonView: SummonView;

  readonly dungeonFlow: DungeonFlow;
  readonly interactions: InteractionController;
  readonly rewards: RewardService;
  readonly combat: CombatOrchestrator;
  readonly vaultTransfer: VaultTransfer;
  readonly snapshot: SessionSnapshot;
  readonly debug: SessionDebug;

  deathReturnTimer = 0;
  resultHold = 0;
  sessionXp = 0;
  lootToast: string | null = null;
  lootToastTimer = 0;
  uiToastKind: "skill" | "attr" | "level" | "dungeon" = "skill";
  hitStop = 0;
  moveLock = 0;
  private dropLog: DropLogEntry[] = [];
  private dropLogSeq = 0;
  private gateKeys: boolean[] = [];
  pendingSkillSlot = -1;
  hadSave = false;
  saveUnreadable = false;
  lastCombatMissAt = 0;
  deathEmitCount = 0;
  autoAttackSwings = 0;
  progressState: SavePayload["progress"] = emptyProgress();
  potionSlots: [string | null, string | null, string | null] = [null, null, null];
  autoAttack = true;
  autoMove = false;
  autoPotion = false;
  penaReviveCooldownSec = 0;
  private potionAutoCooldown = 0;

  private cachedWeaponReach: { attackRange: number; attackInterval: number } | null = null;
  private lastAttackRange = -1;
  private readonly passiveVfxOrigin = new Vector3();
  private hudListener?: (model: HudModel) => void;

  get activeDungeonId(): string {
    return this.dungeonFlow.activeDungeonId;
  }
  set activeDungeonId(id: string) {
    this.dungeonFlow.activeDungeonId = id;
  }

  get worldFadeBusy(): boolean {
    return this.dungeonFlow.worldFadeBusy;
  }

  constructor(
    readonly renderer: SceneRenderer,
    readonly bus: EventBus,
    canvas: HTMLCanvasElement,
    private readonly panel: InteractionPanel,
    private readonly input: InputService,
  ) {
    this.controller = new PlayerController(canvas, input);
    this.worlds = new WorldManager(renderer.worldRoot);
    this.camera = new GameCamera(1);
    this.enemyView = new EnemyRuntimeView(renderer.worldRoot);
    this.effects = new EffectManager(
      document.getElementById("ui-root") || document.body,
      renderer.scene,
    );
    this.enemyView.bindEffects(this.effects);
    this.summonView = new SummonView(renderer.scene);
    this.itemUse = new ItemUseService(
      this.inventory,
      this.character,
      this.buffs,
      (amount, defId) => this.grantItemXp(amount, defId),
      {
        remainingSec: () => this.penaReviveCooldownSec,
        start: (sec) => {
          this.penaReviveCooldownSec = Math.max(0, sec);
          this.saves.markDirty("options", "deferred");
        },
      },
      (skillId) => this.learnBookFromItem(skillId),
    );

    this.dungeonFlow = new DungeonFlow({
      inventory: this.inventory,
      progression: this.progression,
      character: this.character,
      dungeonRun: this.dungeonRun,
      economy: this.economy,
      saves: this.saves,
      effects: this.effects,
      renderer: this.renderer,
      enemies: this.enemies,
      bus: this.bus,
      enterWorld: (id) => this.enterWorld(id),
      getWorldId: () => (this.worlds.getCurrent()?.id as WorldId) ?? "city",
      clearDeathReturnTimer: () => {
        this.deathReturnTimer = 0;
      },
      clearResultHold: () => {
        this.resultHold = 0;
      },
    });

    this.interactions = new InteractionController({
      player: this.player,
      character: this.character,
      worlds: this.worlds,
      camera: this.camera,
      renderer: this.renderer,
      bus: this.bus,
      input: this.input,
      controller: this.controller,
      panel: this.panel,
      dungeonFlow: this.dungeonFlow,
      dungeonRun: this.dungeonRun,
      showToast: (text, kind) => this.setUiToast(text, kind),
    });

    this.rewards = new RewardService({
      progression: this.progression,
      character: this.character,
      buffs: this.buffs,
      skillTree: this.skillTree,
      skillLoadout: this.skillLoadout,
      inventory: this.inventory,
      composition: this.composition,
      quests: this.quests,
      dungeonRun: this.dungeonRun,
      economy: this.economy,
      saves: this.saves,
      effects: this.effects,
      bus: this.bus,
      player: this.player,
      playerMesh: () => this.renderer.playerMesh,
      getActiveDungeonId: () => this.activeDungeonId,
      pushDropLog: (text, kind) => this.pushDropLog(text, kind),
      showToast: (text, kind) => this.setUiToast(text, kind),
      addSessionXp: (amount) => {
        this.sessionXp += amount;
      },
      globalKillXpMultiplier: () => this.globalKillXp.get(),
      globalKillGoldMultiplier: () => this.globalKillGold.get(),
      onKill: (enemyId) => this.rollGateKey(enemyId),
    });

    this.combat = new CombatOrchestrator({
      enemies: this.enemies,
      enemyView: this.enemyView,
      attack: this.attack,
      skill: this.skill,
      skillLoadout: this.skillLoadout,
      skillTree: this.skillTree,
      buffs: this.buffs,
      form: this.form,
      summons: this.summons,
      summonView: this.summonView,
      character: this.character,
      progression: this.progression,
      equipment: this.equipment,
      effects: this.effects,
      renderer: this.renderer,
      bus: this.bus,
      player: this.player,
      rewards: this.rewards,
      enemyAi: this.enemyAi,
      worlds: this.worlds,
      lockFromAnim: (anim, fallback) => this.lockFromAnim(anim, fallback),
      skillSlotPressed: () => this.skillSlotPressed(),
      getWeaponReach: () => this.weaponReach(),
      onCombatMiss: () => {
        this.lastCombatMissAt = Date.now();
      },
      onPlayerDeath: () => {
        this.renderer.playerView.playDeath();
        this.form.clear();
        this.summons.clear();
        this.summonView.clear();
        this.bus.emit("game:mode-changed", { mode: "DEAD" });
        this.deathReturnTimer = 1.2;
        this.bus.emit("character:death", { at: Date.now() });
        this.deathEmitCount += 1;
      },
      getMoveLock: () => Math.max(this.moveLock, this.renderer.playerView.getBusyRemainingSec()),
      triggerHitStop: (duration) => {
        this.hitStop = duration;
      },
      onAutoAttackSwing: () => {
        this.autoAttackSwings += 1;
      },
      isAutoAttackEnabled: () => this.autoAttack,
    });

    this.vaultTransfer = new VaultTransfer({
      inventory: this.inventory,
      accountVault: this.accountVault,
      saves: this.saves,
    });

    this.snapshot = new SessionSnapshot({
      saveService: this.saveService,
      saves: this.saves,
      skillTree: this.skillTree,
      character: this.character,
      progression: this.progression,
      inventory: this.inventory,
      skillLoadout: this.skillLoadout,
      equipment: this.equipment,
      bags: this.bags,
      buffs: this.buffs,
      getProgressState: () => this.progressState,
      setProgressState: (state) => {
        this.progressState = state;
      },
      reloadAccountVault: () => this.reloadAccountVault(),
      isSaveUnreadable: () => this.saveUnreadable,
      setSaveUnreadable: (val) => {
        this.saveUnreadable = val;
      },
      setHadSave: (val) => {
        this.hadSave = val;
      },
      refreshWeaponSetFromGear: () => this.refreshWeaponSetFromGear(),
      getHudOptions: () => ({
        potionSlots: [...this.potionSlots] as [string | null, string | null, string | null],
        autoAttack: this.autoAttack,
        autoMove: this.autoMove,
        autoPotion: this.autoPotion,
        penaReviveCooldownSec: this.penaReviveCooldownSec,
      }),
      setHudOptions: (opts) => {
        this.potionSlots = [...opts.potionSlots] as [string | null, string | null, string | null];
        this.autoAttack = opts.autoAttack;
        this.autoMove = opts.autoMove;
        this.autoPotion = opts.autoPotion;
        this.penaReviveCooldownSec = Math.max(0, opts.penaReviveCooldownSec || 0);
      },
    });

    this.debug = new SessionDebug(this);
  }

  setArmorAuraEnabled(on: boolean): void {
    this.renderer.playerView.setArmorAuraEnabled(on);
  }

  onHud(listener: (model: HudModel) => void): () => void {
    this.hudListener = listener;
    return () => {
      if (this.hudListener === listener) this.hudListener = undefined;
    };
  }

  async start(): Promise<void> {
    await this.renderer.loadPlayerModel(this.skillTree.state.classId);
    await this.enterWorld("city");
  }

  async reloadAccountVault(): Promise<void> {
    const vault = await saveVault.loadAccountVault();
    this.accountVault.apply(vault);
  }

  sellItem(uid: string, qty?: number): boolean {
    const res = sellItem(this.inventory, uid, qty);
    if (res.ok) {
      this.refreshWeaponSetFromGear();
      this.saves.markDirty("inventory", "critical");
    }
    return res.ok;
  }

  async enterWorld(id: WorldId): Promise<void> {
    this.effects.clearSkillVfx();
    const world = this.worlds.switchTo(id);
    this.renderer.setWorldLook(id === "dungeon-test" ? "dungeon" : "city");
    this.renderer.setOccluders(world.occluders ?? []);
    this.renderer.applyRuntimeBudget();
    if (id === "city") this.character.healFull();
    this.player.setPosition(world.spawn.x, world.spawn.z);
    this.player.clearMoveTarget();
    this.interactions.clearPendingInteract();
    this.attack.reset();
    this.skill.reset();
    this.camera.snapTo(world.spawn.x, world.spawn.z);
    this.renderer.playerView.clearDeath();
    const gy = world.groundY(world.spawn.x, world.spawn.z);
    this.renderer.setPlayerTransform(world.spawn.x, world.spawn.z, 0, false, undefined, gy);
    this.interactions.nearby = null;
    this.panel.close();
    this.deathReturnTimer = 0;
    this.resultHold = 0;
    this.bus.emit("session:result", { text: null });
    this.pendingSkillSlot = -1;
    this.moveLock = 0;

    if (id === "city") {
      this.enemies.clear();
      this.summons.clear();
      this.summonView.clear();
      this.form.clear();
      this.enemyView.hideAll();
      this.effects.hideAllHpBars();
      this.effects.setNpcNameplates(
        world.interactables
          .filter((i) => i.kind === "npc" || i.kind === "chest")
          .map((i) => ({
            id: i.id,
            label: i.label,
            x: i.x,
            z: i.z,
            y: i.kind === "chest" ? 1.35 : 2.2,
          })),
      );
      this.effects.setRangeIndicator(0, 0, this.weaponReach().attackRange, false);
      this.dungeonRun.reset();
      this.character.healFull();
      this.character.isDead = false;
      this.bus.emit("game:mode-changed", { mode: "CITY" });
    } else {
      this.effects.clearNpcNameplates();
      this.character.healFull();
      this.character.isDead = false;
      this.clearDropLog();
      const def = findDungeon(this.activeDungeonId) ?? DUNGEON_TEST;
      const duration =
        DUNGEON_BALANCE.debugDurationSecondsOverride ?? def.durationSeconds;
      this.dungeonRun.start(def, duration);
      this.enemies.spawnFromDungeon(def);
      world.gates?.reset();
      this.gateKeys = [];
      this.skillLoadout.refresh();
      this.skill.reset();
      this.sessionXp = 0;
      this.bus.emit("game:mode-changed", { mode: "DUNGEON" });
      this.deathEmitCount = 0;
      this.autoAttackSwings = 0;
      this.bus.emit("dungeon:entered", { dungeonId: def.id });
    }
    this.bus.emit("world:changed", { worldId: world.id });
    if (id === "city") this.saves.markDirty("character", "deferred");
    await world.visualsReady;
    await this.enemyView.whenModelsSettled();
    this.renderer.applyRuntimeBudget();
    this.renderer.present(this.camera.camera);
  }

  pickDungeonForLevel(): DungeonDef {
    return this.dungeonFlow.pickDungeonForLevel();
  }

  dungeonEntryGate(dungeonId: string): { ok: true; def: DungeonDef } | { ok: false; reason: DungeonEnterReason; def?: DungeonDef } {
    return this.dungeonFlow.dungeonEntryGate(dungeonId);
  }

  entryItemCounts(): Record<string, number> {
    return this.dungeonFlow.entryItemCounts();
  }

  tryEnterDungeon(dungeonId: string): DungeonEnterResult {
    return this.dungeonFlow.tryEnterDungeon(dungeonId);
  }

  returnToCityWithFade(): void {
    this.dungeonFlow.returnToCityWithFade();
  }

  finishDungeon(reason: LeaveReason): void {
    this.dungeonFlow.finishDungeon(reason);
  }

  withWorldFade(swap: () => void | Promise<void>): Promise<void> {
    return this.dungeonFlow.withWorldFade(swap);
  }

  allDungeons(): DungeonDef[] {
    return this.dungeonFlow.allDungeons();
  }

  eligibleDungeons(): DungeonDef[] {
    return this.dungeonFlow.eligibleDungeons();
  }

  loadSave(): Promise<LoadSaveResult> {
    return this.snapshot.loadSave();
  }

  applyBootCharacter(character: BootCharacter): void {
    this.snapshot.applyBootCharacter(character);
  }

  update(dt: number, width: number, height: number, uiBlocked = false): void {
    this.camera.setAspect(width / Math.max(height, 1));
    const world = this.worlds.getCurrent();
    if (!world) return;
    for (const tick of world.tickables) tick.update(dt);
    const inDungeon = world.id !== "city";

    if (this.worldFadeBusy) {
      this.renderer.updatePlayer(dt);
      this.enemyView.sync(this.enemies, dt);
      this.updateEffects(dt, width, height);
      this.renderer.render(this.camera.camera);
      this.pushHud(inDungeon);
      return;
    }

    if (this.character.isDead) {
      this.deathReturnTimer -= dt;
      const gy = world.groundY(this.player.x, this.player.z);
      this.renderer.setPlayerTransform(
        this.player.x,
        this.player.z,
        this.player.facing,
        false,
        undefined,
        gy,
      );
      this.renderer.updatePlayer(dt);
      this.enemyView.sync(this.enemies, dt);
      this.camera.follow(this.player.x, this.player.z, dt);
      this.updateEffects(dt, width, height);
      this.renderer.render(this.camera.camera);
      this.pushHud(inDungeon);
      if (this.deathReturnTimer <= 0) {
        void this.dungeonFlow.leaveDungeonWithFade("death");
      }
      return;
    }

    if (this.resultHold > 0) {
      this.resultHold -= dt;
      if (this.lootToastTimer > 0) {
        this.lootToastTimer -= dt;
        if (this.lootToastTimer <= 0) this.lootToast = null;
      }
      this.renderer.updatePlayer(dt);
      this.updateEffects(dt, width, height);
      this.renderer.render(this.camera.camera);
      this.pushHud(inDungeon);
      if (this.resultHold <= 0) {
        void this.withWorldFade(async () => {
          this.character.healFull();
          this.renderer.playerView.clearDeath();
          await this.enterWorld("city");
          this.saves.markDirty("character", "deferred");
        });
      }
      return;
    }

    if (this.lootToastTimer > 0) {
      this.lootToastTimer -= dt;
      if (this.lootToastTimer <= 0) this.lootToast = null;
    }

    if (this.moveLock > 0) this.moveLock = Math.max(0, this.moveLock - dt);
    this.tickDropLog(dt);

    this.character.regenMp(4 * dt);
    this.buffs.tick(dt);
    this.form.advance(dt);

    this.passiveVfxOrigin.set(this.player.x, 0, this.player.z);
    this.effects.syncPassiveVfx(
      this.combat.getLearnedPassives(),
      this.passiveVfxOrigin,
    );

    const frameMods = this.combat.getCombatMods();
    this.player.speedScale = 1 + frameMods.moveSpeed;
    const hpCap = Math.round(this.character.maxHp * (1 + Math.max(0, frameMods.maxHpMul)));
    if (this.character.hp > hpCap) this.character.hp = hpCap;

    const locked = this.isActionLocked();
    const click = this.controller.consumeClickMove();
    if (click) {
      if (this.panel.isOpen() || uiBlocked) this.input.triggerAction("ui.escape");
      const meshHit = this.interactions.pickInteractableByRay(click.ndcX, click.ndcY, world.interactables);
      if (meshHit) {
        if (!locked || this.player.distanceTo(meshHit.x, meshHit.z) <= INTERACT_RANGE) {
          this.interactions.queueOrInteract(meshHit);
        }
      } else {
        const point = this.interactions.groundPointFromNdc(click.ndcX, click.ndcY);
        if (point) {
          const hit = this.interactions.pickInteractableAt(point.x, point.z, world.interactables);
          if (hit) {
            if (!locked || this.player.distanceTo(hit.x, hit.z) <= INTERACT_RANGE) {
              this.interactions.queueOrInteract(hit);
            }
          } else if (!locked) {
            this.interactions.clearPendingInteract();
            const safe = projectWalkTarget(
              point.x,
              point.z,
              this.player.radius,
              world.collision,
              this.player.x,
              this.player.z,
            );
            this.player.setMoveTarget(safe.x, safe.z);
          }
        }
      }
    }

    const keysBlocked = this.panel.isOpen() || uiBlocked || locked;
    if (keysBlocked) {
      if (locked) this.player.clearMoveTarget();
      this.player.update(dt, 0, 0, world.boundary, world.collision);
    } else {
      const axes = this.controller.getMoveAxes();
      if (axes.x !== 0 || axes.z !== 0) this.interactions.clearPendingInteract();
      if (
        this.autoMove &&
        inDungeon &&
        axes.x === 0 &&
        axes.z === 0 &&
        !click &&
        !this.character.isDead
      ) {
        this.applyAutoMove();
      }
      const worldAxes = this.camera.toWorldMove(axes.x, axes.z);
      this.player.update(dt, worldAxes.x, worldAxes.z, world.boundary, world.collision);
    }

    this.interactions.resolvePendingInteract();
    this.potionAutoCooldown = Math.max(0, this.potionAutoCooldown - dt);
    this.penaReviveCooldownSec = Math.max(0, this.penaReviveCooldownSec - dt);
    if (this.autoPotion && !this.character.isDead) {
      this.tickAutoPotion();
    }

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.enemyView.sync(this.enemies, dt);
      const gyHit = world.groundY(this.player.x, this.player.z);
      this.renderer.setPlayerTransform(
        this.player.x,
        this.player.z,
        this.player.facing,
        false,
        undefined,
        gyHit,
      );
      this.renderer.updatePlayer(dt);
      this.camera.follow(this.player.x, this.player.z, dt);
      this.updateEffects(dt, width, height);
      this.renderer.render(this.camera.camera);
      this.pushHud(inDungeon);
      return;
    }

    if (inDungeon && !this.panel.isOpen() && !uiBlocked) {
      const expired = this.dungeonRun.tick(dt);
      if (expired) {
        this.finishDungeon("timer");
        this.renderer.render(this.camera.camera);
        this.pushHud(true);
        return;
      }
      this.combat.updateCombat(dt);
      this.tickDungeon1Gates();
    }

    const groundY = world.groundY(this.player.x, this.player.z);
    this.renderer.setPlayerTransform(
      this.player.x,
      this.player.z,
      this.player.facing,
      this.player.isMoving,
      this.player.isMoving ? this.player.speed * this.player.speedScale : undefined,
      groundY,
    );
    this.renderer.playerView.root.scale.setScalar(this.form.active ? this.form.scale : 1);
    this.renderer.updatePlayer(dt);
    this.enemyView.sync(this.enemies, dt);
    this.camera.follow(this.player.x, this.player.z, dt);
    const shake = this.effects.consumeShake(dt);
    if (shake.x || shake.y) {
      this.camera.camera.position.x += shake.x;
      this.camera.camera.position.y += shake.y;
    }

    const reach = this.weaponReach();
    if (reach.attackRange !== this.lastAttackRange) {
      this.lastAttackRange = reach.attackRange;
      this.effects.setRangeIndicator(0, 0, reach.attackRange, false);
    }

    this.effects.update(dt, this.camera.camera, width, height);
    this.renderer.render(this.camera.camera);
    const playerRatio = hpCap > 0 ? Math.min(1, this.character.hp / hpCap) : 0;
    this.effects.spawnHpBar("player", this.player.x, groundY + 2.05, this.player.z, playerRatio);

    this.interactions.updateNearby(world.interactables);
    this.interactions.handleInteractKey();
    this.pushHud(inDungeon);
  }

  private updateEffects(dt: number, width: number, height: number): void {
    this.effects.update(dt, this.camera.camera, width, height);
  }

  private pushHud(inDungeon: boolean): void {
    const p = this.progression.state;
    const maxLevel = PROGRESSION_BALANCE.evolutions[p.evolution]?.maxLevel ?? 50;
    const frameMods = this.combat.getCombatMods();
    const model: HudModel = {
      hp: this.character.hp,
      maxHp: Math.round(this.character.maxHp * (1 + Math.max(0, frameMods.maxHpMul))),
      mp: this.character.mp,
      maxMp: this.character.maxMp,
      xp: p.xp,
      xpMax: p.xpToNext,
      isMaxLevel: p.level >= maxLevel,
      level: p.level,
      evolution: p.evolution,
      playerName: this.character.name,
      classId: this.skillTree.state.classId,
      timer:
        inDungeon && this.dungeonRun.getPhase() === "active"
          ? String(this.dungeonRun.getRemainingSeconds())
          : null,
      kills: this.dungeonRun.getKills(),
      arenaHint: inDungeon ? this.currentArenaLabel() : null,
      skills: this.skill.slotStates(),
      potionSlots: this.buildPotionHudSlots(),
      autoAttack: this.autoAttack,
      autoMove: this.autoMove,
      autoPotion: this.autoPotion,
      drops: this.visibleDropLog(),
      weaponSet: this.renderer.playerView.getWeaponSet(),
      pendingSave: saveVault.hasPendingCritical(),
      lootToast: this.lootToastTimer > 0 ? this.lootToast : null,
      uiToastKind: this.uiToastKind,
      gold: this.inventory.gold,
      unspentPoints: p.unspentAttributePoints,
    };
    this.hudListener?.(model);
  }

  private buildPotionHudSlots(): Array<HudPotionSlot | null> {
    return this.potionSlots.map((defId) => {
      if (!defId) return null;
      const def = ITEM_CATALOG[defId];
      const stack = this.inventory.items
        .filter((i) => i.defId === defId)
        .reduce((sum, i) => sum + Math.max(0, i.stack || 0), 0);
      return {
        defId,
        name: def?.name || defId,
        icon: resolveItemIcon(defId, def?.slot, def?.name) || "/assets/icons/items/potion.svg",
        stack,
      };
    });
  }

  private applyAutoMove(): void {
    const world = this.worlds.getCurrent();
    const worldId = world?.id ?? "";
    const collision = world?.collision;
    const px = this.player.x;
    const pz = this.player.z;
    const targets = this.enemies.aliveTargets().filter((t) => {
      const enemy = this.enemies.findById(t.id);
      if (!enemy) return false;
      return canEngageEnemy(worldId, px, pz, enemy.x, enemy.z, enemy.arenaIndex, collision);
    });
    if (!targets.length) return;
    let best = targets[0]!;
    let bestDist = Math.hypot(best.x - px, best.z - pz);
    for (let i = 1; i < targets.length; i++) {
      const t = targets[i]!;
      const d = Math.hypot(t.x - px, t.z - pz);
      if (d < bestDist) {
        best = t;
        bestDist = d;
      }
    }
    const reach = this.weaponReach().attackRange * 0.85;
    if (bestDist <= reach) {
      this.player.clearMoveTarget();
      return;
    }
    if (!world) return;
    const safe = projectWalkTarget(
      best.x,
      best.z,
      this.player.radius,
      world.collision,
      this.player.x,
      this.player.z,
    );
    this.player.setMoveTarget(safe.x, safe.z);
  }

  private tickAutoPotion(): void {
    if (this.potionAutoCooldown > 0) return;
    const thresholds = SettingsPanel.readAutoPotionThresholds();
    const hpPct = this.character.maxHp > 0 ? (this.character.hp / this.character.maxHp) * 100 : 100;
    const mpPct = this.character.maxMp > 0 ? (this.character.mp / this.character.maxMp) * 100 : 100;
    const needHp = hpPct <= thresholds.hpPct;
    const needMp = mpPct <= thresholds.mpPct;
    if (!needHp && !needMp) return;
    for (let i = 0; i < this.potionSlots.length; i++) {
      const defId = this.potionSlots[i];
      if (!defId) continue;
      const restore = resolveConsumableRestore(defId, this.character.maxHp);
      if (!restore) continue;
      const helpsHp = restore.hp > 0 && needHp && this.character.hp < this.character.maxHp;
      const helpsMp = restore.mp > 0 && needMp && this.character.mp < this.character.maxMp;
      if (!helpsHp && !helpsMp) continue;
      if (this.usePotionSlot(i)) {
        this.potionAutoCooldown = 0.55;
        return;
      }
    }
  }

  private rollGateKey(enemyId: string): void {
    if (this.activeDungeonId !== "dungeon-1") return;
    const gates = this.worlds.getCurrent()?.gates;
    const arenas = this.dungeonRun.getDef()?.arenas;
    if (!gates || !arenas) return;
    const zone = arenas.findIndex((arena) => arena.spawns.some((spawn) => spawn.id === enemyId));
    if (zone < 0 || zone >= gates.count || gates.isOpen(zone)) return;
    if (this.gateKeys[zone]) return;
    if (Math.random() >= DUNGEON_BALANCE.gateKey.dropChance) return;
    this.gateKeys[zone] = true;
    this.pushDropLog(`Chave do Portão ${zone + 1}`, "item");
  }

  private tickDungeon1Gates(): void {
    if (this.activeDungeonId !== "dungeon-1") return;
    const gates = this.worlds.getCurrent()?.gates;
    if (!gates) return;
    const { openRadiusZ, openRadiusX } = DUNGEON_BALANCE.gateKey;
    for (let i = 0; i < D1_GATE_Z.length; i++) {
      if (!this.gateKeys[i] || gates.isOpen(i)) continue;
      const gateZ = D1_GATE_Z[i]!;
      if (Math.abs(this.player.z - gateZ) > openRadiusZ) continue;
      if (Math.abs(this.player.x) > openRadiusX) continue;
      gates.open(i);
      this.pushDropLog(`Portão ${i + 1} aberto`, "item");
    }
  }

  private currentArenaLabel(): string | null {
    const world = this.worlds.getCurrent();
    if (world?.id === "dungeon-1") {
      const z = this.player.z;
      if (z > -8) return "Zona 1 / 3";
      if (z > -26) return "Zona 2 / 3";
      return "Zona 3 / 3";
    }
    if (world?.id === "dungeon-2") {
      const px = this.player.x;
      const pz = this.player.z;
      if (pz < 0) {
        return px < 0 ? "Bloco 1 / 4 (Noroeste)" : "Bloco 2 / 4 (Nordeste)";
      }
      return px < 0 ? "Bloco 3 / 4 (Sudoeste)" : "Bloco 4 / 4 (Sudeste)";
    }
    const z = this.player.z;
    if (z > -12) return "Arena 1 / 3";
    if (z > -36) return "Arena 2 / 3";
    return "Arena 3 / 3";
  }

  private isActionLocked(): boolean {
    return this.moveLock > 0 || this.renderer.playerView.isBusy();
  }

  private lockMovement(seconds: number): void {
    const capped = Math.min(COMBAT_BALANCE.moveLock.max, Math.max(0, seconds));
    if (capped > this.moveLock) this.moveLock = capped;
    this.player.clearMoveTarget();
  }

  private lockFromAnim(anim: "attack" | "cast" | "hit_gut" | "hit_right", fallback: number): void {
    const dur = this.renderer.playerView.getAnimDurationSec(anim);
    this.lockMovement(Number.isFinite(dur) && dur > 0 ? dur * 0.92 : fallback);
  }

  private pushDropLog(text: string, kind: DropLogKind): void {
    this.dropLogSeq += 1;
    this.dropLog.push({
      id: this.dropLogSeq,
      text,
      kind,
      atMs: Date.now(),
      life: VFX_BALANCE.dropLogLifeSeconds,
    });
    while (this.dropLog.length > VFX_BALANCE.dropLogCap) this.dropLog.shift();
  }

  private tickDropLog(dt: number): void {
    if (this.dropLog.length === 0) return;
    for (const entry of this.dropLog) entry.life -= dt;
  }

  private visibleDropLog(): Array<{ id: number; text: string; kind: DropLogKind }> {
    const alive = this.dropLog.filter((e) => e.life > 0);
    const slice = alive.slice(-VFX_BALANCE.dropLogVisible);
    return slice.map((e) => ({ id: e.id, text: e.text, kind: e.kind }));
  }

  getDropLog(): DropLogEntry[] {
    return this.dropLog.map((e) => ({ ...e }));
  }

  clearDropLog(): void {
    this.dropLog = [];
  }

  getMoveLockRemaining(): number {
    return Math.max(this.moveLock, this.renderer.playerView.getBusyRemainingSec());
  }

  get pendingInteract(): InteractableDef | null {
    return this.interactions.pendingInteract;
  }

  set pendingInteract(def: InteractableDef | null) {
    this.interactions.pendingInteract = def;
  }

  resolvePendingInteract(): void {
    this.interactions.resolvePendingInteract();
  }

  beginInteract(def: InteractableDef): void {
    this.interactions.beginInteract(def);
  }

  closePanel(): void {
    this.interactions.closePanel();
  }

  confirmInteraction(id: string): void {
    this.interactions.confirmInteraction(id);
  }

  openInteraction(def: InteractableDef): void {
    this.interactions.openInteraction(def);
  }

  setUiToast(text: string, kind: "skill" | "attr" | "level" | "dungeon" = "skill"): void {
    this.lootToast = text;
    this.lootToastTimer = 2.2;
    this.uiToastKind = kind;
  }

  tryCompose(recipeId: string, itemUid: string, random?: () => number): {
    attempted: boolean;
    success: boolean;
    message: string;
    recipeId: string;
  } {
    return this.rewards.tryCompose(recipeId, itemUid, random);
  }

  acceptQuest(questId: string): { ok: boolean; message: string } {
    return this.rewards.acceptQuest(questId);
  }

  applyQuestKillProgress(): void {
    this.rewards.applyQuestKillProgress();
  }

  tryReset(): boolean {
    const ok = this.progression.reset();
    if (ok) {
      this.saves.markDirty(["character", "skills"], "critical");
      void this.saves.checkpoint();
    }
    return ok;
  }

  tryEvolve(): { ok: boolean; reason?: string } {
    const blocked = this.progression.evolveUnavailableReason();
    if (blocked) {
      this.setUiToast(blocked, "dungeon");
      return { ok: false, reason: blocked };
    }
    const ok = this.progression.evolve();
    if (ok) {
      this.saves.markDirty(["character", "skills", "progress"], "critical");
      void this.saves.checkpoint();
    }
    return { ok };
  }

  debugSetDodgeChance(value: number): void {
    this.debug.setDodgeChance(value);
  }

  depositGoldToVault(amount: number): number {
    return this.vaultTransfer.depositGold(amount);
  }

  withdrawGoldFromVault(amount: number): number {
    return this.vaultTransfer.withdrawGold(amount);
  }

  moveItemToVault(uid: string): boolean {
    return this.vaultTransfer.moveItemToVault(uid);
  }

  moveItemFromVault(uid: string): boolean {
    return this.vaultTransfer.moveItemFromVault(uid);
  }

  weaponReach(): { attackRange: number; attackInterval: number } {
    if (!this.cachedWeaponReach) {
      const weapon = this.equipment.equipped.weapon;
      this.cachedWeaponReach = {
        attackRange: weapon?.attackRange ?? COMBAT_BALANCE.player.attackRange,
        attackInterval: weapon?.attackInterval ?? COMBAT_BALANCE.player.attackInterval,
      };
    }
    return this.cachedWeaponReach;
  }

  private skillSlotPressed(): number {
    if (this.pendingSkillSlot >= 0) {
      const i = this.pendingSkillSlot;
      this.pendingSkillSlot = -1;
      return i;
    }
    return this.input.consumeSkillSlot();
  }

  forceSkillSlot(index: number): void {
    this.pendingSkillSlot = index;
  }

  equipSkill(skillId: string): void {
    if (!this.skillLoadout.assign(skillId)) return;
    this.setUiToast("Skill no elo", "skill");
  }

  toggleSkillAuto(index: number): void {
    this.skillLoadout.toggleAuto(index);
  }

  clearSkillSlot(index: number): void {
    this.skillLoadout.clearSlot(index);
  }

  learnBookFromItem(skillId: string): boolean {
    if (!this.skillTree.learnBookSkill(skillId)) return false;
    const idx = CLASSES[this.skillTree.state.classId].trees.livro.findIndex((s) => s.id === skillId);
    if (idx >= 0) this.onSkillLearned("livro", idx);
    else {
      this.combat.invalidatePassives();
      this.saves.markDirty("skills", "deferred");
    }
    return true;
  }

  tryApplyEnhancementMaterial(materialUid: string, targetUid: string): { ok: boolean; kind?: string } {
    const mat = this.inventory.items.find((i) => i.uid === materialUid);
    if (!mat) return { ok: false };
    const target =
      this.inventory.items.find((i) => i.uid === targetUid) ||
      (Object.values(this.equipment.equipped).find((i) => i?.uid === targetUid) as ItemInstance | undefined);
    if (!target) return { ok: false };
    const res = this.refinement.refineWithMaterial(target, mat.defId, Math.random, { skipGold: true });
    if (!res.ok && res.kind === "none") return { ok: false };
    if (res.kind === "refine" || res.kind === "life") {
      this.equipment.onItemRefined(target);
      this.progression.recomputeCombatStats();
      this.saves.markDirty(["inventory", "equipment"], "critical");
      void this.saves.checkpoint();
      return { ok: res.ok, kind: res.kind };
    }
    return { ok: false };
  }

  tryUseConsumable(uid: string): boolean {
    const item = this.inventory.items.find((i) => i.uid === uid);
    if (!item) return false;
    const useResult = this.itemUse.use(uid);
    if (useResult.ok) {
      this.saves.markDirty(["character", "inventory", "buffs"], "critical");
      void this.saves.checkpoint();
      return true;
    }
    if (useResult.reason !== "unsupported") return false;
    const restore = resolveConsumableRestore(item.defId, this.character.maxHp);
    if (!restore) return false;
    const needHp = restore.hp > 0 && this.character.hp < this.character.maxHp;
    const needMp = restore.mp > 0 && this.character.mp < this.character.maxMp;
    if (!needHp && !needMp) return false;
    if (needHp) this.character.heal(restore.hp, this.character.maxHp);
    if (needMp) this.character.regenMp(restore.mp);
    item.stack -= 1;
    if (item.stack <= 0) this.inventory.remove(item.uid);
    this.saves.markDirty(["character", "inventory"], "critical");
    return true;
  }

  private grantItemXp(amount: number, defId?: string): void {
    let grant = amount;
    if (defId?.startsWith("chalice_xp_")) {
      const lv = this.progression.state.level;
      grant =
        lv >= D2_LEVEL_START
          ? d2ChaliceGrantXp(lv)
          : Math.max(1, Math.round(PROGRESSION_BALANCE.xpToLevel(lv) / 5));
    }
    const { levelsGained } = this.progression.addXp(grant);
    this.sessionXp += grant;
    if (levelsGained <= 0) return;
    this.skillTree.grantSkillPoints(levelsGained);
    this.skillLoadout.refresh();
    this.character.healFull();
  }

  setPotionSlot(index: number, defId: string | null): boolean {
    if (index < 0 || index > 2) return false;
    if (defId != null && !isPotionDefId(defId)) return false;
    this.potionSlots[index] = defId;
    this.saves.markDirty("options", "deferred");
    return true;
  }

  usePotionSlot(index: number): boolean {
    if (index < 0 || index > 2) return false;
    const defId = this.potionSlots[index];
    if (!defId) return false;
    const item = this.inventory.items.find((i) => i.defId === defId && i.stack > 0);
    if (!item) return false;
    return this.tryUseConsumable(item.uid);
  }

  toggleCombatAuto(kind: "attack" | "move" | "potion"): boolean {
    if (kind === "attack") this.autoAttack = !this.autoAttack;
    else if (kind === "move") this.autoMove = !this.autoMove;
    else this.autoPotion = !this.autoPotion;
    this.saves.markDirty("options", "deferred");
    return true;
  }

  getCombatAutos(): { attack: boolean; move: boolean; potion: boolean } {
    return { attack: this.autoAttack, move: this.autoMove, potion: this.autoPotion };
  }

  getPotionBar(): Array<HudPotionSlot | null> {
    return this.buildPotionHudSlots();
  }

  tryLearnSkill(tree: TreeId, index: number): boolean {
    const goldCost = SKILL_TRAINING.goldCost(index);
    if (this.inventory.gold < goldCost) return false;
    if (!this.skillTree.canLearn(tree, index)) return false;
    if (!this.skillTree.learn(tree, index)) return false;
    this.inventory.gold -= goldCost;
    this.onSkillLearned(tree, index);
    return true;
  }

  onSkillLearned(tree: TreeId, index: number): void {
    const skill = this.skillTree.getTree(tree)[index];
    this.combat.invalidatePassives();
    this.skillLoadout.refresh();
    if (skill) {
      if (skill.kind !== "passive") {
        this.skillLoadout.assign(skill.id);
      } else {
        this.passiveVfxOrigin.set(this.player.x, 0, this.player.z);
        this.effects.syncPassiveVfx(this.combat.getLearnedPassives(), this.passiveVfxOrigin);
      }
    }
    this.saves.markDirty("skills", "deferred");
    this.saves.markDirty("skillLoadout", "deferred");
    this.saves.markDirty("inventory", "deferred");
  }

  refreshWeaponSetFromGear(): void {
    const set = this.equipment.getWeaponSet(this.progression.state.classId);
    if (set && isWeaponSetId(set)) {
      void this.renderer.playerView.setWeaponSet(set);
    } else {
      void this.renderer.playerView.clearWeapons();
    }
    this.cachedWeaponReach = null;
    this.combat.invalidateMods();
    this.effects.setRangeIndicator(0, 0, this.weaponReach().attackRange, false);
  }

  enemyViewMesh(id: string) {
    return this.enemyView.getMesh(id);
  }

  allEnemyMeshStates() {
    const byId = new Map(this.enemies.enemies.map((e) => [e.id, e] as const));
    return this.enemyView.listAll().map(({ id, mesh }) => {
      const enemy = byId.get(id);
      return {
        id,
        alive: enemy?.alive ?? false,
        visible: mesh.visible,
        dying: this.effects.isDying(mesh),
        flashing: this.effects.isFlashing(mesh),
        scale: mesh.scale.x,
        occlusionIgnore: mesh.userData.occlusionIgnore === true,
      };
    });
  }

  dispose(): void {
    this.controller.dispose();
    this.enemyView.dispose();
    this.effects.dispose();
    this.worlds.dispose();
  }
}

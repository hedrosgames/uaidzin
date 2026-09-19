import { Raycaster, Vector2, Vector3 } from "three";
import type { Object3D } from "three";
import { COMBAT_BALANCE } from "../data/balance/combat";
import { DUNGEON_BALANCE } from "../data/balance/dungeon";
import { DUNGEON_TEST } from "../data/dungeons/dungeon-definitions";
import { dungeonsAllowedForLevel, findDungeon } from "../data/dungeons/dungeons-mortal";
import type { EventBus } from "../core/events/EventBus";
import { CharacterModel } from "../domain/character/CharacterModel";
import { AttackController } from "../domain/combat/AttackController";
import { SkillController } from "../domain/combat/SkillController";
import { SkillLoadout } from "../domain/combat/SkillLoadout";
import { calculateDamage } from "../domain/combat/DamageCalculator";
import { rollHitSimple } from "../domain/combat/HitChanceCalculator";
import { EnemyAI } from "../domain/enemies/EnemyAI";
import { EnemyService } from "../domain/enemies/EnemyService";
import { DungeonRun } from "../domain/dungeons/DungeonRun";
import { ProgressionService } from "../domain/progression/ProgressionService";
import { SkillTreeService } from "../domain/skills/SkillTreeService";
import { InventoryService } from "../domain/inventory/InventoryService";
import { BagLockService } from "../domain/inventory/BagLockService";
import { EconomyService } from "../domain/economy/EconomyService";
import { RefinementService } from "../domain/items/RefinementService";
import { EquipmentService } from "../domain/items/EquipmentService";
import { AccountVaultService } from "../domain/account/AccountVaultService";
import { BuffService } from "../domain/character/BuffService";
import { SaveService, type SavePayload } from "../persistence/SaveService";
import { SAVE_VERSION, emptyProgress, parseProfileId } from "../persistence/SaveTypes";
import { saveVault } from "../persistence/SaveVault";
import type { ItemInstance } from "../domain/items/ItemModel";
import type { EquipSlot } from "../domain/items/EquipmentService";
import { ECONOMY_BALANCE } from "../data/balance/economy";
import type { DungeonDef } from "../data/dungeons/dungeon-definitions";
import type { ClassId } from "../data/classes/class-definitions";
import type { EvolutionId } from "../data/balance/progression";
import { PROGRESSION_BALANCE } from "../data/balance/progression";
import type { BootCharacter } from "./BootFlow";
import { PlayerController } from "../gameplay/PlayerController";
import { PlayerRuntime } from "../gameplay/PlayerRuntime";
import { EnemyRuntimeView } from "../presentation/enemies/EnemyRuntimeView";
import { EffectManager } from "../presentation/effects/EffectManager";
import { GameCamera } from "../presentation/camera/GameCamera";
import { SceneRenderer } from "../presentation/rendering/SceneRenderer";
import { InteractionPanel } from "../ui/InteractionPanel";
import { WorldManager, type WorldId } from "../world/WorldManager";
import type { InteractableDef } from "../world/definitions";

const INTERACT_RANGE = 1.6;

export interface SessionHud {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  skillCd: number;
  timer: string | null;
  kills: number;
  xp: number;
  progressionXp: number;
  arenaHint: string | null;
  level: number;
  evolution: string;
  unspentPoints: number;
  xpToNext: number;
  sessionXp: number;
  gold: number;
  invUsed: number;
  invCap: number;
  playerName: string;
  classId: string;
  skills: Array<{ key: number; name: string; cdRatio: number; ready: boolean; auto: boolean }>;
  lootToast: string | null;
  uiToastKind: "skill" | "attr" | "level" | "dungeon";
}

export class CityGameSession {
  readonly player = new PlayerRuntime();
  readonly character = new CharacterModel({
    maxHp: COMBAT_BALANCE.player.maxHp,
    attack: COMBAT_BALANCE.player.attack,
    defense: COMBAT_BALANCE.player.defense,
  });
  readonly progression = new ProgressionService(this.character);
  readonly skillTree = new SkillTreeService();
  readonly inventory = new InventoryService();
  readonly bags = new BagLockService();
  readonly accountVault = new AccountVaultService();
  readonly buffs = new BuffService();
  readonly economy = new EconomyService(this.inventory);
  readonly refinement = new RefinementService(this.inventory);
  readonly equipment = new EquipmentService(this.inventory, this.character);
  readonly saveService = new SaveService();
  activeDungeonId = "dungeon-test";
  readonly controller: PlayerController;
  readonly worlds: WorldManager;
  readonly camera: GameCamera;
  readonly enemies = new EnemyService();
  readonly attack = new AttackController();
  readonly skillLoadout = new SkillLoadout(this.skillTree);
  readonly skill = new SkillController(this.skillLoadout, this.character);
  readonly enemyAi = new EnemyAI();
  readonly dungeonRun = new DungeonRun();

  private readonly enemyView: EnemyRuntimeView;
  readonly effects: EffectManager;
  private readonly interactRaycaster = new Raycaster();
  private readonly interactNdc = new Vector2();
  private nearby: InteractableDef | null = null;
  private lastInteractDown = false;
  private panelOpen = false;
  private deathReturnTimer = 0;
  private resultHold = 0;
  private sessionXp = 0;
  private lootToast: string | null = null;
  private lootToastTimer = 0;
  private uiToastKind: "skill" | "attr" | "level" | "dungeon" = "skill";
  private hitStop = 0;
  private pendingSkillSlot = -1;
  hadSave = false;

  setArmorAuraEnabled(on: boolean): void {
    this.renderer.playerView.setArmorAuraEnabled(on);
  }

  constructor(
    private readonly renderer: SceneRenderer,
    private readonly bus: EventBus,
    canvas: HTMLCanvasElement,
    private readonly panel: InteractionPanel,
    private readonly onModeChange: (mode: "CITY" | "DUNGEON" | "DEAD" | "RESULT") => void,
    private readonly onHud: (hud: SessionHud) => void,
    private readonly onResult: (text: string | null) => void,
    private readonly onDismissUi: () => void = () => undefined,
  ) {
    this.controller = new PlayerController(canvas);
    this.worlds = new WorldManager(renderer.worldRoot);
    this.camera = new GameCamera(1);
    this.enemyView = new EnemyRuntimeView(renderer.worldRoot);
    this.effects = new EffectManager(
      document.getElementById("ui-root") || document.body,
      renderer.scene,
    );
    this.enemyView.bindEffects(this.effects);
  }

  async start(): Promise<void> {
    await this.reloadAccountVault();
    await this.renderer.loadPlayerModel(this.skillTree.state.classId);
    this.enterWorld("city");
  }

  async reloadAccountVault(): Promise<void> {
    const vault = await saveVault.loadAccountVault();
    this.accountVault.apply(vault);
  }

  async persistAccountVault(): Promise<void> {
    await saveVault.saveAccountVault(this.accountVault.snapshot());
  }

  depositGoldToVault(amount: number): number {
    const want = Math.max(0, Math.floor(amount));
    const room = ECONOMY_BALANCE.goldCap - this.accountVault.gold;
    const moved = Math.min(want, this.inventory.gold, room);
    if (moved <= 0) return 0;
    this.inventory.gold -= moved;
    this.accountVault.gold += moved;
    void this.persistSave(true);
    void this.persistAccountVault();
    return moved;
  }

  withdrawGoldFromVault(amount: number): number {
    const want = Math.max(0, Math.floor(amount));
    const room = ECONOMY_BALANCE.goldCap - this.inventory.gold;
    const moved = Math.min(want, this.accountVault.gold, room);
    if (moved <= 0) return 0;
    this.accountVault.gold -= moved;
    this.inventory.gold += moved;
    void this.persistSave(true);
    void this.persistAccountVault();
    return moved;
  }

  moveItemToVault(uid: string): boolean {
    const item = this.inventory.remove(uid);
    if (!item) return false;
    if (!this.accountVault.add(item)) {
      this.inventory.add(item);
      return false;
    }
    void this.persistSave(true);
    void this.persistAccountVault();
    return true;
  }

  moveItemFromVault(uid: string): boolean {
    const item = this.accountVault.remove(uid);
    if (!item) return false;
    if (!this.inventory.add(item)) {
      this.accountVault.add(item);
      return false;
    }
    void this.persistSave(true);
    void this.persistAccountVault();
    return true;
  }

  
  resetToNewGame(): void {
    this.inventory.gold = 0;
    this.inventory.items.length = 0;
    this.skillTree.setClass("TK");
    this.skillTree.resetSkills();
    this.skillLoadout.refresh();
    this.progression.state.evolution = "Mortal";
    this.progression.state.level = 1;
    this.progression.state.xp = 0;
    this.progression.state.xpToNext = 1;
    this.progression.state.unspentAttributePoints = 0;
    this.progression.state.resetsInEvolution = 0;
    this.progression.state.bonusAttributePoints = 0;
    this.character.level = 1;
    this.character.attributes = { FOR: 10, DES: 10, CONS: 10, INT: 10 };
    this.progression.recomputeCombatStats();
    this.character.healFull();
    this.enterWorld("city");
  }

  enterWorld(id: WorldId): void {
    const world = this.worlds.switchTo(id);
    if (id === "city") this.character.healFull();
    this.player.setPosition(world.spawn.x, world.spawn.z);
    this.player.clearMoveTarget();
    this.attack.reset();
    this.skill.reset();
    this.camera.snapTo(world.spawn.x, world.spawn.z);
    this.renderer.setPlayerTransform(world.spawn.x, world.spawn.z, 0, false);
    this.nearby = null;
    this.panel.close();
    this.deathReturnTimer = 0;
    this.resultHold = 0;
    this.onResult(null);
    this.pendingSkillSlot = -1;

    if (id === "city") {
      this.enemies.clear();
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
      this.effects.setRangeIndicator(0, 0, COMBAT_BALANCE.player.attackRange, false);
      this.dungeonRun.reset();
      this.character.healFull();
      this.character.isDead = false;
      this.onModeChange("CITY");
    } else {
      this.effects.clearNpcNameplates();
      this.character.healFull();
      this.character.isDead = false;
      const def = findDungeon(this.activeDungeonId) ?? DUNGEON_TEST;
      const duration =
        DUNGEON_BALANCE.debugDurationSecondsOverride ?? def.durationSeconds;
      this.dungeonRun.start(def, duration);
      this.enemies.spawnFromDungeon(def);
      this.skillLoadout.refresh();
      this.skill.reset();
      this.sessionXp = 0;
      this.onModeChange("DUNGEON");
      this.bus.emit("dungeon:entered", { dungeonId: def.id });
    }
    this.bus.emit("world:changed", { worldId: world.id });
    if (id === "city") void this.persistSave();
  }

  pickDungeonForLevel(): DungeonDef {
    const list = dungeonsAllowedForLevel(this.progression.state.level);
    return list[0] ?? DUNGEON_TEST;
  }

  tryEnterDungeon(dungeonId: string): { ok: boolean; reason?: string } {
    const def = findDungeon(dungeonId);
    if (!def) return { ok: false, reason: "missing" };
    if (this.progression.state.evolution !== "Mortal") {
      return { ok: false, reason: "evolution" };
    }
    if (this.character.level < def.minLevel || this.character.level > def.maxLevel) {
      return { ok: false, reason: "level" };
    }
    if (def.entryItemId) {
      if (!this.inventory.consumeMaterial(def.entryItemId, 1)) {
        return { ok: false, reason: "entry" };
      }
    }
    this.activeDungeonId = def.id;
    this.enterWorld("dungeon-test");
    return { ok: true };
  }

  portalEntryCounts(): Record<string, number> {
    const ids = ["entry_d4", "entry_d5", "entry_d6", "entry_d7", "entry_d8"];
    const out: Record<string, number> = {};
    for (const id of ids) out[id] = this.inventory.countMaterial(id);
    return out;
  }

  async persistSave(immediate = false): Promise<void> {
    const profileId = this.saveService.getProfileId();
    const parsed = parseProfileId(profileId);
    const classId = this.skillTree.state.classId;
    const payload: SavePayload = {
      saveVersion: SAVE_VERSION,
      meta: {
        profileId,
        userId: parsed?.userId || "unknown",
        slotIndex: parsed?.slotIndex ?? 0,
        updatedAt: Date.now(),
      },
      character: {
        name: this.character.name,
        classId,
        level: this.progression.state.level,
        evolution: this.progression.state.evolution,
        xp: this.progression.state.xp,
        unspentAttributePoints: this.progression.state.unspentAttributePoints,
        resetsInEvolution: this.progression.state.resetsInEvolution,
        bonusAttributePoints: this.progression.state.bonusAttributePoints,
        attributes: { ...this.character.attributes },
        hp: this.character.maxHp,
        mp: this.character.maxMp,
      },
      inventory: {
        gold: this.inventory.gold,
        items: this.inventory.items.map((i) => ({ ...i })),
      },
      skills: {
        classId,
        levels: this.skillTree.state.levels,
        eighthTree: this.skillTree.state.eighthTree,
        specialization: { ...this.skillTree.state.specialization },
        skillPoints: this.skillTree.state.skillPoints,
        specPoints: this.skillTree.state.specPoints,
      },
      skillLoadout: {
        slots: this.skillLoadout.snapshot(),
      },
      equipment: {
        equipped: this.equipment.snapshotEquipped(),
      },
      bags: {
        unlocked: this.bags.snapshot(),
      },
      buffs: this.buffs.snapshot(),
      progress: emptyProgress(),
      options: {},
    };
    if (immediate) {
      await saveVault.saveCharacter(payload, { immediate: true });
    } else {
      await saveVault.saveCharacter(payload);
    }
  }

  async loadSave(): Promise<boolean> {
    const data = await this.saveService.load();
    if (!data) {
      this.hadSave = false;
      return false;
    }
    this.hadSave = true;
    this.applySavePayload(data);
    return true;
  }

  applyBootCharacter(character: BootCharacter): void {
    this.saveService.setProfileId(character.id);
    this.character.name = character.name;
    const classId = character.classId as ClassId;
    this.skillTree.setClass(classId);
    this.skillTree.resetSkills();
    const p = this.progression.state;
    p.level = Math.max(1, character.level || 1);
    p.evolution = (character.evolution as EvolutionId) || "Mortal";
    p.xp = 0;
    p.xpToNext = PROGRESSION_BALANCE.xpToLevel(p.level);
    p.unspentAttributePoints = 0;
    p.resetsInEvolution = character.resets || 0;
    p.bonusAttributePoints = 0;
    this.character.level = p.level;
    if (character.attrs) {
      this.character.attributes = { ...character.attrs };
    }
    this.inventory.gold = character.gold ?? 100;
    this.inventory.items.length = 0;
    this.equipment.restoreEquipped({});
    this.bags.apply(null);
    this.buffs.clear();
    this.skillLoadout.applySaved(null);
    const st = this.skillTree.state;
    st.skillPoints = Math.max(0, p.level - 1);
    if (character.spec) {
      st.specialization = {
        controle: character.spec.controle || 0,
        magia: character.spec.magia || 0,
        fisica: character.spec.fisica || 0,
      };
    }
    this.progression.recomputeCombatStats();
    this.character.healFull();
    this.skillLoadout.refresh();
    this.hadSave = false;
    void this.persistSave(true);
  }

  private applySavePayload(data: SavePayload): void {
    const p = this.progression.state;
    this.character.name = data.character.name || this.character.name;
    p.level = data.character.level;
    p.evolution = data.character.evolution as typeof p.evolution;
    p.xp = data.character.xp;
    p.unspentAttributePoints = data.character.unspentAttributePoints;
    p.resetsInEvolution = data.character.resetsInEvolution;
    p.bonusAttributePoints = data.character.bonusAttributePoints;
    p.xpToNext = PROGRESSION_BALANCE.xpToLevel(p.level);
    this.character.level = data.character.level;
    this.character.attributes = { ...data.character.attributes };
    this.inventory.gold = data.inventory.gold;
    this.inventory.items.length = 0;
    for (const raw of data.inventory.items) {
      this.inventory.items.push(raw as ItemInstance);
    }
    const s = this.skillTree.state;
    const classId = (data.character.classId || data.skills.classId) as typeof s.classId;
    s.classId = classId;
    s.levels = data.skills.levels;
    s.eighthTree = data.skills.eighthTree as typeof s.eighthTree;
    s.specialization = { ...data.skills.specialization } as typeof s.specialization;
    s.skillPoints = data.skills.skillPoints;
    s.specPoints = data.skills.specPoints;
    this.equipment.restoreEquipped(
      (data.equipment?.equipped || {}) as Partial<Record<EquipSlot, ItemInstance>>,
    );
    this.bags.apply(data.bags?.unlocked);
    this.buffs.apply(data.buffs);
    this.skillLoadout.applySaved(data.skillLoadout?.slots);
    this.progression.recomputeCombatStats();
    this.character.syncMaxMp();
    this.character.healFull();
    this.skillLoadout.refresh();
  }

  update(dt: number, aspect: number, uiBlocked = false): void {
    this.camera.setAspect(aspect);
    const world = this.worlds.getCurrent();
    if (!world) return;
    for (const tick of world.tickables) tick.update(dt);
    const inDungeon = world.id === "dungeon-test";

    if (this.character.isDead) {
      this.deathReturnTimer -= dt;
      if (this.deathReturnTimer <= 0) {
        this.finishDungeon("death");
      }
      this.renderer.render(this.camera.camera);
      this.pushHud(inDungeon);
      return;
    }

    if (this.resultHold > 0) {
      this.resultHold -= dt;
      if (this.resultHold <= 0) {
        this.character.healFull();
        this.enterWorld("city");
        void this.persistSave(true);
      }
      this.renderer.render(this.camera.camera);
      return;
    }

    if (this.lootToastTimer > 0) {
      this.lootToastTimer -= dt;
      if (this.lootToastTimer <= 0) this.lootToast = null;
    }

    this.character.regenMp(4 * dt);
    this.buffs.tick(dt);

    const keysBlocked = this.panel.isOpen() || uiBlocked;
    const click = this.controller.consumeClickMove();
    if (click) {
      if (keysBlocked) this.onDismissUi();
      const meshHit = this.pickInteractableByRay(click.ndcX, click.ndcY, world.interactables);
      if (meshHit && this.player.distanceTo(meshHit.x, meshHit.z) <= INTERACT_RANGE) {
        this.tryInteract(meshHit);
      } else {
        const point = this.groundPointFromNdc(click.ndcX, click.ndcY);
        if (point) {
          const hit = this.pickInteractableAt(point.x, point.z, world.interactables);
          if (hit && this.player.distanceTo(hit.x, hit.z) <= INTERACT_RANGE) {
            this.tryInteract(hit);
          } else {
            this.player.setMoveTarget(point.x, point.z);
          }
        }
      }
    }

    if (keysBlocked) {
      this.player.update(dt, 0, 0, world.boundary, world.collision);
    } else {
      const axes = this.controller.getMoveAxes();
      const worldAxes = this.camera.toWorldMove(axes.x, axes.z);
      this.player.update(dt, worldAxes.x, worldAxes.z, world.boundary, world.collision);
    }

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.enemyView.sync(this.enemies);
      this.renderer.setPlayerTransform(
        this.player.x,
        this.player.z,
        this.player.facing,
        false,
      );
      this.renderer.updatePlayer(dt);
      this.camera.follow(this.player.x, this.player.z, dt);
      this.renderer.render(this.camera.camera);
      this.effects.update(dt, this.camera.camera, 1, 1);
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
      this.updateCombat(dt);
    }

    this.renderer.setPlayerTransform(
      this.player.x,
      this.player.z,
      this.player.facing,
      this.player.isMoving,
    );
    this.renderer.updatePlayer(dt);
    this.enemyView.sync(this.enemies);
    this.camera.follow(this.player.x, this.player.z, dt);
    const shake = this.effects.consumeShake(dt);
    if (shake.x || shake.y) {
      this.camera.camera.position.x += shake.x;
      this.camera.camera.position.y += shake.y;
    }


    this.effects.setRangeIndicator(0, 0, COMBAT_BALANCE.player.attackRange, false);

    this.renderer.render(this.camera.camera);
    const el = this.renderer.renderer.domElement;
    this.effects.update(dt, this.camera.camera, el.clientWidth || 1, el.clientHeight || 1);
    const playerRatio = this.character.maxHp > 0 ? this.character.hp / this.character.maxHp : 0;
    this.effects.spawnHpBar("player", this.player.x, 2.05, this.player.z, playerRatio);

    this.updateNearby(world.interactables);
    this.handleInteractKey();
    this.pushHud(inDungeon);
  }

  private pushHud(inDungeon: boolean): void {
    const p = this.progression.state;
    this.onHud({
      hp: this.character.hp,
      maxHp: this.character.maxHp,
      mp: this.character.mp,
      maxMp: this.character.maxMp,
      skillCd: this.skill.getCooldownRatio(0),
      timer:
        inDungeon && this.dungeonRun.getPhase() === "active"
          ? String(this.dungeonRun.getRemainingSeconds())
          : null,
      kills: this.dungeonRun.getKills(),
      xp: this.sessionXp,
      progressionXp: p.xp,
      arenaHint: inDungeon ? this.currentArenaLabel() : null,
      level: p.level,
      evolution: p.evolution,
      unspentPoints: p.unspentAttributePoints,
      xpToNext: p.xpToNext,
      sessionXp: this.sessionXp,
      gold: this.inventory.gold,
      invUsed: this.inventory.usedSlots(),
      invCap: this.inventory.capacity,
      playerName: this.character.name,
      classId: this.skillTree.state.classId,
      skills: this.skill.slotStates(),
      lootToast: this.lootToastTimer > 0 ? this.lootToast : null,
      uiToastKind: this.uiToastKind,
    });
  }

  private currentArenaLabel(): string | null {
    const z = this.player.z;
    if (z > -12) return "Arena 1 / 3";
    if (z > -36) return "Arena 2 / 3";
    return "Arena 3 / 3";
  }

  private grantKillXp(enemyId: string, archetype: string): void {
    const isBoss = enemyId.includes("boss");
    const key = isBoss ? "boss" : (archetype as "fixed" | "chaser" | "ranged");
    const xp = DUNGEON_BALANCE.xpPerKill[isBoss ? "boss" : archetype as "fixed" | "chaser" | "ranged"] ?? 8;
    this.sessionXp += xp;
    const { levelsGained } = this.progression.addXp(xp);
    this.dungeonRun.addKill(xp);
    const loot = this.economy.grantKillLoot(key, isBoss);
    if (loot.lostItem) {
      this.lootToast = "Inventário cheio — item perdido";
      this.lootToastTimer = 2.5;
    } else if (loot.droppedItem) {
      this.lootToast = `+${loot.gold} Ouro · ${loot.droppedItem}`;
      this.lootToastTimer = 2.2;
    } else {
      this.lootToast = `+${loot.gold} Ouro`;
      this.lootToastTimer = 1.2;
    }
    if (levelsGained > 0) {
      this.skillTree.grantSkillPoints(levelsGained);
      this.skillLoadout.refresh();
      this.effects.levelUpPulse(this.renderer.playerMesh);
      this.effects.spawnDamageNumber(
        this.player.x,
        2.2,
        this.player.z,
        this.progression.state.level,
        "kill",
      );
      this.lootToast = `Nível ${this.progression.state.level}!`;
      this.lootToastTimer = 2;
      this.bus.emit("character:level-up", {
        level: this.progression.state.level,
        levelsGained,
      });
    }
  }

  private finishDungeon(reason: "timer" | "death" | "exit"): void {
    const result = this.dungeonRun.end(reason);
    this.enemies.clear();
    this.effects.hideAllHpBars();
    const mm = Math.floor(result.elapsedSeconds / 60);
    const ss = Math.floor(result.elapsedSeconds % 60);
    const text =
      reason === "timer"
        ? `Tempo esgotado!\nNível ${this.progression.state.level} ${this.progression.state.evolution}\nKills: ${result.kills}\nXP da sessão: ${this.sessionXp}\nPontos livres: ${this.progression.state.unspentAttributePoints}\nDuração: ${mm}m ${ss}s\nRetornando a Aurelion…`
        : reason === "death"
          ? `Derrotado.\nNível ${this.progression.state.level} ${this.progression.state.evolution}\nKills: ${result.kills}\nXP da sessão: ${this.sessionXp}\nRetornando a Aurelion…`
          : `Expedição encerrada.\nNível ${this.progression.state.level} ${this.progression.state.evolution}\nKills: ${result.kills}\nXP da sessão: ${this.sessionXp}\nRetornando a Aurelion…`;
    this.onResult(text);
    this.onModeChange("RESULT");
    this.resultHold = 2.6;
    this.character.isDead = false;
    this.bus.emit("dungeon:completed", {
      dungeonId: result.dungeonId,
      reason: result.reason,
      kills: result.kills,
      xp: result.xpGained,
    });
  }

  private updateCombat(dt: number): void {
    this.enemies.updateRespawns(dt);
    const targets = this.enemies.aliveTargets();

    const hitTarget = this.attack.tick(
      dt,
      this.player.isMoving,
      targets,
      this.player.x,
      this.player.z,
    );
    if (hitTarget) {
      const enemy = this.enemies.findById(hitTarget.id);
      if (enemy) {

        const dx = enemy.x - this.player.x;
        const dz = enemy.z - this.player.z;
        this.player.facing = Math.atan2(dx, dz);
        this.effects.playAttackPulse(this.renderer.playerMesh);
        this.renderer.playerView.playAttack();

        if (enemy.alive && rollHitSimple()) {
          const dmg = calculateDamage(this.character.attack, enemy.defense);
          const killed = enemy.applyDamage(dmg);
          const mesh = this.enemyView.getMesh(enemy.id);
          this.effects.playHitFlash(mesh);
          this.effects.spawnDamageNumber(enemy.x, 1.4, enemy.z, dmg, "enemy");
          if (killed) {
            this.grantKillXp(enemy.id, enemy.archetype);
            this.effects.playDeath(mesh);
            this.effects.hideHpBar(enemy.id);
            this.effects.spawnDamageNumber(enemy.x, 1.7, enemy.z, 0, "kill");
          }
          this.bus.emit("combat:hit", { targetId: enemy.id, damage: dmg, killed });
        }
      }
    }

    const manual = this.skillSlotPressed();
    const cast = this.skill.tick(
      dt,
      this.player.isMoving,
      manual,
      targets,
      this.player.x,
      this.player.z,
      this.character.attack,
      (id) => this.enemies.findById(id)?.defense ?? 0,
    );
    if (cast) {
      const enemy = this.enemies.findById(cast.target.id);
      if (enemy?.alive) {
        this.renderer.playerView.playCast();
        const killed = enemy.applyDamage(cast.damage);
        const mesh = this.enemyView.getMesh(enemy.id);
        const kind = cast.slot.tree === "magia" ? "bolt" : cast.slot.tree === "controle" ? "zone" : "burst";
        const color = cast.slot.tree === "magia" ? 0xb07cff : cast.slot.tree === "controle" ? 0x6b7cff : 0xc45c26;
        this.effects.playSkillVfx(
          kind,
          new Vector3(this.player.x, 0, this.player.z),
          new Vector3(enemy.x, 0, enemy.z),
          color,
        );
        if (kind === "burst") this.effects.playAttackPulse(mesh);
        this.effects.playHitFlash(mesh);
        this.effects.spawnDamageNumber(enemy.x, 1.6, enemy.z, cast.damage, "skill");
        if (killed) {
          this.grantKillXp(enemy.id, enemy.archetype);
          this.effects.playDeath(mesh);
          this.effects.hideHpBar(enemy.id);
          this.effects.spawnDamageNumber(enemy.x, 1.8, enemy.z, 0, "kill");
          this.effects.cameraPunch(0.08);
          this.hitStop = 0.04;
        }
        this.bus.emit("skill:used", { skillId: cast.slot.skill.id, targetId: enemy.id });
        this.bus.emit("combat:hit", { targetId: enemy.id, damage: cast.damage, killed });
      }
    }

    for (const enemy of this.enemies.enemies) {
      if (!enemy.alive) continue;
      this.effects.spawnHpBar(
        enemy.id,
        enemy.x,
        1.35,
        enemy.z,
        enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0,
      );
      const { wantsAttack } = this.enemyAi.update(enemy, {
        playerX: this.player.x,
        playerZ: this.player.z,
        playerAlive: !this.character.isDead,
        dt,
      });
      if (wantsAttack) {
        enemy.attackCooldown = enemy.attackInterval;
        if (rollHitSimple()) {
          const dmg = calculateDamage(enemy.attack, this.character.defense);
          this.character.applyDamage(dmg);
          this.effects.spawnDamageNumber(this.player.x, 1.8, this.player.z, dmg, "player");
          this.effects.cameraPunch(0.1);
          this.effects.playHitFlash(this.renderer.playerMesh);
          this.renderer.playerView.playHit();
          this.bus.emit("combat:damage", { amount: dmg, hp: this.character.hp });
          if (this.character.isDead) {
            this.renderer.playerView.playDeath();
            this.onModeChange("DEAD");
            this.deathReturnTimer = 1.2;
            this.bus.emit("character:death", { at: Date.now() });
          }
        }
      }
    }
  }

  private skillSlotPressed(): number {
    if (this.pendingSkillSlot >= 0) {
      const i = this.pendingSkillSlot;
      this.pendingSkillSlot = -1;
      return i;
    }
    if (this.controller.consumeSkillPressed()) return 0;
    if (this.controller.consumeSkill2Pressed()) return 1;
    if (this.controller.consumeSkill3Pressed()) return 2;
    if (this.controller.consumeSkill4Pressed()) return 3;
    return -1;
  }

  forceSkillSlot(index: number): void {
    this.pendingSkillSlot = index;
  }

  private groundPointFromNdc(ndcX: number, ndcY: number): { x: number; z: number } | null {
    const cam = this.camera.camera;
    const origin = cam.position.clone();
    const vec = new Vector3(ndcX, ndcY, 0.5);
    vec.unproject(cam).sub(origin).normalize();
    if (Math.abs(vec.y) < 1e-5) return null;
    const t = -origin.y / vec.y;
    if (t < 0) return null;
    return { x: origin.x + vec.x * t, z: origin.z + vec.z * t };
  }

  private updateNearby(list: InteractableDef[]): void {
    let best: InteractableDef | null = null;
    let bestDist = INTERACT_RANGE;
    for (const item of list) {
      const d = this.player.distanceTo(item.x, item.z);
      if (d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    if (best?.id !== this.nearby?.id) {
      this.nearby = best;
      this.bus.emit("player:near-interactable", {
        id: best?.id ?? null,
        label: best?.label ?? null,
        kind: best?.kind ?? null,
      });
    }
  }

  private handleInteractKey(): void {
    const down = this.controller.isInteractPressed();
    const pressed = down && !this.lastInteractDown;
    this.lastInteractDown = down;
    if (!pressed || this.panelOpen || this.character.isDead) return;
    if (!this.nearby || this.nearby.kind === "npc") return;
    this.tryInteract(this.nearby);
  }

  private pickInteractableByRay(
    ndcX: number,
    ndcY: number,
    list: InteractableDef[],
  ): InteractableDef | null {
    this.interactNdc.set(ndcX, ndcY);
    this.interactRaycaster.setFromCamera(this.interactNdc, this.camera.camera);
    const hits = this.interactRaycaster.intersectObjects(this.renderer.worldRoot.children, true);
    for (const hit of hits) {
      let obj: Object3D | null = hit.object;
      while (obj) {
        const id = obj.userData.interactableId as string | undefined;
        if (id) {
          const def = list.find((item) => item.id === id);
          if (def) return def;
          break;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  private pickInteractableAt(
    x: number,
    z: number,
    list: InteractableDef[],
  ): InteractableDef | null {
    let best: InteractableDef | null = null;
    let bestDist = 1.1;
    for (const item of list) {
      const d = Math.hypot(item.x - x, item.z - z);
      if (d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    return best;
  }

  private tryInteract(def: InteractableDef): void {
    if (this.player.distanceTo(def.x, def.z) > INTERACT_RANGE) return;
    if (this.openNpcService(def.id)) return;
    this.openInteraction(def);
  }

  private openNpcService(id: string): boolean {
    if (id === "vault-chest") {
      this.openVaultBank();
      return true;
    }
    if (id === "npc-composer") {
      this.openComposer();
      return true;
    }
    if (id === "npc-merchant") {
      this.openShop("Mercador", "merchant");
      return true;
    }
    if (id === "npc-blacksmith") {
      this.openShop("Ferreiro", "blacksmith");
      return true;
    }
    if (id === "npc-portal-guard") {
      this.openNpcPanel("portal");
      return true;
    }
    if (id === "npc-skill-master") {
      this.openSkillMaster();
      return true;
    }
    if (id === "npc-sage") {
      this.openSage();
      return true;
    }
    if (id === "npc-quest") {
      this.openNpcPanel("quest");
      return true;
    }
    return false;
  }

  private closeInteractionOverlay(): void {
    this.panel.close();
    this.panelOpen = false;
  }

  private openVaultBank(): void {
    const world = this.worlds.getCurrent();
    const chest = world?.interactables.find((i) => i.id === "vault-chest");
    if (!chest) return;
    if (this.player.distanceTo(chest.x, chest.z) > INTERACT_RANGE) return;
    this.closeInteractionOverlay();
    this.bus.emit("ui:open-panel", { panel: "inv" });
    this.bus.emit("ui:open-panel", { panel: "vault" });
  }

  private openShop(title: "Mercador" | "Ferreiro", shopId: "merchant" | "blacksmith"): void {
    this.closeInteractionOverlay();
    this.bus.emit("ui:open-panel", { panel: "inv" });
    this.bus.emit("ui:open-panel", { panel: "shop", title, shopId });
  }

  private openSage(): void {
    this.closeInteractionOverlay();
    this.bus.emit("ui:open-panel", { panel: "inv" });
    this.bus.emit("ui:open-panel", { panel: "sage" });
  }

  private openComposer(): void {
    this.closeInteractionOverlay();
    this.bus.emit("ui:open-panel", { panel: "composer" });
  }

  private openSkillMaster(): void {
    this.closeInteractionOverlay();
    this.bus.emit("ui:open-panel", { panel: "person" });
    this.bus.emit("ui:open-panel", { panel: "skills" });
    this.bus.emit("ui:open-panel", { panel: "skillmaster" });
  }

  private openNpcPanel(panel: "portal" | "quest"): void {
    this.closeInteractionOverlay();
    this.bus.emit("ui:open-panel", { panel });
  }

  openInteraction(def: InteractableDef): void {
    if (this.openNpcService(def.id)) return;
    this.panelOpen = true;
    let body = def.body;
    if (def.kind === "portal") {
      const pick = this.pickDungeonForLevel();
      this.activeDungeonId = pick.id;
      const levelOk =
        this.character.level >= pick.minLevel &&
        this.character.level <= pick.maxLevel &&
        this.progression.state.evolution === "Mortal";
      body = `${pick.name}\nNível ${pick.minLevel}–${pick.maxLevel} (${levelOk ? "ok" : "fora"})\nItens de entrada: ${pick.entryItemId ? "sim" : "não"}\nDuração: 10:00 · 3 arenas\nDisponíveis p/ seu nível: ${dungeonsAllowedForLevel(this.progression.state.level).map((d) => d.name).join(", ") || "—"}`;
    }
    this.panel.open({ id: def.id, label: def.label, body, kind: def.kind });
    this.bus.emit("interaction:opened", { id: def.id, label: def.label, body });
  }

  confirmInteraction(id: string): void {
    const world = this.worlds.getCurrent();
    const def = world?.interactables.find((i) => i.id === id);
    if (!def) return;
    if (this.openNpcService(id)) return;
    if (def.kind === "portal") {
      const pick = this.pickDungeonForLevel();
      this.activeDungeonId = pick.id;
      const levelOk =
        this.character.level >= pick.minLevel && this.character.level <= pick.maxLevel;
      this.closeInteractionOverlay();
      if (levelOk) this.enterWorld("dungeon-test");
      return;
    }
    if (def.kind === "portal-exit") {
      this.closeInteractionOverlay();
      if (this.dungeonRun.getPhase() === "active") this.finishDungeon("exit");
      else this.enterWorld("city");
      return;
    }
    this.closeInteractionOverlay();
  }

  closePanel(): void {
    this.panelOpen = false;
    this.bus.emit("interaction:closed", { id: null });
  }

  
  setUiToast(text: string, kind: "skill" | "attr" | "level" | "dungeon" = "skill"): void {
    this.lootToast = text;
    this.lootToastTimer = 2.2;
    this.uiToastKind = kind;
  }

  debugSetTimer(seconds: number): void {
    this.dungeonRun.setRemaining(seconds);
  }

  debugAddLevels(n: number): void {
    for (let i = 0; i < n; i++) {
      const before = this.progression.state.level;
      this.progression.addXp(this.progression.state.xpToNext);
      if (this.progression.state.level > before) {
        this.skillTree.grantSkillPoints(this.progression.state.level - before);
      }
    }
  }

  debugSpendAll(attr: "FOR" | "DES" | "CONS" | "INT"): void {
    const pts = this.progression.state.unspentAttributePoints;
    if (pts > 0) this.progression.spendAttribute(attr, pts);
  }

  
  debugLearnRandomSkill(): { learned: boolean; tree?: string; index?: number; skillId?: string; level?: number; slots: number } {
    const trees = ["controle", "magia", "fisica"] as const;
    const options: Array<{ tree: (typeof trees)[number]; index: number }> = [];
    for (const tree of trees) {
      const skills = this.skillTree.getTree(tree);
      for (let i = 0; i < skills.length; i++) {
        if (this.skillTree.canLearn(tree, i)) options.push({ tree, index: i });
      }
    }
    if (!options.length) return { learned: false, slots: this.skillLoadout.slots.length };
    const pick = options[Math.floor(Math.random() * options.length)];
    const skill = this.skillTree.getTree(pick.tree)[pick.index];
    const ok = this.skillTree.learn(pick.tree, pick.index);
    if (ok) this.skillLoadout.refresh();
    return {
      learned: ok,
      tree: pick.tree,
      index: pick.index,
      skillId: skill.id,
      level: this.skillTree.getSkillLevel(skill.id),
      slots: this.skillLoadout.slots.length,
    };
  }

  
  debugSpendRandomAttributes(): { spent: number; breakdown: string; unspent: number } {
    const attrs = ["FOR", "DES", "CONS", "INT"] as const;
    const counts: Record<string, number> = { FOR: 0, DES: 0, CONS: 0, INT: 0 };
    let spent = 0;
    while (this.progression.state.unspentAttributePoints > 0) {
      const attr = attrs[Math.floor(Math.random() * attrs.length)];
      if (this.progression.spendAttribute(attr, 1)) {
        counts[attr] += 1;
        spent += 1;
      } else break;
    }
    const breakdown = attrs.map((a) => `${a}+${counts[a]}`).filter((s) => !s.endsWith("+0")).join(" ");
    return { spent, breakdown: breakdown || "—", unspent: this.progression.state.unspentAttributePoints };
  }

  debugTryReset(): boolean {
    return this.progression.reset();
  }

  debugTryEvolve(): boolean {
    return this.progression.evolve();
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

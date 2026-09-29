import type { SaveService } from "../../persistence/SaveService";
import type { SaveCoordinator } from "../../persistence/SaveCoordinator";
import type { SkillTreeService } from "../../domain/skills/SkillTreeService";
import type { CharacterModel } from "../../domain/character/CharacterModel";
import type { ProgressionService } from "../../domain/progression/ProgressionService";
import type { InventoryService } from "../../domain/inventory/InventoryService";
import type { SkillLoadout } from "../../domain/combat/SkillLoadout";
import type { EquipmentService, EquipSlot } from "../../domain/items/EquipmentService";
import type { BagLockService } from "../../domain/inventory/BagLockService";
import type { BuffService } from "../../domain/character/BuffService";
import type { ItemInstance } from "../../domain/items/ItemModel";
import { CLASSES, type ClassId } from "../../data/classes/class-definitions";
import { PROGRESSION_BALANCE, type EvolutionId } from "../../data/balance/progression";
import type { BootCharacter } from "../BootFlow";
import {
  PROFILE_SECTIONS,
  SAVE_VERSION,
  normalizeTreeMap,
  parseProfileId,
  type LoadSaveResult,
  type SavePayload,
} from "../../persistence/SaveTypes";
import { parseCombatAttackMode } from "../../domain/combat/combat-attack-mode";
import { parseCombatMoveMode } from "../../domain/combat/combat-move-mode";
import { normalizeSavePayload } from "../../persistence/migrations";
import { saveVault } from "../../persistence/SaveVault";

export type SessionHudOptions = {
  potionSlots: [string | null, string | null, string | null];
  attackMode: import("../../domain/combat/combat-attack-mode").CombatAttackMode;
  moveMode: import("../../domain/combat/combat-move-mode").CombatMoveMode;
  autoPotion: boolean;
  penaReviveCooldownSec: number;
};

export interface SessionSnapshotDeps {
  saveService: SaveService;
  saves: SaveCoordinator;
  skillTree: SkillTreeService;
  character: CharacterModel;
  progression: ProgressionService;
  inventory: InventoryService;
  skillLoadout: SkillLoadout;
  equipment: EquipmentService;
  bags: BagLockService;
  buffs: BuffService;
  getProgressState: () => SavePayload["progress"];
  setProgressState: (state: SavePayload["progress"]) => void;
  reloadAccountVault: () => Promise<void>;
  isSaveUnreadable: () => boolean;
  setSaveUnreadable: (val: boolean) => void;
  setHadSave: (val: boolean) => void;
  refreshWeaponSetFromGear: () => void;
  getHudOptions: () => SessionHudOptions;
  setHudOptions: (opts: SessionHudOptions) => void;
}

export class SessionSnapshot {
  constructor(private readonly deps: SessionSnapshotDeps) {}

  buildSavePayload(): SavePayload | null {
    if (this.deps.isSaveUnreadable()) return null;
    const profileId = this.deps.saveService.getProfileId();
    const parsed = parseProfileId(profileId);
    const classId = this.deps.skillTree.state.classId;
    const progressState = this.deps.getProgressState();
    const payload: SavePayload = {
      saveVersion: SAVE_VERSION,
      meta: {
        profileId,
        userId: parsed?.userId || "unknown",
        slotIndex: parsed?.slotIndex ?? 0,
        updatedAt: Date.now(),
      },
      character: {
        name: this.deps.character.name,
        classId,
        level: this.deps.progression.state.level,
        evolution: this.deps.progression.state.evolution,
        xp: this.deps.progression.state.xp,
        unspentAttributePoints: this.deps.progression.state.unspentAttributePoints,
        resetsInEvolution: this.deps.progression.state.resetsInEvolution,
        bonusAttributePoints: this.deps.progression.state.bonusAttributePoints,
        attributes: { ...this.deps.character.attributes },
        hp: this.deps.character.hp,
        mp: this.deps.character.mp,
      },
      inventory: {
        gold: this.deps.inventory.gold,
        items: this.deps.inventory.items.map((i) => ({ ...i })),
      },
      skills: {
        classId,
        learned: Array.from(this.deps.skillTree.state.learned),
        eighthTree: this.deps.skillTree.state.eighthTree,
        specialization: { ...this.deps.skillTree.state.specialization },
        skillPoints: this.deps.skillTree.state.skillPoints,
        specPoints: this.deps.skillTree.state.specPoints,
      },
      skillLoadout: {
        slots: this.deps.skillLoadout.snapshot(),
      },
      equipment: {
        equipped: this.deps.equipment.snapshotEquipped(),
      },
      bags: {
        unlocked: this.deps.bags.snapshot(),
      },
      buffs: this.deps.buffs.snapshot(),
      progress: {
        dungeonsUnlocked: [...progressState.dungeonsUnlocked],
        dungeonClears: { ...progressState.dungeonClears },
        quests: { ...progressState.quests },
      },
      options: { ...this.deps.getHudOptions() },
    };
    return payload;
  }

  async loadSave(): Promise<LoadSaveResult> {
    try {
      await this.deps.reloadAccountVault();
      const result = await this.deps.saveService.load();
      if (result.status === "unreadable") {
        this.deps.setSaveUnreadable(true);
        this.deps.setHadSave(true);
        return { status: "error" };
      }
      this.deps.setSaveUnreadable(false);
      if (result.status === "missing") {
        if (await this.slotSummaryHasProgress()) {
          this.deps.setSaveUnreadable(true);
          this.deps.setHadSave(true);
          return { status: "error" };
        }
        this.deps.setHadSave(false);
        return { status: "absent" };
      }
      this.deps.setHadSave(true);
      this.applySavePayload(normalizeSavePayload(result.payload, this.deps.saveService.getProfileId()));
      if (result.fromMirror) this.deps.saves.markDirty([...PROFILE_SECTIONS], "critical");
      return { status: "found" };
    } catch {
      this.deps.setSaveUnreadable(true);
      this.deps.setHadSave(true);
      return { status: "error" };
    }
  }

  async slotSummaryHasProgress(): Promise<boolean> {
    if (!saveVault.getSession()) return false;
    const profileId = this.deps.saveService.getProfileId();
    const summary = (await saveVault.listSlots()).find((s) => s?.profileId === profileId);
    if (!summary || summary.saveVersion < SAVE_VERSION) return false;
    return summary.level > 1 || summary.gold > 0 || summary.resets > 0;
  }

  applyBootCharacter(character: BootCharacter): void {
    this.deps.saveService.setProfileId(character.id);
    this.deps.character.name = character.name;
    const classId = (character.classId in CLASSES ? character.classId : "TK") as ClassId;
    this.deps.skillTree.setClass(classId);
    this.deps.progression.setClassId(classId);
    this.deps.skillTree.resetSkills();
    const p = this.deps.progression.state;
    const base = PROGRESSION_BALANCE.baseAttributes;
    p.level = 1;
    p.evolution = (character.evolution as EvolutionId) || "Mortal";
    p.xp = 0;
    p.xpToNext = PROGRESSION_BALANCE.xpToLevel(p.level);
    p.unspentAttributePoints = 0;
    p.resetsInEvolution = Number.isFinite(character.resets) ? Math.max(0, Math.floor(character.resets || 0)) : 0;
    p.bonusAttributePoints = 0;
    this.deps.character.level = 1;
    this.deps.character.attributes = { FOR: base.FOR, DES: base.DES, CONS: base.CONS, INT: base.INT };
    this.deps.inventory.gold = 0;
    this.deps.inventory.items.length = 0;
    this.deps.equipment.restoreEquipped({});
    this.deps.bags.apply(null);
    this.deps.buffs.clear();
    this.deps.skillLoadout.applySaved(null);
    const st = this.deps.skillTree.state;
    st.skillPoints = Math.max(0, p.level - 1);
    st.eighthTree = null;
    st.specialization = normalizeTreeMap(character.spec);
    this.deps.progression.recomputeCombatStats();
    this.deps.character.healFull();
    this.deps.skillLoadout.refresh();
    this.deps.refreshWeaponSetFromGear();
    this.deps.setHudOptions({
      potionSlots: [null, null, null],
      penaReviveCooldownSec: 0,
      attackMode: "physical",
      moveMode: "off",
      autoPotion: false,
    });
    this.deps.setHadSave(false);
    this.deps.saves.markDirty([...PROFILE_SECTIONS], "critical");
  }

  applySavePayload(data: SavePayload): void {
    const p = this.deps.progression.state;
    this.deps.character.name = data.character.name || this.deps.character.name;
    p.level = data.character.level;
    p.evolution = data.character.evolution as typeof p.evolution;
    p.xp = data.character.xp;
    p.unspentAttributePoints = data.character.unspentAttributePoints;
    p.resetsInEvolution = data.character.resetsInEvolution;
    p.bonusAttributePoints = data.character.bonusAttributePoints;
    p.xpToNext = PROGRESSION_BALANCE.xpToLevel(p.level);
    this.deps.character.level = data.character.level;
    this.deps.character.attributes = { ...data.character.attributes };
    this.deps.inventory.gold = data.inventory.gold;
    this.deps.inventory.items.length = 0;
    for (const raw of data.inventory.items) {
      this.deps.inventory.items.push(raw as ItemInstance);
    }
    const s = this.deps.skillTree.state;
    const classId = (data.character.classId || data.skills.classId) as typeof s.classId;
    this.deps.skillTree.setClass(classId);
    this.deps.progression.setClassId(classId);
    s.learned = new Set(data.skills.learned || []);
    s.eighthTree = data.skills.eighthTree as typeof s.eighthTree;
    const spec = data.skills.specialization;
    s.specialization = {
      controle: spec.controle,
      magia: spec.magia,
      fisica: spec.fisica,
    };
    s.skillPoints = data.skills.skillPoints;
    s.specPoints = data.skills.specPoints;
    this.deps.equipment.restoreEquipped(
      (data.equipment?.equipped || {}) as Partial<Record<EquipSlot, ItemInstance>>,
    );
    this.deps.bags.apply(data.bags?.unlocked);
    this.deps.buffs.apply(data.buffs);
    this.deps.skillLoadout.applySaved(data.skillLoadout?.slots);
    this.deps.setProgressState({
      dungeonsUnlocked: [...(data.progress?.dungeonsUnlocked || [])],
      dungeonClears: { ...(data.progress?.dungeonClears || {}) },
      quests: { ...(data.progress?.quests || {}) },
    });
    this.deps.progression.recomputeCombatStats();
    this.deps.character.syncMaxMp();
    const savedHp = Number(data.character.hp);
    const savedMp = Number(data.character.mp);
    this.deps.character.hp = Number.isFinite(savedHp)
      ? Math.max(0, Math.min(this.deps.character.maxHp, savedHp))
      : this.deps.character.maxHp;
    this.deps.character.mp = Number.isFinite(savedMp)
      ? Math.max(0, Math.min(this.deps.character.maxMp, savedMp))
      : this.deps.character.maxMp;
    this.deps.character.isDead = this.deps.character.hp <= 0;
    this.deps.skillLoadout.refresh();
    this.deps.refreshWeaponSetFromGear();
    const opts = data.options || {};
    const rawSlots = Array.isArray(opts.potionSlots) ? opts.potionSlots : [];
    const potionSlots: [string | null, string | null, string | null] = [
      typeof rawSlots[0] === "string" ? rawSlots[0] : null,
      typeof rawSlots[1] === "string" ? rawSlots[1] : null,
      typeof rawSlots[2] === "string" ? rawSlots[2] : null,
    ];
    this.deps.setHudOptions({
      potionSlots,
      attackMode: parseCombatAttackMode(
        (opts as { attackMode?: unknown }).attackMode,
        (opts as { autoAttack?: boolean }).autoAttack !== false,
      ),
      moveMode: parseCombatMoveMode(
        (opts as { moveMode?: unknown }).moveMode,
        (opts as { autoMove?: boolean }).autoMove === true,
      ),
      autoPotion: opts.autoPotion === true,
      penaReviveCooldownSec: Math.max(0, Number(opts.penaReviveCooldownSec) || 0),
    });
  }
}

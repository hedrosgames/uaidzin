import type { CharacterViewModel, SlotSummary } from "../persistence/SaveTypes";
import type { ClassId, TreeId } from "../data/classes/class-definitions";
import type { shopCatalogForUi } from "../data/balance/economy";
import type { QuestUiRow } from "../domain/quests/QuestService";

export type { TreeId, ClassId };
export type AttributeName = "FOR" | "DES" | "CONS" | "INT";
export type EquipSlot = "head" | "armor" | "weapon" | "ring1" | "ring2" | "neck" | "ear";

export type ShopCatalogForUi = ReturnType<typeof shopCatalogForUi>;

export interface WireItem {
  uid: string;
  defId: string;
  name: string;
  slot: string;
  rarity: string;
  refine: number;
  life?: number;
  attackBonus: number;
  defenseBonus: number;
  stack: number;
  sellValue: number;
  desc?: string;
  icon?: string;
  stats?: {
    atk?: number;
    def?: number;
    crit?: number;
    dodge?: number;
    hit?: number;
    hp?: number;
    mp?: number;
  };
}

export interface WireSkillRow {
  id: string;
  tree: string;
  idx: number;
  skillId: string;
  name: string;
  desc: string;
  learned: boolean;
  passive?: boolean;
  mp: number;
  cd: number;
  pointsCost: number;
  goldCost: number;
  icon: string;
}

export interface WireSkillCatalog {
  classId: ClassId;
  barSize?: number;
  trees: TreeId[];
  treeLabels: Record<string, string>;
  skills: Record<string, WireSkillRow>;
  skillPoints: number;
  gold: number;
  specPoints: number;
  spec: { controle: number; magia: number; fisica: number };
  attrPts: number;
  attrs: { FOR: number; DES: number; CONS: number; INT: number };
  eighthTree?: TreeId | null;
}

export interface WireSkillBarSlot {
  slotIndex: number;
  skillId: string | null;
  tree?: string;
  name?: string;
  icon?: string;
  auto: boolean;
  cooldown?: number;
  cd?: number;
}

export interface WirePotionBarSlot {
  defId: string;
  name: string;
  icon: string;
  stack: number;
}

export interface WireCombatAutos {
  attackMode: import("../domain/combat/combat-attack-mode").CombatAttackMode;
  moveMode: import("../domain/combat/combat-move-mode").CombatMoveMode;
  potion: boolean;
}

export interface WireComposerItem {
  uid: string;
  defId: string;
  name: string;
  refine: number;
  life?: number;
  rarity: string;
  slot: string;
  attackBonus: number;
  defenseBonus: number;
  stack: number;
}

export type WireQuestEntry = QuestUiRow;

export interface WireDungeonEntry {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  entryItemId: string | null;
  durationSeconds: number;
}

export interface WirePortalContext {
  level: number;
  evolution: string;
  entryCounts: Record<string, number>;
  dungeons: WireDungeonEntry[];
}

export interface WireUiHandle {
  setCharacter?(view: CharacterViewModel): void;
  syncFromGame?(): void;
  handleEscape?(): boolean;
  isOpen?(): boolean;
  open?(name: string, opts?: { title?: string; shopId?: string }): void;
  close?(name?: string): void;
  toggle?(name: string, opts?: { title?: string; shopId?: string }): void;
  openPortalConfirm?(dungeonId: string, onConfirm?: () => void): void;
  openInteraction?(kind: string, id: string): void;
  paintShop?(shopId: string): void;
  paintPortal?(): void;
  paintSage?(): void;
  paintComposer?(): void;
  paintQuest?(): void;
}

export interface WireApi {
  getCharacterViewModel(): CharacterViewModel;
  spendAttribute(key: string): boolean;
  spendAllAttributes(primary?: "FOR" | "CONS"): number;
  spendSpec(tree: string): boolean;
  isMaxLevel(): boolean;
  canReset(): boolean;
  tryReset(): boolean;
  canEvolve(): boolean;
  tryEvolve(): { ok: boolean; reason?: string };

  snapshotInventory(): { gold: number; usedSlots: number; capacity: number; items: WireItem[] };
  useConsumable(uid: string): boolean;
  discardItem(uid: string): boolean;
  reorderBag(uids: string[]): boolean;
  unlockBag(index: number): boolean;
  getBagsState(): { unlocked: boolean[] };
  equipBest(): boolean;

  equippedSnapshot(): Partial<Record<string, WireItem>>;
  equipUid(uid: string): boolean;
  unequipSlot(slot: string): boolean;
  swapSlots(slotA: string, slotB: string): boolean;
  discardEquipped(slot: string): boolean;

  pullSkillCatalog(): WireSkillCatalog;
  learnSkill(tree: string, index: number): boolean;
  learnFisicaLine(): number;
  getSkillBar(): WireSkillBarSlot[];
  equipSkill(slotIndex: number, skillId: string): boolean;
  clearSkillSlot(slotIndex: number): boolean;
  toggleSkillAuto(slotIndex: number): boolean;
  swapSkillSlots(fromIndex: number, toIndex: number): boolean;
  getPotionBar(): Array<WirePotionBarSlot | null>;
  setPotionSlot(slotIndex: number, defId: string | null): boolean;
  usePotionSlot(slotIndex: number): boolean;
  getCombatAutos(): WireCombatAutos;
  toggleCombatAuto(kind: "attack" | "move" | "potion"): boolean;

  getShopCatalog(): ShopCatalogForUi;
  buyShop(shopId: string, itemId: string): { ok: boolean; reason?: string };
  sellItem(uid: string, count?: number): { ok: boolean; goldEarned?: number; reason?: string };

  snapshotVault(): { gold: number; items: WireItem[]; capacity: number };
  depositGold(amount: number): number;
  withdrawGold(amount: number): number;
  moveToVault(uid: string): boolean;
  moveFromVault(uid: string): boolean;
  moveAllToVault(): { movedGold: number; movedItems: number };
  reorderVault(uids: string[]): boolean;
  discardVaultItem(uid: string): boolean;

  refineItem(uid: string): { ok: boolean; costGold: number; mat: string; newRefine?: number; reason?: string };
  applyEnhancementMaterial(materialUid: string, targetUid: string): { ok: boolean; kind?: string };

  listEligible(recipeId: string): WireComposerItem[];
  canAttempt(recipeId: string, itemUid: string): { ok: boolean; message: string };
  compose(recipeId: string, itemUid: string): { attempted: boolean; success: boolean; message: string; recipeId: string };

  listQuests(): QuestUiRow[];
  acceptQuest(questId: string): { ok: boolean; message: string };

  getPortalContext(): WirePortalContext;
  listEligibleDungeons(): WireDungeonEntry[];
  enterDungeonById(id: string): { ok: boolean; reason?: string };

  getSageContext(): { topics: unknown[] };

  listSlots(): Promise<(SlotSummary | null)[]>;
  createSlot(input: { slotIndex: number; classId: string; name: string; level?: number; gold?: number }): Promise<SlotSummary>;
  deleteSlot(slotIndex: number): Promise<void>;
  loadSlot(slotIndex: number): Promise<boolean>;

  resolveItemIcon(defId: string, slot?: string, name?: string): string | null;
  skillPointsCost(index: number): number;
  skillGoldCost(index: number): number;
  canAffordSkill(skillPoints: number, gold: number, pointsCost: number, goldCost: number): boolean;

  onChanged(): void;
  closePanels(): void;
}

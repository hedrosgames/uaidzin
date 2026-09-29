import { CLASSES, type TreeId } from "../data/classes/class-definitions";
import { PROGRESSION_BALANCE } from "../data/balance/progression";
import { SKILL_BALANCE } from "../data/balance/skills";
import { resolveItemIcon, shopCatalogForUi, SKILL_TRAINING } from "../data/balance/economy";
import { dungeonEnterMessage, type CityGameSession } from "../app/CityGameSession";
import { buyFromShop, sellItem } from "../domain/economy/ShopService";
import { saveVault } from "../persistence/SaveVault";
import type { ItemInstance } from "../domain/items/ItemModel";
import type { EquipSlot } from "../domain/items/EquipmentService";
import type { CharacterViewModel } from "../persistence/SaveTypes";
import type {
  WireApi,
  WireComposerItem,
  WireDungeonEntry,
  WireItem,
  WirePortalContext,
  WireQuestEntry,
  WireSkillBarSlot,
  WireSkillCatalog,
  WireSkillRow,
} from "./WireApi";

export type { WireSkillRow, WireSkillCatalog };

export interface WireGameHost {
  onChanged?: () => void;
  closePanels?: () => void;
  currentViewModel?: () => CharacterViewModel;
  showToast?: (text: string, kind?: "skill" | "attr" | "level" | "dungeon") => void;
}

const RARITY_ORDER = ["Comum", "Incomum", "Raro", "Épico", "Lendário"] as const;

function gearScore(it: ItemInstance): number {
  const rIdx = RARITY_ORDER.indexOf(it.rarity as (typeof RARITY_ORDER)[number]);
  return (rIdx >= 0 ? rIdx : 0) * 1000 + (it.refine || 0) * 100 + (it.attackBonus || 0) + (it.defenseBonus || 0);
}

function skillIconPath(skillId: string): string {
  return `/assets/icons/skills/${skillId}.png`;
}

function toWireItem(it: ItemInstance): WireItem {
  const icon = resolveItemIcon(it.defId, it.slot, it.name);
  const catalog = shopCatalogForUi();
  const desc = catalog.items[it.defId]?.desc || "";
  let iconPath = icon || undefined;
  if (iconPath && !iconPath.startsWith("/")) {
    iconPath = `/assets/icons/${iconPath}`;
  }
  return {
    uid: it.uid,
    defId: it.defId,
    name: it.name,
    slot: it.slot,
    rarity: it.rarity,
    refine: it.refine,
    attackBonus: it.attackBonus,
    defenseBonus: it.defenseBonus,
    stack: it.stack,
    sellValue: it.sellValue,
    desc,
    icon: iconPath,
    stats: {
      atk: it.attackBonus,
      def: it.defenseBonus,
    },
  };
}

export function buildWireSkillCatalog(session: CityGameSession): WireSkillCatalog {
  const st = session.skillTree.state;
  const klass = CLASSES[st.classId];
  const skills: Record<string, WireSkillRow> = {};
  for (const tree of klass.treeOrder) {
    const defs = klass.trees[tree];
    defs.forEach((sk, i) => {
      const wireId = `${tree}-${i + 1}`;
      skills[wireId] = {
        id: wireId,
        tree,
        idx: i,
        skillId: sk.id,
        name: sk.name,
        desc: sk.desc ?? (sk.kind === "passive" ? "Passiva" : sk.name),
        learned: session.skillTree.hasSkill(sk.id),
        passive: sk.kind === "passive",
        mp: sk.mp ?? 0,
        cd: sk.cooldown ?? 0,
        pointsCost: SKILL_TRAINING.pointsCost,
        goldCost: SKILL_TRAINING.goldCost(i),
        icon: skillIconPath(sk.id),
      };
    });
  }
  const attr = session.character.attributes;
  return {
    classId: st.classId,
    barSize: SKILL_BALANCE.barSize,
    trees: [...klass.treeOrder],
    treeLabels: { ...klass.treeLabels },
    skills,
    skillPoints: st.skillPoints,
    gold: session.inventory.gold,
    specPoints: st.specPoints,
    spec: { ...st.specialization },
    attrPts: session.progression.state.unspentAttributePoints,
    attrs: { FOR: attr.FOR, DES: attr.DES, CONS: attr.CONS, INT: attr.INT },
    eighthTree: session.skillTree.state.eighthTree,
  };
}

export function createWireGameApi(
  session: CityGameSession,
  host?: (() => void) | WireGameHost,
): WireApi {
  const hostObj: WireGameHost = typeof host === "function" ? { onChanged: host } : host || {};
  const notifyChanged = () => {
    hostObj.onChanged?.();
  };

  const getViewModel = (): CharacterViewModel => {
    if (hostObj.currentViewModel) return hostObj.currentViewModel();
    const p = session.progression.state;
    const c = session.character;
    const attr = c.attributes;
    return {
      profileId: session.saveService.getProfileId(),
      name: c.name,
      classId: session.skillTree.state.classId,
      evolution: p.evolution,
      level: p.level,
      resets: p.resetsInEvolution,
      gold: session.inventory.gold,
      vaultGold: session.accountVault.gold,
      attrs: { FOR: attr.FOR, DES: attr.DES, CONS: attr.CONS, INT: attr.INT },
      attrPts: p.unspentAttributePoints,
      xp: p.xp,
      xpToNext: p.xpToNext,
      hp: c.hp,
      maxHp: c.maxHp,
      mp: c.mp,
      maxMp: c.maxMp,
      attack: c.attack,
      defense: c.defense,
      specPts: session.skillTree.state.specPoints,
      spec: { ...session.skillTree.state.specialization },
    };
  };

  return {
    getCharacterViewModel: getViewModel,
    spendAttribute: (key: string) => {
      const k = key.toUpperCase();
      if (k !== "FOR" && k !== "DES" && k !== "CONS" && k !== "INT") return false;
      const ok = session.progression.spendAttribute(k, 1);
      if (ok) {
        session.saves.markDirty("character", "deferred");
        notifyChanged();
      }
      return ok;
    },
    spendAllAttributes: (primary: "FOR" | "CONS" = "FOR") => {
      let spent = 0;
      const other = primary === "FOR" ? "CONS" : "FOR";
      while (session.progression.state.unspentAttributePoints > 0) {
        const attr = spent % 2 === 0 ? primary : other;
        if (!session.progression.spendAttribute(attr, 1)) break;
        spent += 1;
      }
      if (spent > 0) {
        session.saves.markDirty("character", "deferred");
        notifyChanged();
      }
      return spent;
    },
    spendSpec: (tree: string) => {
      if (tree !== "controle" && tree !== "magia" && tree !== "fisica") return false;
      const ok = session.skillTree.spendSpec(tree, 1);
      if (ok) {
        session.progression.recomputeCombatStats();
        session.saves.markDirty("skills", "deferred");
        notifyChanged();
      }
      return ok;
    },
    isMaxLevel: () => {
      const max = PROGRESSION_BALANCE.evolutions[session.progression.state.evolution].maxLevel;
      return session.progression.state.level >= max;
    },
    canReset: () => session.progression.canReset(),
    tryReset: () => {
      const ok = session.tryReset();
      if (ok) notifyChanged();
      return ok;
    },
    canEvolve: () => session.progression.canEvolve(),
    tryEvolve: () => {
      const res = session.tryEvolve();
      if (res.ok) notifyChanged();
      return res;
    },

    snapshotInventory: () => ({
      gold: session.inventory.gold,
      usedSlots: session.inventory.usedSlots(),
      capacity: session.inventory.capacity,
      items: session.inventory.items.map(toWireItem),
    }),
    useConsumable: (uid: string) => {
      const ok = session.tryUseConsumable(uid);
      if (ok) notifyChanged();
      return ok;
    },
    discardItem: (uid: string) => {
      const item = session.inventory.remove(uid);
      if (!item) return false;
      session.saves.markDirty("inventory", "critical");
      void session.saves.checkpoint();
      notifyChanged();
      return true;
    },
    reorderBag: (uids: string[]) => {
      const ok = session.inventory.reorder(uids);
      if (ok) {
        session.saves.markDirty("inventory", "deferred");
        notifyChanged();
      }
      return ok;
    },
    unlockBag: (index: number) => {
      session.bags.unlock(index);
      session.saves.markDirty("bags", "deferred");
      notifyChanged();
      return true;
    },
    getBagsState: () => ({
      unlocked: session.bags.snapshot(),
    }),
    equipBest: () => {
      const slots: EquipSlot[] = ["weapon", "head", "armor", "neck", "ear", "ring1", "ring2"];
      let changed = false;
      for (const slot of slots) {
        const kind = slot === "ring1" || slot === "ring2" ? "ring" : slot;
        const candidates = session.inventory.items.filter((i) => i.slot === kind || i.slot === slot);
        if (!candidates.length) continue;
        candidates.sort((a, b) => gearScore(b) - gearScore(a));
        const best = candidates[0];
        const current = session.equipment.equipped[slot];
        if (!current || gearScore(best) > gearScore(current)) {
          if (session.equipment.equip(best.uid)) {
            changed = true;
          }
        }
      }
      if (changed) {
        session.refreshWeaponSetFromGear();
        session.progression.recomputeCombatStats();
        session.saves.markDirty(["equipment", "inventory"], "deferred");
        notifyChanged();
      }
      return changed;
    },

    equippedSnapshot: () => {
      const raw = session.equipment.snapshotEquipped();
      const out: Partial<Record<string, WireItem>> = {};
      for (const slot of Object.keys(raw)) {
        const item = raw[slot as EquipSlot];
        if (item) out[slot] = toWireItem(item);
      }
      return out;
    },
    equipUid: (uid: string) => {
      const ok = session.equipment.equip(uid);
      if (ok) {
        session.refreshWeaponSetFromGear();
        session.progression.recomputeCombatStats();
        session.saves.markDirty(["equipment", "inventory"], "deferred");
        notifyChanged();
      }
      return ok;
    },
    unequipSlot: (slot: string) => {
      const slots = ["weapon", "head", "armor", "ring1", "ring2", "neck", "ear"] as const;
      if (!(slots as readonly string[]).includes(slot)) return false;
      const res = session.equipment.unequip(slot as EquipSlot);
      if (res.ok) {
        session.refreshWeaponSetFromGear();
        session.progression.recomputeCombatStats();
        session.saves.markDirty(["equipment", "inventory"], "deferred");
        notifyChanged();
        return true;
      }
      return false;
    },
    swapSlots: (slotA: string, slotB: string) => {
      const ok = session.equipment.swapSlots(slotA as EquipSlot, slotB as EquipSlot);
      if (ok) {
        session.refreshWeaponSetFromGear();
        session.progression.recomputeCombatStats();
        session.saves.markDirty("equipment", "deferred");
        notifyChanged();
      }
      return ok;
    },
    discardEquipped: (slot: string) => {
      const ok = session.equipment.discardEquipped(slot as EquipSlot);
      if (ok) {
        session.refreshWeaponSetFromGear();
        session.progression.recomputeCombatStats();
        session.saves.markDirty("equipment", "critical");
        void session.saves.checkpoint();
        notifyChanged();
      }
      return ok;
    },

    pullSkillCatalog: () => buildWireSkillCatalog(session),
    learnSkill: (tree: string, index: number) => {
      const ok = session.tryLearnSkill(tree as TreeId, index);
      if (ok) notifyChanged();
      return ok;
    },
    learnFisicaLine: () => {
      let learned = 0;
      for (let i = 0; i < 8; i++) {
        if (session.tryLearnSkill("fisica", i)) learned += 1;
        else break;
      }
      if (learned > 0) notifyChanged();
      return learned;
    },
    getSkillBar: (): WireSkillBarSlot[] => {
      return session.skillLoadout.slots.map((s, idx) => {
        if (!s) {
          return {
            slotIndex: idx,
            skillId: null,
            auto: false,
          };
        }
        return {
          slotIndex: idx,
          skillId: s.skill.id,
          tree: s.tree,
          name: s.skill.name,
          icon: skillIconPath(s.skill.id),
          auto: s.auto,
          cooldown: s.cooldown,
          cd: s.cd,
        };
      });
    },
    equipSkill: (slotIndex: number, skillId: string) => {
      let resolved = skillId;
      const catalog = buildWireSkillCatalog(session);
      const wireRow = catalog.skills[skillId];
      if (wireRow?.skillId) resolved = wireRow.skillId;
      const ok = session.skillLoadout.assignToSlot(slotIndex, resolved);
      if (ok) {
        session.saves.markDirty("skillLoadout", "deferred");
        notifyChanged();
      }
      return ok;
    },
    clearSkillSlot: (slotIndex: number) => {
      session.skillLoadout.clearSlot(slotIndex);
      session.saves.markDirty("skillLoadout", "deferred");
      notifyChanged();
      return true;
    },
    toggleSkillAuto: (slotIndex: number) => {
      session.skillLoadout.toggleAuto(slotIndex);
      session.saves.markDirty("skillLoadout", "deferred");
      notifyChanged();
      return true;
    },
    swapSkillSlots: (fromIndex: number, toIndex: number) => {
      const ok = session.skillLoadout.swapSlots(fromIndex, toIndex);
      if (ok) {
        session.saves.markDirty("skillLoadout", "deferred");
        notifyChanged();
      }
      return ok;
    },
    getPotionBar: () => session.getPotionBar(),
    setPotionSlot: (slotIndex: number, defId: string | null) => {
      const ok = session.setPotionSlot(slotIndex, defId);
      if (ok) notifyChanged();
      return ok;
    },
    usePotionSlot: (slotIndex: number) => {
      const ok = session.usePotionSlot(slotIndex);
      if (ok) notifyChanged();
      return ok;
    },
    getCombatAutos: () => session.getCombatAutos(),
    toggleCombatAuto: (kind: "attack" | "move" | "potion") => {
      const ok = session.toggleCombatAuto(kind);
      if (ok) notifyChanged();
      return ok;
    },

    getShopCatalog: () => shopCatalogForUi(),
    buyShop: (shopId: string, itemId: string) => {
      const result = buyFromShop(session.inventory, shopId, itemId);
      if (result.ok) {
        session.refreshWeaponSetFromGear();
        session.saves.markDirty("inventory", "critical");
        void session.saves.checkpoint();
        notifyChanged();
      }
      return result;
    },
    sellItem: (uid: string, count?: number) => {
      const result = sellItem(session.inventory, uid, count);
      if (result.ok) {
        session.saves.markDirty("inventory", "critical");
        void session.saves.checkpoint();
        notifyChanged();
      }
      return result;
    },

    snapshotVault: () => ({
      gold: session.accountVault.gold,
      capacity: session.accountVault.capacity,
      items: session.accountVault.items.map(toWireItem),
    }),
    depositGold: (amount: number) => {
      const res = session.vaultTransfer.depositGold(amount);
      if (res > 0) notifyChanged();
      return res;
    },
    withdrawGold: (amount: number) => {
      const res = session.vaultTransfer.withdrawGold(amount);
      if (res > 0) notifyChanged();
      return res;
    },
    moveToVault: (uid: string) => {
      const ok = session.vaultTransfer.moveItemToVault(uid);
      if (ok) notifyChanged();
      return ok;
    },
    moveFromVault: (uid: string) => {
      const ok = session.vaultTransfer.moveItemFromVault(uid);
      if (ok) notifyChanged();
      return ok;
    },
    moveAllToVault: () => {
      const res = session.vaultTransfer.moveAllToVault();
      if (res.movedGold > 0 || res.movedItems > 0) notifyChanged();
      return res;
    },
    reorderVault: (uids: string[]) => {
      const ok = session.accountVault.reorder(uids);
      if (ok) {
        session.saves.markDirty("vault", "deferred");
        notifyChanged();
      }
      return ok;
    },
    discardVaultItem: (uid: string) => {
      const item = session.accountVault.remove(uid);
      if (!item) return false;
      session.saves.markDirty("vault", "critical");
      void session.saves.checkpoint();
      notifyChanged();
      return true;
    },

    refineItem: (uid: string) => {
      const item =
        session.inventory.items.find((i) => i.uid === uid) ||
        (Object.values(session.equipment.equipped).find((i) => i?.uid === uid) as ItemInstance | undefined);
      if (!item) return { ok: false, costGold: 0, mat: "", reason: "not_found" };
      const r = session.refinement.refine(item);
      if (r.ok) {
        session.equipment.onItemRefined(item);
        session.progression.recomputeCombatStats();
        session.saves.markDirty(["inventory", "equipment"], "critical");
        void session.saves.checkpoint();
        notifyChanged();
      }
      return { ...r, newRefine: item.refine };
    },

    listEligible: (recipeId: string): WireComposerItem[] =>
      session.composition.listEligible(recipeId).map((it) => ({
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
    canAttempt: (recipeId: string, itemUid: string) => session.composition.canAttempt(recipeId, itemUid),
    compose: (recipeId: string, itemUid: string) => {
      const res = session.tryCompose(recipeId, itemUid);
      notifyChanged();
      return res;
    },

    listQuests: (): WireQuestEntry[] => session.quests.listForUi(),
    acceptQuest: (questId: string) => {
      const res = session.acceptQuest(questId);
      notifyChanged();
      return res;
    },

    getPortalContext: (): WirePortalContext => ({
      level: session.character.level,
      evolution: session.progression.state.evolution,
      entryCounts: session.entryItemCounts(),
      dungeons: session.allDungeons().map((d) => ({
        id: d.id,
        name: d.name,
        minLevel: d.minLevel,
        maxLevel: d.maxLevel,
        entryItemId: d.entryItemId ?? null,
        durationSeconds: d.durationSeconds,
      })),
    }),
    listEligibleDungeons: (): WireDungeonEntry[] =>
      session.eligibleDungeons().map((d) => ({
        id: d.id,
        name: d.name,
        minLevel: d.minLevel,
        maxLevel: d.maxLevel,
        entryItemId: d.entryItemId ?? null,
        durationSeconds: d.durationSeconds,
      })),
    enterDungeonById: (id: string) => {
      const result = session.tryEnterDungeon(id);
      if (result.ok) {
        hostObj.closePanels?.();
        return result;
      }
      switch (result.reason) {
        case "entry":
        case "level":
        case "evolution":
        case "missing":
        case "busy":
          hostObj.showToast?.(dungeonEnterMessage(result.reason), "dungeon");
          break;
      }
      return result;
    },

    getSageContext: () => ({ topics: [] }),

    listSlots: () => saveVault.listSlots(),
    createSlot: (input: { slotIndex: number; classId: string; name: string; level?: number; gold?: number }) =>
      saveVault.createSlot(input),
    deleteSlot: (slotIndex: number) => saveVault.deleteSlot(slotIndex),
    loadSlot: async (slotIndex: number) => {
      await session.saves.checkpoint();
      const slots = await saveVault.listSlots();
      const summary = slots[slotIndex];
      if (!summary) return false;
      const previous = session.saveService.getProfileId();
      session.saveService.setProfileId(summary.profileId);
      const loaded = await session.loadSave();
      if (loaded.status !== "found") {
        session.saveService.setProfileId(previous);
        return false;
      }
      await session.reloadAccountVault();
      notifyChanged();
      return true;
    },

    resolveItemIcon: (defId: string, slot?: string, name?: string) => resolveItemIcon(defId, slot, name),
    skillPointsCost: () => SKILL_TRAINING.pointsCost,
    skillGoldCost: (index: number) => SKILL_TRAINING.goldCost(index),
    canAffordSkill: (skillPoints: number, gold: number, pointsCost: number, goldCost: number) =>
      SKILL_TRAINING.canAfford(skillPoints, gold, pointsCost, goldCost),

    onChanged: notifyChanged,
    closePanels: () => hostObj.closePanels?.(),
  };
}

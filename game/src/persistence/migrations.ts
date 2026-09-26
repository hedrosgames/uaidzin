import type { BootCharacter } from "../app/BootFlow";
import type { ItemInstance } from "../domain/items/ItemModel";
import type { EquipSlot } from "../domain/items/EquipmentService";
import type { ActiveBuff } from "../domain/character/BuffService";
import { CLASSES } from "../data/classes/class-definitions";
import { remapSkillId } from "../data/classes/skill-legacy";
import {
  SAVE_VERSION,
  emptyAttrs,
  normalizeTreeMap,
  parseProfileId,
  type SavePayload,
  type SkillLoadoutSlotSave,
} from "./SaveTypes";

function asItem(raw: Record<string, unknown>): ItemInstance | null {
  if (!raw || typeof raw.uid !== "string" || typeof raw.defId !== "string") return null;
  return {
    uid: String(raw.uid),
    defId: String(raw.defId),
    name: String(raw.name || raw.defId),
    rarity: (raw.rarity as ItemInstance["rarity"]) || "Comum",
    slot: (raw.slot as ItemInstance["slot"]) || "misc",
    refine: Number(raw.refine) || 0,
    attackBonus: Number(raw.attackBonus) || 0,
    defenseBonus: Number(raw.defenseBonus) || 0,
    stack: Number(raw.stack) || 1,
    sellValue: Number(raw.sellValue) || 0,
    attackRange: Number(raw.attackRange) || undefined,
    attackInterval: Number(raw.attackInterval) || undefined,
  };
}

function asLoadoutSlots(raw: unknown): SkillLoadoutSlotSave[] {
  if (!Array.isArray(raw)) return [];
  const out: SkillLoadoutSlotSave[] = [];
  for (const row of raw) {
    const s = row as Partial<SkillLoadoutSlotSave>;
    if (!s?.skillId) continue;
    out.push({
      skillId: String(s.skillId),
      tree: String(s.tree || "fisica"),
      auto: s.auto !== false,
    });
  }
  return out.slice(0, 4);
}

function asBuffs(raw: unknown): ActiveBuff[] {
  if (!Array.isArray(raw)) return [];
  const out: ActiveBuff[] = [];
  for (const row of raw) {
    const b = row as Partial<ActiveBuff>;
    if (!b?.id) continue;
    out.push({
      id: String(b.id),
      remainingSec: Math.max(0, Number(b.remainingSec) || 0),
      stacks: Math.max(1, Math.floor(Number(b.stacks) || 1)),
      magnitude: b.magnitude,
      stat: b.stat,
      harmful: b.harmful,
      nextHitMul: b.nextHitMul,
    });
  }
  return out;
}

function asBags(raw: unknown): SavePayload["bags"] {
  const unlocked = [true, false, false, false];
  const src = (raw as { unlocked?: boolean[] } | null)?.unlocked;
  if (Array.isArray(src)) {
    for (let i = 0; i < 4; i++) unlocked[i] = i === 0 ? true : !!src[i];
  }
  return { unlocked };
}

function normalizeBase(data: SavePayload, profileIdHint: string): SavePayload {
  const classId = data.character?.classId || data.skills?.classId || "TK";
  const parsed = parseProfileId(data.meta?.profileId || profileIdHint);
  const equipped: Partial<Record<EquipSlot, ItemInstance>> = {};
  const src = data.equipment?.equipped || {};
  for (const key of Object.keys(src) as EquipSlot[]) {
    const item = asItem(src[key] as unknown as Record<string, unknown>);
    if (item) equipped[key] = item;
  }
  const items: ItemInstance[] = [];
  for (const raw of data.inventory?.items || []) {
    const item = asItem(raw as unknown as Record<string, unknown>);
    if (item) items.push(item);
  }
  return {
    saveVersion: data.saveVersion || 2,
    meta: {
      profileId: data.meta?.profileId || profileIdHint,
      userId: data.meta?.userId || parsed?.userId || "unknown",
      slotIndex: data.meta?.slotIndex ?? parsed?.slotIndex ?? 0,
      updatedAt: Number.isFinite(data.meta?.updatedAt) ? Number(data.meta?.updatedAt) : Date.now(),
    },
    character: {
      name: data.character?.name || "Herói",
      classId,
      level: Number(data.character?.level) || 1,
      evolution: data.character?.evolution || "Mortal",
      xp: Number(data.character?.xp) || 0,
      unspentAttributePoints: Number(data.character?.unspentAttributePoints) || 0,
      resetsInEvolution: Number(data.character?.resetsInEvolution) || 0,
      bonusAttributePoints: Number(data.character?.bonusAttributePoints) || 0,
      attributes: {
        FOR: Number(data.character?.attributes?.FOR) || emptyAttrs().FOR,
        DES: Number(data.character?.attributes?.DES) || emptyAttrs().DES,
        CONS: Number(data.character?.attributes?.CONS) || emptyAttrs().CONS,
        INT: Number(data.character?.attributes?.INT) || emptyAttrs().INT,
      },
      hp: Number(data.character?.hp) || 100,
      mp: data.character?.mp,
    },
    skills: {
      classId,
      levels: data.skills?.levels || {},
      eighthTree: data.skills?.eighthTree ?? null,
      specialization: normalizeTreeMap(data.skills?.specialization),
      skillPoints: Number(data.skills?.skillPoints) || 0,
      specPoints: Number(data.skills?.specPoints) || 0,
    },
    skillLoadout: {
      slots: asLoadoutSlots(data.skillLoadout?.slots),
    },
    equipment: { equipped },
    inventory: {
      gold: Number(data.inventory?.gold) || 0,
      items,
    },
    bags: asBags(data.bags),
    buffs: asBuffs(data.buffs),
    progress: {
      dungeonsUnlocked: Array.isArray(data.progress?.dungeonsUnlocked)
        ? data.progress.dungeonsUnlocked.map(String)
        : [],
      dungeonClears: { ...(data.progress?.dungeonClears || {}) },
      quests: { ...(data.progress?.quests || {}) },
    },
    options: { ...(data.options || {}) },
  };
}

function nonNegInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function attrOrBase(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(fallback, Math.floor(n));
}

function classIdOrTk(value: unknown): string {
  return typeof value === "string" && value in CLASSES ? value : "TK";
}

const EVOLUTIONS = new Set(["Mortal", "Arch", "Cele"]);

export function normalizeSavePayload(raw: unknown, profileIdHint = "default"): SavePayload {
  const data = (raw && typeof raw === "object" ? raw : {}) as SavePayload;
  const base = normalizeBase(data, profileIdHint);
  const classId = classIdOrTk(base.character.classId || base.skills.classId);
  const attrs = emptyAttrs();
  const payload: SavePayload = {
    ...base,
    saveVersion: SAVE_VERSION,
    character: {
      ...base.character,
      classId,
      evolution: EVOLUTIONS.has(base.character.evolution) ? base.character.evolution : "Mortal",
      level: Math.max(1, nonNegInt(base.character.level, 1)),
      xp: nonNegInt(base.character.xp),
      unspentAttributePoints: nonNegInt(base.character.unspentAttributePoints),
      resetsInEvolution: nonNegInt(base.character.resetsInEvolution),
      bonusAttributePoints: nonNegInt(base.character.bonusAttributePoints),
      attributes: {
        FOR: attrOrBase(base.character.attributes?.FOR, attrs.FOR),
        DES: attrOrBase(base.character.attributes?.DES, attrs.DES),
        CONS: attrOrBase(base.character.attributes?.CONS, attrs.CONS),
        INT: attrOrBase(base.character.attributes?.INT, attrs.INT),
      },
      hp: nonNegInt(base.character.hp, 100),
      mp: base.character.mp === undefined ? undefined : nonNegInt(base.character.mp),
    },
    skills: {
      ...base.skills,
      classId,
      specialization: normalizeTreeMap(base.skills.specialization),
      skillPoints: nonNegInt(base.skills.skillPoints),
      specPoints: nonNegInt(base.skills.specPoints),
    },
    skillLoadout: {
      slots: asLoadoutSlots(base.skillLoadout?.slots),
    },
    bags: asBags(base.bags),
    inventory: {
      gold: nonNegInt(base.inventory.gold),
      items: base.inventory.items,
    },
  };
  remapLearnedSkills(payload);
  return payload;
}

export function normalizeBootCharacter(raw: unknown): BootCharacter | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<BootCharacter>;
  const id = typeof data.id === "string" ? data.id.trim() : "";
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const classId = typeof data.classId === "string" ? data.classId : "";
  if (!id || !name || !(classId in CLASSES)) return null;
  const base = emptyAttrs();
  return {
    id,
    slotIndex: Number.isFinite(data.slotIndex) ? data.slotIndex : undefined,
    name,
    classId,
    level: 1,
    evolution: "Mortal",
    gold: 0,
    attrs: { FOR: base.FOR, DES: base.DES, CONS: base.CONS, INT: base.INT },
    trees: normalizeTreeMap(null),
    spec: normalizeTreeMap(null),
    resets: 0,
  };
}

export function migrateSave(raw: unknown, profileIdHint = "default"): SavePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const version = (raw as { saveVersion?: unknown }).saveVersion;
  if (typeof version !== "number" || !(version >= SAVE_VERSION)) return null;
  return normalizeSavePayload(raw, profileIdHint);
}

function remapLearnedSkills(payload: SavePayload): void {
  const levels: SavePayload["skills"]["levels"] = {};
  for (const [id, row] of Object.entries(payload.skills.levels || {})) {
    const next = remapSkillId(id);
    const level = Number(row?.level) || 0;
    if (!levels[next] || level > levels[next].level) levels[next] = { level };
  }
  payload.skills.levels = levels;
  payload.skillLoadout.slots = (payload.skillLoadout.slots || []).map((slot) => ({
    ...slot,
    skillId: remapSkillId(slot.skillId),
  }));
}

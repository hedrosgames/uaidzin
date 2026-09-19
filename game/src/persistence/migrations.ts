import type { ItemInstance } from "../domain/items/ItemModel";
import type { EquipSlot } from "../domain/items/EquipmentService";
import type { ActiveBuff } from "../domain/character/BuffService";
import {
  SAVE_VERSION,
  emptyBags,
  emptyProgress,
  emptySkillLoadout,
  parseProfileId,
  type SavePayload,
  type SavePayloadV1,
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

function migrateV1ToV2(data: SavePayloadV1, profileIdHint = "default"): SavePayload {
  const parsed = parseProfileId(profileIdHint);
  const items: ItemInstance[] = [];
  for (const raw of data.inventory?.items || []) {
    const item = asItem(raw as Record<string, unknown>);
    if (item) items.push(item);
  }
  const classId = data.skills?.classId || "TK";
  return {
    saveVersion: 2,
    meta: {
      profileId: profileIdHint,
      userId: parsed?.userId || "unknown",
      slotIndex: parsed?.slotIndex ?? 0,
      updatedAt: Date.now(),
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
        FOR: Number(data.character?.attributes?.FOR) || 5,
        DES: Number(data.character?.attributes?.DES) || 5,
        CONS: Number(data.character?.attributes?.CONS) || 5,
        INT: Number(data.character?.attributes?.INT) || 5,
      },
      hp: Number(data.character?.hp) || 100,
    },
    skills: {
      classId,
      levels: data.skills?.levels || {},
      eighthTree: data.skills?.eighthTree ?? null,
      specialization: { ...(data.skills?.specialization || {}) },
      skillPoints: Number(data.skills?.skillPoints) || 0,
      specPoints: Number(data.skills?.specPoints) || 0,
    },
    skillLoadout: emptySkillLoadout(),
    equipment: { equipped: {} },
    inventory: {
      gold: Number(data.inventory?.gold) || 0,
      items,
    },
    bags: emptyBags(),
    buffs: [],
    progress: emptyProgress(),
    options: {},
  };
}

function migrateV2ToV3(data: SavePayload): SavePayload {
  return {
    ...normalizeBase(data, data.meta?.profileId || "default"),
    saveVersion: 3,
    skillLoadout: {
      slots: asLoadoutSlots(data.skillLoadout?.slots),
    },
    bags: asBags(data.bags),
    buffs: asBuffs(data.buffs),
  };
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
      updatedAt: data.meta?.updatedAt || Date.now(),
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
        FOR: Number(data.character?.attributes?.FOR) || 5,
        DES: Number(data.character?.attributes?.DES) || 5,
        CONS: Number(data.character?.attributes?.CONS) || 5,
        INT: Number(data.character?.attributes?.INT) || 5,
      },
      hp: Number(data.character?.hp) || 100,
      mp: data.character?.mp,
    },
    skills: {
      classId,
      levels: data.skills?.levels || {},
      eighthTree: data.skills?.eighthTree ?? null,
      specialization: { ...(data.skills?.specialization || {}) },
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

export function migrateSave(raw: unknown, profileIdHint = "default"): SavePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as SavePayload & SavePayloadV1;
  if (typeof data.saveVersion !== "number") return null;
  let current: SavePayload;
  if (data.saveVersion < 2) {
    current = migrateV1ToV2(data as SavePayloadV1, profileIdHint);
  } else {
    current = normalizeBase(data as SavePayload, profileIdHint);
  }
  if (current.saveVersion < 3) {
    current = migrateV2ToV3(current);
  }
  while (current.saveVersion < SAVE_VERSION) {
    current = { ...current, saveVersion: current.saveVersion + 1 };
  }
  current.saveVersion = SAVE_VERSION;
  return current;
}

import { PROGRESSION_BALANCE } from "../data/balance/progression";
import type { ItemInstance } from "../domain/items/ItemModel";
import type { EquipSlot } from "../domain/items/EquipmentService";
import type { ActiveBuff } from "../domain/character/BuffService";
import type { AccountVaultState } from "../domain/account/AccountVaultService";

export const SAVE_VERSION = 4;
export const SLOT_COUNT = 4;
export const ACCOUNT_SAVE_VERSION = 2;

export type AttrBlock = { FOR: number; DES: number; CONS: number; INT: number };

export type QuestState = {
  status: "locked" | "active" | "done";
  step?: number;
};

export type TreeMap = { controle: number; magia: number; fisica: number };

export const PROFILE_SECTIONS = [
  "meta",
  "character",
  "skills",
  "skillLoadout",
  "equipment",
  "inventory",
  "bags",
  "buffs",
  "progress",
  "options",
] as const;

export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export type SaveTarget = ProfileSection | "vault";

export type SaveEventKind = "critical" | "deferred";

export type SlotSummary = {
  profileId: string;
  classId: string;
  name: string;
  level: number;
  evolution: string;
  gold: number;
  resets: number;
  attrs: AttrBlock;
  trees: TreeMap;
  spec: TreeMap;
  saveVersion: number;
};

export type SkillLoadoutSlotSave = {
  skillId: string;
  tree: string;
  auto: boolean;
};

export type AccountSave = {
  version: number;
  user: string;
  slots: Array<SlotSummary | null>;
  vault: AccountVaultState;
  updatedAt: number;
};

export type SavePayload = {
  saveVersion: number;
  meta: {
    profileId: string;
    userId: string;
    slotIndex: number;
    updatedAt: number;
  };
  character: {
    name: string;
    classId: string;
    level: number;
    evolution: string;
    xp: number;
    unspentAttributePoints: number;
    resetsInEvolution: number;
    bonusAttributePoints: number;
    attributes: AttrBlock;
    hp: number;
    mp?: number;
  };
  skills: {
    classId: string;
    levels: Record<string, { level: number }>;
    eighthTree: string | null;
    specialization: Record<string, number>;
    skillPoints: number;
    specPoints: number;
  };
  skillLoadout: {
    slots: SkillLoadoutSlotSave[];
  };
  equipment: {
    equipped: Partial<Record<EquipSlot, ItemInstance>>;
  };
  inventory: {
    gold: number;
    items: ItemInstance[];
  };
  bags: {
    unlocked: boolean[];
  };
  buffs: ActiveBuff[];
  progress: {
    dungeonsUnlocked: string[];
    dungeonClears: Record<string, number>;
    quests: Record<string, QuestState>;
  };
  options: Record<string, unknown>;
};

export type CipherEnvelope = {
  v: number;
  mode: "aes" | "xor";
  iv?: string;
  data: string;
  at: number;
};

export type AccountRecord = {
  id: string;
  salt: string;
  hash: string;
  createdAt: number;
  mode: "aes" | "fallback";
};

export type AuthSession = {
  user: string;
  at: number;
  key: string;
  salt: string;
  mode: "aes" | "fallback";
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type LoadSaveResult =
  | { status: "found" }
  | { status: "absent" }
  | { status: "error" };

export type CharacterViewModel = {
  profileId: string;
  classId: string;
  name: string;
  level: number;
  evolution: string;
  gold: number;
  resets: number;
  attrs: AttrBlock;
  hp?: number;
  mp?: number;
  maxHp?: number;
  maxMp?: number;
  xp?: number;
  xpToNext?: number;
  attrPts?: number;
  attack?: number;
  defense?: number;
  spec?: TreeMap;
  specPts?: number;
  vaultGold?: number;
};

export function emptyAttrs(): AttrBlock {
  const base = PROGRESSION_BALANCE.baseAttributes;
  return { FOR: base.FOR, DES: base.DES, CONS: base.CONS, INT: base.INT };
}

export function emptyTreeMap(): TreeMap {
  return { controle: 0, magia: 0, fisica: 0 };
}

function treeCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function normalizeTreeMap(src: unknown): TreeMap {
  const t = src && typeof src === "object" ? (src as Record<string, unknown>) : {};
  return {
    controle: treeCount(t.controle),
    magia: treeCount(t.magia),
    fisica: treeCount(t.fisica),
  };
}

export function emptyProgress(): SavePayload["progress"] {
  return { dungeonsUnlocked: [], dungeonClears: {}, quests: {} };
}

export function emptyVault(): AccountVaultState {
  return { gold: 0, items: [] };
}

export function emptyBags(): SavePayload["bags"] {
  return { unlocked: [true, false, false, false] };
}

export function emptySkillLoadout(): SavePayload["skillLoadout"] {
  return { slots: [] };
}

export function normalizeSlots(slots: unknown): Array<SlotSummary | null> {
  const raw = Array.isArray(slots) ? slots : [];
  const out: Array<SlotSummary | null> = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const s = raw[i] as Partial<SlotSummary> | null | undefined;
    if (!s || typeof s !== "object" || !s.classId || !s.name) {
      out.push(null);
      continue;
    }
    out.push({
      profileId: String(s.profileId || ""),
      classId: String(s.classId),
      name: String(s.name),
      level: Number(s.level) || 1,
      evolution: String(s.evolution || "Mortal"),
      gold: treeCount(s.gold),
      resets: treeCount(s.resets),
      attrs: {
        FOR: Math.max(emptyAttrs().FOR, treeCount(s.attrs?.FOR)),
        DES: Math.max(emptyAttrs().DES, treeCount(s.attrs?.DES)),
        CONS: Math.max(emptyAttrs().CONS, treeCount(s.attrs?.CONS)),
        INT: Math.max(emptyAttrs().INT, treeCount(s.attrs?.INT)),
      },
      trees: normalizeTreeMap((s as SlotSummary).trees),
      spec: normalizeTreeMap((s as SlotSummary).spec),
      saveVersion: treeCount(s.saveVersion),
    });
  }
  return out;
}

export function normalizeVault(raw: unknown): AccountVaultState {
  const data = (raw || {}) as Partial<AccountVaultState>;
  const items: ItemInstance[] = [];
  if (Array.isArray(data.items)) {
    for (const it of data.items) {
      if (!it || typeof it !== "object" || typeof (it as ItemInstance).uid !== "string") continue;
      items.push({ ...(it as ItemInstance) });
    }
  }
  return {
    gold: Math.max(0, Math.floor(Number(data.gold) || 0)),
    items,
  };
}

export function profileIdFor(userId: string, slotIndex: number): string {
  return `${userId}:slot:${slotIndex}`;
}

export function parseProfileId(profileId: string): { userId: string; slotIndex: number } | null {
  const m = /^(.+):slot:(\d+)$/.exec(profileId);
  if (!m) return null;
  return { userId: m[1], slotIndex: Number(m[2]) };
}

export function summaryFromPayload(payload: SavePayload): SlotSummary {
  const spec = normalizeTreeMap(payload.skills.specialization);
  const trees = emptyTreeMap();
  const levels = payload.skills.levels || {};
  for (const [skillId, progress] of Object.entries(levels)) {
    const lvl = Math.max(0, Math.floor(Number(progress?.level) || 0));
    if (lvl <= 0) continue;
    if (skillId.includes("_ctrl") || skillId.includes("controle")) trees.controle += lvl;
    else if (skillId.includes("_mag") || skillId.includes("magia")) trees.magia += lvl;
    else if (skillId.includes("_fis") || skillId.includes("fisica")) trees.fisica += lvl;
  }
  return {
    profileId: payload.meta.profileId,
    classId: payload.character.classId || payload.skills.classId,
    name: payload.character.name,
    level: payload.character.level,
    evolution: payload.character.evolution,
    gold: payload.inventory.gold,
    resets: payload.character.resetsInEvolution,
    attrs: { ...payload.character.attributes },
    trees,
    spec,
    saveVersion: SAVE_VERSION,
  };
}

export function viewModelFromSummary(slot: SlotSummary): CharacterViewModel {
  return {
    profileId: slot.profileId,
    classId: slot.classId,
    name: slot.name,
    level: slot.level,
    evolution: slot.evolution,
    gold: slot.gold,
    resets: slot.resets,
    attrs: { ...slot.attrs },
  };
}

export function viewModelFromPayload(payload: SavePayload): CharacterViewModel {
  return {
    profileId: payload.meta.profileId,
    classId: payload.character.classId || payload.skills.classId,
    name: payload.character.name,
    level: payload.character.level,
    evolution: payload.character.evolution,
    gold: payload.inventory.gold,
    resets: payload.character.resetsInEvolution,
    attrs: { ...payload.character.attributes },
    hp: payload.character.hp,
    mp: payload.character.mp,
  };
}

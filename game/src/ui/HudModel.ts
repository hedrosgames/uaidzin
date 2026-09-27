import type { WeaponSetId } from "../presentation/player/WeaponRig";

export type DropLogKind = "gold" | "item" | "lost" | "info";

export interface DropLogEntry {
  id: number;
  text: string;
  kind: DropLogKind;
}

export interface HudSkillSlot {
  key: number;
  name: string;
  cdRatio: number;
  ready: boolean;
  auto?: boolean;
}

export interface HudModel {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  xpMax: number;
  isMaxLevel: boolean;
  level: number;
  evolution: string;
  playerName: string;
  classId: string;
  timer: string | null;
  kills: number;
  arenaHint: string | null;
  skills: HudSkillSlot[];
  drops: DropLogEntry[];
  weaponSet: WeaponSetId;
  pendingSave: boolean;
  lootToast?: string | null;
  uiToastKind?: "skill" | "attr" | "level" | "dungeon";
  gold?: number;
  unspentPoints?: number;
}

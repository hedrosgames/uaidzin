import type { Vector3 } from "three";
import type { ClassId, SkillDef, TreeId } from "../../../data/classes/class-definitions";
import type { SkillElement, SkillKind, SkillPower, SkillShape } from "../../../data/classes/skill-types";

export type SkillVfxFamily =
  | "chain"
  | "projectile"
  | "arrow"
  | "aoe"
  | "line"
  | "melee"
  | "buff"
  | "heal"
  | "transform"
  | "summon"
  | "passive";

export type SkillVfxPassiveEvent = "learned" | "equip" | "proc";

export type DedicatedSkillVfx =
  | "golpe"
  | "investida"
  | "corte"
  | "machado"
  | "quebra"
  | "furia"
  | "avalanche"
  | "bencao"
  | "selo"
  | "aura"
  | "escudo-sagrado"
  | "julgamento"
  | "luz"
  | "purificar"
  | "tribunal"
  | "provocacao"
  | "postura"
  | "rugido"
  | "muralha"
  | "ancora"
  | "desafio"
  | "guarda"
  | "bastiao"
  | "esfera-ignea"
  | "lanca-glacial"
  | "choque-vital"
  | "picada-peconhenta"
  | "tempestade-brasa"
  | "sombra-corrosiva"
  | "nevasca"
  | "colapso-elemental";

export interface SkillVfxProfile {
  id: string;
  name: string;
  classId: ClassId;
  tree: TreeId;
  index: number;
  kind: SkillKind;
  shape: SkillShape;
  element: SkillElement | null;
  power: SkillPower;
  family: SkillVfxFamily;
  colorHex: number;
  radius: number;
  range: number;
  seed: number;
  passiveEvent: SkillVfxPassiveEvent | null;
  dedicatedVfx?: DedicatedSkillVfx;
  status: boolean;
  skill: SkillDef;
}

export interface SkillVfxHit {
  id: string;
  x: number;
  z: number;
  damage: number;
  hitIndex: number;
}

export interface SkillVfxRequest {
  profile: SkillVfxProfile;
  origin: Vector3;
  target: Vector3 | null;
  center: Vector3;
  colorHex: number;
  facing: number;
  range: number;
  radius: number;
  hits: SkillVfxHit[];
  hasHeal: boolean;
  hasBuff: boolean;
  hasTransform: boolean;
  hasSummon: boolean;
}

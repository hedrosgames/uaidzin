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
  | "force-wave"
  | "death-stab"
  | "earthquake"
  | "golpe"
  | "investida"
  | "corte"
  | "lamina-energia"
  | "campo-gelo"
  | "mana-burn"
  | "machado"
  | "quebra"
  | "furia"
  | "descuidado"
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
  | "colapso-elemental"
  | "bm-lobo-guerreiro"
  | "bm-couro-fera"
  | "bm-furia-selvagem"
  | "bm-investida"
  | "bm-garra-brutal"
  | "bm-ursao"
  | "bm-presas-aco"
  | "bm-tita"
  | "bm-condor"
  | "bm-lobo"
  | "bm-chamado-boss"
  | "bm-urso"
  | "bm-tigre"
  | "bm-dragao"
  | "bm-vinculo"
  | "bm-exercito"
  | "bm-dardo-igneo"
  | "bm-fenda-glacial"
  | "bm-escarpa"
  | "bm-voz-trovao"
  | "bm-manto"
  | "bm-corrente-agua"
  | "bm-muralha"
  | "bm-furia-quatro"
  | "ht-tiro-certeiro"
  | "ht-pes-ligeiros"
  | "ht-mira-aguia"
  | "ht-tiro-congelante"
  | "ht-sentinela"
  | "ht-flecha-rasante"
  | "ht-instinto"
  | "ht-rapid-hit"
  | "ht-garra"
  | "ht-mais-um-golpe"
  | "ht-presa-ferida"
  | "ht-dodge"
  | "ht-rugido"
  | "ht-roubo-vital"
  | "ht-duas-maos"
  | "ht-invisibilidade"
  | "ht-flecha-arcana"
  | "ht-flecha-ignea"
  | "ht-flecha-glacial"
  | "ht-flecha-trovao"
  | "ht-chuva-mistica"
  | "ht-flecha-espectral"
  | "ht-vagalume"
  | "ht-tempestade";

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
  attackPoint?: Vector3;
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

import { CLASSES, type ClassId, type TreeId, type SkillDef } from "../../../data/classes/class-definitions";
import { elementColor } from "../../../data/classes/skill-types";
import type {
  DedicatedSkillVfx,
  SkillVfxFamily,
  SkillVfxPassiveEvent,
  SkillVfxProfile,
} from "./SkillVfxTypes";

const CLASS_IDS: ClassId[] = ["TK", "FM", "BM", "HT"];
const TREE_COLORS: Record<TreeId, number> = {
  fisica: 0xc45c26,
  controle: 0x6b7cff,
  magia: 0xb07cff,
};

export const TK_DEDICATED_VFX_BY_SKILL_ID: Record<string, DedicatedSkillVfx> = {
  tk_mag_1: "bencao",
  tk_mag_2: "selo",
  tk_mag_3: "aura",
  tk_mag_4: "escudo-sagrado",
  tk_mag_5: "julgamento",
  tk_mag_6: "luz",
  tk_mag_7: "purificar",
  tk_mag_8: "tribunal",
  tk_ctrl_1: "provocacao",
  tk_ctrl_2: "postura",
  tk_ctrl_3: "rugido",
  tk_ctrl_4: "muralha",
  tk_ctrl_5: "ancora",
  tk_ctrl_6: "desafio",
  tk_ctrl_7: "guarda",
  tk_ctrl_8: "bastiao",
  tk_fis_force_wave: "golpe",
  tk_fis_atk_descuidado: "descuidado",
  tk_fis_death_stab: "investida",
  tk_fis_fury: "furia",
  tk_fis_earthquake: "avalanche",
};

export const FM_DEDICATED_VFX_BY_SKILL_ID: Record<string, DedicatedSkillVfx> = {
  fm_mag_esfera_ignea: "esfera-ignea",
  fm_mag_lanca_glacial: "lanca-glacial",
  fm_mag_choque_vital: "choque-vital",
  fm_mag_picada: "picada-peconhenta",
  fm_mag_tempestade_brasa: "tempestade-brasa",
  fm_mag_sombra_corrosiva: "sombra-corrosiva",
  fm_mag_nevasca: "nevasca",
  fm_mag_colapso: "colapso-elemental",
};

function hashId(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function familyFor(skill: SkillDef, classId: ClassId): SkillVfxFamily {
  if (skill.id === "tk_fis_fire_burst") return "chain";
  if (skill.kind === "passive") return "passive";
  if (skill.kind === "transform") return "transform";
  if (skill.kind === "summon") return "summon";
  if (skill.kind === "heal") return "heal";
  if (skill.kind === "buff") return "buff";
  if (skill.shape === "aoe") return "aoe";
  if (skill.shape === "line") return "line";
  const lowerName = skill.name.toLowerCase();
  if (classId === "HT" && (lowerName.includes("flecha") || lowerName.includes("tiro"))) {
    return "arrow";
  }
  if (skill.shape === "single" && skill.range <= 3.2) return "melee";
  return "projectile";
}

function passiveEventFor(skill: SkillDef): SkillVfxPassiveEvent | null {
  if (skill.kind !== "passive" || !skill.passive) return null;
  if (["dual", "bow", "twoHand", "damageReduction"].includes(skill.passive.id)) {
    return "equip";
  }
  if (["crit", "evasion", "transformedCrit", "summonLink", "isolated"].includes(skill.passive.id)) {
    return "proc";
  }
  return "learned";
}

function dedicatedVfxFor(skillId: string): DedicatedSkillVfx | undefined {
  return TK_DEDICATED_VFX_BY_SKILL_ID[skillId] ?? FM_DEDICATED_VFX_BY_SKILL_ID[skillId];
}

function createProfile(
  skill: SkillDef,
  classId: ClassId,
  tree: TreeId,
  index: number,
): SkillVfxProfile {
  return {
    id: skill.id,
    name: skill.name,
    classId,
    tree,
    index,
    kind: skill.kind,
    shape: skill.shape,
    element: skill.element ?? null,
    power: skill.power,
    family: familyFor(skill, classId),
    colorHex: elementColor(skill.element, TREE_COLORS[tree]),
    radius: skill.radius ?? skill.range,
    range: skill.range,
    seed: hashId(skill.id),
    passiveEvent: passiveEventFor(skill),
    dedicatedVfx: dedicatedVfxFor(skill.id),
    status: skill.enemy != null,
    skill,
  };
}

function createCatalog(): SkillVfxProfile[] {
  const entries: SkillVfxProfile[] = [];
  for (const classId of CLASS_IDS) {
    const definition = CLASSES[classId];
    for (const tree of definition.treeOrder) {
      for (const [index, skill] of definition.trees[tree].entries()) {
        entries.push(createProfile(skill, classId, tree, index));
      }
    }
  }
  return entries;
}

export const SKILL_VFX_CATALOG = createCatalog();
export const SKILL_VFX_BY_ID = new Map(SKILL_VFX_CATALOG.map((entry) => [entry.id, entry]));

if (SKILL_VFX_CATALOG.length !== 96) {
  throw new Error(`Catálogo de VFX inválido: ${SKILL_VFX_CATALOG.length} skills`);
}

export function getSkillVfxProfile(id: string): SkillVfxProfile | undefined {
  return SKILL_VFX_BY_ID.get(id);
}

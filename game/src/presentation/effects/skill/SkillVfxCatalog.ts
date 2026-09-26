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
  tk_fis_1: "golpe",
  tk_fis_2: "corte",
  tk_fis_3: "investida",
  tk_fis_4: "machado",
  tk_fis_5: "quebra",
  tk_fis_6: "furia",
  tk_fis_7: "avalanche",
  tk_fis_force_wave: "golpe",
  tk_fis_fury: "furia",
  tk_fis_earthquake: "avalanche",
  tk_ctrl_shield: "muralha",
  tk_ctrl_resistance: "postura",
  tk_ctrl_taunt: "provocacao",
  tk_ctrl_imunity: "escudo-sagrado",
  tk_ctrl_parry: "guarda",
  tk_ctrl_sustain: "bencao",
  tk_ctrl_fear: "rugido",
  tk_ctrl_divine_armor: "bastiao",
  tk_mag_lamina_energia: "luz",
  tk_mag_mana_burn: "aura",
  tk_mag_moon_ray: "julgamento",
  tk_mag_death_stab: "desafio",
  tk_mag_circulo_morte: "tribunal",
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
  return TK_DEDICATED_VFX_BY_SKILL_ID[skillId];
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

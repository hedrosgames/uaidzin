import { registerLegacyTree } from "../skill-legacy";
import { defineSkill, type SkillDef, type SummonSpec } from "../skill-types";

const condor: SummonSpec = { id: "condor", role: "ranged", attackMul: 0.48, hpMul: 0.75, range: 7, interval: 1.15 };
const lobo: SummonSpec = { id: "lobo", role: "melee", attackMul: 0.58, hpMul: 0.95, range: 1.8, interval: 0.9 };
const urso: SummonSpec = { id: "urso", role: "tank", attackMul: 0.42, hpMul: 1.8, range: 1.8, interval: 1.25 };
const tigre: SummonSpec = { id: "tigre", role: "melee", attackMul: 0.78, hpMul: 0.85, range: 1.8, interval: 0.7 };
const dragao: SummonSpec = { id: "dragao", role: "elite", attackMul: 0.72, hpMul: 1.55, range: 4.6, interval: 1.35, splash: 2.2 };

export const BM_FISICA: SkillDef[] = [
  defineSkill({
    id: "bm_fis_lobo_guerreiro",
    name: "Lobo Guerreiro",
    index: 0,
    kind: "transform",
    transform: { id: "lobo", sec: 18, attack: 1.18, defense: 0.92, hp: 1, scale: 1.08, attackSpeed: 0.28 },
  }),
  defineSkill({
    id: "bm_fis_couro_fera",
    name: "Couro de Fera",
    index: 1,
    kind: "buff",
    buff: { id: "bm_hide_def", sec: 14, stat: "defense", magnitude: 0.22 },
    extraBuff: { id: "bm_hide_hp", sec: 14, stat: "maxHp", magnitude: 0.18 },
  }),
  defineSkill({
    id: "bm_fis_furia_selvagem",
    name: "Fúria Selvagem",
    index: 2,
    kind: "buff",
    buff: { id: "bm_wild_atk", sec: 12, stat: "attack", magnitude: 0.22 },
    extraBuff: { id: "bm_wild_spd", sec: 12, stat: "attackSpeed", magnitude: 0.24 },
  }),
  defineSkill({
    id: "bm_fis_investida",
    name: "Investida Bestial",
    index: 3,
    kind: "damage",
    shape: "single",
    element: "physical",
    range: 4.5,
    enemy: { knock: 1.8 },
  }),
  defineSkill({
    id: "bm_fis_garra_brutal",
    name: "Garra Brutal",
    index: 4,
    kind: "damage",
    shape: "single",
    element: "physical",
    range: 2.6,
    damageMultiplier: 1.7,
  }),
  defineSkill({
    id: "bm_fis_ursao",
    name: "Ursão Ancião",
    index: 5,
    kind: "transform",
    transform: { id: "urso", sec: 18, attack: 1.12, defense: 1.42, hp: 1.35, scale: 1.24 },
  }),
  defineSkill({
    id: "bm_fis_presas_aco",
    name: "Presas de Aço",
    index: 6,
    kind: "passive",
    passive: { id: "transformedCrit", magnitude: 0.18 },
  }),
  defineSkill({
    id: "bm_fis_tita",
    name: "Titã Primordial",
    index: 7,
    kind: "transform",
    transform: { id: "tita", sec: 14, attack: 1.42, defense: 1.35, hp: 1.4, scale: 1.42, attackSpeed: 0.12 },
  }),
];

export const BM_MAGIA: SkillDef[] = [
  defineSkill({
    id: "bm_mag_dardo_igneo",
    name: "Dardo Ígneo",
    index: 0,
    kind: "damage",
    shape: "single",
    element: "fire",
    range: 8,
  }),
  defineSkill({
    id: "bm_mag_fenda_glacial",
    name: "Fenda Glacial",
    index: 1,
    kind: "damage",
    shape: "single",
    element: "ice",
    range: 8,
    enemy: { slow: 0.5, slowSec: 3.2 },
  }),
  defineSkill({
    id: "bm_mag_escarpa",
    name: "Escarpa Sísmica",
    index: 2,
    kind: "damage",
    shape: "aoe",
    element: "earth",
    radius: 3.5,
    range: 3.5,
  }),
  defineSkill({
    id: "bm_mag_voz_trovao",
    name: "Voz do Trovão",
    index: 3,
    kind: "damage",
    shape: "single",
    element: "lightning",
    range: 8,
    damageMultiplier: 1.7,
    enemy: { stunSec: 1.2, stunChance: 0.35 },
  }),
  defineSkill({
    id: "bm_mag_manto",
    name: "Manto Elemental",
    index: 4,
    kind: "buff",
    buff: { id: "bm_mantle_power", sec: 12, stat: "magicPower", magnitude: 0.22 },
    extraBuff: { id: "bm_mantle_res", sec: 12, stat: "magicResist", magnitude: 0.2 },
  }),
  defineSkill({
    id: "bm_mag_corrente_agua",
    name: "Corrente de Água",
    index: 5,
    kind: "damage",
    shape: "aoe",
    element: "water",
    radius: 3.8,
    range: 3.8,
    enemy: { slow: 0.55, slowSec: 3 },
  }),
  defineSkill({
    id: "bm_mag_muralha",
    name: "Muralha de Rocha",
    index: 6,
    kind: "buff",
    buff: { id: "bm_rock_def", sec: 12, stat: "defense", magnitude: 0.28 },
    extraBuff: { id: "bm_rock_reflect", sec: 12, stat: "reflect", magnitude: 0.22 },
  }),
  defineSkill({
    id: "bm_mag_furia_quatro",
    name: "Fúria dos Quatro",
    index: 7,
    kind: "damage",
    shape: "aoe",
    element: "mixed",
    radius: 4.4,
    range: 4.4,
    damageMultiplier: 2.7,
  }),
];

export const BM_CONTROLE: SkillDef[] = [
  defineSkill({
    id: "bm_ctrl_condor",
    name: "Invocar Condor",
    index: 0,
    kind: "summon",
    summon: condor,
  }),
  defineSkill({
    id: "bm_ctrl_lobo",
    name: "Invocar Lobo",
    index: 1,
    kind: "summon",
    summon: lobo,
  }),
  defineSkill({
    id: "bm_ctrl_chamado_boss",
    name: "Chamado do Boss",
    index: 2,
    kind: "buff",
    buff: { id: "bm_boss_call", sec: 14, stat: "summonPower", magnitude: 0.35 },
  }),
  defineSkill({
    id: "bm_ctrl_urso",
    name: "Invocar Urso",
    index: 3,
    kind: "summon",
    summon: urso,
  }),
  defineSkill({
    id: "bm_ctrl_tigre",
    name: "Invocar Tigre",
    index: 4,
    kind: "summon",
    summon: tigre,
  }),
  defineSkill({
    id: "bm_ctrl_dragao",
    name: "Invocar Dragão",
    index: 5,
    kind: "summon",
    summon: dragao,
  }),
  defineSkill({
    id: "bm_ctrl_vinculo",
    name: "Vínculo Vital",
    index: 6,
    kind: "passive",
    passive: { id: "summonLink", magnitude: 0.5 },
  }),
  defineSkill({
    id: "bm_ctrl_exercito",
    name: "Exército Primordial",
    index: 7,
    kind: "summon",
    pack: [condor, lobo, tigre],
  }),
];

registerLegacyTree("bm_fis", BM_FISICA);
registerLegacyTree("bm_ctrl", BM_CONTROLE);
registerLegacyTree("bm_mag", BM_MAGIA);

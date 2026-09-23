import { FM_CONTROLE, FM_FISICA, FM_MAGIA } from "./skills/fm";
import { TK_CONTROLE, TK_FISICA, TK_MAGIA } from "./skills/tk";
import { defineSkill, type SkillDef } from "./skill-types";

export type ClassId = "TK" | "FM" | "BM" | "HT";
export type TreeId = "controle" | "magia" | "fisica";

export type { SkillDef } from "./skill-types";

export interface ClassDef {
  id: ClassId;
  name: string;
  primary: "FOR" | "DES" | "CONS" | "INT";
  treeOrder: TreeId[];
  treeLabels: Record<TreeId, string>;
  trees: Record<TreeId, SkillDef[]>;
}

function tree(prefix: string, names: string[]): SkillDef[] {
  return names.map((name, index) =>
    defineSkill({
      id: `${prefix}_${index + 1}`,
      name,
      index,
      kind: "damage",
      shape: "single",
      range: 2.5 + (index % 3) * 0.3,
      damageMultiplier: 1.2 + index * 0.15,
      cooldown: 3 + (index % 4) * 0.5,
    }),
  );
}

const genericLabels: Record<TreeId, string> = {
  controle: "Controle",
  magia: "Magia",
  fisica: "Física",
};

export const CLASSES: Record<ClassId, ClassDef> = {
  TK: {
    id: "TK",
    name: "Thegn Knight",
    primary: "FOR",
    treeOrder: ["fisica", "controle", "magia"],
    treeLabels: {
      fisica: "Físico ofensivo",
      controle: "Defensivo",
      magia: "Mágico",
    },
    trees: {
      controle: TK_CONTROLE,
      magia: TK_MAGIA,
      fisica: TK_FISICA,
    },
  },
  FM: {
    id: "FM",
    name: "Frost Maiden",
    primary: "INT",
    treeOrder: ["fisica", "controle", "magia"],
    treeLabels: {
      fisica: "Física",
      controle: "White Mage",
      magia: "Maga negra",
    },
    trees: {
      controle: FM_CONTROLE,
      magia: FM_MAGIA,
      fisica: FM_FISICA,
    },
  },
  BM: {
    id: "BM",
    name: "Beast Master",
    primary: "INT",
    treeOrder: ["fisica", "magia", "controle"],
    treeLabels: genericLabels,
    trees: {
      controle: tree("bm_ctrl", ["Chamado", "Ameaça", "Bando", "Cerco", "Ordem", "Domínio", "Legião", "Soberano"]),
      magia: tree("bm_mag", ["Elo", "Eco", "Canal", "Pacto", "Vínculo", "Ritual", "Essência", "Absoluto"]),
      fisica: tree("bm_fis", ["Presas", "Garra", "Mordida", "Investida", "Feras", "Matilha", "Caçada", "Apex"]),
    },
  },
  HT: {
    id: "HT",
    name: "Huntress",
    primary: "DES",
    treeOrder: ["fisica", "controle", "magia"],
    treeLabels: genericLabels,
    trees: {
      controle: tree("ht_ctrl", ["Armadilha", "Corda", "Rede", "Silêncio", "Marca", "Canto", "Trilha", "Cerco"]),
      magia: tree("ht_mag", ["Farol", "Sinal", "Bênção", "Vento", "Lua", "Estrela", "Aurora", "Eclipse"]),
      fisica: tree("ht_fis", ["Tiro", "Perfuração", "Rajada", "Flecha Dupla", "Chuva", "Precisão", "Salva", "Tempestade"]),
    },
  },
};

export const BOOK_SKILLS: SkillDef[] = [
  defineSkill({ id: "book_hp", name: "Vida", index: 0, kind: "passive", damageMultiplier: 0, range: 0, cooldown: 0, mp: 0 }),
  defineSkill({ id: "book_gold", name: "Ouro", index: 1, kind: "passive", damageMultiplier: 0, range: 0, cooldown: 0, mp: 0 }),
  defineSkill({ id: "book_xp", name: "Experiência", index: 2, kind: "passive", damageMultiplier: 0, range: 0, cooldown: 0, mp: 0 }),
  defineSkill({ id: "book_cd", name: "Cooldown", index: 3, kind: "passive", damageMultiplier: 0, range: 0, cooldown: 0, mp: 0 }),
];

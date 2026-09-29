import { BM_CONTROLE, BM_FISICA, BM_MAGIA } from "./skills/bm";
import { FM_CONTROLE, FM_FISICA, FM_MAGIA } from "./skills/fm";
import { HT_CONTROLE, HT_FISICA, HT_MAGIA } from "./skills/ht";
import { TK_CONTROLE, TK_FISICA, TK_MAGIA } from "./skills/tk";
import { defineSkill, type SkillDef } from "./skill-types";

export type ClassId = "TK" | "FM" | "BM" | "HT";
export type TreeId = "controle" | "magia" | "fisica" | "livro";

export type { SkillDef } from "./skill-types";

export interface ClassDef {
  id: ClassId;
  name: string;
  primary: "FOR" | "DES" | "CONS" | "INT";
  treeOrder: TreeId[];
  treeLabels: Record<TreeId, string>;
  trees: Record<TreeId, SkillDef[]>;
}

export const BOOK_SKILLS: SkillDef[] = [
  defineSkill({
    id: "book_hp",
    name: "Vida",
    desc: "Passiva da linhagem Livros. Efeito em definição.",
    index: 0,
    kind: "passive",
    passive: { id: "bookStub", magnitude: 0 },
    damageMultiplier: 0,
    range: 0,
    cooldown: 0,
    mp: 0,
  }),
  defineSkill({
    id: "book_gold",
    name: "Ouro",
    desc: "Passiva da linhagem Livros. Efeito em definição.",
    index: 1,
    kind: "passive",
    passive: { id: "bookStub", magnitude: 0 },
    damageMultiplier: 0,
    range: 0,
    cooldown: 0,
    mp: 0,
  }),
  defineSkill({
    id: "book_xp",
    name: "Experiência",
    desc: "Passiva da linhagem Livros. Efeito em definição.",
    index: 2,
    kind: "passive",
    passive: { id: "bookStub", magnitude: 0 },
    damageMultiplier: 0,
    range: 0,
    cooldown: 0,
    mp: 0,
  }),
  defineSkill({
    id: "book_cd",
    name: "Cooldown",
    desc: "Passiva da linhagem Livros. Efeito em definição.",
    index: 3,
    kind: "passive",
    passive: { id: "bookStub", magnitude: 0 },
    damageMultiplier: 0,
    range: 0,
    cooldown: 0,
    mp: 0,
  }),
];

export const CLASSES: Record<ClassId, ClassDef> = {
  TK: {
    id: "TK",
    name: "Thegn Knight",
    primary: "FOR",
    treeOrder: ["fisica", "controle", "magia", "livro"],
    treeLabels: {
      fisica: "Físico ofensivo",
      controle: "Defensivo",
      magia: "Mágico",
      livro: "Livros",
    },
    trees: {
      controle: TK_CONTROLE,
      magia: TK_MAGIA,
      fisica: TK_FISICA,
      livro: BOOK_SKILLS,
    },
  },
  FM: {
    id: "FM",
    name: "Frost Maiden",
    primary: "INT",
    treeOrder: ["fisica", "controle", "magia", "livro"],
    treeLabels: {
      fisica: "Física",
      controle: "White Mage",
      magia: "Maga negra",
      livro: "Livros",
    },
    trees: {
      controle: FM_CONTROLE,
      magia: FM_MAGIA,
      fisica: FM_FISICA,
      livro: BOOK_SKILLS,
    },
  },
  BM: {
    id: "BM",
    name: "Beast Master",
    primary: "INT",
    treeOrder: ["fisica", "magia", "controle", "livro"],
    treeLabels: {
      fisica: "Nature",
      magia: "Element",
      controle: "Summon",
      livro: "Livros",
    },
    trees: {
      controle: BM_CONTROLE,
      magia: BM_MAGIA,
      fisica: BM_FISICA,
      livro: BOOK_SKILLS,
    },
  },
  HT: {
    id: "HT",
    name: "Huntress",
    primary: "DES",
    treeOrder: ["fisica", "controle", "magia", "livro"],
    treeLabels: {
      fisica: "Survival",
      controle: "Capture",
      magia: "Arcane Archer",
      livro: "Livros",
    },
    trees: {
      controle: HT_CONTROLE,
      magia: HT_MAGIA,
      fisica: HT_FISICA,
      livro: BOOK_SKILLS,
    },
  },
};

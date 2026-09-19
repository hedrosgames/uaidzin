export type ClassId = "TK" | "FM" | "BM" | "HT";
export type TreeId = "controle" | "magia" | "fisica";

export interface SkillDef {
  id: string;
  name: string;
  
  damageMultiplier: number;
  range: number;
  cooldown: number;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  primary: "FOR" | "DES" | "CONS" | "INT";
  trees: Record<TreeId, SkillDef[]>;
}

function tree(prefix: string, names: string[]): SkillDef[] {
  return names.map((name, i) => ({
    id: `${prefix}_${i + 1}`,
    name,
    damageMultiplier: 1.2 + i * 0.15,
    range: 2.5 + (i % 3) * 0.3,
    cooldown: 3 + (i % 4) * 0.5,
  }));
}


export const CLASSES: Record<ClassId, ClassDef> = {
  TK: {
    id: "TK",
    name: "Thegn Knight",
    primary: "FOR",
    trees: {
      controle: tree("tk_ctrl", ["Provocação", "Postura", "Rugido", "Muralha", "Âncora", "Desafio", "Guarda", "Bastião"]),
      magia: tree("tk_mag", ["Benção", "Selo", "Aura", "Escudo Sagrado", "Julgamento", "Luz", "Purificar", "Tribunal"]),
      fisica: tree("tk_fis", ["Golpe", "Corte", "Investida", "Machado", "Quebra", "Fúria", "Avalanche", "Colosso"]),
    },
  },
  FM: {
    id: "FM",
    name: "Frost Maiden",
    primary: "INT",
    trees: {
      controle: tree("fm_ctrl", ["Laço", "Silêncio", "Rede", "Cadeia", "Prisão", "Véu", "Estase", "Domínio"]),
      magia: tree("fm_mag", ["Faísca", "Dardo", "Bola", "Lança", "Tempestade", "Cometa", "Vórtice", "Ruína"]),
      fisica: tree("fm_fis", ["Bastão", "Toque", "Golpe Arcano", "Lâmina", "Impacto", "Ruptura", "Eco", "Colapso"]),
    },
  },
  BM: {
    id: "BM",
    name: "Beast Master",
    primary: "INT",
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
    trees: {
      controle: tree("ht_ctrl", ["Armadilha", "Corda", "Rede", "Silêncio", "Marca", "Canto", "Trilha", "Cerco"]),
      magia: tree("ht_mag", ["Farol", "Sinal", "Bênção", "Vento", "Lua", "Estrela", "Aurora", "Eclipse"]),
      fisica: tree("ht_fis", ["Tiro", "Perfuração", "Rajada", "Flecha Dupla", "Chuva", "Precisão", "Salva", "Tempestade"]),
    },
  },
};

export const BOOK_SKILLS: SkillDef[] = [
  { id: "book_hp", name: "Vida", damageMultiplier: 0, range: 0, cooldown: 0 },
  { id: "book_gold", name: "Ouro", damageMultiplier: 0, range: 0, cooldown: 0 },
  { id: "book_xp", name: "Experiência", damageMultiplier: 0, range: 0, cooldown: 0 },
  { id: "book_cd", name: "Cooldown", damageMultiplier: 0, range: 0, cooldown: 0 },
];

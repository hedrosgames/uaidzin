const U = {};

U.game = {
  ciclo: "Crie sua conta, escolha um mortal, desça na dungeon e resolva tudo em dez minutos. Se morrer, volta inteiro.",
  url: {
    entrar: "http://127.0.0.1:5173/boot/01-login.html",
    jogar: "http://127.0.0.1:5173/",
  },
};

U.destaques = [
  { k: "8", s: "dungeons" },
  { k: "600 s", s: "por descida" },
  { k: "400", s: "níveis" },
  { k: "4", s: "classes" },
  { k: "7", s: "peças de equipamento" },
  { k: "0", s: "perda na morte" },
];

U.classes = [
  {
    id: "TK",
    nome: "Thegn Knight",
    pt: "Cavaleiro Thegn",
    arte: "tk",
    prim: "FOR",
    arma: "Machado e escudo",
    desc: "Segura a linha. Golpe pesado de perto e o maior espaço de vida entre as quatro.",
  },
  {
    id: "FM",
    nome: "Frost Maiden",
    pt: "Donzela Glacial",
    arte: "fm",
    prim: "INT",
    arma: "Cajadão",
    desc: "Fica atrás e cobre área. É a classe que mais depende de mana para viver.",
  },
  {
    id: "BM",
    nome: "Beast Master",
    pt: "Mestre das Feras",
    arte: "bm",
    prim: "INT",
    arma: "Garras",
    desc: "Corpo a corpo puro. Rápido no intervalo curto e forte de perto.",
  },
  {
    id: "HT",
    nome: "Huntress",
    pt: "Caçadora",
    arte: "ht",
    prim: "DES",
    arma: "Espadas duplas",
    desc: "A maior distância entre as de mão. Vive de mobili e cadência.",
  },
];

U.dungeons = [
  { id: "dungeon-1", nome: "Dungeon 1", min: 1, max: 40, entrada: null, arenas: 3, spawns: 12, nota: "Portão livre, começa aqui" },
  { id: "dungeon-2", nome: "Cemitério de Cinzas", min: 35, max: 90, entrada: null, arenas: 4, spawns: 12, nota: "O único com cenário próprio" },
  { id: "dungeon-3", nome: "Dungeon 3", min: 80, max: 150, entrada: null, arenas: 3, spawns: 9, nota: "Portão livre" },
  { id: "dungeon-4", nome: "Dungeon 4", min: 140, max: 220, entrada: "Selo D4", arenas: 3, spawns: 11, nota: "Cobra selo" },
  { id: "dungeon-5", nome: "Dungeon 5", min: 200, max: 280, entrada: "Selo D5", arenas: 3, spawns: 10, nota: "Cobra selo" },
  { id: "dungeon-6", nome: "Dungeon 6", min: 260, max: 330, entrada: "Selo D6", arenas: 3, spawns: 9, nota: "Cobra selo" },
  { id: "dungeon-7", nome: "Dungeon 7", min: 310, max: 370, entrada: "Selo D7", arenas: 3, spawns: 11, nota: "Cobra selo" },
  { id: "dungeon-8", nome: "Dungeon 8", min: 350, max: 400, entrada: "Selo D8", arenas: 3, spawns: 9, nota: "Cobra selo" },
];

U.monstros = [
  { id: "caveira_campo", nome: "Esqueleto do Campo", pv: 36, atq: 13, def: 2, resp: 8, xp: 20, arte: "campo", sigil: "d1-a1" },
  { id: "caveira_normal", nome: "Guerreiro Esqueleto", pv: 85, atq: 16, def: 5, resp: 15, xp: 20, arte: "campo", sigil: "d2" },
  { id: "lobo_selvagem", nome: "Lobo Selvagem", pv: 300, atq: 63, def: 6, resp: 8, xp: 30, arte: "lobo", sigil: "d1-a2" },
  { id: "caveira_especial", nome: "Guardião Esqueleto", pv: 150, atq: 24, def: 8, resp: 25, xp: 40, arte: "campo", sigil: "d2" },
  { id: "caveira_fogo", nome: "Esqueleto de Fogo", pv: 750, atq: 113, def: 10, resp: 25, xp: 50, arte: "campo", sigil: "d1-a3" },
  { id: "boss_mortal", nome: "Comandante da Cripta", pv: 220, atq: 16, def: 7, resp: 180, xp: 48, arte: "chefe", sigil: "chefe" },
];

U.equipSlots = [
  { slot: "Arma", icone: "weapon", exemplo: "Machado Leve" },
  { slot: "Cabeça", icone: "crown", exemplo: "Capacete" },
  { slot: "Corpo", icone: "armor", exemplo: "Armadura Leve" },
  { slot: "Anel 1", icone: "ring1", exemplo: "Anel de Cobre" },
  { slot: "Anel 2", icone: "ring2", exemplo: "Anel de Ferro" },
  { slot: "Pescoço", icone: "neck", exemplo: "Colar Simples" },
  { slot: "Orelha", icone: "ear", exemplo: "Brinco de Osso" },
];

U.arvores = [
  { nome: "Caça", icones: ["caca-1", "caca-2", "caca-3", "caca-4"] },
  { nome: "Armadilha", icones: ["armadilha-1", "armadilha-2", "armadilha-3", "armadilha-4"] },
  { nome: "Marca", icones: ["marca-1", "marca-2", "marca-3", "marca-4"] },
  { nome: "Especial", icones: ["special-1", "special-2", "special-3", "special-4"] },
];

U.itens = [
  { nome: "Machado Leve", icone: "machado_leve", nota: "Arma de entrada, de graça" },
  { nome: "Espada Curta", icone: "espada_curta", nota: "Vende no Ferreiro" },
  { nome: "Armadura Leve", icone: "armadura_leve", nota: "Defesa no corpo" },
  { nome: "Capacete", icone: "capacete", nota: "Defesa na cabeça" },
  { nome: "Anel de Cobre", icone: "anel_cobre", nota: "Dedo esquerdo" },
  { nome: "Anel de Ferro", icone: "anel_ferro", nota: "Dedo direito" },
  { nome: "Colar Simples", icone: "colar_simples", nota: "Pescoço" },
  { nome: "Brinco de Osso", icone: "brinco_osso", nota: "Orelha" },
  { nome: "Poção Menor", icone: "potion", nota: "Recupera vida" },
  { nome: "Selo de Entrada", icone: "seal", nota: "Abre as dungeons 4 a 8" },
];

U.loja = [
  { nome: "Mercador", linhas: ["Selos D4 a D8", "Poção Menor", "Poeira de Ori", "Poeira de Lac"] },
  { nome: "Ferreiro", linhas: ["Machado Leve", "Espada Curta", "Armadura Leve", "Capacete", "Anéis, colar e brinco"] },
  { nome: "Mestre de Habilidades", linhas: ["Aprenda as três árvores", "Gaste ponto de skill", "Especialize cada linha"] },
  { nome: "Mestre de Quests", linhas: ["Acompanhe o objetivo", "Resgate o que falta"] },
];

U.regras = [
  ["A conta nova vem zerada", "Nível 1, ouro 0, inventário vazio, zero ponto de skill. Você monta o personagem do zero."],
  ["A descida dura dez minutos", "Orelhe o relógio. Quando ele bate zero, você volta pra cidade com tudo o que juntou."],
  ["Morrer não tira nada", "Nem ouro, nem item, nem experiência. O personagem volta inteiro depois de um instante."],
  ["O ouro vai para o cofre", "Tudo cai direto na bolsa. Se ela estiver cheia, o item se perde e o jogo avisa."],
  ["O monstro volta", "O mesmo esqueleto ressurge no mesmo ponto depois de poucos segundos. Dá para farmar o mesmo corpo."],
  ["A cidade é o seu refúgio", "Ferreiro, mercador e mestres ficam todos na mesma praça. Nenhuma descida é obrigatória."],
];

U.passos = [
  ["Crie a conta", "Dois campos. Leva dez segundos e o personagem nasce zerado."],
  ["Escolha um mortal", "Quatro classes, todas começando em 5/5/5/5."],
  ["Compre o machado", "No Ferreiro, de graça. É o que te deixa atacar."],
  ["Desça na Dungeon 1", "Dez minutos, três arenas, doze inimigos."],
  ["Repita até o 40", "O nível 40 exige 14.612 de experiência acumulada."],
  ["Passe para o Cemitério", "Abre no nível 35, com esqueleto de verdade e cenário próprio."],
];

window.U = U;

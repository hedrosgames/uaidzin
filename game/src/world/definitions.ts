export type InteractableKind = "npc" | "portal" | "portal-exit" | "chest";

export interface InteractableDef {
  id: string;
  label: string;
  kind: InteractableKind;
  x: number;
  z: number;

  color: number;
  body: string;
}

export const CITY_INTERACTABLES: InteractableDef[] = [
  {
    id: "npc-portal-guard",
    label: "Guarda do Portal",
    kind: "npc",
    x: 0,
    z: -10,
    color: 0xd4a017,
    body: "Seleciona e entra em dungeons.",
  },
  {
    id: "npc-merchant",
    label: "Mercador",
    kind: "npc",
    x: 8,
    z: 2,
    color: 0x3d9a6a,
    body: "Compra e venda de itens. Loja completa na Fase 7.",
  },
  {
    id: "npc-blacksmith",
    label: "Ferreiro",
    kind: "npc",
    x: -8,
    z: 2,
    color: 0xc45c26,
    body: "Refinamento de equipamentos. Sistema na Fase 7.",
  },
  {
    id: "npc-skill-master",
    label: "Mestre de Skills",
    kind: "npc",
    x: 6,
    z: -4,
    color: 0x6b7cff,
    body: "Skills, especialização e livros. Sistema na Fase 8.",
  },
  {
    id: "npc-sage",
    label: "Sábio",
    kind: "npc",
    x: -6,
    z: -4,
    color: 0xb07cff,
    body: "Evolução e reset. Sistema na Fase 6.",
  },
  {
    id: "npc-composer",
    label: "Compositor",
    kind: "npc",
    x: 7.2,
    z: -7.2,
    color: 0x8aa0b8,
    body: "Composição de itens.",
  },
  {
    id: "vault-chest",
    label: "Baú",
    kind: "chest",
    x: -9.2,
    z: 4.2,
    color: 0xc4a35a,
    body: "Inventário e baú da conta.",
  },
  {
    id: "npc-quest",
    label: "Mestre de Quests",
    kind: "npc",
    x: -9,
    z: -8,
    color: 0xe8c547,
    body: "Quests. Sistema na Fase 11.",
  },
];

export const CITY_PORTAL_PROP: InteractableDef = {
  id: "portal-city-decor",
  label: "Portal",
  kind: "portal",
  x: 0,
  z: -13.5,
  color: 0x44c0ff,
  body: "",
};

export const DUNGEON_EXIT: InteractableDef = {
  id: "portal-exit",
  label: "Portal de saída",
  kind: "portal-exit",
  x: 0,
  z: 0,
  color: 0x44c0ff,
  body: "Retorna para Aurelion. [E] para sair",
};

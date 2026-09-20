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
    body: "",
  },
  {
    id: "npc-merchant",
    label: "Mercador",
    kind: "npc",
    x: 11.9,
    z: 0.9,
    color: 0x3d9a6a,
    body: "",
  },
  {
    id: "npc-blacksmith",
    label: "Ferreiro",
    kind: "npc",
    x: 10.2,
    z: 10.9,
    color: 0xc45c26,
    body: "",
  },
  {
    id: "npc-skill-master",
    label: "Mestre de Skills",
    kind: "npc",
    x: -9.1,
    z: -10.1,
    color: 0x6b7cff,
    body: "",
  },
  {
    id: "npc-sage",
    label: "Sábio",
    kind: "npc",
    x: -4.2,
    z: -2.6,
    color: 0xb07cff,
    body: "",
  },
  {
    id: "npc-composer",
    label: "Compositor",
    kind: "npc",
    x: -9.9,
    z: 10.9,
    color: 0x8aa0b8,
    body: "",
  },
  {
    id: "vault-chest",
    label: "Baú",
    kind: "chest",
    x: 2.6,
    z: 11.4,
    color: 0xc4a35a,
    body: "",
  },
  {
    id: "npc-quest",
    label: "Mestre de Quests",
    kind: "npc",
    x: 5.7,
    z: -12.6,
    color: 0xe8c547,
    body: "",
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
    body: "",
};

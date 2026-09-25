import rawNpcs from "../data/world/npcs.json";

export type InteractableKind = "npc" | "portal" | "portal-exit" | "chest";

export interface InteractableDef {
  id: string;
  label: string;
  kind: InteractableKind;
  x: number;
  z: number;
  color: number;
  body: string;
  service?: string;
}

function parseHexColor(color: string | number): number {
  if (typeof color === "number") return color;
  const cleaned = color.replace("#", "");
  return parseInt(cleaned, 16) || 0xd4a017;
}

export const CITY_INTERACTABLES: InteractableDef[] = (rawNpcs as Array<{
  id: string;
  label: string;
  kind: string;
  x: number;
  z: number;
  color: string | number;
  body: string;
  service?: string;
}>).map((item) => ({
  id: item.id,
  label: item.label,
  kind: item.kind as InteractableKind,
  x: item.x,
  z: item.z,
  color: parseHexColor(item.color),
  body: item.body || "",
  service: item.service,
}));

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

import { WireUi, type WirePanelName } from "./wire";

const WIRE_PANEL_NAMES = new Set<string>([
  "person",
  "skills",
  "inv",
  "vault",
  "shop",
  "portal",
  "skillmaster",
  "sage",
  "composer",
  "quest",
]);

export function isWirePanelName(name: string): name is WirePanelName {
  return WIRE_PANEL_NAMES.has(name);
}

export { WireUi, type WirePanelName };

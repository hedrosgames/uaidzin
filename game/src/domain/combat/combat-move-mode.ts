export type CombatMoveMode = "off" | "anchor" | "hunt";

export const AUTO_MOVE_SIDE_METERS = 6;
export const AUTO_MOVE_HUNT_STEP_METERS = 6;
export const AUTO_MOVE_HUNT_RANGE = 28;

const CYCLE_ORDER: CombatMoveMode[] = ["off", "anchor", "hunt"];

export function cycleCombatMoveMode(current: CombatMoveMode): CombatMoveMode {
  const idx = CYCLE_ORDER.indexOf(current);
  const next = idx < 0 ? 0 : (idx + 1) % CYCLE_ORDER.length;
  return CYCLE_ORDER[next];
}

export function parseCombatMoveMode(saved: unknown, legacyAutoMove?: boolean): CombatMoveMode {
  if (saved === "off" || saved === "anchor" || saved === "hunt") return saved;
  if (legacyAutoMove === true) return "hunt";
  return "off";
}

export function combatMoveModeLabel(mode: CombatMoveMode): string {
  if (mode === "off") return "OFF";
  if (mode === "anchor") return "FIX";
  return "LIV";
}

export function combatMoveModeTitle(mode: CombatMoveMode): string {
  if (mode === "off") return "Movimento automático desligado";
  if (mode === "anchor") return "Auto: ±6 m no lugar (volta ao ponto ativado)";
  return "Auto: avança 6 m rumo ao inimigo mais próximo";
}

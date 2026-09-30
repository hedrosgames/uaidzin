export type CombatAttackMode = "off" | "physical" | "magic";

const CYCLE_ORDER: CombatAttackMode[] = ["off", "physical", "magic"];

export function cycleCombatAttackMode(current: CombatAttackMode): CombatAttackMode {
  const idx = CYCLE_ORDER.indexOf(current);
  const next = idx < 0 ? 0 : (idx + 1) % CYCLE_ORDER.length;
  return CYCLE_ORDER[next];
}

export function parseCombatAttackMode(
  saved: unknown,
  legacyAutoAttack?: boolean,
): CombatAttackMode {
  if (saved === "off" || saved === "physical" || saved === "magic") return saved;
  if (legacyAutoAttack === false) return "off";
  return "physical";
}

export function combatAttackModeLabel(mode: CombatAttackMode): string {
  if (mode === "off") return "OFF";
  if (mode === "magic") return "MAG";
  return "ATK";
}

export function combatAttackModeTitle(mode: CombatAttackMode): string {
  if (mode === "off") return "Combate automático desligado";
  if (mode === "magic") return "Auto: skills da barra (buffs só sem buff ativo)";
  return "Auto: ataque físico";
}

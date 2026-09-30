import { describe, expect, it } from "vitest";
import { cycleCombatAttackMode, parseCombatAttackMode } from "./combat-attack-mode";

describe("combat-attack-mode", () => {
  it("cicla off → físico → mágico", () => {
    expect(cycleCombatAttackMode("off")).toBe("physical");
    expect(cycleCombatAttackMode("physical")).toBe("magic");
    expect(cycleCombatAttackMode("magic")).toBe("off");
  });

  it("migra save legado autoAttack", () => {
    expect(parseCombatAttackMode(undefined, true)).toBe("physical");
    expect(parseCombatAttackMode(undefined, false)).toBe("off");
    expect(parseCombatAttackMode("magic", true)).toBe("magic");
  });
});

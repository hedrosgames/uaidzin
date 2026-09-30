import { describe, expect, it } from "vitest";
import { cycleCombatMoveMode, parseCombatMoveMode } from "./combat-move-mode";

describe("combat-move-mode", () => {
  it("cicla off → fixo → livre", () => {
    expect(cycleCombatMoveMode("off")).toBe("anchor");
    expect(cycleCombatMoveMode("anchor")).toBe("hunt");
    expect(cycleCombatMoveMode("hunt")).toBe("off");
  });

  it("migra save legado autoMove", () => {
    expect(parseCombatMoveMode(undefined, false)).toBe("off");
    expect(parseCombatMoveMode(undefined, true)).toBe("hunt");
    expect(parseCombatMoveMode("anchor", true)).toBe("anchor");
  });
});

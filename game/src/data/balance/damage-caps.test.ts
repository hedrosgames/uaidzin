import { describe, expect, it } from "vitest";
import { DAMAGE_CAPS, capMagicAttack, capMaxHp, capPhysicalAttack } from "./damage-caps";

describe("damage-caps", () => {
  it("limita ataque físico e mágico", () => {
    expect(capPhysicalAttack(19999)).toBe(19999);
    expect(capPhysicalAttack(20000)).toBe(DAMAGE_CAPS.physicalAttack);
    expect(capPhysicalAttack(99999)).toBe(DAMAGE_CAPS.physicalAttack);
    expect(capMagicAttack(40000)).toBe(DAMAGE_CAPS.magicAttack);
    expect(capMagicAttack(50000)).toBe(DAMAGE_CAPS.magicAttack);
  });

  it("limita HP máximo do personagem", () => {
    expect(capMaxHp(59999)).toBe(59999);
    expect(capMaxHp(60000)).toBe(DAMAGE_CAPS.maxHp);
    expect(capMaxHp(120000)).toBe(DAMAGE_CAPS.maxHp);
    expect(capMaxHp(0)).toBe(1);
  });
});

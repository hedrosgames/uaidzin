import { describe, expect, it } from "vitest";
import { armorDamageMultiplier, calculateDamage, mitigatedDamage } from "./DamageCalculator";

describe("mitigação estilo LoL (100 / (100 + armadura))", () => {
  it("sem armadura passa o dano bruto", () => {
    expect(armorDamageMultiplier(0)).toBe(1);
    expect(calculateDamage(80, 0)).toBe(80);
  });

  it("100 de ataque vs 100 de defesa = 50 de dano", () => {
    expect(calculateDamage(100, 100)).toBe(50);
  });

  it("sempre no mínimo 1 quando há ataque positivo", () => {
    expect(calculateDamage(1, 500)).toBe(1);
    expect(calculateDamage(1, 10_000)).toBe(1);
  });

  it("armadura negativa aumenta dano recebido", () => {
    expect(armorDamageMultiplier(-100)).toBe(1.5);
    expect(mitigatedDamage(50, -100)).toBe(75);
  });
});

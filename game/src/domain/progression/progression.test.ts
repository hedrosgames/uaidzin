import { describe, expect, it } from "vitest";
import { PROGRESSION_BALANCE } from "../../data/balance/progression";
import { CharacterModel } from "../character/CharacterModel";
import { ProgressionService } from "./ProgressionService";

function atMaxLevel(attrs: { FOR: number; DES: number; CONS: number; INT: number }) {
  const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 0 });
  character.attributes = { ...attrs };
  const progression = new ProgressionService(character);
  progression.state.level = PROGRESSION_BALANCE.evolutions.Mortal.maxLevel;
  return { character, progression };
}

describe("addXp", () => {
  it("concede pontos de atributo por nível ganho", () => {
    const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 0 });
    const progression = new ProgressionService(character);
    const need =
      PROGRESSION_BALANCE.xpToLevel(1) + PROGRESSION_BALANCE.xpToLevel(2);
    const { levelsGained } = progression.addXp(need);
    expect(levelsGained).toBe(2);
    expect(progression.state.level).toBe(3);
    expect(progression.state.unspentAttributePoints).toBe(
      2 * PROGRESSION_BALANCE.attributesPerLevel,
    );
  });
});

describe("refundAllAttributes via reset", () => {
  const cases = [
    { attrs: { FOR: 5, DES: 5, CONS: 5, INT: 5 }, spent: 0 },
    { attrs: { FOR: 8, DES: 5, CONS: 6, INT: 5 }, spent: 4 },
    { attrs: { FOR: 400, DES: 300, CONS: 250, INT: 70 }, spent: 1000 },
  ];
  for (const { attrs, spent } of cases) {
    it(`devolve ${spent} pontos e volta para 5/5/5/5`, () => {
      const { character, progression } = atMaxLevel(attrs);
      expect(progression.reset()).toBe(true);
      expect(character.attributes).toEqual({ FOR: 5, DES: 5, CONS: 5, INT: 5 });
      expect(progression.state.unspentAttributePoints).toBe(spent + PROGRESSION_BALANCE.resetAttributePoints);
    });
  }
});

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

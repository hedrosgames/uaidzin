import { describe, expect, it } from "vitest";
import { calculateDamage } from "../combat/DamageCalculator";
import { CharacterModel } from "../character/CharacterModel";
import { EnemyService } from "../enemies/EnemyService";
import { findDungeon } from "../../data/dungeons/dungeons-mortal";
import { ProgressionService } from "./ProgressionService";

function playerAt(level: number) {
  const character = new CharacterModel({ maxHp: 100, attack: 10, defense: 0 });
  const progression = new ProgressionService(character);
  progression.state.level = level;
  const points = (level - 1) * 5;
  character.attributes.CONS += (level - 1) * 2;
  character.attributes.FOR += points - (level - 1) * 2;
  progression.recomputeCombatStats();
  return character;
}

function monster(spawnId: string) {
  const enemies = new EnemyService(() => 0.5);
  enemies.spawnFromDungeon(findDungeon("dungeon-1")!);
  return enemies.findById(spawnId)!;
}

function hits(hp: number, damage: number): number {
  return Math.ceil(hp / damage);
}

describe("balance D1 (TK sem equipamento, 2 CONS + 3 FOR por nível)", () => {
  const skeleton = monster("d1-a1-s1");
  const wolf = monster("d1-a2-w1");
  const fire = monster("d1-a3-g1");

  it("mata a caveira em até 3 golpes do nível 1 ao 10", () => {
    for (let level = 1; level <= 10; level++) {
      const p = playerAt(level);
      expect(hits(skeleton.maxHp, calculateDamage(p.attack, skeleton.defense))).toBeLessThanOrEqual(3);
    }
  });

  it("caveira mata o jogador nível 1 em 10 golpes", () => {
    const p = playerAt(1);
    expect(hits(p.maxHp, calculateDamage(skeleton.attack, p.defense))).toBe(10);
  });

  it("lobo mata o jogador nível 11 em 4 golpes", () => {
    const p = playerAt(11);
    expect(hits(p.maxHp, calculateDamage(wolf.attack, p.defense))).toBe(4);
  });

  it("caveira de fogo mata o jogador nível 21 em 4 golpes", () => {
    const p = playerAt(21);
    expect(hits(p.maxHp, calculateDamage(fire.attack, p.defense))).toBe(4);
  });

  it("lobo é mais forte que a caveira e a caveira de fogo mais forte que o lobo", () => {
    expect(wolf.maxHp).toBeGreaterThan(skeleton.maxHp);
    expect(wolf.attack).toBeGreaterThan(skeleton.attack);
    expect(fire.maxHp).toBeGreaterThan(wolf.maxHp);
    expect(fire.attack).toBeGreaterThan(wolf.attack);
  });

  it("defesa não sobe distribuindo em CONS", () => {
    expect(playerAt(40).defense).toBe(playerAt(1).defense);
  });
});

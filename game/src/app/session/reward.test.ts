import { describe, it, expect, vi } from "vitest";
import { RewardService } from "./RewardService";
import { ProgressionService } from "../../domain/progression/ProgressionService";
import { CharacterModel } from "../../domain/character/CharacterModel";
import { PROGRESSION_BALANCE } from "../../data/balance/progression";

function createRewardHarness(opts?: { globalKillXpMultiplier?: () => number }) {
  const character = new CharacterModel({
    maxHp: 100,
    attack: 10,
    defense: 5,
  });

  const progression = new ProgressionService(character);

  const state = {
    checkpoints: 0,
    dirtySections: [] as string[][],
    sessionXp: 0,
    dropLogs: [] as string[],
  };

  const skillTree = {
    grantSkillPoints: vi.fn(),
  } as never;

  const skillLoadout = {
    refresh: vi.fn(),
  } as never;

  const inventory = {
    addGold: vi.fn(),
    addItem: vi.fn(),
    countMaterial: vi.fn(),
  } as never;

  const composition = {} as never;

  const quests = {
    recordKill: vi.fn(() => ({ completedIds: [] })),
  } as never;

  const dungeonRun = {
    addKill: vi.fn(),
  } as never;

  const economy = {
    lootLevel: 1,
    grantKillLoot: vi.fn(() => ({ gold: 0 })),
  } as never;

  const saves = {
    markDirty: vi.fn((sections: string[]) => {
      state.dirtySections.push(sections);
    }),
    checkpoint: vi.fn(async () => {
      state.checkpoints += 1;
      return true;
    }),
  } as never;

  const effects = {
    levelUpPulse: vi.fn(),
    spawnDamageNumber: vi.fn(),
  } as never;

  const bus = {
    emit: vi.fn(),
  } as never;

  const player = { x: 0, z: 0 } as never;

  const rewards = new RewardService({
    progression,
    character,
    skillTree,
    skillLoadout,
    inventory,
    composition,
    quests,
    dungeonRun,
    economy,
    saves,
    effects,
    bus,
    player,
    playerMesh: () => null as never,
    getActiveDungeonId: () => "dungeon-test",
    pushDropLog: (text) => state.dropLogs.push(text),
    showToast: vi.fn(),
    addSessionXp: (amount) => {
      state.sessionXp += amount;
    },
    globalKillXpMultiplier: opts?.globalKillXpMultiplier,
  });

  return { rewards, progression, state };
}

describe("RewardService", () => {
  it("nivel maximo nao soma XP e mantem xp limitado", () => {
    const { rewards, progression } = createRewardHarness();
    const maxLevel = PROGRESSION_BALANCE.evolutions.Mortal.maxLevel;

    progression.state.level = maxLevel;
    progression.state.xp = 0;
    progression.state.xpToNext = PROGRESSION_BALANCE.xpToLevel(maxLevel);

    const enemy = {
      id: "dummy-1",
      archetype: "chaser",
      isBoss: false,
      xpReward: 500,
    };

    rewards.grantKillXp(enemy);

    expect(progression.state.level).toBe(maxLevel);
    expect(progression.state.xp).toBe(0);
    expect(progression.state.xp).toBeLessThanOrEqual(progression.state.xpToNext);
  });

  it("XP de kill vem do mob e não muda com o nível do jogador", () => {
    const { rewards, progression, state } = createRewardHarness();
    const enemy = { id: "sk1", archetype: "chaser", isBoss: false, xpReward: 10, monsterId: "caveira_campo" };

    progression.state.level = 1;
    rewards.grantKillXp(enemy);
    const xpLow = state.sessionXp;

    progression.state.level = 25;
    state.sessionXp = 0;
    rewards.grantKillXp(enemy);

    expect(xpLow).toBe(10);
    expect(state.sessionXp).toBe(10);
  });

  it("multiplicador global de XP escala o ganho sem mudar o valor do mob", () => {
    const enemy = { id: "sk2", archetype: "chaser", isBoss: false, xpReward: 10 };

    const base = createRewardHarness();
    base.rewards.grantKillXp(enemy);
    expect(base.state.sessionXp).toBe(10);

    const half = createRewardHarness({ globalKillXpMultiplier: () => 0.5 });
    half.rewards.grantKillXp(enemy);
    expect(half.state.sessionXp).toBe(5);

    const double = createRewardHarness({ globalKillXpMultiplier: () => 2 });
    double.rewards.grantKillXp(enemy);
    expect(double.state.sessionXp).toBe(20);

    const quad = createRewardHarness({ globalKillXpMultiplier: () => 4 });
    quad.rewards.grantKillXp(enemy);
    expect(quad.state.sessionXp).toBe(40);
  });

  it("AoE de 5 abates no mesmo frame gera exatamente 1 checkpoint", () => {
    const { rewards, state } = createRewardHarness();

    const enemies = [
      { id: "e1", archetype: "fixed", isBoss: false, xpReward: 10 },
      { id: "e2", archetype: "fixed", isBoss: false, xpReward: 10 },
      { id: "e3", archetype: "chaser", isBoss: false, xpReward: 15 },
      { id: "e4", archetype: "chaser", isBoss: false, xpReward: 15 },
      { id: "e5", archetype: "ranged", isBoss: false, xpReward: 20 },
    ];

    for (const enemy of enemies) {
      rewards.grantKillXp(enemy);
    }

    expect(state.checkpoints).toBe(0);

    rewards.flushFrameCheckpoint();

    expect(state.checkpoints).toBe(1);

    rewards.flushFrameCheckpoint();
    expect(state.checkpoints).toBe(1);
  });
});

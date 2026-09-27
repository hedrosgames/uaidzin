import { describe, it, expect, vi } from "vitest";
import { EnemyModel } from "../../domain/enemies/EnemyModel";
import { DOT_TICK_SEC } from "../../data/balance/combat";
import { RewardService } from "./RewardService";

function simulateDot(dur: number, dps: number, fps: number): { ticks: number[]; totalDamage: number } {
  const enemy = new EnemyModel({
    id: "test-enemy",
    archetype: "chaser",
    homeX: 0,
    homeZ: 0,
    x: 0,
    z: 0,
    maxHp: 1000,
    attack: 10,
    defense: 5,
    range: 2,
    attackInterval: 1.5,
    respawnSeconds: 5,
  });

  enemy.applySkillStatus({}, dps, dur, 0, 0);

  const dt = 1 / fps;
  const totalFrames = Math.ceil(dur / dt) + 5;
  const ticks: number[] = [];

  for (let f = 0; f < totalFrames; f++) {
    const dmg = enemy.tickStatus(dt);
    if (dmg > 0) {
      ticks.push(dmg);
    }
  }

  const totalDamage = ticks.reduce((acc, v) => acc + v, 0);
  return { ticks, totalDamage };
}

describe("Combat DoT", () => {
  it("DoT de 2, 3, 4 e 7 s resulta em total = dotDps * dotSec independente de FPS (30 e 144 FPS)", () => {
    const durations = [2, 3, 4, 7];
    const dps = 15;
    const framerates = [30, 60, 144];

    for (const dur of durations) {
      const expectedTotal = dps * dur;
      for (const fps of framerates) {
        const result = simulateDot(dur, dps, fps);
        expect(result.totalDamage).toBeCloseTo(expectedTotal, 3);

        const expectedFullTicks = Math.floor(dur / DOT_TICK_SEC);
        const hasRemainder = dur % DOT_TICK_SEC > 0;
        const expectedTickCount = expectedFullTicks + (hasRemainder ? 1 : 0);
        expect(result.ticks.length).toBe(expectedTickCount);
      }
    }
  });

  it("reaplicar renova duracao sem perder dano acumulado", () => {
    const enemy = new EnemyModel({
      id: "enemy-reapply",
      archetype: "chaser",
      homeX: 0,
      homeZ: 0,
      x: 0,
      z: 0,
      maxHp: 1000,
      attack: 10,
      defense: 5,
      range: 2,
      attackInterval: 1.5,
      respawnSeconds: 5,
    });

    const dps = 10;
    enemy.applySkillStatus({}, dps, 4, 0, 0);

    const dt = 0.5;
    let ticks: number[] = [];

    for (let i = 0; i < 3; i++) {
      const d = enemy.tickStatus(dt);
      if (d > 0) ticks.push(d);
    }

    expect(enemy.dotTimer).toBe(2.5);
    expect(enemy.dotTickAcc).toBe(1.5);
    expect(enemy.dotDamageAcc).toBe(15);
    expect(ticks.length).toBe(0);

    enemy.applySkillStatus({}, dps, 4, 0, 0);
    expect(enemy.dotTimer).toBe(4);
    expect(enemy.dotDamageAcc).toBe(15);
    expect(enemy.dotTickAcc).toBe(1.5);

    const remainingFrames = Math.ceil(4 / dt) + 5;
    for (let i = 0; i < remainingFrames; i++) {
      const d = enemy.tickStatus(dt);
      if (d > 0) ticks.push(d);
    }

    const totalDamage = ticks.reduce((acc, v) => acc + v, 0);
    expect(totalDamage).toBeCloseTo(10 * 1.5 + 10 * 4, 3);
  });

  it("morte por outro dano descarta o acumulado", () => {
    const enemy = new EnemyModel({
      id: "enemy-discard",
      archetype: "chaser",
      homeX: 0,
      homeZ: 0,
      x: 0,
      z: 0,
      maxHp: 50,
      attack: 10,
      defense: 5,
      range: 2,
      attackInterval: 1.5,
      respawnSeconds: 5,
    });

    enemy.applySkillStatus({}, 10, 4, 0, 0);
    enemy.tickStatus(1.0);
    expect(enemy.dotDamageAcc).toBe(10);

    enemy.applyDamage(100);
    expect(enemy.alive).toBe(false);
    expect(enemy.dotDamageAcc).toBe(0);
    expect(enemy.dotTimer).toBe(0);
  });

  it("abate pelo dano de expiracao concede XP e passa pelo RewardService", () => {
    let gainedXp = 0;
    let checkpoints = 0;

    const progression = {
      state: { level: 5, xp: 0, xpToNext: 100 },
      addXp: (amount: number) => {
        gainedXp += amount;
        return 0;
      },
    } as never;

    const character = { level: 5 } as never;
    const skillTree = { grantSkillPoints: vi.fn() } as never;
    const skillLoadout = { refresh: vi.fn() } as never;
    const inventory = { addGold: vi.fn(), addItem: vi.fn(), countMaterial: vi.fn() } as never;
    const composition = {} as never;
    const quests = { recordKill: vi.fn(() => ({ completedIds: [] })) } as never;
    const dungeonRun = { addKill: vi.fn() } as never;
    const economy = { lootLevel: 5, grantKillLoot: vi.fn(() => ({ gold: 0 })) } as never;
    const saves = {
      markDirty: vi.fn(),
      checkpoint: vi.fn(async () => {
        checkpoints += 1;
        return true;
      }),
    } as never;
    const effects = { levelUpPulse: vi.fn() } as never;
    const bus = { emit: vi.fn() } as never;
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
      pushDropLog: vi.fn(),
      showToast: vi.fn(),
      addSessionXp: vi.fn(),
    });

    const enemy = new EnemyModel({
      id: "enemy-xp",
      archetype: "chaser",
      homeX: 0,
      homeZ: 0,
      x: 0,
      z: 0,
      maxHp: 15,
      attack: 10,
      defense: 5,
      range: 2,
      attackInterval: 1.5,
      respawnSeconds: 5,
      xpReward: 25,
    });

    enemy.applySkillStatus({}, 10, 2, 0, 0);

    enemy.tickStatus(1.0);
    expect(enemy.alive).toBe(true);

    const finalDamage = enemy.tickStatus(1.0);
    expect(finalDamage).toBe(20);

    const killed = enemy.applyDamage(Math.round(finalDamage));
    expect(killed).toBe(true);
    expect(enemy.alive).toBe(false);

    rewards.grantKillXp(enemy);
    rewards.flushFrameCheckpoint();

    expect(gainedXp).toBe(25);
    expect(checkpoints).toBe(1);
  });
});

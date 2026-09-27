import { describe, it, expect, vi } from "vitest";
import { DungeonFlow } from "./DungeonFlow";
import type { DungeonFlowDeps } from "./DungeonFlow";
import type { DungeonDef } from "../../data/dungeons/dungeon-definitions";
import * as mortalDungeons from "../../data/dungeons/dungeons-mortal";

function createMockDeps(): { deps: DungeonFlowDeps; state: { currentWorld: string; itemsConsumed: Record<string, number>; dirtySections: string[]; checkpoints: number } } {
  const state = {
    currentWorld: "city",
    itemsConsumed: {} as Record<string, number>,
    dirtySections: [] as string[],
    checkpoints: 0,
  };

  const inventory = {
    countMaterial: (id: string) => (id === "key-1" ? 5 : 0),
    consumeMaterial: (id: string, count: number) => {
      state.itemsConsumed[id] = (state.itemsConsumed[id] || 0) + count;
      return true;
    },
  } as unknown as DungeonFlowDeps["inventory"];

  const progression = {
    state: { evolution: "Mortal", level: 10 },
  } as unknown as DungeonFlowDeps["progression"];

  const character = {
    level: 10,
    isDead: false,
    maxHp: 100,
    healFull: vi.fn(),
  } as unknown as DungeonFlowDeps["character"];

  const dungeonRun = {
    start: vi.fn(),
    end: vi.fn(() => ({ dungeonId: "dungeon-test", reason: "death", kills: 0, xpGained: 0 })),
  } as unknown as DungeonFlowDeps["dungeonRun"];

  const economy = {
    setDungeonIndexFromId: vi.fn(),
  } as unknown as DungeonFlowDeps["economy"];

  const saves = {
    markDirty: vi.fn((sec: string) => state.dirtySections.push(sec)),
    checkpoint: vi.fn(async () => {
      state.checkpoints += 1;
      return true;
    }),
  } as unknown as DungeonFlowDeps["saves"];

  const effects = {
    clearSkillVfx: vi.fn(),
    hideAllHpBars: vi.fn(),
  } as unknown as DungeonFlowDeps["effects"];

  const renderer = {
    playerView: { clearDeath: vi.fn() },
  } as unknown as DungeonFlowDeps["renderer"];

  const enemies = {
    clear: vi.fn(),
  } as unknown as DungeonFlowDeps["enemies"];

  const bus = {
    emit: vi.fn(),
  } as unknown as DungeonFlowDeps["bus"];

  const deps: DungeonFlowDeps = {
    inventory,
    progression,
    character,
    dungeonRun,
    economy,
    saves,
    effects,
    renderer,
    enemies,
    bus,
    enterWorld: vi.fn((id: string) => {
      state.currentWorld = id;
    }),
    getWorldId: () => state.currentWorld as never,
    clearDeathReturnTimer: vi.fn(),
    clearResultHold: vi.fn(),
  };

  return { deps, state };
}

describe("DungeonFlow", () => {
  it("quando enterWorld lanca erro: consome item, faz checkpoint critico, fade termina e permanece em modo CITY", async () => {
    const { deps, state } = createMockDeps();
    const customDef: DungeonDef = {
      id: "dungeon-fail",
      name: "Fail Dungeon",
      minLevel: 1,
      maxLevel: 20,
      entryItemId: "key-1",
      durationSeconds: 300,
      arenas: [],
    };
    vi.spyOn(mortalDungeons, "findDungeon").mockReturnValue(customDef);

    let fadeRunning = false;
    const fade = {
      fadeIn: vi.fn(async () => {
        fadeRunning = true;
      }),
      fadeOut: vi.fn(async () => {
        fadeRunning = false;
      }),
    };
    deps.ensureSceneFade = () => fade as never;

    deps.enterWorld = vi.fn((id: string) => {
      if (id !== "city") {
        throw new Error("Falha intencional de carregamento");
      }
      state.currentWorld = id;
    });

    const flow = new DungeonFlow(deps);
    const result = flow.tryEnterDungeon("dungeon-fail");

    expect(result.ok).toBe(true);
    expect(state.itemsConsumed["key-1"]).toBe(1);
    expect(state.dirtySections).toContain("inventory");
    expect(state.checkpoints).toBe(1);

    await new Promise((r) => setTimeout(r, 20));

    expect(flow.worldFadeBusy).toBe(false);
    expect(fadeRunning).toBe(false);
    expect(state.currentWorld).toBe("city");
  });

  it("entrada durante fade devolve busy sem consumir item", async () => {
    const { deps, state } = createMockDeps();
    const customDef: DungeonDef = {
      id: "dungeon-busy",
      name: "Busy Dungeon",
      minLevel: 1,
      maxLevel: 20,
      entryItemId: "key-1",
      durationSeconds: 300,
      arenas: [],
    };
    vi.spyOn(mortalDungeons, "findDungeon").mockReturnValue(customDef);

    let finishFade: () => void = () => {};
    const fadePromise = new Promise<void>((r) => {
      finishFade = r;
    });

    const fade = {
      fadeIn: vi.fn(async () => {
        await fadePromise;
      }),
      fadeOut: vi.fn(async () => {}),
    };
    deps.ensureSceneFade = () => fade as never;

    const flow = new DungeonFlow(deps);
    const first = flow.tryEnterDungeon("dungeon-busy");
    expect(first.ok).toBe(true);
    expect(flow.worldFadeBusy).toBe(true);

    const second = flow.tryEnterDungeon("dungeon-busy");
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("busy");
    }
    expect(state.itemsConsumed["key-1"]).toBe(1);

    finishFade();
    await new Promise((r) => setTimeout(r, 20));
    expect(flow.worldFadeBusy).toBe(false);
  });

  it("morte durante fade de entrada sai para a cidade ao fim do fade", async () => {
    const { deps, state } = createMockDeps();
    const customDef: DungeonDef = {
      id: "dungeon-2",
      name: "Dungeon 2",
      minLevel: 1,
      maxLevel: 20,
      entryItemId: null,
      durationSeconds: 300,
      arenas: [],
    };
    vi.spyOn(mortalDungeons, "findDungeon").mockReturnValue(customDef);

    let triggerDeathDuringFade: () => void = () => {};
    const fade = {
      fadeIn: vi.fn(async () => {
        triggerDeathDuringFade();
      }),
      fadeOut: vi.fn(async () => {}),
    };
    deps.ensureSceneFade = () => fade as never;

    const flow = new DungeonFlow(deps);
    triggerDeathDuringFade = () => {
      flow.finishDungeon("death");
      expect(flow.pendingLeaveReason).toBe("death");
    };

    flow.tryEnterDungeon("dungeon-2");
    await new Promise((r) => setTimeout(r, 40));

    expect(flow.worldFadeBusy).toBe(false);
    expect(flow.pendingLeaveReason).toBeNull();
    expect(state.currentWorld).toBe("city");
  });
});

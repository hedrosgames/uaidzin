import { describe, expect, it } from "vitest";
import { EventBus } from "./EventBus";
import { ErrorReporter } from "../errors/ErrorReporter";

describe("EventBus e ErrorReporter no tick", () => {
  it("handler que lanca erro nao impede os demais", () => {
    const errors = new ErrorReporter();
    const bus = new EventBus(errors);

    let secondCalled = false;

    bus.on("character:level-up", () => {
      throw new Error("falha proposital no handler 1");
    });

    bus.on("character:level-up", () => {
      secondCalled = true;
    });

    bus.emit("character:level-up", { level: 2, levelsGained: 1 });

    expect(secondCalled).toBe(true);
    expect(errors.getStats().total).toBe(1);
    expect(errors.getStats().lastError).toContain("falha proposital no handler 1");
  });

  it("5 frames seguidos com erro disparam retorno da dungeon e limpam contador", () => {
    const errors = new ErrorReporter();
    let currentMode = "DUNGEON";
    let checkpointCalled = false;
    let returnToCityCalled = false;

    const simulateTick = () => {
      errors.beginFrame();
      try {
        errors.report(new Error("erro na dungeon"), "tick");
      } finally {
        const consecutive = errors.endFrame();
        if (consecutive >= 5) {
          if (currentMode !== "CITY") {
            checkpointCalled = true;
            returnToCityCalled = true;
            currentMode = "CITY";
            errors.resetConsecutive();
          }
        }
      }
    };

    for (let frame = 1; frame <= 4; frame++) {
      simulateTick();
      expect(checkpointCalled).toBe(false);
      expect(returnToCityCalled).toBe(false);
      expect(errors.getConsecutiveErrorFrames()).toBe(frame);
    }

    simulateTick();
    expect(checkpointCalled).toBe(true);
    expect(returnToCityCalled).toBe(true);
    expect(currentMode).toBe("CITY");
    expect(errors.getConsecutiveErrorFrames()).toBe(0);
  });

  it("mais 5 frames seguidos com erro na cidade param o loop", () => {
    const errors = new ErrorReporter();
    const currentMode = "CITY";
    let loopStopped = false;
    let fatalOverlayShown = false;

    const simulateTick = () => {
      errors.beginFrame();
      try {
        errors.report(new Error("erro na cidade"), "tick");
      } finally {
        const consecutive = errors.endFrame();
        if (consecutive >= 5) {
          if (currentMode === "CITY") {
            loopStopped = true;
            fatalOverlayShown = true;
          }
        }
      }
    };

    for (let frame = 1; frame <= 4; frame++) {
      simulateTick();
      expect(loopStopped).toBe(false);
      expect(fatalOverlayShown).toBe(false);
    }

    simulateTick();
    expect(loopStopped).toBe(true);
    expect(fatalOverlayShown).toBe(true);
  });

  it("frame sem erro reseta a contagem de frames consecutivos", () => {
    const errors = new ErrorReporter();

    for (let i = 0; i < 4; i++) {
      errors.beginFrame();
      errors.report(new Error("erro transitório"), "tick");
      errors.endFrame();
    }
    expect(errors.getConsecutiveErrorFrames()).toBe(4);

    errors.beginFrame();
    const consecutive = errors.endFrame();
    expect(consecutive).toBe(0);
    expect(errors.getConsecutiveErrorFrames()).toBe(0);
  });
});

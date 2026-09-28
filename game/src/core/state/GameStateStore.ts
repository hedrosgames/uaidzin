import type { GameMode } from "./GameMode";
import type { GameState } from "./GameState";
import type { ErrorReporter } from "../errors/ErrorReporter";

export class GameStateStore {
  private state: GameState = {
    mode: "BOOT",
    debugHudVisible: false,
  };

  private readonly listeners = new Set<(state: GameState) => void>();

  constructor(private readonly errors?: ErrorReporter) {}

  getState(): Readonly<GameState> {
    return this.state;
  }

  getMode(): GameMode {
    return this.state.mode;
  }

  setMode(mode: GameMode): void {
    if (this.state.mode === mode) return;
    this.state = { ...this.state, mode };
    this.notify();
  }

  setDebugHudVisible(visible: boolean): void {
    if (this.state.debugHudVisible === visible) return;
    this.state = { ...this.state, debugHudVisible: visible };
    this.notify();
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        this.errors?.report(err, "GameStateStore.notify");
      }
    }
  }
}

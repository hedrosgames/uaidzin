import type { GameMode } from "./GameMode";
import type { GameState } from "./GameState";

export class GameStateStore {
  private state: GameState = {
    mode: "BOOT",
    debugHudVisible: false,
  };

  private readonly listeners = new Set<(state: GameState) => void>();

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
      listener(this.state);
    }
  }
}

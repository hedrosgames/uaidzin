import type { GameMode } from "./GameMode";

export interface GameState {
  mode: GameMode;
  debugHudVisible: boolean;
}

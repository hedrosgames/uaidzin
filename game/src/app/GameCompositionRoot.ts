import { GameApp } from "./GameApp";

export function createGameApp(deps: ConstructorParameters<typeof GameApp>[0]): GameApp {
  return new GameApp(deps);
}

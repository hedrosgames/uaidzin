import type { GameEventHandler, GameEventMap, GameEventName } from "./GameEventMap";

export class EventBus {
  private readonly handlers = new Map<GameEventName, Set<GameEventHandler<GameEventName>>>();

  on<K extends GameEventName>(name: K, handler: GameEventHandler<K>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as GameEventHandler<GameEventName>);
    return () => this.off(name, handler);
  }

  off<K extends GameEventName>(name: K, handler: GameEventHandler<K>): void {
    this.handlers.get(name)?.delete(handler as GameEventHandler<GameEventName>);
  }

  emit<K extends GameEventName>(name: K, payload: GameEventMap[K]): void {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const handler of set) {
      (handler as GameEventHandler<K>)(payload);
    }
  }
}

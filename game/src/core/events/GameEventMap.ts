export type GameEventMap = {
  "game:ready": { at: number };
  "game:state-changed": { mode: string };
  "game:error": { message: string; stack?: string };
  "world:changed": { worldId: string };
  "player:moved": { x: number; z: number; moving: boolean };
  "player:near-interactable": { id: string | null; label: string | null; kind: string | null };
  "interaction:opened": { id: string; label: string; body: string };
  "interaction:closed": { id: string | null };
  "combat:hit": { targetId: string; damage: number; killed: boolean };
  "combat:damage": { amount: number; hp: number };
  "combat:miss": { targetId: string };
  "skill:used": { skillId: string; targetId: string };
  "character:death": { at: number };
  "character:level-up": { level: number; levelsGained: number };
  "progression:reset": { evolution: string; ok: boolean };
  "ui:open-panel": { panel: string; title?: string; shopId?: string };
  "dungeon:entered": { dungeonId: string };
  "dungeon:timer-updated": { remaining: number };
  "dungeon:completed": {
    dungeonId: string;
    reason: string;
    kills: number;
    xp: number;
  };
};

export type GameEventName = keyof GameEventMap;

export type GameEventHandler<K extends GameEventName> = (payload: GameEventMap[K]) => void;

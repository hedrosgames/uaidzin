export type InputAction =
  | "move.up"
  | "move.down"
  | "move.left"
  | "move.right"
  | "interact"
  | "skill.0"
  | "skill.1"
  | "skill.2"
  | "skill.3"
  | "skill.4"
  | "skill.5"
  | "skill.6"
  | "skill.7"
  | "skill.8"
  | "skill.9"
  | "ui.escape"
  | "panel.person"
  | "panel.skills"
  | "panel.inv"
  | "panel.vault"
  | "debug.toggle"
  | "debug.addLevel"
  | "debug.spendAll"
  | "debug.evolve"
  | "debug.timer";

const BASE_KEY_MAP: Record<string, InputAction> = {
  KeyW: "move.up",
  ArrowUp: "move.up",
  KeyS: "move.down",
  ArrowDown: "move.down",
  KeyA: "move.left",
  ArrowLeft: "move.left",
  KeyD: "move.right",
  ArrowRight: "move.right",
  KeyE: "interact",
  Digit1: "skill.0",
  Numpad1: "skill.0",
  Digit2: "skill.1",
  Numpad2: "skill.1",
  Digit3: "skill.2",
  Numpad3: "skill.2",
  Digit4: "skill.3",
  Numpad4: "skill.3",
  Digit5: "skill.4",
  Numpad5: "skill.4",
  Digit6: "skill.5",
  Numpad6: "skill.5",
  Digit7: "skill.6",
  Numpad7: "skill.6",
  Digit8: "skill.7",
  Numpad8: "skill.7",
  Digit9: "skill.8",
  Numpad9: "skill.8",
  Digit0: "skill.9",
  Numpad0: "skill.9",
  Escape: "ui.escape",
  KeyC: "panel.person",
  KeyK: "panel.skills",
  KeyI: "panel.inv",
  KeyB: "panel.vault",
};

const DEV_KEY_MAP: Record<string, InputAction> = {
  F1: "debug.toggle",
  F2: "debug.addLevel",
  F3: "debug.spendAll",
  F6: "debug.evolve",
  F9: "debug.timer",
};

export function isTypingElement(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function normalizeWheelZoom(
  event: { deltaY: number; deltaMode?: number; ctrlKey?: boolean; metaKey?: boolean },
  canvasHeight = 600,
): number {
  if (event.ctrlKey || event.metaKey) return 0;
  if (event.deltaY === 0) return 0;
  const mode = event.deltaMode ?? 0;
  const pixels = mode === 1 ? event.deltaY * 16 : mode === 2 ? event.deltaY * canvasHeight : event.deltaY;
  const raw = (pixels / 48) * 0.05;
  return Math.max(-0.2, Math.min(0.2, raw));
}

export class InputService {
  private mode = "BOOT";
  private uiOpen = false;
  private readonly downCodes = new Set<string>();
  private readonly pendingActions = new Set<InputAction>();
  private readonly actionListeners = new Map<InputAction, Set<() => void>>();
  private readonly target: EventTarget | null;

  private readonly onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.repeat) return;
    if (e.code === "F5" || e.key === "F5") return;

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const typing = isTypingElement(e.target);
    if (typing) {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        this.triggerAction("ui.escape");
      }
      return;
    }

    const action = this.resolveAction(e.code, e.key);
    if (!action) return;

    if (!this.canTriggerAction(action)) return;

    e.preventDefault();
    this.downCodes.add(e.code);
    this.pendingActions.add(action);
    this.triggerAction(action);
  };

  private readonly onKeyUp = (event: Event): void => {
    const e = event as KeyboardEvent;
    this.downCodes.delete(e.code);
  };

  private readonly onBlur = (): void => {
    this.resetKeys();
  };

  private readonly onVisibilityChange = (): void => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      this.resetKeys();
    }
  };

  constructor(target: EventTarget | null = typeof window !== "undefined" ? window : null) {
    this.target = target;
    if (this.target) {
      this.target.addEventListener("keydown", this.onKeyDown);
      this.target.addEventListener("keyup", this.onKeyUp);
      this.target.addEventListener("blur", this.onBlur);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
  }

  setMode(mode: string): void {
    this.mode = mode;
  }

  getMode(): string {
    return this.mode;
  }

  setUiOpen(open: boolean): void {
    this.uiOpen = open;
  }

  isUiOpen(): boolean {
    return this.uiOpen;
  }

  isActionDown(action: InputAction): boolean {
    if (this.uiOpen && action.startsWith("move.")) return false;
    for (const code of this.downCodes) {
      if (this.resolveAction(code) === action) return true;
    }
    return false;
  }

  consumeAction(action: InputAction): boolean {
    if (this.pendingActions.has(action)) {
      this.pendingActions.delete(action);
      return true;
    }
    return false;
  }

  consumeSkillSlot(): number {
    for (let i = 0; i < 10; i++) {
      const act = `skill.${i}` as InputAction;
      if (this.consumeAction(act)) return i;
    }
    return -1;
  }

  registerAction(action: InputAction, listener: () => void): () => void {
    let set = this.actionListeners.get(action);
    if (!set) {
      set = new Set();
      this.actionListeners.set(action, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  triggerAction(action: InputAction): void {
    const listeners = this.actionListeners.get(action);
    if (listeners) {
      for (const listener of listeners) listener();
    }
  }

  resetKeys(): void {
    this.downCodes.clear();
    this.pendingActions.clear();
  }

  dispose(): void {
    if (this.target) {
      this.target.removeEventListener("keydown", this.onKeyDown);
      this.target.removeEventListener("keyup", this.onKeyUp);
      this.target.removeEventListener("blur", this.onBlur);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
    this.resetKeys();
    this.actionListeners.clear();
  }

  private resolveAction(code: string, key?: string): InputAction | null {
    if (code === "Escape" || key === "Escape") return "ui.escape";
    const base = BASE_KEY_MAP[code];
    if (base) return base;
    if (import.meta.env.DEV) {
      const dev = DEV_KEY_MAP[code] || (key ? DEV_KEY_MAP[key] : undefined);
      if (dev) return dev;
    }
    return null;
  }

  private canTriggerAction(action: InputAction): boolean {
    if (action === "ui.escape") return true;

    if (action === "interact") {
      return !this.uiOpen && (this.mode === "CITY" || this.mode === "DUNGEON");
    }

    if (action.startsWith("skill.")) {
      return !this.uiOpen && (this.mode === "CITY" || this.mode === "DUNGEON");
    }

    if (action === "panel.vault") {
      return this.mode === "CITY";
    }

    if (action === "panel.person" || action === "panel.skills" || action === "panel.inv") {
      return this.mode === "CITY" || this.mode === "DUNGEON";
    }

    if (action.startsWith("move.")) {
      return !this.uiOpen;
    }

    if (action.startsWith("debug.")) {
      return Boolean(import.meta.env.DEV);
    }

    return true;
  }
}

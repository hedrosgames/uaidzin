
export class PlayerController {
  private readonly keys = new Set<string>();
  private pointerNdc = { x: 0, y: 0 };
  private wantsClickMove = false;
  private lastSkillDown = false;
  private lastSkill2Down = false;
  private lastSkill3Down = false;
  private lastSkill4Down = false;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };
  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };
  private readonly onBlur = (): void => {
    this.keys.clear();
  };
  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest("[data-ui-block-click]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.pointerNdc = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
    this.wantsClickMove = true;
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  getMoveAxes(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) z -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) z += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    return { x, z };
  }

  consumeClickMove(): { ndcX: number; ndcY: number } | null {
    if (!this.wantsClickMove) return null;
    this.wantsClickMove = false;
    return { ndcX: this.pointerNdc.x, ndcY: this.pointerNdc.y };
  }

  isInteractPressed(): boolean {
    return this.keys.has("KeyE");
  }

  
  consumeSkillPressed(): boolean {
    const down = this.keys.has("Digit1") || this.keys.has("Numpad1");
    const pressed = down && !this.lastSkillDown;
    this.lastSkillDown = down;
    return pressed;
  }

  consumeSkill2Pressed(): boolean {
    const down = this.keys.has("Digit2") || this.keys.has("Numpad2");
    const pressed = down && !this.lastSkill2Down;
    this.lastSkill2Down = down;
    return pressed;
  }

  consumeSkill3Pressed(): boolean {
    const down = this.keys.has("Digit3") || this.keys.has("Numpad3");
    const pressed = down && !this.lastSkill3Down;
    this.lastSkill3Down = down;
    return pressed;
  }

  consumeSkill4Pressed(): boolean {
    const down = this.keys.has("Digit4") || this.keys.has("Numpad4");
    const pressed = down && !this.lastSkill4Down;
    this.lastSkill4Down = down;
    return pressed;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
  }
}

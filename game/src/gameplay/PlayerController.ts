import type { InputService } from "./InputService";

export class PlayerController {
  private pointerNdc = { x: 0, y: 0 };
  private wantsClickMove = false;

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

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly input: InputService,
  ) {
    canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  getMoveAxes(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    if (this.input.isActionDown("move.up")) z -= 1;
    if (this.input.isActionDown("move.down")) z += 1;
    if (this.input.isActionDown("move.left")) x -= 1;
    if (this.input.isActionDown("move.right")) x += 1;
    return { x, z };
  }

  consumeClickMove(): { ndcX: number; ndcY: number } | null {
    if (!this.wantsClickMove) return null;
    this.wantsClickMove = false;
    return { ndcX: this.pointerNdc.x, ndcY: this.pointerNdc.y };
  }

  isInteractPressed(): boolean {
    return this.input.consumeAction("interact");
  }

  consumeSkillPressed(slot = 0): boolean {
    return this.input.consumeAction(`skill.${slot}` as import("./InputService").InputAction);
  }

  consumeSkillSlot(): number {
    return this.input.consumeSkillSlot();
  }

  dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
  }
}

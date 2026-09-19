export type TickHandler = (deltaSeconds: number) => void;

export class GameLoop {
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  constructor(
    private readonly onTick: TickHandler,
    private readonly maxDelta = 0.1,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const frame = (now: number): void => {
      if (!this.running) return;
      const raw = (now - this.lastTime) / 1000;
      const delta = Math.min(Math.max(raw, 0), this.maxDelta);
      this.lastTime = now;
      this.onTick(delta);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}

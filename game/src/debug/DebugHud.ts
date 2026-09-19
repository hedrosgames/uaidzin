export class DebugHud {
  private frames = 0;
  private fps = 0;
  private lastSample = performance.now();

  constructor(private readonly element: HTMLElement) {}

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  update(info: { mode: string; elapsed: number; extra?: string }): void {
    const now = performance.now();
    this.frames += 1;
    if (now - this.lastSample >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastSample));
      this.frames = 0;
      this.lastSample = now;
    }

    const lines = [
      `UAIDZIN · greybox`,
      `mode: ${info.mode}`,
      `fps: ${this.fps}`,
      `t: ${info.elapsed.toFixed(1)}s`,
    ];
    if (info.extra) lines.push(info.extra);
    lines.push(`F1: toggle hud`);
    this.element.textContent = lines.join("\n");
  }
}

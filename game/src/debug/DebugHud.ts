import type { ErrorStats } from "../core/errors/ErrorReporter";

export interface DebugPerf {
  draws: number;
  triangles: number;
  programs: number;
  lights: number;
  particles: number;
  quality: string;
}

export class DebugHud {
  private frames = 0;
  private fps = 0;
  private lastSample = performance.now();
  private lastFrame = performance.now();
  private readonly frameTimes: number[] = [];
  private readonly textContainer: HTMLElement;
  private readonly resetBtn: HTMLButtonElement | null = null;

  constructor(
    private readonly element: HTMLElement,
    onReset?: () => void,
  ) {
    this.element.replaceChildren();
    this.textContainer = document.createElement("div");
    this.element.appendChild(this.textContainer);

    if (import.meta.env.DEV && onReset) {
      this.resetBtn = document.createElement("button");
      this.resetBtn.type = "button";
      this.resetBtn.className = "btn-debug-reset";
      this.resetBtn.textContent = "Reset de debug";
      this.resetBtn.style.cssText =
        "margin-top:6px;padding:4px 8px;font-size:11px;background:#a33b3b;color:#f0e6d0;border:1px solid #d4a017;cursor:pointer;";
      this.resetBtn.addEventListener("click", () => onReset());
      this.element.appendChild(this.resetBtn);
    }
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  update(info: {
    mode: string;
    elapsed: number;
    extra?: string;
    errorStats?: ErrorStats;
    perf?: DebugPerf;
  }): void {
    if (!import.meta.env.DEV || this.element.hidden) return;

    const now = performance.now();
    this.frameTimes.push(now - this.lastFrame);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    this.lastFrame = now;
    this.frames += 1;
    if (now - this.lastSample >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastSample));
      this.frames = 0;
      this.lastSample = now;
    }
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;

    const lines = [
      "UAIDZIN · greybox",
      `mode: ${info.mode}`,
      `fps: ${this.fps}  p95: ${p95.toFixed(1)}ms`,
      `t: ${info.elapsed.toFixed(1)}s`,
    ];
    if (info.perf) {
      lines.push(`q: ${info.perf.quality}`);
      lines.push(`draw: ${info.perf.draws}  tri: ${info.perf.triangles}`);
      lines.push(`prog: ${info.perf.programs}  luz: ${info.perf.lights}  part: ${info.perf.particles}`);
    }
    if (info.extra) lines.push(info.extra);
    if (info.errorStats && (info.errorStats.consecutive > 0 || info.errorStats.total > 0)) {
      lines.push(`erros: ${info.errorStats.consecutive} consec (${info.errorStats.total} total)`);
    }
    lines.push("F1: toggle hud");
    this.textContainer.textContent = lines.join("\n");
  }
}

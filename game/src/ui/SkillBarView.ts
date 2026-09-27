import type { HudSkillSlot } from "./HudModel";

export class SkillBarView {
  private cachedWireHud: HTMLElement | null = null;
  private cachedRings: HTMLElement[] = [];
  private readonly wireSlotCache: Array<{ ready: boolean; pct: number }> = [];

  constructor(_onSlotClick?: (slot: number) => void) {}

  update(skills: HudSkillSlot[], _wireActive?: boolean): void {
    this.updateWireHud(skills);
  }

  private updateWireHud(skills: HudSkillSlot[]): void {
    if (!this.cachedWireHud || !this.cachedWireHud.isConnected) {
      this.cachedWireHud = document.getElementById("skillHud");
      if (this.cachedWireHud) {
        this.cachedRings = Array.from(this.cachedWireHud.querySelectorAll<HTMLElement>(".slot-ring"));
      } else {
        this.cachedRings = [];
      }
    }
    const rings = this.cachedRings;
    const len = rings.length;
    for (let i = 0; i < len; i++) {
      const ring = rings[i]!;
      const idx = Number(ring.dataset.bar);
      if (!Number.isFinite(idx)) continue;
      const s = skills[idx];
      let cache = this.wireSlotCache[idx];
      if (!cache) {
        cache = { ready: false, pct: -1 };
        this.wireSlotCache[idx] = cache;
      }
      if (!s) {
        if (cache.pct !== 0 || cache.ready) {
          cache.pct = 0;
          cache.ready = false;
          ring.classList.remove("full");
          ring.classList.remove("half");
          ring.style.background = "";
        }
        continue;
      }
      const pct = Math.max(0, Math.min(100, Math.round((1 - s.cdRatio) * 100)));
      if (cache.ready !== s.ready || cache.pct !== pct) {
        cache.ready = s.ready;
        cache.pct = pct;
        ring.classList.toggle("full", s.ready);
        ring.classList.remove("half");
        if (s.ready) {
          ring.style.background = "";
        } else {
          ring.style.background = `conic-gradient(var(--frost) 0 ${pct}%, var(--bg0) ${pct}%)`;
        }
      }
    }
  }
}

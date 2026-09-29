import type { HudModel, HudSkillSlot } from "./HudModel";

export class SkillBarView {
  private cachedWireHud: HTMLElement | null = null;
  private cachedRings: HTMLElement[] = [];
  private cachedPots: HTMLElement[] = [];
  private cachedAutos: HTMLElement[] = [];
  private readonly wireSlotCache: Array<{
    ready: boolean;
    pct: number;
    sec: string;
    auto: boolean;
    empty: boolean;
  }> = [];
  private readonly potCache: Array<{ defId: string; stack: number }> = [];
  private autoCache = { attack: false, move: false, potion: false };

  constructor(_onSlotClick?: (slot: number) => void) {}

  update(skills: HudSkillSlot[], _wireActive?: boolean, model?: HudModel): void {
    this.updateWireHud(skills, model);
  }

  private refreshCache(): void {
    const hudAlive = this.cachedWireHud?.isConnected;
    const ringsAlive = this.cachedRings[0]?.isConnected;
    if (!hudAlive || !ringsAlive) {
      this.cachedWireHud = document.getElementById("skillHud");
      if (this.cachedWireHud) {
        this.cachedRings = Array.from(this.cachedWireHud.querySelectorAll<HTMLElement>(".slot-ring"));
        this.cachedPots = Array.from(this.cachedWireHud.querySelectorAll<HTMLElement>(".pot-slot"));
        this.cachedAutos = Array.from(this.cachedWireHud.querySelectorAll<HTMLElement>("[data-auto]"));
      } else {
        this.cachedRings = [];
        this.cachedPots = [];
        this.cachedAutos = [];
      }
      this.potCache.length = 0;
      this.autoCache = { attack: false, move: false, potion: false };
      this.wireSlotCache.length = 0;
    }
  }

  private updateWireHud(skills: HudSkillSlot[], model?: HudModel): void {
    this.refreshCache();
    const rings = this.cachedRings;
    const len = rings.length;
    for (let i = 0; i < len; i++) {
      const ring = rings[i]!;
      const idx = Number(ring.dataset.bar);
      if (!Number.isFinite(idx)) continue;
      const s = skills[idx];
      let cache = this.wireSlotCache[idx];
      if (!cache) {
        cache = { ready: false, pct: -1, sec: "", auto: false, empty: true };
        this.wireSlotCache[idx] = cache;
      }
      const cdEl = ring.querySelector<HTMLElement>(".slot-cd");
      const secEl = ring.querySelector<HTMLElement>(".slot-cd-sec");
      if (!s || !s.name) {
        if (!cache.empty || cache.pct !== 0 || cache.ready || cache.sec !== "") {
          cache.empty = true;
          cache.pct = 0;
          cache.ready = false;
          cache.auto = false;
          cache.sec = "";
          ring.classList.remove("full", "half", "has-skill", "on-cd");
          if (cdEl) {
            cdEl.style.background = "";
            cdEl.hidden = true;
          }
          if (secEl) {
            secEl.textContent = "";
            secEl.hidden = true;
          }
        }
        continue;
      }
      if (cache.empty) {
        cache.empty = false;
        ring.classList.add("has-skill");
      }
      const isAuto = Boolean(s.auto);
      if (cache.auto !== isAuto) {
        cache.auto = isAuto;
        const chk = ring.querySelector<HTMLInputElement>("input[type='checkbox']");
        if (chk && chk.checked !== isAuto) {
          chk.checked = isAuto;
        }
      }
      const pct = Math.max(0, Math.min(100, Math.round(s.cdRatio * 100)));
      const sec = !s.ready && s.cdLeft > 0 ? s.cdLeft.toFixed(1) : "";
      if (cache.ready !== s.ready || cache.pct !== pct || cache.sec !== sec) {
        cache.ready = s.ready;
        cache.pct = pct;
        cache.sec = sec;
        ring.classList.toggle("full", s.ready);
        ring.classList.toggle("on-cd", !s.ready);
        ring.classList.remove("half");
        if (cdEl) {
          if (s.ready) {
            cdEl.style.background = "";
            cdEl.hidden = true;
          } else {
            cdEl.hidden = false;
            cdEl.style.background = `conic-gradient(from -90deg, rgba(8,6,4,.82) 0 ${pct}%, transparent ${pct}% 100%)`;
          }
        }
        if (secEl) {
          if (sec) {
            secEl.hidden = false;
            secEl.textContent = sec;
          } else {
            secEl.textContent = "";
            secEl.hidden = true;
          }
        }
      }
    }

    if (!model) return;
    const pots = model.potionSlots || [];
    for (let i = 0; i < this.cachedPots.length; i++) {
      const el = this.cachedPots[i]!;
      const slot = pots[i] ?? null;
      const defId = slot?.defId ?? "";
      const stack = slot?.stack ?? 0;
      let cache = this.potCache[i];
      if (!cache) {
        cache = { defId: "", stack: -1 };
        this.potCache[i] = cache;
      }
      if (cache.defId === defId && cache.stack === stack) continue;
      cache.defId = defId;
      cache.stack = stack;
      el.classList.toggle("has-item", !!defId && stack > 0);
      el.classList.toggle("is-empty-stack", !!defId && stack <= 0);
      const img = el.querySelector("img");
      const stackEl = el.querySelector<HTMLElement>(".pot-stack");
      if (slot && slot.icon) {
        if (img) {
          img.src = slot.icon;
          img.alt = slot.name;
          img.hidden = false;
        }
        el.title = slot.name;
      } else if (img) {
        img.hidden = true;
        el.title = "Poção (arraste do inventário)";
      }
      if (stackEl) {
        stackEl.textContent = stack > 0 ? String(stack) : "";
        stackEl.hidden = stack <= 0;
      }
    }

    for (const btn of this.cachedAutos) {
      const kind = btn.dataset.auto;
      const on =
        kind === "attack" ? model.autoAttack : kind === "move" ? model.autoMove : kind === "potion" ? model.autoPotion : false;
      const prev =
        kind === "attack" ? this.autoCache.attack : kind === "move" ? this.autoCache.move : this.autoCache.potion;
      if (prev === on) continue;
      if (kind === "attack") this.autoCache.attack = on;
      else if (kind === "move") this.autoCache.move = on;
      else if (kind === "potion") this.autoCache.potion = on;
      btn.classList.toggle("is-on", on);
    }
  }
}

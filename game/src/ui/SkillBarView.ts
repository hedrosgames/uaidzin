import type { HudSkillSlot } from "./HudModel";

interface SlotCache {
  ready: boolean;
  cdRatio: number;
  name: string;
  key: number;
  empty: boolean;
}

export class SkillBarView {
  private readonly legacyBar: HTMLElement;
  private readonly slotButtons: HTMLButtonElement[] = [];
  private readonly slotCds: HTMLElement[] = [];
  private readonly slotKeys: HTMLElement[] = [];
  private readonly slotNames: HTMLElement[] = [];
  private readonly slotCache: SlotCache[] = [];
  private cachedWireHud: HTMLElement | null = null;
  private cachedRings: HTMLElement[] = [];
  private readonly wireSlotCache: Array<{ ready: boolean; pct: number }> = [];

  constructor(legacyBar: HTMLElement, onSlotClick?: (slot: number) => void) {
    this.legacyBar = legacyBar;
    this.legacyBar.replaceChildren();

    for (let i = 0; i < 10; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-slot empty";
      btn.dataset.skillSlot = String(i);

      const cd = document.createElement("span");
      cd.className = "skill-cd";
      btn.appendChild(cd);

      const key = document.createElement("span");
      key.className = "skill-key";
      key.textContent = String((i + 1) % 10);
      btn.appendChild(key);

      const name = document.createElement("span");
      name.className = "skill-name";
      name.textContent = "—";
      btn.appendChild(name);

      if (onSlotClick) {
        btn.addEventListener("click", () => onSlotClick(i));
      }

      this.legacyBar.appendChild(btn);
      this.slotButtons.push(btn);
      this.slotCds.push(cd);
      this.slotKeys.push(key);
      this.slotNames.push(name);
      this.slotCache.push({ ready: false, cdRatio: -1, name: "—", key: (i + 1) % 10, empty: true });
    }
  }

  update(skills: HudSkillSlot[], wireActive: boolean): void {
    if (wireActive) {
      this.updateWireHud(skills);
      return;
    }
    this.updateLegacyHud(skills);
  }

  private updateLegacyHud(skills: HudSkillSlot[]): void {
    const total = this.slotButtons.length;
    for (let i = 0; i < total; i++) {
      const s = skills[i];
      const prev = this.slotCache[i]!;
      const btn = this.slotButtons[i]!;
      const cdEl = this.slotCds[i]!;
      const nameEl = this.slotNames[i]!;

      if (!s) {
        if (!prev.empty) {
          prev.empty = true;
          prev.name = "—";
          prev.cdRatio = 0;
          btn.className = "skill-slot empty";
          btn.disabled = true;
          nameEl.textContent = "—";
          cdEl.style.height = "0%";
        }
        continue;
      }

      if (prev.empty) {
        prev.empty = false;
        btn.disabled = false;
      }

      if (prev.name !== s.name) {
        prev.name = s.name;
        nameEl.textContent = s.name;
        btn.title = s.name;
      }

      if (prev.ready !== s.ready) {
        prev.ready = s.ready;
        btn.classList.toggle("ready", s.ready);
        btn.classList.toggle("cooling", !s.ready);
      }

      const ratio = Math.max(0, Math.min(1, s.cdRatio));
      if (Math.abs(prev.cdRatio - ratio) > 0.005) {
        prev.cdRatio = ratio;
        cdEl.style.height = `${(ratio * 100).toFixed(1)}%`;
      }
    }
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

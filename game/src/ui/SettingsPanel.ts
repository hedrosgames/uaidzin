import {
  DEFAULT_GRAPHICS_QUALITY,
  type GraphicsQualityLevel,
  isGraphicsQualityLevel,
} from "../presentation/rendering/GraphicsQuality";

const SETTINGS_KEY = "uaidzin_settings";
const DEFAULT_POTION_HP_PCT = 50;
const DEFAULT_POTION_MP_PCT = 40;

export interface AutoPotionThresholds {
  hpPct: number;
  mpPct: number;
}

export interface SettingsCallbacks {
  applyArmorAura: (enabled: boolean) => void;
  applyQuality: (quality: GraphicsQualityLevel) => void;
  onChangeCharacter: () => void;
  onLogout: () => void;
  showToast: (text: string, kind?: "skill" | "attr" | "level" | "dungeon") => void;
  onOpenChange?: (open: boolean) => void;
}

function clampPct(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(5, Math.min(95, Math.round(n)));
}

export class SettingsPanel {
  private readonly overlay: HTMLElement;
  private readonly ranges: Array<[string, string]> = [
    ["vol-master", "vol-master-val"],
    ["vol-music", "vol-music-val"],
    ["vol-sfx", "vol-sfx-val"],
    ["opt-potion-hp", "opt-potion-hp-val"],
    ["opt-potion-mp", "opt-potion-mp-val"],
  ];
  private readonly callbacks: SettingsCallbacks;

  static readAutoPotionThresholds(): AutoPotionThresholds {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      return {
        hpPct: clampPct(data.optPotionHpPct, DEFAULT_POTION_HP_PCT),
        mpPct: clampPct(data.optPotionMpPct, DEFAULT_POTION_MP_PCT),
      };
    } catch {
      return { hpPct: DEFAULT_POTION_HP_PCT, mpPct: DEFAULT_POTION_MP_PCT };
    }
  }

  constructor(
    overlay: HTMLElement,
    triggerButton: HTMLElement | null,
    callbacks: SettingsCallbacks,
  ) {
    this.overlay = overlay;
    this.callbacks = callbacks;

    this.bindSliders();
    this.bindButtons(triggerButton);
    this.loadSettings();
    this.applyInitialSettings();
  }

  isOpen(): boolean {
    return this.overlay.classList.contains("open");
  }

  open(): void {
    this.loadSettings();
    this.overlay.classList.add("open");
    this.callbacks.onOpenChange?.(true);
  }

  close(): void {
    if (!this.isOpen()) return;
    this.overlay.classList.remove("open");
    this.callbacks.onOpenChange?.(false);
  }

  private bindSliders(): void {
    this.ranges.forEach(([id, valId]) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      const label = document.getElementById(valId);
      if (!el || !label) return;
      el.addEventListener("input", () => {
        label.textContent = el.value;
      });
    });
  }

  private bindButtons(triggerButton: HTMLElement | null): void {
    const btnCancel = this.overlay.querySelector<HTMLButtonElement>("#btn-settings-cancel");
    const btnSave = this.overlay.querySelector<HTMLButtonElement>("#btn-settings-save");
    const btnChange = this.overlay.querySelector<HTMLButtonElement>("#btn-change-character");
    const btnLogout = this.overlay.querySelector<HTMLButtonElement>("#btn-logout");

    triggerButton?.addEventListener("click", () => this.open());
    btnCancel?.addEventListener("click", () => {
      this.loadSettings();
      this.close();
    });

    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) {
        this.loadSettings();
        this.close();
      }
    });

    btnSave?.addEventListener("click", () => {
      this.saveSettings();
      this.close();
      this.callbacks.showToast("Opções salvas.", "skill");
    });

    btnChange?.addEventListener("click", () => {
      this.callbacks.onChangeCharacter();
    });

    btnLogout?.addEventListener("click", () => {
      this.callbacks.onLogout();
    });
  }

  private readStored(): Record<string, unknown> {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  loadSettings(): void {
    const data = this.readStored();
    const map: Record<string, string> = {
      "vol-master": "volMaster",
      "vol-music": "volMusic",
      "vol-sfx": "volSfx",
      "opt-potion-hp": "optPotionHpPct",
      "opt-potion-mp": "optPotionMpPct",
    };

    this.ranges.forEach(([id, valId]) => {
      const key = map[id];
      const el = document.getElementById(id) as HTMLInputElement | null;
      const label = document.getElementById(valId);
      if (!el || !key) return;
      const val = data[key];
      if (val != null) {
        const shown =
          id === "opt-potion-hp"
            ? String(clampPct(val, DEFAULT_POTION_HP_PCT))
            : id === "opt-potion-mp"
              ? String(clampPct(val, DEFAULT_POTION_MP_PCT))
              : String(val);
        el.value = shown;
        if (label) label.textContent = shown;
      }
    });

    const fullscreenEl = document.getElementById("opt-fullscreen") as HTMLInputElement | null;
    if (fullscreenEl && data.optFullscreen != null) {
      fullscreenEl.checked = Boolean(data.optFullscreen);
    }

    const qualityEl = document.getElementById("opt-graphics-quality") as HTMLSelectElement | null;
    if (qualityEl) {
      qualityEl.value = isGraphicsQualityLevel(data.optGraphicsQuality)
        ? data.optGraphicsQuality
        : data.optShadows === false
          ? "baixo"
          : DEFAULT_GRAPHICS_QUALITY;
    }

    const shadowsEl = document.getElementById("opt-shadows") as HTMLInputElement | null;
    if (shadowsEl) {
      shadowsEl.checked = data.optShadows == null ? true : Boolean(data.optShadows);
    }

    const auraEl = document.getElementById("opt-armor-aura") as HTMLInputElement | null;
    if (auraEl) {
      auraEl.checked = data.optArmorAura == null ? false : Boolean(data.optArmorAura);
    }

    const skipEl = document.getElementById("opt-skip-dungeon-confirm") as HTMLInputElement | null;
    if (skipEl) {
      if (data.optSkipDungeonConfirm == null) {
        try {
          skipEl.checked = localStorage.getItem("uaidzin_portal_skip_confirm") === "1";
        } catch {
          skipEl.checked = false;
        }
      } else {
        skipEl.checked = Boolean(data.optSkipDungeonConfirm);
      }
    }
  }

  private applyInitialSettings(): void {
    const data = this.readStored();
    const q = isGraphicsQualityLevel(data.optGraphicsQuality)
      ? data.optGraphicsQuality
      : data.optShadows === false
        ? "baixo"
        : DEFAULT_GRAPHICS_QUALITY;
    this.callbacks.applyQuality(q);
    this.callbacks.applyArmorAura(Boolean(data.optArmorAura));
  }

  saveSettings(): void {
    const data: Record<string, unknown> = { ...this.readStored() };

    this.ranges.forEach(([id]) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el) return;
      if (id === "vol-master") data.volMaster = Number(el.value);
      if (id === "vol-music") data.volMusic = Number(el.value);
      if (id === "vol-sfx") data.volSfx = Number(el.value);
      if (id === "opt-potion-hp") data.optPotionHpPct = clampPct(el.value, DEFAULT_POTION_HP_PCT);
      if (id === "opt-potion-mp") data.optPotionMpPct = clampPct(el.value, DEFAULT_POTION_MP_PCT);
    });

    const fullscreen = document.getElementById("opt-fullscreen") as HTMLInputElement | null;
    const qualityEl = document.getElementById("opt-graphics-quality") as HTMLSelectElement | null;
    const shadows = document.getElementById("opt-shadows") as HTMLInputElement | null;
    const armorAura = document.getElementById("opt-armor-aura") as HTMLInputElement | null;
    const skipConfirm = document.getElementById("opt-skip-dungeon-confirm") as HTMLInputElement | null;

    if (fullscreen) data.optFullscreen = fullscreen.checked;
    if (qualityEl && isGraphicsQualityLevel(qualityEl.value)) {
      data.optGraphicsQuality = qualityEl.value;
    }
    if (shadows) data.optShadows = shadows.checked;
    if (armorAura) data.optArmorAura = armorAura.checked;
    if (skipConfirm) data.optSkipDungeonConfirm = skipConfirm.checked;

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
      if (skipConfirm?.checked) localStorage.setItem("uaidzin_portal_skip_confirm", "1");
      else localStorage.removeItem("uaidzin_portal_skip_confirm");
    } catch {
    }

    const q = isGraphicsQualityLevel(data.optGraphicsQuality)
      ? data.optGraphicsQuality
      : DEFAULT_GRAPHICS_QUALITY;
    this.callbacks.applyQuality(q);
    this.callbacks.applyArmorAura(Boolean(armorAura?.checked));
  }
}

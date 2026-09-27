import { formatMMSS } from "../core/time/FormatTime";
import { WEAPON_SET_IDS, WEAPON_SET_LABEL, type WeaponSetId } from "../presentation/player/WeaponRig";
import { weaponSetIconMarkup } from "./WeaponSetHudIcons";
import { artForClass } from "./CharacterUiBinder";
import type { HudModel } from "./HudModel";

export interface HudBarsViewElements {
  playerFaceElement: HTMLImageElement;
  playerNameElement: HTMLElement;
  playerLevelElement: HTMLElement;
  hpFillElement: HTMLElement;
  hpTextElement: HTMLElement;
  mpFillElement: HTMLElement;
  mpTextElement: HTMLElement;
  xpFillElement: HTMLElement;
  xpTextElement: HTMLElement;
  timerElement: HTMLElement;
  farmStatsElement: HTMLElement;
  weaponSetStrip: HTMLElement;
}

const CLASS_FACE: Record<string, string> = {
  TK: artForClass("TK").face,
  FM: artForClass("FM").face,
  BM: artForClass("BM").face,
  HT: artForClass("HT").face,
};

export class HudBarsView {
  private readonly playerFace: HTMLImageElement;
  private readonly playerName: HTMLElement;
  private readonly playerLevel: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly mpFill: HTMLElement;
  private readonly mpText: HTMLElement;
  private readonly xpFill: HTMLElement;
  private readonly xpText: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly farmStats: HTMLElement;
  private readonly weaponSetStrip: HTMLElement;
  private readonly weaponSetButtons = new Map<WeaponSetId, HTMLButtonElement>();

  private lastFaceSrc = "";
  private lastName = "";
  private lastLevel = "";
  private lastHpWidth = "";
  private lastHpText = "";
  private lastHpLow = false;
  private lastMpWidth = "";
  private lastMpText = "";
  private lastXpWidth = "";
  private lastXpText = "";
  private lastTimerText = "";
  private lastTimerHidden = true;
  private lastTimerUrgent = false;
  private lastFarmStatsText = "";
  private lastFarmStatsHidden = true;
  private lastActiveWeaponSet: WeaponSetId | "" = "";

  constructor(
    elements: HudBarsViewElements,
    onWeaponSetSelect?: (set: WeaponSetId) => void,
  ) {
    this.playerFace = elements.playerFaceElement;
    this.playerName = elements.playerNameElement;
    this.playerLevel = elements.playerLevelElement;
    this.hpFill = elements.hpFillElement;
    this.hpText = elements.hpTextElement;
    this.mpFill = elements.mpFillElement;
    this.mpText = elements.mpTextElement;
    this.xpFill = elements.xpFillElement;
    this.xpText = elements.xpTextElement;
    this.timerEl = elements.timerElement;
    this.farmStats = elements.farmStatsElement;
    this.weaponSetStrip = elements.weaponSetStrip;

    this.buildWeaponSetStrip(onWeaponSetSelect);
  }

  private buildWeaponSetStrip(onSelect?: (set: WeaponSetId) => void): void {
    if (!import.meta.env.DEV) {
      if (this.weaponSetStrip) this.weaponSetStrip.style.display = "none";
      return;
    }
    this.weaponSetStrip.replaceChildren();
    this.weaponSetButtons.clear();
    for (const set of WEAPON_SET_IDS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-weapon-set btn-opt-hud";
      btn.dataset.weaponSet = set;
      btn.setAttribute("aria-label", WEAPON_SET_LABEL[set]);
      btn.innerHTML = weaponSetIconMarkup(set);
      if (onSelect) {
        btn.addEventListener("click", () => onSelect(set));
      }
      this.weaponSetStrip.appendChild(btn);
      this.weaponSetButtons.set(set, btn);
    }
  }

  update(model: HudModel): void {
    const faceSrc = CLASS_FACE[model.classId] || CLASS_FACE.TK;
    if (this.lastFaceSrc !== faceSrc) {
      this.lastFaceSrc = faceSrc;
      this.playerFace.src = faceSrc;
    }

    if (this.lastName !== model.playerName) {
      this.lastName = model.playerName;
      this.playerName.textContent = model.playerName;
    }

    const levelStr = `Lv ${model.level}`;
    if (this.lastLevel !== levelStr) {
      this.lastLevel = levelStr;
      this.playerLevel.textContent = levelStr;
    }

    this.updateBar("hp", this.hpFill, this.hpText, model.hp, model.maxHp);
    this.updateBar("mp", this.mpFill, this.mpText, model.mp, model.maxMp);

    if (model.isMaxLevel) {
      if (this.lastXpWidth !== "100%") {
        this.lastXpWidth = "100%";
        this.xpFill.style.width = "100%";
      }
      if (this.lastXpText !== "MAX") {
        this.lastXpText = "MAX";
        this.xpText.textContent = "MAX";
      }
    } else {
      this.updateBar("xp", this.xpFill, this.xpText, model.xp, Math.max(model.xpMax, 1));
    }

    if (model.timer != null) {
      const sec = Number(model.timer);
      const timerStr = formatMMSS(Number.isFinite(sec) ? sec : 0);
      const urgent = Number.isFinite(sec) && sec < 30;

      if (this.lastTimerHidden) {
        this.lastTimerHidden = false;
        this.timerEl.hidden = false;
      }
      if (this.lastTimerText !== timerStr) {
        this.lastTimerText = timerStr;
        this.timerEl.textContent = timerStr;
      }
      if (this.lastTimerUrgent !== urgent) {
        this.lastTimerUrgent = urgent;
        this.timerEl.classList.toggle("urgent", urgent);
      }

      const farmText = `Abates ${model.kills} · XP ${model.xp} · ${model.arenaHint ?? ""}`;
      if (this.lastFarmStatsHidden) {
        this.lastFarmStatsHidden = false;
        this.farmStats.hidden = false;
      }
      if (this.lastFarmStatsText !== farmText) {
        this.lastFarmStatsText = farmText;
        this.farmStats.textContent = farmText;
      }
    } else {
      if (!this.lastTimerHidden) {
        this.lastTimerHidden = true;
        this.timerEl.hidden = true;
      }
      if (!this.lastFarmStatsHidden) {
        this.lastFarmStatsHidden = true;
        this.farmStats.hidden = true;
      }
    }

    if (this.lastActiveWeaponSet !== model.weaponSet) {
      this.lastActiveWeaponSet = model.weaponSet;
      for (const [set, btn] of this.weaponSetButtons) {
        const on = set === model.weaponSet;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
    }
  }

  setActiveWeaponSet(active: WeaponSetId): void {
    if (this.lastActiveWeaponSet === active) return;
    this.lastActiveWeaponSet = active;
    for (const [set, btn] of this.weaponSetButtons) {
      const on = set === active;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  private updateBar(
    kind: "hp" | "mp" | "xp",
    fill: HTMLElement,
    text: HTMLElement,
    value: number,
    max: number,
  ): void {
    const safeMax = Math.max(max, 1);
    const ratio = Math.max(0, Math.min(1, value / safeMax));
    const widthStr = `${Math.round(ratio * 100)}%`;
    const textStr = `${Math.ceil(value)} / ${Math.ceil(max)}`;

    if (kind === "hp") {
      if (this.lastHpWidth !== widthStr) {
        this.lastHpWidth = widthStr;
        fill.style.width = widthStr;
      }
      if (this.lastHpText !== textStr) {
        this.lastHpText = textStr;
        text.textContent = textStr;
      }
      const low = ratio < 0.4;
      if (this.lastHpLow !== low) {
        this.lastHpLow = low;
        fill.classList.toggle("low", low);
      }
    } else if (kind === "mp") {
      if (this.lastMpWidth !== widthStr) {
        this.lastMpWidth = widthStr;
        fill.style.width = widthStr;
      }
      if (this.lastMpText !== textStr) {
        this.lastMpText = textStr;
        text.textContent = textStr;
      }
    } else {
      if (this.lastXpWidth !== widthStr) {
        this.lastXpWidth = widthStr;
        fill.style.width = widthStr;
      }
      if (this.lastXpText !== textStr) {
        this.lastXpText = textStr;
        text.textContent = textStr;
      }
    }
  }
}

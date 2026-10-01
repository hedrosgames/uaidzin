import { formatMMSS } from "../core/time/FormatTime";
import { artForClass } from "./CharacterUiBinder";
import type { HudBuffSlot, HudModel } from "./HudModel";

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
  buffRowElement: HTMLElement;
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
  private readonly buffRow: HTMLElement;
  private lastBuffStamp = "";

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

  constructor(elements: HudBarsViewElements) {
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
    this.farmStats.hidden = true;
    this.buffRow = elements.buffRowElement;
  }

  private updateBuffs(buffs: HudBuffSlot[]): void {
    const stamp = buffs.map((buff) => `${buff.icon}|${buff.remainingSec.toFixed(1)}`).join(",");
    if (stamp === this.lastBuffStamp) return;
    this.lastBuffStamp = stamp;
    if (buffs.length === 0) {
      this.buffRow.hidden = true;
      this.buffRow.innerHTML = "";
      return;
    }
    this.buffRow.hidden = false;
    let html = "";
    for (const buff of buffs) {
      html += `<div class="buff-chip" title="${buff.label} · ${buff.remainingSec.toFixed(1)} s"><img src="${buff.icon}" alt=""></div>`;
    }
    this.buffRow.innerHTML = html;
  }

  update(model: HudModel): void {
    this.updateBuffs(model.activeBuffs);
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
    } else {
      if (!this.lastTimerHidden) {
        this.lastTimerHidden = true;
        this.timerEl.hidden = true;
      }
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

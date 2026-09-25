import { EventBus } from "../core/events/EventBus";
import { ErrorReporter } from "../core/errors/ErrorReporter";
import { GameStateStore } from "../core/state/GameStateStore";
import { GameClock } from "../core/time/GameClock";
import { formatMMSS } from "../core/time/FormatTime";
import { DebugHud } from "../debug/DebugHud";
import { SceneRenderer } from "../presentation/rendering/SceneRenderer";
import { WEAPON_SET_IDS, WEAPON_SET_LABEL } from "../presentation/player/WeaponRig";
import { InteractionPanel } from "../ui/InteractionPanel";
import { GamePanels } from "../ui/GamePanels";
import { WireUi, isWirePanelName } from "../ui/WireUi";
import { CityGameSession, type SessionHud } from "./CityGameSession";
import { GameLoop } from "./GameLoop";
import { installDebugApi } from "../debug/DebugApi";
import type { BootCharacter } from "./BootFlow";
import { clearBootCharacter, clearBootSession } from "./BootFlow";
import { saveVault } from "../persistence/SaveVault";
import { artForClass, bindHud } from "../ui/CharacterUiBinder";
import type { CharacterViewModel } from "../persistence/SaveTypes";
import { emptyAttrs } from "../persistence/SaveTypes";

export interface GameAppDeps {
  canvas: HTMLCanvasElement;
  debugHudElement: HTMLElement;
  interactionPanelElement: HTMLElement;
  interactionHintElement: HTMLElement;
  playerFrameElement: HTMLElement;
  playerFaceElement: HTMLImageElement;
  playerNameElement: HTMLElement;
  playerLevelElement: HTMLElement;
  hpFillElement: HTMLElement;
  hpTextElement: HTMLElement;
  mpFillElement: HTMLElement;
  mpTextElement: HTMLElement;
  xpFillElement: HTMLElement;
  xpTextElement: HTMLElement;
  skillBarElement: HTMLElement;
  deathOverlayElement: HTMLElement;
  timerElement: HTMLElement;
  farmStatsElement: HTMLElement;
  dropLogElement: HTMLElement;
  resultOverlayElement: HTMLElement;
  gamePanelsElement: HTMLElement;
  wireUiElement: HTMLElement;
  hudToolsElement: HTMLElement;
  settingsOverlayElement: HTMLElement;
  toastElement: HTMLElement;
  helpBarElement: HTMLElement;
}

const CLASS_FACE: Record<string, string> = {
  TK: artForClass("TK").face,
  FM: artForClass("FM").face,
  BM: artForClass("BM").face,
  HT: artForClass("HT").face,
};

const SETTINGS_KEY = "uaidzin_settings";

type TimeScale = 1 | 2 | 4 | 10;

export class GameApp {
  readonly bus = new EventBus();
  readonly state = new GameStateStore();
  readonly clock = new GameClock();
  readonly errors = new ErrorReporter(this.bus);

  private readonly renderer: SceneRenderer;
  private readonly debugHud: DebugHud;
  private readonly panel: InteractionPanel;
  private readonly hint: HTMLElement;
  private readonly playerFrame: HTMLElement;
  private readonly playerFace: HTMLImageElement;
  private readonly playerName: HTMLElement;
  private readonly playerLevel: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly mpFill: HTMLElement;
  private readonly mpText: HTMLElement;
  private readonly xpFill: HTMLElement;
  private readonly xpText: HTMLElement;
  private readonly skillBar: HTMLElement;
  private readonly deathOverlay: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly farmStats: HTMLElement;
  private readonly dropLogEl: HTMLElement;
  private readonly resultOverlay: HTMLElement;
  private readonly speedToggle: HTMLElement;
  private readonly weaponToggle: HTMLButtonElement;
  private readonly settingsOverlay: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly helpBar: HTMLElement;
  private readonly panels: GamePanels;
  private readonly wireHost: HTMLElement;
  private wireUi: WireUi | null = null;
  private readonly session: CityGameSession;
  private readonly loop: GameLoop;
  private resizeObserver: ResizeObserver | null = null;
  private lastHud: SessionHud | null = null;
  private timeScale: TimeScale = 1;
  private toastTimer = 0;
  private lastToastText = "";
  private lastDropLogKey = "";
  private entered = false;
  private leaving = false;
  private autosaveTimer: number | null = null;
  private readonly onPageHide = (): void => {
    if (this.entered && this.modeAllowsSave()) void this.session.persistSave(true);
  };
  private readonly onVisibility = (): void => {
    if (document.visibilityState === "hidden" && this.entered && this.modeAllowsSave()) {
      void this.session.persistSave(true);
    }
  };
  private readonly onWindowResize = (): void => {
    const canvas = this.renderer.renderer.domElement;
    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || window.innerHeight;
    this.renderer.resize(width, height);
  };
  private readonly onKeyPanels = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    if (!this.entered) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    const mode = this.state.getMode();
    if (mode === "DUNGEON" || mode === "DEAD") return;
    if (this.wireUi) {
      if (event.code === "KeyB") this.wireUi.toggle("vault");
      return;
    }
    if (event.code === "KeyC") this.panels.toggle("person");
    if (event.code === "KeyK") this.panels.toggle("skills");
    if (event.code === "KeyI") this.panels.toggle("inv");
  };
  private readonly onKeyDebugProgression = (event: KeyboardEvent): void => {
    if (event.key === "F2") {
      event.preventDefault();
      this.session.debugAddLevels(1);
    }
    if (event.key === "F3") {
      event.preventDefault();
      this.session.debugSpendAll("FOR");
    }
    if (event.key === "F5") {
      event.preventDefault();
      const ok = this.session.debugTryReset();
      console.info("[UAIDZIN] reset", ok ? "ok" : "bloqueado");
    }
    if (event.key === "F6") {
      event.preventDefault();
      const evolved = this.session.debugTryEvolve();
      if (!evolved.ok && evolved.reason) this.showToast(evolved.reason, "dungeon");
    }
  };
  private readonly onKeyDebugToggle = (event: KeyboardEvent): void => {
    if (event.key === "F1") {
      event.preventDefault();
      this.state.setDebugHudVisible(!this.state.getState().debugHudVisible);
    }
  };
  private readonly onKeyEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    this.dismissUiLikeEscape();
  };
  private readonly onKeyDebugTimer = (event: KeyboardEvent): void => {
    if (event.key === "F9") {
      event.preventDefault();
      this.session.debugSetTimer(3);
    }
  };

  private modeAllowsSave(): boolean {
    const mode = this.state.getMode();
    return mode === "CITY" || mode === "DUNGEON";
  }

  constructor(deps: GameAppDeps) {
    this.renderer = new SceneRenderer({ canvas: deps.canvas });
    this.debugHud = new DebugHud(deps.debugHudElement);
    this.hint = deps.interactionHintElement;
    this.playerFrame = deps.playerFrameElement;
    this.playerFace = deps.playerFaceElement;
    this.playerName = deps.playerNameElement;
    this.playerLevel = deps.playerLevelElement;
    this.hpFill = deps.hpFillElement;
    this.hpText = deps.hpTextElement;
    this.mpFill = deps.mpFillElement;
    this.mpText = deps.mpTextElement;
    this.xpFill = deps.xpFillElement;
    this.xpText = deps.xpTextElement;
    this.skillBar = deps.skillBarElement;
    this.deathOverlay = deps.deathOverlayElement;
    this.timerEl = deps.timerElement;
    this.farmStats = deps.farmStatsElement;
    this.dropLogEl = deps.dropLogElement;
    this.resultOverlay = deps.resultOverlayElement;
    this.speedToggle = deps.hudToolsElement;
    this.weaponToggle = deps.hudToolsElement.querySelector<HTMLButtonElement>("#btn-weapon-set")!;
    this.settingsOverlay = deps.settingsOverlayElement;
    this.toastEl = deps.toastElement;
    this.helpBar = deps.helpBarElement;

    this.panel = new InteractionPanel(
      deps.interactionPanelElement,
      (id) => this.session.confirmInteraction(id),
      () => this.session.closePanel(),
    );

    this.session = new CityGameSession(
      this.renderer,
      this.bus,
      deps.canvas,
      this.panel,
      (mode) => this.state.setMode(mode),
      (hud) => this.renderHud(hud),
      (text) => {
        this.resultOverlay.hidden = !text;
        if (text) this.resultOverlay.textContent = text;
      },
      () => this.dismissUiLikeEscape(),
    );

    this.panels = new GamePanels(deps.gamePanelsElement, this.session);
    this.wireHost = deps.wireUiElement;

    this.bus.on("ui:open-panel", ({ panel, title, shopId }) => {
      if (!this.entered) return;
      if (this.wireUi) {
        this.wireUi.applyCharacter(this.currentViewModel());
        if (isWirePanelName(panel)) {
          this.wireUi.open(panel, {
            title,
            shopId,
          });
        }
        return;
      }
      if (panel === "person" || panel === "skills" || panel === "inv") this.panels.open(panel);
    });

    this.bus.on("game:state-changed", ({ mode }) => {
      if (mode === "CITY" && this.entered) void this.session.persistSave(true);
    });

    this.autosaveTimer = window.setInterval(() => {
      if (!this.entered || !this.modeAllowsSave()) return;
      if (saveVault.shouldSkipAutosave()) return;
      void this.session.persistSave();
    }, 30000);

    window.addEventListener("pagehide", this.onPageHide);
    document.addEventListener("visibilitychange", this.onVisibility);

    saveVault.onStatus((status) => this.renderSaveStatus(status));

    this.state.subscribe((state) => {
      this.debugHud.setVisible(state.debugHudVisible);
      this.deathOverlay.hidden = state.mode !== "DEAD";
      this.bus.emit("game:state-changed", { mode: state.mode });
    });

    this.bus.on("player:near-interactable", () => {
      this.hint.hidden = true;
    });

    this.loop = new GameLoop((dt) => this.tick(dt));
    this.bindResize(deps.canvas);
    this.bindWheelZoom(deps.canvas);
    this.bindDebugToggle();
    this.bindEscape();
    this.bindDebugTimer();
    this.bindDebugProgression();
    this.bindPanels();
    this.bindWeaponToggle();
    this.bindSettings();
    this.bindJuiceToasts();
    this.bindSkillBarClicks();
    this.exposeDebugApi();
  }

  private enterGame(): void {
    this.entered = true;
    this.playerFrame.hidden = false;
    if (this.wireUi) {
      this.skillBar.hidden = true;
      this.helpBar.hidden = true;
      this.wireHost.hidden = false;
    } else {
      this.skillBar.hidden = false;
      this.helpBar.hidden = false;
    }
    this.speedToggle.hidden = false;
    if (!this.session.worlds.getCurrent()) this.session.start();
    this.bus.emit("game:ready", { at: Date.now() });
  }

  private exposeDebugApi(): void {
    installDebugApi(this as unknown as import("../debug/DebugApi").DebugHost);
  }


  private bindSkillBarClicks(): void {
    this.skillBar.addEventListener("click", (e) => {
      const slot = (e.target as HTMLElement).closest("[data-skill-slot]");
      if (!slot) return;
      const index = Number(slot.getAttribute("data-skill-slot"));
      if (Number.isFinite(index)) this.session.forceSkillSlot(index);
    });
  }

  private bindWeaponToggle(): void {
    this.weaponToggle.addEventListener("click", () => {
      const current = this.renderer.playerView.getWeaponSet();
      const index = current ? WEAPON_SET_IDS.indexOf(current) : -1;
      const next = WEAPON_SET_IDS[(index + 1) % WEAPON_SET_IDS.length]!;
      void this.renderer.playerView.setWeaponSet(next);
      this.refreshWeaponToggle();
    });
  }

  private refreshWeaponToggle(): void {
    const set = this.renderer.playerView.getWeaponSet();
    const label = set ? WEAPON_SET_LABEL[set] : "";
    if (this.weaponToggle.textContent !== label) this.weaponToggle.textContent = label;
  }

  private bindSettings(): void {
    const btnOpen = this.speedToggle.querySelector<HTMLButtonElement>("#btn-settings");
    const btnCancel = this.settingsOverlay.querySelector<HTMLButtonElement>("#btn-settings-cancel");
    const btnSave = this.settingsOverlay.querySelector<HTMLButtonElement>("#btn-settings-save");
    const btnChange = this.settingsOverlay.querySelector<HTMLButtonElement>("#btn-change-character");
    const btnLogout = this.settingsOverlay.querySelector<HTMLButtonElement>("#btn-logout");
    const ranges: Array<[string, string]> = [
      ["vol-master", "vol-master-val"],
      ["vol-music", "vol-music-val"],
      ["vol-sfx", "vol-sfx-val"],
    ];

    const loadSettings = () => {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        const map: Record<string, string> = {
          "vol-master": "volMaster",
          "vol-music": "volMusic",
          "vol-sfx": "volSfx",
          "opt-fullscreen": "optFullscreen",
          "opt-shadows": "optShadows",
          "opt-armor-aura": "optArmorAura",
          "opt-skip-dungeon-confirm": "optSkipDungeonConfirm",
        };
        ranges.forEach(([id, valId]) => {
          const key = map[id];
          const el = document.getElementById(id) as HTMLInputElement | null;
          const label = document.getElementById(valId);
          if (!el || !key) return;
          const value = data[key];
          if (value != null) {
            el.value = String(value);
            if (label) label.textContent = String(value);
          }
        });
        (["opt-fullscreen", "opt-shadows"] as const).forEach((id) => {
          const el = document.getElementById(id) as HTMLInputElement | null;
          const key = map[id];
          if (!el || !key || data[key] == null) return;
          el.checked = Boolean(data[key]);
        });
        const auraEl = document.getElementById("opt-armor-aura") as HTMLInputElement | null;
        if (auraEl) {
          if (data.optArmorAura == null) auraEl.checked = false;
          else auraEl.checked = Boolean(data.optArmorAura);
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
        this.applyArmorAuraSetting();
        this.applyShadowSetting();
      } catch {

      }
    };

    const saveSettings = () => {
      let prev: Record<string, unknown> = {};
      try {
        prev = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") as Record<string, unknown>;
      } catch {
        prev = {};
      }
      const data: Record<string, unknown> = { ...prev };
      ranges.forEach(([id]) => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (!el) return;
        if (id === "vol-master") data.volMaster = Number(el.value);
        if (id === "vol-music") data.volMusic = Number(el.value);
        if (id === "vol-sfx") data.volSfx = Number(el.value);
      });
      const fullscreen = document.getElementById("opt-fullscreen") as HTMLInputElement | null;
      const shadows = document.getElementById("opt-shadows") as HTMLInputElement | null;
      const armorAura = document.getElementById("opt-armor-aura") as HTMLInputElement | null;
      const skipConfirm = document.getElementById("opt-skip-dungeon-confirm") as HTMLInputElement | null;
      if (fullscreen) data.optFullscreen = fullscreen.checked;
      if (shadows) data.optShadows = shadows.checked;
      if (armorAura) data.optArmorAura = armorAura.checked;
      if (skipConfirm) data.optSkipDungeonConfirm = skipConfirm.checked;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
      try {
        if (skipConfirm?.checked) localStorage.setItem("uaidzin_portal_skip_confirm", "1");
        else localStorage.removeItem("uaidzin_portal_skip_confirm");
      } catch {
        
      }
      this.applyArmorAuraSetting();
      this.applyShadowSetting();
    };

    ranges.forEach(([id, valId]) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      const label = document.getElementById(valId);
      if (!el || !label) return;
      el.addEventListener("input", () => {
        label.textContent = el.value;
        saveSettings();
      });
    });

    (["opt-fullscreen", "opt-shadows", "opt-armor-aura", "opt-skip-dungeon-confirm"] as const).forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.addEventListener("change", () => {
        saveSettings();
        if (id === "opt-armor-aura") this.applyArmorAuraSetting();
        if (id === "opt-shadows") this.applyShadowSetting();
      });
    });

    const armorAuraEl = document.getElementById("opt-armor-aura") as HTMLInputElement | null;
    void armorAuraEl;

    btnOpen?.addEventListener("click", () => {
      loadSettings();
      this.settingsOverlay.classList.add("open");
    });
    btnCancel?.addEventListener("click", () => this.closeSettings());
    this.settingsOverlay.addEventListener("click", (event) => {
      if (event.target === this.settingsOverlay) this.closeSettings();
    });
    btnSave?.addEventListener("click", () => {
      saveSettings();
      this.closeSettings();
      this.showToast("Opções salvas.", "skill");
    });
    btnChange?.addEventListener("click", () => {
      void this.leaveToBoot("select");
    });
    btnLogout?.addEventListener("click", () => {
      void this.leaveToBoot("login");
    });
    loadSettings();
  }

  private applyArmorAuraSetting(): void {
    const el = document.getElementById("opt-armor-aura") as HTMLInputElement | null;
    this.session.setArmorAuraEnabled(Boolean(el?.checked));
  }

  private applyShadowSetting(): void {
    const el = document.getElementById("opt-shadows") as HTMLInputElement | null;
    this.renderer.setShadowsEnabled(el ? el.checked : true);
  }

  private closeSettings(): void {
    this.settingsOverlay.classList.remove("open");
  }

  private async leaveToBoot(mode: "login" | "select"): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    this.closeSettings();
    try {
      await this.session.persistSave(true);
      await saveVault.flush();
    } catch {
      
    }
    clearBootCharacter();
    if (mode === "login") {
      clearBootSession();
      saveVault.logout();
    }
    window.location.reload();
  }

  private currentViewModel(): CharacterViewModel {
    const s = this.session;
    const p = s.progression.state;
    const st = s.skillTree.state;
    return {
      profileId: s.saveService.getProfileId(),
      classId: st.classId,
      name: s.character.name,
      level: p.level,
      evolution: p.evolution,
      gold: s.inventory.gold,
      resets: p.resetsInEvolution,
      attrs: { ...(s.character.attributes || emptyAttrs()) },
      hp: s.character.hp,
      mp: s.character.mp,
      maxHp: s.character.maxHp,
      maxMp: s.character.maxMp,
      xp: p.xp,
      xpToNext: p.xpToNext,
      attrPts: p.unspentAttributePoints,
      attack: s.character.attack,
      defense: s.character.defense,
      spec: { ...st.specialization },
      specPts: st.specPoints,
      vaultGold: s.accountVault.gold,
    };
  }

  private renderSaveStatus(status: string): void {
    let el = document.getElementById("save-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "save-status";
      el.className = "save-status";
      this.playerFrame.appendChild(el);
    }
    if (status === "saving") el.textContent = "Salvando…";
    else if (status === "saved") el.textContent = "Salvo";
    else if (status === "error") el.textContent = "Falha ao salvar";
    else el.textContent = "";
    el.hidden = status === "idle" || !status;
    el.dataset.status = status;
  }

  private bindJuiceToasts(): void {
    this.bus.on("character:level-up", ({ level }) => {
      this.showToast(`Nível ${level}!`, "level");
      this.pulseFrame();
      this.flashBars();
    });
    this.bus.on("dungeon:entered", ({ dungeonId }) => {
      this.showToast(dungeonId, "dungeon");
    });
  }

  showToast(text: string, kind: "skill" | "attr" | "level" | "dungeon" = "skill"): void {
    if (this.lastToastText === text && !this.toastEl.hidden) return;
    this.lastToastText = text;
    this.toastEl.hidden = false;
    this.toastEl.textContent = text;
    this.toastEl.className = `ui-toast ${kind}`;
    this.toastTimer = 2.2;
  }

  private pulseFrame(): void {
    this.playerFrame.classList.remove("pulse-juicy");
    void this.playerFrame.offsetWidth;
    this.playerFrame.classList.add("pulse-juicy");
  }

  private flashBars(): void {
    for (const sel of [".stat-bar.hp", ".stat-bar.mp", ".stat-bar.xp"]) {
      const bar = this.playerFrame.querySelector(sel);
      if (!bar) continue;
      bar.classList.remove("flash-up");
      void (bar as HTMLElement).offsetWidth;
      bar.classList.add("flash-up");
    }
  }

  private isPanelsOpen(): boolean {
    if (this.wireUi) return this.wireUi.isOpen();
    return this.panels.isOpen();
  }

  private bindPanels(): void {
    window.addEventListener("keydown", this.onKeyPanels);
  }

  private bindDebugProgression(): void {
    window.addEventListener("keydown", this.onKeyDebugProgression);
  }

  start(character: BootCharacter): void {
    this.session.saveService.setProfileId(character.id);
    void this.session
      .loadSave()
      .catch(() => false)
      .then(async (loaded) => {
      if (!loaded) {
        if (this.session.saveUnreadable) {
          this.showToast("Save ilegível — progresso não foi sobrescrito", "dungeon");
        } else {
          this.session.applyBootCharacter(character);
        }
      }
      try {
        const view = this.currentViewModel();
        this.wireUi = await WireUi.mount(this.wireHost, view);
        this.wireHost.hidden = false;
        window.dispatchEvent(new Event("resize"));
      } catch (error) {
        console.warn("[UAIDZIN] wire UI falhou, usando painéis legados", error);
        this.wireUi = null;
      }
      await this.session.start();
      this.loop.start();
      this.enterGame();
      this.applyArmorAuraSetting();
      bindHud(
        { face: this.playerFace, name: this.playerName, level: this.playerLevel },
        this.currentViewModel(),
      );
      this.wireUi?.applyCharacter(this.currentViewModel());
      console.info("[UAIDZIN] ready", character.name);
    });
  }

  dispose(): void {
    const stopDevTools = (window as Window & { __UAIDZIN_THREE_DEVTOOLS_STOP__?: () => void })
      .__UAIDZIN_THREE_DEVTOOLS_STOP__;
    stopDevTools?.();
    this.loop.stop();
    this.resizeObserver?.disconnect();
    if (this.autosaveTimer !== null) {
      window.clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    window.removeEventListener("pagehide", this.onPageHide);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("keydown", this.onKeyPanels);
    window.removeEventListener("keydown", this.onKeyDebugProgression);
    window.removeEventListener("keydown", this.onKeyDebugToggle);
    window.removeEventListener("keydown", this.onKeyEscape);
    window.removeEventListener("keydown", this.onKeyDebugTimer);
    this.session.dispose();
    this.renderer.dispose();
  }

  private setBar(fill: HTMLElement, text: HTMLElement, value: number, max: number, label: string): void {
    const safeMax = Math.max(max, 1);
    const ratio = Math.max(0, Math.min(1, value / safeMax));
    fill.style.width = `${Math.round(ratio * 100)}%`;
    text.textContent = `${Math.ceil(value)} / ${Math.ceil(max)}`;
    if (label === "hp") fill.classList.toggle("low", ratio < 0.4);
  }

  private renderSkillBar(skills: SessionHud["skills"]): void {
    const count = Math.max(skills.length, 1);
    let html = "";
    for (let i = 0; i < count; i++) {
      const s = skills[i];
      if (!s) {
        html += `<button type="button" class="skill-slot empty" disabled><span class="skill-key">${i + 1}</span><span class="skill-name">—</span></button>`;
        continue;
      }
      const cd = Math.max(0, Math.min(1, s.cdRatio));
      html += `<button type="button" class="skill-slot ${s.ready ? "ready" : "cooling"}" data-skill-slot="${i}" title="${s.name}">
        <span class="skill-cd" style="height:${(cd * 100).toFixed(1)}%"></span>
        <span class="skill-key">${s.key}</span>
        <span class="skill-name">${s.name}</span>
      </button>`;
    }
    this.skillBar.innerHTML = html;
  }

  private renderHud(hud: SessionHud): void {
    this.lastHud = hud;
    this.playerFace.src = CLASS_FACE[hud.classId] || CLASS_FACE.TK;
    this.playerName.textContent = hud.playerName;
    this.playerLevel.textContent = `Lv ${hud.level}`;
    this.setBar(this.hpFill, this.hpText, hud.hp, hud.maxHp, "hp");
    this.setBar(this.mpFill, this.mpText, hud.mp, hud.maxMp, "mp");
    this.setBar(this.xpFill, this.xpText, hud.progressionXp, Math.max(hud.xpToNext, 1), "xp");
    this.xpText.textContent = `${hud.progressionXp} / ${hud.xpToNext}`;
    this.renderSkillBar(hud.skills);

    if (hud.timer != null) {
      this.timerEl.hidden = false;
      const seconds = Number(hud.timer);
      this.timerEl.textContent = formatMMSS(Number.isFinite(seconds) ? seconds : 0);
      this.timerEl.classList.toggle("urgent", Number.isFinite(seconds) && seconds < 30);
    } else {
      this.timerEl.hidden = true;
      this.timerEl.classList.remove("urgent");
    }

    this.farmStats.hidden = hud.timer == null;
    if (hud.timer != null) {
      this.farmStats.textContent = `Abates ${hud.kills} · XP ${hud.xp} · ${hud.arenaHint ?? ""}`;
    }

    this.renderDropLog(hud.dropLog);

    if (hud.lootToast) this.showToast(hud.lootToast, hud.uiToastKind);
  }

  private renderDropLog(lines: SessionHud["dropLog"]): void {
    const key = lines.map((l) => `${l.id}:${l.text}`).join("|");
    if (key === this.lastDropLogKey) {
      this.dropLogEl.hidden = lines.length === 0;
      return;
    }
    this.lastDropLogKey = key;
    if (lines.length === 0) {
      this.dropLogEl.hidden = true;
      this.dropLogEl.innerHTML = "";
      return;
    }
    this.dropLogEl.hidden = false;
    let html = "";
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!;
      const tag =
        line.kind === "gold"
          ? "ouro"
          : line.kind === "item"
            ? "item"
            : line.kind === "lost"
              ? "perda"
              : "info";
      html += `<div class="drop-log-line ${line.kind}" data-drop-id="${line.id}"><span class="tag">${tag}</span><span>${line.text}</span></div>`;
    }
    this.dropLogEl.innerHTML = html;
  }

  private tick(deltaSeconds: number): void {
    try {
      this.clock.advance(deltaSeconds);
      this.refreshWeaponToggle();
      if (this.toastTimer > 0) {
        this.toastTimer -= deltaSeconds;
        if (this.toastTimer <= 0) {
          this.toastEl.hidden = true;
          this.lastToastText = "";
        }
      }
      const parent = this.renderer.renderer.domElement.parentElement;
      const width = parent?.clientWidth || window.innerWidth;
      const height = parent?.clientHeight || window.innerHeight;
      const scaled = deltaSeconds * this.timeScale;
      this.session.update(scaled, width / Math.max(height, 1), this.isPanelsOpen() || !this.entered);
      const char = this.session.character;
      const timer = this.lastHud?.timer;
      this.debugHud.update({
        mode: this.state.getMode(),
        elapsed: this.clock.getElapsedSeconds(),
        extra: `hp ${char.hp}/${char.maxHp} · mp ${char.mp}/${char.maxMp} · ${this.session.worlds.getCurrentId() ?? "-"} · timer ${timer != null ? formatMMSS(Number(timer)) : "--"} · kills ${this.session.dungeonRun.getKills()}`,
      });
    } catch (error) {
      this.errors.report(error, "GameApp.tick");
      this.showToast("Erro no jogo — veja o console", "dungeon");
      this.loop.stop();
    }
  }

  private bindWheelZoom(canvas: HTMLCanvasElement): void {
    canvas.addEventListener(
      "wheel",
      (event) => {
        if (!this.entered || this.isPanelsOpen()) return;
        event.preventDefault();
        this.session.camera.zoomBy(Math.sign(-event.deltaY));
      },
      { passive: false },
    );
  }

  private bindResize(canvas: HTMLCanvasElement): void {
    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.onWindowResize);
      if (canvas.parentElement) this.resizeObserver.observe(canvas.parentElement);
    }
  }

  private bindDebugToggle(): void {
    window.addEventListener("keydown", this.onKeyDebugToggle);
  }

  private dismissUiLikeEscape(): void {
    if (this.settingsOverlay.classList.contains("open")) {
      this.closeSettings();
      return;
    }
    if (this.wireUi) {
      this.wireUi.close();
      this.panel.close();
      return;
    }
    this.panels.close();
    this.panel.close();
  }

  private bindEscape(): void {
    window.addEventListener("keydown", this.onKeyEscape);
  }

  private bindDebugTimer(): void {
    window.addEventListener("keydown", this.onKeyDebugTimer);
  }
}

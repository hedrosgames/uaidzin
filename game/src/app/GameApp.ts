import { EventBus } from "../core/events/EventBus";
import { ErrorReporter } from "../core/errors/ErrorReporter";
import { GameStateStore } from "../core/state/GameStateStore";
import { GameClock } from "../core/time/GameClock";
import { formatMMSS } from "../core/time/FormatTime";
import { DebugHud } from "../debug/DebugHud";
import { SceneRenderer } from "../presentation/rendering/SceneRenderer";
import { InteractionPanel } from "../ui/InteractionPanel";
import { GamePanels } from "../ui/GamePanels";
import { WireUi, isWirePanelName } from "../ui/WireUi";
import { CityGameSession, type SessionHud } from "./CityGameSession";
import { GameLoop } from "./GameLoop";
import { installDebugApi } from "../debug/DebugApi";
import type { BootCharacter } from "./BootFlow";
import { bootAccountId, clearBootCharacter } from "./BootFlow";
import { accountLock } from "../persistence/AccountLock";
import { saveVault } from "../persistence/SaveVault";
import { bindHud } from "../ui/CharacterUiBinder";
import type { CharacterViewModel, LoadSaveResult } from "../persistence/SaveTypes";
import { emptyAttrs } from "../persistence/SaveTypes";
import { InputService, normalizeWheelZoom } from "../gameplay/InputService";
import { HudBarsView } from "../ui/HudBarsView";
import { SkillBarView } from "../ui/SkillBarView";
import { DropLogView } from "../ui/DropLogView";
import { SettingsPanel } from "../ui/SettingsPanel";

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
  saveErrorOverlayElement: HTMLElement;
  toastElement: HTMLElement;
  helpBarElement: HTMLElement;
}

const LEAVE_SAVE_TIMEOUT_MS = 3000;
const LEAVE_WARNING_MS = 1200;

type TimeScale = 1 | 2 | 4 | 10;

export class GameApp {
  readonly errors = new ErrorReporter();
  readonly bus = new EventBus(this.errors);
  readonly state = new GameStateStore(this.errors);
  readonly clock = new GameClock();
  readonly input = new InputService();

  private readonly renderer: SceneRenderer;
  private readonly debugHud: DebugHud;
  private readonly panel: InteractionPanel;
  private readonly hint: HTMLElement;
  private readonly playerFrame: HTMLElement;
  private readonly playerFace: HTMLImageElement;
  private readonly playerName: HTMLElement;
  private readonly playerLevel: HTMLElement;
  private readonly skillBar: HTMLElement;
  private readonly deathOverlay: HTMLElement;
  private readonly resultOverlay: HTMLElement;
  private readonly speedToggle: HTMLElement;
  private readonly saveErrorOverlay: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly helpBar: HTMLElement;
  private readonly panels: GamePanels;
  private readonly wireHost: HTMLElement;
  private wireUi: WireUi | null = null;
  private readonly session: CityGameSession;
  private readonly loop: GameLoop;
  private readonly canvasElement: HTMLCanvasElement;
  private readonly hudBarsView: HudBarsView;
  private readonly skillBarView: SkillBarView;
  private readonly dropLogView: DropLogView;
  private readonly settingsPanel: SettingsPanel;
  private resizeObserver: ResizeObserver | null = null;
  private lastHud: SessionHud | null = null;
  private timeScale: TimeScale = 1;
  private toastTimer = 0;
  private lastToastText = "";
  private entered = false;
  private leaving = false;
  private autosaveTimer: number | null = null;
  private cachedWidth = 0;
  private cachedHeight = 0;

  private readonly onPageHide = (): void => {
    if (!this.entered) return;
    saveVault.writeMirror();
    if (this.modeAllowsSave()) void this.session.saves.checkpoint();
  };

  private readonly onVisibility = (): void => {
    if (document.visibilityState === "hidden" && this.entered && this.modeAllowsSave()) {
      void this.session.saves.checkpoint();
    }
  };

  private readonly onWindowResize = (): void => {
    const parent = this.canvasElement.parentElement;
    this.cachedWidth = parent?.clientWidth || window.innerWidth;
    this.cachedHeight = parent?.clientHeight || window.innerHeight;
    this.renderer.resize(this.cachedWidth, this.cachedHeight);
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.entered || this.isUiOpen()) return;
    if (event.ctrlKey || event.metaKey) return;
    const delta = normalizeWheelZoom(event, this.cachedHeight || 600);
    if (delta === 0) return;
    event.preventDefault();
    this.session.camera.zoomBy(delta);
  };

  private modeAllowsSave(): boolean {
    const mode = this.state.getMode();
    return mode === "CITY" || mode === "DUNGEON";
  }

  constructor(deps: GameAppDeps) {
    this.canvasElement = deps.canvas;
    this.renderer = new SceneRenderer({ canvas: deps.canvas });
    this.hint = deps.interactionHintElement;
    this.playerFrame = deps.playerFrameElement;
    this.playerFace = deps.playerFaceElement;
    this.playerName = deps.playerNameElement;
    this.playerLevel = deps.playerLevelElement;
    this.skillBar = deps.skillBarElement;
    this.deathOverlay = deps.deathOverlayElement;
    this.resultOverlay = deps.resultOverlayElement;
    this.speedToggle = deps.hudToolsElement;
    this.saveErrorOverlay = deps.saveErrorOverlayElement;
    this.toastEl = deps.toastElement;
    this.helpBar = deps.helpBarElement;
    this.wireHost = deps.wireUiElement;

    this.debugHud = new DebugHud(deps.debugHudElement, () => {
      const ok = this.session.tryReset();
      console.info("[UAIDZIN] reset", ok ? "ok" : "bloqueado");
    });

    const weaponSetStrip = deps.hudToolsElement.querySelector<HTMLElement>("#weapon-set-strip")!;
    if (!import.meta.env.DEV && weaponSetStrip) {
      weaponSetStrip.style.display = "none";
    }
    this.hudBarsView = new HudBarsView(
      {
        playerFaceElement: deps.playerFaceElement,
        playerNameElement: deps.playerNameElement,
        playerLevelElement: deps.playerLevelElement,
        hpFillElement: deps.hpFillElement,
        hpTextElement: deps.hpTextElement,
        mpFillElement: deps.mpFillElement,
        mpTextElement: deps.mpTextElement,
        xpFillElement: deps.xpFillElement,
        xpTextElement: deps.xpTextElement,
        timerElement: deps.timerElement,
        farmStatsElement: deps.farmStatsElement,
        weaponSetStrip,
      },
      (set) => {
        void this.renderer.playerView.setWeaponSet(set);
        this.hudBarsView.setActiveWeaponSet(set);
      },
    );

    this.panel = new InteractionPanel(
      deps.interactionPanelElement,
      (id) => this.session.confirmInteraction(id),
      () => {
        this.session.closePanel();
        this.syncUiOpen();
      },
    );

    this.session = new CityGameSession(
      this.renderer,
      this.bus,
      deps.canvas,
      this.panel,
      this.input,
    );

    this.session.onHud((hud) => this.renderHud(hud));

    this.panels = new GamePanels(deps.gamePanelsElement, this.session);

    this.skillBarView = new SkillBarView(deps.skillBarElement, (index) => {
      this.session.forceSkillSlot(index);
    });

    this.dropLogView = new DropLogView(deps.dropLogElement);

    const btnSettings = deps.hudToolsElement.querySelector<HTMLButtonElement>("#btn-settings");
    this.settingsPanel = new SettingsPanel(deps.settingsOverlayElement, btnSettings, {
      applyArmorAura: (enabled) => this.session.setArmorAuraEnabled(enabled),
      applyShadows: (enabled) => this.renderer.setShadowsEnabled(enabled),
      onChangeCharacter: () => void this.leaveToBoot("select"),
      onLogout: () => void this.leaveToBoot("login"),
      showToast: (text, kind) => this.showToast(text, kind),
      onOpenChange: () => this.syncUiOpen(),
    });

    this.bus.on("game:mode-changed", ({ mode }) => {
      this.state.setMode(mode);
    });

    this.bus.on("session:result", ({ text }) => {
      this.resultOverlay.hidden = !text;
      if (text) this.resultOverlay.textContent = text;
    });

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
        this.syncUiOpen();
        return;
      }
      if (panel === "person" || panel === "skills" || panel === "inv") {
        this.panels.open(panel);
        this.syncUiOpen();
      }
    });

    this.autosaveTimer = window.setInterval(() => {
      if (!this.entered || !this.modeAllowsSave()) return;
      if (!this.session.saves.hasDirty() && !saveVault.hasPendingCritical()) return;
      void this.session.saves.checkpoint();
    }, 30000);

    window.addEventListener("pagehide", this.onPageHide);
    document.addEventListener("visibilitychange", this.onVisibility);

    saveVault.onStatus((status) => this.renderSaveStatus(status));

    this.state.subscribe((state) => {
      this.debugHud.setVisible(state.debugHudVisible);
      this.deathOverlay.hidden = state.mode !== "DEAD";
      this.input.setMode(state.mode);
    });

    this.bus.on("player:near-interactable", () => {
      this.hint.hidden = true;
    });

    this.loop = new GameLoop((dt) => this.tick(dt));
    this.bindResize(deps.canvas);
    this.bindWheelZoom(deps.canvas);
    this.bindInputActions();
    this.bindJuiceToasts();
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

  private bindInputActions(): void {
    this.input.registerAction("panel.person", () => {
      if (!this.entered) return;
      if (this.wireUi) this.wireUi.toggle("person");
      else this.panels.toggle("person");
      this.syncUiOpen();
    });

    this.input.registerAction("panel.skills", () => {
      if (!this.entered) return;
      if (this.wireUi) this.wireUi.toggle("skills");
      else this.panels.toggle("skills");
      this.syncUiOpen();
    });

    this.input.registerAction("panel.inv", () => {
      if (!this.entered) return;
      if (this.wireUi) this.wireUi.toggle("inv");
      else this.panels.toggle("inv");
      this.syncUiOpen();
    });

    this.input.registerAction("panel.vault", () => {
      if (!this.entered) return;
      if (this.wireUi) this.wireUi.toggle("vault");
      this.syncUiOpen();
    });

    this.input.registerAction("ui.escape", () => {
      this.dismissUiLikeEscape();
    });

    if (import.meta.env.DEV) {
      this.input.registerAction("debug.toggle", () => {
        this.state.setDebugHudVisible(!this.state.getState().debugHudVisible);
      });
      this.input.registerAction("debug.addLevel", () => {
        this.session.debug.addLevels(1);
      });
      this.input.registerAction("debug.spendAll", () => {
        this.session.debug.spendAll("FOR");
      });
      this.input.registerAction("debug.evolve", () => {
        const evolved = this.session.tryEvolve();
        if (!evolved.ok && evolved.reason) this.showToast(evolved.reason, "dungeon");
      });
      this.input.registerAction("debug.timer", () => {
        this.session.debug.setTimer(3);
      });
    }
  }

  private async leaveToBoot(mode: "login" | "select"): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    this.settingsPanel.close();
    this.syncUiOpen();
    const startedAt = performance.now();
    const saved = await Promise.race([
      this.session.saves.checkpoint().then(() => !saveVault.hasPendingCritical()),
      new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), LEAVE_SAVE_TIMEOUT_MS)),
    ]);
    if (!saved) {
      saveVault.writeMirror();
      this.showToast("Falha ao salvar: o progresso mais recente pode se perder.", "dungeon");
      const left = LEAVE_SAVE_TIMEOUT_MS - (performance.now() - startedAt);
      await new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, Math.min(LEAVE_WARNING_MS, left))));
    }
    clearBootCharacter();
    let idle = saved;
    if (mode === "login") {
      const left = LEAVE_SAVE_TIMEOUT_MS - (performance.now() - startedAt);
      idle = await Promise.race([
        saveVault.logout().then(() => true),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), Math.max(0, left))),
      ]);
    }
    if (idle) await accountLock.release();
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
    const pendingCritical = saveVault.hasPendingCritical();
    if (status === "saving") el.textContent = "Salvando…";
    else if (status === "saved") el.textContent = "Salvo";
    else if (status === "error") el.textContent = pendingCritical ? "Falha ao salvar · progresso pendente" : "Falha ao salvar";
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

  private isUiOpen(): boolean {
    return (
      (this.wireUi ? this.wireUi.isOpen() : this.panels.isOpen()) ||
      this.panel.isOpen() ||
      this.settingsPanel.isOpen()
    );
  }

  isPanelsOpen(): boolean {
    return this.isUiOpen();
  }

  private syncUiOpen(): void {
    this.input.setUiOpen(this.isUiOpen());
  }

  start(character: BootCharacter): void {
    if (accountLock.current() !== bootAccountId(character)) {
      clearBootCharacter();
      window.location.reload();
      return;
    }
    this.session.saveService.setProfileId(character.id);
    void this.beginFromSave(character);
  }

  private async beginFromSave(character: BootCharacter): Promise<void> {
    let loaded: LoadSaveResult;
    try {
      loaded = await this.session.loadSave();
    } catch {
      loaded = { status: "error" };
    }
    if (loaded.status === "error") {
      this.session.saveUnreadable = true;
      this.showSaveError(character);
      return;
    }
    if (loaded.status === "absent") {
      this.session.applyBootCharacter(character);
    }
    try {
      const view = this.currentViewModel();
      this.wireUi = await WireUi.mount(this.wireHost, view);
      this.wireUi.setOnOpenChange(() => this.syncUiOpen());
      this.wireHost.hidden = false;
      window.dispatchEvent(new Event("resize"));
    } catch (error) {
      console.warn("[UAIDZIN] wire UI falhou, usando painéis legados", error);
      this.wireUi = null;
    }
    await this.session.start();
    this.loop.start();
    this.enterGame();
    bindHud(
      { face: this.playerFace, name: this.playerName, level: this.playerLevel },
      this.currentViewModel(),
    );
    this.wireUi?.applyCharacter(this.currentViewModel());
    console.info("[UAIDZIN] ready", character.name);
  }

  private showSaveError(character: BootCharacter): void {
    const retry = this.saveErrorOverlay.querySelector<HTMLButtonElement>("#btn-save-error-retry");
    const back = this.saveErrorOverlay.querySelector<HTMLButtonElement>("#btn-save-error-back");
    this.saveErrorOverlay.classList.add("open");
    if (retry) {
      retry.onclick = () => {
        this.saveErrorOverlay.classList.remove("open");
        void this.beginFromSave(character);
      };
    }
    if (back) {
      back.onclick = () => {
        clearBootCharacter();
        window.location.reload();
      };
    }
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
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("pagehide", this.onPageHide);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvasElement.removeEventListener("wheel", this.onWheel);
    this.input.dispose();
    this.session.dispose();
    this.renderer.dispose();
  }

  private renderHud(hud: SessionHud): void {
    this.lastHud = hud;
    this.hudBarsView.update(hud);
    const weaponSet = this.renderer.playerView.getWeaponSet() || "sword-shield";
    this.hudBarsView.setActiveWeaponSet(weaponSet);
    this.skillBarView.update(hud.skills, Boolean(this.wireUi));
    this.dropLogView.update(hud.drops);
    if (hud.lootToast) this.showToast(hud.lootToast, hud.uiToastKind);
  }

  private handleConsecutiveErrors(): void {
    const mode = this.state.getMode();
    if (mode !== "CITY") {
      void this.session.saves.checkpoint();
      this.session.returnToCityWithFade();
      this.errors.resetConsecutive();
    } else {
      this.loop.stop();
      this.showFatalErrorScreen();
    }
  }

  private showFatalErrorScreen(): void {
    let el = document.getElementById("fatal-error-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "fatal-error-overlay";
      el.style.cssText =
        "position:fixed;inset:0;background:#100c08;color:#f0e6d0;display:flex;align-items:center;justify-content:center;font-size:18px;font-family:serif;z-index:999999;text-align:center;padding:24px;";
      document.body.appendChild(el);
    }
    el.textContent = "O jogo encontrou um erro. Recarregue a página.";
    el.hidden = false;
  }

  private tick(deltaSeconds: number): void {
    this.errors.beginFrame();
    try {
      this.clock.advance(deltaSeconds);
      if (this.toastTimer > 0) {
        this.toastTimer -= deltaSeconds;
        if (this.toastTimer <= 0) {
          this.toastEl.hidden = true;
          this.lastToastText = "";
        }
      }
      const scaled = deltaSeconds * this.timeScale;
      this.session.update(
        scaled,
        this.cachedWidth,
        this.cachedHeight,
        this.isUiOpen() || !this.entered,
      );
      const char = this.session.character;
      const timer = this.lastHud?.timer;
      this.debugHud.update({
        mode: this.state.getMode(),
        elapsed: this.clock.getElapsedSeconds(),
        extra: `hp ${char.hp}/${char.maxHp} · mp ${char.mp}/${char.maxMp} · ${this.session.worlds.getCurrentId() ?? "-"} · timer ${timer != null ? formatMMSS(Number(timer)) : "--"} · kills ${this.session.dungeonRun.getKills()}`,
        errorStats: this.errors.getStats(),
      });
    } catch (error) {
      this.errors.report(error, "GameApp.tick");
    } finally {
      const consecutive = this.errors.endFrame();
      if (consecutive >= 5) {
        this.handleConsecutiveErrors();
      }
    }
  }

  private bindResize(canvas: HTMLCanvasElement): void {
    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.onWindowResize);
      if (canvas.parentElement) this.resizeObserver.observe(canvas.parentElement);
    }
  }

  private bindWheelZoom(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private dismissUiLikeEscape(): void {
    if (this.settingsPanel.isOpen()) {
      this.settingsPanel.close();
      this.syncUiOpen();
      return;
    }
    if (this.panel.isOpen()) {
      this.panel.close();
      this.syncUiOpen();
      return;
    }
    if (this.wireUi) {
      const handled = this.wireUi.handleEscape();
      this.syncUiOpen();
      if (handled) return;
    }
    if (this.panels.isOpen()) {
      this.panels.close();
      this.syncUiOpen();
    }
  }
}

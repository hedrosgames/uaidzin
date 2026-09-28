import type { GameApp } from "./app/GameApp";
import { runBootFlow } from "./app/BootFlow";
import { LoadingScreen } from "./ui/LoadingScreen";
import "./style.css";

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento obrigatório ausente: #${id}`);
  return el as T;
}

async function bootstrap(): Promise<GameApp> {
  const character = await runBootFlow(document.body);
  const loading = new LoadingScreen(document.body);
  let app: GameApp;
  try {
    const { createGameApp } = await import("./app/GameCompositionRoot");
    app = createGameApp({
      canvas: requireElement<HTMLCanvasElement>("game-canvas"),
      debugHudElement: requireElement<HTMLElement>("debug-hud"),
      interactionPanelElement: requireElement<HTMLElement>("interaction-panel"),
      interactionHintElement: requireElement<HTMLElement>("interaction-hint"),
      playerFrameElement: requireElement<HTMLElement>("player-frame"),
      playerFaceElement: requireElement<HTMLImageElement>("player-face-img"),
      playerNameElement: requireElement<HTMLElement>("player-name"),
      playerLevelElement: requireElement<HTMLElement>("player-level"),
      hpFillElement: requireElement<HTMLElement>("hp-fill"),
      hpTextElement: requireElement<HTMLElement>("hp-text"),
      mpFillElement: requireElement<HTMLElement>("mp-fill"),
      mpTextElement: requireElement<HTMLElement>("mp-text"),
      xpFillElement: requireElement<HTMLElement>("xp-fill"),
      xpTextElement: requireElement<HTMLElement>("xp-text"),
      deathOverlayElement: requireElement<HTMLElement>("death-overlay"),
      timerElement: requireElement<HTMLElement>("dungeon-timer"),
      farmStatsElement: requireElement<HTMLElement>("farm-stats"),
      dropLogElement: requireElement<HTMLElement>("drop-log"),
      resultOverlayElement: requireElement<HTMLElement>("result-overlay"),
      wireUiElement: requireElement<HTMLElement>("wire-ui"),
      hudToolsElement: requireElement<HTMLElement>("hud-tools"),
      settingsOverlayElement: requireElement<HTMLElement>("overlay-settings"),
      saveErrorOverlayElement: requireElement<HTMLElement>("overlay-save-error"),
      toastElement: requireElement<HTMLElement>("ui-toast"),
    });
    window.addEventListener("error", (event) => {
      app.errors.report(event.error ?? event.message, "window.error");
    });
    window.addEventListener("unhandledrejection", (event) => {
      app.errors.report(event.reason, "window.unhandledrejection");
    });
    app.onFirstFrame(() => {
      void loading.dismiss();
    });
    await app.start(character);
    return app;
  } catch (error) {
    console.error("[UAIDZIN] falha no carregamento", error);
    loading.showError("Falha ao carregar o jogo. Verifique sua conexão e tente novamente.", () => {
      window.location.reload();
    });
    throw error;
  }
}

void bootstrap().catch((error) => {
  console.error("[UAIDZIN] falha no bootstrap", error);
});

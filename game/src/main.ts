import { createGameApp } from "./app/GameCompositionRoot";
import type { GameApp } from "./app/GameApp";
import { releaseBootSceneFade, runBootFlow } from "./app/BootFlow";
import "./style.css";

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento obrigatório ausente: #${id}`);
  return el as T;
}

async function bootstrap(): Promise<GameApp> {
  const app = createGameApp({
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
    skillBarElement: requireElement<HTMLElement>("skill-bar"),
    deathOverlayElement: requireElement<HTMLElement>("death-overlay"),
    timerElement: requireElement<HTMLElement>("dungeon-timer"),
    farmStatsElement: requireElement<HTMLElement>("farm-stats"),
    dropLogElement: requireElement<HTMLElement>("drop-log"),
    resultOverlayElement: requireElement<HTMLElement>("result-overlay"),
    gamePanelsElement: requireElement<HTMLElement>("game-panels"),
    wireUiElement: requireElement<HTMLElement>("wire-ui"),
    hudToolsElement: requireElement<HTMLElement>("hud-tools"),
    settingsOverlayElement: requireElement<HTMLElement>("overlay-settings"),
    toastElement: requireElement<HTMLElement>("ui-toast"),
    helpBarElement: document.querySelector(".help-bar") as HTMLElement,
  });
  const character = await runBootFlow(document.body);
  app.start(character);
  await releaseBootSceneFade();
  window.addEventListener("beforeunload", () => app.dispose());
  return app;
}

void bootstrap().catch((error) => {
  console.error("[UAIDZIN] falha no bootstrap", error);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#d45555;padding:16px;font-family:monospace">Falha ao iniciar o UAIDZIN.\n${String(error)}</pre>`,
  );
});

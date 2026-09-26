import { normalizeBootCharacter } from "../persistence/migrations";
import { saveVault } from "../persistence/SaveVault";

export interface BootCharacter {
  id: string;
  slotIndex?: number;
  name: string;
  classId: string;
  level: number;
  evolution: string;
  gold?: number;
  attrs?: { FOR: number; DES: number; CONS: number; INT: number };
  trees?: { controle: number; magia: number; fisica: number };
  spec?: { controle: number; magia: number; fisica: number };
  resets?: number;
}

const ACTIVE_KEY = "uaidzin_active_char";
export const SCENE_FADE_MS = 420;

declare global {
  interface Window {
    __UAIDZIN_SKIP_BOOT__?: BootCharacter;
  }
}

export interface SceneFadeOverlay {
  element: HTMLDivElement;
  fadeIn(): Promise<void>;
  fadeOut(): Promise<void>;
  holdBlack(): void;
  dispose(): void;
}

let bootSceneFade: SceneFadeOverlay | null = null;

function waitOpacityTransition(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener("transitionend", onEnd);
      resolve();
    };
    const onEnd = (ev: TransitionEvent) => {
      if (ev.target === el && ev.propertyName === "opacity") finish();
    };
    el.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, SCENE_FADE_MS + 80);
  });
}

export function createSceneFadeOverlay(host: HTMLElement = document.body): SceneFadeOverlay {
  const el = document.createElement("div");
  el.id = "uaidzin-scene-fade";
  el.setAttribute(
    "style",
    [
      "position:fixed",
      "inset:0",
      "width:100%",
      "height:100%",
      "background:#000",
      "z-index:250",
      "opacity:0",
      "pointer-events:none",
      `transition:opacity ${SCENE_FADE_MS}ms ease`,
    ].join(";"),
  );
  host.appendChild(el);

  return {
    element: el,
    holdBlack() {
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
      void el.offsetWidth;
      el.style.transition = `opacity ${SCENE_FADE_MS}ms ease`;
    },
    async fadeIn() {
      el.style.pointerEvents = "auto";
      void el.offsetWidth;
      el.style.opacity = "1";
      await waitOpacityTransition(el);
    },
    async fadeOut() {
      void el.offsetWidth;
      el.style.opacity = "0";
      await waitOpacityTransition(el);
      el.style.pointerEvents = "none";
    },
    dispose() {
      el.remove();
    },
  };
}

export async function releaseBootSceneFade(): Promise<void> {
  if (!bootSceneFade) return;
  await bootSceneFade.fadeOut();
  bootSceneFade.dispose();
  bootSceneFade = null;
}

function readStoredCharacter(): BootCharacter | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BootCharacter;
    if (!data?.id || !data?.name || !data?.classId) return null;
    return data;
  } catch {
    return null;
  }
}

export function rememberBootCharacter(character: BootCharacter): void {
  try {
    sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(character));
  } catch {
    
  }
}

export function clearBootCharacter(): void {
  try {
    sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    
  }
}

export function clearBootSession(): void {
  try {
    sessionStorage.removeItem("uaidzin_session_v1");
  } catch {
    
  }
  saveVault.logout();
}

function hasBootSession(): boolean {
  return !!saveVault.getSession();
}

async function storedCharacterStillValid(character: BootCharacter): Promise<boolean> {
  if (!hasBootSession()) return false;
  try {
    const slots = await saveVault.listSlots();
    return saveVault.slotExists(slots, character.id);
  } catch {
    return false;
  }
}

function waitFrameLoad(frame: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    const onLoad = () => {
      frame.removeEventListener("load", onLoad);
      resolve();
    };
    frame.addEventListener("load", onLoad);
  });
}

export async function runBootFlow(host: HTMLElement = document.body): Promise<BootCharacter> {
  await saveVault.bootstrap();

  const skip = normalizeBootCharacter(window.__UAIDZIN_SKIP_BOOT__);
  if (skip) {
    rememberBootCharacter(skip);
    return skip;
  }

  const stored = normalizeBootCharacter(readStoredCharacter());
  if (stored) {
    if (await storedCharacterStillValid(stored)) return stored;
    clearBootCharacter();
  }

  return new Promise((resolve) => {
    const sceneFade = createSceneFadeOverlay(host);
    bootSceneFade = sceneFade;

    const frame = document.createElement("iframe");
    frame.title = "UAIDZIN Login";
    frame.setAttribute(
      "style",
      "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:200;background:#000;",
    );

    let fadeChain: Promise<void> = Promise.resolve();
    const enqueue = (task: () => Promise<void>): Promise<void> => {
      fadeChain = fadeChain.then(task, task);
      return fadeChain;
    };

    const goBootPage = (url: string) =>
      enqueue(async () => {
        await sceneFade.fadeIn();
        const loaded = waitFrameLoad(frame);
        frame.src = url;
        await loaded;
        await sceneFade.fadeOut();
      });

    sceneFade.holdBlack();
    const firstLoad = waitFrameLoad(frame);
    frame.src = hasBootSession() ? "/boot/02-selecao-personagem.html" : "/boot/01-login.html";
    host.appendChild(frame);
    void enqueue(async () => {
      await firstLoad;
      await sceneFade.fadeOut();
    });

    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        character?: BootCharacter;
        session?: { user: string; key: string; at: number; salt: string; mode: string };
      } | null;
      if (!data?.type) return;
      if (data.type === "uaidzin-boot-login-ok") {
        if (data.session?.user && data.session?.key) {
          try {
            sessionStorage.setItem("uaidzin_session_v1", JSON.stringify(data.session));
          } catch {
            
          }
          const encoded = encodeURIComponent(JSON.stringify(data.session));
          void goBootPage(`/boot/02-selecao-personagem.html#s=${encoded}`);
          return;
        }
        void goBootPage("/boot/02-selecao-personagem.html");
        return;
      }
      if (data.type === "uaidzin-boot-need-login") {
        clearBootSession();
        void goBootPage("/boot/01-login.html");
        return;
      }
      if (data.type !== "uaidzin-boot-enter" || !data.character?.id) return;
      const character = normalizeBootCharacter(data.character);
      if (!character) return;
      window.removeEventListener("message", onMessage);
      rememberBootCharacter(character);
      void enqueue(async () => {
        await sceneFade.fadeIn();
        frame.remove();
        resolve(character);
      });
    };
    window.addEventListener("message", onMessage);
  });
}

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

declare global {
  interface Window {
    __UAIDZIN_SKIP_BOOT__?: BootCharacter;
  }
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

export async function runBootFlow(host: HTMLElement = document.body): Promise<BootCharacter> {
  await saveVault.bootstrap();

  const skip = window.__UAIDZIN_SKIP_BOOT__;
  if (skip?.id && skip.name && skip.classId) {
    rememberBootCharacter(skip);
    return skip;
  }

  const stored = readStoredCharacter();
  if (stored) {
    if (await storedCharacterStillValid(stored)) return stored;
    clearBootCharacter();
  }

  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.src = hasBootSession() ? "/boot/02-selecao-personagem.html" : "/boot/01-login.html";
    frame.title = "UAIDZIN Login";
    frame.setAttribute(
      "style",
      "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:200;background:#000;",
    );
    host.appendChild(frame);

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
          frame.src = `/boot/02-selecao-personagem.html#s=${encoded}`;
          return;
        }
        frame.src = "/boot/02-selecao-personagem.html";
        return;
      }
      if (data.type === "uaidzin-boot-need-login") {
        clearBootSession();
        frame.src = "/boot/01-login.html";
        return;
      }
      if (data.type !== "uaidzin-boot-enter" || !data.character?.id) return;
      window.removeEventListener("message", onMessage);
      rememberBootCharacter(data.character);
      frame.remove();
      resolve(data.character);
    };
    window.addEventListener("message", onMessage);
  });
}

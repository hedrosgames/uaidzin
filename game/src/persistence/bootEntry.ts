import { b64, hasSubtleCrypto, randomBytes } from "./crypto/CryptoCodec";
import { emptyAttrs, type AuthSession } from "./SaveTypes";
import { DB_VERSION } from "./SaveStore";
import { saveVault } from "./SaveVault";

const GOOGLE_LOCAL_KEY = "uaidzin_google_local_v1";
const ACTIVE_KEY = "uaidzin_active_char";

function randomHex(byteCount: number): string {
  return Array.from(randomBytes(byteCount), (b) => b.toString(16).padStart(2, "0")).join("");
}

function googleIdentity(): { id: string; secret: string } {
  try {
    const data = JSON.parse(localStorage.getItem(GOOGLE_LOCAL_KEY) || "null") as { id?: unknown; secret?: unknown } | null;
    if (typeof data?.id === "string" && data.id.startsWith("google:") && typeof data.secret === "string" && data.secret) {
      return { id: data.id, secret: data.secret };
    }
  } catch {

  }
  const data = { id: "google:" + randomHex(8), secret: b64(randomBytes(24)) };
  localStorage.setItem(GOOGLE_LOCAL_KEY, JSON.stringify(data));
  return data;
}

async function loginGoogleSimulated() {
  try {
    await saveVault.bootstrap();
    const identity = googleIdentity();
    const isNew = !saveVault.auth.listAccountIds().includes(identity.id);
    if (isNew) {
      const reg = await saveVault.auth.register(identity.id, identity.secret);
      if (!reg.ok) return { ok: false, error: reg.error || "Não foi possível criar a conta Google." };
    }
    const res = await saveVault.login(identity.id, identity.secret);
    if (!res.ok) return { ok: false, error: res.error || "Falha ao entrar com Google." };
    return { ok: true, session: res.session, userId: identity.id, created: isNew };
  } catch {
    return { ok: false, error: "Falha ao entrar com Google." };
  }
}

async function resetAdminAccount() {
  await saveVault.wipeAccount("admin");
  await saveVault.logout();
  return saveVault.auth.bootstrap();
}

function requireSession(): AuthSession | null {
  const session = saveVault.getSession();
  if (session) return session;
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "uaidzin-boot-need-login" }, window.location.origin);
    return null;
  }
  window.location.href = "01-login.html";
  return null;
}

async function loadSave(session: AuthSession) {
  try {
    return await saveVault.loadAccount(session, true);
  } catch {
    return { corrupted: true };
  }
}

async function saveData(_session: AuthSession, data: { slots?: unknown; vault?: unknown }) {
  await saveVault.writeAccount({ slots: data?.slots, vault: data?.vault });
  return true;
}

function clearActiveIf(profileId: string | undefined, slotIndex: number): void {
  try {
    const active = JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || "null") as { id?: string; slotIndex?: number } | null;
    if (active && (active.id === profileId || active.slotIndex === slotIndex)) sessionStorage.removeItem(ACTIVE_KEY);
  } catch {

  }
}

async function deleteSlot(session: AuthSession, slotIndex: number) {
  const before = (await saveVault.loadAccount(session)).slots[slotIndex];
  await saveVault.deleteSlot(slotIndex);
  clearActiveIf(before?.profileId, slotIndex);
  return (await saveVault.loadAccount(session)).slots;
}

function createSlot(_session: AuthSession, slotIndex: number, input: { classId: string; name: string }) {
  return saveVault.reserveSlot(slotIndex, input.classId, input.name);
}

(window as unknown as { UaidzinSave: unknown }).UaidzinSave = {
  bootstrap: () => saveVault.bootstrap(),
  resetAdminAccount,
  ensureAccount: (userId: string, password: string) => saveVault.auth.ensureAccount(userId, password),
  registerAccount: (userId: string, password: string) => saveVault.auth.register(userId, password),
  loginGoogleSimulated,
  login: (userId: string, password: string) => saveVault.login(userId, password),
  logout: () => saveVault.logout(),
  getSession: () => saveVault.getSession(),
  requireSession,
  loadSave,
  loadEquippedArmor: async (profileId: string) => {
    const loaded = await saveVault.loadCharacter(profileId);
    return loaded.status === "ok" ? loaded.payload.equipment?.equipped?.armor || null : null;
  },
  saveData,
  createSlot,
  deleteSlot,
  clearProfileStorage: (profileId: string) => saveVault.wipeProfile(profileId),
  defaultAttrs: emptyAttrs,
  dbVersion: DB_VERSION,
  rememberUser: (userId: string | null) => saveVault.auth.rememberUserId(userId),
  readRememberedUser: () => saveVault.auth.readRememberedUserId(),
  _debug: { hasSubtle: hasSubtleCrypto() },
};

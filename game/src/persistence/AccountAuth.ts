import {
  b64,
  deriveBits,
  fallbackKey,
  FALLBACK_ITERATIONS,
  hashPassword,
  hasSubtleCrypto,
  PBKDF2_ITERATIONS,
  randomBytes,
  unb64,
} from "./crypto/CryptoCodec";
import type { AccountRecord, AuthSession } from "./SaveTypes";

export const ACCOUNTS_KEY = "uaidzin_accounts_v1";
export const SESSION_KEY = "uaidzin_session_v1";
export const REMEMBER_KEY = "uaidzin_login";
const ACCOUNTS_LOCK = "uaidzin:accounts";

function readAccounts(): Record<string, AccountRecord> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}") as Record<string, AccountRecord>;
  } catch {
    return {};
  }
}

function writeAccounts(acc: Record<string, AccountRecord>): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
}

function withAccounts<T>(task: (acc: Record<string, AccountRecord>) => T): Promise<T> {
  const run = () => task(readAccounts());
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? (locks.request(ACCOUNTS_LOCK, run) as Promise<T>) : Promise.resolve().then(run);
}

async function newRecord(userId: string, password: string): Promise<AccountRecord> {
  const saltBytes = randomBytes(16);
  return {
    id: userId,
    salt: b64(saltBytes),
    hash: await hashPassword(password, saltBytes),
    createdAt: Date.now(),
    mode: hasSubtleCrypto() ? "aes" : "fallback",
  };
}

async function verifyPassword(rec: AccountRecord, password: string): Promise<boolean> {
  const salt = unb64(rec.salt);
  if (rec.mode === "aes" || (rec.mode !== "fallback" && hasSubtleCrypto())) {
    const hash = await hashPassword(password, salt);
    if (hash === rec.hash) return true;
  }
  const legacy = b64(fallbackKey(password, rec.salt, 2000));
  return legacy === rec.hash;
}

export class AccountAuth {
  async ensureAccount(userId: string, password: string): Promise<AccountRecord> {
    const existing = readAccounts()[userId];
    if (existing) return existing;
    const rec = await newRecord(userId, password);
    return withAccounts((acc) => {
      if (acc[userId]) return acc[userId];
      acc[userId] = rec;
      writeAccounts(acc);
      return rec;
    });
  }

  async register(
    userId: string,
    password: string,
  ): Promise<{ ok: true; account: AccountRecord } | { ok: false; error: string }> {
    const id = String(userId || "").trim();
    if (!id || !password) return { ok: false, error: "Preencha login e senha." };
    const taken = { ok: false as const, error: "Este login já está em uso." };
    if (readAccounts()[id]) return taken;
    const rec = await newRecord(id, password);
    return withAccounts((acc) => {
      if (acc[id]) return taken;
      acc[id] = rec;
      writeAccounts(acc);
      return { ok: true as const, account: rec };
    });
  }

  async bootstrap(): Promise<AccountRecord> {
    const existing = readAccounts().admin;
    if (existing?.salt && existing?.hash) return existing;
    return this.ensureAccount("admin", "admin");
  }

  async login(
    userId: string,
    password: string,
  ): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
    try {
      await this.bootstrap();
      const rec = readAccounts()[userId];
      if (!rec) return { ok: false, error: "Conta não encontrada." };
      const ok = await verifyPassword(rec, password);
      if (!ok) return { ok: false, error: "Login ou senha inválidos." };

      const useAes = hasSubtleCrypto();
      let keyB64: string;
      let upgrade: Pick<AccountRecord, "hash" | "mode"> | null = null;
      if (useAes) {
        keyB64 = b64(await deriveBits(password, unb64(rec.salt), PBKDF2_ITERATIONS));
        if (rec.mode !== "aes" || rec.hash === b64(fallbackKey(password, rec.salt, 2000))) {
          upgrade = { hash: await hashPassword(password, unb64(rec.salt)), mode: "aes" };
        }
      } else {
        keyB64 = b64(fallbackKey(password, rec.salt, FALLBACK_ITERATIONS));
        if (rec.mode !== "fallback") upgrade = { hash: rec.hash, mode: "fallback" };
      }
      if (upgrade) {
        const next = upgrade;
        await withAccounts((acc) => {
          if (acc[userId]?.salt !== rec.salt) return;
          acc[userId] = { ...acc[userId], ...next };
          writeAccounts(acc);
        });
      }

      const session: AuthSession = {
        user: userId,
        at: Date.now(),
        key: keyB64,
        salt: rec.salt,
        mode: useAes ? "aes" : "fallback",
      };
      this.writeSession(session);
      return { ok: true, session };
    } catch {
      return { ok: false, error: "Falha ao entrar." };
    }
  }

  writeSession(session: AuthSession): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      
    }
  }

  getSession(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as AuthSession;
      if (!data?.user || !data?.key) return null;
      return data;
    } catch {
      return null;
    }
  }

  requireSession(): AuthSession | null {
    return this.getSession();
  }

  logout(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("uaidzin_active_char");
    } catch {
      
    }
  }

  rememberUserId(userId: string | null): void {
    try {
      if (!userId) {
        localStorage.removeItem(REMEMBER_KEY);
        return;
      }
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ user: userId }));
    } catch {
      
    }
  }

  readRememberedUserId(): string | null {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as { user?: string; pass?: string };
      if (data.pass != null) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ user: data.user || "" }));
      }
      return data.user || null;
    } catch {
      return null;
    }
  }

  deleteAccountRecord(userId: string): Promise<void> {
    return withAccounts((acc) => {
      delete acc[userId];
      writeAccounts(acc);
    });
  }

  listAccountIds(): string[] {
    return Object.keys(readAccounts());
  }
}

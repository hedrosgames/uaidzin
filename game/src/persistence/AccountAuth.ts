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
    const acc = readAccounts();
    if (acc[userId]) return acc[userId];
    const saltBytes = randomBytes(16);
    const salt = b64(saltBytes);
    const hash = await hashPassword(password, saltBytes);
    const rec: AccountRecord = {
      id: userId,
      salt,
      hash,
      createdAt: Date.now(),
      mode: hasSubtleCrypto() ? "aes" : "fallback",
    };
    acc[userId] = rec;
    writeAccounts(acc);
    return rec;
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
      const acc = readAccounts();
      const rec = acc[userId];
      if (!rec) return { ok: false, error: "Conta não encontrada." };
      const ok = await verifyPassword(rec, password);
      if (!ok) return { ok: false, error: "Login ou senha inválidos." };

      const useAes = hasSubtleCrypto();
      let keyB64: string;
      if (useAes) {
        keyB64 = b64(await deriveBits(password, unb64(rec.salt), PBKDF2_ITERATIONS));
        if (rec.mode !== "aes" || rec.hash === b64(fallbackKey(password, rec.salt, 2000))) {
          rec.hash = await hashPassword(password, unb64(rec.salt));
          rec.mode = "aes";
          acc[userId] = rec;
          writeAccounts(acc);
        }
      } else {
        keyB64 = b64(fallbackKey(password, rec.salt, FALLBACK_ITERATIONS));
        rec.mode = "fallback";
        acc[userId] = rec;
        writeAccounts(acc);
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

  deleteAccountRecord(userId: string): void {
    const acc = readAccounts();
    delete acc[userId];
    writeAccounts(acc);
  }

  listAccountIds(): string[] {
    return Object.keys(readAccounts());
  }
}

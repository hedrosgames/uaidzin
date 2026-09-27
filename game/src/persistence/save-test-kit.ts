import { SESSION_KEY } from "./AccountAuth";
import { b64, encryptJson, importCodecKey, randomBytes } from "./crypto/CryptoCodec";
import type { AccountBlobs, AccountWrite, SaveStore, SectionBlobs } from "./SaveStore";
import { SaveVault } from "./SaveVault";
import { PROFILE_SECTIONS, type AuthSession, type ProfileSection, type SavePayload } from "./SaveTypes";

export class FakeSaveStore {
  readonly sections = new Map<string, SectionBlobs>();
  readonly mirrors = new Map<string, SectionBlobs>();
  readonly accounts = new Map<string, AccountBlobs>();
  readonly vaultMirrors = new Map<string, string>();
  readonly writes: Array<{ profileId: string; sections: ProfileSection[] }> = [];
  accountWrites = 0;
  accountReads = 0;
  failReads = false;
  failAccountReads = false;
  failWrites = false;
  beforeWrite: (() => Promise<void>) | null = null;

  async readAll(profileId: string): Promise<SectionBlobs> {
    if (this.failReads) throw new Error("idb_read_failed");
    return { ...(this.sections.get(profileId) || {}) };
  }

  async readAccount(userId: string): Promise<AccountBlobs> {
    this.accountReads += 1;
    if (this.failAccountReads) throw new Error("idb_read_failed");
    return { ...(this.accounts.get(userId) || {}) };
  }

  private putAccount(account: AccountWrite | null): void {
    if (!account) return;
    const { userId, ...blobs } = account;
    this.accountWrites += 1;
    this.accounts.set(userId, { ...(this.accounts.get(userId) || {}), ...blobs });
  }

  async writeMany(profileId: string | null, blobs: SectionBlobs, account: AccountWrite | null = null): Promise<void> {
    if (this.beforeWrite) await this.beforeWrite();
    if (this.failWrites) throw new Error("idb_write_failed");
    if (profileId) {
      this.writes.push({ profileId, sections: Object.keys(blobs) as ProfileSection[] });
      this.sections.set(profileId, { ...(this.sections.get(profileId) || {}), ...blobs });
    }
    this.putAccount(account);
  }

  async clearLegacyProfile(): Promise<void> {}

  async clearProfile(profileId: string, account: AccountWrite | null = null): Promise<void> {
    if (this.failWrites) throw new Error("idb_delete_failed");
    this.sections.delete(profileId);
    this.mirrors.delete(profileId);
    this.putAccount(account);
  }

  readMirror(profileId: string): SectionBlobs | null {
    return this.mirrors.get(profileId) ?? null;
  }

  writeMirror(profileId: string, blobs: SectionBlobs): boolean {
    this.mirrors.set(profileId, { ...blobs });
    return true;
  }

  readVaultMirror(userId: string): string | null {
    return this.vaultMirrors.get(userId) ?? null;
  }

  writeVaultMirror(userId: string, envelope: string): boolean {
    this.vaultMirrors.set(userId, envelope);
    return true;
  }

  clearVaultMirror(userId: string): void {
    this.vaultMirrors.delete(userId);
  }

  async clearAccount(userId: string): Promise<void> {
    this.accounts.delete(userId);
    this.vaultMirrors.delete(userId);
  }

  async wipeAllUaidzinStorage(): Promise<void> {
    this.sections.clear();
    this.mirrors.clear();
    this.accounts.clear();
    this.vaultMirrors.clear();
  }
}

export function installSession(user = "admin", mode: AuthSession["mode"] = "aes"): AuthSession {
  const session: AuthSession = { user, at: Date.now(), key: b64(randomBytes(32)), salt: b64(randomBytes(16)), mode };
  const map = new Map<string, string>([[SESSION_KEY, JSON.stringify(session)]]);
  (globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  return session;
}

export function removeSession(): void {
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
}

export function makeVault(): { store: FakeSaveStore; vault: SaveVault } {
  const store = new FakeSaveStore();
  return { store, vault: new SaveVault(store as unknown as SaveStore) };
}

export async function encryptSections(session: AuthSession, payload: SavePayload): Promise<SectionBlobs> {
  const codec = await importCodecKey(session);
  const out: SectionBlobs = {};
  for (const section of PROFILE_SECTIONS) {
    const value = section === "meta" ? { saveVersion: payload.saveVersion, ...payload.meta } : payload[section];
    out[section] = await encryptJson(codec, value);
  }
  return out;
}

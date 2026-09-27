import { PROFILE_SECTIONS, type ProfileSection } from "./SaveTypes";

const DB_NAME = "uaidzin";
const LEGACY_STORE = "save";
const SECTIONS_STORE = "sections";
export const DB_VERSION = 3;
const OPEN_BLOCKED_TIMEOUT_MS = 5000;

export type SectionBlobs = Partial<Record<ProfileSection, string>>;

export type AccountBlobs = { slots?: string; vault?: string };

export type AccountWrite = AccountBlobs & { userId: string };

export function lsProfileKey(profileId: string): string {
  return `uaidzin.save.${profileId}`;
}

export function lsProfilePrevKey(profileId: string): string {
  return `uaidzin.save.${profileId}:prev`;
}

export function idbProfileKey(profileId: string): string {
  return `profile:${profileId}`;
}

export function idbProfilePrevKey(profileId: string): string {
  return `profile:${profileId}:prev`;
}

export function sectionKey(profileId: string, section: ProfileSection): string {
  return `profile:${profileId}:${section}`;
}

export function mirrorKey(profileId: string): string {
  return `uaidzin.mirror.${profileId}`;
}

export function vaultMirrorKey(userId: string): string {
  return `uaidzin.mirror.vault.${userId}`;
}

export function accountKey(userId: string, part: keyof AccountBlobs): string {
  return `account:${userId}:${part}`;
}

function putAccount(store: IDBObjectStore, account: AccountWrite | null): void {
  if (!account) return;
  if (account.slots !== undefined) store.put(account.slots, accountKey(account.userId, "slots"));
  if (account.vault !== undefined) store.put(account.vault, accountKey(account.userId, "vault"));
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("idb_unavailable"));
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    let blockedTimer: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;
    req.onblocked = () => {
      blockedTimer ??= setTimeout(() => {
        timedOut = true;
        reject(new Error("idb_open_blocked"));
      }, OPEN_BLOCKED_TIMEOUT_MS);
    };
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LEGACY_STORE)) db.createObjectStore(LEGACY_STORE);
      if (!db.objectStoreNames.contains(SECTIONS_STORE)) db.createObjectStore(SECTIONS_STORE);
    };
    req.onsuccess = () => {
      if (blockedTimer) clearTimeout(blockedTimer);
      const db = req.result;
      if (timedOut) {
        db.close();
        return;
      }
      if (!db.objectStoreNames.contains(SECTIONS_STORE) || !db.objectStoreNames.contains(LEGACY_STORE)) {
        db.close();
        reject(new Error("idb_store_missing"));
        return;
      }
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      if (blockedTimer) clearTimeout(blockedTimer);
      reject(new Error("idb_open_failed"));
    };
  }).catch((err: unknown) => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

function runTx(
  stores: string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => void,
  failure: string,
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(stores, mode);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(new Error(failure));
          tx.onabort = () => reject(new Error(failure));
          body(tx);
        } catch {
          reject(new Error(failure));
        }
      }),
  );
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {

  }
}

export class SaveStore {
  async readAll(profileId: string): Promise<SectionBlobs> {
    if (typeof indexedDB === "undefined") return {};
    const db = await openDb();
    return new Promise<SectionBlobs>((resolve, reject) => {
      const out: SectionBlobs = {};
      try {
        const tx = db.transaction(SECTIONS_STORE, "readonly");
        const store = tx.objectStore(SECTIONS_STORE);
        for (const section of PROFILE_SECTIONS) {
          const req = store.get(sectionKey(profileId, section));
          req.onsuccess = () => {
            if (typeof req.result === "string") out[section] = req.result;
          };
          req.onerror = () => reject(new Error("idb_read_failed"));
        }
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(new Error("idb_read_failed"));
        tx.onabort = () => reject(new Error("idb_read_failed"));
      } catch {
        reject(new Error("idb_read_failed"));
      }
    });
  }

  async readAccount(userId: string): Promise<AccountBlobs> {
    if (typeof indexedDB === "undefined") return {};
    const db = await openDb();
    return new Promise<AccountBlobs>((resolve, reject) => {
      const out: AccountBlobs = {};
      try {
        const tx = db.transaction(SECTIONS_STORE, "readonly");
        const store = tx.objectStore(SECTIONS_STORE);
        for (const part of ["slots", "vault"] as const) {
          const req = store.get(accountKey(userId, part));
          req.onsuccess = () => {
            if (typeof req.result === "string") out[part] = req.result;
          };
          req.onerror = () => reject(new Error("idb_read_failed"));
        }
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(new Error("idb_read_failed"));
        tx.onabort = () => reject(new Error("idb_read_failed"));
      } catch {
        reject(new Error("idb_read_failed"));
      }
    });
  }

  writeMany(profileId: string | null, blobs: SectionBlobs, account: AccountWrite | null = null): Promise<void> {
    return runTx(
      [SECTIONS_STORE],
      "readwrite",
      (tx) => {
        const store = tx.objectStore(SECTIONS_STORE);
        if (profileId) {
          for (const section of PROFILE_SECTIONS) {
            const blob = blobs[section];
            if (blob !== undefined) store.put(blob, sectionKey(profileId, section));
          }
        }
        putAccount(store, account);
      },
      "idb_write_failed",
    );
  }

  async clearLegacyProfile(profileId: string): Promise<void> {
    lsRemove(lsProfileKey(profileId));
    lsRemove(lsProfilePrevKey(profileId));
    await runTx(
      [LEGACY_STORE],
      "readwrite",
      (tx) => {
        const store = tx.objectStore(LEGACY_STORE);
        store.delete(idbProfileKey(profileId));
        store.delete(idbProfilePrevKey(profileId));
      },
      "idb_delete_failed",
    );
  }

  async clearProfile(profileId: string, account: AccountWrite | null = null): Promise<void> {
    lsRemove(lsProfileKey(profileId));
    lsRemove(lsProfilePrevKey(profileId));
    lsRemove(mirrorKey(profileId));
    lsRemove(`uaidzin.save`);
    if (typeof indexedDB === "undefined" && !account) return;
    await runTx(
      [SECTIONS_STORE, LEGACY_STORE],
      "readwrite",
      (tx) => {
        const sections = tx.objectStore(SECTIONS_STORE);
        for (const section of PROFILE_SECTIONS) sections.delete(sectionKey(profileId, section));
        const legacy = tx.objectStore(LEGACY_STORE);
        legacy.delete(idbProfileKey(profileId));
        legacy.delete(idbProfilePrevKey(profileId));
        legacy.delete("profile");
        putAccount(sections, account);
      },
      "idb_delete_failed",
    );
  }

  readMirror(profileId: string): SectionBlobs | null {
    const raw = lsGet(mirrorKey(profileId));
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as { sections?: SectionBlobs };
      return data?.sections && typeof data.sections === "object" ? data.sections : null;
    } catch {
      return null;
    }
  }

  writeMirror(profileId: string, blobs: SectionBlobs): boolean {
    return lsSet(mirrorKey(profileId), JSON.stringify({ sections: blobs }));
  }

  readVaultMirror(userId: string): string | null {
    return lsGet(vaultMirrorKey(userId));
  }

  writeVaultMirror(userId: string, envelope: string): boolean {
    return lsSet(vaultMirrorKey(userId), envelope);
  }

  clearVaultMirror(userId: string): void {
    lsRemove(vaultMirrorKey(userId));
  }

  async clearAccount(userId: string): Promise<void> {
    lsRemove(vaultMirrorKey(userId));
    if (typeof indexedDB === "undefined") return;
    await runTx(
      [SECTIONS_STORE],
      "readwrite",
      (tx) => {
        const store = tx.objectStore(SECTIONS_STORE);
        store.delete(accountKey(userId, "slots"));
        store.delete(accountKey(userId, "vault"));
      },
      "idb_delete_failed",
    );
  }

  async wipeAllUaidzinStorage(includeSettings = false): Promise<void> {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith("uaidzin")) {
          if (!includeSettings && key === "uaidzin_settings") continue;
          keys.push(key);
        }
      }
    } catch {

    }
    for (const key of keys) lsRemove(key);
    try {
      sessionStorage.removeItem("uaidzin_session_v1");
      sessionStorage.removeItem("uaidzin_active_char");
    } catch {

    }
    if (typeof indexedDB === "undefined") return;
    await runTx(
      [SECTIONS_STORE, LEGACY_STORE],
      "readwrite",
      (tx) => {
        tx.objectStore(SECTIONS_STORE).clear();
        tx.objectStore(LEGACY_STORE).clear();
      },
      "idb_clear_failed",
    );
  }
}

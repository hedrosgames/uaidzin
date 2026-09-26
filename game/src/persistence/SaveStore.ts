const DB_NAME = "uaidzin";
const STORE = "save";
const DB_VERSION = 2;
const OPEN_BLOCKED_TIMEOUT_MS = 5000;

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

export function lsAccountKey(userId: string): string {
  return `uaidzin_save_v1_${userId}`;
}

export function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    let blockedTimer: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;
    req.onblocked = () => {
      blockedTimer ??= setTimeout(() => {
        timedOut = true;
        resolve(null);
      }, OPEN_BLOCKED_TIMEOUT_MS);
    };
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      if (blockedTimer) clearTimeout(blockedTimer);
      const db = req.result;
      if (timedOut) {
        db.close();
        return;
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.close();
        resolve(null);
        return;
      }
      resolve(db);
    };
    req.onerror = () => resolve(null);
  });
}

async function idbGet(key: string): Promise<string | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) throw new Error("idb_read_failed");
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(new Error("idb_read_failed"));
      tx.onerror = () => reject(new Error("idb_read_failed"));
    } catch (err) {
      reject(err instanceof Error ? err : new Error("idb_read_failed"));
    }
  });
}

async function idbPut(key: string, value: string): Promise<boolean> {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(STORE)) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
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
  async readProfileBlob(profileId: string): Promise<{ blob: string; source: string } | null> {
    const candidates: Array<{ blob: string; source: string }> = [];
    const idb = await idbGet(idbProfileKey(profileId));
    if (idb) candidates.push({ blob: idb, source: "idb" });
    const ls = lsGet(lsProfileKey(profileId));
    if (ls) candidates.push({ blob: ls, source: "ls" });
    const idbPrev = await idbGet(idbProfilePrevKey(profileId));
    if (idbPrev) candidates.push({ blob: idbPrev, source: "idb-prev" });
    const lsPrev = lsGet(lsProfilePrevKey(profileId));
    if (lsPrev) candidates.push({ blob: lsPrev, source: "ls-prev" });
    return candidates[0] || null;
  }

  async readProfileCandidates(profileId: string): Promise<Array<{ blob: string; source: string }>> {
    const candidates: Array<{ blob: string; source: string }> = [];
    const idb = await idbGet(idbProfileKey(profileId));
    const idbPrev = await idbGet(idbProfilePrevKey(profileId));
    if (idb) candidates.push({ blob: idb, source: "idb" });
    const ls = lsGet(lsProfileKey(profileId));
    if (ls && ls !== idb) candidates.push({ blob: ls, source: "ls" });
    if (idbPrev) candidates.push({ blob: idbPrev, source: "idb-prev" });
    const lsPrev = lsGet(lsProfilePrevKey(profileId));
    if (lsPrev) candidates.push({ blob: lsPrev, source: "ls-prev" });
    return candidates;
  }

  async readProfileCurrent(profileId: string): Promise<string | null> {
    try {
      const idb = await idbGet(idbProfileKey(profileId));
      if (idb) return idb;
    } catch {
      return lsGet(lsProfileKey(profileId));
    }
    return lsGet(lsProfileKey(profileId));
  }

  async writeProfileBlob(profileId: string, envelope: string, opts?: { rotateBackup?: boolean }): Promise<void> {
    const rotate = opts?.rotateBackup !== false;
    let current: string | null = null;
    try {
      current = await this.readProfileCurrent(profileId);
    } catch {
      current = lsGet(lsProfileKey(profileId));
    }
    if (rotate && current && current !== envelope) {
      await idbPut(idbProfilePrevKey(profileId), current);
      lsSet(lsProfilePrevKey(profileId), current);
    }
    lsSet(lsProfileKey(profileId), envelope);
    const okIdb = await idbPut(idbProfileKey(profileId), envelope);
    if (!okIdb) {
      const lsOk = lsGet(lsProfileKey(profileId)) === envelope;
      if (!lsOk) throw new Error("idb_write_failed");
    }
  }

  async clearProfile(profileId: string): Promise<void> {
    lsRemove(lsProfileKey(profileId));
    lsRemove(lsProfilePrevKey(profileId));
    lsRemove(`uaidzin.save`);
    await idbDelete(idbProfileKey(profileId));
    await idbDelete(idbProfilePrevKey(profileId));
    await idbDelete("profile");
  }

  readAccountBlob(userId: string): string | null {
    return lsGet(lsAccountKey(userId));
  }

  writeAccountBlob(userId: string, envelope: string): boolean {
    return lsSet(lsAccountKey(userId), envelope);
  }

  clearAccountBlob(userId: string): void {
    lsRemove(lsAccountKey(userId));
  }

  listProfileKeysFromLs(): string[] {
    const out: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith("uaidzin.save.") && !key.endsWith(":prev")) {
          out.push(key.slice("uaidzin.save.".length));
        }
      }
    } catch {
      
    }
    return out;
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
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}

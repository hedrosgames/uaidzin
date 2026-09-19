const DB_NAME = "uaidzin";
const STORE = "save";
const DB_VERSION = 1;

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
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbPut(key: string, value: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
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
    if (idb) candidates.push({ blob: idb, source: "idb" });
    const ls = lsGet(lsProfileKey(profileId));
    if (ls && ls !== idb) candidates.push({ blob: ls, source: "ls" });
    const idbPrev = await idbGet(idbProfilePrevKey(profileId));
    if (idbPrev) candidates.push({ blob: idbPrev, source: "idb-prev" });
    const lsPrev = lsGet(lsProfilePrevKey(profileId));
    if (lsPrev) candidates.push({ blob: lsPrev, source: "ls-prev" });
    return candidates;
  }

  async readProfileCurrent(profileId: string): Promise<string | null> {
    const idb = await idbGet(idbProfileKey(profileId));
    if (idb) return idb;
    return lsGet(lsProfileKey(profileId));
  }

  async writeProfileBlob(profileId: string, envelope: string): Promise<void> {
    const current = await this.readProfileCurrent(profileId);
    if (current && current !== envelope) {
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

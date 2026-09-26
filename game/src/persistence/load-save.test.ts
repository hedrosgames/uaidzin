import { afterEach, describe, expect, it } from "vitest";
import { SaveStore, idbProfileKey, lsProfileKey } from "./SaveStore";
import { SaveVault } from "./SaveVault";

const PROFILE = "admin:slot:0";

function installLocalStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

function installFailingIndexedDb() {
  (globalThis as { indexedDB?: unknown }).indexedDB = {
    open: () => {
      const req: Record<string, unknown> = {};
      setTimeout(() => (req.onerror as (() => void) | undefined)?.(), 0);
      return req;
    },
  };
}

afterEach(() => {
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("SaveStore.readProfileCandidates", () => {
  it("IDB falha e localStorage vazio lança erro", async () => {
    installFailingIndexedDb();
    installLocalStorage();
    await expect(new SaveStore().readProfileCandidates(PROFILE)).rejects.toThrow();
  });

  it("IDB falha com cópia no localStorage também lança erro", async () => {
    installFailingIndexedDb();
    installLocalStorage({ [lsProfileKey(PROFILE)]: "blob-ls" });
    await expect(new SaveStore().readProfileCandidates(PROFILE)).rejects.toThrow();
  });

  it("sem IDB disponível e localStorage com perfil devolve o perfil", async () => {
    installLocalStorage({ [lsProfileKey(PROFILE)]: "blob-ls" });
    const out = await new SaveStore().readProfileCandidates(PROFILE);
    expect(out.map((c) => c.blob)).toEqual(["blob-ls"]);
  });

  it("sem IDB disponível e localStorage vazio devolve lista vazia", async () => {
    installLocalStorage();
    const out = await new SaveStore().readProfileCandidates(PROFILE);
    expect(out).toEqual([]);
    expect(idbProfileKey(PROFILE)).toBe(`profile:${PROFILE}`);
  });
});

describe("SaveVault.loadCharacter", () => {
  function vaultWith(read: () => Promise<Array<{ blob: string; source: string }>>) {
    installLocalStorage();
    const vault = new SaveVault();
    (vault.store as unknown as { readProfileCandidates: typeof read }).readProfileCandidates = read;
    return vault;
  }

  it("store que lança vira unreadable", async () => {
    const vault = vaultWith(async () => {
      throw new Error("idb_read_failed");
    });
    expect((await vault.loadCharacter(PROFILE)).status).toBe("unreadable");
  });

  it("store vazio vira missing", async () => {
    const vault = vaultWith(async () => []);
    expect((await vault.loadCharacter(PROFILE)).status).toBe("missing");
  });

  it("blob válido vira ok", async () => {
    const blob = JSON.stringify({ saveVersion: 3, meta: { profileId: PROFILE, userId: "admin", slotIndex: 0, updatedAt: 1 } });
    const vault = vaultWith(async () => [{ blob, source: "idb" }]);
    expect((await vault.loadCharacter(PROFILE)).status).toBe("ok");
  });
});

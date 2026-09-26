import { afterEach, describe, expect, it } from "vitest";
import { SaveStore, mirrorKey, sectionKey } from "./SaveStore";
import { encryptSections, installSession, makeVault, removeSession } from "./save-test-kit";
import { SAVE_VERSION } from "./SaveTypes";
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

function payload(gold: number, updatedAt: number) {
  const seed = new SaveVault().seedPayload(
    {
      profileId: PROFILE,
      classId: "TK",
      name: "Lab",
      level: 1,
      evolution: "Mortal",
      gold,
      resets: 0,
      attrs: { FOR: 5, DES: 5, CONS: 5, INT: 5 },
      trees: { controle: 0, magia: 0, fisica: 0 },
      spec: { controle: 0, magia: 0, fisica: 0 },
      saveVersion: SAVE_VERSION,
    },
    "admin",
    0,
  );
  return { ...seed, meta: { ...seed.meta, updatedAt } };
}

afterEach(() => {
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
  delete (globalThis as { localStorage?: unknown }).localStorage;
  removeSession();
});

describe("SaveStore.readAll", () => {
  it("IDB falha e localStorage vazio lança erro", async () => {
    installFailingIndexedDb();
    installLocalStorage();
    await expect(new SaveStore().readAll(PROFILE)).rejects.toThrow();
  });

  it("IDB falha com espelho no localStorage também lança erro", async () => {
    installFailingIndexedDb();
    installLocalStorage({ [mirrorKey(PROFILE)]: JSON.stringify({ sections: { meta: "x" } }) });
    await expect(new SaveStore().readAll(PROFILE)).rejects.toThrow();
  });

  it("sem IDB disponível devolve vazio e o espelho continua legível", async () => {
    installLocalStorage({ [mirrorKey(PROFILE)]: JSON.stringify({ sections: { meta: "blob-ls" } }) });
    const store = new SaveStore();
    expect(await store.readAll(PROFILE)).toEqual({});
    expect(store.readMirror(PROFILE)).toEqual({ meta: "blob-ls" });
    expect(sectionKey(PROFILE, "inventory")).toBe(`profile:${PROFILE}:inventory`);
  });
});

describe("SaveVault.loadCharacter", () => {
  it("store que lança vira unreadable", async () => {
    installSession();
    const { store, vault } = makeVault();
    store.failReads = true;
    expect((await vault.loadCharacter(PROFILE)).status).toBe("unreadable");
  });

  it("store que lança vira unreadable mesmo com espelho válido", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    store.mirrors.set(PROFILE, await encryptSections(session, payload(5, 10)));
    store.failReads = true;
    expect((await vault.loadCharacter(PROFILE)).status).toBe("unreadable");
  });

  it("store vazio vira missing", async () => {
    installSession();
    const { vault } = makeVault();
    expect((await vault.loadCharacter(PROFILE)).status).toBe("missing");
  });

  it("seções válidas viram ok", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    store.sections.set(PROFILE, await encryptSections(session, payload(7, 10)));
    const out = await vault.loadCharacter(PROFILE);
    expect(out.status).toBe("ok");
    if (out.status === "ok") expect(out.payload.inventory.gold).toBe(7);
  });

  it("perfil com saveVersion 3 vira missing sem erro", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    store.sections.set(PROFILE, await encryptSections(session, { ...payload(7, 10), saveVersion: 3 }));
    expect((await vault.loadCharacter(PROFILE)).status).toBe("missing");
  });

  it("seção corrompida vira unreadable", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    const blobs = await encryptSections(session, payload(7, 10));
    store.sections.set(PROFILE, { ...blobs, inventory: "lixo" });
    expect((await vault.loadCharacter(PROFILE)).status).toBe("unreadable");
  });

  it("espelho mais novo vence o IDB", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    store.sections.set(PROFILE, await encryptSections(session, payload(7, 10)));
    store.mirrors.set(PROFILE, await encryptSections(session, payload(9, 20)));
    const out = await vault.loadCharacter(PROFILE);
    expect(out.status === "ok" && out.payload.inventory.gold).toBe(9);
    expect(out.status === "ok" && out.fromMirror).toBe(true);
  });

  it("espelho mais velho perde para o IDB", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    store.sections.set(PROFILE, await encryptSections(session, payload(7, 20)));
    store.mirrors.set(PROFILE, await encryptSections(session, payload(9, 10)));
    const out = await vault.loadCharacter(PROFILE);
    expect(out.status === "ok" && out.payload.inventory.gold).toBe(7);
    expect(out.status === "ok" && out.fromMirror).toBe(false);
  });
});

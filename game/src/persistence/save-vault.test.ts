import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installSession, makeVault, removeSession } from "./save-test-kit";
import { SAVE_VERSION, type SavePayload } from "./SaveTypes";
import { RETRY_DELAYS_MS, type SaveVault } from "./SaveVault";

const PROFILE = "admin:slot:0";

function payloadFor(vault: SaveVault): SavePayload {
  return vault.seedPayload(
    {
      profileId: PROFILE,
      classId: "TK",
      name: "Lab",
      level: 1,
      evolution: "Mortal",
      gold: 3,
      resets: 0,
      attrs: { FOR: 5, DES: 5, CONS: 5, INT: 5 },
      trees: { controle: 0, magia: 0, fisica: 0 },
      spec: { controle: 0, magia: 0, fisica: 0 },
      saveVersion: SAVE_VERSION,
    },
    "admin",
    0,
  );
}

async function drain(vault: SaveVault): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await vault.idle();
    await vi.runAllTimersAsync();
  }
  await vault.idle();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
  removeSession();
});

describe("SaveVault.flush", () => {
  it("termina em tempo finito com store que sempre falha e mantém o crítico pendente", async () => {
    installSession();
    const { store, vault } = makeVault();
    store.failWrites = true;
    await vault.commit({ payload: payloadFor(vault), sections: ["inventory"], vault: null, critical: true });
    expect(vault.getStatus()).toBe("error");
    expect(vault.hasPendingCritical()).toBe(true);
    await drain(vault);
    expect(vault.hasPendingCritical()).toBe(true);
    expect(store.writes.length).toBe(0);
    store.failWrites = false;
    await vault.flush();
    expect(vault.hasPendingCritical()).toBe(false);
    expect(store.writes.length).toBe(1);
    expect(store.writes[0].sections.sort()).toEqual(["inventory", "meta"]);
  });

  it("adiável é abandonado depois de 3 tentativas", async () => {
    installSession();
    const { store, vault } = makeVault();
    store.failWrites = true;
    await vault.commit({ payload: payloadFor(vault), sections: ["character"], vault: null, critical: false });
    await drain(vault);
    store.failWrites = false;
    await vault.flush();
    expect(store.writes.length).toBe(0);
  });

  it("retry grava sozinho depois do atraso", async () => {
    installSession();
    const { store, vault } = makeVault();
    store.failWrites = true;
    await vault.commit({ payload: payloadFor(vault), sections: ["inventory"], vault: null, critical: true });
    store.failWrites = false;
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
    await vault.idle();
    expect(store.writes.length).toBe(1);
    expect(vault.getStatus()).toBe("saved");
  });
});

describe("SaveVault.logout e wipe", () => {
  it("logout com retry armado não grava depois", async () => {
    installSession();
    const { store, vault } = makeVault();
    store.failWrites = true;
    await vault.commit({ payload: payloadFor(vault), sections: ["inventory"], vault: null, critical: true });
    const accountWrites = store.accountWrites;
    store.failWrites = false;
    await vault.logout();
    await drain(vault);
    await vault.flush();
    expect(store.writes.length).toBe(0);
    expect(store.accountWrites).toBe(accountWrites);
    expect(vault.hasPendingCritical()).toBe(false);
  });

  it("wipe do perfil ativo cancela o pendente e não ressuscita seções", async () => {
    installSession();
    const { store, vault } = makeVault();
    vault.setProfileId(PROFILE);
    store.failWrites = true;
    await vault.commit({ payload: payloadFor(vault), sections: ["inventory"], vault: null, critical: true });
    store.failWrites = false;
    await vault.wipeProfile(PROFILE);
    await drain(vault);
    await vault.flush();
    expect(store.sections.has(PROFILE)).toBe(false);
  });
});

describe("SaveVault sem sessão", () => {
  it("não grava nada", async () => {
    const { store, vault } = makeVault();
    await vault.commit({ payload: payloadFor(vault), sections: ["inventory"], vault: { gold: 1, items: [] }, critical: true });
    await drain(vault);
    expect(store.writes.length).toBe(0);
    expect(store.accountWrites).toBe(0);
    vault.writeMirror();
    expect(store.mirrors.size).toBe(0);
  });

  it("grava cifrado quando a sessão volta", async () => {
    const { store, vault } = makeVault();
    await vault.commit({ payload: payloadFor(vault), sections: ["inventory"], vault: null, critical: true });
    installSession();
    await vault.flush();
    const blob = store.sections.get(PROFILE)?.inventory || "";
    expect(JSON.parse(blob).mode).toBe("aes");
    expect(blob.includes("gold")).toBe(false);
  });
});

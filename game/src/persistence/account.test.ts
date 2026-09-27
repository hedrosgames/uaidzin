import { afterEach, describe, expect, it } from "vitest";
import { decryptJson, encryptJson, importCodecKey } from "./crypto/CryptoCodec";
import { installSession, makeVault, removeSession } from "./save-test-kit";
import { SAVE_VERSION, type AccountSave, type AuthSession, type SavePayload } from "./SaveTypes";
import type { SaveVault } from "./SaveVault";

const PROFILE = "admin:slot:0";

function payloadWithGold(vault: SaveVault, gold: number): SavePayload {
  const seed = vault.seedPayload(
    {
      profileId: PROFILE,
      classId: "TK",
      name: "Lab",
      level: 1,
      evolution: "Mortal",
      gold: 0,
      resets: 0,
      attrs: { FOR: 5, DES: 5, CONS: 5, INT: 5 },
      trees: { controle: 0, magia: 0, fisica: 0 },
      spec: { controle: 0, magia: 0, fisica: 0 },
      saveVersion: SAVE_VERSION,
    },
    "admin",
    0,
  );
  return { ...seed, inventory: { gold, items: [] } };
}

async function decrypt(session: AuthSession, blob: string | undefined): Promise<Partial<AccountSave>> {
  return (await decryptJson(await importCodecKey(session), blob || "")) as Partial<AccountSave>;
}

afterEach(() => {
  removeSession();
});

describe("SaveVault.loadAccount", () => {
  it("store que lança: carga rejeita e escrita de cofre não grava a conta", async () => {
    installSession();
    const { store, vault } = makeVault();
    store.failAccountReads = true;
    const session = vault.getSession()!;
    await expect(vault.loadAccount(session)).rejects.toThrow();
    await vault.commit({ payload: null, sections: [], vault: { gold: 9, items: [] }, critical: true });
    expect(vault.getStatus()).toBe("error");
    expect(vault.hasPendingCritical()).toBe(true);
    expect(store.accountWrites).toBe(0);
    expect(store.accounts.size).toBe(0);
    await vault.logout();
  });

  it("blob que não decifra rejeita e fica intacto", async () => {
    installSession();
    const { store, vault } = makeVault();
    store.accounts.set("admin", { slots: "lixo", vault: "lixo" });
    const session = vault.getSession()!;
    await expect(vault.loadAccount(session)).rejects.toThrow();
    await vault.commit({ payload: payloadWithGold(vault, 5), sections: ["inventory"], vault: null, critical: true });
    expect(store.accountWrites).toBe(0);
    expect(store.accounts.get("admin")).toEqual({ slots: "lixo", vault: "lixo" });
    await vault.logout();
  });

  it("conta v2 vira ausente e a leitura não grava", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    const legacy = await encryptJson(await importCodecKey(session), {
      version: 2,
      user: "admin",
      slots: [{ profileId: PROFILE, classId: "TK", name: "Antigo", level: 40, saveVersion: 4 }],
      vault: { gold: 700, items: [] },
    });
    store.accounts.set("admin", { slots: legacy, vault: legacy });
    const account = await vault.loadAccount(session);
    expect(account.slots.every((s) => s === null)).toBe(true);
    expect(account.vault.gold).toBe(0);
    expect(store.accountWrites).toBe(0);
  });
});

describe("SaveVault slots e cofre", () => {
  it("slot e cofre intercalados não perdem atualização", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    let release: () => void = () => undefined;
    let reached: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const inFlight = new Promise<void>((resolve) => {
      reached = resolve;
    });
    let first = true;
    store.beforeWrite = async () => {
      if (!first) return;
      first = false;
      reached();
      await held;
    };
    const writes: Promise<unknown>[] = [vault.commit({ payload: payloadWithGold(vault, 40), sections: ["inventory"], vault: null, critical: true })];
    await inFlight;
    writes.push(
      vault.commit({ payload: null, sections: [], vault: { gold: 25, items: [] }, critical: true }),
      vault.reserveSlot(1, "FM", "Bruma"),
      vault.commit({ payload: payloadWithGold(vault, 15), sections: ["inventory"], vault: null, critical: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.writes.length).toBe(0);
    expect(store.accountWrites).toBe(0);
    release();
    await Promise.all(writes);
    await vault.idle();
    expect(store.writes.length).toBe(2);
    const blobs = store.accounts.get("admin");
    const slots = await decrypt(session, blobs?.slots);
    const vaultPart = await decrypt(session, blobs?.vault);
    expect(vaultPart.vault?.gold).toBe(25);
    expect(slots.slots?.[0]?.gold).toBe(15);
    expect(slots.slots?.[1]?.name).toBe("Bruma");
    expect(slots.version).toBe(3);
  });

  it("abates seguidos usam a conta em memória sem reler o store", async () => {
    installSession();
    const { store, vault } = makeVault();
    await vault.commit({ payload: payloadWithGold(vault, 1), sections: ["inventory"], vault: { gold: 2, items: [] }, critical: true });
    const reads = store.accountReads;
    for (let gold = 2; gold < 6; gold++) {
      await vault.commit({ payload: payloadWithGold(vault, gold), sections: ["inventory"], vault: null, critical: true });
    }
    expect(store.accountReads).toBe(reads);
    expect(store.writes.length).toBe(5);
  });

  it("espelho do cofre sai do LS depois que o cofre grava no IDB", async () => {
    const session = installSession();
    const { store, vault } = makeVault();
    store.failWrites = true;
    await vault.commit({ payload: null, sections: [], vault: { gold: 30, items: [] }, critical: true });
    vault.writeMirror();
    expect(store.vaultMirrors.has("admin")).toBe(true);
    const fresh = makeVault();
    fresh.store.vaultMirrors.set("admin", store.vaultMirrors.get("admin")!);
    expect((await fresh.vault.loadAccount(session)).vault.gold).toBe(30);
    store.failWrites = false;
    await vault.flush();
    expect(store.vaultMirrors.has("admin")).toBe(false);
    expect((await decrypt(session, store.accounts.get("admin")?.vault)).vault?.gold).toBe(30);
    await vault.logout();
  });

  it("resumo igual não regrava a conta", async () => {
    installSession();
    const { store, vault } = makeVault();
    await vault.commit({ payload: payloadWithGold(vault, 3), sections: ["inventory"], vault: null, critical: true });
    const after = store.accountWrites;
    await vault.commit({ payload: payloadWithGold(vault, 3), sections: ["character"], vault: null, critical: true });
    expect(store.writes.length).toBe(2);
    expect(store.accountWrites).toBe(after);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptJson, importCodecKey } from "./crypto/CryptoCodec";
import { DEFERRED_SAVE_DELAY_MS, SaveCoordinator } from "./SaveCoordinator";
import { installSession, makeVault, removeSession } from "./save-test-kit";
import type { AccountBlobs } from "./SaveStore";
import { SAVE_VERSION, type AccountSave, type AuthSession, type SavePayload } from "./SaveTypes";
import type { SaveVault } from "./SaveVault";

const PROFILE = "admin:slot:0";

function setup() {
  const session = installSession();
  const { store, vault } = makeVault();
  vault.setProfileId(PROFILE);
  const state = { gold: 0, vaultGold: 0 };
  const build = (): SavePayload => {
    const seed = seedFor(vault);
    return { ...seed, inventory: { gold: state.gold, items: [] } };
  };
  const coordinator = new SaveCoordinator(vault, build, () => ({ gold: state.vaultGold, items: [] }));
  return { session, store, vault, state, coordinator };
}

function seedFor(vault: SaveVault): SavePayload {
  return vault.seedPayload(
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
}

function holdFirstWrite(store: ReturnType<typeof setup>["store"]) {
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
  return { inFlight, release: () => release() };
}

const nextMicrotask = () => new Promise<void>((resolve) => queueMicrotask(resolve));

async function settle(vault: SaveVault): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await vault.flush();
}

async function readAccount(session: AuthSession, blobs: AccountBlobs | undefined): Promise<Pick<AccountSave, "slots" | "vault">> {
  const codec = await importCodecKey(session);
  const slots = (await decryptJson(codec, blobs?.slots || "")) as Pick<AccountSave, "slots">;
  const vault = (await decryptJson(codec, blobs?.vault || "")) as Pick<AccountSave, "vault">;
  return { slots: slots.slots, vault: vault.vault };
}

afterEach(() => {
  vi.useRealTimers();
  removeSession();
});

describe("SaveCoordinator", () => {
  it("5 abates no mesmo frame viram 1 transação só com os alvos tocados", async () => {
    const { store, vault, state, coordinator } = setup();
    for (let i = 0; i < 5; i++) {
      state.gold += 10;
      coordinator.markDirty(["character", "inventory", "progress"], "critical");
    }
    await settle(vault);
    expect(store.writes.length).toBe(1);
    expect(store.writes[0].sections.sort()).toEqual(["character", "inventory", "meta", "progress"]);
    expect(vault.getWriteCount()).toBe(1);
  });

  it("crítico que chega durante um flush grava logo depois dele", async () => {
    const { session, store, vault, state, coordinator } = setup();
    const hold = holdFirstWrite(store);
    state.gold = 1;
    coordinator.markDirty(["inventory"], "critical");
    await hold.inFlight;
    state.gold = 2;
    coordinator.markDirty(["inventory"], "critical");
    await nextMicrotask();
    expect(store.writes.length).toBe(0);
    hold.release();
    await vault.flush();
    expect(store.writes.length).toBe(2);
    expect(coordinator.hasDirty()).toBe(false);
    const inventory = await decryptJson(await importCodecKey(session), store.sections.get(PROFILE)?.inventory || "");
    expect((inventory as { gold: number }).gold).toBe(2);
  });

  it("adiável não grava antes do debounce", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { store, vault, coordinator } = setup();
    coordinator.markDirty(["character"], "deferred");
    await vi.advanceTimersByTimeAsync(DEFERRED_SAVE_DELAY_MS - 10);
    await vault.flush();
    expect(store.writes.length).toBe(0);
    coordinator.markDirty(["bags"], "deferred");
    await vi.advanceTimersByTimeAsync(DEFERRED_SAVE_DELAY_MS - 10);
    await vault.flush();
    expect(store.writes.length).toBe(0);
    await vi.advanceTimersByTimeAsync(20);
    await vault.flush();
    expect(store.writes.length).toBe(1);
    expect(store.writes[0].sections.sort()).toEqual(["bags", "character", "meta"]);
  });

  it("adiável vai junto com o próximo crítico", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { store, vault, coordinator } = setup();
    coordinator.markDirty(["equipment"], "deferred");
    coordinator.markDirty(["inventory"], "critical");
    await settle(vault);
    expect(store.writes.length).toBe(1);
    expect(store.writes[0].sections.sort()).toEqual(["equipment", "inventory", "meta"]);
    await vi.advanceTimersByTimeAsync(DEFERRED_SAVE_DELAY_MS + 10);
    await vault.flush();
    expect(store.writes.length).toBe(1);
  });

  it("aprender skill grava skills e skillLoadout na mesma transação", async () => {
    const { store, vault, coordinator } = setup();
    coordinator.markDirty(["skills", "skillLoadout", "inventory"], "deferred");
    await coordinator.checkpoint();
    await vault.flush();
    expect(store.writes.length).toBe(1);
    expect(store.writes[0].sections).toContain("skills");
    expect(store.writes[0].sections).toContain("skillLoadout");
  });

  it("resumo do slot e cofre intercalados não perdem atualização", async () => {
    const { session, store, vault, state, coordinator } = setup();
    const hold = holdFirstWrite(store);
    state.gold = 40;
    coordinator.markDirty(["inventory"], "critical");
    await hold.inFlight;
    state.vaultGold = 25;
    coordinator.markDirty("vault", "critical");
    await nextMicrotask();
    state.gold = 15;
    coordinator.markDirty(["inventory"], "critical");
    await nextMicrotask();
    hold.release();
    await vault.flush();
    const account = await readAccount(session, store.accounts.get("admin"));
    expect(account.vault.gold).toBe(25);
    expect(account.slots[0]?.gold).toBe(15);
    expect(account.slots[0]?.saveVersion).toBe(SAVE_VERSION);
  });

  it("wipe do perfil ativo descarta o sujo e o debounce", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { store, vault, coordinator } = setup();
    coordinator.markDirty(["character"], "deferred");
    await vault.wipeProfile(PROFILE);
    await vi.advanceTimersByTimeAsync(DEFERRED_SAVE_DELAY_MS + 10);
    await vault.flush();
    expect(coordinator.hasDirty()).toBe(false);
    expect(store.writes.length).toBe(0);
  });
});

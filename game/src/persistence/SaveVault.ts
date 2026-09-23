import { AccountAuth, SESSION_KEY } from "./AccountAuth";
import {
  b64,
  decryptJson,
  encryptJson,
  FALLBACK_ITERATIONS,
  fallbackKey,
  hasSubtleCrypto,
  looksEncrypted,
} from "./crypto/CryptoCodec";
import { migrateSave } from "./migrations";
import { SaveStore } from "./SaveStore";
import {
  ACCOUNT_SAVE_VERSION,
  emptyAttrs,
  emptyBags,
  emptyProgress,
  emptySkillLoadout,
  emptyVault,
  normalizeSlots,
  normalizeVault,
  parseProfileId,
  profileIdFor,
  SAVE_VERSION,
  SLOT_COUNT,
  summaryFromPayload,
  type AccountSave,
  type AuthSession,
  type SavePayload,
  type SaveStatus,
  type SlotSummary,
} from "./SaveTypes";
import type { AccountVaultState } from "../domain/account/AccountVaultService";

type StatusListener = (status: SaveStatus, error?: string | null) => void;

export type CharacterLoadResult =
  | { status: "ok"; payload: SavePayload }
  | { status: "missing" }
  | { status: "unreadable" };

export class SaveVault {
  readonly auth = new AccountAuth();
  readonly store = new SaveStore();

  private profileId = "default";
  private status: SaveStatus = "idle";
  private lastError: string | null = null;
  private dirty = false;
  private lastSavedAt = 0;
  private pendingPayload: SavePayload | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private flushChain: Promise<void> = Promise.resolve();
  private retryAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private savedUiTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<StatusListener>();
  private writeCount = 0;

  onStatus(cb: StatusListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getStatus(): SaveStatus {
    return this.status;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getWriteCount(): number {
    return this.writeCount;
  }

  setProfileId(id: string): void {
    this.profileId = id || "default";
  }

  getProfileId(): string {
    return this.profileId;
  }

  private setStatus(status: SaveStatus, error: string | null = null): void {
    this.status = status;
    this.lastError = error;
    for (const cb of this.listeners) cb(status, error);
  }

  async bootstrap(): Promise<void> {
    await this.auth.bootstrap();
  }

  async login(userId: string, password: string) {
    const result = await this.auth.login(userId, password);
    if (!result.ok) return result;
    await this.migrateLegacyEncryption(password, result.session);
    return result;
  }

  private async migrateLegacyEncryption(password: string, session: AuthSession): Promise<void> {
    const raw = this.store.readAccountBlob(session.user);
    if (!raw) return;
    if (!looksEncrypted(raw)) return;
    try {
      await decryptJson(session, raw);
      return;
    } catch {
      
    }
    if (!hasSubtleCrypto() || session.mode !== "aes") return;
    const legacySession: AuthSession = {
      ...session,
      key: b64(fallbackKey(password, session.salt, FALLBACK_ITERATIONS)),
      mode: "fallback",
    };
    let account: AccountSave;
    try {
      account = (await decryptJson(legacySession, raw)) as AccountSave;
    } catch {
      return;
    }
    account = {
      version: ACCOUNT_SAVE_VERSION,
      user: session.user,
      slots: normalizeSlots(account.slots),
      vault: normalizeVault(account.vault),
      updatedAt: Date.now(),
    };
    await this.writeAccount(session, account);
    for (const slot of account.slots) {
      if (!slot?.profileId) continue;
      const blob = await this.store.readProfileCurrent(slot.profileId);
      if (!blob) continue;
      try {
        let obj: unknown;
        if (looksEncrypted(blob)) {
          obj = await decryptJson(legacySession, blob);
        } else {
          obj = JSON.parse(blob);
        }
        const migrated = migrateSave(obj, slot.profileId);
        if (migrated) await this.writeProfileNow(session, migrated);
      } catch {
        
      }
    }
  }

  logout(): void {
    this.auth.logout();
  }

  getSession(): AuthSession | null {
    return this.auth.getSession();
  }

  requireSession(): AuthSession | null {
    return this.auth.requireSession();
  }

  private requireSessionOrThrow(): AuthSession {
    const session = this.getSession();
    if (!session) throw new Error("no_session");
    return session;
  }

  async listSlots(): Promise<Array<SlotSummary | null>> {
    const session = this.requireSessionOrThrow();
    const account = await this.loadAccount(session);
    return account.slots;
  }

  async loadAccount(session: AuthSession): Promise<AccountSave> {
    const raw = this.store.readAccountBlob(session.user);
    if (!raw) {
      const account: AccountSave = {
        version: ACCOUNT_SAVE_VERSION,
        user: session.user,
        slots: normalizeSlots(Array.from({ length: SLOT_COUNT }, () => null)),
        vault: emptyVault(),
        updatedAt: Date.now(),
      };
      await this.writeAccount(session, account);
      return account;
    }
    try {
      let data: AccountSave;
      if (looksEncrypted(raw)) {
        data = (await decryptJson(session, raw)) as AccountSave;
      } else {
        data = JSON.parse(raw) as AccountSave;
      }
      return {
        version: ACCOUNT_SAVE_VERSION,
        user: session.user,
        slots: normalizeSlots(data.slots),
        vault: normalizeVault(data.vault),
        updatedAt: data.updatedAt || Date.now(),
      };
    } catch {
      return {
        version: ACCOUNT_SAVE_VERSION,
        user: session.user,
        slots: Array.from({ length: SLOT_COUNT }, () => null),
        vault: emptyVault(),
        updatedAt: Date.now(),
      };
    }
  }

  private async writeAccount(session: AuthSession, account: AccountSave): Promise<void> {
    const envelope = await encryptJson(session, {
      ...account,
      version: ACCOUNT_SAVE_VERSION,
      user: session.user,
      vault: normalizeVault(account.vault),
      updatedAt: Date.now(),
    });
    if (!this.store.writeAccountBlob(session.user, envelope)) {
      throw new Error("account_write_failed");
    }
  }

  async saveAccountVault(vault: AccountVaultState): Promise<void> {
    const session = this.getSession();
    if (!session) return;
    const account = await this.loadAccount(session);
    account.vault = normalizeVault(vault);
    await this.writeAccount(session, account);
  }

  async loadAccountVault(): Promise<AccountVaultState> {
    const session = this.getSession();
    if (!session) return emptyVault();
    const account = await this.loadAccount(session);
    return normalizeVault(account.vault);
  }

  async createSlot(input: {
    slotIndex: number;
    classId: string;
    name: string;
    level?: number;
    evolution?: string;
    gold?: number;
    attrs?: SlotSummary["attrs"];
    trees?: SlotSummary["trees"];
    spec?: SlotSummary["spec"];
    resets?: number;
  }): Promise<SlotSummary> {
    const session = this.requireSessionOrThrow();
    const account = await this.loadAccount(session);
    if (input.slotIndex < 0 || input.slotIndex >= SLOT_COUNT) throw new Error("bad_slot");
    if (account.slots[input.slotIndex]) throw new Error("slot_occupied");
    const summary: SlotSummary = {
      profileId: profileIdFor(session.user, input.slotIndex),
      classId: input.classId,
      name: input.name,
      level: input.level ?? 1,
      evolution: input.evolution ?? "Mortal",
      gold: input.gold ?? 0,
      resets: input.resets ?? 0,
      attrs: input.attrs ? { ...input.attrs } : emptyAttrs(),
      trees: input.trees ? { ...input.trees } : { controle: 0, magia: 0, fisica: 0 },
      spec: input.spec ? { ...input.spec } : { controle: 0, magia: 0, fisica: 0 },
    };
    account.slots[input.slotIndex] = summary;
    await this.writeAccount(session, account);
    const payload = this.seedPayload(summary, session.user, input.slotIndex);
    await this.writeProfileNow(session, payload);
    return summary;
  }

  seedPayload(summary: SlotSummary, userId: string, slotIndex: number): SavePayload {
    return {
      saveVersion: SAVE_VERSION,
      meta: {
        profileId: summary.profileId,
        userId,
        slotIndex,
        updatedAt: Date.now(),
      },
      character: {
        name: summary.name,
        classId: summary.classId,
        level: summary.level,
        evolution: summary.evolution,
        xp: 0,
        unspentAttributePoints: 0,
        resetsInEvolution: summary.resets,
        bonusAttributePoints: 0,
        attributes: { ...summary.attrs },
        hp: 100,
      },
      skills: {
        classId: summary.classId,
        levels: {},
        eighthTree: null,
        specialization: {
          controle: summary.spec?.controle || 0,
          magia: summary.spec?.magia || 0,
          fisica: summary.spec?.fisica || 0,
        },
        skillPoints: Math.max(0, summary.level - 1),
        specPoints: 0,
      },
      skillLoadout: emptySkillLoadout(),
      equipment: { equipped: {} },
      inventory: { gold: summary.gold, items: [] },
      bags: emptyBags(),
      buffs: [],
      progress: emptyProgress(),
      options: {},
    };
  }

  async deleteSlot(slotIndex: number): Promise<void> {
    const session = this.requireSessionOrThrow();
    const account = await this.loadAccount(session);
    const slot = account.slots[slotIndex];
    if (!slot) return;
    await this.wipeProfile(slot.profileId);
    account.slots[slotIndex] = null;
    await this.writeAccount(session, account);
  }

  async syncSlotSummary(summary: SlotSummary): Promise<void> {
    const session = this.getSession();
    if (!session) return;
    const parsed = parseProfileId(summary.profileId);
    if (!parsed || parsed.userId !== session.user) return;
    const account = await this.loadAccount(session);
    if (parsed.slotIndex < 0 || parsed.slotIndex >= SLOT_COUNT) return;
    account.slots[parsed.slotIndex] = {
      ...summary,
      attrs: { ...summary.attrs },
      trees: { ...(summary.trees || { controle: 0, magia: 0, fisica: 0 }) },
      spec: { ...(summary.spec || { controle: 0, magia: 0, fisica: 0 }) },
    };
    await this.writeAccount(session, account);
  }

  async loadCharacter(profileId?: string): Promise<CharacterLoadResult> {
    const id = profileId || this.profileId;
    this.profileId = id;
    const session = this.getSession();
    const candidates = await this.store.readProfileCandidates(id);
    if (!candidates.length) return { status: "missing" };
    let best: SavePayload | null = null;
    let bestAt = -1;
    let sawBlob = false;
    for (const found of candidates) {
      sawBlob = true;
      try {
        let rawObj: unknown;
        if (looksEncrypted(found.blob)) {
          if (!session) continue;
          rawObj = await decryptJson(session, found.blob);
        } else {
          rawObj = JSON.parse(found.blob);
        }
        const migrated = migrateSave(rawObj, id);
        if (!migrated) continue;
        const at = migrated.meta?.updatedAt || 0;
        if (at >= bestAt) {
          best = migrated;
          bestAt = at;
        }
      } catch {
        
      }
    }
    if (best) return { status: "ok", payload: best };
    return { status: sawBlob ? "unreadable" : "missing" };
  }

  async saveCharacter(payload: SavePayload, opts?: { immediate?: boolean }): Promise<void> {
    const next: SavePayload = {
      ...payload,
      saveVersion: SAVE_VERSION,
      meta: {
        ...payload.meta,
        profileId: payload.meta.profileId || this.profileId,
        updatedAt: Date.now(),
      },
    };
    this.profileId = next.meta.profileId;
    this.pendingPayload = next;
    this.dirty = true;
    if (opts?.immediate) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      await this.flush();
      return;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flush();
    }, 300);
  }

  async flush(): Promise<void> {
    const run = async (): Promise<void> => {
      if (!this.dirty || !this.pendingPayload) return;
      const session = this.getSession();
      this.dirty = false;
      this.setStatus("saving");
      const payload = this.pendingPayload;
      try {
        if (session) {
          await this.writeProfileNow(session, payload);
          await this.syncSlotSummary(summaryFromPayload(payload));
        } else {
          await this.store.writeProfileBlob(payload.meta.profileId, JSON.stringify(payload));
        }
        this.writeCount += 1;
        this.lastSavedAt = Date.now();
        this.retryAttempt = 0;
        this.setStatus("saved");
        if (this.savedUiTimer) clearTimeout(this.savedUiTimer);
        this.savedUiTimer = setTimeout(() => {
          if (this.status === "saved") this.setStatus("idle");
        }, 1500);
      } catch (err) {
        this.dirty = true;
        const message = err instanceof Error ? err.message : "save_failed";
        this.setStatus("error", message);
        this.scheduleRetry();
      }
      if (this.dirty && this.pendingPayload) await run();
    };
    this.flushChain = this.flushChain.then(run, run);
    await this.flushChain;
  }

  private scheduleRetry(): void {
    if (this.retryAttempt >= 3) return;
    const delays = [1000, 3000, 10000];
    const delay = delays[this.retryAttempt] || 10000;
    this.retryAttempt += 1;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, delay);
  }

  private async writeProfileNow(session: AuthSession, payload: SavePayload): Promise<void> {
    const envelope = await encryptJson(session, payload);
    await this.store.writeProfileBlob(payload.meta.profileId, envelope);
  }

  shouldSkipAutosave(): boolean {
    return Date.now() - this.lastSavedAt < 5000;
  }

  async wipeProfile(profileId: string): Promise<void> {
    await this.store.clearProfile(profileId);
    const session = this.getSession();
    if (!session) return;
    const parsed = parseProfileId(profileId);
    if (!parsed || parsed.userId !== session.user) return;
    const account = await this.loadAccount(session);
    if (account.slots[parsed.slotIndex]?.profileId === profileId) {
      account.slots[parsed.slotIndex] = null;
      await this.writeAccount(session, account);
    }
  }

  async wipeAccount(userId: string): Promise<void> {
    const ids = this.store.listProfileKeysFromLs().filter((id) => id.startsWith(`${userId}:slot:`));
    for (const id of ids) await this.store.clearProfile(id);
    this.store.clearAccountBlob(userId);
    if (this.getSession()?.user === userId) this.logout();
    try {
      sessionStorage.removeItem("uaidzin_active_char");
    } catch {
      
    }
    if (userId === "admin") {
      this.auth.deleteAccountRecord("admin");
      await this.auth.bootstrap();
    }
  }

  async wipeAll(includeSettings = false): Promise<void> {
    this.logout();
    try {
      sessionStorage.removeItem("uaidzin_active_char");
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      
    }
    await this.store.wipeAllUaidzinStorage(includeSettings);
    await this.auth.bootstrap();
  }

  async exportProfile(profileId?: string): Promise<string | null> {
    const loaded = await this.loadCharacter(profileId);
    if (loaded.status !== "ok") return null;
    return JSON.stringify(loaded.payload, null, 2);
  }

  async importProfile(json: string, profileId?: string): Promise<SavePayload | null> {
    const session = this.requireSessionOrThrow();
    const id = profileId || this.profileId;
    const parsed = migrateSave(JSON.parse(json), id);
    if (!parsed) return null;
    parsed.meta.profileId = id;
    const parts = parseProfileId(id);
    if (parts) {
      parsed.meta.userId = parts.userId;
      parsed.meta.slotIndex = parts.slotIndex;
    }
    await this.writeProfileNow(session, parsed);
    await this.syncSlotSummary(summaryFromPayload(parsed));
    return parsed;
  }

  slotExists(slots: Array<SlotSummary | null>, profileId: string): boolean {
    return slots.some((s) => s?.profileId === profileId);
  }
}

export const saveVault = new SaveVault();

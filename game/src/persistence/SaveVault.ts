import { AccountAuth, SESSION_KEY } from "./AccountAuth";
import { decryptJson, encryptJson, importCodecKey, looksEncrypted, type CodecKey } from "./crypto/CryptoCodec";
import { migrateSave } from "./migrations";
import { SaveStore, type SectionBlobs } from "./SaveStore";
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
  PROFILE_SECTIONS,
  profileIdFor,
  SAVE_VERSION,
  SLOT_COUNT,
  summaryFromPayload,
  type AccountSave,
  type AuthSession,
  type ProfileSection,
  type SavePayload,
  type SaveStatus,
  type SlotSummary,
} from "./SaveTypes";
import type { AccountVaultState } from "../domain/account/AccountVaultService";

type StatusListener = (status: SaveStatus, error?: string | null) => void;

export type CharacterLoadResult =
  | { status: "ok"; payload: SavePayload; fromMirror: boolean }
  | { status: "missing" }
  | { status: "unreadable" };

export type SaveWrite = {
  payload: SavePayload | null;
  sections: ProfileSection[];
  vault: AccountVaultState | null;
  critical: boolean;
};

type PendingWrite = {
  payload: SavePayload | null;
  sections: Set<ProfileSection>;
  vault: AccountVaultState | null;
  critical: boolean;
  attempts: number;
};

export const RETRY_DELAYS_MS = [1000, 3000, 10000];

function mergeWrites(older: PendingWrite, newer: PendingWrite): PendingWrite {
  const olderId = older.payload?.meta.profileId;
  const newerId = newer.payload?.meta.profileId;
  if (olderId && newerId && olderId !== newerId) return newer;
  return {
    payload: newer.payload ?? older.payload,
    sections: new Set([...older.sections, ...newer.sections]),
    vault: newer.vault ?? older.vault,
    critical: older.critical || newer.critical,
    attempts: Math.max(older.attempts, newer.attempts),
  };
}

function sectionValue(payload: SavePayload, section: ProfileSection): unknown {
  if (section === "meta") return { saveVersion: payload.saveVersion, ...payload.meta };
  return payload[section];
}

function emptyAccount(user: string): AccountSave {
  return {
    version: ACCOUNT_SAVE_VERSION,
    user,
    slots: Array.from({ length: SLOT_COUNT }, () => null),
    vault: emptyVault(),
    updatedAt: Date.now(),
  };
}

function copyAccount(account: AccountSave): AccountSave {
  return { ...account, slots: [...account.slots] };
}

export class SaveVault {
  readonly auth = new AccountAuth();

  private profileId = "default";
  private status: SaveStatus = "idle";
  private lastError: string | null = null;
  private pending: PendingWrite | null = null;
  private flushChain: Promise<void> = Promise.resolve();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private savedUiTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<StatusListener>();
  private cancelHooks = new Set<() => void>();
  private writeCount = 0;
  private lastStamp = 0;
  private codec: { key: string; mode: AuthSession["mode"]; codec: Promise<CodecKey> } | null = null;
  private accountCache: { user: string; raw: string; account: AccountSave } | null = null;
  private accountEnvelope: { user: string; raw: string } | null = null;
  private encrypted: { profileId: string; sections: SectionBlobs } | null = null;
  private readonly legacyCleared = new Set<string>();

  constructor(readonly store: SaveStore = new SaveStore()) {}

  onStatus(cb: StatusListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onCancel(cb: () => void): () => void {
    this.cancelHooks.add(cb);
    return () => this.cancelHooks.delete(cb);
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

  hasPendingCritical(): boolean {
    return !!this.pending?.critical;
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

  login(userId: string, password: string) {
    return this.auth.login(userId, password);
  }

  async logout(): Promise<void> {
    this.cancelPending();
    this.auth.logout();
    await this.flushChain;
    this.codec = null;
    this.accountCache = null;
    this.accountEnvelope = null;
    this.encrypted = null;
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

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.flushChain.then(task, task);
    this.flushChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private cancelPending(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.pending = null;
    for (const cb of this.cancelHooks) cb();
    if (this.status !== "idle") this.setStatus("idle");
  }

  private codecFor(session: AuthSession): Promise<CodecKey> {
    const cached = this.codec;
    if (cached && cached.key === session.key && cached.mode === session.mode) return cached.codec;
    const codec = importCodecKey(session).catch((err: unknown) => {
      if (this.codec?.codec === codec) this.codec = null;
      throw err;
    });
    this.codec = { key: session.key, mode: session.mode, codec };
    return codec;
  }

  async listSlots(): Promise<Array<SlotSummary | null>> {
    const session = this.requireSessionOrThrow();
    const account = await this.loadAccount(session);
    return account.slots;
  }

  async loadAccount(session: AuthSession): Promise<AccountSave> {
    const raw = this.store.readAccountBlob(session.user);
    if (!raw) return emptyAccount(session.user);
    const cached = this.accountCache;
    if (cached && cached.user === session.user && cached.raw === raw) return copyAccount(cached.account);
    try {
      let data: AccountSave;
      if (looksEncrypted(raw)) {
        data = (await decryptJson(await this.codecFor(session), raw)) as AccountSave;
      } else {
        data = JSON.parse(raw) as AccountSave;
      }
      const account: AccountSave = {
        version: ACCOUNT_SAVE_VERSION,
        user: session.user,
        slots: normalizeSlots(data.slots),
        vault: normalizeVault(data.vault),
        updatedAt: data.updatedAt || Date.now(),
      };
      this.accountCache = { user: session.user, raw, account };
      return copyAccount(account);
    } catch {
      return emptyAccount(session.user);
    }
  }

  private async persistAccount(session: AuthSession, account: AccountSave): Promise<void> {
    const next: AccountSave = {
      ...account,
      version: ACCOUNT_SAVE_VERSION,
      user: session.user,
      vault: normalizeVault(account.vault),
      updatedAt: Date.now(),
    };
    const envelope = await encryptJson(await this.codecFor(session), next);
    this.accountEnvelope = { user: session.user, raw: envelope };
    if (!this.store.writeAccountBlob(session.user, envelope)) {
      throw new Error("account_write_failed");
    }
    this.accountCache = { user: session.user, raw: envelope, account: next };
  }

  async loadAccountVault(): Promise<AccountVaultState> {
    const session = this.getSession();
    if (!session) return emptyVault();
    const account = await this.loadAccount(session);
    return normalizeVault(account.vault);
  }

  createSlot(input: {
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
    return this.enqueue(async () => {
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
        saveVersion: SAVE_VERSION,
      };
      const payload = this.seedPayload(summary, session.user, input.slotIndex);
      await this.writeNow(session, {
        payload,
        sections: new Set(PROFILE_SECTIONS),
        vault: null,
        critical: true,
        attempts: 0,
      });
      return summaryFromPayload(payload);
    });
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

  deleteSlot(slotIndex: number): Promise<void> {
    const session = this.requireSessionOrThrow();
    const current = parseProfileId(this.profileId);
    if (current && current.userId === session.user && current.slotIndex === slotIndex) this.cancelPending();
    return this.enqueue(async () => {
      const account = await this.loadAccount(session);
      const slot = account.slots[slotIndex];
      if (!slot) return;
      await this.clearProfileNow(slot.profileId);
      account.slots[slotIndex] = null;
      await this.persistAccount(session, account);
    });
  }

  commit(write: SaveWrite): Promise<void> {
    if (write.sections.length || write.vault) {
      const next: PendingWrite = {
        payload: write.payload,
        sections: new Set(write.sections),
        vault: write.vault,
        critical: write.critical,
        attempts: 0,
      };
      this.pending = this.pending ? mergeWrites(this.pending, next) : next;
    }
    return this.flush();
  }

  idle(): Promise<void> {
    return this.flushChain;
  }

  flush(): Promise<void> {
    const session = this.getSession();
    return this.enqueue(() => this.runPending(session));
  }

  private async runPending(session: AuthSession | null): Promise<void> {
    const write = this.pending;
    if (!write || !session) return;
    this.pending = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.setStatus("saving");
    try {
      await this.writeNow(session, write);
    } catch (err) {
      this.failWrite(write, err);
      return;
    }
    this.writeCount += 1;
    this.setStatus("saved");
    if (this.savedUiTimer) clearTimeout(this.savedUiTimer);
    this.savedUiTimer = setTimeout(() => {
      if (this.status === "saved") this.setStatus("idle");
    }, 1500);
  }

  private failWrite(write: PendingWrite, err: unknown): void {
    const failed: PendingWrite = { ...write, attempts: write.attempts + 1 };
    const merged = this.pending ? mergeWrites(failed, this.pending) : failed;
    if (!merged.critical && merged.attempts >= RETRY_DELAYS_MS.length) {
      this.pending = null;
    } else {
      this.pending = merged;
      const delay = RETRY_DELAYS_MS[merged.attempts - 1];
      if (delay !== undefined) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          void this.flush();
        }, delay);
      }
    }
    this.setStatus("error", err instanceof Error ? err.message : "save_failed");
  }

  private stamp(payload: SavePayload): SavePayload {
    this.lastStamp = Math.max(Date.now(), this.lastStamp + 1);
    return {
      ...payload,
      saveVersion: SAVE_VERSION,
      meta: { ...payload.meta, updatedAt: this.lastStamp },
    };
  }

  private async writeNow(session: AuthSession, write: PendingWrite): Promise<void> {
    const codec = await this.codecFor(session);
    const payload = write.payload && write.sections.size ? this.stamp(write.payload) : null;
    const blobs: SectionBlobs = {};
    if (payload) {
      for (const section of PROFILE_SECTIONS) {
        if (section !== "meta" && !write.sections.has(section)) continue;
        blobs[section] = await encryptJson(codec, sectionValue(payload, section));
      }
    }
    const account = await this.nextAccount(session, write.vault, payload);
    if (account) await this.persistAccount(session, account);
    if (!payload) return;
    const profileId = payload.meta.profileId;
    this.cacheEncrypted(profileId, blobs);
    await this.store.writeMany(profileId, blobs);
    if (this.legacyCleared.has(profileId)) return;
    try {
      await this.store.clearLegacyProfile(profileId);
      this.legacyCleared.add(profileId);
    } catch {

    }
  }

  private async nextAccount(
    session: AuthSession,
    vault: AccountVaultState | null,
    payload: SavePayload | null,
  ): Promise<AccountSave | null> {
    if (!vault && !payload) return null;
    const account = await this.loadAccount(session);
    let changed = false;
    if (vault) {
      account.vault = normalizeVault(vault);
      changed = true;
    }
    const parsed = payload ? parseProfileId(payload.meta.profileId) : null;
    if (payload && parsed && parsed.userId === session.user && parsed.slotIndex >= 0 && parsed.slotIndex < SLOT_COUNT) {
      const summary = summaryFromPayload(payload);
      if (JSON.stringify(account.slots[parsed.slotIndex]) !== JSON.stringify(summary)) {
        account.slots[parsed.slotIndex] = summary;
        changed = true;
      }
    }
    return changed ? account : null;
  }

  private cacheEncrypted(profileId: string, blobs: SectionBlobs): void {
    const base = this.encrypted?.profileId === profileId ? this.encrypted.sections : {};
    this.encrypted = { profileId, sections: { ...base, ...blobs } };
  }

  writeMirror(): void {
    if (!this.getSession()) return;
    const cached = this.encrypted;
    if (cached && PROFILE_SECTIONS.every((s) => !!cached.sections[s])) {
      this.store.writeMirror(cached.profileId, cached.sections);
    }
    const account = this.accountEnvelope;
    if (account && this.store.readAccountBlob(account.user) !== account.raw) {
      this.store.writeAccountBlob(account.user, account.raw);
    }
  }

  private async decodeSections(
    codec: CodecKey,
    blobs: SectionBlobs,
    profileId: string,
  ): Promise<SavePayload | null> {
    if (!blobs.meta) throw new Error("meta_missing");
    const { saveVersion, ...meta } = (await decryptJson(codec, blobs.meta)) as { saveVersion?: unknown } & SavePayload["meta"];
    if (typeof saveVersion !== "number" || saveVersion < SAVE_VERSION) return null;
    const raw: Record<string, unknown> = { saveVersion, meta };
    for (const section of PROFILE_SECTIONS) {
      if (section === "meta") continue;
      const blob = blobs[section];
      if (!blob) throw new Error("section_missing");
      raw[section] = await decryptJson(codec, blob);
    }
    return migrateSave(raw, profileId);
  }

  async loadCharacter(profileId?: string): Promise<CharacterLoadResult> {
    const id = profileId || this.profileId;
    this.profileId = id;
    let blobs: SectionBlobs;
    try {
      blobs = await this.store.readAll(id);
    } catch {
      return { status: "unreadable" };
    }
    const mirror = this.store.readMirror(id);
    const hasIdb = Object.keys(blobs).length > 0;
    if (!hasIdb && !mirror) return { status: "missing" };
    const session = this.getSession();
    if (!session) return { status: "unreadable" };
    let codec: CodecKey;
    try {
      codec = await this.codecFor(session);
    } catch {
      return { status: "unreadable" };
    }
    let fromIdb: SavePayload | null = null;
    if (hasIdb) {
      try {
        fromIdb = await this.decodeSections(codec, blobs, id);
      } catch {
        return { status: "unreadable" };
      }
    }
    let fromMirror: SavePayload | null = null;
    if (mirror) {
      try {
        fromMirror = await this.decodeSections(codec, mirror, id);
      } catch {
        fromMirror = null;
      }
    }
    const useMirror = !!fromMirror && (!fromIdb || fromMirror.meta.updatedAt > fromIdb.meta.updatedAt);
    const best = useMirror ? fromMirror : fromIdb;
    if (!best) return { status: "missing" };
    this.encrypted = { profileId: id, sections: { ...(useMirror && mirror ? mirror : blobs) } };
    this.lastStamp = Math.max(this.lastStamp, Number(best.meta?.updatedAt) || 0);
    return { status: "ok", payload: best, fromMirror: useMirror };
  }

  private async clearProfileNow(profileId: string): Promise<void> {
    await this.store.clearProfile(profileId);
    if (this.encrypted?.profileId === profileId) this.encrypted = null;
  }

  wipeProfile(profileId: string): Promise<void> {
    if (profileId === this.profileId) this.cancelPending();
    const session = this.getSession();
    return this.enqueue(async () => {
      await this.clearProfileNow(profileId);
      if (!session) return;
      const parsed = parseProfileId(profileId);
      if (!parsed || parsed.userId !== session.user) return;
      const account = await this.loadAccount(session);
      if (account.slots[parsed.slotIndex]?.profileId === profileId) {
        account.slots[parsed.slotIndex] = null;
        await this.persistAccount(session, account);
      }
    });
  }

  async wipeAccount(userId: string): Promise<void> {
    if (parseProfileId(this.profileId)?.userId === userId || this.getSession()?.user === userId) this.cancelPending();
    await this.enqueue(async () => {
      for (let i = 0; i < SLOT_COUNT; i++) await this.clearProfileNow(profileIdFor(userId, i));
      this.store.clearAccountBlob(userId);
      if (this.accountCache?.user === userId) this.accountCache = null;
      if (this.accountEnvelope?.user === userId) this.accountEnvelope = null;
    });
    if (this.getSession()?.user === userId) await this.logout();
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
    await this.logout();
    try {
      sessionStorage.removeItem("uaidzin_active_char");
      sessionStorage.removeItem(SESSION_KEY);
    } catch {

    }
    await this.enqueue(() => this.store.wipeAllUaidzinStorage(includeSettings));
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
    await this.enqueue(() =>
      this.writeNow(session, {
        payload: parsed,
        sections: new Set(PROFILE_SECTIONS),
        vault: null,
        critical: true,
        attempts: 0,
      }),
    );
    return parsed;
  }

  slotExists(slots: Array<SlotSummary | null>, profileId: string): boolean {
    return slots.some((s) => s?.profileId === profileId);
  }
}

export const saveVault = new SaveVault();

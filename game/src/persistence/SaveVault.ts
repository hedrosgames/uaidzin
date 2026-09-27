import { AccountAuth, SESSION_KEY } from "./AccountAuth";
import { decryptJson, encryptJson, importCodecKey, type CodecKey } from "./crypto/CryptoCodec";
import { migrateAccount, migrateSave } from "./migrations";
import { SaveStore, type AccountBlobs, type AccountWrite, type SectionBlobs } from "./SaveStore";
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

function sameSummary(a: SlotSummary | null, b: SlotSummary | null): boolean {
  return JSON.stringify(normalizeSlots([a])[0]) === JSON.stringify(normalizeSlots([b])[0]);
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
  private vaultEnvelope: { user: string; raw: string } | null = null;
  private accountCache: { user: string; account: AccountSave } | null = null;
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
    this.vaultEnvelope = null;
    this.accountCache = null;
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

  async loadAccount(session: AuthSession, fresh = false): Promise<AccountSave> {
    const cached = this.accountCache;
    if (!fresh && cached?.user === session.user) return structuredClone(cached.account);
    const account = await this.readAccount(session);
    this.lastStamp = Math.max(this.lastStamp, account.updatedAt);
    this.accountCache = { user: session.user, account };
    return structuredClone(account);
  }

  private async readAccount(session: AuthSession): Promise<AccountSave> {
    const blobs = await this.store.readAccount(session.user);
    const mirror = this.store.readVaultMirror(session.user);
    if (!blobs.slots && !blobs.vault && !mirror) return emptyAccount(session.user);
    const codec = await this.codecFor(session);
    const slots = blobs.slots ? migrateAccount(await decryptJson(codec, blobs.slots)) : null;
    let vault = blobs.vault ? migrateAccount(await decryptJson(codec, blobs.vault)) : null;
    if (mirror) {
      try {
        const fromMirror = migrateAccount(await decryptJson(codec, mirror));
        if (fromMirror && (!vault || Number(fromMirror.updatedAt) > Number(vault.updatedAt))) vault = fromMirror;
      } catch {

      }
    }
    return {
      version: ACCOUNT_SAVE_VERSION,
      user: session.user,
      slots: normalizeSlots(slots?.slots),
      vault: normalizeVault(vault?.vault),
      updatedAt: Math.max(Number(slots?.updatedAt) || 0, Number(vault?.updatedAt) || 0),
    };
  }

  private encryptAccountPart(
    codec: CodecKey,
    session: AuthSession,
    part: { slots: AccountSave["slots"] } | { vault: AccountVaultState },
  ): Promise<string> {
    return encryptJson(codec, { version: ACCOUNT_SAVE_VERSION, user: session.user, ...part, updatedAt: this.nextStamp() });
  }

  private nextStamp(): number {
    this.lastStamp = Math.max(Date.now(), this.lastStamp + 1);
    return this.lastStamp;
  }

  private remember(session: AuthSession, account: AccountSave): void {
    this.accountCache = { user: session.user, account: structuredClone(account) };
  }

  private vaultPersisted(session: AuthSession, raw: string): void {
    if (this.vaultEnvelope?.raw !== raw) return;
    this.vaultEnvelope = null;
    this.store.clearVaultMirror(session.user);
  }

  writeAccount(patch: { slots?: unknown; vault?: unknown }): Promise<void> {
    const session = this.requireSessionOrThrow();
    return this.enqueue(async () => {
      const codec = await this.codecFor(session);
      const blobs: AccountBlobs = {};
      if (patch.slots !== undefined) blobs.slots = await this.encryptAccountPart(codec, session, { slots: normalizeSlots(patch.slots) });
      if (patch.vault !== undefined) blobs.vault = await this.encryptAccountPart(codec, session, { vault: normalizeVault(patch.vault) });
      this.accountCache = null;
      await this.store.writeMany(null, {}, { userId: session.user, ...blobs });
    });
  }

  async loadAccountVault(): Promise<AccountVaultState> {
    const session = this.getSession();
    if (!session) return emptyVault();
    const account = await this.loadAccount(session, true);
    return account.vault;
  }

  private newSummary(
    userId: string,
    input: {
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
    },
  ): SlotSummary {
    return {
      profileId: profileIdFor(userId, input.slotIndex),
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
      const summary = this.newSummary(session.user, input);
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

  reserveSlot(slotIndex: number, classId: string, name: string): Promise<SlotSummary> {
    const session = this.requireSessionOrThrow();
    return this.enqueue(async () => {
      const account = await this.loadAccount(session);
      if (slotIndex < 0 || slotIndex >= SLOT_COUNT) throw new Error("bad_slot");
      if (account.slots[slotIndex]) throw new Error("slot_occupied");
      const summary = this.newSummary(session.user, { slotIndex, classId, name });
      account.slots[slotIndex] = summary;
      await this.writeSlots(session, account, summary.profileId);
      return summary;
    });
  }

  deleteSlot(slotIndex: number): Promise<void> {
    const session = this.requireSessionOrThrow();
    const current = parseProfileId(this.profileId);
    if (current && current.userId === session.user && current.slotIndex === slotIndex) this.cancelPending();
    return this.enqueue(async () => {
      const account = await this.loadAccount(session);
      if (slotIndex < 0 || slotIndex >= SLOT_COUNT) throw new Error("bad_slot");
      const profileId = account.slots[slotIndex]?.profileId || profileIdFor(session.user, slotIndex);
      account.slots[slotIndex] = null;
      await this.writeSlots(session, account, profileId);
    });
  }

  private async writeSlots(session: AuthSession, account: AccountSave, clearProfileId: string): Promise<void> {
    const slots = await this.encryptAccountPart(await this.codecFor(session), session, { slots: account.slots });
    await this.clearProfileNow(clearProfileId, { userId: session.user, slots });
    this.remember(session, account);
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
    return {
      ...payload,
      saveVersion: SAVE_VERSION,
      meta: { ...payload.meta, updatedAt: this.nextStamp() },
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
    const { blobs: account, next } = await this.accountBlobs(session, codec, write.vault, payload);
    if (account.vault) this.vaultEnvelope = { user: session.user, raw: account.vault };
    const profileId = payload ? payload.meta.profileId : null;
    if (profileId) this.cacheEncrypted(profileId, blobs);
    const touchesAccount = account.slots !== undefined || account.vault !== undefined;
    if (!profileId && !touchesAccount) return;
    await this.store.writeMany(profileId, blobs, touchesAccount ? { userId: session.user, ...account } : null);
    if (next && touchesAccount) this.remember(session, next);
    if (account.vault) this.vaultPersisted(session, account.vault);
    if (!profileId || this.legacyCleared.has(profileId)) return;
    try {
      await this.store.clearLegacyProfile(profileId);
      this.legacyCleared.add(profileId);
    } catch {

    }
  }

  private async accountBlobs(
    session: AuthSession,
    codec: CodecKey,
    vault: AccountVaultState | null,
    payload: SavePayload | null,
  ): Promise<{ blobs: AccountBlobs; next: AccountSave | null }> {
    if (!vault && !payload) return { blobs: {}, next: null };
    const account = await this.loadAccount(session);
    const out: AccountBlobs = {};
    if (vault) {
      account.vault = normalizeVault(vault);
      out.vault = await this.encryptAccountPart(codec, session, { vault: account.vault });
    }
    if (payload && this.syncSlotSummary(session, account, payload)) {
      out.slots = await this.encryptAccountPart(codec, session, { slots: account.slots });
    }
    return { blobs: out, next: account };
  }

  private syncSlotSummary(session: AuthSession, account: AccountSave, payload: SavePayload): boolean {
    const parsed = parseProfileId(payload.meta.profileId);
    if (!parsed || parsed.userId !== session.user || parsed.slotIndex < 0 || parsed.slotIndex >= SLOT_COUNT) return false;
    const summary = summaryFromPayload(payload);
    if (sameSummary(account.slots[parsed.slotIndex], summary)) return false;
    account.slots[parsed.slotIndex] = summary;
    return true;
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
    const vault = this.vaultEnvelope;
    if (vault) this.store.writeVaultMirror(vault.user, vault.raw);
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

  private async clearProfileNow(profileId: string, account: AccountWrite | null = null): Promise<void> {
    await this.store.clearProfile(profileId, account);
    if (this.encrypted?.profileId === profileId) this.encrypted = null;
  }

  wipeProfile(profileId: string): Promise<void> {
    if (profileId === this.profileId) this.cancelPending();
    const session = this.getSession();
    return this.enqueue(async () => {
      const parsed = parseProfileId(profileId);
      if (!session || !parsed || parsed.userId !== session.user) {
        await this.clearProfileNow(profileId);
        return;
      }
      const account = await this.loadAccount(session);
      if (account.slots[parsed.slotIndex]?.profileId !== profileId) {
        await this.clearProfileNow(profileId);
        return;
      }
      account.slots[parsed.slotIndex] = null;
      await this.writeSlots(session, account, profileId);
    });
  }

  async wipeAccount(userId: string): Promise<void> {
    if (parseProfileId(this.profileId)?.userId === userId || this.getSession()?.user === userId) this.cancelPending();
    await this.enqueue(async () => {
      for (let i = 0; i < SLOT_COUNT; i++) await this.clearProfileNow(profileIdFor(userId, i));
      await this.store.clearAccount(userId);
      if (this.vaultEnvelope?.user === userId) this.vaultEnvelope = null;
      if (this.accountCache?.user === userId) this.accountCache = null;
    });
    if (this.getSession()?.user === userId) await this.logout();
    try {
      sessionStorage.removeItem("uaidzin_active_char");
    } catch {

    }
    if (userId === "admin") {
      await this.auth.deleteAccountRecord("admin");
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

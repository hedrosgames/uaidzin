import type { AccountVaultState } from "../domain/account/AccountVaultService";
import type { SaveVault } from "./SaveVault";
import type { ProfileSection, SaveEventKind, SavePayload, SaveTarget } from "./SaveTypes";

export const DEFERRED_SAVE_DELAY_MS = 2000;

export class SaveCoordinator {
  private readonly dirty = new Map<SaveTarget, SaveEventKind>();
  private frameQueued = false;
  private deferredTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly vault: SaveVault,
    private readonly buildPayload: () => SavePayload | null,
    private readonly buildVault: () => AccountVaultState,
  ) {
    vault.onCancel(() => this.reset());
  }

  markDirty(targets: SaveTarget | SaveTarget[], kind: SaveEventKind): void {
    for (const target of Array.isArray(targets) ? targets : [targets]) {
      if (this.dirty.get(target) !== "critical") this.dirty.set(target, kind);
    }
    if (kind === "critical") {
      if (this.frameQueued) return;
      this.frameQueued = true;
      queueMicrotask(() => {
        this.frameQueued = false;
        void this.checkpoint();
      });
      return;
    }
    if (this.deferredTimer) clearTimeout(this.deferredTimer);
    this.deferredTimer = setTimeout(() => {
      this.deferredTimer = null;
      void this.checkpoint();
    }, DEFERRED_SAVE_DELAY_MS);
  }

  hasDirty(): boolean {
    return this.dirty.size > 0;
  }

  checkpoint(): Promise<void> {
    this.clearDeferredTimer();
    if (!this.dirty.size) return this.vault.flush();
    const targets = [...this.dirty.keys()];
    const critical = [...this.dirty.values()].includes("critical");
    this.dirty.clear();
    const sections = targets.filter((t): t is ProfileSection => t !== "vault");
    const payload = sections.length ? this.buildPayload() : null;
    return this.vault.commit({
      payload,
      sections: payload ? sections : [],
      vault: targets.includes("vault") ? this.buildVault() : null,
      critical,
    });
  }

  private clearDeferredTimer(): void {
    if (!this.deferredTimer) return;
    clearTimeout(this.deferredTimer);
    this.deferredTimer = null;
  }

  private reset(): void {
    this.dirty.clear();
    this.clearDeferredTimer();
  }
}

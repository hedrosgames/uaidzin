export const ACCOUNT_LOCKED_MESSAGE = "Esta conta já está aberta em outra aba.";
export const LOCK_TTL_MS = 5000;

const LOCK_PREFIX = "uaidzin:account:";
const CHANNEL_NAME = "uaidzin:account-lock";
const HEARTBEAT_MS = 1000;
const CLAIM_WAIT_MS = 300;
const CONFIRM_WAIT_MS = 100;
const ACQUIRE_RETRY_MS = 250;
const ACQUIRE_WINDOW_MS = 1000;

type Release = () => Promise<void>;

type Attempt = { release: Release; fallback: boolean };

const tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function heartbeatKey(userId: string): string {
  return `uaidzin.lock.${userId}`;
}

function readHeartbeat(userId: string): { owner: string; at: number } | null {
  try {
    const data = JSON.parse(localStorage.getItem(heartbeatKey(userId)) || "null") as { owner?: unknown; at?: unknown } | null;
    if (typeof data?.owner !== "string" || typeof data.at !== "number") return null;
    return { owner: data.owner, at: data.at };
  } catch {
    return null;
  }
}

function writeHeartbeat(userId: string): void {
  try {
    localStorage.setItem(heartbeatKey(userId), JSON.stringify({ owner: tabId, at: Date.now() }));
  } catch {

  }
}

function heldElsewhere(userId: string): boolean {
  const beat = readHeartbeat(userId);
  return !!beat && beat.owner !== tabId && Date.now() - beat.at < LOCK_TTL_MS;
}

function tryWebLock(locks: LockManager, userId: string): Promise<Release | null> {
  return new Promise((resolve) => {
    const done = locks.request(LOCK_PREFIX + userId, { ifAvailable: true }, (lock) => {
      if (!lock) {
        resolve(null);
        return;
      }
      return new Promise<void>((release) => {
        resolve(() => {
          release();
          return done.then(
            () => undefined,
            () => undefined,
          );
        });
      });
    });
    done.catch(() => resolve(null));
  });
}

function clearOwnHeartbeat(userId: string): void {
  try {
    if (readHeartbeat(userId)?.owner === tabId) localStorage.removeItem(heartbeatKey(userId));
  } catch {

  }
}

function presenceWorker(userId: string): { stop: () => void } | null {
  if (typeof Worker === "undefined" || typeof BroadcastChannel === "undefined") return null;
  const body = [
    `const channel = new BroadcastChannel(${JSON.stringify(CHANNEL_NAME)});`,
    `const userId = ${JSON.stringify(userId)};`,
    `channel.onmessage = (event) => {`,
    `  if (event.data && event.data.type === "claim" && event.data.userId === userId) channel.postMessage({ type: "held", userId });`,
    `};`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/javascript" }));
  try {
    const worker = new Worker(url);
    return {
      stop: () => {
        worker.terminate();
        URL.revokeObjectURL(url);
      },
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

async function tryFallback(userId: string): Promise<Release | null> {
  if (heldElsewhere(userId)) return null;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
  let answered = false;
  if (channel) {
    channel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === "held" && event.data.userId === userId) answered = true;
    };
    channel.postMessage({ type: "claim", userId });
    await sleep(CLAIM_WAIT_MS);
  }
  if (!answered && !heldElsewhere(userId)) {
    writeHeartbeat(userId);
    await sleep(CONFIRM_WAIT_MS);
  }
  channel?.close();
  if (answered || readHeartbeat(userId)?.owner !== tabId) {
    clearOwnHeartbeat(userId);
    return null;
  }
  const presence = presenceWorker(userId);
  const beat = setInterval(() => writeHeartbeat(userId), HEARTBEAT_MS);
  return async () => {
    clearInterval(beat);
    presence?.stop();
    clearOwnHeartbeat(userId);
  };
}

async function tryAcquire(userId: string): Promise<Attempt | null> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const release = locks ? await tryWebLock(locks, userId) : await tryFallback(userId);
  return release ? { release, fallback: !locks } : null;
}

export class AccountLock {
  private held: { userId: string; release: Release; fallback: boolean } | null = null;
  private suspended: string | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  constructor() {
    if (typeof window === "undefined") return;
    window.addEventListener("pagehide", () => void this.suspend());
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) void this.resume();
    });
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void this.suspend();
        else void this.resume();
      });
    }
  }

  current(): string | null {
    return this.held?.userId ?? null;
  }

  acquire(userId: string): Promise<boolean> {
    return this.serial(async () => {
      if (this.held?.userId === userId) return true;
      await this.releaseNow();
      const deadline = Date.now() + ACQUIRE_WINDOW_MS;
      for (;;) {
        const attempt = await tryAcquire(userId);
        if (attempt) {
          this.held = { userId, ...attempt };
          return true;
        }
        if (Date.now() >= deadline) return false;
        await sleep(ACQUIRE_RETRY_MS);
      }
    });
  }

  release(): Promise<void> {
    return this.serial(() => this.releaseNow());
  }

  private async releaseNow(): Promise<void> {
    const held = this.held;
    this.held = null;
    this.suspended = null;
    if (held) await held.release();
  }

  private suspend(): Promise<void> {
    return this.serial(async () => {
      const held = this.held;
      if (!held?.fallback) return;
      this.held = null;
      this.suspended = held.userId;
      await held.release();
    });
  }

  private async resume(): Promise<void> {
    const userId = this.suspended;
    if (!userId) return;
    this.suspended = null;
    if (!(await this.acquire(userId))) window.location.reload();
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const next = this.chain.then(task, task);
    this.chain = next.catch(() => undefined);
    return next;
  }
}

export const accountLock = new AccountLock();

let batch: Promise<void>[] | null = null;

export function beginWorldVisuals(): void {
  batch = [];
}

export function trackWorldVisual(work: Promise<unknown>): void {
  const done = work.then(() => undefined, () => undefined);
  batch?.push(done);
}

export function endWorldVisuals(): Promise<void> {
  const jobs = batch ?? [];
  batch = null;
  return Promise.all(jobs).then(() => undefined);
}

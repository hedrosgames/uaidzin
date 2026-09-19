export type ActiveBuff = {
  id: string;
  remainingSec: number;
  stacks: number;
  magnitude?: number;
};

export class BuffService {
  readonly active: ActiveBuff[] = [];

  snapshot(): ActiveBuff[] {
    return this.active.map((b) => ({ ...b }));
  }

  apply(list: ActiveBuff[] | null | undefined): void {
    this.active.length = 0;
    for (const b of list || []) {
      if (!b?.id) continue;
      this.active.push({
        id: String(b.id),
        remainingSec: Math.max(0, Number(b.remainingSec) || 0),
        stacks: Math.max(1, Math.floor(Number(b.stacks) || 1)),
        magnitude: b.magnitude,
      });
    }
  }

  clear(): void {
    this.active.length = 0;
  }

  add(buff: ActiveBuff): void {
    const existing = this.active.find((b) => b.id === buff.id);
    if (existing) {
      existing.remainingSec = Math.max(existing.remainingSec, buff.remainingSec);
      existing.stacks = Math.max(existing.stacks, buff.stacks);
      if (buff.magnitude != null) existing.magnitude = buff.magnitude;
      return;
    }
    this.active.push({ ...buff });
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].remainingSec -= dt;
      if (this.active[i].remainingSec <= 0) this.active.splice(i, 1);
    }
  }
}

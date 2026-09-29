export type BuffStat =
  | "attack"
  | "defense"
  | "maxHp"
  | "evasion"
  | "attackSpeed"
  | "moveSpeed"
  | "magicPower"
  | "crit"
  | "magicResist"
  | "healPower"
  | "damageReduction"
  | "reflect"
  | "mpCost"
  | "mpToHp"
  | "stealth"
  | "summonPower"
  | "damageFlat"
  | "xpMultiplier";

export type ActiveBuff = {
  id: string;
  remainingSec: number;
  stacks: number;
  magnitude?: number;
  stat?: BuffStat;
  harmful?: boolean;
  nextHitMul?: number;
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
        stat: b.stat,
        harmful: b.harmful,
        nextHitMul: b.nextHitMul,
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
      if (buff.stat) existing.stat = buff.stat;
      if (buff.harmful != null) existing.harmful = buff.harmful;
      if (buff.nextHitMul != null) existing.nextHitMul = buff.nextHitMul;
      return;
    }
    this.active.push({ ...buff });
  }

  has(id: string, minRemaining = 0): boolean {
    return this.active.some((buff) => buff.id === id && buff.remainingSec > minRemaining);
  }

  remove(id: string): void {
    const index = this.active.findIndex((buff) => buff.id === id);
    if (index >= 0) this.active.splice(index, 1);
  }

  cleanse(): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].harmful) this.active.splice(i, 1);
    }
  }

  consumeStealth(): number {
    const buff = this.active.find((item) => item.stat === "stealth");
    if (!buff) return 1;
    const mul = buff.nextHitMul ?? 1.5;
    this.remove(buff.id);
    return mul;
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].remainingSec -= dt;
      if (this.active[i].remainingSec <= 0) this.active.splice(i, 1);
    }
  }
}

import { ECONOMY_BALANCE } from "../../data/balance/economy";

export const BAG_COUNT = ECONOMY_BALANCE.bagCount;

function defaultBagLocks(): boolean[] {
  return Array.from({ length: BAG_COUNT }, (_, i) => i === 0);
}

export class BagLockService {
  unlocked: boolean[] = defaultBagLocks();

  snapshot(): boolean[] {
    return this.unlocked.map((v, i) => (i === 0 ? true : !!v));
  }

  apply(list: boolean[] | null | undefined): void {
    const next = defaultBagLocks();
    if (Array.isArray(list)) {
      for (let i = 0; i < BAG_COUNT; i++) {
        next[i] = i === 0 ? true : !!list[i];
      }
    }
    this.unlocked = next;
  }

  isUnlocked(index: number): boolean {
    if (index <= 0) return true;
    return !!this.unlocked[index];
  }

  unlock(index: number): void {
    if (index <= 0 || index >= BAG_COUNT) return;
    this.unlocked[index] = true;
  }
}

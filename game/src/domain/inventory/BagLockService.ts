export const BAG_COUNT = 4;

export class BagLockService {
  unlocked: boolean[] = [true, false, false, false];

  snapshot(): boolean[] {
    return this.unlocked.map((v, i) => (i === 0 ? true : !!v));
  }

  apply(list: boolean[] | null | undefined): void {
    const next = [true, false, false, false];
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

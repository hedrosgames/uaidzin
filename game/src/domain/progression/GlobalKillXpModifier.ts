export class GlobalKillXpModifier {
  private multiplier = 1;

  get(): number {
    return this.multiplier;
  }

  set(multiplier: number): void {
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      this.multiplier = 1;
      return;
    }
    this.multiplier = multiplier;
  }

  reset(): void {
    this.multiplier = 1;
  }
}

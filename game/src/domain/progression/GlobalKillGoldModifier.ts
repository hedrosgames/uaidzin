import { clampGlobalKillGoldMultiplier } from "../../data/balance/gold-modifiers";

export class GlobalKillGoldModifier {
  private multiplier = 1;

  get(): number {
    return this.multiplier;
  }

  set(multiplier: number): void {
    this.multiplier = clampGlobalKillGoldMultiplier(multiplier);
  }

  reset(): void {
    this.multiplier = 1;
  }
}

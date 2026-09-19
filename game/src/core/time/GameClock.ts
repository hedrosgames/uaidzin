export class GameClock {
  private elapsed = 0;

  getElapsedSeconds(): number {
    return this.elapsed;
  }

  advance(deltaSeconds: number): void {
    if (deltaSeconds > 0) {
      this.elapsed += deltaSeconds;
    }
  }

  reset(): void {
    this.elapsed = 0;
  }
}

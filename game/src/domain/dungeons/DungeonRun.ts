import type { DungeonDef } from "../../data/dungeons/dungeon-definitions";

export type DungeonRunPhase = "idle" | "active" | "completed" | "expired";

export interface DungeonRunResult {
  dungeonId: string;
  reason: "timer" | "death" | "exit";
  elapsedSeconds: number;
  kills: number;
  xpGained: number;
}



export class DungeonRun {
  private def: DungeonDef | null = null;
  private phase: DungeonRunPhase = "idle";
  private remaining = 0;
  private elapsed = 0;
  private kills = 0;
  private xp = 0;

  getPhase(): DungeonRunPhase {
    return this.phase;
  }

  getRemainingSeconds(): number {
    return this.remaining;
  }

  getElapsedSeconds(): number {
    return this.elapsed;
  }

  getKills(): number {
    return this.kills;
  }

  getXp(): number {
    return this.xp;
  }

  getDef(): DungeonDef | null {
    return this.def;
  }

  start(def: DungeonDef, durationSeconds?: number): void {
    this.def = def;
    this.phase = "active";
    const dur = durationSeconds ?? def.durationSeconds;
    this.remaining = dur;
    this.elapsed = 0;
    this.kills = 0;
    this.xp = 0;
  }

  addKill(xp: number): void {
    if (this.phase !== "active") return;
    this.kills += 1;
    this.xp += xp;
  }

  
  tick(dt: number): boolean {
    if (this.phase !== "active") return false;
    this.elapsed += dt;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining <= 0) {
      this.phase = "expired";
      return true;
    }
    return false;
  }

  end(reason: DungeonRunResult["reason"]): DungeonRunResult {
    const result: DungeonRunResult = {
      dungeonId: this.def?.id ?? "none",
      reason,
      elapsedSeconds: this.elapsed,
      kills: this.kills,
      xpGained: this.xp,
    };
    this.phase = reason === "timer" ? "expired" : "completed";
    this.def = null;
    return result;
  }

  reset(): void {
    this.def = null;
    this.phase = "idle";
    this.remaining = 0;
    this.elapsed = 0;
    this.kills = 0;
    this.xp = 0;
  }

  
  setRemaining(seconds: number): void {
    if (this.phase === "active") this.remaining = Math.max(0, seconds);
  }
}

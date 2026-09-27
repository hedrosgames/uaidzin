import type { HudModel } from "../../ui/HudModel";

export type SessionHud = HudModel;

export type DungeonEnterReason = "missing" | "evolution" | "level" | "entry" | "busy";
export type DungeonEnterResult = { ok: true } | { ok: false; reason: DungeonEnterReason };

export function dungeonEnterMessage(reason: DungeonEnterReason): string {
  switch (reason) {
    case "missing":
      return "Dungeon não encontrada";
    case "evolution":
      return "Evolução sem conteúdo nesta dungeon";
    case "level":
      return "Fora da faixa";
    case "entry":
      return "Entrada insuficiente";
    case "busy":
      return "Transição em andamento";
    default: {
      const exhaustive: never = reason;
      throw new Error(String(exhaustive));
    }
  }
}

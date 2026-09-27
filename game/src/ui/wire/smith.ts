import type { WireItem } from "../WireApi";
import type { WireContext } from "./types";

export interface SmithManager {
  openSmith(): void;
  canRefine(item: WireItem): boolean;
  refine(uid: string): { ok: boolean; costGold: number; mat: string };
}

export function createSmithManager(ctx: WireContext): SmithManager {
  function openSmith(): void {
    ctx.openPanel("shop", { title: "Ferreiro", shopId: "blacksmith" });
  }

  function canRefine(item: WireItem): boolean {
    if (!item) return false;
    const slot = String(item.slot || "").toLowerCase();
    if (slot !== "weapon" && slot !== "armor" && slot !== "head") return false;
    return (item.refine || 0) < 12;
  }

  function refine(uid: string): { ok: boolean; costGold: number; mat: string } {
    const res = ctx.api.refineItem(uid);
    ctx.syncFromGame();
    return res;
  }

  return {
    openSmith,
    canRefine,
    refine,
  };
}

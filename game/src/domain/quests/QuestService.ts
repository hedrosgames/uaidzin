import { QUEST_BY_ID, QUEST_CATALOG, type QuestDef } from "../../data/quests/quest-definitions";
import type { QuestState } from "../../persistence/SaveTypes";

export type QuestUiRow = {
  id: string;
  title: string;
  objective: string;
  status: "available" | "active" | "done" | "locked";
  step: number;
  target: number;
  rewardXp: number;
  rewardGold: number;
  canAccept: boolean;
};

export class QuestService {
  constructor(private readonly getQuests: () => Record<string, QuestState>) {}

  listForUi(): QuestUiRow[] {
    return QUEST_CATALOG.map((def) => this.toRow(def));
  }

  getRow(id: string): QuestUiRow | null {
    const def = QUEST_BY_ID[id];
    if (!def) return null;
    return this.toRow(def);
  }

  accept(id: string): { ok: boolean; message: string } {
    const def = QUEST_BY_ID[id];
    if (!def) return { ok: false, message: "Missão desconhecida." };
    if (def.repeat !== "story") return { ok: false, message: "Missão indisponível." };
    const quests = this.getQuests();
    const cur = quests[id];
    if (cur?.status === "done") return { ok: false, message: "Missão já concluída." };
    if (cur?.status === "active") return { ok: false, message: "Missão já ativa." };
    if (cur?.status === "locked") return { ok: false, message: "Missão bloqueada." };
    quests[id] = { status: "active", step: 0 };
    return { ok: true, message: `Missão aceita: ${def.title}.` };
  }

  recordKill(): { completedIds: string[] } {
    const quests = this.getQuests();
    const completed: string[] = [];
    for (const def of QUEST_CATALOG) {
      if (def.kind !== "kill") continue;
      const st = quests[def.id];
      if (!st || st.status !== "active") continue;
      const step = Math.max(0, Math.floor(Number(st.step) || 0)) + 1;
      st.step = step;
      if (step >= def.target) {
        st.status = "done";
        st.step = def.target;
        completed.push(def.id);
      }
    }
    return { completedIds: completed };
  }

  private toRow(def: QuestDef): QuestUiRow {
    const st = this.getQuests()[def.id];
    let status: QuestUiRow["status"] = "available";
    let step = 0;
    if (st?.status === "locked") status = "locked";
    else if (st?.status === "active") {
      status = "active";
      step = Math.max(0, Math.floor(Number(st.step) || 0));
    } else if (st?.status === "done") {
      status = "done";
      step = def.target;
    }
    return {
      id: def.id,
      title: def.title,
      objective: def.objective,
      status,
      step,
      target: def.target,
      rewardXp: def.reward.xp,
      rewardGold: def.reward.gold,
      canAccept: status === "available",
    };
  }
}

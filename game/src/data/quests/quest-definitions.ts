export type QuestKind = "kill" | "dungeon_clear" | "collect";
export type QuestRepeat = "story" | "daily";

export type QuestDef = {
  id: string;
  kind: QuestKind;
  title: string;
  objective: string;
  target: number;
  reward: { xp: number; gold: number; itemId?: string };
  repeat: QuestRepeat;
};

export const QUEST_CATALOG: QuestDef[] = [
  {
    id: "q_mortal_kill_01",
    kind: "kill",
    title: "Primeiros passos",
    objective: "Derrotar inimigos na dungeon",
    target: 10,
    reward: { xp: 0, gold: 0 },
    repeat: "story",
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  QUEST_CATALOG.map((q) => [q.id, q]),
);

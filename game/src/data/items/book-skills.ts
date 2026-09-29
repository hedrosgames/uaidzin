export const BOOK_ITEM_TO_SKILL: Record<string, string> = {
  book_01: "book_hp",
  book_02: "book_gold",
  book_03: "book_xp",
  book_04: "book_cd",
};

export function skillIdForBookItem(defId: string): string | null {
  return BOOK_ITEM_TO_SKILL[defId] ?? null;
}

export const BOOK_SKILL_IDS = new Set(Object.values(BOOK_ITEM_TO_SKILL));

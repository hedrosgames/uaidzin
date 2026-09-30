export type ArmorAppearance = "gold" | "silver" | "adamant";
export const ARMOR_APPEARANCES: readonly ArmorAppearance[];
export function normalizeArmorAppearance(value: unknown): ArmorAppearance;
export function resolveArmorAppearance(classId: string, defId?: string | null): ArmorAppearance;
export function armorAtlasUrl(classId: string, appearance?: ArmorAppearance): string;

export interface SkillPlaceholderArt {
  motif: "fang" | "claw" | "wing" | "shield" | "crystal" | "arrow" | "blade" | "orb" | "star" | "rune" | "leaf" | "bolt" | "spiral";
  color: number;
  accent: number;
  count: number;
  scale: number;
  spread: number;
  spin: number;
  lift: number;
  motion: "orbit" | "rain" | "burst" | "ward" | "totem" | "trail";
  particleRate: number;
}

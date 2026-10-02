import type { BeastSilhouette } from "../../vfxKit/beastSilhouetteGeometry";

export interface SkillPlaceholderArt {
  motif: "fang" | "claw" | "wing" | "shield" | "crystal" | "arrow" | "blade" | "orb" | "star" | "rune" | "leaf" | "bolt" | "spiral" | "arc" | "petal" | "rock" | BeastSilhouette;
  color: number;
  accent: number;
  count: number;
  scale: number;
  spread: number;
  spin: number;
  lift: number;
  motion: "orbit" | "rain" | "burst" | "ward" | "totem" | "trail" | "inward" | "stamp" | "charge";
  particleRate: number;
  layout?: "cross" | "arms" | "crown" | "focus" | "shell" | "petals" | "fan" | "columns";
  size?: readonly [number, number, number];
  colors?: readonly number[];
  opacity?: number;
  delivery?: "target";
  secondary?: SkillPlaceholderArt;
  impact?: SkillPlaceholderArt;
}

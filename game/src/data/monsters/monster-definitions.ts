import type { EnemyArchetype } from "../balance/combat";
import monstersData from "./monsters.json";

export interface MonsterDef {
  id: string;
  name: string;
  archetype: EnemyArchetype;
  maxHp: number;
  attack: number;
  defense: number;
  range: number;
  attackInterval: number;
  speed: number;
  leashRadius: number;
  aggroRadius?: number;
  minApproach: number;
  preferred: number;
  retreatIfCloserThan: number;
  respawnSeconds: number;
  xpReward: number;
  color: string;
  modelUrl?: string;
  modelScale?: number;
  isBoss?: boolean;
}

const monstersList: MonsterDef[] = monstersData as MonsterDef[];

const monstersMap = new Map<string, MonsterDef>();
for (const m of monstersList) {
  monstersMap.set(m.id, m);
}

const FALLBACK_MONSTER: MonsterDef = {
  id: "fallback",
  name: "Criatura Misteriosa",
  archetype: "fixed",
  maxHp: 40,
  attack: 8,
  defense: 2,
  range: 1.6,
  attackInterval: 1.2,
  speed: 0,
  leashRadius: 2.5,
  minApproach: 1.2,
  preferred: 1.3,
  retreatIfCloserThan: 0,
  respawnSeconds: 5,
  xpReward: 8,
  color: "#c45c26",
  modelUrl: "",
  modelScale: 1.0,
  isBoss: false,
};

export function getAllMonsters(): MonsterDef[] {
  return [...monstersList];
}

export function getMonsterDef(idOrArchetype: string): MonsterDef {
  const found = monstersMap.get(idOrArchetype);
  if (found) return found;

  for (const m of monstersList) {
    if (m.archetype === idOrArchetype) return m;
  }

  return FALLBACK_MONSTER;
}

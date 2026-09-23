import { COMBAT_BALANCE, type EnemyArchetype } from "../../data/balance/combat";
import { DUNGEON_BALANCE, dungeonCombatScale } from "../../data/balance/dungeon";
import { DUNGEON_TEST, type DungeonDef } from "../../data/dungeons/dungeon-definitions";
import { EnemyModel } from "./EnemyModel";

export interface SpawnPointDef {
  id: string;
  archetype: EnemyArchetype;
  x: number;
  z: number;
  isBoss?: boolean;
}

function statsFor(archetype: EnemyArchetype) {
  return COMBAT_BALANCE.enemy[archetype];
}

function respawnDelay(random: () => number = Math.random): number {
  const [min, max] = COMBAT_BALANCE.enemy.respawnSeconds;
  return min + random() * (max - min);
}

export class EnemyService {
  readonly enemies: EnemyModel[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  spawnFromDungeon(def: DungeonDef = DUNGEON_TEST): void {
    this.enemies.length = 0;
    const scale = dungeonCombatScale(def.id);
    for (const arena of def.arenas) {
      for (const sp of arena.spawns) {
        this.enemies.push(this.makeEnemy(sp, scale));
      }
    }
  }

  private makeEnemy(
    sp: SpawnPointDef,
    scale: { hpMultiplier: number; attackMultiplier: number; defenseMultiplier: number },
  ): EnemyModel {
    const s = statsFor(sp.archetype);
    let maxHp = Math.max(1, Math.round(s.maxHp * scale.hpMultiplier));
    let attack = Math.max(1, Math.round(s.attack * scale.attackMultiplier));
    let defense = Math.max(0, Math.round(s.defense * scale.defenseMultiplier));
    if (sp.isBoss) {
      maxHp = Math.round(maxHp * DUNGEON_BALANCE.boss.hpMultiplier);
      attack = Math.round(attack * DUNGEON_BALANCE.boss.attackMultiplier);
      defense = defense + DUNGEON_BALANCE.boss.defenseBonus;
    }
    return new EnemyModel({
      id: sp.id,
      archetype: sp.archetype,
      x: sp.x,
      z: sp.z,
      homeX: sp.x,
      homeZ: sp.z,
      maxHp,
      attack,
      defense,
      range: s.range,
      attackInterval: s.attackInterval,
      speed: "speed" in s ? (s as { speed?: number }).speed : 0,
      minApproach: "minApproach" in s ? (s as { minApproach?: number }).minApproach : undefined,
      preferred: "preferred" in s ? (s as { preferred?: number }).preferred : undefined,
      retreatIfCloserThan:
        "retreatIfCloserThan" in s
          ? (s as { retreatIfCloserThan?: number }).retreatIfCloserThan
          : undefined,
      leashRadius: "leashRadius" in s ? (s as { leashRadius?: number }).leashRadius : undefined,
      respawnSeconds: sp.isBoss ? DUNGEON_BALANCE.boss.respawnSeconds : respawnDelay(this.random),
      isBoss: !!sp.isBoss,
    });
  }

  clear(): void {
    this.enemies.length = 0;
  }

  aliveTargets(): { id: string; x: number; z: number; alive: boolean }[] {
    return this.enemies
      .filter((e) => e.alive)
      .map((e) => ({ id: e.id, x: e.x, z: e.z, alive: true }));
  }

  updateRespawns(dt: number): void {
    for (const e of this.enemies) {
      if (e.alive) continue;
      e.respawnTimer -= dt;
      if (e.respawnTimer <= 0) e.respawn();
    }
  }

  findById(id: string): EnemyModel | undefined {
    return this.enemies.find((e) => e.id === id);
  }
}

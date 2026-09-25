import { type EnemyArchetype } from "../../data/balance/combat";
import { DUNGEON_BALANCE, dungeonArenaScale } from "../../data/balance/dungeon";
import { DUNGEON_TEST, type DungeonDef } from "../../data/dungeons/dungeon-definitions";
import { getMonsterDef } from "../../data/monsters/monster-definitions";
import { EnemyModel } from "./EnemyModel";

export interface SpawnPointDef {
  id: string;
  archetype?: EnemyArchetype;
  monsterId?: string;
  x: number;
  z: number;
  isBoss?: boolean;
}

export class EnemyService {
  readonly enemies: EnemyModel[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  spawnFromDungeon(def: DungeonDef = DUNGEON_TEST): void {
    this.enemies.length = 0;
    for (let arenaIndex = 0; arenaIndex < def.arenas.length; arenaIndex++) {
      const arena = def.arenas[arenaIndex];
      const scale = dungeonArenaScale(def.id, arenaIndex);
      for (const sp of arena.spawns) {
        this.enemies.push(this.makeEnemy(sp, scale));
      }
    }
  }

  private makeEnemy(
    sp: SpawnPointDef,
    scale: { hpMultiplier: number; attackMultiplier: number; defenseMultiplier: number },
  ): EnemyModel {
    const lookupKey = sp.monsterId ?? sp.archetype ?? "fixed";
    const def = getMonsterDef(lookupKey);
    const isBoss = !!(sp.isBoss || def.isBoss);

    let maxHp = Math.max(1, Math.round(def.maxHp * scale.hpMultiplier));
    let attack = Math.max(1, Math.round(def.attack * scale.attackMultiplier));
    let defense = Math.max(0, Math.round(def.defense * scale.defenseMultiplier));

    if (isBoss) {
      maxHp = Math.round(maxHp * DUNGEON_BALANCE.boss.hpMultiplier);
      attack = Math.round(attack * DUNGEON_BALANCE.boss.attackMultiplier);
      defense = defense + DUNGEON_BALANCE.boss.defenseBonus;
    }

    const respawnTime = isBoss
      ? DUNGEON_BALANCE.boss.respawnSeconds
      : (def.respawnSeconds > 0 ? def.respawnSeconds + (this.random() * 0.4 - 0.2) : 6);

    return new EnemyModel({
      id: sp.id,
      archetype: def.archetype,
      monsterId: def.id,
      name: def.name,
      x: sp.x,
      z: sp.z,
      homeX: sp.x,
      homeZ: sp.z,
      maxHp,
      attack,
      defense,
      range: def.range,
      attackInterval: def.attackInterval,
      speed: def.speed,
      minApproach: def.minApproach,
      preferred: def.preferred,
      retreatIfCloserThan: def.retreatIfCloserThan,
      leashRadius: def.leashRadius,
      respawnSeconds: respawnTime,
      isBoss,
      xpReward: isBoss ? Math.round(def.xpReward * 3) : def.xpReward,
      color: def.color,
      modelUrl: def.modelUrl,
      modelScale: def.modelScale,
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

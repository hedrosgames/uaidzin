import { describe, it, expect } from "vitest";
import { EnemyAI } from "./EnemyAI";
import { EnemyModel } from "./EnemyModel";
import { boxFromCenter, type WorldCollision } from "../../world/collision";

function createChaserEnemy(overrides: Partial<ConstructorParameters<typeof EnemyModel>[0]> = {}) {
  return new EnemyModel({
    id: "chaser-1",
    archetype: "chaser",
    homeX: 0,
    homeZ: 0,
    x: 0,
    z: 0,
    maxHp: 100,
    attack: 10,
    defense: 5,
    range: 1.5,
    attackInterval: 1.0,
    speed: 4,
    minApproach: 1.0,
    leashRadius: 10,
    aggroRadius: 6,
    respawnSeconds: 5,
    ...overrides,
  });
}

describe("EnemyAI", () => {
  it("sem aggro fora do raio de aggro, perseguindo quando entra no raio", () => {
    const ai = new EnemyAI();
    const enemy = createChaserEnemy({ x: 0, z: 0, aggroRadius: 5 });

    const ctxFar = {
      playerX: 10,
      playerZ: 0,
      playerAlive: true,
      dt: 0.1,
    };

    const resFar = ai.update(enemy, ctxFar);
    expect(resFar.wantsAttack).toBe(false);
    expect(enemy.x).toBe(0);
    expect(enemy.z).toBe(0);

    const ctxNear = {
      playerX: 4,
      playerZ: 0,
      playerAlive: true,
      dt: 0.1,
    };

    const resNear = ai.update(enemy, ctxNear);
    expect(enemy.x).toBeGreaterThan(0);
    expect(resNear.wantsAttack).toBe(false);
  });

  it("fora do leash volta ao spawn sem recuperar HP", () => {
    const ai = new EnemyAI();
    const enemy = createChaserEnemy({
      x: 15,
      z: 0,
      leashRadius: 10,
      speed: 5,
    });
    enemy.applyDamage(40);
    const hpBefore = enemy.hp;

    const ctx = {
      playerX: 16,
      playerZ: 0,
      playerAlive: true,
      dt: 0.2,
    };

    const res = ai.update(enemy, ctx);
    expect(res.wantsAttack).toBe(false);
    expect(enemy.x).toBeLessThan(15);
    expect(enemy.hp).toBe(hpBefore);
  });

  it("taunt prende o inimigo e tem prioridade sobre o leash", () => {
    const ai = new EnemyAI();
    const enemy = createChaserEnemy({
      x: 15,
      z: 0,
      leashRadius: 10,
      speed: 4,
    });
    enemy.tauntTimer = 3.0;

    const ctx = {
      playerX: 20,
      playerZ: 0,
      playerAlive: true,
      dt: 0.1,
    };

    ai.update(enemy, ctx);
    expect(enemy.x).toBeGreaterThan(15);
  });

  it("nao atravessa obstaculo bloqueado pela colisao", () => {
    const ai = new EnemyAI();
    const enemy = createChaserEnemy({
      x: 0,
      z: 0,
      aggroRadius: 10,
      speed: 5,
    });

    const collision: WorldCollision = {
      boxes: [boxFromCenter(1, 0, 1, 10)],
      circles: [],
    };

    const ctx = {
      playerX: 5,
      playerZ: 0,
      playerAlive: true,
      dt: 0.1,
      collision,
    };

    ai.update(enemy, ctx);
    expect(enemy.x).toBeLessThanOrEqual(0.1);
  });

  it("jogador morto faz cessar perseguicao e faz inimigo retornar ao spawn", () => {
    const ai = new EnemyAI();
    const enemy = createChaserEnemy({
      x: 4,
      z: 0,
      aggroRadius: 10,
      speed: 4,
    });

    const ctxDead = {
      playerX: 5,
      playerZ: 0,
      playerAlive: false,
      dt: 0.1,
    };

    const res = ai.update(enemy, ctxDead);
    expect(res.wantsAttack).toBe(false);
    expect(enemy.x).toBeLessThan(4);
  });
});

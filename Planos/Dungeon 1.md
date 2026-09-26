# Dungeon 1 — implementação

## Comportamento

- World `dungeon-1`: 36×108, três zonas 36×36; spawn `(0, 2)`.
- Dois portões (`d1-gate-1`, `d1-gate-2`); abertura automática no raio `INTERACT_RANGE` (1,6) com chave certa; consome 1 chave.
- Sem `portal-exit` em nenhuma zona. Saída só morte ou timeout (600 s).
- Run única; trocar de zona não reinicia timer.
- `tryEnterDungeon("dungeon-1")` → world `dungeon-1`, não `dungeon-test`.

### Chaves e bosses

| Zona | Minion | Boss (spawn) | Chave ao matar boss | Portão |
|---|---|---|---|---|
| 1 | `cogumelo_minion` · `d1-a1-minion` | `cogumelo_boss` · `d1-a1-boss` | `d1_key_zone_2` | `d1-gate-1` (z=-18) |
| 2 | `cogumelo_minion_2` · `d1-a2-minion` | `cogumelo_boss_2` · `d1-a2-boss` | `d1_key_zone_3` | `d1-gate-2` (z=-54) |
| 3 | `cogumelo_minion_3` · `d1-a3-minion` | `cogumelo_boss_3` · `d1-a3-boss` | nenhuma | nenhum |

- Chave só dos bosses Z1/Z2; sem duplicar se já tem a chave ou portão já aberto nesta run.
- Gates resetam fechados a cada nova run; chaves no inventário persistem.

## Passos

### A — Dados

1. `game/src/world/worldConstants.ts`: `CITY_WORLD_SIZE = 36`.
2. `dungeon-definitions.ts`: `DungeonZoneDef`, `DungeonGateDef`, `DungeonDef.zones?`, `DungeonDef.gates?`, `ArenaDef.zoneId?`.
3. `dungeons.json` (só D1): 3 zonas, 2 gates, 6 spawns com `monsterId` e `"isBoss": true` nos três `*-boss`.
4. `monsters.json`: 6 entradas cogumelo (nomes UI: Cogumelo Minion/Boss, variantes 2 e 3).
5. `items.json`: `d1_key_zone_2`, `d1_key_zone_3` (material, `items/seal.svg`).

### B — World

6. `Dungeon1WorldBuilder.ts`: 36×108, 2 gates (vão 5,2), paredes entre zonas, sem portal.
7. `DungeonGateView.ts`: `open()` / `reset()`, collider on/off.
8. `WorldManager.ts`: id `dungeon-1`; reset dos 2 gates no início de cada run.
9. `CityGameSession.tryEnterDungeon`: `dungeon-1` → world `dungeon-1`; estender `WorldId` e `setWorldLook` se necessário.

### C — Portões

10. `DungeonRun.ts`: `openedGateIds`, reset em `start()`/`reset()`.
11. `DungeonGateService.ts`: validar zona, chave, consumir, marcar gate.
12. `CityGameSession`: zona por posição; proximidade gate; persistir após consumo; feedback log/toast.

### D — Combate

13. `EnemyModel` + spawn: campo `zoneId`.
14. `grantKillXp`: se D1 e boss e spawn `d1-a1-boss` ou `d1-a2-boss`, dar chave antes de `persistSave(true)`.
15. `EnemyAI` + seleção de alvo: respeitar zona; sem aggro/ataque através de portão fechado.

### E — HUD

16. `currentArenaLabel`: se `world.id === "dungeon-1"`, `Zona N / 3` pelos limites de zona.
17. Chaves visíveis no inventário wire.

### F — QA

18. `game/scripts/check-dungeon-1.mjs` (padrão D2): 2 chaves, 2 gates, sem portal, timer, reset gates.
19. `cd game && npm run typecheck && npm run build && npm run smoke`.
20. `node scripts/check-dungeon-2.mjs`.

## Testar

- [ ] Entrada em `dungeon-1` usa world D1.
- [ ] Portões fechados no início; abrem só com chave certa.
- [ ] Boss 3 não dá chave; Z3 sem portal.
- [ ] Morte/timeout voltam à cidade; timer não reinicia entre zonas.

# Dungeon 1 — implementação

Executar passos **1 → 20** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- Depois de `Planos/Refatoracao 2.md` (save: `markDirty(section, kind)` / `checkpoint`), `4.md` (`HudModel`, HUD por diff), `5.md` (inventário `{ ok, rejected }`, drop recusado perdido), `6.md` (`DungeonFlow`, `RewardService`, `CombatOrchestrator`) e `8.md` (wire em `game/src/ui/wire/`, sem `GamePanels`).
- `Planos/Refatoracao 11.md`: mundo novo não força `frustumCulled = false`.

## Comportamento

- World id `dungeon-1`: **36×108**, três zonas **36×36**; spawn jogador `(0, 2)`.
- Dois portões: `d1-gate-1` (z ≈ −18), `d1-gate-2` (z ≈ −54); vão **5×2**; abrem no raio `INTERACT_RANGE` (**1,6**) com chave certa; consomem **1** chave do inventário.
- **Sem** interactable `portal-exit` em nenhuma zona. Saída da run: morte ou timeout (**600 s**).
- Timer único por run; mudar de zona **não** reinicia.
- Entrada: `DungeonFlow.tryEnterDungeon("dungeon-1")` carrega world `dungeon-1` (não `dungeon-test`). A sessão só delega.
- Save: abate (XP + chave) num `checkpoint` crítico do `RewardService`. Consumo de chave: `markDirty("inventory", "critical")`. Sem `persistSave`. Sem migração de save (jogo não lançado).
- Bolsa cheia ao conceder chave: item perdido, aviso “Bolsa cheia: <item> perdido.”. Stack máximo **999**.
- XP no nível máximo: descartado; UI “MAX” (já em `RewardService` / `ProgressionService`).

| Zona | Minion (`monsterId`) | Boss (`monsterId` · spawn id) | Chave ao matar boss | Portão |
|---:|---|---|---|---|
| 1 | `cogumelo_minion` · `d1-a1-minion` | `cogumelo_boss` · `d1-a1-boss` | `d1_key_zone_2` | `d1-gate-1` |
| 2 | `cogumelo_minion_2` · `d1-a2-minion` | `cogumelo_boss_2` · `d1-a2-boss` | `d1_key_zone_3` | `d1-gate-2` |
| 3 | `cogumelo_minion_3` · `d1-a3-minion` | `cogumelo_boss_3` · `d1-a3-boss` | — | — |

- Chave só dos bosses das zonas 1 e 2; não duplicar se jogador já tem a chave ou portão já aberto **nesta run**.
- Portões fecham de novo no **início de cada run**; chaves no inventário **persistem** entre runs.

## Passos

### A — Constantes e tipos

1. `game/src/world/worldConstants.ts` — `CITY_WORLD_SIZE = 36`.
2. `game/src/data/dungeons/dungeon-definitions.ts` — tipos `DungeonZoneDef`, `DungeonGateDef`; campos opcionais `zones`, `gates` em `DungeonDef`; `zoneId?` em `ArenaDef`.
3. `game/src/data/dungeons/dungeons.json` — entrada `dungeon-1`: 3 zonas, 2 gates, 6 spawns com `monsterId`; `"isBoss": true` nos três spawns `*-boss`.

### B — Catálogo

4. `game/src/data/monsters/monsters.json` — 6 monstros cogumelo (minion/boss × 3 variantes; nomes UI pt-BR).
5. `game/src/data/items/items.json` — itens `d1_key_zone_2`, `d1_key_zone_3` (material, ícone `assets/icons/items/seal.svg`). Arquivo em `game/public/assets/icons/items/seal.svg` (plano 8).

### C — Geometria e world

6. `game/src/world/Dungeon1WorldBuilder.ts` (novo) — mesh/colliders 36×108, paredes entre zonas, 2 gates, **sem** portal de saída; `frustumCulled` padrão.
7. `game/src/world/DungeonGateView.ts` (novo) — `open()`, `reset()`, collider ligado/desligado.
8. `game/src/world/WorldManager.ts` — registrar world id `dungeon-1`; no início de run D1, `reset()` nos 2 gates.
9. `game/src/app/session/DungeonFlow.ts` — `tryEnterDungeon("dungeon-1")` usa o builder D1. Estender `WorldId` em `game/src/world/WorldManager.ts`. `setWorldLook` em `game/src/presentation/rendering/SceneRenderer.ts`.

### D — Estado da run e portões

10. `game/src/domain/dungeons/DungeonRun.ts` — `openedGateIds`; limpar em `start()` e `reset()`.
11. `game/src/domain/dungeons/DungeonGateService.ts` (novo) — validar zona do jogador, chave correta, consumir chave, marcar gate aberto.
12. `game/src/app/session/InteractionController.ts` — zona pela posição; proximidade ao gate; chamar o serviço; `markDirty("inventory", "critical")` ao consumir a chave.

### E — Combate e loot de chave

13. `game/src/domain/enemies/EnemyModel.ts` e pipeline de spawn — persistir `zoneId` no inimigo.
14. `game/src/app/session/RewardService.ts` — em `grantKillXp`, se D1 e boss `d1-a1-boss` ou `d1-a2-boss`, conceder a chave no mesmo `checkpoint` crítico do abate. Bolsa cheia: chave perdida com o aviso do plano 5.
15. `game/src/domain/enemies/EnemyAI.ts` e `game/src/app/session/CombatOrchestrator.ts` — combate só na mesma zona; sem aggro/ataque através de portão **fechado**.

### F — HUD

16. `game/src/ui/HudModel.ts` — se `world.id === "dungeon-1"`, `arenaHint` = `Zona N / 3` pelos limites Z (`DungeonFlow` calcula). `game/src/ui/HudBarsView.ts` só escreve o nó quando o texto muda.
17. `game/src/ui/wire/inventory.ts` — chaves `d1_key_zone_*` visíveis via `WireApi`. Sem `GamePanels` e sem `visual/telas/03-wire-paineis-cidade.html`.

### G — QA

18. `game/scripts/check-dungeon-1.mjs` (novo, molde `check-dungeon-2.mjs`) — 2 chaves, 2 gates, sem portal, timer, gates resetam por run.
19. `cd game && npm run typecheck && npm run build && npm run smoke`.
20. `cd game && node scripts/check-dungeon-2.mjs` — regressão D2.

## Testar

- [ ] Portal/cidade leva a `dungeon-1` (world correto).
- [ ] Portões fechados no spawn; abrem só com chave certa no raio.
- [ ] Boss zona 3 não dropa chave; zona 3 sem saída por portal.
- [ ] Morte e timeout voltam à cidade; timer contínuo entre zonas.
- [ ] Chave com bolsa cheia some com aviso; reload não devolve a chave gasta.
- [ ] Passos 19–20 verdes.

## Pendências

- Nenhuma.

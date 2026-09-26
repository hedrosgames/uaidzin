# Refatoração 6 — fatiar CityGameSession — implementação

Executar passos **1 → 20** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 2.md`, **4.md** e **5.md** concluídos.

## Comportamento

- `CityGameSession.ts` permanece **compositor** (estado compartilhado, wiring, `update` delega).
- Módulos novos em `game/src/app/session/` — sem globais; recebem deps no construtor.
- DoT/status em cadência fixa; `frameMods` calculado **uma vez** por frame de combate.
- Entrada em dungeon: consumir item de entrada **só** após `enterWorld` ok; chamada reentrante ignorada enquanto fade busy.
- XP: no nível máximo, `xp` não ultrapassa `xpToNext` (provisório).

## Passos

### A — DungeonFlow

1. `game/src/app/session/DungeonFlow.ts` (novo) — `tryEnterDungeon`, fade, timer, leave; flags `worldFadeBusy`.
2. `game/src/app/CityGameSession.ts` — delegar métodos de dungeon ao flow.

### B — InteractionController

3. `game/src/app/session/InteractionController.ts` (novo) — `updateNearby`, `tryInteract`, NPC services, portal.
4. `game/src/app/CityGameSession.ts` — delegar interação.

### C — CombatOrchestrator

5. `game/src/app/session/CombatOrchestrator.ts` (novo) — `updateCombat`, targeting, aplicação de dano/DoT.
6. `game/src/app/CityGameSession.ts` — delegar combate; uma passagem de `buildCombatMods` por tick.

### D — RewardService

7. `game/src/app/session/RewardService.ts` (novo) — `grantKillXp`, loot, level-up, cap XP.
8. `game/src/app/CityGameSession.ts` — delegar recompensas; usar `SaveCoordinator` do plano 2.

### E — VaultTransfer

9. `game/src/app/session/VaultTransfer.ts` (novo) — ouro/item jogador ↔ cofre; transação única via coordenador.
10. `game/src/app/CityGameSession.ts` — delegar cofre.

### F — Limpeza sessão

11. `game/src/app/CityGameSession.ts` — remover métodos movidos; manter API pública usada por `WireGameBridge` e debug.
12. `game/src/app/CityGameSession.ts` — `dispose()` desinscreve handlers de bus/input criados na sessão.

### G — QA

13. `cd game && npm run typecheck`.
14. `cd game && npm run smoke`.
15. `cd game && npm run bot` — dungeon D1 ou D2 fluxo mínimo.
16. Manual: entrar D2 com vela; morrer; timeout; interagir NPC.
17. Manual: depositar ouro no cofre mid-dungeon.
18. Grep: `CityGameSession.ts` abaixo de ~900 linhas (meta interna do plano).
19. `node scripts/check-dungeon-2.mjs` se tocado portal/enter.
20. Confirmar nenhum `persistSave` novo fora do coordenador.

## Testar

- [ ] Passos 13–15 verdes.
- [ ] Entrada dungeon não consome vela se fade falhar.
- [ ] Combate e loot iguais ao comportamento pré-refactor (smoke/bot).

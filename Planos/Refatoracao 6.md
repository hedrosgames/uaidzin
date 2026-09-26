# Refatoração 6 — fatiar CityGameSession — implementação

Executar passos **1 → 27** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 2.md`, **4.md** e **5.md** concluídos.

## Comportamento

- `CityGameSession.ts` permanece **compositor** (estado compartilhado, wiring, `update` delega).
- Módulos novos em `game/src/app/session/` — sem globais; recebem deps no construtor.
- Entrada em dungeon: item consumido ao usar e `checkpoint` crítico **antes** do fade; **sem devolução** se `enterWorld` falhar; falha → fade termina e jogador fica na cidade.
- Fade: `withWorldFade`/`returnToCityWithFade` com `try/finally`; chamada reentrante ignorada enquanto `worldFadeBusy`.
- DoT: tick por tempo a cada **3 s** (`DOT_TICK_SEC`, provisório); fração restante aplicada na expiração; um número de dano por tick (não por frame).
- `frameMods` e passivas aprendidas calculados **uma vez** por frame de combate; sem alocação por inimigo por frame.
- XP: no nível máximo, `addXp` descarta; `xp` ≤ `xpToNext`; HUD e Wire mostram “MAX”.
- Abate: XP + drop num único `checkpoint` crítico por frame; drop recusado segue `Refatoracao 5.md`.
- IA: chaser/ranged com raio de aggro e `leashRadius` de `monsters.json`; volta ao spawn ao sair do leash.
- Cofre: `amount` validado (inteiro finito > 0, ≤ saldo) antes de mexer em ouro.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #14 | total | passo 6; critérios do Complemento de #14 (3 s, dano na expiração) |
| #19 | total | passo 7 |
| #27 | total | passos 1–2 |
| #34 | total | passo 8 |
| #44 | total | passo 10 |
| #45 | parcial (fade e item de entrada) | passos 1, 3 |
| #50 | total (com `Refatoracao 5.md`) | passo 12 |

## Passos

### A — DungeonFlow

1. `game/src/app/session/DungeonFlow.ts` (novo) — `tryEnterDungeon`, fade com `try/finally`, timer, leave; flag `worldFadeBusy`.
2. `game/src/app/CityGameSession.ts` — delegar métodos de dungeon ao flow.
3. `game/src/app/session/DungeonFlow.ts` — consumo do item de entrada + `checkpoint` crítico antes do fade; sem devolução.

### B — InteractionController

4. `game/src/app/session/InteractionController.ts` (novo) — `updateNearby`, `tryInteract`, NPC services, portal.
5. `game/src/app/CityGameSession.ts` — delegar interação.

### C — CombatOrchestrator

6. `game/src/app/session/CombatOrchestrator.ts` (novo) — `updateCombat`, targeting, dano; DoT por tempo (3 s + expiração) com um número por tick.
7. `game/src/app/session/CombatOrchestrator.ts` — `buildCombatMods` e passivas uma vez por tick; buffers reutilizados.
8. `game/src/domain/enemies/EnemyAI.ts` — aggro e leash para chaser/ranged a partir de `monsters.json`.

### D — RewardService

9. `game/src/app/session/RewardService.ts` (novo) — `grantKillXp`, loot, level-up; `checkpoint` crítico único por frame.
10. `game/src/domain/progression/ProgressionService.ts` — `addXp` no nível máximo descarta; `xp` ≤ `xpToNext`.
11. `game/src/app/CityGameSession.ts` — delegar recompensas.

### E — VaultTransfer

12. `game/src/app/session/VaultTransfer.ts` (novo) — ouro/item jogador ↔ cofre com `amount` validado; transação única via coordenador (crítico).
13. `game/src/app/CityGameSession.ts` — delegar cofre.

### F — Limpeza sessão

14. `game/src/app/CityGameSession.ts` — remover métodos movidos; manter API pública usada por `WireGameBridge` e debug.
15. `game/src/app/CityGameSession.ts` — `dispose()` desinscreve handlers de bus/input criados na sessão.

### G — QA

16. `game/src/app/session/dungeon-flow.test.ts` (novo) — `enterWorld` lança: item consumido, save crítico feito, fade termina, modo CITY; segunda chamada durante fade ignorada.
17. `game/src/app/session/combat.test.ts` (novo) — DoT 4 s = tick em 3 s + resto em 4 s; total = `dotDps × dotSec`; independente do FPS.
18. `game/src/app/session/reward.test.ts` (novo) — nível máximo não soma XP; AoE 5 abates = 1 checkpoint.
19. `game/src/app/session/vault-transfer.test.ts` (novo) — `NaN`, `Infinity`, negativo, acima do saldo recusados sem mudar ouro.
20. `cd game && npm run test`.
21. `cd game && npm run typecheck`.
22. `cd game && npm run smoke`.
23. `cd game && npm run bot` — dungeon D1 ou D2 fluxo mínimo.
24. `cd game && node scripts/check-dungeon-2.mjs`.
25. Manual: entrar D2 com vela; morrer; timeout; interagir NPC; depositar ouro no cofre.
26. `wc -l game/src/app/CityGameSession.ts` — abaixo de ~900 linhas.
27. `rg "persistSave\(" game/src` — nenhum fora do coordenador.

## Testar

- [ ] Passos 20–24 verdes.
- [ ] Entrada em dungeon consome a vela ao usar, mesmo se o fade falhar.
- [ ] DoT igual a 30 e 144 FPS.
- [ ] Inimigo volta ao spawn fora do leash.
- [ ] Combate e loot iguais ao comportamento pré-refactor (smoke/bot).

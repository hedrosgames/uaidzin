# Refatoração 6 — fatiar CityGameSession — implementação

Executar passos **1 → 38** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 2.md`, **4.md** e **5.md** concluídos.

## Comportamento

- `CityGameSession.ts` (hoje ~1 820 linhas) permanece **compositor** (estado compartilhado, wiring, `update` delega). Meta: ≤ ~850 linhas.
- Módulos novos em `game/src/app/session/` — sem globais; recebem deps no construtor.
- Continuam públicos na sessão (usados por `WireGameBridge`, debug e `check-dungeon-2.mjs`): `tryEnterDungeon`, `beginInteract`, `closePanel`, `pickDungeonForLevel`.
- Entrada em dungeon: ordem **guarda → consumo → checkpoint → fade**. Com fade em andamento, a entrada devolve `busy` (novo `DungeonEnterReason`, mensagem pt-BR) sem consumir item. Item consumido e `checkpoint` crítico **antes** do fade; **sem devolução** se `enterWorld` falhar; falha → fade termina e jogador fica na cidade.
- Saída (`exit`, `timer`, morte) pedida durante outro fade fica em `pendingLeaveReason` e roda quando o fade atual termina. `withWorldFade`/`returnToCityWithFade` com `try/finally`.
- DoT: acumulador no `EnemyModel`; tick por tempo a cada **3 s** (`DOT_TICK_SEC` em `game/src/data/balance/combat.ts`, provisório); fração restante aplicada na expiração; reaplicar renova duração sem perder o acumulado; abate pelo dano de expiração dá XP e drop normais; morte por outro dano descarta o acumulado; um número de dano por tick.
- Modificadores de combate (`buildCombatMods` + `learnedPassives`) em cache invalidado por evento (skill aprendida, buff, arma, forma); `EnemyService.findById` O(1) (`Map`) e lista de vivos mantida; `weaponReach`/`setRangeIndicator` só quando o valor muda; `Vector3` reutilizado em `syncPassiveVfx`; `GameCamera.setAspect` só no resize.
- XP: no nível máximo, `addXp` descarta; `xp` ≤ `xpToNext`; `HudModel.isMaxLevel` alimenta o “MAX”.
- Abate: XP, drop, ouro e progresso de quest num único `checkpoint` crítico por frame; drop recusado segue `Refatoracao 5.md`.
- IA: chaser/ranged com `aggroRadius` (campo novo) e `leashRadius` de `monsters.json`; fora do leash volta ao spawn **sem** recuperar HP; com jogador morto para de perseguir; `tauntTimer` tem prioridade sobre o leash; movimento respeita `positionBlocked` de `game/src/world/collision.ts`.
- Cofre: `amount` validado (inteiro finito > 0, ≤ saldo, destino ≤ `goldCap`) antes de mexer em ouro; “guardar tudo” é **uma** operação com um `checkpoint`.
- Reset e Evolução: `tryReset`/`tryEvolve` fora do debug; crítico.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #14 | total | passos 8–9, 29; critérios do Complemento de #14 (3 s, dano na expiração) |
| #19 | parcial (sessão, inimigos, câmera); `WeaponRig`, `SkillVfxRuntime` e `ArmorAura` em `Refatoracao 10.md` | passos 10–13 |
| #27 | total | passos 1–4, 28, 36 |
| #34 | total | passos 14–15, 32 |
| #44 | total | passo 17, 30 |
| #45 | parcial (fade e item de entrada) | passos 1, 3 |
| #50 | total (com `Refatoracao 5.md`) | passo 19, 31 |
| #39 | parcial (Reset/Evolução na sessão); tela em `Refatoracao 7.md` | passo 23 |

## Passos

### A — DungeonFlow

1. `game/src/app/session/DungeonFlow.ts` (novo) — `tryEnterDungeon`, fade com `try/finally`, timer, leave; flag `worldFadeBusy`; `pendingLeaveReason` executado no fim do fade.
2. `game/src/app/session/types.ts` (novo) — `SessionHud`, `DungeonEnterResult` com `busy`, `dungeonEnterMessage` com o `case` novo.
3. `game/src/app/session/DungeonFlow.ts` — guarda `worldFadeBusy` → consumo do item → `checkpoint` crítico → fade; sem devolução.
4. `game/src/app/CityGameSession.ts` — delegar métodos de dungeon ao flow; `WireGameBridge` e `DebugApi` repassam `busy`.

### B — InteractionController

5. `game/src/app/session/InteractionController.ts` (novo) — `updateNearby`, `tryInteract`, NPC services, portal.
6. `game/src/app/CityGameSession.ts` — delegar interação.

### C — CombatOrchestrator e inimigos

7. `game/src/app/session/CombatOrchestrator.ts` (novo) — `updateCombat`, targeting, dano.
8. `game/src/data/balance/combat.ts` — `DOT_TICK_SEC`; `game/src/domain/enemies/EnemyModel.ts` — `tickStatus` com acumulador, reaplicação e descarte na morte.
9. `game/src/app/session/CombatOrchestrator.ts` — um número por tick de DoT; abate na expiração passa pelo `RewardService`.
10. `game/src/app/session/CombatOrchestrator.ts` — cache de `buildCombatMods` (`game/src/domain/combat/CombatMods.ts`) e `learnedPassives` invalidado por evento; buffers reutilizados.
11. `game/src/domain/enemies/EnemyService.ts` — `findById` por `Map`; array de vivos mantido em spawn/morte.
12. `game/src/app/CityGameSession.ts` — `syncPassiveVfx` sem `new Vector3`; `weaponReach`/`setRangeIndicator` só quando mudam.
13. `game/src/presentation/camera/GameCamera.ts` — `setAspect`/`updateProjectionMatrix` só no resize.
14. `game/src/data/monsters/monsters.json` — `aggroRadius` por monstro (provisório, tabela abaixo); `game/src/domain/enemies/EnemyAI.ts` — aggro, leash, volta sem cura, jogador morto, prioridade do taunt.

| id | `leashRadius` | `aggroRadius` (provisório) |
|---|---|---|
| `fixed` | 2.5 | — (não se move) |
| `chaser` | 12 | 7 |
| `ranged` | 15 | 9 |
| `boss_mortal` | 20 | 12 |
| `lobo_selvagem` | 18 | 10 |
| `caveira_normal` | 14 | 8 |
| `caveira_especial` | 16 | 10 |

15. `game/src/domain/enemies/EnemyAI.ts` — movimento checa `positionBlocked` (`game/src/world/collision.ts`).

### D — RewardService

16. `game/src/app/session/RewardService.ts` (novo) — `grantKillXp`, loot, ouro, `applyQuestKillProgress`, level-up; `checkpoint` crítico único por frame; `tryCompose` e `acceptQuest`.
17. `game/src/domain/progression/ProgressionService.ts` — `addXp` no nível máximo descarta; `xp` ≤ `xpToNext`; `HudModel.isMaxLevel` preenchido.
18. `game/src/app/CityGameSession.ts` — delegar recompensas, quests e compositor.

### E — VaultTransfer

19. `game/src/app/session/VaultTransfer.ts` (novo) — ouro/item jogador ↔ cofre com `amount` validado, teto `goldCap` no destino, `moveAllToVault` em lote; transação única via coordenador (crítico).
20. `game/src/app/CityGameSession.ts` — delegar cofre (sai `depositGoldToVault`/`withdrawGoldFromVault`/`moveItemToVault`/`moveItemFromVault` da sessão).

### F — Save e debug fora da sessão

21. `game/src/app/session/SessionSnapshot.ts` (novo) — montagem do payload, `loadSave`, `applyBootCharacter`, `applySavePayload`.
22. `game/src/debug/SessionDebug.ts` (novo, só DEV) — métodos `debug*` da sessão.
23. `game/src/app/CityGameSession.ts` — `debugTryReset`/`debugTryEvolve` viram `tryReset`/`tryEvolve` com `checkpoint` crítico.

### G — Limpeza sessão

24. `game/src/app/CityGameSession.ts` — remover métodos movidos; manter API pública listada no Comportamento.
25. `game/src/app/CityGameSession.ts` — `dispose()` desinscreve handlers de bus/input criados na sessão.

### H — QA

26. `game/src/app/session/dungeon-flow.test.ts` (novo) — `enterWorld` lança: item consumido, save crítico feito, fade termina, modo CITY.
27. `game/src/app/session/dungeon-flow.test.ts` — entrada durante fade devolve `busy` sem consumir item.
28. `game/src/app/session/dungeon-flow.test.ts` — morte durante fade de entrada sai ao fim do fade.
29. `game/src/app/session/combat.test.ts` (novo) — DoT 2, 3, 4 e 7 s com total = `dotDps × dotSec`; reaplicação; abate na expiração dá XP; independente do FPS.
30. `game/src/app/session/reward.test.ts` (novo) — nível máximo não soma XP; AoE 5 abates = 1 checkpoint.
31. `game/src/app/session/vault-transfer.test.ts` (novo) — `NaN`, `Infinity`, negativo, acima do saldo e acima do `goldCap` recusados sem mudar ouro.
32. `game/src/domain/enemies/enemy-ai.test.ts` (novo) — sem aggro fora do raio; volta ao spawn fora do leash; taunt prende; não atravessa bloqueio.
33. `cd game && npm run test && npm run typecheck`.
34. `cd game && npm run smoke && npm run bot`.
35. `cd game && node scripts/check-dungeon-2.mjs`.
36. `game/scripts/check-world-transition.mjs` (novo, molde `check-dungeon-2.mjs`) — cenários A (clique duplo no portal), B (entrada durante fade) e C (morte/timer durante fade).
37. Manual: entrar D2 com vela; morrer; timeout; interagir NPC; depositar ouro no cofre.
38. `wc -l game/src/app/CityGameSession.ts` ≤ ~850; `rg "persistSave\(" game/src` — nenhum fora do coordenador.

## Testar

- [x] Passos 33–36 verdes.
- [x] Entrada em dungeon consome a vela ao usar, mesmo se o fade falhar; clique duplo não consome duas.
- [x] DoT igual a 30 e 144 FPS.
- [x] Inimigo parado até o jogador entrar no `aggroRadius`; volta ao spawn fora do leash sem curar e não atravessa cerca.
- [x] Combate e loot iguais ao comportamento pré-refactor (smoke/bot).

## Pendências

- Nenhuma.

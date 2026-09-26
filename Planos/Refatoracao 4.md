# Refatoração 4 — input, tick e HUD — implementação

Executar passos **1 → 33** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 2.md` passos **1 → 34** (`checkpoint` crítico usado pelo tick).
- Não depende de `Planos/Skill TK linhagem 1.md`: este plano já mapeia as teclas de slot **1–9** e **0** (TK1 passos **6–7** só conferem).

## Comportamento

- Um `InputService` — único par `keydown`/`keyup` no `window` (+ `blur`/`visibilitychange` limpam teclas); `keyup` sempre limpa a tecla, mesmo com foco em campo ou UI aberta.
- Filtro: nada dispara com foco em `input`/`textarea`/`select`/`[contenteditable=true]`, exceto **Escape**; atalhos de jogo ignoram Ctrl/Meta/Alt.
- C/K/I funcionam em **CITY** e **DUNGEON** (`AGENTS.md`); **B** (cofre) só na **CITY**. Escape é a ação `ui.escape` (fecha o painel/diálogo do topo); os três listeners de Escape do html da Wire saem.
- `uiOpen` = painel da Wire, diálogo, overlay de Opções ou `InteractionPanel` aberto; vem de uma flag em `WireUi` (sem `querySelector` por frame).
- `interact` (`E`) só se `!uiOpen && !typing && mode ∈ {CITY,DUNGEON}`.
- Slots de skill: ações `skill.0`…`skill.9` (Digit1–9, Digit0 e numpad); slot inexistente na barra é ignorado.
- Ações `debug.*` só registradas se `import.meta.env.DEV`; `DebugApi` perde o gate `__UAIDZIN_DEBUG__`. **F5** nunca capturado; o Reset de debug vai para o painel do `DebugHud` (sem tecla).
- Roda: `deltaY === 0` ignorado; normalizar por `deltaMode` (linha = 16 px, página = altura do canvas); um clique de roda (`deltaMode` 1, ±3) ≈ **0,05** de zoom (provisório); teto por evento; ignorar Ctrl/Meta; listener removido no `dispose`.
- Tick: `ErrorReporter` conta erros reportados no frame (bus, store, tick, `window`); frame sem erro zera a contagem; **5** frames seguidos com erro → `checkpoint` crítico + `returnToCityWithFade`. Se na cidade acontecerem mais **5** frames seguidos com erro, o loop para e aparece a tela fixa pt-BR “O jogo encontrou um erro. Recarregue a página.” (provisório). Evento `game:error` sai.
- HUD: skill bar, barras HP/MP/XP, weapon strip, drop log e HP bars de inimigo **sem** `innerHTML` por frame e sem leitura de layout no frame; tamanho do canvas cacheado no `resize`.
- Settings (por máquina, `localStorage` `uaidzin_settings`): sliders de volume só atualizam rótulo e valor (o jogo não tem áudio); sombras e aura aplicam no botão Salvar; setters ignoram valor igual ao atual.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #13 | total | passos 16–23, 31 |
| #17 | total | passos 24–25 |
| #45 | total no loop/bus (fade e entrada em `Refatoracao 6.md`) | passos 9–14, 29; critérios do Complemento de #45 |
| #46 | total | passos 1–8, 28 |
| #47 | total | passo 15, 28 |
| #43 | parcial (atalhos, gate de debug, skip); painel legado em `Refatoracao 8.md` | passos 3, 8, 30, 33 |

## Passos

### A — InputService

1. `game/src/gameplay/InputService.ts` (novo) — mapa código→ação (inclui `skill.0`–`skill.9`, `ui.escape`); contexto (`typing`, `uiOpen`, `mode`, modificadores); `setUiOpen`; exceção de Escape em campo; `keyup` sempre limpa.
2. `game/src/gameplay/PlayerController.ts` — consumir ações `move.*` e `skill.*` do serviço (remover `Set` de keys cruas e o `keydown` próprio).
3. `game/src/app/GameApp.ts` — remover `onKeyPanels`, `onKeyDebugProgression`, `onKeyDebugToggle`, `onKeyEscape`, `onKeyDebugTimer`; registrar ações no `InputService` (C/K/I em CITY e DUNGEON, B só em CITY, `ui.escape`; debug só em DEV).
4. `game/src/app/CityGameSession.ts` — `handleInteractKey` / `skillSlotPressed` via ações nomeadas; gate `panelOpen` passa a ler `uiOpen`.
5. `game/src/ui/WireUi.ts` — flag `open` mantida em `open`/`close`/`toggle`; `isOpen()` lê a flag; alimenta `InputService.setUiOpen`.
6. `visual/telas/03-wire-paineis-cidade.html` — remover os três `keydown` de Escape do `window`; fechar pelo `ui.escape` via `WireUi`; diálogos avisam abertura/fechamento ao `WireUi`.
7. `game/src/app/GameApp.ts` — overlay de Opções entra em `uiOpen`.
8. `game/src/debug/DebugApi.ts` — instalar só com `import.meta.env.DEV`; remover `__UAIDZIN_DEBUG__`; Reset de debug no painel do `DebugHud`.

### B — Eventos e tick

9. `game/src/core/errors/ErrorReporter.ts` — contar erros por frame e frames seguidos; expor estado ao `DebugHud` em DEV.
10. `game/src/core/events/EventBus.ts` — `emit` com `try/catch` por handler → `ErrorReporter`; remover `game:error`.
11. `game/src/core/state/GameStateStore.ts` — idem em `notify`.
12. `game/src/app/GameApp.ts` — `tick`: sem `loop.stop()` no primeiro erro; lê contagem do `ErrorReporter`; 5 frames seguidos → `checkpoint` crítico + `returnToCityWithFade`; 5 na cidade → tela fixa pt-BR e loop parado.
13. `game/src/main.ts` — listeners `window` `error` e `unhandledrejection` → `ErrorReporter`.
14. `game/src/app/CityGameSession.ts` — `returnToCityWithFade` faz o `checkpoint` hoje feito pelo `bus.on("game:state-changed")` de `GameApp.ts`.

### C — Roda

15. `game/src/app/GameApp.ts` — `bindWheelZoom` com delta normalizado, `deltaY === 0` ignorado, sem Ctrl/Meta, removido no `dispose`; `game/src/presentation/camera/GameCamera.ts` — `zoomBy(delta)` proporcional com teto.

### D — HudModel e views

16. `game/src/ui/HudModel.ts` (novo) — estado plano (hp, mp, xp, `xpMax`, `isMaxLevel`, timer, skills[], drops[], weaponSet, save pendente).
17. `game/src/app/CityGameSession.ts` — `pushHud` vira builder do `HudModel`; tamanho do canvas recebido por parâmetro (sem `clientWidth` no `update`).
18. `game/src/ui/SkillBarView.ts` (novo) — diff por slot (classes, cooldown mask) na barra visível: `#skillHud` da Wire quando montada; `#skill-bar` legado só sem Wire.
19. `game/src/ui/DropLogView.ts` (novo) — append/diff linhas.
20. `game/src/ui/HudBarsView.ts` (novo) — barras e weapon strip só escrevem estilo quando o valor muda.
21. `game/src/presentation/effects/EffectManager.ts` — HP bars: `Vector3` reutilizado, referência ao nó cacheada, escrita só quando ratio/posição mudam.
22. `game/src/debug/DebugHud.ts` — `update` só em DEV e só com painel visível.
23. `game/src/app/GameApp.ts` — extrair montagem HUD para as views; tamanho do canvas cacheado em `onWindowResize`; zero `innerHTML` e zero `clientWidth/clientHeight` por frame.

### E — Settings

24. `game/src/ui/SettingsPanel.ts` (novo, extraído de `GameApp.ts`) — sliders só atualizam rótulo/valor; sombras e aura no botão Salvar; grava `uaidzin_settings`.
25. `game/src/presentation/rendering/SceneRenderer.ts` — `setShadowsEnabled` retorna cedo se igual; `game/src/presentation/player/PlayerView.ts` — `setArmorAuraEnabled` idem.

### F — Callbacks → bus

26. `game/src/app/CityGameSession.ts` — substituir callbacks de construtor (`onModeChange`, `onHud`, …) por eventos tipados no bus ou assinatura direta do `HudModel`.
27. `game/src/app/GameApp.ts` — remover re-emissão redundante `game:state-changed` (consumidor já migrado no passo 14).

### G — QA

28. `game/src/gameplay/input-service.test.ts` (novo) — `E` com UI aberta, foco em input, Escape em input, `keyup` com foco em input, Ctrl+C, F5 em produção, teclas 0–9, roda com `deltaMode` 0/1/2 e `deltaY` 0.
29. `game/src/core/events/event-bus.test.ts` (novo) — handler que lança não impede os demais; 5 frames seguidos disparam retorno; mais 5 na cidade param o loop.
30. `game/scripts/smoke.mjs`, `game/scripts/cycle-balance.mjs`, `game/scripts/cycle-demo.mjs` — rodar contra o servidor `vite` dev (sem setar `__UAIDZIN_DEBUG__`).
31. `cd game && npm run test && npm run smoke && npm run bot`.
32. `cd game && npm run typecheck && npm run build`.
33. `rg "__UAIDZIN_DEBUG__|onKeyDebug|F5" game/src game/scripts game/dist` — nada no `dist` nem em código de produção.

## Testar

- [ ] C/K/I abrem painéis na dungeon; B não abre o cofre na dungeon; Escape fecha o painel do topo, inclusive com foco em campo.
- [ ] `E` não interage com painel ou Opções abertos; digitar em input não dispara atalhos.
- [ ] Trackpad faz zoom suave; um clique de roda ≈ passo antigo; Ctrl+roda fica com o navegador.
- [ ] Exceção em handler de UI não congela o jogo; 5 seguidas salvam e voltam para a cidade.
- [ ] Performance panel: sem `innerHTML` nem layout forçado no frame.
- [ ] Passos 31–33 verdes.

## Pendências

- Nenhuma.

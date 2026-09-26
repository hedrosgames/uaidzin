# Refatoração 4 — input, tick e HUD — implementação

Executar passos **1 → 26** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 2.md` passos **1 → 26** (`checkpoint` crítico usado pelo tick).
- Se `Planos/Skill TK linhagem 1.md` passos **6–7** já feitos: `InputService` assume teclas **1–9** e **0**; senão, implementar mapa completo neste plano.

## Comportamento

- Um `InputService` — único par `keydown`/`keyup` (+ `blur`/`visibilitychange` limpam teclas).
- Filtro: nada dispara com foco em `input`/`textarea`/`select`/`[contenteditable=true]`; atalhos de jogo ignoram Ctrl/Meta/Alt.
- C/K/I funcionam em **CITY** e **DUNGEON** (`AGENTS.md`).
- `interact` (`E`) só se `!uiOpen && !typing && mode ∈ {CITY,DUNGEON}`.
- Ações `debug.*` só registradas se `import.meta.env.DEV`; `DebugApi` perde o gate `__UAIDZIN_DEBUG__`.
- **F5** não capturado pelo jogo.
- Roda: normalizar `deltaY` por `deltaMode` (linha = 16 px, página = altura da janela); zoom proporcional ao delta com teto por evento; ignorar Ctrl/Meta; listener removido no `dispose`.
- Tick: exceção em handler → `ErrorReporter`; loop continua; frame sem erro zera contagem; **5** frames seguidos com erro → `checkpoint` crítico + volta para a **cidade**.
- HUD: skill bar, barras HP/MP/XP, weapon strip e drop log **sem** `innerHTML` por frame; atualizar só nós/campos alterados.
- Settings: sliders de volume só aplicam áudio; sombras e `saveSettings` no botão Salvar.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #13 | total | passos 13–18, 25 |
| #17 | total | passo 19 |
| #45 | total no loop/bus (fade e entrada em `Refatoracao 6.md`) | passos 7–11; critérios do Complemento de #45 |
| #46 | total | passos 1–6 |
| #47 | total | passo 12 |
| #43 | parcial (atalhos e gate de debug); painel legado em `Refatoracao 8.md` | passos 3, 6 |

## Passos

### A — InputService

1. `game/src/gameplay/InputService.ts` (novo) — mapa código→ação; contexto (`typing`, `uiOpen`, `mode`, modificadores); `setUiOpen`.
2. `game/src/gameplay/PlayerController.ts` — consumir ações `move.*` e `skill.*` do serviço (remover `Set` de keys cruas).
3. `game/src/app/GameApp.ts` — remover `onKeyPanels`, `onKeyDebugProgression`, `onKeyDebugToggle`, `onKeyEscape`, `onKeyDebugTimer`; registrar ações no `InputService` (debug só em DEV).
4. `game/src/app/CityGameSession.ts` — `handleInteractKey` / `skillSlotPressed` via ações nomeadas.
5. `visual/telas/03-wire-paineis-cidade.html` — chamar `setUiOpen(true/false)` ao abrir/fechar painéis (via bridge até plano 7).
6. `game/src/debug/DebugApi.ts` — instalar só com `import.meta.env.DEV`; remover `__UAIDZIN_DEBUG__`.

### B — Eventos e tick

7. `game/src/core/ErrorReporter.ts` (novo) — registra erro, conta frames seguidos, expõe estado ao HUD em DEV.
8. `game/src/core/events/EventBus.ts` — `emit` com `try/catch` por handler → `ErrorReporter`.
9. `game/src/core/state/GameStateStore.ts` — idem em `notify`.
10. `game/src/app/GameApp.ts` — `tick`: sem `loop.stop()` no primeiro erro; 5 frames seguidos → `checkpoint` crítico + `returnToCity`.
11. `game/src/main.ts` — listeners `window` `error` e `unhandledrejection` → `ErrorReporter`.

### C — Roda

12. `game/src/app/GameApp.ts` — `bindWheelZoom` com delta normalizado, sem Ctrl/Meta, removido no `dispose`; `game/src/presentation/camera/GameCamera.ts` — `zoomBy(delta)` proporcional.

### D — HudModel

13. `game/src/ui/HudModel.ts` (novo) — estado plano (hp, mp, xp, `xpMax`, timer, skills[], drops[], weaponSet).
14. `game/src/app/CityGameSession.ts` — escrever `HudModel` em vez de objeto ad hoc no callback.
15. `game/src/ui/SkillBarView.ts` (novo) — diff por slot (classes, cooldown mask).
16. `game/src/ui/DropLogView.ts` (novo) — append/diff linhas.
17. `game/src/ui/HudBarsView.ts` (novo) — barras e weapon strip só escrevem estilo quando o valor muda; sem leitura de layout no frame.
18. `game/src/app/GameApp.ts` — extrair montagem HUD para views; zero `innerHTML` por frame.

### E — Settings

19. `game/src/ui/SettingsPanel.ts` (novo, extraído de `GameApp.ts`) — sliders chamam só `applyAudio`; `saveSettings`/`setShadowsEnabled` no botão Salvar.

### F — Callbacks → bus

20. `game/src/app/CityGameSession.ts` — substituir callbacks de construtor (`onModeChange`, `onHud`, …) por eventos tipados no bus ou assinatura direta do `HudModel`.
21. `game/src/app/GameApp.ts` — remover re-emissão redundante `game:state-changed`.

### G — QA

22. `game/src/gameplay/input-service.test.ts` (novo) — `E` com UI aberta, foco em input, Ctrl+C, F5 em produção, roda com `deltaMode` 0/1/2.
23. `game/src/core/events/event-bus.test.ts` (novo) — handler que lança não impede os demais; 5 falhas seguidas disparam retorno.
24. `game/scripts/bot-play.mjs` — ler HUD via `HudModel` exposto em DEV (não HTML da skill bar).
25. `cd game && npm run test && npm run smoke && npm run bot`.
26. `cd game && npm run typecheck && npm run build` — conferir no bundle que `__UAIDZIN_DEBUG__` e handlers F1–F9 não existem.

## Testar

- [ ] C/K/I abrem painéis na dungeon.
- [ ] `E` não interage com painel aberto; digitar em input não dispara atalhos.
- [ ] Trackpad faz zoom suave; Ctrl+roda fica com o navegador.
- [ ] Exceção em handler de UI não congela o jogo; 5 seguidas salvam e voltam para a cidade.
- [ ] Passos 25–26 verdes.

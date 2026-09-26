# Refatoração 4 — input, tick e HUD — implementação

Executar passos **1 → 20** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- Pode rodar em paralelo aos planos 2–3 após plano 1.
- Se `Planos/Skill TK linhagem 1.md` passos **6–7** já feitos: `InputService` assume teclas **1–9** e **0**; senão, implementar mapa completo neste plano.

## Comportamento

- Um `InputService` — único par `keydown`/`keyup` (+ `blur`/`visibilitychange`).
- C/K/I funcionam em **CITY** e **DUNGEON** (`AGENTS.md`).
- `interact` (`E`) só se `!uiOpen && !typing && mode ∈ {CITY,DUNGEON}`.
- Ações `debug.*` só se `import.meta.env.DEV` (mesmo gate de `DebugApi`).
- **F5** não capturado pelo jogo.
- Roda: respeitar `deltaMode`; zoom com limiar ou alvo suavizado; não capturar Ctrl/Meta.
- Tick: exceção em handler → `ErrorReporter`; loop continua; após **5** frames seguidos com erro (provisório) → `checkpoint` + parar loop + toast “tentar continuar”.
- HUD: skill bar e drop log **sem** `innerHTML` por frame; atualizar só nós/campos alterados.

## Passos

### A — InputService

1. `game/src/gameplay/InputService.ts` (novo) — mapa código→ação; contexto (`typing`, `uiOpen`, `mode`, modificadores).
2. `game/src/gameplay/PlayerController.ts` — consumir ações `move.*` e `skill.*` do serviço (remover `Set` de keys cruas).
3. `game/src/app/GameApp.ts` — remover listeners duplicados de painel/debug; registrar ações no `InputService`.
4. `game/src/app/CityGameSession.ts` — `handleInteractKey` / `skillSlotPressed` via ações nomeadas.
5. `visual/telas/03-wire-paineis-cidade.html` — chamar `InputService.setUiOpen(true/false)` ao abrir/fechar painéis (via bridge até plano 7).

### B — Eventos e tick

6. `game/src/core/events/EventBus.ts` — `emit` com `try/catch` por handler → `ErrorReporter`.
7. `game/src/core/state/GameStateStore.ts` — idem em `notify`.
8. `game/src/app/GameApp.ts` — `tick`: não `loop.stop()` no primeiro erro; contador 5 frames → checkpoint + stop.
9. `window` — listeners `error` e `unhandledrejection` → `ErrorReporter`.

### C — HudModel

10. `game/src/ui/HudModel.ts` (novo) — estado plano (hp, mp, xp, timer, skills[], drops[], weaponSet).
11. `game/src/app/CityGameSession.ts` — escrever `HudModel` em vez de objeto ad hoc no callback.
12. `game/src/ui/SkillBarView.ts` (novo) — diff por slot (classes, cooldown mask).
13. `game/src/ui/DropLogView.ts` (novo) — append/diff linhas.
14. `game/src/app/GameApp.ts` — extrair montagem HUD para views; remover `innerHTML` por frame nos pontos migrados.

### D — Settings

15. `game/src/ui/SettingsPanel.ts` (novo ou extrair de `GameApp.ts`) — sliders volume chamam só `applyAudio`; `saveSettings`/`setShadowsEnabled` no botão Salvar.

### E — Callbacks → bus

16. `game/src/app/CityGameSession.ts` — substituir callbacks de construtor (`onModeChange`, `onHud`, …) por eventos tipados no bus ou assinatura direta do `HudModel`.
17. `game/src/app/GameApp.ts` — remover re-emissão redundante `game:state-changed` se duplicar store.

### F — QA

18. `game/scripts/bot-play.mjs` — ler HUD via API estável (não HTML da skill bar).
19. `cd game && npm run smoke && npm run bot` (se bot existir).
20. `cd game && npm run typecheck`.

## Testar

- [ ] C/K/I abrem painéis na dungeon.
- [ ] `E` não interage com painel aberto.
- [ ] Exceção em handler de UI não congela frame permanentemente.
- [ ] Passos 19–20 verdes.

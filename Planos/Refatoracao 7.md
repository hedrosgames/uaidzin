# Refatoração 7 — WireApi injetada — implementação

Executar passos **1 → 12** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 6.md` passos **1 → 20** (sessão estável).
- `Planos/Skill TK linhagem 1.md` passos **10–14** desejáveis (barra real); se não, WireApi expõe stubs compatíveis.

## Comportamento

- Contrato tipado `WireApi` em `game/src/ui/` — espelha operações hoje em `WireGameBridge` + economia.
- `WireUi.mount(container, api: WireApi)` — injeção explícita.
- Adaptador dev: preenche `window.__UAIDZIN_WIRE__` **temporariamente** para scripts legados; removido no plano 8.
- Comprar/melhorar skill: sempre `tryLearnSkill` (ouro + save).

## Passos

1. `game/src/ui/WireApi.ts` (novo) — interface (personagem, inventário, skills, loja, cofre, portal, quest, sage, barra).
2. `game/src/ui/WireGameBridge.ts` — implementar `WireApi`; renomear factory se necessário.
3. `game/src/ui/WireUi.ts` — `mount` recebe `WireApi`; parar de buscar globals para estado de jogo.
4. `game/src/app/GameApp.ts` — construir bridge e passar para `WireUi.mount`.
5. `visual/telas/03-wire-paineis-cidade.html` — `gameApi()` chama API injetada (propriedade global setada só no mount).
6. Wire: lixeira, equipar, organizar bolsa → métodos da API (sem mutação local de ouro/skills).
7. Wire: Mestre de Skills — Comprar/Melhorar via API.
8. Wire: `InputService.setUiOpen` nos open/close de painel (plano 4).
9. `game/scripts/bot-play.mjs` — usar `__UAIDZIN__` / bridge tipada onde hoje usa wire global.
10. `cd game && npm run typecheck`.
11. Manual dev: login admin, comprar skill, cofre, portal D2.
12. `cd game && npm run smoke`.

## Testar

- [ ] Sem jogo montado: wire mostra empty state (sem crash).
- [ ] Com jogo: ouro e skills batem com save após compra.
- [ ] Passos 10 e 12 verdes.

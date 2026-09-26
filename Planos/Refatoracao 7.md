# Refatoração 7 — WireApi injetada — implementação

Executar passos **1 → 18** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 6.md` passos **1 → 27** (sessão estável).
- `Planos/Refatoracao 5.md` passos **1 → 25** (venda, refino, skills sem nível no domínio).
- `Planos/Skill TK linhagem 1.md` passos **10–13** desejáveis (barra real). Passo **14** removido: `GamePanels` não aprende skill. Se a barra não existir, `WireApi` expõe stubs compatíveis.

## Comportamento

- Contrato tipado `WireApi` em `game/src/ui/` — espelha operações hoje em `WireGameBridge`, `GamePanels` e economia.
- `WireUi.mount(container, api: WireApi)` — injeção explícita; a ponte de gameplay é instalada em **todo** build (não depende de `DebugApi`).
- Adaptador dev: preenche `window.__UAIDZIN_WIRE__` **só** em `import.meta.env.DEV` para scripts legados; removido no plano 8.
- Aprender skill: `learnSkill` → `tryLearnSkill` (ouro + save adiável); uma vez por skill; UI sem “Melhorar” nem “Nível x/10”.
- Vender: no NPC (Mercador/Ferreiro) e na bolsa, com diálogo de confirmação (item, quantidade, valor); crítico.
- Descartar (bolsa, equipado ou cofre): confirmação + save crítico. Equipar/“Equipar melhor”/“Organizar”: operações reais do domínio; save adiável.
- Reset/Evolução e refino +1 no Ferreiro ganham tela na Wire (mesmas regras do domínio).
- Wire não muta ouro, skills ou itens localmente: sempre API + re-render do save.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #31 | total | passos 1–5; critérios do Complemento de #31 |
| #35 | total | passo 6 |
| #37 | parcial (UI do Mestre); domínio em `Refatoracao 5.md` | passo 7 |
| #40 | total (com `Refatoracao 5.md`) | passo 8 |
| #39 | total (com `Refatoracao 1.md`) | passo 9 |
| #32 | total (com `Refatoracao 5.md`) | passo 10 |

## Passos

1. `game/src/ui/WireApi.ts` (novo) — interface (personagem, inventário, skills, loja, venda, cofre, refino, reset/evolução, portal, quest, sage, barra).
2. `game/src/ui/WireGameBridge.ts` — implementar `WireApi`; instalar fora do `DebugApi`.
3. `game/src/ui/WireUi.ts` — `mount` recebe `WireApi`; parar de buscar globals para estado de jogo; empty state sem jogo montado.
4. `game/src/app/GameApp.ts` — construir bridge e passar para `WireUi.mount`.
5. `visual/telas/03-wire-paineis-cidade.html` — `gameApi()` chama a API injetada no mount.
6. `visual/telas/03-wire-paineis-cidade.html` — lixeira (com confirmação), equipar, “Equipar melhor”, organizar bolsa → métodos da API.
7. `visual/telas/03-wire-paineis-cidade.html` — Mestre de Skills: só “Comprar”/“Aprendida”; remover “Melhorar”, “Máximo” e “Nível x/10”.
8. `visual/telas/03-wire-paineis-cidade.html` — vender no Mercador/Ferreiro e na bolsa com confirmação; loja sem estoque exibido.
9. `visual/telas/03-wire-paineis-cidade.html` — Reset e Evolução (painel do personagem) via API.
10. `visual/telas/03-wire-paineis-cidade.html` — refino +1 no Ferreiro via API.
11. Wire: `InputService.setUiOpen` nos open/close de painel e diálogos (plano 4).
12. `game/scripts/bot-play.mjs` — usar bridge tipada onde hoje usa wire global.
13. `game/scripts/check-wire-economy.mjs` (novo) — Playwright: comprar skill cobra ouro e grava; recompra bloqueada; vender (NPC e bolsa) pede confirmação; descarte some após reload; refino +1 soma uma vez.
14. `cd game && npm run typecheck`.
15. `cd game && npm run build && npm run preview` — Wire funciona no build de produção sem `__UAIDZIN__`.
16. `cd game && node scripts/check-wire-economy.mjs`.
17. Manual dev: login admin, comprar skill, vender, cofre, refino, Reset, portal D2.
18. `cd game && npm run smoke`.

## Testar

- [ ] Sem jogo montado: wire mostra empty state (sem crash).
- [ ] Build de produção: painéis leem e alteram o save.
- [ ] Ouro, skills e itens batem com o save após cada operação e reload.
- [ ] Passos 14–18 verdes.

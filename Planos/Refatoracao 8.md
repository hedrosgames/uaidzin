# Refatoração 8 — wire módulos e legado fora — implementação

Executar passos **1 → 19** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 7.md` passos **1 → 18** (aprender skill, vender, Reset/Evolução e refino +1 já na `WireApi`).

## Comportamento

- UI de hub migra para TS em `game/src/ui/wire/`, bundlada pelo Vite com o jogo.
- `visual/telas/03-wire-paineis-cidade.html` deixa de ser fonte de produção.
- `GamePanels.ts` sai por completo: código, estilos, `#game-panels`, atalhos e pontos de entrada.
- Globais `__UAIDZIN_WIRE__`, `__UAIDZIN_ECONOMY__`, `__UAIDZIN_DEBUG__` fora do build de produção; `__UAIDZIN__` só em DEV.
- `vite.config.ts`: build não exige `../visual/telas`.
- SVG de `visual/telas/assets/` (`items/`, `eq/`, `skills/`) vão para `game/public/assets/icons/` (mesmas subpastas). URL `/assets/icons/...`. `game/public/` não tinha pasta de ícones; texturas de mundo seguem `game/public/textures/` (plano 11).

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #43 | total (com `Refatoracao 4.md`) | passos 9–12, 18; critérios do Complemento de #43 |
| #31 | reforço (sem globais) | passo 11 |

## Passos

### A — Estrutura

1. `game/src/ui/wire/` (pasta nova) — módulos: shell, person, skills, inventory, vault, shop, composer, quest, portal, sage, dialog.
2. `game/src/ui/wire/` — migrar markup/CSS crítico de `visual/telas/03-wire-paineis-cidade.html` para componentes TS + CSS importado (paleta C intacta).

### B — Painéis

3. `game/src/ui/wire/person.ts` — personagem, slot, Reset/Evolução.
4. `game/src/ui/wire/skills.ts` — Skills (K) + Mestre (sem nível).
5. `game/src/ui/wire/inventory.ts` — Inventário (I) + equip + vender + descartar com confirmação.
6. `game/src/ui/wire/` — cofre, loja (venda com confirmação), Ferreiro (refino +1), compositor, quest, portal, sábio.

### C — Boot do wire

7. `game/index.html` — montar wire TS em `#wire-root`.
8. `game/vite.config.ts` — remover `wireUiPlugin` que aponta para `visual/telas`; servir bundle TS. Copiar `visual/telas/assets/{items,eq,skills}/` para `game/public/assets/icons/{items,eq,skills}/`. Catálogo (`items.json`, `item-catalog.ts`) aponta `assets/icons/items/<arquivo>.svg`.

### D — Remover legado

9. `game/src/ui/GamePanels.ts` — apagar; remover `new GamePanels`/`this.panels` de `game/src/app/GameApp.ts`, `#game-panels` de `game/index.html`, `gamePanelsElement` de `game/src/main.ts` e CSS `.game-panels`/`.panel-card`.
10. `game/src/ui/WireGameBridge.ts` — remover instalação de `window.__UAIDZIN_WIRE__` / `__UAIDZIN_ECONOMY__`.
11. `game/src/debug/DebugApi.ts` — `window.__UAIDZIN__` só em DEV.
12. `visual/telas/03-wire-paineis-cidade.html` — apagar script inline de produção.

### E — QA

13. `cd game && npm run build` — verde sem pasta `visual/telas`.
14. `cd game && npm run typecheck && npm run test && npm run smoke`.
15. `game/scripts/` — Playwright que abrem `/wire/...` apontam para o entry novo; `node scripts/check-wire-economy.mjs` verde.
16. Manual: login → cidade → dungeon → voltar; C/K/I nas duas.
17. Manual: paleta, escudo só nos CTAs travados, sem emoji, pt-BR com acento.
18. `rg "__UAIDZIN_WIRE__|__UAIDZIN_DEBUG__|GamePanels" game/src game/dist` — só adapters dev/test; zero no `dist`.
19. `AGENTS.md` — linha “Fonte wire = `game/src/ui/wire`”.

## Testar

- [ ] Passos 13–15 verdes.
- [ ] Hub completo jogável sem `visual/telas` no build. Ícone de item abre em `/assets/icons/items/`.
- [ ] Aprender skill cobra ouro; vender pede confirmação; refino e Reset funcionam — sem `GamePanels`.

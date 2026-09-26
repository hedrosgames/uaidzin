# Refatoração 8 — wire módulos e legado fora — implementação

Executar passos **1 → 18** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 7.md` passos **1 → 12**.

## Comportamento

- UI de hub migra para TS em `game/src/ui/wire/` (ou `game/src/ui/panels/`), bundlada pelo Vite com o jogo.
- `visual/telas/03-wire-paineis-cidade.html` deixa de ser fonte de produção.
- Remover `GamePanels.ts` e globais `__UAIDZIN_WIRE__`, `__UAIDZIN_ECONOMY__` do caminho de produção.
- `vite.config.ts`: build não exige `../visual/telas` para produção; assets estáticos copiados para `game/public/wire/` se necessário.

## Passos

### A — Estrutura

1. `game/src/ui/wire/` (pasta nova) — módulos: shell, person, skills, inventory, vault, shop, composer, quest, portal, sage.
2. Migrar markup/CSS crítico de `visual/telas/03-wire-paineis-cidade.html` para componentes TS + CSS importado (paleta C intacta).

### B — Painéis (ordem sugerida)

3. Personagem + seleção de slot.
4. Skills (K) + Mestre.
5. Inventário (I) + equip.
6. Cofre, loja, compositor, quest, portal, sábio — um grupo por passo de task se preferir fatiar.

### C — Boot do wire

7. `game/index.html` ou entry do hub — montar wire TS em `#wire-root`.
8. `game/vite.config.ts` — remover `wireUiPlugin` que aponta para `visual/telas`; servir bundle TS.

### D — Remover legado

9. Apagar `game/src/ui/GamePanels.ts` e referências.
10. Remover instalação de `window.__UAIDZIN_WIRE__` / `__UAIDZIN_ECONOMY__` em produção.
11. Manter `visual/telas/` apenas como espelho opcional ou apagar HTML monolítico após migração (decisão: apagar script inline de produção).

### E — QA

12. `cd game && npm run build` — verde sem pasta `visual/telas`.
13. `cd game && npm run typecheck && npm run smoke`.
14. Playwright existentes que abrem `/wire/...` — atualizar URL/entry.
15. Manual: fluxo login → cidade → dungeon → voltar.
16. Manual: paleta, escudo só nos CTAs travados, sem emoji.
17. `AGENTS.md` — uma linha: fonte wire = `game/src/ui/wire` (task doc se pedida).
18. Confirmar `grep __UAIDZIN_WIRE__` só em dev/test adapters.

## Testar

- [ ] Passos 12–13 verdes.
- [ ] Hub completo jogável sem `visual/telas` no build.
- [ ] Aprender skill cobra ouro (sem `GamePanels`).

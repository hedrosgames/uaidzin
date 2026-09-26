# Refatoração 8 — wire módulos e legado fora — implementação

Executar passos **1 → 24** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 7.md` passos **1 → 25** (toda operação da Wire já passa pela `WireApi`).

## Comportamento

- UI de hub migra para TS em `game/src/ui/wire/`, bundlada pelo Vite com o jogo e montada em `#wire-ui`.
- `visual/telas/03-wire-paineis-cidade.html` deixa de ser fonte de produção; nenhum build, plugin ou script do jogo lê `visual/telas`.
- Uma skill bar só: `game/src/ui/wire/skillbar.ts` renderiza `#skillHud` e usa o diff do `SkillBarView` (plano 4); `#skill-bar` legado sai.
- `GamePanels.ts` sai por completo: código, estilos (`.game-panels`, `.panel-card`, `.wyd-*`), `#game-panels`, `gamePanelsElement`, atalhos e pontos de entrada. `.help-bar` e o ramo sem Wire de `enterGame` também saem.
- `InteractionPanel` continua (diálogo de NPC) e segue contando como `uiOpen`.
- Falha no `WireUi.mount` mostra erro pt-BR claro (sem cair em painel legado).
- `__UAIDZIN__` só em DEV (plano 4); `__UAIDZIN_WIRE__`/`__UAIDZIN_ECONOMY__` já saíram no plano 7.
- SVG de `visual/telas/assets/` (`items/`, `eq/`, `skills/`) vão para `game/public/assets/icons/` (mesmas subpastas). URL `/assets/icons/...`. Arte do personagem no painel segue a classe do save (`TKpng` / `FMpng` / `BMpng` / `HTpng`), sem `face-tk.png` fixo.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #43 | total (com `Refatoracao 4.md`) | passos 12–15, 23; critérios do Complemento de #43 |
| #31 | reforço (sem `visual/telas` no build) | passos 9–11, 18 |
| #13 | reforço (HUD legada fora) | passo 13 |

## Passos

### A — Estrutura

1. `game/src/ui/wire/` (pasta nova) — módulos: `shell`, `dialog`, `tooltip`, `hint`, `person`, `skills`, `skillmaster`, `skillbar`, `inventory`, `vault`, `shop`, `smith`, `composer`, `quest`, `portal`, `sage`.
2. `game/src/ui/wire/` — migrar markup/CSS de `visual/telas/03-wire-paineis-cidade.html` para componentes TS + CSS importado (paleta C intacta).

### B — Painéis

3. `game/src/ui/wire/person.ts` — personagem, slot, atributos, especialização, Reset/Evolução, “MAX”, arte por classe.
4. `game/src/ui/wire/skills.ts` e `skillmaster.ts` — Skills (K) + Mestre (sem nível).
5. `game/src/ui/wire/skillbar.ts` — `#skillHud` com `SkillBarView`.
6. `game/src/ui/wire/inventory.ts` — Inventário (I) + equip + vender + descartar com confirmação + organizar.
7. `game/src/ui/wire/vault.ts`, `shop.ts`, `smith.ts`, `composer.ts`, `quest.ts`, `sage.ts` — cofre, loja (venda com confirmação), Ferreiro (refino +1), compositor, quest, sábio.
8. `game/src/ui/wire/portal.ts` — portal + confirmação com “não solicitar mais” (seção `options` do perfil) e restauração em Opções.

### C — Boot do wire e ícones

9. `game/index.html` — montar wire TS em `#wire-ui`.
10. `game/vite.config.ts` — remover `wireUiPlugin`, `wireRoot`, `visualAssetsRoot`, `findSvgIcons`, `/api/dev/icons` e cópia no `closeBundle`; servir bundle TS.
11. `game/public/assets/icons/{items,eq,skills}/` — copiar SVG de `visual/telas/assets/`; `game/src/data/items/items.json`, `game/src/data/items/item-catalog.ts`, `game/src/ui/WeaponSetHudIcons.ts` e `skillIconPath` em `game/src/ui/WireGameBridge.ts` apontam para `/assets/icons/...`; artes de classe em `game/public/assets/class/` (provisório).

### D — Remover legado

12. `game/src/ui/GamePanels.ts` — apagar; remover `new GamePanels`/`this.panels` e `gamePanelsElement` de `game/src/app/GameApp.ts` (`GameAppDeps`) e de `game/src/main.ts`; `#game-panels` de `game/index.html`.
13. `game/index.html`, `game/src/main.ts` (`skillBarElement`, `helpBarElement`), `game/src/app/GameApp.ts`, `game/src/style.css` — remover `#skill-bar`, `.help-bar`, ramo sem Wire de `enterGame`, CSS `.game-panels`/`.panel-card`/`.wyd-*`.
14. `game/src/app/GameApp.ts` — `catch` do `WireUi.mount` mostra erro pt-BR.
15. `visual/telas/03-wire-paineis-cidade.html` — apagar script inline de produção.

### E — QA

16. `game/scripts/check-c6-c20.mjs`, `check-c10-c14-c11.mjs`, `check-c18-d5.mjs`, `check-c7i-c1i.mjs` — ler `game/src/ui/wire/` e `game/public/assets/icons/` em vez de `visual/telas`.
17. `cd game && npm run build` — verde sem pasta `visual/telas`.
18. `cd game && npm run typecheck && npm run test && npm run smoke`.
19. `cd game && node scripts/check-wire-economy.mjs`.
20. Manual: login → cidade → dungeon → voltar; C/K/I nas duas.
21. Manual: paleta, escudo só nos CTAs travados, sem emoji, pt-BR com acento; arte do personagem bate com a classe.
22. Manual: renomear `visual/telas` temporariamente e rodar `npm run dev` — hub completo carrega.
23. `rg "__UAIDZIN_WIRE__|__UAIDZIN_ECONOMY__|__UAIDZIN_DEBUG__|GamePanels|visual/telas" game/src game/scripts game/vite.config.ts game/dist` — zero.
24. `AGENTS.md` — linha “Fonte wire = `game/src/ui/wire`”.

## Testar

- [ ] Passos 17–19 verdes.
- [ ] Hub completo jogável sem `visual/telas`. Ícone de item abre em `/assets/icons/items/`.
- [ ] Aprender skill cobra ouro; vender pede confirmação; refino e Reset funcionam — sem `GamePanels`.
- [ ] Uma skill bar só na tela, com cooldown atualizando sem `innerHTML` por frame.

## Pendências

- Pasta definitiva das artes de classe (`face-*.png`, `char-*.png`): Felipe decide no fim; até lá `game/public/assets/class/`.

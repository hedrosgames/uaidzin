# Refatoração 7 — WireApi injetada — implementação

Executar passos **1 → 25** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 4.md` passos **1 → 33** (`InputService`, `HudModel`).
- `Planos/Refatoracao 5.md` passos **1 → 36** (venda, refino, skills sem nível no domínio).
- `Planos/Refatoracao 6.md` passos **1 → 38** (sessão fatiada, `VaultTransfer`, `tryReset`/`tryEvolve`).
- Não depende de `Planos/Skill TK linhagem 1.md`: a barra real entra aqui (passo **8**); TK1 estende para 10 slots.

## Comportamento

- Contrato tipado `WireApi` em `game/src/ui/WireApi.ts` — personagem (atributos, especialização, Reset/Evolução), inventário e bolsas, equipamento, skills e barra, loja e venda, cofre, refino, compositor, quest, portal, sábio, conta.
- `createWireGameApi` (`game/src/ui/WireGameBridge.ts`) implementa `WireApi` em **todo** build e absorve o que hoje só existe em `DebugApi` (cofre, compositor, quests, bolsas, `enterDungeonById`, conta).
- `WireUi.mount(container, api: WireApi)` — injeção explícita; o html devolve um handle para `WireUi` (sem `window.__UAIDZIN_WIRE__`); `window.__UAIDZIN_ECONOMY__` sai.
- Wire não muta ouro, skills, barra ou itens localmente: sempre API + re-render do save. Dados de demonstração e fallbacks locais saem do html.
- Aprender skill: `learnSkill` → `tryLearnSkill` (ouro + save adiável); uma vez por skill; UI sem “Melhorar” nem “Nível x/10”.
- Barra: equipar, limpar, alternar auto e arrastar chamam a sessão (`equipSkill`, `clearSkillSlot`, `toggleSkillAuto`).
- Vender: no NPC (Mercador/Ferreiro) e na bolsa, com diálogo de confirmação (item, quantidade, valor); crítico.
- Descartar (bolsa, equipado ou cofre): confirmação + save crítico + `recalcEquipBonus` quando equipado.
- Equipar, desequipar arrastando, trocar peças entre slots do boneco, “Equipar melhor”, “Organizar” e reordenar bolsa/cofre: operações reais do domínio (`reorderBag(uids)`); save adiável.
- Guardar bolsa inteira no cofre: `moveAllToVault` (uma operação).
- Reset/Evolução (painel do personagem) com confirmação; refino +1 no Ferreiro; tooltip de equipamento mostra o valor efetivo (base + refino).
- Painel do personagem mostra “MAX” no nível máximo (`isMaxLevel`).
- Troca de classe (`setClass`) não existe na Wire.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #31 | total | passos 1–7, 20; critérios do Complemento de #31 |
| #35 | total | passos 8–10 |
| #37 | parcial (UI do Mestre); domínio em `Refatoracao 5.md` | passo 11 |
| #40 | total (com `Refatoracao 5.md`) | passo 12 |
| #39 | total (com `Refatoracao 1.md` e `6.md`) | passo 13 |
| #32 | total (com `Refatoracao 5.md`) | passo 14 |
| #44 | total (com `Refatoracao 6.md`) | passo 13 |

## Passos

### A — API injetada

1. `game/src/ui/WireApi.ts` (novo) — interface completa listada no Comportamento.
2. `game/src/ui/WireGameBridge.ts` — `createWireGameApi` implementa `WireApi`; trazer de `game/src/debug/DebugApi.ts` cofre, compositor, quests, bolsas, `enterDungeonById` e conta; instalar fora do `DebugApi`.
3. `game/src/ui/WireUi.ts` — `mount` recebe `WireApi` e guarda o handle do html; parar de ler `__UAIDZIN_WIRE__`; remover `__UAIDZIN_ECONOMY__`; empty state sem jogo montado.
4. `game/src/ui/CharacterUiBinder.ts` — ler pela `WireApi` (sem global).
5. `game/src/app/GameApp.ts` — construir a API e passar para `WireUi.mount`.
6. `visual/telas/03-wire-paineis-cidade.html` — `gameApi()` usa a API recebida no mount; portal deixa de chamar `window.__UAIDZIN__.enterDungeonById`; sem criar `window.__UAIDZIN_WIRE__`.
7. `visual/telas/03-wire-paineis-cidade.html` — remover dados de demonstração e fallbacks locais (`makeItem`/`bagItems`, atributos, especialização, depósito/saque de ouro).

### B — Operações

8. `visual/telas/03-wire-paineis-cidade.html` — barra de skills (equipar, limpar, auto, arrastar) pela API; sem array `bar[]` local.
9. `visual/telas/03-wire-paineis-cidade.html` — lixeira (com confirmação) em bolsa, equipado e cofre; equipar, desequipar arrastando, troca entre slots do boneco, “Equipar melhor” → métodos da API.
10. `visual/telas/03-wire-paineis-cidade.html` — “Organizar” e reordenar bolsa/cofre via `reorderBag`; guardar bolsa inteira via `moveAllToVault`.
11. `visual/telas/03-wire-paineis-cidade.html` — Mestre de Skills: só “Comprar”/“Aprendida”; remover “Melhorar”, “Máximo” e “Nível x/10”.
12. `visual/telas/03-wire-paineis-cidade.html` — vender no Mercador/Ferreiro e na bolsa com confirmação.
13. `visual/telas/03-wire-paineis-cidade.html` — Reset e Evolução com confirmação via API; “MAX” no nível máximo.
14. `visual/telas/03-wire-paineis-cidade.html` — refino +1 no Ferreiro via API; tooltip com valor efetivo.
15. `game/src/ui/GamePanels.ts` — sem `setClass` fora de DEV (arquivo sai no plano 8).

### C — QA

16. `game/scripts/check-wire-economy.mjs` (novo) — Playwright contra `vite preview`: comprar skill cobra ouro e grava; recompra bloqueada; vender (NPC e bolsa) pede confirmação; descarte some após reload; refino +1 soma uma vez; barra e “Organizar” persistem após reload.
17. `game/src/ui/wire-api.test.ts` (novo) — `createWireGameApi` com sessão falsa: nenhuma operação muta estado sem passar pelo domínio.
18. `cd game && npm run typecheck && npm run test`.
19. `cd game && npm run build`.
20. `cd game && npm run preview` — Wire funciona no build de produção sem `__UAIDZIN__`.
21. `cd game && node scripts/check-wire-economy.mjs`.
22. Manual dev: login admin, comprar skill, montar barra, vender, cofre, refino, Reset, portal D2.
23. Manual: sem jogo montado, Wire mostra empty state.
24. `rg "__UAIDZIN_WIRE__|__UAIDZIN_ECONOMY__" game/src visual/telas` — zero.
25. `cd game && npm run smoke`.

## Testar

- [ ] Sem jogo montado: wire mostra empty state (sem crash).
- [ ] Build de produção: painéis leem e alteram o save.
- [ ] Ouro, skills, barra e itens batem com o save após cada operação e reload.
- [ ] Passos 18–21 e 25 verdes.

## Pendências

- Nenhuma.

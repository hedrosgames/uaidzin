# Plano — Dungeon 2

**Status:** plano de implementação; o runtime ainda não foi alterado por este documento.

**Repositório:** `Planos/Dungeon 2.md` na `main` · Escopo: runtime `game/` + wire `visual/telas/` (servido em `/wire` pelo `vite.config.ts`) + inventários `nongame/docs/inventarios/` na task de fechamento.

Documento de arquitetura. **Não contém código** — dita organização, contratos e restrições. Execução segue o painel de tarefas (task por fase) e as regras duras do `AGENTS.md`.

---

## 1. Requisitos (pedido do Felipe)

| # | Requisito |
|---|---|
| R1 | 2 tipos de inimigo: **Caveira 1** e **Caveira 2** |
| R2 | **4 grupos de 3 inimigos** no mapa, com **respawn no mesmo ponto** de tempos em tempos |
| R3 | **Caveira 2** dropa **Caixa de Sabedoria** |
| R4 | **Caveira 1** tem **20% de chance** de dropar Caixa de Sabedoria também |
| R5 | Entrada na Dungeon 2 **consome 1 Vela**; Vela é vendida pelo **Mercador por 1000 de ouro** |

---

## 2. Estado atual (verificado no código em 2026-09-26)

Boa parte do esqueleto da Dungeon 2 **já existe**. O plano aproveita o que está pronto e fecha só os gaps.

| Peça | Estado | Onde |
|---|---|---|
| Def da dungeon (`dungeon-2`, nível 35–90, 4 blocos × 3 spawns) | **existe** | `game/src/data/dungeons/dungeons.json` |
| Caveira 1 = `caveira_normal` (chaser, 85 HP, modelo `skeleton-normal.glb`, respawn 15 s, 20 XP) | **existe** | `game/src/data/monsters/monsters.json` |
| Caveira 2 = `caveira_especial` (ranged, 150 HP, modelo `skeleton-special.fbx`, respawn 25 s, 40 XP) | **existe** | `game/src/data/monsters/monsters.json` |
| Mundo 3D próprio (cemitério 36×36, muros, braseiros, portal de saída) | **existe** | `buildDungeon2World()` em `game/src/world/CityWorld.ts` + `WorldManager` (`WorldId` inclui `"dungeon-2"`) |
| Escala de combate por bloco (0,62× / 0,82× / 1,05×) | **existe** | `dungeonArenaScale()` em `game/src/data/balance/dungeon.ts` |
| Roteamento de mundo ao entrar (`dungeon-2` → mundo próprio; demais → `dungeon-test`) | **existe** | `tryEnterDungeon()` em `CityGameSession.ts` |
| Consumo de item de entrada (`entryItemId` → `countMaterial`/`consumeMaterial` + `persistSave`) | **mecanismo existe**, mas `dungeon-2` tem `entryItemId: null` | `dungeonEntryGate()` / `tryEnterDungeon()` em `CityGameSession.ts` |
| Respawn no ponto de origem (home X/Z, timer por inimigo) | **mecanismo existe** | `EnemyModel.respawn()` + `EnemyService.updateRespawns()` |
| NPC Mercador + loja + fluxo de compra | **existe** | `npc-merchant` em `game/src/data/world/npcs.json` · `shops.json` (`merchant`) · `ShopService.buyFromShop()` |
| Item de entrada stackável (`slot: "entry"` → instância `material`, stack 999) | **mecanismo existe** (selos D4–D8) | `ItemFactory.createEntrySeal()` · `InventoryService.add()` |
| Loot por arquétipo (ouro/equip/material, **sem monsterId**) | **existe, incompleto p/ R3/R4** | `EconomyService.grantKillLoot(archetype, isBoss)` |
| Item **Vela** | **não existe** | — |
| Item **Caixa de Sabedoria** | **não existe** | — |
| Drop **por monstro** (drops data-driven) | **não existe** | — |
| Rótulos de bloco no HUD (“Bloco N / 4”) | **existe** | `currentArenaLabel()` em `CityGameSession.ts` |

Consequência importante: `pickDungeonForLevel()` escolhe a **última** dungeon elegível — a partir do nível 35, o atalho do Guarda do Portal já mira `dungeon-2`. Hoje entra de graça; com R5 passa a exigir Vela.

---

## 3. Gaps a fechar (o trabalho real)

| Gap | Requisito | Natureza |
|---|---|---|
| G1 — Item `entry_vela` no catálogo + ícone SVG | R5 | dados + asset |
| G2 — `dungeon-2.entryItemId = "entry_vela"` | R5 | dados |
| G3 — Slot `entry_vela` na loja `merchant` (preço 1000) | R5 | dados |
| G4 — Item `caixa_sabedoria` no catálogo + ícone SVG | R3/R4 | dados + asset |
| G5 — Campo `drops` nos monstros + rolagem no loot | R3/R4 | dados + contrato TS + lógica mínima |
| G6 — Ajuste de `respawnSeconds` das caveiras (“de tempos em tempos”) | R2 | dados (valores fechados §9) |
| G7 — UI: Vela no card do portal (nome/ícone/contagem) e mensagem de entrada citando o item | R5 | wire + texto |
| G8 — `dungeonEnterMessage("entry")` genérico hoje (“Entrada insuficiente”) | R5 | texto + catálogo |

Nada de mundo novo, LD novo, sistema de spawn novo ou save novo.

---

## 4. Arquitetura

### 4.1. Princípio

**Dados primeiro, código mínimo.** O runtime já é dirigido por JSON (`monsters.json`, `dungeons.json`, `items.json`, `shops.json`) servido/editável pelo Studio (`/api/dev/*` no `vite.config.ts`). Todo o plano cabe em: **4 JSONs de dados + 2 SVGs + 1 tipo TS + 1 função de loot + textos de UI**. Nenhum módulo novo, nenhuma classe nova.

### 4.2. Fluxo de dados (contratos)

```
items.json ──────────────► ITEM_CATALOG ──► createFromCatalog()/createEntrySeal()
   entry_vela                     │                    │
   caixa_sabedoria                │                    ▼
                                  │            InventoryService (stack por defId, cap 999)
shops.json (merchant) ──► SHOP_CATALOG ──► ShopService.buyFromShop()  [R5: preço 1000]
                                               │
dungeons.json (dungeon-2.entryItemId = "entry_vela")
        │
        ▼
CityGameSession.dungeonEntryGate()/tryEnterDungeon()
        └─ countMaterial("entry_vela") → consumeMaterial(...,1) → persistSave  [R5: já pronto]

monsters.json (caveira_normal / caveira_especial + drops[]) ──► getMonsterDef()
        │
        ▼ (kill)
CityGameSession.grantKillXp(enemy) ──► EconomyService.grantKillLoot(archetype, isBoss, enemy.monsterId)
                                              └─ rolagens existentes (ouro/equip/material) — intactas
                                              └─ rolagem nova: drops do monstro  [R3/R4]
                                                     └─ createFromCatalog("caixa_sabedoria", qty)
EnemyService.spawnFromDungeon() → EnemyModel(homeX/homeZ, respawnSeconds)
        └─ updateRespawns()/respawn() no mesmo ponto  [R2: já pronto, só ajustar segundos]
```

### 4.3. Arquivos afetados (lista exaustiva)

| Arquivo | Mudança | Requisito |
|---|---|---|
| `game/src/data/items/items.json` | +2 defs: `entry_vela` (slot `entry`) e `caixa_sabedoria` (slot `material`); campo `"icon": "items/vela.svg"` / `"items/caixa_sabedoria.svg"` (mesmo padrão dos selos) | R3–R5 |
| `visual/telas/assets/items/vela.svg` | novo ícone (paleta C) — caminho físico do `"icon"` acima | R5 |
| `visual/telas/assets/items/caixa_sabedoria.svg` | novo ícone (paleta C) | R3/R4 |
| `game/src/data/dungeons/dungeons.json` | `dungeon-2.entryItemId`: `null` → `"entry_vela"` | R5 |
| `game/src/data/balance/shops.json` | loja `merchant`: +slot `{ itemId: "entry_vela", qty: 10, price: 1000 }` | R5 |
| `game/src/data/monsters/monsters.json` | `caveira_normal`: `drops` 20% + `respawnSeconds` 60 · `caveira_especial`: `drops` 100% + `respawnSeconds` 90 | R2–R4 |
| `game/src/data/monsters/monster-definitions.ts` | +tipo `MonsterDropDef { itemId; chance; qty }` · +campo opcional `drops?: MonsterDropDef[]` em `MonsterDef` | R3/R4 |
| `game/src/domain/economy/EconomyService.ts` | `grantKillLoot(archetype, isBoss, monsterId?)`: se `monsterId` presente, lê `getMonsterDef(monsterId).drops`, rola cada entrada, adiciona via `createFromCatalog`; falha de espaço vira `lostItem`; chamadas sem `monsterId` (legado) ignoram `drops` | R3/R4 |
| `game/src/app/CityGameSession.ts` | `grantKillXp()`: ampliar parâmetro `enemy` para incluir `monsterId` (já existe em `EnemyModel`) e repassar ao loot · corpo do painel do portal cita a Vela (contagem) | R3–R5 |
| `game/src/app/CityGameSession.ts` (`dungeonEnterMessage`) | Para `reason === "entry"`, aceitar `entryItemId` opcional ou resolver nome via `ITEM_CATALOG` / `getItemDef` — ex.: “Vela necessária — compre com o Mercador” em vez de “Entrada insuficiente” | R5/G8 |
| `visual/telas/03-wire-paineis-cidade.html` | `PORTAL_FALLBACK.items`: +`entry_vela: { id, name: "Vela", icon: "vela" }` · `PORTAL_FALLBACK.dungeons[dungeon-2].entryItemId`: `"entry_vela"` (fallback espelha o runtime; a API já sobrescreve) | R5 |
| `nongame/docs/inventarios/itens.md` · `lojas.md` · `dungeons.md` · `inimigos.md` | atualização na task de fechamento (ids novos, drop, preço, respawn) | doc |

Fora da lista: **nenhum módulo novo**. `ItemFactory`, `InventoryService`, `ShopService`, `EnemyService`, `EnemyModel`, `DungeonRun`, `WorldManager`, `CityWorld` e o save **não mudam de contrato** — só assinatura de `grantKillLoot` + texto de entrada. `grantKillLoot` hoje só é chamado de `grantKillXp()`; um único ponto de repasse de `monsterId` cobre R3/R4.

### 4.4. Contratos novos (decisões fechadas)

| Decisão | Valor | Justificativa |
|---|---|---|
| Id do item de entrada | `entry_vela` | convenção `entry_*` (resolve ícone de fallback `seal.svg` no wire; `createEntrySeal` só aceita slot `entry` com ícone) |
| Nome / slot da instância | “Vela” / `entry` no catálogo → `material` na instância | igual aos selos D4–D8; `countMaterial`/`consumeMaterial` já funcionam por `defId` |
| Id da caixa | `caixa_sabedoria` | convenção snake_case do catálogo; slot `material` → stack 999 via `InventoryService.add()` |
| Nome da caixa | “Caixa de Sabedoria” | literal do pedido |
| Drop da Caveira 2 | 1 entrada `{ itemId: "caixa_sabedoria", chance: 1, qty: 1 }` | **fechado (Felipe):** drop garantido |
| Drop da Caveira 1 | 1 entrada `{ itemId: "caixa_sabedoria", chance: 0.2, qty: 1 }` | 20% do pedido |
| Shape de `drops` | `[{ itemId, chance, qty }]` no `monsters.json` | mínimo data-driven; D3–D8 reutilizam sem código novo |
| Caixa vs. loot antigo | **aditivo** — rolagens de ouro/equip/material continuam; a caixa é uma rolagem extra | não mexe em balance existente |
| Uso da Caixa de Sabedoria | **material vendável apenas** — sem consumir/abrir neste escopo | **fechado (Felipe):** efeito de uso vira task futura |
| Boss do bloco 4 | mantém `isBoss` em `caveira_especial` (stats de boss, respawn 180 s) e **também dropa a caixa** (drop é por monstro, não por boss) | preserva design atual |
| Preço / venda da Vela | compra 1000 (pedido) · `sellValue` 100 | padrão 10% do preço (`entry_d8`: 1000/100) |
| Ícones | obrigatórios — item sem ícone não entra em lista (trava C11 do AGENTS.md; `shopItemFromCatalog` **lança erro** sem ícone) | 2 SVGs novos na paleta C |
| Save | **sem mudança de schema / sem bump de `SAVE_VERSION`** | Vela e caixa são itens comuns de inventário, já serializados |

### 4.5. UI (mínimo necessário)

- **Painel do portal** (wire `p-portal`): o card da Dungeon 2 já desenha “Entrada” com ícone + contagem via `getPortalContext().entryCounts` (que vem de `entryItemCounts()` e **já inclui qualquer `entryItemId` das defs** — zero código novo). Só o mapa de fallback do wire precisa conhecer `entry_vela` (nome + ícone).
- **Mensagem de entrada insuficiente**: trocar o retorno fixo de `dungeonEnterMessage("entry")` por texto que nomeia o item da dungeon tentada (`ITEM_CATALOG[entryItemId].name`). Call sites (`tryEnterDungeon`, `DebugApi`) precisam passar o id ou a def quando `reason === "entry"`.
- **Guarda do Portal** (`openInteraction`, corpo do painel): acrescentar linha “Vela: N” ao texto já montado — opcional de polimento, mesma task.
- **Drop log**: caixa aparece pelo caminho atual (`pushDropLog`, canto inferior esquerdo). Se o mesmo kill gerar ouro + caixa, uma linha só concatenando (“+X Ouro · Caixa de Sabedoria”) — sem novo componente.
- Sem tela nova, sem modal novo, sem emoji, acentuação pt-BR correta.

---

## 5. Fases de execução (tasks do painel)

Cada fase = 1 task (registrar antes, `start` na execução, `done` só testado).

| Fase | Conteúdo | Depende de | Teste de saída |
|---|---|---|---|
| **F1 — Itens** | `items.json` (+`entry_vela`, +`caixa_sabedoria`) e os 2 SVGs em `visual/telas/assets/items/` | — | `npm run typecheck`; item aparece no inventário via debug com ícone |
| **F2 — Entrada (Vela)** | `dungeons.json` (`entryItemId`) + `shops.json` (slot 1000) + `dungeonEnterMessage` (G8) | F1 | comprar Vela por 1000; entrar em D2 consome 1; sem Vela bloqueia com a mensagem nova; save/reload mantém contagem |
| **F3 — Drops** | `MonsterDropDef` + `drops` nos 2 monstros + `grantKillLoot(…, monsterId)` + repasse em `grantKillXp` | F1 | Caveira 2 sempre dropa caixa; Caveira 1 ~20% (validar com random fixo/DebugApi); inventário cheio → “item perdido”; Dungeon 1 inalterada |
| **F4 — Respawn** | `respawnSeconds`: Caveira 1 **60 s**, Caveira 2 **90 s** (§9) | — | matar um grupo e cronometrar o retorno **no mesmo ponto** |
| **F5 — UI wire** | fallback `entry_vela` no portal + texto da Vela no Guarda do Portal | F1, F2 | card D2 mostra Vela + contagem; fluxo de confirmação funciona |
| **F6 — Fechamento** | inventários (`itens.md`, `lojas.md`, `dungeons.md`, `inimigos.md`) + polimento (zero comentário, sem `console.log`, sem temporário) | todas | `npm run typecheck` limpo + checklist do AGENTS.md + validação do Felipe |

---

## 6. Balance — valores fechados para implementação

Fonte do que já existe: `monsters.json` / `dungeons.json` / `shops.json`. Valores abaixo **fechados pelo Felipe** em 2026-09-26; alterar só com novo pedido de balance.

| Valor | Atual | Implementar |
|---|---|---|
| Preço da Vela | — | **1000** |
| `sellValue` Vela | — | **100** |
| `qty` Vela na loja | — | **10** (qty não decrementa no código atual — comportamento herdado) |
| `sellValue` Caixa de Sabedoria | — | **25** |
| Chance Caveira 1 | — | **0,2** |
| Chance Caveira 2 | — | **1,0** (garantido) |
| Respawn Caveira 1 | 15 s | **60 s** |
| Respawn Caveira 2 | 25 s | **90 s** |
| Respawn boss (bloco 4) | 180 s (`DUNGEON_BALANCE.boss`) | sem mudança |
| Stats / XP / escala por bloco | ver `monsters.json` e `dungeonArenaScale()` | sem mudança |

---

## 7. Restrições de código (regras duras — herdam do `AGENTS.md`)

1. **Zero comentários** em qualquer arquivo tocado (TS/JS/CSS/HTML). Exceção única: `/// <reference types="vite/client" />`. Rodar `game/scripts/_strip-comments.mjs` se necessário antes de fechar.
2. `npm run typecheck` **obrigatório** passar em `game/` ao fim de cada fase de código.
3. Sem `console.log` de debug, sem arquivos temporários (`_test-*`, `_*-debug*`), sem CSS/JS morto, sem emoji em UI.
4. UI não mente: contagem de Vela, ouro e itens vêm do **save**/runtime — nada de número mockado no caminho real (o fallback do wire é só espelho offline, já sobrescrito pela API).
5. Item sem ícone **não entra** em lista de jogo — os 2 SVGs são pré-requisito de F1, não polimento.
6. Paleta C (`#100c08` / `#241c14` / `#d4a017` / `#a33b3b` / `#f0e6d0`) nos SVGs; botões novos (se surgirem) retangulares `border-radius: 2px`.
7. pt-BR com acentos corretos em todo texto (`“Vela necessária”`, “Caixa de Sabedoria”).
8. Painéis C/K/I com os mesmos atalhos na cidade e na dungeon — não criar painel que quebre isso.
9. Drop na dungeon: só o **log no canto inferior esquerdo** — proibida tela de resultado cheia.
10. Task registrada no painel **antes** de tocar código; `done` só com resultado testado.

---

## 8. YAGNI — explicitamente **fora** deste plano

| Não fazer | Por quê |
|---|---|
| Sistema genérico de loot table (pesos, pools, raridade por monstro) | 2 monstros e 1 drop não justificam; `drops: [{itemId, chance, qty}]` cobre D3–D8 quando vierem |
| Uso/abertura da Caixa de Sabedoria (consumir → XP ou outro efeito) | **fechado:** só drop + venda neste plano |
| UI de seleção de dungeon no atalho do Guarda do Portal | o painel do portal (`p-portal`) já lista todas com entrada/contagem |
| Novo mundo, LD ou props para D2 | `buildDungeon2World()` já entrega o cemitério jogável |
| HUD/contador de respawn dos grupos | o jogo já não mostra isso em D1; não introduzir agora |
| Persistência de estado da dungeon entre sessões | respawn é por run (comportamento atual); pedido não pede nada além |
| Stock decrementando na loja | comportamento atual não decrementa; mudar é decisão de economia separada |
| Bump de `SAVE_VERSION` / migração | nenhum campo novo no save |
| Rebalancear composição dos blocos ou stats das caveiras | já batem com R1/R2; mexer é inventar balance |
| Ícone/arte 3D de Vela no mundo ou na mão do jogador | fora do escopo do pedido |

---

## 9. Decisões fechadas (Felipe — 2026-09-26)

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Caveira 2 dropa 100%? | **Sim.** `chance: 1` em `caveira_especial`. |
| 2 | Para que serve a Caixa de Sabedoria? | **Material empilhável** com `sellValue: 25`. **Sem ação de uso/consumo** neste plano — task futura se houver design de abertura. |
| 3 | Respawn 60 s / 90 s e sell da caixa? | **Adotar** 60 s (Caveira 1), 90 s (Caveira 2), sell **25**. |
| 4 | Sem Vela no nível 35–40 com atalho mirando D2? | **Manter bloqueio** com mensagem nomeando a Vela. Jogador escolhe **Dungeon 1** no painel do portal (`p-portal`); não implementar fallback automático para D1 no atalho do Guarda. |

Não há decisão de produto pendente neste plano.

---

## 10. Verificação (definição de pronto)

Automático:
- `cd game && npm run typecheck` limpo.
- `npm run smoke` / `npm run bot` sem regressão (se aplicável ao fluxo tocado).

Manual (lab admin/admin):
1. Comprar Vela do Mercador por exatamente 1000 de ouro; ouro insuficiente → `no_gold`.
2. Nível 35+: entrar na D2 pelo portal **consome 1 Vela** e persiste no save (recarregar página mantém contagem).
3. Sem Vela → toast/mensagem nomeando a Vela; **não** entra, **não** consome.
4. D2 carrega o mundo do cemitério com 4 blocos; cada bloco tem 2 Caveiras 1 + 1 Caveira 2 (bloco 4: boss).
5. Matar um grupo → os 3 voltam **no mesmo ponto** após 60 s / 90 s conforme o monstro.
6. Caveira 2 → caixa sempre no drop log; Caveira 1 → ~20%; caixa empilha (1 slot, cap 999).
7. Inventário cheio ao dropar → “Inventário cheio — item perdido”.
8. Dungeon 1 (sem item de entrada) e selos D4–D8 seguem intactos.
9. UI: card D2 mostra ícone/nome/contagem da Vela; C/K/I funcionam dentro da dungeon.
10. Nível 35+ sem Vela: atalho do Guarda bloqueia; painel do portal permite entrar em D1.
11. Checklist final do `AGENTS.md` (zero comentário, sem temporário, pt-BR, sem emoji) + validação visual do Felipe.

**Regressão cruzada:** enquanto a Dungeon 1 evoluir em paralelo, manter `node scripts/check-dungeon-2.mjs` verde após cada fase; quando existir `check-dungeon-1.mjs`, rodar os dois antes de fechar F6.

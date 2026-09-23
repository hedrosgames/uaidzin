# Plano do editor de conteúdo — E1

**Status:** COMPLETO para aprovação — **Aguardando Felipe**.  
**Escopo:** planejar só. **Não** implementar código (E2a/E2b bloqueados até este plano ser aprovado).

**Fontes:** inventários I1–I14 · E4b (`fluxo-mortal-1-400.md`) · `DECISOES-DESIGN.md` · runtime `game/src/data/**` · `SAVE` / D11.  
**Conflito GDD × grill:** grill vence.  
**Números de balance:** o editor **edita** valores; não inventa canônicos novos neste plano.

---

## Objetivo

Ferramenta (web local ou HTML tool) para CRUD de conteúdo de jogo com **validação** e **export** no formato que o runtime já consome (TS/JSON sob `game/src/data` ou `game/public/data`).

Valor: balance/conteúdo sem reabrir sistemas a cada tweak (DoD G6).

---

## Domínios (fases de entrega)

| Fatia | Domínios | Inventário | Runtime hoje | ID delivery |
|---|---|---|---|---|
| **E2a** | Itens · Lojas | I6 · I9 | `item-catalog.ts` · `SHOP_CATALOG` / `economy.ts` | após E1 |
| **E2b** | Dungeons · Inimigos · Classes (+ skills/equip se couber) | I8 · I4 · I10 · I3 · I7 | `dungeons-mortal.ts` · `dungeon-definitions.ts` · `combat.ts` · `class-definitions` · skill defs | após E2a |
| **Depois** | Quests · Fórmulas compositor · Textos UI · VFX/SFX refs | C1d · C7d · I13 · I2 · I11 | defs + wire | pós G6 mínimo |

**Fora do MVP do editor:** mesh GLB, shaders, animações (ficam inventário + arte; editor só **referencia** paths).

---

## Princípios

1. **Uma fonte de verdade exportada** — jogo não lê o editor em runtime; consome artefato versionado.  
2. **Schema explícito** por domínio (campos + tipos + defaults + regras).  
3. **Validação no export** — falha se ícone ausente (grill C11), id duplicado, faixa min>max, loja aponta item inexistente.  
4. **Ids estáveis** — snake/kebab já usados (`entry_d4`, `dungeon-1`, `mat_lac`); não renomear sem migração.  
5. **Provisório marcado** — campo `status: final | placeholder | provisório` opcional no schema para auditoria.  
6. **pt-BR** em labels de UI do editor e em `name`/`desc` exportados.

---

## Schema (visão por domínio)

### Itens (`ItemDef`)

| Campo | Tipo | Obrigatório | Nota |
|---|---|---|---|
| `id` | string | sim | único |
| `name` | string | sim | pt-BR |
| `slot` / `type` | enum | sim | weapon, armor, head, ring, neck, ear, material, entry, consumable, … |
| `rarity` | enum | sim | Comum…Lendário |
| `icon` | path | sim | sem ícone = **rejeita export** |
| `desc` | string | não | |
| `stack` | number | não | materiais |
| `sellValue` | number | não | ou deriva raridade |
| `entryDungeonId` | string? | se type=entry | liga I8 |

### Lojas (`ShopCatalog`)

| Campo | Tipo | Nota |
|---|---|---|
| `npcId` | `blacksmith` \| `merchant` | |
| `slots[]` | `{ itemId, qty, price }` | itemId ∈ ItemDef |

### Equip / refine (fatia 2 ou extensão E2a)

| Campo | Tipo | Nota |
|---|---|---|
| reqs de classe | map classe→ok | grill armadura por classe |
| refine curve | refs `ECONOMY_BALANCE.refine` | editar tabela, não hardcode espalhado |
| tiers por faixa | opcional | depende I7 fechado |

### Inimigos (`EnemyDef` — I4)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | string | hoje = arquétipo; futuro = monstro nomeado |
| `archetype` | `fixed` \| `chaser` \| `ranged` | AI |
| `isElite` | bool | grill elite |
| `baseStats` | hp/atk/def/range/… | de `COMBAT_BALANCE.enemy` |
| `dropTableId` | string | por dungeon ou monstro |
| `mesh` / `tint` | path / cor | C24 placeholder até GLB |

### Dungeons (`DungeonDef`)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | string | `dungeon-1`… |
| `name` | string | diegético |
| `levelMin` / `levelMax` | number | |
| `entryItemId` | string? | |
| `durationSeconds` | number | default 600 |
| `combatScale` | multipliers | ex. d1Ease |
| `arenas[]` | spawns | archetype + x/z + isBoss |
| `biome` / `worldPrefab` | string | D13 |

### Classes / skills (fatia 2)

| Campo | Tipo | Nota |
|---|---|---|
| classe | TK/FM/BM/HT | attrs create canônicos 5/5/5/5 |
| árvores | 3×8 + 8ª exclusão | I3 |
| livros | BOOK_SKILLS | |

---

## Contrato export → runtime

### Formato alvo (proposta)

| Opção | Prós | Contras |
|---|---|---|
| **A — JSON em `game/public/data/*.json` + loader TS** | hot-reload fácil; editor grava JSON puro | precisa loader e tipagem |
| **B — gerar `.ts` const em `game/src/data/`** | zero loader novo; typecheck no CI | diff barulhento; editor precisa template |
| **C — JSON + codegen `*.generated.ts`** | melhor dos dois | pipeline npm |

**Proposta E1 (para Felipe):** começar **E2a com opção B** (gerar/atualizar catálogos TS que já existem: `item-catalog.ts`, blocos de `economy.ts` / `SHOP_CATALOG`) para o jogo consumir **sem** mudar boot. Migrar para A/C se o volume doer.

### Pipeline

```text
Editor UI → validate(schema) → export artifact → (opcional) npm run data:check
  → Vite bundle → runtime lê defs iguais às de hoje
```

### Regras de merge

- Export **não** apaga campos desconhecidos sem aviso (forward-compat).  
- Diff revisável no git (um domínio por arquivo quando possível).  
- Wipe/save de jogador **não** entra no editor.

---

## UI do editor (alto nível)

| Tela | Conteúdo |
|---|---|
| Hub | lista de domínios + status inventário (final/placeholder/falta) |
| Lista | tabela filtrável por id/status |
| Detalhe | formulário schema; preview de ícone |
| Validação | painel de erros antes do export |
| Export | botão + log do path gerado |

Paleta/estilo: alinhar a `visual/DECISOES-ESTILO.md` se for HTML no repo; senão tool interna minimal.

---

## Dependências e bloqueios

| Depende | Motivo |
|---|---|
| Inventários I4–I10 estáveis o bastante | schema não inventa monstro/item fantasma |
| E4b aprovado (ou faixas estáveis) | dungeons/levels coerentes |
| E1 aprovado | **libera E2a** |

| Bloqueia | Até |
|---|---|
| E2a / E2b | este plano aprovado |
| C24 mesh monstro | arte GLB (editor só referencia) |

---

## Fora de escopo E1/E2

- Dashboard de métricas (E3 / E3b).  
- Balance automático / ML.  
- Multiplayer sync de defs.  
- Editar saves de jogador.

---

## Checklist de aprovação (Felipe)

- [ ] Domínios E2a / E2b ok  
- [ ] Formato de export (B proposto) ok ou A/C  
- [ ] Validação “sem ícone = rejeita” ok  
- [ ] Onde mora o tool (`game/tools/editor` vs `visual/` vs externo)  
- [ ] Ordem: itens+lojas antes de dungeons/monstros

---

## Como manter

- Novo domínio no grill → linha na tabela de fatias + schema.  
- Runtime mudou shape de def → atualizar schema **antes** de E2 tocar UI.  
- Aprovado → E2a sai de Bloqueado; checklist 5.1.

# Lojas / NPCs comerciais — inventário I9

Documento de discovery + estado pós **C10/C14**. Compra/estoque persistente ainda **não** implementados (UI lista).

**Fontes:** `DECISOES-DESIGN.md` (CIDADE · ECONOMIA) · `SHOP_CATALOG` / `ITEM_CATALOG` · `CITY_INTERACTABLES` · `CityGameSession.openShop` · wire loja · I6 / I7.  
**Conflito GDD × grill:** grill vence — Mercador = consumíveis + **itens de entrada** + utilidades; Ferreiro = melhorar/refinar + **catálogo**.

---

## Regra canônica (grill)

| NPC | Papel |
|---|---|
| Mercador | Consumíveis, **itens de entrada** de dungeon, utilidades |
| Ferreiro | Melhorar/refinar + catálogo de peças |
| Compositor | Receitas (não é loja de compra; ver C7) |
| Mestre de Quests | Missões (C1) — não catálogo de venda |
| Sábio | Tutorial/códice — **não** vende |
| Mestre de Técnicas | Compra de skills (ouro+pontos) — fora de I6 itens |
| Guarda do Portal | Entrada de dungeon (consome item) — não vende |
| Baú | Vault da conta — não vende |

---

## Contagem (pós C10/C14)

| Grupo | Qtd |
|---|---:|
| Lojas com `SHOP_CATALOG.shops` | **2** (merchant · blacksmith) |
| Itens no catálogo de loja | **15** (com ícone obrigatório) |
| Slots mercador | **7** (5 selos + 2 materiais) |
| Slots ferreiro | **10** (2 materiais + 8 peças) |
| Selos de entrada no catálogo | **5** (`entry_d4`…`entry_d8`) |
| Consumíveis poção | **0** *(gap grill — sem id canônico)* |
| Compra/venda implementada | **UI lista só** — sem debitar ouro/estoque |

---

## Catálogo runtime

### Mercador (C14)

| itemId | qty | preço | nota |
|---|---:|---:|---|
| `entry_d4`…`entry_d8` | 20…8 | 200…1000 | **provisório** |
| `mat_ori` | 50 | 25 | material |
| `mat_lac` | 10 | 120 | material |

Sem gear (grill).

### Ferreiro (C10)

| itemId | qty | preço | nota |
|---|---:|---:|---|
| `mat_ori` / `mat_lac` | 99 / 20 | 20 / 100 | refine |
| `espada_curta` · `machado_leve` | 3 | 70 / 85 | arma livre |
| `armadura_leve` · `capacete` | 3 | 70 / 50 | req. classe TBD (I7) |
| `anel_cobre` · `anel_ferro` · `colar_simples` · `brinco_osso` | 4 | 40…160 | acessórios |

UI de **refino** dedicada + quebra em falha: ainda gap (serviço existe).

---

## Delivery

| ID | Escopo | Status |
|---|---|---|
| C14 | Mercador = lista I9/I6 | técnico OK — aguarda Felipe |
| C10 | Ferreiro = lista I9/I7 | técnico OK — aguarda Felipe |
| C11 | Ícone em todo item | técnico OK — placeholders SVG anotados |

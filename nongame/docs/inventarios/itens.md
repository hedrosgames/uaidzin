# Itens — inventário I6

Documento de discovery. Depois de ler isto, dá para listar **ids canônicos e gaps** (material / entrada / equip / consumível) sem abrir o código.

**Fontes:** `DECISOES-DESIGN.md` (ITENS · ECONOMIA · COMPOSITOR) · GDD `11-itens-loot-e-inventario.md` · `game/src/data/balance/economy.ts` (`SHOP_CATALOG`) · `ItemFactory` / `ItemModel` · `dungeons-mortal.ts` (`entryItemId`) · wire `03-wire-paineis-cidade.html` · I5 (`docs/inventarios/assets.md`).  
**Conflito GDD × grill:** o grill vence — **todo item com ícone**; sem ícone **não entra** na build; inventário cheio = drop **se perde**.

---

## Regra canônica (grill)

| Tópico | Valor |
|---|---|
| Ícone | **Obrigatório** em todo item de jogo (C11) |
| Raridade | Comum → Incomum → Raro → Épico → Lendário (`ECONOMY_BALANCE.rarities`) |
| Slots de bag | **Como na UI** (40 slots · 4 bolsas · materiais stack 999) |
| Materiais | Dropam; gastam em refino / compositor (ex.: Poeira de Lac) |
| Entrada de dungeon | Item **consome ao entrar** (D4–D8) |
| Inventário cheio | Item **perdido** + mensagem |
| Venda NPC | Preço baixo **fixo por raridade** + poder dissolver |

---

## Contagem

| Grupo | Qtd | Nota |
|---|---:|---|
| Catálogo de loja (`SHOP_CATALOG.items`) | **15** | ids estáveis no runtime (com ícone) |
| Materiais com `defId` de inventário | **2** | `mat_ori` / `mat_lac` (loja alinhada; alias `poeira_*` no catálogo) |
| Selos de entrada D4–D8 | **5** | defs + loja mercador (C14); factory `createEntrySeal` |
| Nomes de equip no drop procedural | **12** | bases; ícone por nome/slot (C11) |
| Consumíveis / utilidades no grill | **gaps** | poção, livro, troca de classe, evolução, reespec, caixa XP |
| Wire-mock (não canônico) | **~14** | só protótipo visual |
| Ícones SVG em `visual/telas/assets/items/` | **23** | placeholder (I5/C11) |

**Total canônico listado abaixo (ids nomeados):** **17** (+ templates de drop + gaps).

---

## Legenda de status

| Status | Significado |
|---|---|
| `runtime` | Id usado no jogo (loja, drop, gate ou inventário) |
| `runtime-id-split` | Mesmo item com **dois ids** (loja ≠ inventário) — alinhar em C10/C14/C11 |
| `wire-mock` | Só no wire HTML; **não** é contrato de id |
| `gdd-gap` | Grill/GDD citam; **sem id** no código |
| `falta-icone` | Precisa de PNG/SVG dedicado antes de C11 fechar |
| `provisorio` | Número/nome provisório; fonte anotada |

---

## Tabela mestra — ids nomeados

Colunas: id | nome | tipo | raridade | ícone | drop/venda | status

| id | nome | tipo | raridade | ícone | drop/venda | status |
|---|---|---|---|---|---|---|
| `espada_curta` | Espada Curta | weapon | Comum | `items/espada_curta.svg` | ferreiro | runtime · placeholder |
| `machado_leve` | Machado Leve | weapon | Comum | `items/machado_leve.svg` | ferreiro | runtime · placeholder |
| `armadura_leve` | Armadura Leve | armor | Comum | `items/armadura_leve.svg` | ferreiro | runtime · placeholder |
| `capacete` | Capacete | head | Comum | `items/capacete.svg` | ferreiro | runtime · placeholder |
| `anel_cobre` | Anel de Cobre | ring1 | Comum | `items/anel_cobre.svg` | ferreiro | runtime · placeholder |
| `anel_ferro` | Anel de Ferro | ring2 | Incomum | `items/anel_ferro.svg` | ferreiro | runtime · placeholder |
| `colar_simples` | Colar Simples | neck | Comum | `items/colar_simples.svg` | ferreiro | runtime · placeholder |
| `brinco_osso` | Brinco de Osso | ear | Comum | `items/brinco_osso.svg` | ferreiro | runtime · placeholder |
| `mat_ori` | Poeira de Ori | material | Comum | `items/ori.svg` | lojas + drop/refine | runtime |
| `mat_lac` | Poeira de Lac | material | Comum | `items/lac.svg` | lojas + drop/refine | runtime |
| `poeira_ori` | Poeira de Ori | material | Comum | `items/ori.svg` | alias legado → `mat_ori` | runtime-alias |
| `poeira_lac` | Poeira de Lac | material | Comum | `items/lac.svg` | alias legado → `mat_lac` | runtime-alias |
| `entry_d4` | Selo D4 | entrada | Comum *(provisório)* | `items/seal.svg` | mercador + gate D4 | runtime |
| `entry_d5` | Selo D5 | entrada | Comum *(provisório)* | `items/seal.svg` | mercador + gate D5 | runtime |
| `entry_d6` | Selo D6 | entrada | Comum *(provisório)* | `items/seal.svg` | mercador + gate D6 | runtime |
| `entry_d7` | Selo D7 | entrada | Comum *(provisório)* | `items/seal.svg` | mercador + gate D7 | runtime |
| `entry_d8` | Selo D8 | entrada | Comum *(provisório)* | `items/seal.svg` | mercador + gate D8 | runtime |

**Nota:** loja usa `mat_*` (C14/C10). `createEntrySeal` / `ITEM_CATALOG` cobrem selos. Sem ícone → fora da lista (C11).

---

## Drop procedural de equipamento (`ItemFactory.createEquipDrop`)

Não há catálogo fechado de peças nomeadas: sorteia slot × raridade × nome base.

| Slot | Nomes possíveis | `defId` gerado | Ícone hoje |
|---|---|---|---|
| weapon | Espada Curta · Machado Leve · Cajado Rústico · Arco Curto | `weapon_{raridade}` | fallback slot |
| head | Capacete · Touca de Couro | `head_{raridade}` | fallback slot |
| armor | Armadura Leve · Túnica | `armor_{raridade}` | fallback slot |
| ring1 | Anel de Cobre | `ring1_{raridade}` | fallback slot |
| ring2 | Anel de Ferro | `ring2_{raridade}` | fallback slot |
| neck | Colar Simples | `neck_{raridade}` | fallback slot |
| ear | Brinco de Osso | `ear_{raridade}` | fallback slot |

Raridades no nome do item: prefixo `"${rarity} ${name}"`. Chance: `equipDropChance` 0.22 / boss 0.4; materiais `materialDropChance` 0.18 (`oriShare` 0.75). Valores **provisórios** (`economy.ts`).

---

## Gaps grill / GDD (sem id no runtime)

| id proposto *(não oficial)* | nome | tipo | motivo | status |
|---|---|---|---|---|
| — | Poção / cura | consumível | grill mercador; wire tem “Poção Menor” | gdd-gap · wire-mock |
| — | Item de entrada D1–D3 | entrada | D1–D3 `entryItemId: null` hoje | gdd-gap *(opcional)* |
| — | Item troca de classe | utilidade | grill CLASSES — mercador ou compositor | gdd-gap |
| — | Item de evolução Mortal→Arch | marco | grill 400 + item | gdd-gap · E4 |
| — | Item reespec ilimitado | utilidade | grill: sábio com limite + item ilimitado | gdd-gap |
| — | Caixa de XP (quest) | quest | grill QUESTS | gdd-gap · C1 |
| — | Fragmento / sucata / couro / runa / seta | misc | só wire | wire-mock |
| — | Livro de skill | livro | I3 `BOOK_SKILLS`; wire “Livro do Passo” | gdd-gap id item |

---

## Wire-mock (não canônico)

Itens só em `bagItems` / paperdoll do wire — **não** copiar como catálogo de jogo:

| nome wire | icon | status |
|---|---|---|
| Ori Bruto | ori | wire-mock |
| Poção Menor | potion | wire-mock |
| Lac (como “moeda premium”) | lac | wire-mock *(conflita com Poeira de Lac)* |
| Couro | leather | wire-mock |
| Runa Predadora | rune | wire-mock |
| Fragmento | fragment | wire-mock |
| Seta Comum | arrow | wire-mock |
| Livro do Passo | book | wire-mock |
| Arco do Véu / Couraça / Anel de Musgo / … | (sem SVG item) | wire-mock |
| Lobo Cinza (pet) | — | wire-mock · slot fora dos 7 canônicos |

---

## Ícones disponíveis (`visual/telas/assets/items/`)

| Arquivo | Uso canônico sugerido | Status I5 |
|---|---|---|
| `ori.svg` | Poeira de Ori | placeholder |
| `lac.svg` | Poeira de Lac | placeholder |
| `seal.svg` | Selos de entrada | placeholder |
| `potion.svg` | Poção (quando existir id) | placeholder |
| `book.svg` | Livro de skill | placeholder |
| `gem.svg` | Fallback material loja | placeholder |
| `rune.svg` / `scrap.svg` / `leather.svg` / `fragment.svg` / `arrow.svg` | wire / futuro | placeholder |

Equipamentos de loja hoje usam **ícone de slot** (`eq/weapon.svg` etc.), não ícone por item — **viola** a regra “todo item com ícone” até C11.

---

## Compositor

Discovery fechado em **C7d:** [`compositor-formulas.md`](compositor-formulas.md) (`compose_plus7_lac`). Delivery = **C7i**.

---

## Pendências para delivery

1. Arte final dos SVG de equip (hoje placeholder copiado de `eq/`).
2. Fechar ids dos gaps (classe / evolução / reespec / poção / caixa XP) sem inventar balance.
3. Compra real (debitar ouro/estoque) — fora de C10/C14 lista.

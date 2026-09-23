# Equipamentos — inventário I7

Documento de discovery. Depois de ler isto, dá para ver **7 slots × raridade × refine × regra de classe** sem abrir o código.

**Fontes:** `DECISOES-DESIGN.md` (ITENS ITEM-6) · GDD `11` / `12` · `ItemModel` · `EquipmentService` · `ItemFactory` · `RefinementService` · `ECONOMY_BALANCE` · `COMBAT_BALANCE.weapon` · wire paperdoll · I6.  
**Conflito GDD × grill:** grill vence — **arma livre** (scaling); **armadura por classe**; refine com chance; falha perde material; **algumas falhas quebram** o item (GDD `11` ainda diz “não destrói” — **grill vence**).

---

## Regra canônica (grill)

| Tópico | Valor |
|---|---|
| Slots | **Como está hoje na UI** — canônico runtime = **7** |
| Arma | **Livre** entre classes (scaling por attrs/build) |
| Armadura / cabeça | **Por classe** (req. classe) |
| Acessórios | Anéis / colar / brinco — req. classe **TBD** (não no código) |
| Refine | +N com chance; falha **perde material**; **algumas** falhas **quebram** |
| Persistência | Equip + refine **sobrevivem** a reset |
| Char novo | **Sem** equip |

---

## Contagem

| Grupo | Qtd | Nota |
|---|---:|---|
| Slots equipáveis runtime | **7** | weapon · head · armor · ring1 · ring2 · neck · ear |
| Slots extras só no wire | **6** | cape · crown · orb · seal · relic · pet · mount *(crown ≈ head visual)* |
| Bases de nome no drop | **12** | `ItemFactory.NAMES` |
| Itens nomeados na loja (equip) | **8** | sem materiais |
| Níveis de refine | **0–10** | `refine.maxLevel` |
| Raridades | **5** | Comum…Lendário |
| Tiers por faixa de nível | **0 fechados** | TBD — não inventar curva (E4/I7) |
| Req. classe no código | **0** | `EquipmentService.equip` **não** checa classe |

---

## Legenda de status

| Status | Significado |
|---|---|
| `runtime` | Slot/serviço no jogo |
| `wire-extra` | Slot só no protótipo visual |
| `grill` | Regra do grill; código ainda não espelha |
| `provisorio` | Número de balance provisório |
| `tbd` | Precisa decisão / tabela |

---

## Slots canônicos (7)

Colunas: slot | label UI | papel | req. classe (grill) | status

| slot | label UI | papel | req. classe (grill) | status |
|---|---|---|---|---|
| `weapon` | Arma | ATK + alcance/intervalo do básico | **livre** | runtime · grill |
| `head` | Cabeça | DEF / vida | **por classe** | runtime · grill *(código sem gate)* |
| `armor` | Armadura | DEF / vida | **por classe** | runtime · grill *(código sem gate)* |
| `ring1` | Anel 1 | utilidade / ATK-DEF | tbd | runtime |
| `ring2` | Anel 2 | utilidade / ATK-DEF | tbd | runtime |
| `neck` | Colar | utilidade | tbd | runtime |
| `ear` | Brinco | utilidade | tbd | runtime |

Wire ainda mostra capa / orbe / selo / relíquia / pet / montaria — **fora** do canônico I7 até o grill mudar “como está na UI”. Hoje o runtime `EquipmentService` **não** conhece esses slots.

---

## Catálogo de bases (drop + loja)

### Armas (livres)

| id / nome | alcance | intervalo | fonte | status |
|---|---:|---:|---|---|
| Espada Curta (`espada_curta` loja) | 2.2 | 0.85 | `COMBAT_BALANCE.weapon.byName` | runtime · provisorio |
| Machado Leve (`machado_leve`) | 2.0 | 0.95 | idem | runtime · provisorio |
| Cajado Rústico | 2.8 | 1.05 | só drop `ItemFactory` | runtime · provisorio |
| Arco Curto | 5.5 | 1.15 | drop (+ wire mock) | runtime · provisorio |

Sem req. de classe no código. Visual de arma no mesh (`WeaponRig`) ainda segue **default por classe** (I10) — distinto da regra “arma livre” de item.

### Cabeça / armadura (por classe — regra grill)

| id / nome | slot | req. classe código | req. classe grill | status |
|---|---|---|---|---|
| Capacete (`capacete`) | head | nenhuma | **TK/FM/BM/HT específicos TBD** | runtime · grill gap |
| Touca de Couro | head | nenhuma | TBD por classe | runtime drop |
| Armadura Leve (`armadura_leve`) | armor | nenhuma | TBD por classe | runtime · grill gap |
| Túnica | armor | nenhuma | TBD por classe | runtime drop |

**Tabela 4 classes × peças de armadura/cabeça por tier:** **tbd** — não inventar nomes nem stats aqui. Delivery C10/C11 deve consumir esta lista quando Felipe fechar.

### Acessórios

| id / nome | slot | raridade loja | status |
|---|---|---|---|
| Anel de Cobre (`anel_cobre`) | ring1 | Comum | runtime |
| Anel de Ferro (`anel_ferro`) | ring2 | Incomum | runtime |
| Colar Simples (`colar_simples`) | neck | Comum | runtime |
| Brinco de Osso (`brinco_osso`) | ear | Comum | runtime |

Drop gera o mesmo nome com prefixo de raridade e `defId` `{slot}_{raridade}`.

---

## Raridade e stats (provisório)

| Raridade | peso drop | sellValue base | `equipBaseStat(level, ri)` |
|---|---:|---:|---|
| Comum | 50 | 5 | `1 + floor(level/8) + 0` |
| Incomum | 28 | 12 | +1 |
| Raro | 14 | 28 | +2 |
| Épico | 6 | 60 | +3 |
| Lendário | 2 | 120 | +4 |

- Arma: `attackBonus = base * weaponAttackMultiplier (2)`; DEF 0.  
- Não-arma: `defenseBonus = base + rarityIndex`; ATK = base.  
Fonte: `economy.ts` — **provisório**.

---

## Refine

| Nível alvo | Chance sucesso | Ouro | Material |
|---:|---:|---:|---|
| +1 | 100% | 10 | Ori (`mat_ori`) |
| +2 | 100% | 20 | Ori |
| +3 | 95% | 40 | Ori |
| +4 | 90% | 70 | Ori |
| +5 | 85% | 110 | Ori |
| +6 | 75% | 160 | **Lac** (`mat_lac`) |
| +7 | 65% | 230 | Lac |
| +8 | 55% | 320 | Lac |
| +9 | 45% | 430 | Lac |
| +10 | 35% | 560 | Lac |

Código hoje (`RefinementService`): falha **só** consome ouro+material; **não** quebra o item. Grill pede quebra em **algumas** falhas → gap I7/C10.

Sucesso: `refine++` e +1 ATK + +1 DEF no instance.

---

## Tiers por faixa de nível

| Faixa Mortal (E4b) | Tier equip | Status |
|---|---|---|
| 1–40 (D1) | TBD | tbd — não inventar |
| 35–90 (D2) | TBD | tbd |
| … | … | tbd |
| 350–400 (D8) | TBD | tbd |

`fluxo-mortal-1-400.md` já aponta I7 como dono desta curva.

---

## Compositor × equip

Fórmula canônica: **C7d** [`compositor-formulas.md`](compositor-formulas.md) (`compose_plus7_lac` → item **+7**). Wire `+10` / `+12` / `Anct` / `Jewels` = rótulos sem receita. Delivery = **C7i**.

---

## Pendências

1. Gate de **armadura/cabeça por classe** em `EquipmentService` (e dados por peça).  
2. Tabela de **tiers** por faixa (com Felipe).  
3. Regra de **quebra no refine** (quais +N).  
4. Alinhar paperdoll wire aos **7** slots canônicos (ou atualizar grill se UI ganhar slots).  
5. Ícone por peça (C11) — placeholders SVG em `items/*.svg` (arte final TBD).

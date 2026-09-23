# Compositor — fórmulas (C7d)

Documento de discovery. Depois de ler isto, dá para implementar **C7i** sem reinventar a primeira receita. **Não** implementa composição.

**Fontes:** `DECISOES-DESIGN.md` (COMPOSITOR e QUESTS · ITENS) · GDD `11` / NPCs `14` · I6 / I7 · wire `03-wire-paineis-cidade.html` · `npc-composer`.  
**Conflito GDD × grill:** grill vence.

---

## Regra canônica (grill)

| Tópico | Regra |
|---|---|
| Papel | Combinar itens/materiais → equip ou consumível melhor |
| Primeira fórmula | **Item +7** = **Poeira de Lac** + **1.000.000** ouro; **50%** de falha |
| Falha (geral) | **Depende da receita** — cada fórmula define o que a falha faz |
| NPC | `npc-composer` → painel `composer` |

---

## Contagem (agora)

| Grupo | Qtd |
|---|---:|
| Fórmulas canônicas grill | **1** (`compose_plus7_lac`) |
| Fórmulas no código | **1** (`compose_plus7_lac` · C7i) |
| Categorias UI wire (rótulo) | **1** aberta (`+7`) + **5** locked |
| Receitas ligadas às categorias wire | **1** (`+7` → `compose_plus7_lac`) |

---

## Legenda de status

| Status | Significado |
|---|---|
| `grill` | Fechado no grill / `DECISOES-DESIGN.md` |
| `provisorio` | Precisa de ok do Felipe antes de travar delivery |
| `wire-only` | Existe só como rótulo de UI |
| `gap-codigo` | Spec pronta; runtime ainda não consome |

---

## Fórmula 1 — `compose_plus7_lac`

| Campo | Valor | Status |
|---|---|---|
| id | `compose_plus7_lac` | grill · C7i |
| Nome UI | Item +7 | grill |
| Categoria UI sugerida | card dedicado **+7** (wire hoje só tem +10 / +12 / Anct / Jewels) | provisório · C7i |
| Entradas | **1×** Poeira de Lac · **1.000.000** ouro · **1** item-alvo (equip) | grill |
| Material canônico (bolsa) | `mat_lac` (I6); loja ainda usa `poeira_lac` — unificar no delivery | gap I6 |
| Item-alvo | Equip em inventário ou paperdoll; **não** consumível | grill · I7 |
| Sucesso (50%) | Mesmo item passa a **refine = 7** (absoluto +7, não “+7 em cima do atual”) | grill · I7 |
| Falha (50%) | **Consome** Poeira de Lac + 1.000.000 ouro; **item-alvo permanece**; **não** aplica +7; **não** quebra o item | provisório · ver abaixo |
| Pré-requisito de refine atual | Item com refine **&lt; 7** elegível; se já ≥7, bloquear composição | provisório |
| Onde gasta ouro | Bolsa do personagem (`inventory.gold`) | grill ECONOMIA |

### Falha desta receita (provisório)

O grill manda: falha **depende da composição**. A primeira fórmula **não** detalhou o efeito além da chance 50%.

**Proposta mínima para C7i (aguarda Felipe):** perde materiais + ouro; item final não sai; base intacta.  
Alinha à opção de grill “Perde materiais; item final não sai”, sem inventar quebra.

Se Felipe quiser quebra / metade de material / item “ruim”, atualizar esta linha **antes** de fechar C7i.

### O que **não** é esta fórmula

| Sistema | Diferença |
|---|---|
| Ferreiro / refine passo a passo | Tabela I7 (+6…+10 com Lac, chances ≠ 50%, custos ≠ 1M) — **outro** sumidouro |
| Categorias wire `+10` / `+12` / `Anct` / `Jewels` | Só rótulos; **sem** receita canônica neste doc |

---

## Catálogo UI (wire hoje)

| id wire | Título | Receita? | Status |
|---|---|---|---|
| `plus10` | +10 | não | wire-only |
| `plus12` | +12 | não | wire-only |
| `anct` | Anct | não | wire-only · ingles-mistura |
| `jewels` | Jewels | não | wire-only · ingles-mistura |
| `locked-a` / `locked-b` | (cadeado) | — | wire-only |

**C7i:** expor `compose_plus7_lac` de verdade (banco + botão Compôr). Categorias extras ficam locked ou só rótulo até novas fórmulas.

---

## Fluxo observável (aceite de C7i — espelho)

1. Clicar no Compositor → painel abre (já existe).  
2. Escolher a receita **Item +7**.  
3. Selecionar item-alvo elegível + ter `mat_lac` ≥1 e ouro ≥ 1.000.000.  
4. Confirmar → 50% sucesso (+7 no item, consome material+ouro) ou 50% falha (efeito da receita).  
5. Sem material/ouro/item → bloqueio + toast; **não** roda chance.  
6. Resultado em pt-BR (sem emoji); UI não mente o save.

---

## Pendências (fora de C7d)

1. Felipe validar efeito de **falha** provisório desta receita.  
2. Unificar `poeira_lac` ↔ `mat_lac` (I6).  
3. Card UI **+7** vs reaproveitar categoria wire.  
4. C7i — serviço + persistência; **não** inventar fórmulas +10/+12/Anct/Jewels sem grill.  
5. Textos `compose.*` (I13) quando a receita rodar.

# Mestre de Quests — spec mínima (C1d)

Documento de discovery. Depois de ler isto, dá para implementar **C1i** (UI + 1 missão) sem inventar o sistema inteiro. **Não** implementa runtime.

**Fontes:** `DECISOES-DESIGN.md` (CIDADE · COMPOSITOR e QUESTS · SAVE · XP) · GDD `14-npcs-e-interacoes.md` · GDD `15-missoes-e-conteudo.md` · `SaveTypes.QuestState` · wire `#p-quest` · `npc-quest`.  
**Conflito GDD × grill:** grill vence (tipos iniciais, recompensa, repetição).

---

## Regra canônica (grill)

| Tópico | Regra |
|---|---|
| NPC | Mestre de quests = **lista de missões com recompensa** |
| Tipos iniciais | **Matar N** · **completar dungeon** · **coletar item** |
| Recompensa | **XP + ouro**; **item raro** em quest de **marco**; itens de quest podem ser **caixa de XP** |
| Repetição | **Diárias** repetem; **história** não |
| Persistência | Save lembra **quests** do personagem |
| Sábio | **Não** entrega quest — só tutorial/códice |

---

## Escopo mínimo (C1d → C1i)

| Entrega | Inclui | Não inclui |
|---|---|---|
| UI | Lista · detalhe · Aceitar · estado ativo/concluída | Diálogo VN, mapa, atalho J |
| Conteúdo | **1** missão história mínima | Cadeia 3–5 passos, diárias, marcos, 12–20 quests do GDD |
| Tracking | `progress.quests[id]` no save | Editor de quests, eventos |

GDD `15` pede 12–20 quests no lançamento — **fora** deste mínimo; só referência de volume futuro.

---

## Contagem (agora)

| Grupo | Qtd |
|---|---:|
| Missões canônicas neste doc | **1** (`q_mortal_kill_01`) |
| Painel wire `#p-quest` | Lista · detalhe · Aceitar (C1i) |
| Defs / progresso no código | Catálogo + `QuestService` + save `progress.quests` |

---

## Legenda de status

| Status | Significado |
|---|---|
| `grill` | Fechado no grill |
| `gdd` | Prosa GDD (complementar) |
| `provisorio` | Número/texto aguarda Felipe (não inventar balance) |
| `gap-codigo` | Spec pronta; runtime não consome |
| `wire-vazio` | Painel existe sem conteúdo |

---

## UI mínima (aceite C1i)

Painel solo `#p-quest` (já no wire / `WireUi`), título **Mestre de Quests**.

| Zona | Conteúdo |
|---|---|
| Lista | Uma linha por missão disponível/ativa/feita (mínimo: a missão abaixo) |
| Detalhe | Título · objetivo · progresso · recompensa |
| Ações | **Aceitar** (se disponível) · sem Abandonar no mínimo (história não repete) |
| Vazio | Se nada elegível: mensagem curta pt-BR (sem tutorial) |

### Comportamento

1. Click no `npc-quest` (ou approach C15) → abre `#p-quest`.  
2. Missão **disponível** → Aceitar → status `active` no save.  
3. Objetivo cumprido → status `done`; recompensa aplicada **uma vez**; save grava.  
4. Missão **done** aparece como concluída; **não** reaceitar (história).  
5. UI lê do save — **não** mente.

Layout: moldura ferro + cantos ouro; botões retângulo; sem emoji; pt-BR com acentos.

---

## Modelo de dados (mínimo)

Save já tem:

```text
progress.quests: Record<string, { status: "locked" | "active" | "done"; step?: number }>
```

| Campo def (dados) | Uso |
|---|---|
| `id` | chave em `progress.quests` |
| `kind` | `kill` \| `dungeon_clear` \| `collect` |
| `title` / `objective` | UI |
| `target` | N kills / `dungeonId` / `itemId` |
| `reward` | `{ xp, gold, itemId? }` |
| `repeat` | `story` \| `daily` — mínimo só `story` |

`locked` = pré-requisito futuro (nível/outra quest); no mínimo a missão 1 nasce **disponível** (sem entrada em quests = disponível, ou seed `locked` só se Felipe pedir gate).

---

## Missão mínima 1 — `q_mortal_kill_01`

Tipo grill: **matar N**.

| Campo | Valor | Status |
|---|---|---|
| id | `q_mortal_kill_01` | spec |
| kind | `kill` | grill |
| Título | Primeiros passos | provisório · copy |
| Objetivo UI | Derrotar inimigos na dungeon | provisório · copy |
| Alvo | **N = 10** kills em **qualquer** dungeon (conta kill com XP) | provisório |
| Pré-requisito | Nenhum (nível 1) | provisório |
| repeat | `story` (não repete) | grill |
| Recompensa XP | **provisório — TBD Felipe** (não inventar curva) | provisório |
| Recompensa ouro | **provisório — TBD Felipe** | provisório |
| Item | nenhum nesta missão (item raro = marco) | grill |
| Progresso | `step` = kills acumulados enquanto `active` | gap-codigo |
| Conclusão | `step >= N` → `done` + aplica reward + save | gap-codigo |

### Por que esta e não “completar D1”

Matar N exercita o loop de farm (grill XP = matar + quests) com uma UI de progresso numérica. Completar dungeon e coletar item ficam como **tipos reservados** para o próximo lote — sem bloquear C1i.

### Números provisórios

N=10 é **só** gancho de aceite. XP/ouro **não** inventados: C1i pode usar placeholders **marcados provisório** no código/dados até Felipe fechar, ou pagar **0/0** só para provar o fluxo de status (preferível se o placeholder mentir a economia).

---

## Tipos reservados (não implementar em C1i)

| kind | Exemplo futuro | Fonte |
|---|---|---|
| `dungeon_clear` | Completar D1 uma vez | grill · GDD 15 |
| `collect` | Trazer 1× `mat_ori` / selo | grill · GDD 15 |
| falar NPC / refine +N / reset | GDD 15 | gdd · fora do mínimo grill |

Diárias: regra grill existe; **zero** diária no mínimo C1i.

---

## GDD 14 / 15 — o que vale no mínimo

| Fonte | Mantém | Adia |
|---|---|---|
| GDD 14 | NPC Mestre de Quests; interação abre UI; diálogo curto opcional | Nomes próprios longos |
| GDD 15 | Quests complementam farm; tipos matar/dungeon/item | Cadeias 3–5; 12–20 quests; eventos; livro de skill em marco |

---

## Fluxo observável (aceite C1i)

1. Na cidade, abrir Mestre de Quests → vê **Primeiros passos** (ou título aprovado).  
2. Aceitar → missão ativa no save.  
3. Entrar em dungeon, matar até N → ao cumprir, recompensa (mesmo que 0/0 provisório) + `done`.  
4. Reabrir painel → missão concluída; não reaceita.  
5. Reload cidade → estado da quest **igual** ao save.

---

## Pendências (fora de C1d)

1. Felipe validar copy + N + XP/ouro (ou ok para 0/0 no primeiro delivery).  
2. C1i — lista UI + aceitar + tracking de kill + reward + save.  
3. Textos `quests.*` (I13).  
4. Missões 2+ / diárias / marcos (volume GDD 15).  
5. Mesh real do NPC (C23) — fora do aceite de quest.

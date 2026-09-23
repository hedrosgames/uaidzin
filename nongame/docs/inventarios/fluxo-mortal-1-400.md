# Fluxo Mortal 1–400 — E4b

**Status:** COMPLETO para aprovação — **Aguardando Felipe**.  
**Escopo:** só **Mortal** (1–400). Arch/Cele = estrutura (GDD `05` / `28`); **fora** do conteúdo de lançamento.  
**Origem:** E4a rascunho fechado neste ID.

**Fontes:** `DECISOES-DESIGN.md` (PROGRESSÃO · RESET · SKILLS · DUNGEONS · SAVE · QUESTS) · GDD `05` · GDD `28` · `dungeons-mortal.ts` · I3 · I6 · I7 · I8 · D11 (`save-load.md`) · C1d.  
**Conflito GDD × grill:** grill vence.  
**Números:** sem inventar balance. `provisório` = código/grill “ajusta jogando”; `TBD` = falta id/valor do Felipe.

---

## Princípio

```text
Farm (dungeon 10 min) → XP/ouro/itens → attrs + skills + equip
  → dungeon mais alta → (opcional) reset Mortal → +1000 pts attr
  → nível 400 + item de evolução → Arch (pós-lançamento)
```

Reset **dentro** de Mortal: volta ao nível 1 da evolução; **não** cai de etapa. Contagem de resets **zera ao evoluir**.

---

## 1. Marcos de nível (visão jogador)

| Marco | O que o jogador sente | Fonte | Estado |
|---|---|---|---|
| **1** | Create: attrs **5/5/5/5**, **0 ouro**, sem equip, skills zeradas | grill | fechado |
| **≤ 5** | **Primeira skill** aprendível | grill PROGRESSÃO | fechado |
| **Faixas D1–D8** | Nova dungeon por faixa; UI **min/max** | grill + `DUNGEONS_MORTAL` | faixas provisórias |
| **Sensação de força** | Contínua 1–400; **sem** marco obrigatório extra | grill | fechado |
| **Antes do 400** | Sábio / mestre explica **reset** (codex) | grill | fechado (texto) |
| **Reset (ciclo)** | Volta nv 1; +**1.000** attr; custo **ouro + item** | grill | efeito fechado; **custo TBD** |
| **400** | Teto Mortal; Arch = **400 + item de evolução** | grill | item **TBD** (I6 gap) |

### Pontos e XP

| Regra | Canônico (grill) | Código hoje | Ação delivery |
|---|---|---|---|
| Attr / nível | **5** | `baseAttributes` legado 10/10/10/10 em pontos | alinhar ao grill |
| Skill / nível | **2** | `pointsPerLevel = 1` | alinhar ao grill |
| XP→nível | Felipe ajusta jogando | `xpToLevel = 40 + level * 18` | **provisório** |

---

## 2. Unlocks — dungeons (D1–D8)

**Gate jogável:** nível na faixa **min–max** (`dungeonsAllowedForLevel`).  
**Save:** `progress.dungeonsUnlocked[]` + `dungeonClears`.

### Semântica proposta (E4b → Felipe)

| Campo | Uso proposto | Alternativa descartada neste doc |
|---|---|---|
| Gate de entrada | **Só nível** (já no runtime) | Flag obrigatória para entrar |
| `dungeonsUnlocked` | Espelho / UI “já visitou” + quests de marco; **não** bloqueia entrada sozinho | Substituir o gate de nível |
| `dungeonClears` | Contagem / quest “completar dungeon” | — |

### Faixas (`DUNGEONS_MORTAL` — provisório)

| ID | Nome código | Nome diegético (I8 · provisório) | Faixa | Entrada | Papel |
|---|---|---|---|---|---|
| D1 | `dungeon-1` | Campo de Treino | **1–40** | — | Tutorial de farm (muito fácil / `d1Ease`) |
| D2 | `dungeon-2` | Cemitério de Cinzas | **35–90** | — | Transição |
| D3 | `dungeon-3` | Jardim | **80–150** | — | — |
| D4 | `dungeon-4` | Santuário | **140–220** | `entry_d4` | Gate item |
| D5 | `dungeon-5` | Forja de Kaizen | **200–280** | `entry_d5` | Gate item |
| D6 | `dungeon-6` | Ninho da Hydra | **260–330** | `entry_d6` | Gate item |
| D7 | `dungeon-7` | Clareira Élfica | **310–370** | `entry_d7` | Gate item |
| D8 | `dungeon-8` | Deserto de Ossos | **350–400** | `entry_d8` | Teto Mortal |

Sobreposição intencional (ex.: 35–40 = D1∪D2). Tempo de run: **10:00**. Entrada: Guarda → lista → confirmação → **consome** item (D4–D8). Detalhe LD/spawns: I8 · I4.

---

## 3. Unlocks — skills

| Tópico | Regra | Fonte | Estado |
|---|---|---|---|
| Primeira skill | Até **nível 5** | grill | fechado |
| Árvores | 3 × 8 + livros; **1** 8ª por char | I3 / I10 | fechado |
| Barra | **10** slots (grill) | grill × código 4 | gap delivery |
| Gate na árvore | Sequencial (anterior ≥1); **sem** req de nível por skill | `SkillTreeService` | fechado neste fluxo |
| Tabela skill ↔ nível | **Não há** além do marco ≤5 | E4b | fechado (sem inventar) |
| Cap nível skill | 10 | código | provisório |
| Reset × skills | Default: **zera** skills/pontos do ciclo | grill SKILL-5 / GDD | **proposta** até Felipe fechar SKILL-5 |

---

## 4. Unlocks — equipamento / economia

| Tópico | Regra | Fonte | Estado |
|---|---|---|---|
| Create | Sem equip | grill | fechado |
| Slots | 7 | GDD / grill | fechado |
| Classe | Arma livre; armadura por classe | grill | fechado (gate código = I7) |
| Após reset | Equip + refine **permanecem** | grill | fechado |
| Tiers por faixa | Curva em I7 | I7 | **TBD** (não inventar aqui) |
| Refino | +N; falha perde mat; algumas quebram | grill | regra aberta nos +N |
| Compositor | +7 = Lac + **1.000.000** ouro; 50% falha | C7d | fechado |
| Escala inimigo | HP/dano sobem com faixa da dungeon | grill · I4 | D1 ease só hoje |

---

## 5. Unlocks — reset e evolução

| Evento | Condição | Efeito | Estado |
|---|---|---|---|
| Reset Mortal | Ouro + item (**valores TBD**); nível mín. **TBD** | Nv → 1; attrs/skills do ciclo conforme SKILL-5; +**1.000** bonus attr; equip/inv intactos | efeito parcial fechado |
| Contagem | `resetsInEvolution`; zera ao evoluir | — | fechado |
| Tutorial reset | Sábio / mestre **antes do 400** | Só texto | fechado |
| Mortal → Arch | Nv **400** + item evolução | Nova etapa; reset count zera | item id **TBD** (`item_evolucao_arch` proposta de nome só) |
| Arch / Cele | GDD `28` | Fora do lançamento | fora de escopo |

**Proposta de ids (sem balance):** `item_reset_mortal` · `item_evolucao_arch` — entram em I6 quando Felipe nomear; **não** criar no catálogo neste ID.

---

## 6. Quests de marco (amarradas às faixas)

Tipos grill: matar N · completar dungeon · coletar item. Recompensa marco: **item raro** / **caixa de XP** possível.

| Faixa | Marco sugerido (conteúdo) | Status |
|---|---|---|
| 1–5 | Tutorial farm + 1ª skill; `q_mortal_kill_01` (C1) | mínimo existe |
| 6–40 | Completar D1 / coletar mat Ori | **TBD** conteúdo |
| 35–90 | Primeira visita D2 | TBD |
| 80–150 | Clear D3 | TBD |
| 140–220 | Primeiro selo D4 | TBD |
| 200–280 | Introducão ao **reset** (texto + opcional quest) | TBD |
| 260–370 | Clears D6–D7 | TBD |
| 350–400 | Prep evolução (texto sábio + item evolução quando existir) | TBD item |

Volume GDD 12–20 quests = pós C1; **não** inventar lista completa aqui.

---

## 7. Save por faixa (ótica de progressão)

Contrato: D11 + `22-saves-e-dados.md`. Posição **nunca** grava. Em run: flush a cada kill (D12).

### Sempre (qualquer nível Mortal)

| Campo | Conteúdo |
|---|---|
| `character.*` | nome, classe, level, evolution=`Mortal`, xp, attrs, unspent, resets, bonusAttr, hp/mp |
| `skills.*` / `skillLoadout` | levels, 8ª, spec, pontos, barra |
| `equipment` / `inventory` / `bags` | equip, ouro, itens, bolsas |
| `progress` | `dungeonsUnlocked`, `dungeonClears`, `quests` |
| Conta | baú + summaries de slot |

### Matriz por faixa

| Faixa | Dungeons tipicamente elegíveis | Save que “importa” | Unlock de design |
|---|---|---|---|
| **1–5** | D1 | seed create; 1ª skill/attr; quest inicial | 1ª skill ≤5 |
| **6–40** | D1 (D2 ≥35) | clears D1; ouro/equip iniciais | farm base |
| **35–90** | D1∪D2 → D2 | unlock/clears D2 | 2ª dungeon |
| **80–150** | D2∪D3 → D3 | clears D3 | 3ª |
| **140–220** | D3∪D4 → D4 | clears D4; selo `entry_d4` | 4ª + item entrada |
| **200–280** | D4∪D5 → D5 | clears D5; possível 1º **reset** | 5ª · reset opcional |
| **260–330** | D5∪D6 → D6 | clears D6; `resetsInEvolution` / bonus se resetou | 6ª |
| **310–370** | D6∪D7 → D7 | clears D7; tutorial reset no sábio | 7ª · prep 400 |
| **350–400** | D7∪D8 → D8 | clears D8; item evolução (**TBD**); teto | 8ª · gate Arch |

---

## 8. Checklist de aprovação (Felipe)

Marcar ao validar; não fechar DoD G6 sem isto.

- [ ] Faixas D1–D8 (números) ok ou lista de ajustes
- [ ] Semântica `dungeonsUnlocked` (proposta §2) ok
- [ ] SKILL-5: reset **zera** skills (default) — sim / não
- [ ] Custo reset (ouro + item) — valores ou “ainda TBD”
- [ ] Id/nome item evolução Mortal→Arch
- [ ] Tiers de equip por faixa — delegar a I7 ou fechar números
- [ ] Quests de marco — volume mínimo aceitável pós-C1
- [ ] Curva XP provisória — manter até jogar / trocar já

---

## 9. Gaps abertos (não inventar)

1. Valores de ouro/item do **reset**.  
2. Id final do **item de evolução**.  
3. Tiers de equip (I7).  
4. Conteúdo das quests de marco além de `q_mortal_kill_01`.  
5. Alinhar código: 5 attr / 2 skill / barra 10.  
6. Nomes diegéticos finais D1–D8 (hoje I8 provisório).  
7. Escala HP/dano por dungeon além de D1 (I4 / balance).

---

## Como manter

- Mudou faixa em `dungeons-mortal.ts` → tabelas §2 e §7.  
- Felipe fechou TBD → tirar da §9 e do checklist §8.  
- Aprovado → checklist 5.4 `[x]` (após validação humana); grill E4b `[x]`.

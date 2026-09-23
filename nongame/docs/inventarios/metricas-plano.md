# Plano — planilha + dashboard de progressão — E3

**Status:** COMPLETO para aprovação — **Aguardando Felipe**.  
**Escopo:** definir métricas, fontes e layout. **Não** implementar dashboard (E3b bloqueado até este plano + dado real).

**Fontes:** E4b · D11 (`save-load.md`) · `SaveTypes` / `SaveVault` · grill PROGRESSÃO · inventários I8/I4.  
**Conflito GDD × grill:** grill vence.  
**Números:** métricas **observam** o jogo; não inventam curva nova.

---

## Objetivo

1. **Planilha** (Google Sheets / Excel / CSV versionado) — modelo de progressão 1–400 para balance à mão.  
2. **Dashboard** (HTML local ou página em `game/tools/`) — lê **save/log real** e mostra ≥1 métrica viva (DoD E3b).

---

## Audiência

| Quem | Usa |
|---|---|
| Felipe | Ajustar faixas, XP, drops, resets “jogando” |
| Dev | Ver se save/flush (D12) e gates batem com o doc |
| Editor (E2) | Conferir se defs exportadas batem com curva da planilha |

---

## Métricas (catálogo)

### A — Progressão do personagem (por slot / save)

| Id | Métrica | Fonte | Granularidade |
|---|---|---|---|
| `m.level` | Nível atual | `character.level` | snapshot |
| `m.xp` | XP atual | `character.xp` | snapshot |
| `m.evolution` | Mortal/Arch/Cele | `character.evolution` | snapshot |
| `m.resets` | Resets na evolução | `character.resetsInEvolution` | snapshot |
| `m.bonus_attr` | Pontos bônus de reset | `character.bonusAttributePoints` | snapshot |
| `m.attrs` | FOR/DES/CONS/INT + unspent | attrs | snapshot |
| `m.skill_points` | Pontos / levels / 8ª | `skills.*` | snapshot |
| `m.gold_pocket` | Ouro bolso | inventory | snapshot |
| `m.gold_vault` | Ouro baú conta | account vault | snapshot |
| `m.dungeons_unlocked` | Lista | `progress.dungeonsUnlocked` | snapshot |
| `m.dungeon_clears` | Clears por id | `progress.dungeonClears` | snapshot |
| `m.quests` | Estados | `progress.quests` | snapshot |
| `m.equip_power` | Soma refine / raridade (derivada) | equipment | derivada |

### B — Sessão / run (precisa log — hoje parcial)

| Id | Métrica | Fonte proposta | Estado |
|---|---|---|---|
| `m.run_kills` | Kills na run | log runtime / `__UAIDZIN__` | **gap** — instrumentar em E3b |
| `m.run_xp` | XP ganho na run | delta save ou log | gap |
| `m.run_gold` | Ouro ganho na run | idem | gap |
| `m.run_drops` | Itens dropados | drop-log UI já existe | parcial (D6) |
| `m.run_duration` | Tempo até saída/morte | timer dungeon | gap export |
| `m.deaths` | Mortes (contador) | log / progress | gap |

### C — Curva de design (planilha, não save)

| Id | Métrica | Fonte | Nota |
|---|---|---|---|
| `c.xp_to_level` | XP necessário por nível | fórmula / tabela | hoje `40+18*L` provisório |
| `c.dungeon_band` | Faixa D1–D8 | E4b / I8 | |
| `c.enemy_scale` | Mult HP/ATK por dungeon | balance | D1 ease só |
| `c.expected_gold_10m` | Ouro esperado / 10 min | modelo | **provisório** até telemetria |
| `c.reset_payback` | Níveis até “valer” o reset | modelo | depende custo TBD |

---

## Fontes de dados

| Fonte | O que entrega | Como o dashboard lê (proposta) |
|---|---|---|
| **SaveVault / LS** | Snapshot personagem + conta | `__UAIDZIN__.save` / export JSON / file picker do blob |
| **Drop log** | Drops da sessão | `__UAIDZIN__.getDropLog()` (já) |
| **DebugApi** | Hooks de lab | estender só o necessário em E3b |
| **CSV planilha** | Curva teórica 1–400 | import estático no dashboard (comparar teórico × real) |
| **Telemetry server** | — | **fora** do MVP |

**Privacidade:** só dados locais do lab (`admin`); sem upload.

---

## Planilha — abas propostas

| Aba | Colunas mínimas | Papel |
|---|---|---|
| `niveis` | level, xp_to_next, xp_cum, attr_pts_cum, skill_pts_cum | curva teórica |
| `dungeons` | id, min, max, entry, ease, notes | espelho E4b/I8 |
| `reset` | custo_ouro, custo_item, bonus_attr, payback_niveis | TBD até Felipe |
| `sessao_10m` | dungeon, kills_est, xp_est, gold_est | modelo farm |
| `checklist_aprov` | perguntas E4b §8 | tracking humano |

Arquivo sugerido (quando existir): `docs/inventarios/progressao-mortal-1-400.csv` ou link Sheets anotado no INDEX — **não** criar números inventados neste plano.

---

## Dashboard — layout MVP (E3b)

Uma página local, uma composição:

1. **Seletor** — userId + slot (ou colar JSON de save).  
2. **KPI strip** — nível · XP · ouro · resets · clears D1–D8 (contagem).  
3. **Painel progresso** — barra 1–400 + dungeons elegíveis agora (faixa).  
4. **Comparativo** — “teórico da planilha” vs “save atual” (1 métrica basta no DoD: ex. **nível + XP** ou **clears por dungeon**).  
5. **Log curto** — últimos N drops se `getDropLog` disponível.

**Primeira métrica real sugerida (E3b):** `m.level` + `m.xp` lidos do save ativo via debug/export — zero telemetria nova se o save já flusha (D12).

---

## Dependências

| Depende | Motivo |
|---|---|
| D11 / D11b | saber o que o save guarda |
| E4b | faixas e marcos para eixos do chart |
| E3 aprovado | libera E3b |

| Bloqueia | Até |
|---|---|
| E3b | este plano aprovado **e** ≥1 leitura real de save/log |

---

## Fora de escopo E3

- Implementar editor (E2).  
- Servidor de analytics.  
- Balance automático a partir do dashboard.

---

## Checklist de aprovação (Felipe)

- [ ] Catálogo A/B/C ok (cortar o que for ruído)  
- [ ] MVP dashboard = save local (+ drop log opcional)  
- [ ] Primeira métrica real: nível/XP (proposta) ou outra  
- [ ] Planilha: CSV no repo vs Sheets externo  
- [ ] Instrumentação extra de run (kills/tempo) — agora ou depois

---

## Como manter

- Novo campo no save → linha em métricas A + D11.  
- Mudou faixa dungeon → aba `dungeons` + E4b.  
- Aprovado → E3b sai de Bloqueado; checklist 5.3.

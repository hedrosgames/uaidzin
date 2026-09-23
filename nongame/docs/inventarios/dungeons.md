# Dungeons — inventário I8

Documento de discovery. Depois de ler isto, dá para saber **D1–D8: faixa, entrada, inimigos, tempo, LD**, sem abrir o código.

**Escopo varrido:** `dungeons-mortal.ts` · `dungeon-definitions.ts` · `balance/dungeon.ts` · `CityWorld.buildTestDungeonWorld` · `CityGameSession` · `PLAN-assets-cenario-dungeons.md` · GDD `10` · `DECISOES-DESIGN.md` · E4a (`fluxo-mortal-1-400.md`).  
**Conflito GDD × grill:** grill / código mortal vencem; nomes diegéticos do plano de assets são **provisórios** até Felipe fechar.

**Legenda de status (LD / arte)**

| Status | Significado |
|---|---|
| `final` | LD + assets no padrão alvo |
| `placeholder` | Jogável com greybox / dados genéricos |
| `falta` | Dados ou arte ainda não existem |

---

## Resumo

| Peça | Estado |
|---|---|
| 8 defs Mortal em código | `placeholder` (nome genérico `Dungeon N`) |
| Faixas nível + entry D4–D8 | alinhado ao grill / E4a |
| Layout arenas | 3 arenas × template (intro/ranged/chase/dense) | `placeholder` |
| Mundo 3D por dungeon | **um** greybox (`buildTestDungeonWorld`) para todas | `placeholder` |
| Props/chão por bioma | 0 em disco (`models/dungeons/` inexistente) | `falta` → **D13b bloqueado** (D13a = greybox D1 só) |
| Inimigos nomeados | só arquétipos `fixed`/`chaser`/`ranged` (+ boss flag) | `placeholder` — ver I4 |
| Tempo | 600 s (10 min) todas | provisório balance |

---

## 1. D1–D8 (runtime `DUNGEONS_MORTAL`)

| # | Id | Nome código | Nome diegético (plano arte · provisório) | Bioma plano | Nível | Entrada | Arenas | Layout | Ease | LD / arte |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `dungeon-1` | Dungeon 1 | Campo de Treino | `campo` | 1–40 | — | 3 | `arenasIntro` | `d1Ease` hp×0.45 atk×0.4 def×0.5 | placeholder / falta props |
| 2 | `dungeon-2` | Dungeon 2 | Cemitério de Cinzas | `cemiterio` | 35–90 | — | 3 | `arenasRanged` | — | bloqueado D13b — sem assets |
| 3 | `dungeon-3` | Dungeon 3 | Jardim | `jardim` | 80–150 | — | 3 | `arenasChase` | — | bloqueado D13b — sem assets |
| 4 | `dungeon-4` | Dungeon 4 | Santuário (kit jardim+) | `jardim` | 140–220 | `entry_d4` | 3 | `arenasDense` | — | bloqueado D13b — sem assets |
| 5 | `dungeon-5` | Dungeon 5 | Forja de Kaizen | `kaizen` | 200–280 | `entry_d5` | 3 | `arenasRanged` | — | bloqueado D13b — sem assets |
| 6 | `dungeon-6` | Dungeon 6 | Ninho da Hydra | `hydra` | 260–330 | `entry_d6` | 3 | `arenasChase` | — | bloqueado D13b — sem assets |
| 7 | `dungeon-7` | Dungeon 7 | Clareira Élfica | `elfo` | 310–370 | `entry_d7` | 3 | `arenasDense` | — | bloqueado D13b — sem assets |
| 8 | `dungeon-8` | Dungeon 8 | Deserto de Ossos | `deserto` | 350–400 | `entry_d8` | 3 | `arenasChase` | — | bloqueado D13b — sem assets |

`durationSeconds`: **600** em todas (`DUNGEON_BALANCE.defaultDurationSeconds`).

Sobreposição de faixa intencional (ex.: 35–40 = D1∪D2) — ver E4a.

---

## 2. Spawns por layout (arquétipos, não monstro nomeado)

Contagens típicas (3 arenas; boss = `isBoss` no último spawn da A3):

| Layout | A1 | A2 | A3 (boss) | Usado em |
|---|---|---|---|---|
| `arenasIntro` | 2 fixed | 1 fixed + 1 ranged | 1 chaser + 1 fixed boss | D1 |
| `arenasRanged` | 2 ranged + 1 fixed | 2 ranged + 1 chaser + 1 fixed | 2 ranged + 1 fixed boss | D2, D5 |
| `arenasChase` | 2 chaser + 1 fixed | 2 chaser + 1 ranged | 2 chaser + 1 fixed boss | D3, D6, D8 |
| `arenasDense` | 2 fixed + 2 chaser | 1 fixed + 2 ranged + 1 chaser | 1 chaser + 1 ranged + 1 fixed boss | D4, D7 |

Boss balance: `DUNGEON_BALANCE.boss` (hp×4, atk×1.6, …). XP/kill em `xpPerKill`.

Detalhe de inimigos / drops / AI = **I4** [`inimigos.md`](inimigos.md).

---

## 3. Mundo 3D atual (todas as Mortal)

| Elemento | Implementação | Status |
|---|---|---|
| Função | `buildTestDungeonWorld()` | placeholder único |
| Chão | Plane cor sólida + GridHelper | placeholder |
| Paredes | Box laterais | placeholder |
| Arenas | Discos cilindro + PointLight | placeholder |
| Corredores | Box entre arenas | placeholder |
| Brasas | 8× `createBrazier` | placeholder |
| Saída | `PortalVfx` interativo | placeholder |
| Props bioma | — | **falta** |

Entrada de run: sessão resolve `findDungeon(id)` para **spawns/dados**; mesh continua o greybox de teste (`world.id` / path ainda amarra `dungeon-test` em pontos do fluxo — ver código sessão).

---

## 4. Extra: `DUNGEON_TEST`

| Campo | Valor | Status |
|---|---|---|
| Id | `dungeon-test` | debug / lab |
| Nome | Dungeon de Teste | — |
| Nível | 1–20 | GDD protótipo |
| Arenas | 3 (mais densas que intro) | placeholder |
| Entrada | nenhuma | — |

---

## 5. Gaps → D13 (e vizinhos)

| Gap | Impacto |
|---|---|
| Pasta `game/public/models/dungeons/` inexistente | **D13a** = greybox D1 `campo` (props cidade + chão procedural); **D13b bloqueado** |
| Um greybox para D1–D8 | LD “cada dungeon diferente” (grill) **não** cumprido visualmente; não inventar 7 biomas de arte |
| Nomes código `Dungeon N` | UI cards usam id/nome genérico; diegésis só no plano arte |
| Inimigos = arquétipo | **C24** + I4 para mesh/nome de monstro |
| Sem BGM/bioma look dedicado | I11 · I12 · D13 luz |

**D13b:** sem assets de bioma em disco (cemitério/jardim/kaizen/hydra/elfo/deserto). Depende de arte pós-D13a. Prioridade quando houver pasta: Campo → Cemitério → Kaizen → Deserto → Jardim → Hydra → Elfo.

---

## Fontes

- `game/src/data/dungeons/dungeons-mortal.ts`
- `game/src/data/dungeons/dungeon-definitions.ts`
- `game/src/data/balance/dungeon.ts`
- `game/src/world/CityWorld.ts` (`buildTestDungeonWorld`)
- `PLAN-assets-cenario-dungeons.md`
- `docs/inventarios/fluxo-mortal-1-400.md` (E4b)
- `docs/inventarios/inimigos.md` (I4)

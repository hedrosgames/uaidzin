# Inimigos — inventário I4

Documento de discovery. Depois de ler isto, dá para listar **arquétipos, role (comum/boss), dungeon, AI, HP/dano, drops** sem abrir o código.

**Escopo varrido:** `balance/combat.ts` · `balance/dungeon.ts` · `balance/economy.ts` · `EnemyService` · `EnemyAI` · `EnemyRuntimeView` · `dungeon-definitions.ts` · `EconomyService.grantKillLoot` · grill INIMIGOS · I8.  
**Conflito GDD × grill:** grill vence.  
**Números:** stats = **provisório** (código); escala por faixa = grill (só D1 ease implementado).

---

## Regra canônica (grill)

| Tópico | Valor |
|---|---|
| AI | Spawn **fixo** · **perseguidor** (dist. mín.) · **longo alcance** |
| Elite | Mais HP/dano + visual diferente + drop melhor |
| Não podem | Atravessar parede; grudar sem colisão; spawnar em cima de construção |
| HP bar | Verde ≥ 40% / vermelho &lt; 40% |
| Escala | HP/dano/nível sobem com a **faixa da dungeon** |
| Drop | Tabela da **dungeon**; ouro **pode ser zero** (hoje ouro por kill &gt; 0) |

---

## Legenda de status

| Status | Significado |
|---|---|
| `runtime` | Arquétipo jogável |
| `placeholder` | Cápsula / cor; sem GLB nomeado |
| `grill-gap` | Elite nomeado / monstro diegético ainda não modelado |
| `provisorio` | Número de balance aguarda ajuste jogando |
| `falta` | Arte / tabela por monstro |

---

## Contagem

| Grupo | Qtd | Nota |
|---|---:|---|
| Arquétipos AI | **3** | `fixed` · `chaser` · `ranged` |
| Role boss | **flag** `isBoss` | não é 4º arquétipo; mults em `DUNGEON_BALANCE.boss` |
| Elite nomeado | **0** | grill pede; **sem** def |
| Monstros diegéticos | **0** | só ids de spawn (`a1-fixed-1`…) |
| Mesh | **cápsula** | `EnemyRuntimeView` — C24 bloqueado (sem GLB) |

---

## Tabela mestra — arquétipos

| id | papel | AI | maxHp | atk | def | range | interval | move | leash/approach | mesh | status |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| `fixed` | comum | Fica no spawn; leash volta pra home; ataca no range | 40 | 8 | 2 | 1.6 | 1.2 | — | leash 2.5 | cápsula laranja `0xc45c26` | runtime · placeholder · provisório |
| `chaser` | comum | Persegue até `minApproach`; ataca no range | 55 | 10 | 3 | 1.5 | 1.1 | speed 3.2 | minApproach 1.2 | cápsula vermelha `0xe23b3b` | runtime · placeholder · provisório |
| `ranged` | comum | Mantém distância preferida; recua se perto demais | 35 | 9 | 1 | 6 | 1.6 | speed 2.4 | preferred 5 · retreat &lt;2.5 | cápsula roxa `0xc45cff` | runtime · placeholder · provisório |
| `*` + `isBoss` | boss | AI do arquétipo base do spawn | ×4 hp | ×1.6 atk | +4 def | (base) | (base) | (base) | respawn 180 s | mesma cápsula + escala | runtime · placeholder · provisório |

Fonte stats base: `COMBAT_BALANCE.enemy`. Boss: `DUNGEON_BALANCE.boss`.  
Respawn comum: **3–8 s** aleatório. Boss: **180 s**.

### Elite (grill)

| Campo | Estado |
|---|---|
| Def / id | **falta** (`grill-gap`) |
| Regra esperada | Mais HP/dano + visual + drop melhor |
| Código hoje | **não** há flag `isElite` |

---

## Escala por dungeon

| Dungeon | Mult combate | Nota |
|---|---|---|
| D1 | hp×0.45 · atk×0.4 · def×0.5 (`d1Ease`) | provisório grill “muito fácil” |
| D2–D8 | ×1 / ×1 / ×1 | **sem** curva por faixa ainda (gap vs grill “sobe com faixa”) |
| `dungeon-test` | ×1 | lab |

Grill pede escala com faixa → **TBD** delivery (não inventar tabela aqui).

---

## Onde aparecem (por layout — I8)

Boss = último spawn A3 com `isBoss: true` (arquétipo do spawn × mults boss).

| Layout | Comuns (padrão) | Boss A3 | Dungeons |
|---|---|---|---|
| `arenasIntro` | fixed, ranged, chaser | chaser+fixed boss | D1 |
| `arenasRanged` | ranged, fixed, chaser | fixed boss | D2, D5 |
| `arenasChase` | chaser, fixed, ranged | fixed boss | D3, D6, D8 |
| `arenasDense` | fixed, chaser, ranged | fixed boss | D4, D7 |
| `DUNGEON_TEST` | mistura densa | chaser boss | lab |

Ids de spawn = `{arena}-{archetype}-{n}` (ex.: `a3-boss`). **Não** são nomes de monstro.

---

## XP e drops (por kill)

### XP (`DUNGEON_BALANCE.xpPerKill`)

| Key | XP | Status |
|---|---:|---|
| fixed | 8 | provisório |
| chaser | 12 | provisório |
| ranged | 10 | provisório |
| boss | 40 | provisório |

### Ouro (`ECONOMY_BALANCE.goldPerKill`)

| Key | Ouro | Status |
|---|---:|---|
| fixed | 3 | provisório |
| chaser | 4 | provisório |
| ranged | 4 | provisório |
| boss | 25 | provisório |

### Itens (`EconomyService.grantKillLoot`)

| Roll | Chance | Resultado | Nota |
|---|---:|---|---|
| Equip | 0.22 comum / 0.40 boss | `createEquipDrop(lootLevel)` | raridade weighted |
| Material (se falhou equip) | 0.18 | Ori se dungeon ≤4; senão Lac | `oriUntilDungeon: 4` |
| Nada | resto | só ouro | ouro sempre soma hoje |

**Não há** tabela de drop **por monstro nomeado** nem por dungeon além do índice `dungeon-N` → Ori/Lac. Grill “tabela da dungeon” = **parcial**.

Inventário cheio → drop **perdido** (grill).

---

## AI — comportamento observável

| Arquétipo | Comportamento |
|---|---|
| `fixed` | Não persegue; se afastou do home além do leash, volta; ataca se player no range |
| `chaser` | Anda em direção ao player até `minApproach`; ataca no range |
| `ranged` | Se perto demais, recua; se longe demais, aproxima; ataca no range longo |

Colisão com paredes / “não spawnar em construção”: regra grill; enforcement depende do mundo (greybox atual).

---

## Apresentação

| Peça | Implementação | Status |
|---|---|---|
| Mesh | Cápsula `MeshStandardMaterial` | placeholder → **C24** |
| Cor | Por arquétipo | placeholder |
| HP bar | World bar verde/vermelho 40% | grill ok |
| Anim morte | — | falta clip monstro |
| GLB monstro | — | **falta** (bloqueia C24) |

---

## Gaps

1. Monstros **nomeados** por bioma/dungeon (diegése).  
2. Flag / defs de **elite**.  
3. Curva de escala D2–D8 (grill).  
4. Drop table **por dungeon** (não só Ori/Lac + equip procedural).  
5. GLB + bind spawn (C24 · I14).  
6. Editor E2b consome este inventário como schema `EnemyDef`.

---

## Fontes

- `game/src/data/balance/combat.ts`  
- `game/src/data/balance/dungeon.ts`  
- `game/src/data/balance/economy.ts`  
- `game/src/domain/enemies/EnemyAI.ts` · `EnemyService.ts`  
- `game/src/presentation/enemies/EnemyRuntimeView.ts`  
- `game/src/data/dungeons/dungeon-definitions.ts`  
- `docs/inventarios/dungeons.md` (I8)  
- `DECISOES-DESIGN.md` § INIMIGOS

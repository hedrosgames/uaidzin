# Skills — inventário I3

Documento de discovery. Depois de ler isto, dá para listar **todas as skills** (4 classes × 3 árvores × 8 + livros) sem abrir o código.

**Fontes:** GDD `12-skills-builds-e-equipamentos.md` · I10 (`docs/inventarios/classes.md`) · `game/src/data/classes/class-definitions.ts` · `game/src/data/balance/skills.ts` · `SkillLoadout` / `SkillController` · wire `visual/telas/03-wire-paineis-cidade.html` · `DECISOES-DESIGN.md` (SKILLS).  
**Conflito GDD × grill:** o grill vence.

**Catálogo VFX derivado:** `game/vfx/skills-manifest.json` e `game/vfx/uaidzin_skill_catalog.js` são gerados a partir da mesma fonte canônica de skills; a direção visual do catálogo lê `Planos/VFX Skills/`. O catálogo não substitui este inventário de regras.

---

## Regra canônica (grill)

| Tópico | Valor |
|---|---|
| Barra | **10** skills equipáveis |
| Passivas | Existem e **não** vão para a barra |
| Custo | Toda skill de combate gasta **mana** + **cooldown** |
| 8ª skill | **Só 1** das 3 árvores por personagem |
| Pontos / nível | **2** (grill; GDD `12` e `SKILL_BALANCE.pointsPerLevel` ainda dizem 1) |
| Árvores de classe | `controle` · `magia` · `fisica` — 8 skills cada |
| Livros | Árvore comum (`BOOK_SKILLS`); utilidade / passiva |
| Loadout runtime hoje | **4** slots (`SkillLoadout` / save) — **fora do grill 10** |

---

## Contagem

| Grupo | Qtd | Fonte de id |
|---|---:|---|
| Skills de classe (4 × 3 × 8) | **96** | `class-definitions.ts` |
| Destas, 8ª (topo) | 12 ids (1 escolhida / char) | índice 8 de cada árvore |
| Livros no código | **4** | `BOOK_SKILLS` |
| Livros só no GDD `12` (ainda sem id) | **4** | prosa GDD |
| **Total canônico listado** | **100** (+ 4 gaps GDD) | — |
| Wire HT (mock, não canônico) | 3×12 + 12 special | `03-wire-paineis-cidade.html` |

---

## Legenda de status

| Status | Significado |
|---|---|
| `placeholder` | Id + nome no runtime; CD/mult/range gerados; **efeito diegético TBD** |
| `passiva` | Livro / utilidade; fora da barra; sem cast de combate no def |
| `gdd-gap` | Citado no GDD `12`; **sem id no código** |
| `wire-mock` | Só no wire visual (HT fantasia); **não** é contrato de id |

**Custo/CD no código (combate):** MP flat `SKILL_BALANCE.mpCost = 8`. CD base `3 + (i % 4) * 0.5` s (i = 0…7). Mult dano `1.2 + i * 0.15`. Range `2.5 + (i % 3) * 0.3`. Spec reduz CD até 25%. Valores **provisórios**.

| Slot na árvore | CD (s) | Mult | Range |
|---:|---:|---:|---:|
| 1 | 3.0 | 1.20 | 2.5 |
| 2 | 3.5 | 1.35 | 2.8 |
| 3 | 4.0 | 1.50 | 3.1 |
| 4 | 4.5 | 1.65 | 2.5 |
| 5 | 3.0 | 1.80 | 2.8 |
| 6 | 3.5 | 1.95 | 3.1 |
| 7 | 4.0 | 2.10 | 2.5 |
| 8 | 4.5 | 2.25 | 2.8 |

---

## Tabela mestra — classes

Colunas: id | nome | classe | árvore | custo/CD | efeito | status

### TK — Thegn Knight

| id | nome | classe | árvore | custo/CD | efeito | status |
|---|---|---|---|---|---|---|
| `tk_ctrl_1` | Provocação | TK | controle | MP 8 · CD 3.0s | TBD (identidade GDD Guarda: provocação) | placeholder |
| `tk_ctrl_2` | Postura | TK | controle | MP 8 · CD 3.5s | TBD | placeholder |
| `tk_ctrl_3` | Rugido | TK | controle | MP 8 · CD 4.0s | TBD | placeholder |
| `tk_ctrl_4` | Muralha | TK | controle | MP 8 · CD 4.5s | TBD | placeholder |
| `tk_ctrl_5` | Âncora | TK | controle | MP 8 · CD 3.0s | TBD | placeholder |
| `tk_ctrl_6` | Desafio | TK | controle | MP 8 · CD 3.5s | TBD | placeholder |
| `tk_ctrl_7` | Guarda | TK | controle | MP 8 · CD 4.0s | TBD | placeholder |
| `tk_ctrl_8` | Bastião | TK | controle | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |
| `tk_mag_1` | Benção | TK | magia | MP 8 · CD 3.0s | TBD | placeholder |
| `tk_mag_2` | Selo | TK | magia | MP 8 · CD 3.5s | TBD | placeholder |
| `tk_mag_3` | Aura | TK | magia | MP 8 · CD 4.0s | TBD | placeholder |
| `tk_mag_4` | Escudo Sagrado | TK | magia | MP 8 · CD 4.5s | TBD | placeholder |
| `tk_mag_5` | Julgamento | TK | magia | MP 8 · CD 3.0s | TBD | placeholder |
| `tk_mag_6` | Luz | TK | magia | MP 8 · CD 3.5s | TBD | placeholder |
| `tk_mag_7` | Purificar | TK | magia | MP 8 · CD 4.0s | TBD | placeholder |
| `tk_mag_8` | Tribunal | TK | magia | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |
| `tk_fis_1` | Golpe | TK | fisica | MP 8 · CD 3.0s | VFX dedicado em `tkSkills/golpe` | VFX técnico; skill canônica pendente |
| `tk_fis_2` | Corte | TK | fisica | MP 8 · CD 3.5s | VFX dedicado em `tkSkills/corte` | VFX técnico; skill canônica pendente |
| `tk_fis_3` | Investida | TK | fisica | MP 8 · CD 4.0s | VFX dedicado em `tkSkills/investida` | VFX técnico; skill canônica pendente |
| `tk_fis_4` | Machado | TK | fisica | MP 8 · CD 4.5s | VFX dedicado em `tkSkills/machado` | VFX técnico; skill canônica pendente |
| `tk_fis_5` | Quebra | TK | fisica | MP 8 · CD 3.0s | VFX dedicado em `tkSkills/quebra` | VFX técnico; skill canônica pendente |
| `tk_fis_6` | Fúria | TK | fisica | MP 8 · CD 3.5s | VFX dedicado em `tkSkills/furia` | VFX técnico; skill canônica pendente |
| `tk_fis_7` | Avalanche | TK | fisica | MP 8 · CD 4.0s | VFX dedicado em `tkSkills/avalanche` | VFX técnico; skill canônica pendente |
| `tk_fis_8` | Colosso | TK | fisica | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |

### FM — Frost Maiden

| id | nome | classe | árvore | custo/CD | efeito | status |
|---|---|---|---|---|---|---|
| `fm_ctrl_1` | Laço | FM | controle | MP 8 · CD 3.0s | TBD (GDD Domínio: CC) | placeholder |
| `fm_ctrl_2` | Silêncio | FM | controle | MP 8 · CD 3.5s | TBD | placeholder |
| `fm_ctrl_3` | Rede | FM | controle | MP 8 · CD 4.0s | TBD | placeholder |
| `fm_ctrl_4` | Cadeia | FM | controle | MP 8 · CD 4.5s | TBD | placeholder |
| `fm_ctrl_5` | Prisão | FM | controle | MP 8 · CD 3.0s | TBD | placeholder |
| `fm_ctrl_6` | Véu | FM | controle | MP 8 · CD 3.5s | TBD | placeholder |
| `fm_ctrl_7` | Estase | FM | controle | MP 8 · CD 4.0s | TBD | placeholder |
| `fm_ctrl_8` | Domínio | FM | controle | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |
| `fm_mag_1` | Faísca | FM | magia | MP 8 · CD 3.0s | TBD (GDD Véu/Ruína: magia) | placeholder |
| `fm_mag_2` | Dardo | FM | magia | MP 8 · CD 3.5s | TBD | placeholder |
| `fm_mag_3` | Bola | FM | magia | MP 8 · CD 4.0s | TBD | placeholder |
| `fm_mag_4` | Lança | FM | magia | MP 8 · CD 4.5s | TBD | placeholder |
| `fm_mag_5` | Tempestade | FM | magia | MP 8 · CD 3.0s | TBD | placeholder |
| `fm_mag_6` | Cometa | FM | magia | MP 8 · CD 3.5s | TBD | placeholder |
| `fm_mag_7` | Vórtice | FM | magia | MP 8 · CD 4.0s | TBD | placeholder |
| `fm_mag_8` | Ruína | FM | magia | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |
| `fm_fis_1` | Bastão | FM | fisica | MP 8 · CD 3.0s | TBD | placeholder |
| `fm_fis_2` | Toque | FM | fisica | MP 8 · CD 3.5s | TBD | placeholder |
| `fm_fis_3` | Golpe Arcano | FM | fisica | MP 8 · CD 4.0s | TBD | placeholder |
| `fm_fis_4` | Lâmina | FM | fisica | MP 8 · CD 4.5s | TBD | placeholder |
| `fm_fis_5` | Impacto | FM | fisica | MP 8 · CD 3.0s | TBD | placeholder |
| `fm_fis_6` | Ruptura | FM | fisica | MP 8 · CD 3.5s | TBD | placeholder |
| `fm_fis_7` | Eco | FM | fisica | MP 8 · CD 4.0s | TBD | placeholder |
| `fm_fis_8` | Colapso | FM | fisica | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |

### BM — Beast Master

| id | nome | classe | árvore | custo/CD | efeito | status |
|---|---|---|---|---|---|---|
| `bm_ctrl_1` | Chamado | BM | controle | MP 8 · CD 3.0s | TBD (GDD Matilha: invocação/pressão) | placeholder |
| `bm_ctrl_2` | Ameaça | BM | controle | MP 8 · CD 3.5s | TBD | placeholder |
| `bm_ctrl_3` | Bando | BM | controle | MP 8 · CD 4.0s | TBD | placeholder |
| `bm_ctrl_4` | Cerco | BM | controle | MP 8 · CD 4.5s | TBD | placeholder |
| `bm_ctrl_5` | Ordem | BM | controle | MP 8 · CD 3.0s | TBD | placeholder |
| `bm_ctrl_6` | Domínio | BM | controle | MP 8 · CD 3.5s | TBD | placeholder |
| `bm_ctrl_7` | Legião | BM | controle | MP 8 · CD 4.0s | TBD | placeholder |
| `bm_ctrl_8` | Soberano | BM | controle | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |
| `bm_mag_1` | Elo | BM | magia | MP 8 · CD 3.0s | TBD (GDD Elo: cura/buff) | placeholder |
| `bm_mag_2` | Eco | BM | magia | MP 8 · CD 3.5s | TBD | placeholder |
| `bm_mag_3` | Canal | BM | magia | MP 8 · CD 4.0s | TBD | placeholder |
| `bm_mag_4` | Pacto | BM | magia | MP 8 · CD 4.5s | TBD | placeholder |
| `bm_mag_5` | Vínculo | BM | magia | MP 8 · CD 3.0s | TBD | placeholder |
| `bm_mag_6` | Ritual | BM | magia | MP 8 · CD 3.5s | TBD | placeholder |
| `bm_mag_7` | Essência | BM | magia | MP 8 · CD 4.0s | TBD | placeholder |
| `bm_mag_8` | Absoluto | BM | magia | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |
| `bm_fis_1` | Presas | BM | fisica | MP 8 · CD 3.0s | TBD (GDD Presas: dano físico) | placeholder |
| `bm_fis_2` | Garra | BM | fisica | MP 8 · CD 3.5s | TBD | placeholder |
| `bm_fis_3` | Mordida | BM | fisica | MP 8 · CD 4.0s | TBD | placeholder |
| `bm_fis_4` | Investida | BM | fisica | MP 8 · CD 4.5s | TBD | placeholder |
| `bm_fis_5` | Feras | BM | fisica | MP 8 · CD 3.0s | TBD | placeholder |
| `bm_fis_6` | Matilha | BM | fisica | MP 8 · CD 3.5s | TBD | placeholder |
| `bm_fis_7` | Caçada | BM | fisica | MP 8 · CD 4.0s | TBD | placeholder |
| `bm_fis_8` | Apex | BM | fisica | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |

### HT — Huntress

| id | nome | classe | árvore | custo/CD | efeito | status |
|---|---|---|---|---|---|---|
| `ht_ctrl_1` | Armadilha | HT | controle | MP 8 · CD 3.0s | TBD (GDD Trilha: armadilha/CC) | placeholder |
| `ht_ctrl_2` | Corda | HT | controle | MP 8 · CD 3.5s | TBD | placeholder |
| `ht_ctrl_3` | Rede | HT | controle | MP 8 · CD 4.0s | TBD | placeholder |
| `ht_ctrl_4` | Silêncio | HT | controle | MP 8 · CD 4.5s | TBD | placeholder |
| `ht_ctrl_5` | Marca | HT | controle | MP 8 · CD 3.0s | TBD | placeholder |
| `ht_ctrl_6` | Canto | HT | controle | MP 8 · CD 3.5s | TBD | placeholder |
| `ht_ctrl_7` | Trilha | HT | controle | MP 8 · CD 4.0s | TBD | placeholder |
| `ht_ctrl_8` | Cerco | HT | controle | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |
| `ht_mag_1` | Farol | HT | magia | MP 8 · CD 3.0s | TBD | placeholder |
| `ht_mag_2` | Sinal | HT | magia | MP 8 · CD 3.5s | TBD | placeholder |
| `ht_mag_3` | Bênção | HT | magia | MP 8 · CD 4.0s | TBD | placeholder |
| `ht_mag_4` | Vento | HT | magia | MP 8 · CD 4.5s | TBD | placeholder |
| `ht_mag_5` | Lua | HT | magia | MP 8 · CD 3.0s | TBD | placeholder |
| `ht_mag_6` | Estrela | HT | magia | MP 8 · CD 3.5s | TBD | placeholder |
| `ht_mag_7` | Aurora | HT | magia | MP 8 · CD 4.0s | TBD | placeholder |
| `ht_mag_8` | Eclipse | HT | magia | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |
| `ht_fis_1` | Tiro | HT | fisica | MP 8 · CD 3.0s | TBD (GDD Tiro: ranged) | placeholder |
| `ht_fis_2` | Perfuração | HT | fisica | MP 8 · CD 3.5s | TBD | placeholder |
| `ht_fis_3` | Rajada | HT | fisica | MP 8 · CD 4.0s | TBD | placeholder |
| `ht_fis_4` | Flecha Dupla | HT | fisica | MP 8 · CD 4.5s | TBD | placeholder |
| `ht_fis_5` | Chuva | HT | fisica | MP 8 · CD 3.0s | TBD | placeholder |
| `ht_fis_6` | Precisão | HT | fisica | MP 8 · CD 3.5s | TBD | placeholder |
| `ht_fis_7` | Salva | HT | fisica | MP 8 · CD 4.0s | TBD | placeholder |
| `ht_fis_8` | Tempestade | HT | fisica | MP 8 · CD 4.5s | TBD — **8ª exclusiva** | placeholder |

---

## 8ª skills (topo exclusivo)

Só **uma** destas por personagem (grill + `SKILL_BALANCE.exclusiveEighth`).

| id | nome | classe | árvore |
|---|---|---|---|
| `tk_ctrl_8` | Bastião | TK | controle |
| `tk_mag_8` | Tribunal | TK | magia |
| `tk_fis_8` | Colosso | TK | fisica |
| `fm_ctrl_8` | Domínio | FM | controle |
| `fm_mag_8` | Ruína | FM | magia |
| `fm_fis_8` | Colapso | FM | fisica |
| `bm_ctrl_8` | Soberano | BM | controle |
| `bm_mag_8` | Absoluto | BM | magia |
| `bm_fis_8` | Apex | BM | fisica |
| `ht_ctrl_8` | Cerco | HT | controle |
| `ht_mag_8` | Eclipse | HT | magia |
| `ht_fis_8` | Tempestade | HT | fisica |

---

## Livros (árvore comum)

### No código (`BOOK_SKILLS`)

Passivas — **fora da barra** (grill). Def: `damageMultiplier/range/cooldown = 0`.

| id | nome | classe | árvore | custo/CD | efeito | status |
|---|---|---|---|---|---|---|
| `book_hp` | Vida | comum | livros | — (passiva) | TBD — vida máxima (GDD) | passiva |
| `book_gold` | Ouro | comum | livros | — (passiva) | TBD — ouro obtido (GDD) | passiva |
| `book_xp` | Experiência | comum | livros | — (passiva) | TBD — XP obtido (GDD) | passiva |
| `book_cd` | Cooldown | comum | livros | — (passiva) | TBD — redução de CD (GDD) | passiva |

### Só no GDD `12` (sem id de código)

| id | nome | classe | árvore | custo/CD | efeito | status |
|---|---|---|---|---|---|---|
| — | Chance de crítico | comum | livros | — | TBD · nível máx. baixo (~5, GDD) | gdd-gap |
| — | Alcance | comum | livros | — | TBD | gdd-gap |
| — | Velocidade de ataque | comum | livros | — | TBD | gdd-gap |
| — | Sorte de drop | comum | livros | — | TBD | gdd-gap |

---

## Gaps e conflitos

1. **Barra 10 vs runtime 4** — grill/wire (`BAR_SIZE = 10`); `SkillLoadout` / save cortam em **4**.
2. **Efeito diegético** — 96 skills de classe: só fórmula genérica de dano; prosa GDD nomeia árvores fantasia (Guarda/Impacto/…), **não** 1:1 com ids `controle/magia/fisica`.
3. **Livros** — código 4; GDD 8; wire `special` tem **12** nomes diferentes (Passo, Cura, Estrela…) — **não** mapear 1:1 sem decisão.
4. **Wire HT** — árvores `armadilha` / `marca` / `caca` × **12** slots + `special` × 12; ícones `visual/telas/assets/skills/*.svg`. Contrato de id do jogo = tabela mestra acima, não o wire.
5. **Passivas na barra** — grill: fora; wire marca algumas com CD 0 / MP 0 (ex. Mochila de Caça) misturadas na grade — falta regra de UI para separar passiva × ativa.
6. **Pontos / nível** — grill **2**; `SKILL_BALANCE.pointsPerLevel` e GDD `12` = **1**.
7. **Ícones finais** — wire SVG placeholder; I5 marca icons de skill como `placeholder`.
8. **Nomes GDD fantasia × código** — I10 já anota: usar ids do código; prosa GDD = identidade, não rename automático.

---

## Wire (referência rápida, não canônico)

| Árvore wire | Slots | Papel no wire | Status |
|---|---:|---|---|
| `armadilha` | 12 (compra 1–8; 9–12 cadeado) | Mock HT / loja mestre | wire-mock |
| `marca` | 12 | Mock HT | wire-mock |
| `caca` | 12 | Mock HT; 8ª = Olho do Predador | wire-mock |
| `special` | 12 | Livros fantasia (não = `BOOK_SKILLS`) | wire-mock |
| HUD barra | 10 | Alinha ao grill | wire (tamanho ok; conteúdo mock) |

---

## Onde vive no código

| Peça | Caminho |
|---|---|
| Defs de skill / livros | `game/src/data/classes/class-definitions.ts` |
| Balance MP/pontos/8ª | `game/src/data/balance/skills.ts` |
| Compra / nível / spec | `game/src/domain/skills/SkillTreeService.ts` |
| Barra / loadout | `game/src/domain/combat/SkillLoadout.ts` |
| Cast | `game/src/domain/combat/SkillController.ts` |
| Wire UI skills | `visual/telas/03-wire-paineis-cidade.html` → `WireUi.ts` |

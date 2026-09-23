# Classes — inventário I10

Documento de discovery. Depois de ler isto, dá para saber **attrs base, árvores e arma/anim default** das 4 classes sem abrir o código.

**Fontes:** `DECISOES-DESIGN.md` (CLASSES) · GDD `05-personagem-e-progressao.md` · GDD `12` (árvores) · `game/src/data/classes/class-definitions.ts` · boot `CLASSES` em `02-selecao-personagem.html` · `PlayerView` / `WeaponRig` · I5 (`docs/inventarios/assets.md`).  
**Conflito GDD × grill:** o grill vence — attrs iniciais **5/5/5/5** em todas as classes; **sem** atributo principal fixo; fórmulas iguais.

---

## Regra canônica (grill)

| Tópico | Valor |
|---|---|
| Classes | TK Thegn Knight · FM Frost Maiden · BM Beast Master · HT Huntress |
| Attrs ao criar | **FOR 5 · DES 5 · CONS 5 · INT 5** (todas) |
| Primário por classe | **Nenhum** |
| Builds | Livres (FM física, TK mago etc. valem) |
| Arma inicial | **Nenhuma** (começa zerado) |
| Armadura | Por classe (ITEM); arma livre com scaling |
| Árvores | 3 por classe (controle / magia / física); 8 skills cada; **só 1** 8ª skill entre as 3 |
| Livros | Árvore comum (BOOK_SKILLS) — detalhe em I3 |
| Pontos attr / nível | 5 livres (grill ATRIBUTOS) |
| Skills / nível | 2 pontos (grill SKILLS; GDD `12` ainda diz 1 — fora do escopo I10) |

---

## Resumo das 4 classes

| Código | Nome | Attrs create (canônico) | Primário grill | Árvores (ids código) | Set arma default no runtime | Anims hoje |
|---|---|---|---|---|---|---|
| TK | Thegn Knight | 5/5/5/5 | nenhum | controle · magia · fisica | `axe-shield` | idle do `TK.glb` + shared |
| FM | Frost Maiden | 5/5/5/5 | nenhum | controle · magia · fisica | `greatstaff` | idle do `FM.glb` + shared |
| BM | Beast Master | 5/5/5/5 | nenhum | controle · magia · fisica | `dual-gloves` | idle do `BM.glb` + shared |
| HT | Huntress | 5/5/5/5 | nenhum | controle · magia · fisica | `dual-sword` | idle do `HT.glb` + shared |

Mesh: `game/public/models/player/{id}/{id}.glb` (+ `texture.jpg`). Retratos hub: `char-*.png` / `face-*.png` (I5).

---

## Atributos — canônico vs legado

| Fonte | TK | FM | BM | HT | Primário |
|---|---|---|---|---|---|
| **Grill (vence)** | 5/5/5/5 | 5/5/5/5 | 5/5/5/5 | 5/5/5/5 | nenhum |
| GDD `05` | — (só marca primário) | — | — | — | TK=FOR · FM=INT · BM=INT · HT=DES |
| GDD `12` proposta | — | — | — | — | TK=FOR · FM=INT · BM=INT/CONS · HT=DES |
| Boot `CLASSES[].base` | 12/8/14/6 | 6/8/8/16 | 10/10/12/12 | 8/14/9/8 | campo `primary` igual ao GDD `05` |
| `PROGRESSION_BALANCE.baseAttributes` | 10/10/10/10 (todas) | idem | idem | idem | n/a (flat) |
| `class-definitions.ts` | só `primary` | FOR | INT | INT | DES |
| `SaveTypes.normalizeSlots` fallback | 5 se faltar | 5 | 5 | 5 | — |
| Create no boot | copia `CLASSES[].base` | idem | idem | idem | destaca primary em ouro na UI |

Ordem nos números: **FOR / DES / CONS / INT**.

---

## Árvores e skills (código atual)

Ids de árvore estáveis: `controle` | `magia` | `fisica`. Cada árvore: **8** skills (skill 8 = topo exclusivo — regra grill/GDD).

Nomes no `class-definitions.ts` (placeholder de efeito; números provisórios):

### TK

| Árvore | Skills 1→8 |
|---|---|
| controle | Provocação · Postura · Rugido · Muralha · Âncora · Desafio · Guarda · Bastião |
| magia | Benção · Selo · Aura · Escudo Sagrado · Julgamento · Luz · Purificar · Tribunal |
| fisica | Golpe · Corte · Investida · Machado · Quebra · Fúria · Avalanche · Colosso |

### FM

| Árvore | Skills 1→8 |
|---|---|
| controle | Laço · Silêncio · Rede · Cadeia · Prisão · Véu · Estase · Domínio |
| magia | Faísca · Dardo · Bola · Lança · Tempestade · Cometa · Vórtice · Ruína |
| fisica | Bastão · Toque · Golpe Arcano · Lâmina · Impacto · Ruptura · Eco · Colapso |

### BM

| Árvore | Skills 1→8 |
|---|---|
| controle | Chamado · Ameaça · Bando · Cerco · Ordem · Domínio · Legião · Soberano |
| magia | Elo · Eco · Canal · Pacto · Vínculo · Ritual · Essência · Absoluto |
| fisica | Presas · Garra · Mordida · Investida · Feras · Matilha · Caçada · Apex |

### HT

| Árvore | Skills 1→8 |
|---|---|
| controle | Armadilha · Corda · Rede · Silêncio · Marca · Canto · Trilha · Cerco |
| magia | Farol · Sinal · Bênção · Vento · Lua · Estrela · Aurora · Eclipse |
| fisica | Tiro · Perfuração · Rajada · Flecha Dupla · Chuva · Precisão · Salva · Tempestade |

**Livros (`BOOK_SKILLS`):** Vida · Ouro · Experiência · Cooldown (ids `book_hp` / `book_gold` / `book_xp` / `book_cd`). GDD `12` lista mais utilidades — inventário completo em **I3**.

**GDD `12` nomes fantasia** (Guarda/Impacto/Ímpeto etc.) **não** batem 1:1 com os ids `controle/magia/fisica` do código; usar o código + grill como contrato de IDs; prosa GDD é identidade.

Boot só lista rótulos `["Controle","Magia","Física"]` — sem ids de skill.

---

## Armas e animações (liga X4)

### Sets disponíveis (`WeaponRig`)

| WeaponSetId | Rótulo | Modelos |
|---|---|---|
| `dual-axe` | Machados duplos | axe + axe |
| `axe-shield` | Machado e escudo | axe + shield (placeholder) |
| `sword-shield` | Espada e escudo | sword + shield |
| `dual-sword` | Espadas duplas | sword + sword |
| `greatsword` | Espadão | sword-2 |
| `dual-gloves` | Garras | glove placeholder (sem GLB) |
| `staff-shield` | Cajado e escudo | staff + shield |
| `greatstaff` | Cajadão | staff (escala maior) |
| `bow` | Arco | bow |

Arquivos em disco (I5): `axe`, `sword`, `sword-2`, `staff`, `bow`. Escudo/luva = placeholder no código.

### Default por classe no runtime (`PlayerView.CLASS_WEAPON_SET`)

| Classe | Default código | Nota vs grill |
|---|---|---|
| TK | `axe-shield` | Grill: sem arma inicial; set é preview/combate atual |
| FM | `greatstaff` | idem |
| BM | `dual-gloves` | luva placeholder |
| HT | `dual-sword` | GDD fantasia = arco; set default ≠ bow |

Grill: **arma livre** (qualquer set conforme item). Default acima é só o que o código equipa hoje — não é regra de create.

### Clips de animação hoje

| Clip | Origem | Por arma? |
|---|---|---|
| idle | `animations[0]` do GLB da **classe** | não (gap X4) |
| run / hit_gut / hit_right / death | `shared/anims/*.glb` | **não** — um clip compartilhado |
| attack / cast | `shared/anims/*.glb` | **matriz X4**: melee→`attack`, staff/arco→`cast` no ataque básico |
| `TK/anims/*` | cópia do shared | órfão (debug I5) |

**X4:** wiring parcial em `PlayerView.WEAPON_ATTACK_ANIM`. Idle/run ainda não variam com a arma — faltam clips. Idle TK = clip BM é tarefa **S7** (fora I10).

---

## Conflitos grill vs código / GDD (checklist de alinhamento)

| # | Onde | Estado | Impacto |
|---|---|---|---|
| 1 | Grill CLASSES | **5/5/5/5**, sem primário | Canônico |
| 2 | GDD `05` / `12` | Primário por classe (BM INT ou INT/CONS) | Legado — grill vence; não usar no create |
| 3 | Boot `CLASSES[].base` + `primary` | Attrs desiguais + highlight de primário | Create grava base legado; UI ainda “favorece” attr |
| 4 | Boot create `gold: 100` | Grill PERSONAGEM / ECONOMIA = **0** ouro | Fora do foco attrs, mas create desvia do grill |
| 5 | `class-definitions.ts` `primary` | Ainda preenchido | `ProgressionService` aplica bônus de `COMBAT_BALANCE.primary` |
| 6 | `PROGRESSION_BALANCE.baseAttributes` | **10/10/10/10** | Novo char runtime ≠ 5 e ≠ boot |
| 7 | Anims | Shared: ataque melee/cast; idle/run sem variação por arma | X4 parcial — gap clips |
| 8 | Arma default / starter | Código tem set por classe; grill = nenhuma | Preview/combate ≠ create zerado |

**Create alvo (G1 / S2):** gravar `attrs: { FOR:5, DES:5, CONS:5, INT:5 }` para qualquer `classId`; remover dependência de `primary` no cálculo quando o código for alinhado.

---

## Onde vive no repo

| Papel | Caminho |
|---|---|
| Design | `DECISOES-DESIGN.md` § CLASSES / ATRIBUTOS / SKILLS |
| Prosa GDD | `05-personagem-e-progressao.md`, `12-skills-builds-e-equipamentos.md` |
| Defs classe + árvores | `game/src/data/classes/class-definitions.ts` |
| Attrs runtime | `game/src/data/balance/progression.ts` |
| Bônus “primary” | `game/src/data/balance/combat.ts` + `ProgressionService` |
| Hub create / UI | `game/public/boot/02-selecao-personagem.html` (`CLASSES`) |
| Mesh + weapon set | `game/src/presentation/player/PlayerView.ts` |
| Sets de arma | `game/src/presentation/player/WeaponRig.ts` |
| Assets | `docs/inventarios/assets.md` (I5) |

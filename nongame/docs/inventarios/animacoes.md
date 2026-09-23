# Animações — inventário I1

Documento de discovery. Depois de ler isto, dá para saber **clip → GLB → quem usa → status** sem abrir pastas ou código.

**Escopo varrido:** `game/public/models/player/` · `game/public/weapons/` · `game/public/models/city/` · `PlayerView` · `char-preview.mjs` (boot + telas) · `WeaponRig` · `EnemyRuntimeView` · `CityWorld` · I5 (`assets.md`) · I10 (`classes.md`).  
**Conflito GDD × grill:** grill / `DECISOES-DESIGN.md` vencem.

**Legenda de status**

| Status | Significado |
|---|---|
| `final` | Clip em uso no runtime/hub e tratado como oficial |
| `placeholder` | Em uso, mas provisório / a trocar |
| `debug` | Arquivo no disco sem consumidor no runtime |
| `falta` | Domínio esperado sem clip/GLB (ou só VFX/procedural) |

---

## Resumo

| Domínio | Clips no disco | Quem consome | Status dominante |
|---|---|---|---|
| Idle por classe | 4 (`idle` embutido em TK/FM/BM/HT.glb) | `PlayerView` + `char-preview.mjs` | `final` (seleção: TK idle = clip BM via S7) |
| Locomotion / combate shared | 6 GLB em `shared/anims/` | só `PlayerView` | `final` |
| Cópias TK/anims | 6 GLB (MD5 = shared) | ninguém | `debug` |
| Arma | 0 clips dedicados; ataque mapeia shared | `PlayerView.WEAPON_ATTACK_ANIM` + mesh `WeaponRig` | `placeholder` (X4 parcial) |
| NPC hub | 0 | cilindro/marcador | `falta` |
| Monstro / inimigo | 0 | cápsula + VFX scale | `falta` |
| Props cidade | 0 | estático | n/a (sem anim) |

**Contrato runtime (`PlayerView.PlayerAnim`):** `idle` · `run` · `attack` · `cast` · `hit_gut` · `hit_right` · `death`.  
Idle = `animations[0]` do GLB da **classe**. Demais = `animations[0]` de cada GLB em `shared/anims/`.

---

## 1. Personagem — clips ativos

| Clip | GLB origem | Quem usa | Loop / one-shot | Status |
|---|---|---|---|---|
| `idle` (TK) | modelo `TK.glb`; clip idle: `BM.glb` na seleção (`char-preview`); embutido `TK.glb` no `PlayerView` | `char-preview.mjs` (S7); `PlayerView` ainda usa clip do TK | loop | `final` na seleção; runtime cidade ainda clip TK |
| `idle` (FM) | `…/FM/FM.glb` → `idle` | idem | loop | `final` |
| `idle` (BM) | `…/BM/BM.glb` → `idle` | idem | loop | `final` (fonte alvo do S7) |
| `idle` (HT) | `…/HT/HT.glb` → `idle` | idem | loop | `final` |
| `run` | `…/shared/anims/run.glb` → `run` | `PlayerView.setPose` quando `moving` | loop | `final` |
| `attack` | `…/shared/anims/attack.glb` → `attack` | `PlayerView.playAttack` ← `CityGameSession` (ataque básico) | one-shot | `final` |
| `cast` | `…/shared/anims/cast.glb` → `cast` | `PlayerView.playCast` ← skill | one-shot | `final` |
| `hit_gut` | `…/shared/anims/hit_gut.glb` → `hit_gut` | `PlayerView.playHit` (alterna) | one-shot | `final` |
| `hit_right` | `…/shared/anims/hit_right.glb` → `hit_right` | `PlayerView.playHit` (alterna) | one-shot | `final` |
| `death` | `…/shared/anims/death.glb` → `death` | `PlayerView.playDeath` ← morte do jogador na dungeon | one-shot | `final` (D2/D3 técnico — aguarda Felipe) |

Cada GLB de anim shared / classe carrega **1** clip (nome = coluna Clip). Não há segundo clip no arquivo.

### Como o idle é escolhido hoje

| Consumidor | Regra |
|---|---|
| `PlayerView.load(classId)` | `idleClip = base.animations[0]` do `CLASS_MODEL[classId]` |
| `char-preview.mjs` `mountCharPreview(container, classId)` | modelo do `MODEL[classId]`; idle via `IDLE_FROM` (TK→clip BM) ou `animations[0]` da própria classe |

Seleção: TK modelo/textura do `TK.glb`, clip idle do `BM.glb`. Runtime (`PlayerView`): ainda idle embutido do TK.

---

## 2. Personagem — arquivos órfãos / debug

| Clip (arquivo) | GLB origem | Quem usa | Status |
|---|---|---|---|
| `run` / `attack` / `cast` / `hit_gut` / `hit_right` / `death` | `game/public/models/player/TK/anims/*.glb` | **ninguém** (`PlayerView` só aponta `shared/anims/`) | `debug` |

MD5 idêntico ao shared (cópia). I5 já marca como debug; I1 confirma: zero referência no código.

Não existem pastas `FM/anims`, `BM/anims`, `HT/anims`.

---

## 3. Armas

| Clip esperado (X4) | GLB origem | Quem usa | Status |
|---|---|---|---|
| idle / run por set | — | — | `falta` (só idle de classe + `run` shared) |
| ataque por set | shared `attack` / `cast` via matriz | `PlayerView.playAttack` | `placeholder` |
| mesh arma | `game/public/weapons/*.glb` (`axe`, `sword`, `sword-2`, `staff`, `bow`) | `WeaponRig` — **só mesh**, sem `animations[]` | mesh `final` |

Sets (`WeaponRig`): `dual-axe` · `axe-shield` · `sword-shield` · `dual-sword` · `greatsword` · `dual-gloves` · `staff-shield` · `greatstaff` · `bow`.  
Default por classe (código, não grill create): TK `axe-shield` · FM `greatstaff` · BM `dual-gloves` · HT `dual-sword` (I10).

### Matriz X4 (shared — melhor possível sem clips por arma)

| WeaponSetId | idle | run | ataque básico |
|---|---|---|---|
| `dual-axe` · `axe-shield` · `sword-shield` · `dual-sword` · `greatsword` · `dual-gloves` | idle da **classe** | `shared/run` | `shared/attack` |
| `staff-shield` · `greatstaff` · `bow` | idle da **classe** | `shared/run` | `shared/cast` |

Sem GLB de idle/run/attack por set: staff/arco usam o clip `cast` no ataque básico; melee usa `attack`. Idle e run **não** variam com a arma.

---

## 4. NPC (hub)

| Clip | GLB origem | Quem usa | Status |
|---|---|---|---|
| — | nenhum GLB de NPC | `CityWorld.makeNpcMarker` (cilindro/grupo) | `falta` |

Sem mixer, sem idle de diálogo. Arte de NPC = tarefa C23 / I14 — fora do escopo de entregar clip aqui.

---

## 5. Monstros / inimigos

| Clip | GLB origem | Quem usa | Status |
|---|---|---|---|
| idle / walk / attack / death (mesh) | nenhum | `EnemyRuntimeView` — `CapsuleGeometry` | `falta` |
| “morte” visual | — | `EffectManager.playDeath(mesh)` — **scale down** (`VFX_BALANCE.deathSeconds`), não clip GLB | VFX (I2); não conta como anim de mesh |

---

## 6. Props / cidade

GLBs em `game/public/models/city/` — **zero** `animations[]`. Sem animação esquelética (fonte/água etc. são shader/VFX — I12/I2).

---

## 7. Gaps que este inventário destrava

### S7 — Idle TK = clip BM

| Item | Estado |
|---|---|
| Requisito | No roster/modal 3D: modelo/textura **TK**, clip de idle do **BM** |
| Código seleção | `char-preview.mjs` `IDLE_FROM.TK = "BM"` + `resolveIdleClip` (boot + visual) |
| Runtime | `PlayerView` ainda usa idle embutido do `TK.glb` (fora do aceite 2.11) |
| Gap | **Fechado na seleção** — aguarda validação Felipe; alinhar `PlayerView` só se o design pedir |

### X4 — Animações por arma

| Item | Estado |
|---|---|
| Requisito | idle/run/attack coerentes com a arma equipada (checklist 4.14) |
| Disco | só 1 família shared + idle por classe; armas sem clip |
| Wiring | `PlayerView.WEAPON_ATTACK_ANIM` — melee→`attack`, staff/arco→`cast` |
| Gap | **Parcial** — idle/run únicos; falta família de clips por set (ou por estilo) para fechar 4.14 de verdade |

### D2 — Morte na dungeon

| Item | Estado |
|---|---|
| Requisito | Anim **no local** da dungeon → espera → cidade (não animar na cidade); repetível (4.2 / 4.4) |
| Clip | `death.glb` shared; `playDeath` / `clearDeath` / timer = duração do clip |
| Fluxo | Mixer atualiza no DEAD; fade preto (X3b) → cidade idle; 2ª morte roda de novo |
| Gap | Só validação visual do Felipe |

---

## Onde vive no repo

| Papel | Caminho |
|---|---|
| Meshes classe + idle embutido | `game/public/models/player/{TK,FM,BM,HT}/*.glb` |
| Clips shared | `game/public/models/player/shared/anims/*.glb` |
| Cópias órfãs TK | `game/public/models/player/TK/anims/*.glb` |
| Runtime mixer | `game/src/presentation/player/PlayerView.ts` |
| Preview seleção | `game/public/boot/assets/char-preview.mjs` (+ espelho `visual/telas/assets/`) |
| Armas (mesh) | `game/public/weapons/` + `WeaponRig.ts` |
| Inimigo placeholder | `game/src/presentation/enemies/EnemyRuntimeView.ts` |
| Assets gerais | `docs/inventarios/assets.md` (I5) |
| Classes / defaults arma | `docs/inventarios/classes.md` (I10) |

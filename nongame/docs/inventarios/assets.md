# Assets do jogo — inventário I5

Documento de discovery. Depois de ler isto, dá para separar **asset real** vs **placeholder / debug / falta** em uma consulta, sem abrir pastas.

**Escopo varrido (só o que existe no disco):**
| Pasta | Resultado |
|---|---|
| `game/public/` | 44 arquivos de mídia (`.glb` / `.png` / `.jpg` / `.webp`) + HTML/JS/vendor (fora da tabela de arte) |
| `game/src/assets/` | **não existe** |
| `visual/telas/assets/` | ~97 mídias de UI (PNG/JPG/SVG); vendor Three.js ignorado como lib |
| `assets/` (raiz) | só `README.md` — pasta de imagens do GDD, **vazia de arte** |

**Contagem aproximada de arte de jogo:** ~140 arquivos de mídia versionados nos caminhos acima (sem `vendor/`, sem HTML/JS).

**Fontes de status:** uso no runtime (`PlayerView`, `WeaponRig`, `CityProps`, `CityGround`, `CharacterUiBinder`, `WireUi` → `/wire/`), `visual/DECISOES-ESTILO.md`, `visual/TODO.md`, `PLAN-assets-cenario-dungeons.md`.  
**Conflito GDD × grill:** grill / decisões de estilo vencem.

**Legenda de status**

| Status | Significado |
|---|---|
| `final` | Arte em uso no hub/runtime e tratada como oficial (ainda pode refinar; não é cápsula/debug) |
| `placeholder` | Em uso, mas marcado como provisório / wire / a trocar |
| `debug` | Órfão, ferramenta, cópia não carregada, ou residual de lab |
| `falta` | Domínio esperado sem arquivo no disco |

Shaders/VFX sem arquivo: efeito vive em TypeScript (`ShaderMaterial` / `presentation/effects/*`) — listados como **falta** de asset de arquivo + nota de código.

---

## Resumo por domínio

| Domínio | No disco | Status dominante | Nota |
|---|---|---|---|
| model (cidade) | 9 GLB | `final` | Props do hub |
| model (player) | 4 GLB + 4 JPG textura | `final` | TK/FM/BM/HT |
| model (arma) | 5 GLB + 1 JPG | `final` | axe/sword/staff/bow; greatstaff reusa `staff.glb` |
| anim | 6 GLB shared (+ 6 cópias TK) | shared `final`; TK `debug` | Runtime só carrega `shared/anims/` |
| texture (chão) | 1 WebP | `final` | Solo da cidade |
| icon (UI wire) | 85 SVG | `placeholder` | skills/eq/items do wire |
| UI (retratos/faces) | 8 PNG no boot (+ espelho em telas) | `final` | Arte de classe com alfa |
| UI (JPG residual) | 4 JPG só em telas | `debug` | Não referenciados; PNG é a fonte |
| audio | 0 | `falta` | Zero `.mp3`/`.ogg`/`.wav` no repo (fora backup/nm) |
| shader (arquivo) | 0 | `falta` | Inline em `SceneRenderer` / `PortalVfx` |
| VFX (arquivo) | 0 | `falta` | Procedural: portal, brasas, fonte, fogueira |
| model (inimigo/NPC/árvore/dungeon) | 0 | `falta` | Cápsula/cilindro no código; props D1+ só no plano |

---

## 1. Models — cidade (`game/public/models/city/`)

| Caminho | Tipo | Uso | Status |
|---|---|---|---|
| `game/public/models/city/wall.glb` | model | Muralha / trecho de muro (`CityProps`) | final |
| `game/public/models/city/fountain.glb` | model | Fonte principal da praça | final |
| `game/public/models/city/fountain-simple.glb` | model | Variante fonte (`fountain-simple` em `CityProps`) | final |
| `game/public/models/city/stall-1.glb` | model | Barraca mercado | final |
| `game/public/models/city/stall-2.glb` | model | Barraca mercado | final |
| `game/public/models/city/stall-bakery.glb` | model | Barraca padaria | final |
| `game/public/models/city/weapon-rack.glb` | model | Expositor de armas | final |
| `game/public/models/city/wagon.glb` | model | Carroça | final |
| `game/public/models/city/bulletin-board.glb` | model | Quadro de avisos | final |

Props de **dungeon** (cercas, alvos, tochas, etc.): **falta** em disco — catálogo só em `PLAN-assets-cenario-dungeons.md`.

---

## 2. Models — personagem (`game/public/models/player/`)

| Caminho | Tipo | Uso | Status |
|---|---|---|---|
| `game/public/models/player/TK/TK.glb` | model | Mesh Thegn Knight (`PlayerView`) | final |
| `game/public/models/player/FM/FM.glb` | model | Mesh Frost Maiden | final |
| `game/public/models/player/BM/BM.glb` | model | Mesh Beast Master | final |
| `game/public/models/player/HT/HT.glb` | model | Mesh Huntress | final |
| `game/public/models/player/TK/texture.jpg` | texture | Albedo embutido/acompanha TK | final |
| `game/public/models/player/FM/texture.jpg` | texture | Albedo FM | final |
| `game/public/models/player/BM/texture.jpg` | texture | Albedo BM | final |
| `game/public/models/player/HT/texture.jpg` | texture | Albedo HT | final |

**Falta (sem GLB):** NPC do hub (hoje marcador cilindro em `CityWorld`), monstro/inimigo (cápsula em `EnemyRuntimeView`), árvores fora da praça (instâncias cilindro em `CityScenery`).

---

## 3. Animações (`game/public/models/player/*/anims/`)

| Caminho | Tipo | Uso | Status |
|---|---|---|---|
| `game/public/models/player/shared/anims/run.glb` | anim | Corrida — carregada por `PlayerView` | final |
| `game/public/models/player/shared/anims/attack.glb` | anim | Ataque | final |
| `game/public/models/player/shared/anims/cast.glb` | anim | Cast | final |
| `game/public/models/player/shared/anims/hit_gut.glb` | anim | Hit | final |
| `game/public/models/player/shared/anims/hit_right.glb` | anim | Hit | final |
| `game/public/models/player/shared/anims/death.glb` | anim | Morte | final |
| `game/public/models/player/TK/anims/*.glb` (6 arquivos, MD5 = shared) | anim | **Não referenciados** no runtime | debug |

Detalhe I1 (clips por arma / por classe) fica fora deste doc mínimo.

---

## 4. Armas (`game/public/weapons/`)

| Caminho | Tipo | Uso | Status |
|---|---|---|---|
| `game/public/weapons/axe/axe.glb` | model | Machado (`WeaponRig` → axe) | final |
| `game/public/weapons/axe/texture.jpg` | texture | Textura do machado | final |
| `game/public/weapons/sword.glb` | model | Espada | final |
| `game/public/weapons/sword-2.glb` | model | Espada grande (greatsword) | final |
| `game/public/weapons/staff.glb` | model | Cajado e greatstaff (mesmo GLB, escala diferente) | final |
| `game/public/weapons/bow.glb` | model | Arco | final |

---

## 5. Texturas de mundo

| Caminho | Tipo | Uso | Status |
|---|---|---|---|
| `game/public/textures/city-floor.webp` | texture | Chão da cidade (`CityGround`) | final |
| texturas de solo por dungeon (D1–D8) | texture | LD dungeon | falta |

---

## 6. UI — arte de classe (boot + espelho wire)

Runtime: `game/public/boot/assets/`. Wire/protótipo: `visual/telas/assets/` (PNG idênticos em tamanho aos do boot). Servidos no jogo via `/boot/assets/` e `/wire/assets/` (Vite copia `visual/telas`).

| Caminho | Tipo | Uso | Status |
|---|---|---|---|
| `game/public/boot/assets/char-tk.png` | UI | Retrato corpo TK (seleção / binder) | final |
| `game/public/boot/assets/char-fm.png` | UI | Retrato FM | final |
| `game/public/boot/assets/char-bm.png` | UI | Retrato BM | final |
| `game/public/boot/assets/char-ht.png` | UI | Retrato HT | final |
| `game/public/boot/assets/face-tk.png` | UI | Face slot TK | final |
| `game/public/boot/assets/face-fm.png` | UI | Face FM | final |
| `game/public/boot/assets/face-bm.png` | UI | Face BM | final |
| `game/public/boot/assets/face-ht.png` | UI | Face HT | final |
| `visual/telas/assets/char-*.png` / `face-*.png` | UI | Espelho do wire/protótipo | final |
| `visual/telas/assets/char-tk.jpg` (e fm/bm/ht) | UI | JPG residual menor; **sem referência** no HTML/TS | debug |

Nomes oficiais de estilo (`TKpng` / `FMpng` / …): no disco o handoff usa os nomes `char-*.png` / `face-*.png` acima.

---

## 7. Ícones — wire (`visual/telas/assets/`)

Fonte: `visual/DECISOES-ESTILO.md` + `visual/TODO.md` — ícones de skill do wire são **placeholders**; eq/items seguem o mesmo pacote SVG do protótipo.

### 7.1 Skills (48 SVG) — placeholder

Padrão: `visual/telas/assets/skills/{armadilha|caca|marca|special}-{1..12}.svg`

| Grupo | Paths | Uso | Status |
|---|---|---|---|
| armadilha 1–12 | `visual/telas/assets/skills/armadilha-*.svg` | Árvore HT / wire skill | placeholder |
| caca 1–12 | `visual/telas/assets/skills/caca-*.svg` | Árvore caça / wire | placeholder |
| marca 1–12 | `visual/telas/assets/skills/marca-*.svg` | Árvore marca / wire | placeholder |
| special 1–12 | `visual/telas/assets/skills/special-*.svg` | Skills especiais / 8ª | placeholder |

### 7.2 Equip / slots (27 SVG) — placeholder

| Caminho (pasta) | Tipo | Uso | Status |
|---|---|---|---|
| `visual/telas/assets/eq/weapon.svg` (+ `-empty`) | icon | Slot arma paperdoll | placeholder |
| `visual/telas/assets/eq/armor.svg` (+ `-empty`) | icon | Slot armadura | placeholder |
| `visual/telas/assets/eq/crown.svg` (+ `-empty`) | icon | Slot cabeça | placeholder |
| `visual/telas/assets/eq/neck.svg` (+ `-empty`) | icon | Colar | placeholder |
| `visual/telas/assets/eq/ear.svg` (+ `-empty`) | icon | Brinco | placeholder |
| `visual/telas/assets/eq/ring.svg` / `ring1.svg` / `ring2.svg` (+ `-empty`) | icon | Anéis | placeholder |
| `visual/telas/assets/eq/bag.svg` / `lock.svg` | icon | Abas de bolsa | placeholder |
| `visual/telas/assets/eq/material.svg` | icon | Fallback material | placeholder |
| `visual/telas/assets/eq/mount.svg` / `pet.svg` (+ `-empty`) | icon | Slots extras UI | placeholder |
| `visual/telas/assets/eq/cape-empty.svg` / `orb-empty.svg` / `relic-empty.svg` / `seal-empty.svg` | icon | Slots vazios extras | placeholder |

### 7.3 Itens (10 SVG) — placeholder

| Caminho | Tipo | Uso | Status |
|---|---|---|---|
| `visual/telas/assets/items/potion.svg` | icon | Consumível (wire) | placeholder |
| `visual/telas/assets/items/book.svg` | icon | Livro / skill book | placeholder |
| `visual/telas/assets/items/gem.svg` | icon | Gema / material | placeholder |
| `visual/telas/assets/items/ori.svg` | icon | Poeira Ori | placeholder |
| `visual/telas/assets/items/lac.svg` | icon | Poeira Lac | placeholder |
| `visual/telas/assets/items/rune.svg` | icon | Runa | placeholder |
| `visual/telas/assets/items/scrap.svg` | icon | Sucata | placeholder |
| `visual/telas/assets/items/leather.svg` | icon | Couro | placeholder |
| `visual/telas/assets/items/fragment.svg` | icon | Fragmento | placeholder |
| `visual/telas/assets/items/arrow.svg` | icon | Flecha | placeholder |

Não há cópia desses SVG em `game/public/` — o runtime consome via plugin `/wire/` → `visual/telas/`.

---

## 8. Áudio

| Caminho | Tipo | Uso | Status |
|---|---|---|---|
| _(nenhum)_ | audio | BGM/SFX cidade, dungeon, UI, combate | falta |

Settings de volume existem no código; arquivos de áudio **não**.

---

## 9. Shader / VFX (sem arquivo de asset)

| Referência | Tipo | Uso | Status |
|---|---|---|---|
| `game/src/presentation/rendering/SceneRenderer.ts` (inline) | shader | Sky dome + outline / x-ray jogador | falta (só código) |
| `game/src/presentation/effects/PortalVfx.ts` | VFX | Portal cidade↔dungeon | falta (só código) |
| `game/src/presentation/effects/AmbientEmbers.ts` | VFX | Brasas ambiente | falta (só código) |
| `game/src/presentation/effects/FountainWater.ts` | VFX | Água da fonte | falta (só código) |
| `game/src/presentation/effects/Brazier.ts` | VFX | Fogueira | falta (só código) |
| Hit / skill / level-up / morte (arquivo) | VFX | Combate / feedback | falta |

---

## 10. Fora do inventário de arte (presentes nas pastas, não são asset de jogo)

| Caminho | Por quê |
|---|---|
| `game/public/vendor/three/**` | Lib Three.js |
| `visual/telas/assets/vendor/three/**` | Lib espelhada no wire |
| `game/public/boot/*.html`, `save-store.js`, `char-preview.mjs` | Código / HTML de hub |
| `game/public/tools/save-wipe.html` | Ferramenta de lab (`debug` operacional, não arte) |
| `assets/README.md` | Instruções GDD; pasta sem imagens |
| `visual/svg/*.svg` | Diagramas de documentação (não runtime) |

---

## 11. Lacunas explícitas (aceite “falta”)

| O que o jogo precisa | Status |
|---|---|
| GLB inimigo / elite / boss | falta |
| GLB NPC hub | falta |
| GLB árvore / flora fora | falta |
| Props + solos dungeon D1–D8 | falta |
| Pacote BGM/SFX | falta |
| Shaders/VFX como arquivos reutilizáveis | falta |
| Ícones de skill finais (≥32px legível) | falta (hoje placeholder SVG) |

---

## Como consultar rápido

1. **Final no 3D hub:** `game/public/models/**`, `game/public/weapons/**`, `game/public/textures/city-floor.webp`, anims em `shared/anims/`.
2. **Final na UI de classe:** `game/public/boot/assets/char-*.png` + `face-*.png`.
3. **Placeholder de painéis:** tudo sob `visual/telas/assets/{skills,eq,items}/`.
4. **Debug / órfão:** `TK/anims/*` (cópia), `visual/telas/assets/char-*.jpg`, tool `save-wipe`.
5. **Falta:** áudio, dungeon art, monstro/NPC/árvore GLB, VFX/shader em arquivo.

Varredura feita em 2026-09-20 (Shell + Glob + Grep nos paths do aceite I5).

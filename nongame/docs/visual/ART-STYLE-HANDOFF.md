# ART-STYLE HANDOFF — UAIDZIN UI

Documento canônico para **qualquer agente** criar, estender ou revisar telas do UAIDZIN.  
Fonte viva do visual: este arquivo + `visual/DECISOES-ESTILO.md` (decisões travadas).  
Código jogável: `game/`. Protótipos: `visual/telas/`.

Antes de inventar cor, botão, moldura ou ícone: **releia as Regras duras** no fim.

---

## 1. Identidade (uma frase)

**Nórdico medieval de salão / brasa** — ferro trabalhado, bronze quente, creme de pergaminho, gelo só como acento de magia/dungeon.  
Não cartoon. Não sci-fi clean. Não roxo-neon. Não emoji.

---

## 2. Tokens CSS obrigatórios

Copiar este bloco em toda tela HTML standalone (`:root`). No jogo Vite os mesmos tokens vivem em `game/src/style.css`.

```css
:root{
  --bg0:#100c08; --bg1:#241c14; --bg2:#2e241a;
  --iron:#3d3228; --iron-hi:#5a4a38;
  --gold:#d4a017; --gold-hi:#e8c547; --gold-dim:#8a6d18;
  --blood:#a33b3b; --blood-hi:#d45555;
  --frost:#5b9fd4; --mp:#3b7dd4; --ok:#3d9a6a;
  --ink:#f0e6d0; --ink-dim:#b8a88c; --ink-mute:#7a6b58;
  --r-comum:#8b9aab; --r-incomum:#3d8b4a; --r-raro:#3b7dd4;
  --r-epico:#8b4ac9; --r-lendario:#c9a227;
  --font-display:Georgia,"Palatino Linotype","Book Antiqua",Palatino,serif;
  --font-ui:"Segoe UI",Tahoma,system-ui,sans-serif;
  --font-num:ui-monospace,Consolas,monospace;
  --panel:#16100a;
}
```

| Token | Uso |
|---|---|
| `--bg0` | Fundo profundo, letterbox, body |
| `--bg1` / `--bg2` | Superfície de painel / gradiente |
| `--iron` / `--iron-hi` | Bordas, botões neutros |
| `--gold` / `--gold-hi` | Acento, CTA, título, raridade lendária |
| `--blood` | Perigo, excluir, HP &lt; 40% |
| `--frost` | Skills/magia, rótulos de árvore |
| `--ink*` | Texto (principal / secundário / mudo) |
| `--r-*` | Borda/glow de raridade de item |

Frost e verdigris são **acento de sistema**, nunca base de tela.

---

## 3. Tipografia

| Papel | Fonte | Exemplo |
|---|---|---|
| Display | `--font-display` | Título UAIDZIN no login, nomes lendários |
| UI | `--font-ui` | Labels, botões, HUD nome (legível) |
| Números | `--font-num` | HP, ouro, timer, nível |
| Runas | Elder Futhark | Ornamento: `ᚠ ᚢ ᚦ ᚨ ᚱ ᛉ` |

HUD pequena: preferir `--font-ui` bold + sombra forte (serif fina some em 10–12px).

Texto de UI: `user-select: none` no `html, body`. Exceção: `input`, `textarea`, `[contenteditable]`.

---

## 4. Layout de tela (protótipo HTML)

Toda tela em `visual/telas/*.html`:

1. `lang="pt-BR"`, **um arquivo**, CSS inline, **sem CDN**.
2. Palco **1600×900** (`.stage`), escala via JS (`scale = min(iw/1600, ih/900)`).
3. Letterbox preto no `.viewport` (não usar `aspect-ratio` junto de width/height fixos).
4. Assets relativos em `visual/telas/assets/` (no jogo: `/wire/assets/` ou `/faces/`).

Receita mínima:

```html
<div class="viewport">
  <div class="stage" id="stage">…conteúdo…</div>
</div>
<script>
function fitStage(){
  const stage = document.getElementById("stage");
  const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
  stage.style.transform = "scale(" + s + ")";
  const mx = (1600 * s - 1600) / 2;
  const my = (900 * s - 900) / 2;
  stage.style.margin = my + "px " + mx + "px";
}
window.addEventListener("resize", fitStage);
fitStage();
</script>
```

---

## 5. Moldura A — ferro + cantos ouro (default de painel)

### Estrutura correta (gameplay panels)

```text
.win
  ├── .win-h          ← título (sem cantos)
  └── .win-main       ← position:relative; cantos AQUI
        ├── .corner.tl/tr/bl/br
        ├── .win-b    ← conteúdo
        └── (opcional .power-zone / rodapé)
```

Cantos **não** sobem no cabeçalho. SVG padrão:

```html
<svg class="corner tl" viewBox="0 0 18 18"><path d="M1 17 V5 Q1 1 5 1 H17"/></svg>
```

CSS: `stroke:var(--gold); fill:none; stroke-width:1.6;` + mirrors `tr`/`bl`/`br` com `scaleX(-1)` / `scaleY(-1)` / `scale(-1)`.

Painel: borda `#6a5638`, fundo **opaco** (`--panel` / gradiente `#2a2118 → #1a140e`), inset shadow escuro + filete gold suave. Sem alpha — o mundo 3D não aparece atrás.

Conteúdo (`.win-b`): `padding: 14px 10px 10px` — topo um pouco maior que laterais/baixo para o texto não colar nos cantos ouro do `.win-main`.

Moldura **D (couro)**: só tooltips/flavor de salão — nunca HUD de combate nem slots de inventário.

---

## 6. Botões

| Tipo | Quando | Forma |
|---|---|---|
| Ouro | CTA primário (Confirmar, Salvar, Evoluir) | Retângulo `border-radius: 2px` |
| Ferro | Neutro (Fechar, Continuar) | Idem |
| Perigo | Excluir / reset | Retângulo vermelho |
| Ghost | Cancelar secundário | Borda iron, texto `--ink-dim` |
| Frost | Ação de skill/magia | Acento frost |
| **Escudo** | **Só** Entrar no login e empty-state “Criar Personagem” | `clip-path` de escudo |

Engrenagem de opções: path **sólido** legível a 18px (não wireframe fino).

---

## 7. Inventário de UIs (o que existe hoje)

### 7.1 Boot / hub (fora do mundo 3D)

| Tela | Arquivo fonte | Runtime |
|---|---|---|
| Login | `visual/telas/01-login.html` | `game/public/boot/01-login.html` (iframe BootFlow) |
| Seleção de personagem | `visual/telas/02-selecao-personagem.html` | `game/public/boot/02-…` |
| Opções (modal) | Embutido em login/seleção | Mesmo padrão no HUD (`#overlay-settings`) |

Fluxo: Login → sessão → Seleção → `uaidzin-boot-enter` → cidade 3D.

Conta protótipo: **admin / admin** (`save-store.js`).

### 7.2 Painéis cidade (wire overlay)

| Painel | Tecla | Arquivo | Notas |
|---|---|---|---|
| Personagem | C | `03-wire-paineis-cidade.html` `#p-person` | Face, attrs, spec, combate, **Poder** centralizado no espaço livre |
| Técnicas | K | `#p-skills` | 3 árvores × **12** (grade 6×2) + Special **12**; exclusão mútua com coluna NPC |
| Equipamento / bolsa | I | `#p-inv` | Paperdoll + Bolsa I–IV; rodapé: **Lixeira** + **Organizar** + **Equipar** (+ **Guardar** só com baú aberto); ouro à direita |
| Baú | — (prop 3D) | `#p-vault` | Clique no baú 3D (`vault-chest`); abre **junto** com inventário; drag itens bolsa↔baú; **Guardar** despeja a bolsa no baú até encher; depositar/sacar ouro (cap 2.000.000.000) |
| Loja | — (NPC) | `#p-shop` | Mesmo shell Mercador/Ferreiro; grade até 16 cards (4×4); detalhe abaixo no hover; estoque em `game-config.json` → aba Lojas |
| Guarda do Portal | — (NPC) | `#p-portal` | Cards de dungeon (desc, nível, inimigos, entrada); abas Mortal / Arch🔒 / Cele🔒; filtro “Disponíveis”; confirmação + skip; consome item e teleporta |
| Mestre de Skills | — (NPC) | `#p-person` + `#p-skills` + `#p-skillmaster` | Personagem esq. + Técnicas (compradas) meio + loja do mestre dir. (árvores 1–8; 9–12 cadeado; sem livros; grade **6×2** sem scroll); dblclick compra; hover do detalhe: pontos + ouro |
| Sábio | — (NPC) | `#p-sage` | Guia em **2 abas** (Fundamentos / Progressão); índice à esquerda + texto à direita; scroll fino; abre **junto** com inventário |
| Compositor | — (NPC) | `#p-composer` | Catálogo 6 cards (+10 / +12 / Anct / Jewels + 2 travados), sem scroll; ao abrir opção → bancada vazia + inventário |
| Mestre de Quests | — (NPC) | `#p-quest` | Shell vazio **2 colunas**, centralizado; abre **sozinho** |

Coluna do meio (skills / Baú / loja / NPCs): só um aberto por vez.  
Legenda inferior: `C · K · I · Esc` — **sem** atalho de NPC.

Área dos painéis (`.wins`): **680px** de altura no palco; `.win` com `min-height:0` + `max-height:100%`; fechado = `display:none` (nunca `visibility:hidden` — isso inflava o grid e cortava o ×).

Montagem no jogo: `game/src/ui/WireUi.ts` fetch `/wire/03-wire-paineis-cidade.html` (plugin Vite → `visual/telas`).

### 7.3 HUD gameplay (`game/index.html` + `style.css`)

| Elemento | Onde | Conteúdo |
|---|---|---|
| Player frame | canto SE | Face classe, `Lv`, **nome do personagem**, HP/MP/XP |
| Speed + settings | canto SD | `1× 2× 4× 10×` + engrenagem → Opções |
| Hotbar skills | wire / legado | 10 slots (wire); anel de CD no legado |
| Hint | perto de portal saída | `[E] …` · NPCs **não** usam hint (só nameplate no mundo) |
| Interaction panel | diálogo E | Só portal de **saída** da dungeon (cidade: NPCs abrem wire; portal decorativo sem E) |
| World HP bar | sobre meshes | Verde ≥40%, vermelho &lt;40% |
| NPC nameplate | sobre NPCs | Nome flutuante (`.npc-nameplate`) |
| Toast | SD | Loot / level / skill |
| Death / result | overlay | Morte / fim de dungeon |

Boot flash: `index.html` tem CSS inline `#100c08` para não piscar branco antes do bundle.

### 7.4 Ainda sem tela final

Lista de dungeons, resultado de dungeon, cards de item/classe (lab reprovou), ícones finais de skill, loja completa.

---

## 8. Catálogo de arte 2D (modelos de UI)

### 8.1 Personagens (oficiais com alfa)

| Classe | Código | Face (HUD/slots) | Corpo (paperdoll / criar) |
|---|---|---|---|
| Thegn Knight | TK | `face-tk.png` | `char-tk.png` |
| Frost Maiden | FM | `face-fm.png` | `char-fm.png` |
| Beast Master | BM | `face-bm.png` | `char-bm.png` |
| Huntress | HT | `face-ht.png` | `char-ht.png` |

Paths:

- Protótipo: `visual/telas/assets/face-*.png`, `char-*.png`
- Boot: `game/public/boot/assets/`
- Jogo HUD: `game/public/faces/` → URL `/faces/face-tk.png`

UI em PT-BR pode mostrar nome PT; código usa a sigla EN (Thegn Knight, etc.).

**Proibido:** emoji, foto sem alfa, arte que não seja a chibi oficial.

### 8.2 Skills (placeholders SVG 32×32)

Pasta: `visual/telas/assets/skills/`

| Árvore (HT exemplo) | Arquivos | Cor de stroke típica |
|---|---|---|
| Armadilha | `armadilha-1.svg` … `armadilha-12.svg` | verde |
| Marca | `marca-1` … `marca-12` | roxo/frost |
| Caça | `caca-1` … `caca-12` | laranja |
| Special | `special-1` … `special-12` | ouro |

Receita de ícone skill:

- `viewBox="0 0 32 32"`, `rx="2"`
- Fundo gradiente escuro da escola
- Stroke da escola com opacidade ~0.35 no frame
- Glifo legível a **32px** (e no slot ~36–40px render)

8ª skill das árvores especializadas: highlight / glow (capstone).

### 8.3 Equipamento (paperdoll)

Pasta: `visual/telas/assets/eq/`

| Slot | Ícone cheio | Empty / lock |
|---|---|---|
| cape, crown, orb, seal, relic | `*.svg` | `*-empty.svg` |
| neck, ear, weapon, armor, ring1/2, pet, mount | idem | idem |
| Bolsa | `bag.svg` | `lock.svg` (bolsas II–IV) |

Slots: quadrado, borda iron, glow por raridade (`--r-*`).

### 8.4 Itens genéricos

Pasta: `visual/telas/assets/items/`

`ori.svg` · `lac.svg` · `potion.svg` · `book.svg` · `arrow.svg` · `gem.svg` · `rune.svg` · `leather.svg` · `scrap.svg` · `fragment.svg`

### 8.5 Raridades (borda / texto)

Comum `#8b9aab` · Incomum `#3d8b4a` · Raro `#3b7dd4` · Épico `#8b4ac9` · Lendário `#c9a227`+glow · Mítico `#d45555`+glow

---

## 9. Modelos 3D (greybox atual — não arte final)

Não há GLB de personagem ainda. Runtime Three.js:

| Entidade | Forma | Arquivo |
|---|---|---|
| Player | `CapsuleGeometry` azul | `SceneRenderer.ts` |
| Inimigos | `CapsuleGeometry` por arquétipo | `EnemyRuntimeView.ts` |
| NPCs | Cilindro corpo + cabeça | `CityWorld.makeNpcMarker` |
| Portal | Pad + anel + pillar | `CityWorld.makePortal` |
| Cidade / dungeon | Boxes + grid + arenas | `CityWorld.ts` |

NPCs com nome em UI flutuante (DOM projetado). Cores por NPC em `world/definitions.ts`.

NPC **Baú**: prop 3D `vault-chest` (não NPC); clique perto abre Inventário + Baú juntos; range `INTERACT_RANGE` (1.6).  
NPC **Mercador** / **Ferreiro**: mesmo painel `#p-shop` + Inventário; título `Mercador` ou `Ferreiro`.  
NPC **Sábio**: `#p-sage` largo (2 colunas) + Inventário; documentação do jogo (abas Fundamentos/Progressão, índice + texto).  
NPC **Compositor**: `#p-composer` catálogo 6 cards (2 travados); opção aberta → bancada vazia + inventário.  
NPC **Mestre de Skills**: Personagem (`#p-person`) + Técnicas compradas (`#p-skills`) + loja `#p-skillmaster` (3 árvores × 12; compra 1–8 com pré-req e 8ª exclusiva; 9–12 cadeado; sem Special/livros). Hover da loja: pontos + ouro. Hover em Técnicas: efeito / MP / CD (sem custo).  
NPC **Mestre de Quests**: `#p-quest` largo 2× centralizado, sozinho.  
NPC **Guarda do Portal**: `#p-portal` largo 2× centralizado; lista de dungeons Mortal (Arch/Cele trancados); confirmação de entrada; consome item e teleporta. Portal 3D atrás é só decoração (`CITY_PORTAL_PROP`), sem interação.  
NPCs de serviço: clique no modelo (ou no chão perto) dentro do range — **sem tecla E**. Portal de saída da dungeon mantém `[E]`.  
Demais NPCs de serviço: abrem o shell correspondente (sem inventário forçado).

---

## 10. Receitas de componente (copiar padrão)

### Painel de janela

Header 28px, título gold-hi centrado, `×` absolute direita.  
Corpo scroll/overflow hidden. Cantos no `.win-main`.  
`.win-b`: padding superior `14px` (laterais/baixo `10px`) — respiro sob o frame.

### Rodapé da bolsa (Equipamento)

`.inv-tools` com gap generoso (`~18px`). Cada ferramenta é `.inv-tool-wrap`:
- botão `.inv-tool` **40×40** só com ícone SVG (borda no ícone, não no texto);
- `.inv-tool-label` **fora** do botão, centralizado **abaixo**.

| Botão | Papel |
|---|---|
| Lixeira (`.trash`) | Drop de item → confirmação de descarte |
| Organizar (`.sort`) | Compacta buracos da bolsa ativa e ordena por raridade → nome → refine |
| Equipar (`.best`) | Equipa o melhor gear da bolsa nos slots válidos |
| Guardar (`.store`) | Só com baú+inv abertos; move itens da bolsa para o baú até encher (120) |
| Armar (`.best`) | Equipa o melhor de cada slot (bolsa + já equipado): raridade → refine → soma de stats |

### Tooltip de skill

`.skill-tip`: ícone + nome gold + árvore frost + meta (Nível, MP, CD, **Custo**) + descrição diegética. Sem tutorial (“arraste”, “clique”).

### Tooltip de item

Mesmo espírito: nome, raridade colorida, stats, desc. Moldura ferro.

### Modal Opções

Overlay escuro + `.settings` com cantos A + sliders volume + toggles + Fechar/Salvar.  
No jogo: extras **Trocar personagem** / **Sair da conta** (só HUD).

### Grade de skills

`.slots.s12 { grid-template-columns: repeat(6, 42px); }` → 2 linhas × 6.  
Espaço entre árvores: `.tree-block { margin-bottom: 13px; }`.

### Hotbar

Slots com anel de cooldown; skill aprendida vs vazia (grayscale). Sem número no ícone.

---

## 11. Texto e copy

- Só texto **diegético** (nome, custo, status, descrição de skill/item).
- **Proibido:** “duplo clique”, “arraste”, “passe o mouse”, legendas de mockup, emoji.
- Ouro máximo documentado: **2.000.000.000**.

---

## 12. Onde criar cada tipo de tela

| Tipo de tela | Onde editar | Como entra no jogo |
|---|---|---|
| Nova tela de hub/boot | `visual/telas/0X-….html` + espelho em `game/public/boot/` se for boot | BootFlow iframe ou link |
| Novo painel cidade | Estender `03-wire-paineis-cidade.html` | WireUi já carrega o HTML |
| HUD permanente | `game/index.html` + `game/src/style.css` + `GameApp.ts` | Sempre no `#ui-root` |
| World UI (barra/nome) | `EffectManager.ts` + CSS | Projeção câmera |
| Estilo / decisão nova | Atualizar **este arquivo** e `DECISOES-ESTILO.md` | — |

Mapa de código (local): `CODEGRAPH.md` (não versionado).

---

## 13. Checklist — nova tela (agente)

1. [ ] Paleta C + tokens `:root` completos  
2. [ ] Palco 1600×900 + letterbox + `fitStage`  
3. [ ] Moldura A; cantos **abaixo** do header se for painel  
4. [ ] Botões retângulo 2px; escudo só se for o CTA de Entrar/empty criar  
5. [ ] Zero emoji; ícones PNG/SVG existentes ou placeholder 32px no estilo  
6. [ ] Tipografia correta; números monoespaçados  
7. [ ] Copy só diegética; `user-select: none`  
8. [ ] Sem comentários no código  
9. [ ] Assets no path certo (`assets/` ou `/faces/` / `/wire/`)  
10. [ ] Se for painel cidade: exclusões (coluna do meio ↔ Técnicas/Baú/loja/NPCs) e z-index conscientes  
11. [ ] Atualizar esta doc se criar **padrão novo** aprovado  

---

## 14. Anti-padrões (não fazer)

- Cards genéricos “AI purple” / cream terracotta / broadsheet  
- Escudo em toolbar/HUD  
- Cantos SVG no título do painel  
- Atalho B para baú  
- Dual UI sem necessidade (wire é a fonte visual; `GamePanels` é fallback)  
- Inventar número de balance  
- Misturar paleta C com outra base na mesma tela  

---

## 15. Referências rápidas de arquivo

```text
visual/DECISOES-ESTILO.md          ← decisões travadas (lab)
visual/ART-STYLE-HANDOFF.md        ← este handoff (criar telas)
visual/telas/01-login.html
visual/telas/02-selecao-personagem.html
visual/telas/03-wire-paineis-cidade.html
visual/telas/assets/{eq,items,skills,face-*,char-*}
visual/ui-style-gallery.html       ← lab histórico
game/src/style.css                 ← HUD runtime
game/src/ui/WireUi.ts
game/src/app/GameApp.ts
game/src/app/BootFlow.ts
game/public/faces/
game/public/boot/
```

---

*Atualizar este arquivo sempre que o Felipe aprovar um padrão visual novo ou um asset oficial substituir placeholder.*

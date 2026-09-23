# UAIDZIN — Assets de cenário das dungeons

Catálogo de props e kits de bioma para as 8 dungeons Mortal. Espelha o padrão da cidade (`/models/city/*.glb` + refs em `WYD_Chibi_References/City/`).

Fonte de regras: `PLAN-dungeons-mortal-1-400.md`, `10-dungeons-e-level-design.md`.  
Código de referência: `game/src/world/CityProps.ts`, `game/public/models/city/`.

## Padrão (igual cidade)

| Camada | Cidade (já existe) | Dungeon (alvo) |
|---|---|---|
| Mesh runtime | `game/public/models/city/{id}.glb` | `game/public/models/dungeons/{bioma}/{id}.glb` |
| Ref Gemini | `WYD_Chibi_References/City/{Nome}.jpg` + cortes | `WYD_Chibi_References/Dungeons/{Bioma}/{Nome}.jpg` + cortes |
| Registro TS | `CityPropId` + `CITY_PROP_SPECS` | `DungeonPropId` + specs por bioma (a criar) |
| Chão | `/textures/city-floor.webp` | `/textures/dungeons/{bioma}-floor.webp` |
| Scenery barato | `CityScenery.ts` (árvores instanced) | `DungeonScenery.ts` por bioma (fog + 1–2 meshes instanced) |

### Spec de cada prop (contrato)

Cada peça precisa de:

1. **Id kebab-case** (`tombstone-a`, `forge-anvil`).
2. **Nome arquivo ref** PascalCase (`Lapide_A.jpg`).
3. **Bounding box** aproximada (largura × profundidade × altura em unidades de modelo, como cidade).
4. **Altura alvo no mundo** (metros de jogo).
5. **Uso:** limite / decor / transição / chão.

### Formato da ref Gemini (prop)

Mesmo espírito dos props de cidade (folha limpa, sem texto):

```text
3D game prop modeling sheet of a {PROP}, featuring orthographic views side-by-side: Front, Side, and Top, exact same scale. Strictly matching the stylized 3D vinyl miniature look of Image 1 (city props / StyleReference). Soft studio lighting, solid neutral light gray background, 1:1 square frame, clean PBR-ready game asset for Blender. Strictly NO text, NO labels, NO typography, NO watermark. PROP: {DETAIL}
```

Anexo: Image 1 = style ref dos props de cidade (ex.: `Muralha_Pedra` ou `Barraca_Mercado_Geral`).

### Regras duras

- Low-poly, silhueta legível à distância da câmera do jogo.
- Sem arma solta em prop de dungeon (exceto se for decoração ambiental fixa tipo rack da cidade).
- Kits reutilizáveis: Jardim e Santuário compartilham o mesmo bioma.
- Greybox primeiro; GLB final depois da ref aprovada.

## Inventário cidade (referência)

Já no jogo (`CityProps.ts`):

| Id | GLB | Ref pasta City |
|---|---|---|
| `wall` | `wall.glb` | `Muralha_Pedra` |
| `fountain` | `fountain.glb` | `Chafariz_Grande_Niveis` |
| `fountain-simple` | `fountain-simple.glb` | `Chafariz_Leao` |
| `stall-1` | `stall-1.glb` | `Barraca_Mercado_Geral` / armas |
| `stall-2` | `stall-2.glb` | `Barraca_Joias` / tecidos / poções |
| `weapon-rack` | `weapon-rack.glb` | `Barraca_Armas` |
| `stall-bakery` | `stall-bakery.glb` | `Barraca_Padaria_Forno` |
| `wagon` | `wagon.glb` | `Carroca_Mercador` |
| `bulletin-board` | `bulletin-board.glb` | `Quadro_Avisos` |

Chão: `Piso_Pedra_Cobblestone` → `city-floor.webp`.  
Extra ref: `Portico_Madeira`, `Palanque_Madeira`, `Taverna_Composicao_Conceito`.

---

## Contagem total dungeon

| Bioma | Dungeons | Props únicos | Transições | Chão |
|---|---|---:|---:|---:|
| campo | D1 | 6 | 1 | 1 |
| cemiterio | D2 | 7 | 1 | 1 |
| jardim | D3 + D4 | 8 + 4 extras D4 | 1 | 1 |
| kaizen | D5 | 7 | 1 | 1 |
| hydra | D6 | 6 | 1 | 1 |
| elfo | D7 | 6 | 1 | 1 |
| deserto | D8 | 7 | 1 | 1 |
| **Total** | | **~52** | **7** | **7** |

Prioridade de produção: Campo → Cemitério → Kaizen → Deserto → Jardim → Hydra → Elfo.

---

## Bioma `campo` — Campo de Treino (D1)

Pasta ref: `Dungeons/Campo/` · GLB: `/models/dungeons/campo/`

| Id | Nome ref | Altura alvo | Papel |
|---|---|---:|---|
| `campo-ground` | `Piso_Campo` (textura) | — | chão grama seca + madeira |
| `campo-fence` | `Cerca_Tora` | 1.2 | limite arena |
| `campo-target` | `Alvo_Arco` | 1.4 | decor |
| `campo-bench` | `Bancada_Treino` | 0.9 | decor |
| `campo-barrel` | `Barril_Campo` | 0.85 | decor |
| `campo-torch-off` | `Tocha_Apagada` | 1.6 | decor |
| `campo-arch` | `Arco_Madeira` | 2.8 | transição arena |

### Prompts

**Cerca_Tora**
```
3D game prop modeling sheet of a low wooden training-camp fence segment, featuring orthographic views side-by-side: Front, Side, and Top, exact same scale. Strictly matching the stylized 3D vinyl miniature look of Image 1 (city props / StyleReference). Soft studio lighting, solid neutral light gray background, 1:1 square frame, clean PBR-ready game asset for Blender. Strictly NO text, NO labels, NO typography, NO watermark. PROP: Short rustic log fence, rope bindings, warm oak wood, single modular segment tileable.
```

**Alvo_Arco**
```
3D game prop modeling sheet of a wooden archery target stand, featuring orthographic views side-by-side: Front, Side, and Top, exact same scale. Strictly matching the stylized 3D vinyl miniature look of Image 1 (city props / StyleReference). Soft studio lighting, solid neutral light gray background, 1:1 square frame, clean PBR-ready game asset for Blender. Strictly NO text, NO labels, NO typography, NO watermark. PROP: Round straw target on wooden post, red-white rings, training camp feel, no weapons attached.
```

**Bancada_Treino**
```
3D game prop modeling sheet of a simple wooden training bench table, featuring orthographic views side-by-side: Front, Side, and Top, exact same scale. Strictly matching the stylized 3D vinyl miniature look of Image 1 (city props / StyleReference). Soft studio lighting, solid neutral light gray background, 1:1 square frame, clean PBR-ready game asset for Blender. Strictly NO text, NO labels, NO typography, NO watermark. PROP: Low rustic workbench, empty surface, no weapons, rope and wood only.
```

**Barril_Campo**
```
3D game prop modeling sheet of a wooden barrel prop, featuring orthographic views side-by-side: Front, Side, and Top, exact same scale. Strictly matching the stylized 3D vinyl miniature look of Image 1 (city props / StyleReference). Soft studio lighting, solid neutral light gray background, 1:1 square frame, clean PBR-ready game asset for Blender. Strictly NO text, NO labels, NO typography, NO watermark. PROP: Classic wooden barrel with iron bands, training yard storage.
```

**Tocha_Apagada**
```
3D game prop modeling sheet of an unlit wooden torch on a stake, featuring orthographic views side-by-side: Front, Side, and Top, exact same scale. Strictly matching the stylized 3D vinyl miniature look of Image 1 (city props / StyleReference). Soft studio lighting, solid neutral light gray background, 1:1 square frame, clean PBR-ready game asset for Blender. Strictly NO text, NO labels, NO typography, NO watermark. PROP: Vertical stake torch, cold blackened tip, no flame, daytime training field.
```

**Arco_Madeira**
```
3D game prop modeling sheet of a wooden arch gateway for arena transition, featuring orthographic views side-by-side: Front, Side, and Top, exact same scale. Strictly matching the stylized 3D vinyl miniature look of Image 1 (city props / StyleReference). Soft studio lighting, solid neutral light gray background, 1:1 square frame, clean PBR-ready game asset for Blender. Strictly NO text, NO labels, NO typography, NO watermark. PROP: Simple timber arch, walk-through opening, rope ties, training camp gate between yards.
```

Luz: sol alto, sem névoa. Fog color desligado ou `#c8c2b4` bem claro.

---

## Bioma `cemiterio` — Cemitério de Cinzas (D2)

Pasta: `Dungeons/Cemiterio/` · GLB: `/models/dungeons/cemiterio/`

| Id | Nome ref | Altura alvo | Papel |
|---|---|---:|---|
| `cinza-ground` | `Piso_Cinza` | — | terra rachada |
| `cinza-wall` | `Mureta_Cemiterio` | 1.4 | limite |
| `cinza-gate` | `Portao_Ferrugem` | 2.6 | transição |
| `cinza-tomb-a` | `Lapide_A` | 1.1 | decor |
| `cinza-tomb-b` | `Lapide_B` | 1.2 | decor |
| `cinza-tomb-c` | `Lapide_C` | 0.9 | decor |
| `cinza-urn` | `Urna_Cinza` | 0.7 | decor |
| `cinza-tree-dead` | `Arvore_Morta` | 3.2 | scenery |

### Prompts (resumo CHARACTER)

- **Mureta_Cemiterio:** low broken stone wall segment, iron spikes optional short, ash-stained.
- **Portao_Ferrugem:** rusty iron cemetery gate arch, open passage, no weapons.
- **Lapide_A/B/C:** three weathered tombstone variants (cross, rounded, cracked slab), blank faces no text.
- **Urna_Cinza:** stone funerary urn, ash gray, closed lid.
- **Arvore_Morta:** leafless gnarled dead tree, dark bark, sparse.

Luz: céu cinza, fog `#2a2420`, pontos de fogo frio (emissive low cyan).

---

## Bioma `jardim` — Jardim + Santuário (D3 / D4)

Pasta: `Dungeons/Jardim/` · GLB: `/models/dungeons/jardim/`  
D4 adiciona 4 props em `Dungeons/Jardim/Santuario/`.

| Id | Nome ref | Altura | Papel | Onde |
|---|---|---:|---|---|
| `jardim-ground` | `Piso_Jardim` | — | chão | D3+D4 |
| `jardim-hedge` | `Sebe_Hera` | 1.5 | limite | D3+D4 |
| `jardim-column` | `Coluna_Hera` | 2.4 | limite/decor | D3+D4 |
| `jardim-fountain-dry` | `Fonte_Seca` | 1.3 | decor | D3+D4 |
| `jardim-vase` | `Vaso_Pedra` | 0.8 | decor | D3+D4 |
| `jardim-arch` | `Arco_Pedra_Veu` | 2.9 | transição | D3+D4 |
| `jardim-pedestal` | `Pedestal_Jardim` | 1.0 | decor | D3+D4 |
| `santu-altar` | `Altar_Veu` | 1.2 | decor | **só D4** |
| `santu-window` | `Vitral_Quebrado` | 2.0 | decor plano | **só D4** |
| `santu-column-broke` | `Coluna_Partida` | 2.2 | decor | **só D4** |
| `santu-brazier` | `Braseiro_GeloBrasa` | 1.1 | decor | **só D4** |

### Prompts-chave

- **Sebe_Hera:** leafy hedge wall segment, soft green, tileable.
- **Fonte_Seca:** dry stone garden fountain, no water, moss.
- **Arco_Pedra_Veu:** stone garden arch with hanging veil cloth.
- **Altar_Veu:** stone sanctuary altar, empty, soft green runes glow very subtle.
- **Vitral_Quebrado:** broken stained-glass frame as flat prop, empty panes.
- **Braseiro_GeloBrasa:** brazier mixing frost-blue and ember-orange glow, no tools.

Luz: filtrada; fog verde-acinzentado leve. D4 mais fechado / sombra.

---

## Bioma `kaizen` — Forja de Kaizen (D5)

Pasta: `Dungeons/Kaizen/` · GLB: `/models/dungeons/kaizen/`

| Id | Nome ref | Altura | Papel |
|---|---|---:|---|
| `kaizen-ground` | `Piso_Forja` | — | ferro + cinza |
| `kaizen-wall` | `Parede_Fornalha` | 2.5 | limite |
| `kaizen-door` | `Porta_Ferro` | 2.7 | transição |
| `kaizen-anvil` | `Bigorna_Kaizen` | 0.9 | decor |
| `kaizen-bellows` | `Foles_Forja` | 1.1 | decor |
| `kaizen-chain` | `Corrente_Forja` | 1.8 | decor |
| `kaizen-ingot-stack` | `Lingotes_Empilhados` | 0.6 | decor |
| `kaizen-lava-channel` | `Canal_Lava` | 0.25 | chão emissive |

Paleta: `#d4a017` / `#a33b3b` / ferro escuro (Salão/Brasa).

### Prompts-chave

- **Parede_Fornalha:** fused stone-and-iron forge wall segment with dark vents.
- **Bigorna_Kaizen:** heavy anvil prop, empty, no hammer held nearby as separate weapon prop.
- **Canal_Lava:** short modular glowing lava trough plane/mesh, contained molten channel.
- **Porta_Ferro:** iron forge door arch transition, open passageway.

Luz: laranja quente, bloom baixo, fog `#3a2214`.

---

## Bioma `hydra` — Ninho da Hydra (D6)

Pasta: `Dungeons/Hydra/` · GLB: `/models/dungeons/hydra/`

| Id | Nome ref | Altura | Papel |
|---|---|---:|---|
| `hydra-ground` | `Piso_Caverna` | — | pedra molhada |
| `hydra-wall` | `Rocha_Caverna` | 2.8 | limite |
| `hydra-gap` | `Fenda_Caverna` | 3.0 | transição |
| `hydra-stalactite` | `Estalactite` | 1.6 | decor |
| `hydra-bone` | `Osso_Grande` | 1.4 | decor |
| `hydra-egg` | `Casca_Ovo` | 0.9 | decor |
| `hydra-totem` | `Totem_Cranio` | 1.8 | decor |
| `hydra-root` | `Raiz_Caverna` | 1.2 | decor |
| `hydra-puddle` | `Poca_Agua` | 0.05 | chão plane |

Luz: azul-esverdeado, fog denso `#1a2a28`.

---

## Bioma `elfo` — Clareira Élfica (D7)

Pasta: `Dungeons/Elfo/` · GLB: `/models/dungeons/elfo/`

| Id | Nome ref | Altura | Papel |
|---|---|---:|---|
| `elfo-ground` | `Piso_Musgo` | — | musgo + raiz |
| `elfo-trunk` | `Tronco_Oco` | 2.6 | limite |
| `elfo-arch` | `Arco_Galhos` | 2.9 | transição |
| `elfo-menhir` | `Menir_Runa` | 2.2 | decor |
| `elfo-lantern` | `Lampiao_Frio` | 1.5 | decor |
| `elfo-bridge` | `Ponte_Raiz` | 0.6 | decor/path |
| `elfo-altar` | `Altar_Folha` | 1.0 | decor |

Acento frost `#5b9fd4`. Fog azulada leve.

---

## Bioma `deserto` — Deserto de Ossos (D8)

Pasta: `Dungeons/Deserto/` · GLB: `/models/dungeons/deserto/`

| Id | Nome ref | Altura | Papel |
|---|---|---:|---|
| `deserto-ground` | `Piso_Areia` | — | areia + pedra |
| `deserto-dune` | `Duna_Baixa` | 1.0 | limite |
| `deserto-rib-arch` | `Arco_Ossos` | 3.2 | transição |
| `deserto-skull` | `Cranio_Gigante` | 2.0 | decor |
| `deserto-obelisk` | `Obelisco_Erodido` | 2.8 | decor |
| `deserto-cactus` | `Cacto_Seco` | 1.6 | decor |
| `deserto-ruin` | `Ruina_Pedra` | 1.4 | decor |
| `deserto-cloth` | `Bandagem_Pilha` | 0.4 | decor |

Luz: sol duro, sombra longa, fog `#c9a86a` leve. Heat haze fase 2.

---

## Props compartilhados (opcional)

Reuso entre biomas se o visual couber:

| Id | Uso |
|---|---|
| `shared-rock-a` | filler pedra genérica |
| `shared-crate` | caixote madeira (campo / kaizen) |
| `shared-torch-lit` | tocha acesa (cemitério / hydra / kaizen) |

Evitar poluir: preferir kit do bioma.

---

## Pipeline (como cidade)

1. Gerar ref Gemini (folha Front/Side/Top) com Image 1 = prop de cidade.
2. Salvar em `WYD_Chibi_References/Dungeons/{Bioma}/`.
3. Modelar GLB no Blender (pivot no chão, +Y up, escala métrica).
4. Export → `game/public/models/dungeons/{bioma}/{id}.glb`.
5. Registrar em `DungeonPropSpecs` (espelho de `CITY_PROP_SPECS`: url, width, depth, height).
6. Spawn nas arenas (`dungeons-mortal.ts` / world builder).

### Checklist por bioma

- [ ] textura `*-floor.webp`
- [ ] 1 wall/fence tileable
- [ ] 4–6 props
- [ ] 1 transição
- [ ] fog + luz no world
- [ ] smoke visual (screenshot arena)

### Ordem de sprint

1. **Campo** (fecha onboarding; refs Training Camp já existem na pasta)
2. **Cemitério**
3. **Kaizen** (identidade brasa)
4. **Deserto**
5. **Jardim** (+ extras Santuário)
6. **Hydra**
7. **Elfo**

---

## Pasta sugerida no Desktop

```
WYD_Chibi_References/
  City/                 ← já feito
  Training Camp/        ← refs conceito D1
  Dungeons/
    Campo/
    Cemiterio/
    Jardim/
      Santuario/
    Kaizen/
    Hydra/
    Elfo/
    Deserto/
```

No repo:

```
game/public/models/dungeons/{bioma}/*.glb
game/public/textures/dungeons/{bioma}-floor.webp
```

---

## Texturas de chão (seamless)

Formato runtime: `game/public/textures/dungeons/{bioma}-floor.webp` (tile 1K ou 2K, square).  
Ref Gemini: `WYD_Chibi_References/Dungeons/{Bioma}/Piso_{Nome}.jpg`.  
Style ref Image 1: `City/Piso_Pedra_Cobblestone.jpg` (ou o floor da cidade já aprovado).

### Template Gemini (chão)

```text
Seamless tileable top-down ground texture for a stylized 3D fantasy game, matching the art style of Image 1. Perfect seamless repeating pattern on all four edges, no visible seams when tiled. Flat orthographic top-down view only, fill the entire 1:1 square frame edge-to-edge. Soft even studio lighting, no strong shadows, no perspective, no characters, no props, no text, no labels, no watermark. Stylized clean PBR albedo look ready for game engine tiling. GROUND: {DETAIL}
```

### Lista (7 biomas)

| Bioma | Arquivo | Id textura |
|---|---|---|
| campo | `Piso_Campo.jpg` → `campo-floor.webp` | grama seca + madeira |
| cemiterio | `Piso_Cinza.jpg` → `cemiterio-floor.webp` | terra rachada + laje |
| jardim | `Piso_Jardim.jpg` → `jardim-floor.webp` | grama + pedra |
| kaizen | `Piso_Forja.jpg` → `kaizen-floor.webp` | ferro + cinza |
| hydra | `Piso_Caverna.jpg` → `hydra-floor.webp` | pedra molhada |
| elfo | `Piso_Musgo.jpg` → `elfo-floor.webp` | musgo + raiz |
| deserto | `Piso_Areia.jpg` → `deserto-floor.webp` | areia + pedra |

### Prompts prontos

#### 1. Piso_Campo (`campo-floor`)
```
Seamless tileable top-down ground texture for a stylized 3D fantasy game, matching the art style of Image 1. Perfect seamless repeating pattern on all four edges, no visible seams when tiled. Flat orthographic top-down view only, fill the entire 1:1 square frame edge-to-edge. Soft even studio lighting, no strong shadows, no perspective, no characters, no props, no text, no labels, no watermark. Stylized clean PBR albedo look ready for game engine tiling. GROUND: Dry training-field packed dirt mixed with short dried grass patches and occasional weathered wooden plank inlays, warm beige-brown and muted olive tones, soft stylized vinyl miniature look, low contrast, quiet detail density.
```

#### 2. Piso_Cinza (`cemiterio-floor`)
```
Seamless tileable top-down ground texture for a stylized 3D fantasy game, matching the art style of Image 1. Perfect seamless repeating pattern on all four edges, no visible seams when tiled. Flat orthographic top-down view only, fill the entire 1:1 square frame edge-to-edge. Soft even studio lighting, no strong shadows, no perspective, no characters, no props, no text, no labels, no watermark. Stylized clean PBR albedo look ready for game engine tiling. GROUND: Cracked dark ash soil with broken pale stone slab fragments and fine gravel, cool gray-brown cemetery dirt, subtle moss in cracks, gloomy muted palette, soft stylized miniature look.
```

#### 3. Piso_Jardim (`jardim-floor`)
```
Seamless tileable top-down ground texture for a stylized 3D fantasy game, matching the art style of Image 1. Perfect seamless repeating pattern on all four edges, no visible seams when tiled. Flat orthographic top-down view only, fill the entire 1:1 square frame edge-to-edge. Soft even studio lighting, no strong shadows, no perspective, no characters, no props, no text, no labels, no watermark. Stylized clean PBR albedo look ready for game engine tiling. GROUND: Lush garden path mix of soft green grass tufts and pale irregular flagstones with ivy edges, gentle mint and cream tones, clean stylized miniature look, medium soft detail.
```

#### 4. Piso_Forja (`kaizen-floor`)
```
Seamless tileable top-down ground texture for a stylized 3D fantasy game, matching the art style of Image 1. Perfect seamless repeating pattern on all four edges, no visible seams when tiled. Flat orthographic top-down view only, fill the entire 1:1 square frame edge-to-edge. Soft even studio lighting, no strong shadows, no perspective, no characters, no props, no text, no labels, no watermark. Stylized clean PBR albedo look ready for game engine tiling. GROUND: Dark iron forge floor plates with soot ash dust and faint orange heat stains in metal seams, charcoal and rust-brown palette with subtle gold ember accents, stylized Salão/Brasa look, no molten lava floods.
```

#### 5. Piso_Caverna (`hydra-floor`)
```
Seamless tileable top-down ground texture for a stylized 3D fantasy game, matching the art style of Image 1. Perfect seamless repeating pattern on all four edges, no visible seams when tiled. Flat orthographic top-down view only, fill the entire 1:1 square frame edge-to-edge. Soft even studio lighting, no strong shadows, no perspective, no characters, no props, no text, no labels, no watermark. Stylized clean PBR albedo look ready for game engine tiling. GROUND: Wet cave stone with glossy damp patches and shallow puddle reflections, teal-gray rock, soft moss flecks, humid underground look, stylized miniature albedo without harsh specular blowouts.
```

#### 6. Piso_Musgo (`elfo-floor`)
```
Seamless tileable top-down ground texture for a stylized 3D fantasy game, matching the art style of Image 1. Perfect seamless repeating pattern on all four edges, no visible seams when tiled. Flat orthographic top-down view only, fill the entire 1:1 square frame edge-to-edge. Soft even studio lighting, no strong shadows, no perspective, no characters, no props, no text, no labels, no watermark. Stylized clean PBR albedo look ready for game engine tiling. GROUND: Soft thick forest moss carpet with thin roots and pale bark chips, cool green with frost-blue tint accents, ethereal elven glade floor, clean stylized miniature look.
```

#### 7. Piso_Areia (`deserto-floor`)
```
Seamless tileable top-down ground texture for a stylized 3D fantasy game, matching the art style of Image 1. Perfect seamless repeating pattern on all four edges, no visible seams when tiled. Flat orthographic top-down view only, fill the entire 1:1 square frame edge-to-edge. Soft even studio lighting, no strong shadows, no perspective, no characters, no props, no text, no labels, no watermark. Stylized clean PBR albedo look ready for game engine tiling. GROUND: Fine desert sand with subtle wind ripples and scattered cracked pale stone flakes, warm gold-beige palette, dry bone-dust feel, soft stylized miniature look, low noise.
```

### Uso no jogo

- Importar como albedo, wrap repeat (cidade usa `repeat.set(7,7)` em `CityGround.ts`).
- Converter para `.webp` em `game/public/textures/dungeons/`.
- Evitar patterns com círculo grande ou elemento único no centro (quebra o tile).

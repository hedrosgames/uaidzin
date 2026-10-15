# Prompts de Atlas VFX — BeastMaster (BM)

Prompts profissionais de geração de arte (4×4, 16 frames, atlas transparente/fundo preto) para todas as 24 skills da classe **BeastMaster** no UAIDZIN, alinhados à disciplina do FireBurst e aos briefs em `Planos/VFX Skills/BM/`.

Pipeline de processamento:
1. Geração via ferramenta integrada (`generate_image`) com fundo sólido preto `#000000`.
2. Extração para PNG transparente (RGBA) de alta precisão via `game/scripts/process_spritesheet.py`.
3. Destino dos PNGs: `game/public/assets/vfx/spritesheets/skills/BM/<skill_id>.png`.

---

## 1. Árvore Natureza (Física)

### `bm_fis_lobo_guerreiro` — Lobisomem (Concluído)
- **Status:** Gerado e calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_fis_lobo_guerreiro.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Werewolf Lobisomem feral transformation for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver, cold moonlight cyan, glowing pale blue, deep violet shadows. Ethereal moonlit beast fur silhouette expanding, glowing claws tearing through air, lunar energy wisps. Frames 1-2 gathering pale moonlight wisps; frames 3-5 spectral wolf phantom emerges over caster with glowing silver eyes; frames 6-9 peak feral burst with radiant moonlight slash ribbons, crescent energy rings and expanding wolf aura; frames 10-12 ethereal fur ribbons condensing; frames 13-15 dissipating silver lunar motes; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_fis_couro_fera` — Couro de Fera
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_fis_couro_fera.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Beast Hide (Couro de Fera) protective armor buff for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: warm golden bronze, hardened amber, deep earth brown, glowing golden veins. Thick crystalline armor plates locking around caster. Frames 1-2 amber mineral dust rising around feet; frames 3-5 hexagonal hardened scales and beast carapace interlocking; frames 6-9 peak defensive burst with glowing amber shield crest and radiant golden shockwave; frames 10-12 solidifying heavy armor barrier; frames 13-15 fading earthen motes; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_fis_furia_selvagem` — Fúria Selvagem
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_fis_furia_selvagem.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Savage Fury (Furia Selvagem) berserk aura buff for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: fiery crimson, bright molten amber, golden orange sparks, dark blood burgundy. Roaring feral energy flames erupting vertically. Frames 1-2 fiery embers sparking around caster; frames 3-5 surging crimson flame ribbons swirling upward; frames 6-9 peak explosive feral fury with roaring beast face silhouette inside volcanic flame burst; frames 10-12 fiery aura contracting into pulsing veins; frames 13-15 drifting hot ember sparks; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_fis_investida` — Investida Bestial
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_fis_investida.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Beast Charge (Investida Bestial) rush impact for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: dust ochre, fiery orange, bronze streaks, pale gold shockwave. High speed beast dash tearing ground. Frames 1-2 crouching pressure build-up and dust puff; frames 3-5 explosive forward dash with roaring beast head energy cone and motion blur trails; frames 6-9 violent impact shockwave rupturing earth with flying rock chunks; frames 10-12 concussive dust ring expanding; frames 13-15 settling dirt particles; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_fis_garra_brutal` — Garra Brutal
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_fis_garra_brutal.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Brutal Claw (Garra Brutal) melee slash for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: sharp bone white, glowing ivory, blood crimson trail, amber edge glint. Triple curved predatory claw tears across screen. Frames 1-2 three glowing ivory claw tips unsheathing; frames 3-5 ferocious arc slash tearing three luminous curved wound channels; frames 6-9 peak devastating claw laceration with explosive crimson blood splatter and radiating pressure blades; frames 10-12 dissipating jagged slash trails; frames 13-15 fading blood-ember droplets; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_fis_ursao` — Forma de Urso (Concluído)
- **Status:** Gerado e calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_fis_ursao.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Ancient Bear Urso transformation for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: warm amber, golden ochre, earthy bronze, glowing honey highlights. Primal spirit bear silhouette emerging, golden claws, floating earthen dust runes. Frames 1-2 glowing amber earth runes on ground; frames 3-5 massive golden spirit bear torso manifests roaring; frames 6-9 peak beast transformation with explosive amber shockwave, radiant golden fur ribbons and roaring bear silhouette; frames 10-12 spirit bear aura settling into heavy golden armor energy; frames 13-15 dissipating golden spore embers; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_fis_presas_aco` — Presas de Aço
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_fis_presas_aco.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Steel Fangs (Presas de Aco) critical bite passive proc for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: polished chrome steel, sharp silver, electric cyan sparks, cold white gleam. Giant metallic beast jaws clamping shut. Frames 1-2 upper and lower steel curved fangs appearing wide open; frames 3-5 jaws snapping violently together with high velocity speed lines; frames 6-9 peak concussive bite impact with explosive metallic sparks, shattered bone shards and shock rings; frames 10-12 interlocking teeth gleaming brightly; frames 13-15 fading spark shards; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_fis_tita` — Forma de Titã (Concluído)
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_fis_tita.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Colossal Titan Golem transformation for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: dark stone grey, obsidian, molten lava orange, glowing volcanic amber fissures. Colossal stone titan silhouette erupting from cracked ground. Frames 1-2 ground cracking with bright magma fissures; frames 3-5 massive jagged rock boulders and molten plates lifting into hulking golem torso; frames 6-9 peak titan transformation with seismic volcanic blast, shattering lava rocks, bursting magma shockwave and giant stone fists slamming; frames 10-12 cooling magma armor plates locking into place; frames 13-15 dissipating volcanic smoke embers and falling rubble; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

---

## 2. Árvore Invocação (Controle)

### `bm_ctrl_condor` — Invocar Condor
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_ctrl_condor.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Summon Condor magical bird spirit for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: electric cyan, pale sky blue, bright silver, gold beak highlights. Spectral storm condor swooping down. Frames 1-2 swirling wind funnel with cyan feathers; frames 3-5 giant luminous eagle wings spreading open; frames 6-9 peak majestic condor manifestation flapping wings with blast of storm wind and glowing feathers; frames 10-12 condor ascending into hover; frames 13-15 trailing storm gusts; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_ctrl_lobo` — Invocar Lobo
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_ctrl_lobo.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Summon Wolf spiritual hunter for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver wolf grey, pale moonlight blue, forest green accents, dark indigo shadows. Ethereal spirit wolf leaping out from nature portal. Frames 1-2 glowing ring of green forest leaves and silver paw prints; frames 3-5 phantom wolf bounds forward out of mist; frames 6-9 peak wolf leap with glowing silver fur ribbons, sharp howling mouth and radiant ground burst; frames 10-12 wolf landing gracefully into prowl; frames 13-15 fading moonlight dust; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_ctrl_chamado_boss` — Chamado do Boss
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_ctrl_chamado_boss.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Alpha Roar (Chamado do Boss) summons empowerment beacon for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: royal gold, radiant amber, lion mane yellow, divine white crown rays. Majestic alpha beast crown and soundwave rings. Frames 1-2 golden crown glyph appearing above caster; frames 3-5 circular golden sonic rings bursting outward; frames 6-9 peak alpha roar blast with giant roaring lion head energy seal and radiating golden shockwave; frames 10-12 empowering golden light cascading downward onto summons; frames 13-15 sparkling golden star embers; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_ctrl_urso` — Invocar Urso
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_ctrl_urso.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Summon Bear guardian tank for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: moss green, deep earth brown, warm amber glow, stone grey. Heavy guardian spirit bear emerging from rising earth pillars. Frames 1-2 earth churning with glowing green moss runes; frames 3-5 stone spikes rising as massive bear silhouette emerges; frames 6-9 peak summon arrival with devastating paw stomp causing radial ground cracks and golden roar waves; frames 10-12 bear settling into defensive stance; frames 13-15 settling dirt and moss motes; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_ctrl_tigre` — Invocar Tigre
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_ctrl_tigre.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Summon Tiger agile striker for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: vibrant fiery orange, golden yellow stripes, blazing white claw streaks, dark amber shadows. Ferocious flaming spirit tiger pouncing forward. Frames 1-2 three burning claw scratch marks igniting on floor; frames 3-5 burning tiger leaping from fire portal; frames 6-9 peak dynamic tiger pounce with flaming tiger stripes, slashing energy trails and fiery ground explosion; frames 10-12 tiger landing in sprint; frames 13-15 dissipating orange flame embers; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_ctrl_dragao` — Invocar Dragão
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_ctrl_dragao.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Summon Dragon elite summon for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: volcanic red, blazing dragon gold, molten orange, smoky crimson. Colossal dragon head emerging from fiery vortex breathing AoE inferno. Frames 1-2 massive circular magic dragon sigil burning on ground; frames 3-5 serpentine dragon neck and horned head rising from flames; frames 6-9 peak apocalyptic dragon emergence unleashing cone of dragon breath flames with wing shockwave; frames 10-12 dragon roaring proudly; frames 13-15 fading volcanic ash sparks; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_ctrl_vinculo` — Vínculo Vital
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_ctrl_vinculo.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Life Link (Vinculo Vital) soul tether passive proc for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: emerald green, glowing jade, healing teal, golden life threads. Luminous spirit link chain connecting master and beasts. Frames 1-2 twin jade energy orbs pulsing; frames 3-5 spiraling helix chain of emerald DNA ribbons binding together; frames 6-9 peak protective bond with glowing jade life shield, heart sigil and radiating vitality pulses; frames 10-12 ethereal link chains settling into calm tether; frames 13-15 floating healing leaf sparkles; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_ctrl_exercito` — Exército Primordial
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_ctrl_exercito.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Primordial Army (Exercito Primordial) grand summon triad for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: tri-color harmony (golden eagle, silver wolf, fiery tiger), celestial amber, prismatic energy rays. Triple elemental summoning circle summoning all three beasts together. Frames 1-2 massive triangular magic ritual circle with 3 beast glyphs; frames 3-5 three luminous summoning pillars erupting simultaneously; frames 6-9 peak grand summon detonation with explosive radial shockwave, giant three-beast spirit herald and swirling elemental vortex; frames 10-12 three beast auras fanning out; frames 13-15 sparkling ceremonial dust; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

---

## 3. Árvore Elemental (Magia)

### `bm_mag_dardo_igneo` — Dardo Ígneo
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_mag_dardo_igneo.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Fire Dart (Dardo Igneo) high speed projectile for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: searing yellow, brilliant orange, flame red, dark smoke ribbons. Aerodynamic flame spear projectile flying and detonating. Frames 1-2 needle-sharp flame spear point igniting; frames 3-5 high velocity flaming arrow bullet with spiraling flame ribbons; frames 6-9 peak explosive target impact with bursting fire rings and flying magma droplets; frames 10-12 expanding spherical heat ripple; frames 13-15 dissipating smoke embers; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_mag_fenda_glacial` — Fenda Glacial
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_mag_fenda_glacial.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Glacial Fissure (Fenda Glacial) freezing projectile for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: ice crystal cyan, glacial blue, diamond white sheen, dark frosted sapphire. Sharp crystalline ice icicle missile impaling target. Frames 1-2 cluster of razor-sharp ice crystals gathering; frames 3-5 jagged ice lance shooting forward with frosted mist trail; frames 6-9 peak shattering impact with explosive burst of ice shards, freezing frost ring and encasing frost needles; frames 10-12 frosted ground spikes forming; frames 13-15 evaporating cold frost mist; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_mag_escarpa` — Escarpa Sísmica
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_mag_escarpa.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Seismic Escarpment (Escarpa Sismica) ground AoE quake for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: jagged granite grey, sandstone ochre, glowing earth amber, dust clouds. Ring of massive stone spires bursting through floor. Frames 1-2 web of ground fault fissures cracking outward; frames 3-5 sharp jagged stone spikes shooting up from earth; frames 6-9 peak seismic explosion with giant rock boulders levitating and shattering into dust with violent dirt wave; frames 10-12 ring of monolithic stone pillars crumbling; frames 13-15 falling gravel and settling dust cloud; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_mag_voz_trovao` — Voz do Trovão
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_mag_voz_trovao.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Voice of Thunder (Voz do Trovao) lightning bolt blast for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: electric violet, brilliant cyan, pure white core, deep storm indigo. Vertical jagged lightning bolt strike. Frames 1-2 dark storm charge crackling in air; frames 3-5 massive jagged lightning bolt tearing down from sky; frames 6-9 peak blinding lightning strike with explosive radial plasma ring, arc branches and electrical grounding explosion; frames 10-12 secondary dancing lightning arcs; frames 13-15 fading ionizing spark motes; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_mag_manto` — Manto Elemental
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_mag_manto.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Elemental Mantle (Manto Elemental) multi-element self aura buff for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: elemental quadrant (fire orange, ice cyan, lightning violet, earth green), radiant white core. Four swirling elemental energy ribbons wrapping around caster. Frames 1-2 four elemental spark orbs circling caster; frames 3-5 four colored ribbons spiraling upward in intertwined vortex; frames 6-9 peak elemental mantle with radiant woven elemental shield, bursting prismatic ring and rotating elemental crests; frames 10-12 mantle settling into continuous protective aura; frames 13-15 floating elemental spark motes; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_mag_corrente_agua` — Corrente de Água
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_mag_corrente_agua.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Water Torrent (Corrente de Agua) tidal surge AoE for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: deep oceanic blue, bright cyan water crests, seafoam white, translucent water ripples. Roaring spiral whirlpool tidal wave expanding outward. Frames 1-2 concentric water rings pooling on ground; frames 3-5 massive rushing spiral water vortex surging around; frames 6-9 peak crashing tidal surge with foaming wave crests, explosive water spray droplets and radial watery shockwave; frames 10-12 swirling whirlpool current subsiding; frames 13-15 mist droplets evaporating; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_mag_muralha` — Muralha de Rocha
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_mag_muralha.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Rock Wall (Muralha de Rocha) protective earth fortress for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: solid granite grey, mossy slate, glowing runes, ochre earth dust. Curved interlocking stone fortress plates slamming together. Frames 1-2 three stone foundation plates lifting out of ground; frames 3-5 thick stone wall sections interlocking with earth dust puffs; frames 6-9 peak fortified shield wall with glowing runic barrier flash and protective stone ramparts; frames 10-12 wall sections anchoring into solid defensive barrier; frames 13-15 settling stone dust; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `bm_mag_furia_quatro` — Transformação Eden (Concluído)
- **Status:** Calibrado em `game/public/assets/vfx/spritesheets/skills/BM/bm_mag_furia_quatro.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Eden Divine Winged Warrior transformation for BeastMaster RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: divine gold, solar yellow, royal ruby crimson, celestial white rays. Angelic warrior with massive radiant feathered wings erupting in holy light. Frames 1-2 holy geometric sun seal glowing on ground with ascending golden light beams; frames 3-5 huge glorious golden feathered angel wings unfurling from caster's back; frames 6-9 peak celestial transformation with blinding solar burst, radiant golden feathers blasting outward in shockwave and magnificent winged warrior silhouette; frames 10-12 divine golden armor aura pulsing with floating feather wisps; frames 13-15 falling holy golden feathers and glittering sparkles; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

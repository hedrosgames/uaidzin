# Prompts de Atlas VFX — Huntress (HT)

Prompts profissionais de geração de arte (4×4, 16 frames, atlas transparente/fundo preto) para todas as 24 skills da classe **Huntress** no UAIDZIN, alinhados à disciplina do FireBurst e aos briefs em `Planos/VFX Skills/HT/`.

Pipeline de processamento:
1. Geração via ferramenta integrada (`generate_image`) com fundo sólido preto `#000000`.
2. Extração para PNG transparente (RGBA) de alta precisão via `game/scripts/process_spritesheet.py`.
3. Destino dos PNGs: `game/public/assets/vfx/spritesheets/skills/HT/<skill_id>.png`.

---

## 1. Árvore Survival (Física)

### `ht_fis_tiro_certeiro` — Tiro Certeiro (Concluído)
- **Status:** Gerado e integrado em `game/public/assets/vfx/spritesheets/skills/HT/ht_fis_tiro_certeiro.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Tiro Certeiro physical piercing arrow shot for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver, cold green, desaturated cyan, dark violet accents. Sharp readable aerodynamic arrow silhouette, high speed trail ribbons, needle-thin pressure lines. Frames 1-2 thin silver aim line and tiny glint; frames 3-5 powerful release of pointed stylized arrow head with razor trails; frames 6-9 peak speed flight with luminous cyan-green core and trailing streaks; frames 10-12 sharp impact burst, piercing split shards; frames 13-15 dissipating spark motes; frame 16 completely empty black. Keep each shape centered within its cell. Solid black background.
```

### `ht_fis_pes_ligeiros` — Pés Ligeiros (Concluído)
- **Status:** Gerado e integrado em `game/public/assets/vfx/spritesheets/skills/HT/ht_fis_pes_ligeiros.png`
- **Prompt:**
```text
Create a production game VFX sprite atlas for Pes Ligeiros (Wind Walk / Swift Feet) buff effect for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Upward and swirling radial movement. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver, cold pale green, desaturated cyan, dark violet accents. Agile wind wisps and spiraling autumn-like stylized sharp leaves. Frames 1-2 faint pale silver wind ribbons spiraling up; frames 3-5 expanding swirling breeze curves with crisp stylized leaves caught in the draft; frames 6-9 peak double helix wind vortex with luminous green-cyan aura wisps and sharp leaf particles; frames 10-12 widening ring dissipating outward; frames 13-15 scattered fading motes and leaf fragments; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_fis_mira_aguia` — Mira de Águia
- **Status:** Pronto para gerar assim que a cota da API resetar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Mira de Aguia (Eagle Eye / Hunter Vision) aim buff for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver, cold green, desaturated cyan, gold accents. Eagle feather motifs and geometric sharp hunting reticle. Frames 1-2 faint curved silver eagle feathers floating inward; frames 3-5 sharp feathers aligning into circular crosshair sight with gold glint; frames 6-9 peak focused eagle eye reticle with glowing predatory pupil, crisp silver cross-lines and ambient glowing feather motes; frames 10-12 sight pulsing and expanding outward in fine luminous rings; frames 13-15 dissipating sharp spark shards; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_fis_tiro_congelante` — Tiro Congelante
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Tiro Congelante (Freezing Arrow) for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: ice cyan, frost blue, crisp white, deep glacial navy. Ice arrow projectile leaving frost needles and bursting into a frost ring. Frames 1-2 condensed crystal frost glint; frames 3-5 jagged crystalline ice arrowhead flying with sharp frost vapour trails; frames 6-9 peak speed ice comet arrow with frozen spike halo; frames 10-12 impact collar shattering into six sharp ice spikes and frosty needles; frames 13-15 disintegrating ice dust crystals; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_fis_sentinela` — Sentinela
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Sentinela (Sentinel Ward) perception buff for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Radial outward scanning wave. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver, pale emerald green, cold cyan. Low sweeping ground sonar ring and floating vigilance feather sigil. Frames 1-2 central emerald feather sigil appearing; frames 3-5 circular radar pulse ripple expanding across ground; frames 6-9 peak wide glowing scanner perimeter ring with floating detection runes and glowing perimeter compass ticks; frames 10-12 ring diffusing outward into thin boundary arcs; frames 13-15 fading signal motes; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_fis_flecha_rasante` — Flecha Rasante
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Flecha Rasante (Ground Skimmer Arrow) piercing line attack for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: steel silver, cold forest green, desaturated cyan, dusty gray. Heavy low-flying arrow carving a trench, kicking up dirt wisps and piercing cleanly through. Frames 1-2 heavy barbed broadhead arrowhead pointing right; frames 3-5 low trajectory projectile skimming ground with high-speed side wake wisps; frames 6-9 peak velocity piercing bolt with stylized sharp ground dust waves and trench streaks; frames 10-12 directional exit shockwave, razor slipstream trails; frames 13-15 fading gravel motes and dust puffs; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_fis_instinto` — Instinto de Caça
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Instinto de Caca (Hunter Instinct) passive proc mark for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver, crimson accent, cold cyan, shadow violet. Predatory crescent instinct mark snapping onto isolated target. Frames 1-2 faint crescent silhouette in shadow; frames 3-5 sharp hunting claws forming a target crest; frames 6-9 peak razor-sharp instinct crest snapping shut with brilliant focus glint and crimson pinpoint; frames 10-12 crest fracturing into stylized chevron shards; frames 13-15 dissolving focus particles; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_fis_rapid_hit` — Rapid Hit
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Rapid Hit (Multi-Shot Barrage) physical attack for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver, cold green, piercing white, dark violet. Rapid sequential needle arrows stitching a single puncture point. Frames 1-2 first needle arrow shooting across; frames 3-5 rapid volley of three staggered razor arrows with parallel speed lines; frames 6-9 dense cluster of overlapping piercing arrow heads striking simultaneously with multi-hit flash sparks; frames 10-12 cross-hatching slash impact cracks and split needle points; frames 13-15 dissipating flight sparks; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

---

## 2. Árvore Capture (Controle)

### `ht_ctrl_garra` — Garra Cortante
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Garra Cortante (Ripping Claw) attack for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Curved diagonal slash movement. Hand-painted stylized cartoon fantasy game VFX. Color palette: polished steel, emerald green, bronze, dark violet. Curved hooked beast claw slash tearing through target. Frames 1-2 curled silver-green claw tip starting stroke; frames 3-5 explosive curved triple claw arc tearing downward-right with sharp hollow slash ribbons; frames 6-9 peak three thick hooked claw streaks with blood-red and bronze friction embers; frames 10-12 claw lacerations separating into jagged metal splinters; frames 13-15 dissipating claw ribbons; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_ctrl_mais_um_golpe` — Mais Um Golpe
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Mais Um Golpe (Echo Strike / Double Beat) attack buff for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Hand-painted stylized cartoon fantasy game VFX. Color palette: silver, pale cyan, amber gold, dark violet. Twin rhythmic slash arcs echoing one another with temporal ghosting. Frames 1-2 primary white slash ribbon curving down; frames 3-5 primary slash reaches peak as secondary ghosted amber slash follows in identical path; frames 6-9 twin interwoven slash crescents clashing together with harmonic flash corona; frames 10-12 outer slash dissipates while inner core rings pulse; frames 13-15 fading cadence wisps; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_ctrl_presa_ferida` — Presa Ferida
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Presa Ferida (Wounded Prey) bleed debuff for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Downward dripping bleed flow. Hand-painted stylized cartoon fantasy game VFX. Color palette: rust crimson, deep burgundy, stylized silver claw edges, dark violet. Stylized laceration dripping glowing venomous crimson droplets. Frames 1-2 cross-slit puncture wound glowing red; frames 3-5 crimson teardrop droplets tearing free from jagged slash rift; frames 6-9 peak vicious bleeding cut with dripping molten crimson ribbons and radiating pain wisps; frames 10-12 droplet splatter impact pool forming below; frames 13-15 fading blood-ember droplets; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_ctrl_dodge` — Dodge
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Dodge (Evasive Afterimage) passive proc for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Lateral ghost displacement. Hand-painted stylized cartoon fantasy game VFX. Color palette: translucent silver, pale teal, phantom cyan, deep violet. Two translucent silhouette echoes shifting sideways and recombining into the hunter. Frames 1-2 single solid silver silhouette; frames 3-5 silhouette splits into twin ghosted phantom outlines shifting left and right; frames 6-9 peak dodge displacement with translucent ethereal ripples, motion feathers and evasive vapor ribbons; frames 10-12 twin phantoms collapsing back toward the center; frames 13-15 dissolving shadow feathers; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_ctrl_rugido` — Rugido Selvagem
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Rugido Selvagem (Savage Roar) buff for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Radial conical roar shockwave. Hand-painted stylized cartoon fantasy game VFX. Color palette: feral amber, warm gold, roaring crimson, smoky violet. Acoustic shockwave rings radiating with spectral beast fangs. Frames 1-2 compressed golden sonic orb in center; frames 3-5 concentric sharp sound shockwave rings expanding outward; frames 6-9 peak feral roar wave flanked by ghostly amber beast claws and low dust blast ring; frames 10-12 sound pressure rings tearing and widening outward; frames 13-15 dispersing acoustic motes and dust embers; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_ctrl_roubo_vital` — Roubo Vital
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Roubo Vital (Life Leech) drain effect for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Sinuous inward curve motion. Hand-painted stylized cartoon fantasy game VFX. Color palette: blood crimson, emerald vitality green, silver, shadow violet. Three sinuous siphon tendrils pulling vital essence from victim back to caster. Frames 1-2 puncture spark with tiny red essence pearl; frames 3-5 three luminous crimson ribbons unfurling and looping forward; frames 6-9 peak siphon stream with glowing green-red vitality spirals and flowing energy pearls; frames 10-12 tendrils contracting and delivering life orb to heart; frames 13-15 healing green sparkle motes; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_ctrl_duas_maos` — Poder das Duas Mãos
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Poder das Duas Maos (Dual Wield Balance) passive state for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Symmetrical balanced geometry. Hand-painted stylized cartoon fantasy game VFX. Color palette: polished steel, cold silver, pale jade, midnight violet. Twin balanced dagger blades framing a radiant central diamond lozenge. Frames 1-2 twin vertical blade sparks igniting; frames 3-5 twin stylized curved daggers crossing symmetrically around central geometric diamond; frames 6-9 peak balanced crest with brilliant diamond lens flare, sharp steel blade edges and orbiting equilibrium motes; frames 10-12 blades easing outward as central diamond pulses; frames 13-15 fading tempered steel glints; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_ctrl_invisibilidade` — Invisibilidade
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Invisibilidade (Owl Cloak / Camouflage) stealth buff for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Inward dissolution and vanishing. Hand-painted stylized cartoon fantasy game VFX. Color palette: owl ash gray, misty silver, deep midnight violet, twilight cyan. Swirling owl feathers enveloping hunter and dissolving into empty mist. Frames 1-2 soft ash feather ring rising; frames 3-5 dense cloud of stylized midnight owl feathers wrapping in spiral vortex; frames 6-9 peak vortex of translucent shadow feathers with refractive smoke slits concealing center; frames 10-12 feathers crumbling into fine gray vapor wisps; frames 13-15 empty center with few vanishing twilight motes; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

---

## 3. Árvore Arcane Archer (Magia)

### `ht_mag_flecha_arcana` — Flecha Arcana
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Flecha Arcana (Arcane Arrow) magical projectile for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: arcane violet, celestial cyan, starlight silver, lavender. Glowing crystalline rune arrowhead flying with pure ribbon trail and bursting into diamond seal. Frames 1-2 floating arcane diamond rune spinning into arrow shape; frames 3-5 luminous violet crystal arrowhead darting with smooth celestial ribbon tail; frames 6-9 peak arcane flight with glowing cyan core, sharp runic glyph accents and spiral slipstream; frames 10-12 geometric arcane diamond seal bursting upon contact; frames 13-15 glittering magical rune dust; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_mag_flecha_ignea` — Flecha Ígnea
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Flecha Ignea (Flame Arrow) projectile for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: blazing flame orange, golden yellow core, charred crimson ember tips, charcoal smoke wisps. High-heat arrowhead trailing fire ribbons and detonating into directional flame fan. Frames 1-2 glowing incandescent charcoal arrow tip spark; frames 3-5 arrowhead erupts into blazing conical fireball projectile with curling flame tongues; frames 6-9 peak white-hot flame arrow head with intense golden trail and scattered fire cinders; frames 10-12 directional forward flame burst spreading in stylized fan shape; frames 13-15 floating glowing embers and soot wisps; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_mag_flecha_glacial` — Flecha Glacial
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Flecha Glacial (Glacial Rosette Arrow) magic projectile for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: pure glacial azure, diamond frost white, deep indigo, icy turquoise. Crystalline ice bolt blossoming into an ornate six-petal ice rosette on impact. Frames 1-2 hex ice crystal star spinning up; frames 3-5 faceted ice spear projectile gliding with chilly mist ribbon; frames 6-9 peak speed glacial bolt enveloped in diamond frost aura and subzero vapor cones; frames 10-12 explosive six-point crystalline snowflake rosette blooming upon impact; frames 13-15 delicate frost petals crumbling into sparkling ice dust; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_mag_flecha_trovao` — Flecha de Trovão
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Flecha de Trovao (Lightning Rod Arrow) attack for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: electric cyan, high-voltage violet, bright lightning white, plasma blue. Conductive lightning shaft embedding and drawing down violent electric arcs. Frames 1-2 needle conductive metal point humming with electric spark; frames 3-5 razor lightning arrow flying with jagged electric branches along its wake; frames 6-9 peak flight bolt wrapped in violent electric plasma fork trails; frames 10-12 catastrophic vertical lightning strike grounding through the embedded arrow head; frames 13-15 crackling electric discharge sparks; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_mag_chuva_mistica` — Chuva Mística
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Chuva Mistica (Mystic Arrow Rain) AoE attack for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Downward cascade movement. Hand-painted stylized cartoon fantasy game VFX. Color palette: lunar silver, starlight cyan, mystic violet, gold highlights. Celestial crescent moon arch descending into a fan of glowing starlight arrows. Frames 1-2 glowing lunar crescent symbol forming at top; frames 3-5 constellation lines connect as volley of sleek light arrows drop downward; frames 6-9 peak barrage of descending radiant starlight arrows piercing ground in circular zone; frames 10-12 ground impact starburst rings and five-point star ground decals; frames 13-15 dissipating constellation sparkles; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_mag_flecha_espectral` — Flecha Espectral
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Flecha Espectral (Spectral Ghost Arrow) attack for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Direction of movement towards RIGHT. Hand-painted stylized cartoon fantasy game VFX. Color palette: phantom shadow black, ethereal teal, ghostly seafoam green, deep purple. Translucent phantom arrow phased between dimensions, passing through targets and leaving soul ribbons. Frames 1-2 ethereal ghostly arrow head phasing into visibility; frames 3-5 dual translucent shadow trails accompanying the arrow as it glides; frames 6-9 peak spectral projectile flanked by two ethereal soul silhouettes and smoke tentacles; frames 10-12 phase-through impact releasing swirling ghostly soul tendrils; frames 13-15 dissolving ectoplasm vapor; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_mag_vagalume` — Vagalume de Fogo
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Vagalume de Fogo (Firefly Swarm) AoE attack for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Swirling dispersed swarm motion. Hand-painted stylized cartoon fantasy game VFX. Color palette: warm firefly amber, incandescent yellow, glowing ember red, twilight violet. Swarm of tiny glowing firefly orbs spiraling through zone and popping in warm flash sparks. Frames 1-2 cluster of three floating amber firefly sparks; frames 3-5 expanding swarm of luminous fiery fireflies circling in curved flight paths; frames 6-9 peak dense vortex of swirling firefly embers pulsing with golden light in a circular AoE; frames 10-12 simultaneous firefly mini-pops with bright golden pinprick flashes; frames 13-15 fading warm golden pollen and amber dust; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

### `ht_mag_tempestade` — Tempestade do Caçador
- **Status:** Pronto para gerar
- **Prompt:**
```text
Create a production game VFX sprite atlas for Tempestade do Cacador (Hunter's Storm) ultimate elemental AoE for Huntress RPG class. Exactly 4 columns x 4 rows, 16 equal square cells, solid pitch black background (#000000), no checkerboard, no grid, no borders, no text, no backdrop. Each cell contains the SAME animation evolving left to right top to bottom, centered at same cell center with generous clear padding. Converging tri-elemental storm vortex. Hand-painted stylized cartoon fantasy game VFX. Color palette: storm gold, lightning violet, glacial cyan, flame amber. Triple element tempest uniting frost arrows, lightning strikes and fireburst into golden hunter storm. Frames 1-2 three elemental orbs (frost, thunder, fire) orbiting center; frames 3-5 spiraling elemental storm ribbons gathering energy; frames 6-9 peak cataclysmic tempest with converging frost lances, crackling lightning bolts and swirling fire vortex in unified golden ring; frames 10-12 massive elemental shockwave expanding in golden concentric rings; frames 13-15 fading tri-elemental motes and sparkles; frame 16 completely empty black. Keep centered in cell. Solid black background.
```

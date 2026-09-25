# VFX — inventário I2

Documento de discovery. Depois de ler isto, dá para saber **efeito → onde roda → status**, sem abrir o código.

**Escopo varrido:** `presentation/effects/*` · `EffectManager.ts` · `ArmorAura.ts` · `CityWorld` · `CityGameSession` · `GameApp` · `data/balance/vfx.ts` · disco (0 arquivos `.vfx`/partículas em `public/`).  
**Conflito GDD × grill:** grill vence.

**Legenda de status**

| Status | Significado |
|---|---|
| `final` | Feedback em uso e tratado como oficial (ainda pode polir) |
| `placeholder` | Procedural / provisório; arte de arquivo falta |
| `falta` | Domínio esperado sem implementação |

Arquivo de asset VFX no disco: **0** → tudo vive em TypeScript / DOM. O Fire Burst e o catálogo das 96 skills geram texturas procedurais por `CanvasTexture`; o VFX Pack é apenas referência local de estudo.

---

## Resumo

| Família | Itens | Onde | Status dominante |
|---|---|---|---|
| Combate mesh/particles | hit flash, pulse, slash, death scale, skill rings, Fire Burst e sete VFX físicos do TK | `EffectManager` + sessão | técnico; validação visual pendente |
| Catálogo de skills | 96 profiles, 87 casts ativos, 9 passivas, recipes por família | `SkillVfxDirector` + `SkillVfxCatalog` | placeholder técnico |
| Level up | pulse + anel + shake + toast/HUD | `EffectManager` + `GameApp` | placeholder (fanfarra **sem áudio** → I11) |
| Ambiente hub | fonte água, brasas, embers, portal | `FountainWater` / `Brazier` / `AmbientEmbers` / `PortalVfx` | placeholder |
| HUD overlay | dmg numbers, HP bars, nameplates | DOM `#combat-overlay` | final (UI) |
| Aura arma | brilho + raios | `ArmorAura` (settings) | placeholder opcional |
| Pós-processo | bloom | `UnrealBloomPass` em `SceneRenderer` | final técnico |

---

## 1. Combate e skills (`EffectManager`)

| Id | Efeito | Gatilho | Onde roda | Status |
|---|---|---|---|---|
| `dmg-number` | Texto flutuante (dano / KO / MISS) | hit / kill / miss | overlay HTML | final |
| `hit-flash` | Emissive vermelho no mesh | dano em inimigo/jogador | material emissive | placeholder |
| `attack-pulse` | Scale squash no mesh | ataque (se chamado) | mesh scale | placeholder |
| `slash` | Linha ouro entre pontos | ataque básico | Line na cena | placeholder |
| `skill-bolt` | Linha colorida | skill árvore magia | Line | placeholder |
| `skill-burst` | Anel no chão | skill física | RingGeometry | placeholder |
| `skill-zone` | Anel menor | skill controle | RingGeometry | placeholder |
| `fire-burst-chain` | Correntes instanciadas em curva Bézier, rastro de fogo, faíscas, choque e labareda | `tk_fis_fire_burst` | `FireBurstVfx` + `three.quarks` | placeholder · aguarda Felipe |
| `tk-physical-vfx` | Golpe, Investida, Corte, Machado, Quebra, Fúria e Avalanche; malhas 3D, partículas Quarks, cleanup e labs próprios | `game/src/presentation/effects/tkSkills/` | sete controllers + sete labs + sete QAs | técnico · QA CDP e Felipe pendentes |
| `death-scale` | Scale down do mesh inimigo | morte inimigo | `playDeath` | placeholder (≠ clip GLB do player) |
| `range-ring` | Anel de alcance | indicador | RingGeometry | placeholder |
| `camera-punch` | Shake câmera | hit / kill / level up | offset câmera | placeholder |
| `hp-bar` | Barra world HP | combate | DOM | final (regra 40% verde/vermelho) |
| `npc-nameplate` | Nome NPC | hub | DOM | final |

Cores skill (sessão): magia `#b07cff` · controle `#6b7cff` · física `#c45c26`. Tempos: `VFX_BALANCE`.

### Fire Burst — X5

- **Runtime:** `game/src/presentation/effects/fireBurst/FireBurstVfx.ts`; despacho por `skillId` em `EffectManager`.
- **Lab:** `game/vfx/fire-burst.html`; build Vite em `/vfx/fire-burst.html`.
- **Composição:** uma `BatchedRenderer`; quatro `ParticleSystem`; `RenderMode.Trail`, `ColorOverLife`, `SizeOverLife`, `TurbulenceField`, `SphereEmitter` e `ConeEmitter`; correntes em `InstancedMesh` sobre `CubicBezierCurve3`.
- **Ciclo de vida:** emissores, batches, materiais, geometrias, texturas e luzes são liberados no fim do cast ou no `dispose` do controller.
- **Textura:** cadeia cartoon atualmente procedural; candidatos CC0 para uma passada final de arte: [Chain hand-painted CC0](https://opengameart.org/content/chain-0) e [chain gang CC0](https://lpc.opengameart.org/content/chain-gang).
- **Referência de assinatura:** [guia oficial do Dark Lord](https://muonline.webzen.com/en/gameinfo/guide/detail/347) descreve o Fireburst como correntes de fogo com efeito de área; a imagem enviada pelo Felipe define o gesto, o arco e o impacto visual.

### Catálogo runtime das 96 skills — X6

- **Perfis:** `game/src/presentation/effects/skill/SkillVfxCatalog.ts` gera 96 IDs únicos a partir de `class-definitions.ts`: 87 ativos e 9 passivas.
- **Families:** `chain`, `projectile`, `arrow`, `aoe`, `line`, `melee`, `buff`, `heal`, `transform`, `summon` e `passive`; o Fire Burst usa a recipe dedicada `chain`.
- **Runtime:** `SkillVfxDirector` compartilha `BatchedRenderer`, texturas procedurais, resolution hook, fixed timestep e limite de oito casts; `EffectManager` faz o dispatch por `skillId`.
- **Passivas:** `syncPassives` mostra feedback de aprendizado, equipamento ou proc sem inventar barra ou dano.
- **Lab runtime:** `game/vfx/skill-catalog.html`; QA permanente em `npm run vfx:runtime:qa`.
- **Studio:** `game/vfx/vfx_master.html`; 96 skills × 3 versões = 288 composições e 67 efeitos do pack local; QA em `npm run vfx:qa`.
- **Estado:** técnico validado; aguarda validação visual do Felipe.

---

### Atelier autoral isolado — X7

- **Lab:** `/vfx/vfx_lab.html`; parte da estrutura do master, mas usa fontes próprias em `game/vfx/lab/atelier*`, `score.js`, `registry.js` e `proposals-v1/v2/v3.js`. Não carrega o pack nem o banco de 5 MB; a cópia inicial `uaidzin_vfx_lab_data.js` foi preservada.
- **Cobertura:** 96 skills canônicas × 3 conceitos, produzidos em ordem V1 → V2 → V3. Cada proposta tem título, descrição/prompt e sequência autoral de camadas, não somente troca de cor.
- **Técnica:** Three.js local, geometrias animadas, fitas curvas, GLSL, texturas procedurais e `InstancedMesh` para partículas/correntes. A fábrica tem `setup`, `cast`, `update`, `dispose`; o registro aceita outras implementações.
- **Dados:** `npm run vfx:manifest` extrai `CLASSES` executando as definições reais via esbuild. `npm run vfx:atelier:brief` atualiza as 288 fichas em `game/vfx/skills-vfx-brief.md`.
- **Revisão:** galeria com prévia animada no hover, filtros, três vistas com relógio comum, sequência da árvore, scrub/velocidade e escolhas por skill/versão. `localStorage` exclusivo do lab; exportação JSON, sem acesso ao save do jogo.
- **QA:** `npm run vfx:atelier:validate` verifica manifest, cobertura, receitas e fichas. `npm run vfx:atelier:qa` usa o painel CDP (`AGENT_BROWSER_CDP`) para render/dispose das 288, capturas de 11 skills por versão, controles, revisão/exportação e memória repetida. QA de aprovação usa namespace separado e não altera escolhas reais.
- **Evidências:** `game/vfx/evidence/technical-results.json`, `ui-results.json` e PNGs do canvas. Conexão Playwright direta bloqueada pelo bridge do desktop; validação substituída por DOM e WebGL via `agent-browser`, sem alegar screenshots Playwright da página inteira.
- **Desempenho:** medição local inicial do Fire Burst V2: ~56 FPS médios, p95 ~18,5 ms; resultado atual reproduzível no JSON. Não é garantia para outros dispositivos ou comparador.
- **Estado:** técnico testado, **aprovação artística pendente**. Silhuetas de invocação/transformação são estudos espectrais, não modelos finais. Meta de acabamento AAA cartoon ainda depende de revisão do Felipe. Nenhuma destas propostas foi portada ao combate.

## 2. Level up (liga D7)

| Id | Efeito | Onde | Status |
|---|---|---|---|
| `level-up-pulse` | Scale no player | `levelUpPulse` | placeholder |
| `level-up-ring` | Anel ouro no chão | cena 3D | placeholder |
| `level-up-shake` | `cameraPunch(0.14)` | câmera | placeholder |
| `level-up-toast` | “Nível N!” | `GameApp` toast | final UI |
| `level-up-hud` | `pulseFrame` + `flashBars` HP/MP/XP | frame do hub | final UI |
| `level-up-heal` | HP/MP full | lógica sessão | final regra |
| `level-up-sfx` | Fanfarra sonora | — | **falta** (I11) |

---

## 3. Ambiente

| Id | Efeito | Arquivo / classe | Cena | Status |
|---|---|---|---|---|
| `fountain-water` | Água animada (shader hook) | `FountainWater.ts` | cidade | placeholder → C12 |
| `brazier-flame` | Fogo + PointLight | `Brazier.ts` | cidade + dungeon | placeholder |
| `ambient-embers` | Points flutuantes | `AmbientEmbers.ts` | cidade | placeholder |
| `portal-gate` | Portal shader + partículas | `PortalVfx.ts` | cidade decor + saída dungeon | placeholder |
| `armor-aura` | Aura vermelha na arma | `ArmorAura.ts` | player (opt settings) | placeholder |

---

## 4. Falta / fora de escopo de arquivo

| Domínio | Status | Nota |
|---|---|---|
| Pack de partículas em `public/` | falta | o pack comercial permanece local fora de `public/`; o build padrão usa fallback procedural |
| VFX por skill nomeada (1:1 skillId) | implementado tecnicamente | 96 profiles no runtime + 96 skills × 3 propostas específicas no VFX Studio; 67 efeitos do pack local carregados; 3 efeitos vazios e 3 shapes não suportados usam fallback procedural no loader |
| Morte inimigo com clip GLB | falta | só scale; anim = I1/C24 |
| Drop pickup sparkle | falta | só log UI (D6) |

---

## 5. Studio de Visualização e Qualidade de VFX (Audit & Rework)

- **Localização canônica:**
  - `C:\Users\Felipe\Desktop\opencode fx.html` — entrega local, com pasta adjacente `CartoonFX_VFX_Quarks/`.
  - `C:\GameProjects\uaidzin\game\vfx\vfx_master.html` — fonte cloud/build.
- **Capacidades e Arquitetura:**
  - **Zero CORS / offline:** o HTML usa scripts clássicos e texturas Data URLs; o build padrão não depende do pack comercial.
  - **Aba GAME SKILLS VFX (96):** 4 classes × 24 skills, 3 versões por skill (V1 Direta, V2 Orbital, V3 Ritual) e 288 receitas específicas com títulos, briefs e layers autorais.
  - **Aba VFX PACK (67):** catálogo separado do Cartoon FX Remaster; 3 VFX vazios são reconstruídos e marcados. Fire Burst e Moon Ray pertencem às skills, não ao Pack.
  - **Comparação:** V1/V2/V3 rodam lado a lado no mesmo canvas; no Pack a comparação fica desabilitada.
  - **Responsividade:** 1920×1080, 1600×900, 1366×768, 1024×768, 768×1024, 390×844 e 320×568; sidebar recolhe no layout compacto.
  - **Referência de qualidade:** spritesheet `raio 7x1.png` 2940×2000, `ClampToEdgeWrapping`, flipbook 7 frames, Moon Ray vertical e origem/impacto separados.
  - **Paleta canônica:** Salão/Brasa (`#100c08`, `#241c14`, `#d4a017`, `#a33b3b`, `#f0e6d0`), moldura A, botões retangulares e zero emoji.
- **QA e builds:**
  - `npm run vfx:catalog` regenera as 96 skills e 288 propostas a partir das definições TypeScript.
  - `npm run vfx:qa` percorre 288 versões, comparação, Pack, 7 viewports, cleanup, console e requests.
  - `npm run vfx:runtime:qa` percorre os 96 perfis do runtime e representa partículas/cleanup.
  - `npm run vfx:build` gera cloud sem o pack comercial e com 8 fallbacks procedurais.
  - `npm run vfx:build:local-pack` inclui opt-in o pack local de 67 efeitos.
- **Licença do Pack:** Cartoon FX Remaster © Jean Moreno, Standard Unity Asset Store EULA. Uso local; não redisribuir, abrir o banco de dados/arte do pack ou incluir o arquivo comercial em commit público. O `uaidzin_vfx_data.js` local é arte referenciada, não asset open-source.

---

## Fontes

- `game/src/presentation/effects/EffectManager.ts`
- `FountainWater.ts` · `PortalVfx.ts` · `Brazier.ts` · `AmbientEmbers.ts`
- `game/src/presentation/effects/fireBurst/`
- `game/src/presentation/effects/skill/`
- `game/vfx/fire-burst.html`
- `game/vfx/skill-catalog.html`
- `game/vfx/vfx_master.html`
- `game/vfx/vfx_lab.html`
- `game/src/data/balance/vfx.ts`
- `game/src/data/classes/skills/` (`tk.ts`, `fm.ts`, `bm.ts`, `ht.ts`)
- `game/scripts/generate-vfx-catalog.mjs` · `game/scripts/check-vfx-master.mjs`
- `CityGameSession` (gatilhos combate / level up)

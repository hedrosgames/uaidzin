# Shaders e efeitos de cena — inventário I12

Documento de discovery. Depois de ler isto, dá para saber **shader/efeito → arquivo/código → status**, sem abrir o GLSL.

**Escopo varrido:** `SceneRenderer.ts` · `FountainWater.ts` · `PortalVfx.ts` · `CityGround.ts` · `ArmorAura.ts` · `BootFlow` / fade overlay · disco (0 `.frag`/`.vert`/`.glsl` em `public/`).  
**Conflito GDD × grill:** grill vence.

**Legenda de status**

| Status | Significado |
|---|---|
| `final` | Em uso estável (pode polir visual) |
| `placeholder` | Funciona; visual provisório / aguarda Felipe |
| `falta` | Esperado sem implementação |

Arquivos shader no disco: **0** — GLSL inline em TS / `onBeforeCompile`.

---

## Resumo

| Efeito | Tipo | Onde | Status |
|---|---|---|---|
| Sky dome | `ShaderMaterial` | `SceneRenderer.createSkyDome` | final |
| Player outline | `ShaderMaterial` (backface) | `createPlayerOutline` | placeholder (só cápsula fallback) |
| Player x-ray / ghost | `MeshBasicMaterial` + raycast | `playerGhost` / `setOcclusionGhostVisible` | final técnico (D5) |
| City ground tone | `onBeforeCompile` | `CityGround.makeCityFloorMaterial` | placeholder → C13 |
| Fountain water | `onBeforeCompile` | `FountainWater` | placeholder → **C12** |
| Portal gate | `ShaderMaterial` + Points | `PortalVfx` | placeholder |
| Armor aura | `onBeforeCompile` + lines | `ArmorAura` | placeholder (opt) |
| Bloom | UnrealBloomPass | `EffectComposer` | final técnico |
| Fog / exposure dungeon | `setWorldLook` | `SceneRenderer` | placeholder → D13 luz |
| Fade preto | CSS overlay DOM | `#uaidzin-scene-fade` | final (X3) |

---

## 1. Tabela detalhada

| Id | Nome | Técnica | Arquivo | Uso | Status |
|---|---|---|---|---|---|
| `sky-dome` | Céu gradiente | ShaderMaterial zenith/horizon | `SceneRenderer.ts` | cidade | final |
| `player-outline` | Contorno azul | ShaderMaterial expand normal | idem | player (mesh outline) | placeholder |
| `player-xray` | Fantasma quando ocluso | MeshBasic transparente + raycast só em oclusores fixos | idem + `PlayerView` | dungeon/hub | final (D5: inimigo **não** usa) |
| `city-floor` | Variação tom/borda do chão | onBeforeCompile + FBM | `CityGround.ts` | solo cidade | placeholder (C13 textura centro) |
| `fountain-water` | Água da fonte | onBeforeCompile + `aWaterMask` UV | `FountainWater.ts` | prop fountain | placeholder (**C12**) |
| `portal-gate` | Portal animado | ShaderMaterial warp + particles | `PortalVfx.ts` | portal cidade/saída | placeholder |
| `armor-aura` | Aura na arma | onBeforeCompile + bolts | `ArmorAura.ts` | opt settings | placeholder |
| `bloom` | Glow pós | UnrealBloomPass | `SceneRenderer` | global | final |
| `dungeon-look` | Fog escuro + exposure | `FogExp2` + toneMapping | `setWorldLook("dungeon")` | dungeon | placeholder (D1 luz OK; LD D13) |
| `scene-fade` | Fade preto cena | overlay `#uaidzin-scene-fade` | `BootFlow` / sessão | login↔seleção↔cidade↔dungeon | final |

---

## 2. X-ray — regra D5

| Quem | Tem ghost? | Nota |
|---|---|---|
| Jogador | sim | Raycast ignora `occlusionIgnore`, `enemies-view`, ground |
| Inimigo / cápsula | não | Sem outline/x-ray de monstro |

---

## 3. Gaps

| Gap | Delivery |
|---|---|
| Água da fonte ainda provisória | **C12** |
| Chão centro vs geral | **C13** + área fonte **C26** |
| Iluminação/look por dungeon (não só fog genérico) | **D13** |
| Nenhum `.glsl` versionado | editor futuro (E1) se quiser editar shader fora do TS |

---

## Fontes

- `game/src/presentation/rendering/SceneRenderer.ts`
- `game/src/presentation/effects/FountainWater.ts` · `PortalVfx.ts`
- `game/src/world/CityGround.ts`
- `game/src/app/BootFlow.ts` (fade)

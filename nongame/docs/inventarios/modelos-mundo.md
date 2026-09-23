# Modelos 3D do mundo — inventário I14

Documento de discovery. Depois de ler isto, dá para saber **prop / placeholder / falta** na cidade, borda e dungeon, sem abrir pastas.

**Escopo varrido:** `game/public/models/city/` · `CityProps.ts` · `CityWorld.ts` · `CityScenery.ts` · `definitions.ts` · `EnemyRuntimeView.ts` · `PLAN-assets-cenario-dungeons.md` · I5 (`assets.md`).  
**Conflito GDD × grill:** grill / `DECISOES-DESIGN.md` vencem (sem mundo aberto fora da cidade).

**Legenda de status**

| Status | Significado |
|---|---|
| `final` | GLB em uso no hub e tratado como oficial |
| `placeholder` | Em uso, geometria procedural / a trocar |
| `debug` | No disco sem consumidor no runtime |
| `falta` | Esperado pelo design/plano sem arquivo nem mesh |

---

## Resumo

| Domínio | No disco | Consumidor | Status dominante |
|---|---|---|---|
| Props cidade (GLB) | 9 | `CityProps` + `buildCityWorld` | `final` |
| `fountain-simple.glb` | 1 | só spec em `CityProps` | `debug` (não spawnado) |
| Chão cidade | `city-floor.webp` | `CityGround` | `final` (área fonte = C13/C26) |
| Árvores fora | 0 GLB | `CityScenery` cones/cilindros ×64 | `placeholder` → **C8** |
| Terreno borda | procedural | `CityScenery` plane verde-escuro | `placeholder` |
| NPCs hub | 0 GLB | cilindros coloridos (`makeNpcMarker`) | `placeholder` → **C23** |
| Baú vault | 0 GLB | caixas procedurais (`makeChest`) | `placeholder` |
| Brasas / portal | 0 GLB | `Brazier` / `PortalVfx` procedurais | `placeholder` (VFX I2) |
| Inimigos | 0 GLB | cápsula (`EnemyRuntimeView`) | `placeholder` → **C24** |
| Props dungeon | 0 pasta | greybox em `buildTestDungeonWorld` (D1 look) | `falta` → **D13b bloqueado** |
| Colisores | n/a (AABB/círculo) | `CityWorld` + footprint dos props | `final` (fonte C25) |

---

## 1. Props cidade — GLB (`game/public/models/city/`)

| Id | Caminho | Spawn / colisor | Status |
|---|---|---|---|
| `fountain` | `…/fountain.glb` | centro (0,0); AABB + círculo pad 0.08; água `FountainWater` | final |
| `fountain-simple` | `…/fountain-simple.glb` | **não** spawnado | debug |
| `stall-1` | `…/stall-1.glb` | (−12,10) e (14,0); box footprint | final |
| `stall-2` | `…/stall-2.glb` | (−10,−12); box | final |
| `stall-bakery` | `…/stall-bakery.glb` | (−14,0) e (10,−12); box | final |
| `weapon-rack` | `…/weapon-rack.glb` | (12,10); box | final |
| `wagon` | `…/wagon.glb` | (0,12); box | final |
| `bulletin-board` | `…/bulletin-board.glb` | (3.6,−13.2); box | final |
| `wall` | `…/wall.glb` | 4 lados × N segmentos; box por lado | final |

Registro: `CityPropId` + `CITY_PROP_SPECS` em `game/src/world/CityProps.ts`.

---

## 2. Procedural / placeholder no hub

| Elemento | Onde | Forma | Colisor | Status | Delivery |
|---|---|---|---|---|---|
| Árvores fora da muralha | `CityScenery.buildCityScenery` | InstancedMesh: tronco cilindro + 2 cones | nenhum | placeholder | **C8** |
| Terreno externo | idem | Plane 200×200 cor `#1d2418` | nenhum | placeholder | C8 / borda |
| Praça / meio-fio | `CityWorld` | cilindros; floorMat | `occlusionIgnore` | placeholder visual | C13 · C26 |
| NPC (7) | `definitions` + `makeNpcMarker` | cilindro corpo + cabeça | círculo r=0.4 | placeholder | **C23** |
| Baú vault | `makeChest` | boxes madeira/ferro | círculo r=0.55 | placeholder | C23/arte baú |
| Brasas ×4 | `createBrazier` | ferro + chama procedural | círculo r=`BRAZIER_RADIUS` | placeholder | I2 / arte |
| Portal decor | `createPortalVfx` | shader + particles | box portão | placeholder | I2 · I12 |
| Inimigo (arena) | `EnemyRuntimeView` | `CapsuleGeometry` | runtime inimigo | placeholder | **C24** |

### NPCs (ids) — todos placeholder de mesh

| Id | Label |
|---|---|
| `npc-portal-guard` | Guarda do Portal |
| `npc-merchant` | Mercador |
| `npc-blacksmith` | Ferreiro |
| `npc-skill-master` | Mestre de Skills |
| `npc-sage` | Sábio |
| `npc-composer` | Compositor |
| `npc-quest` | Mestre de Quests |

---

## 3. Dungeon / fora — falta de asset

| Esperado | Alvo (plano) | Disco hoje | Status |
|---|---|---|---|
| Props D1–D8 | `game/public/models/dungeons/{bioma}/` | pasta **inexiste** | falta — D13b bloqueado |
| Chão por bioma | `/textures/dungeons/{bioma}-floor.webp` | 0 | falta |
| Scenery dungeon | `DungeonScenery.ts` | não existe | falta |
| Mundo por dungeon | LD distinto | só `buildTestDungeonWorld` (greybox único) | placeholder runtime |

Catálogo de props alvo: `PLAN-assets-cenario-dungeons.md` (~52 props + 7 chãos + 7 arcos). Liga **D13**.

---

## 4. Gaps para delivery (C8 / C23 / C24 / D13)

| ID | Gap concreto a partir deste inventário |
|---|---|
| **C8** | Zero GLB de árvore; `CityScenery` = cones/cilindros. Precisa modelo + trocar instancing; design: “fora” = só borda visual, sem mundo aberto. |
| **C23** | 7 NPCs = cilindros coloridos. Precisa mesh/GLB por papel (ou kit reutilizável) + nameplate já existe. |
| **C24** | Inimigos = cápsula em `EnemyRuntimeView`. Precisa GLB monstro + bind no spawn (I4 alimenta arquétipos). |
| **D13a** | Greybox D1 `campo` (luz + cercas + props cidade) — em validação. |
| **D13b** | **Bloqueado** — sem assets de bioma em disco; não inventar D2–D8 de arte. |

---

## Fontes

- Runtime: `CityWorld.ts`, `CityProps.ts`, `CityScenery.ts`, `EnemyRuntimeView.ts`
- Plano arte dungeon: `PLAN-assets-cenario-dungeons.md`
- Design: `DECISOES-DESIGN.md` (sem mundo fora)


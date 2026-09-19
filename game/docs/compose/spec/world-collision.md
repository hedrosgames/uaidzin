---
feature: world-collision
status: delivered
updated: 2026-09-11
branch: UAIDZIN
commits: 8f9d30c..WORKTREE
---

# Colisão do player com o mundo

## Report

**What was built** — Colisão 2D X/Z sem física: `world/collision.ts` (boxes/circles + teste círculo–AABB), sólidos preenchidos no build de city (7 buildings, 4 walls, NPCs r=0.4) e dungeon (side walls). `PlayerRuntime.update` aceita `collision` e resolve slide full→X→Z; click-move limpa target se travar. Portais e chão não colidem. Teleport de debug ignora colisão.

**Verification** — `npm run typecheck` PASS · `npm run smoke` **45/45** incluindo `não atravessa building — z=9.59` (building em z∈[10,14], player para em ~9.65).

**Journey log**
- GDD/19-decisoes já mandava colisão simples de caixa, não Rapier.
- Mesh e collider saem da mesma tabela no `buildCityWorld` — evita divergir.
- Slide por eixo: full bloqueado → só X → só Z (mantém X se Z falhar).

## [S1] Problem

`PlayerRuntime.update` só aplica o `WorldBoundary` (AABB do mapa). Prédios, paredes da cidade, paredes da dungeon e corpos de NPC são visual: o player atravessa tudo. Click-to-move também manda o alvo para dentro de geometria.

Decisão já registrada em `plano de implementação/19-decisoes-confirmadas.md`: colisão simples de caixa no greybox; Rapier3D só se colisão “real” for necessária (não é o caso agora).

## [S2] Design

Colisão **2D top-down** (X/Z), player como círculo, mundo como lista estática de sólidos. Sem motor de física.

### Modelo de sólidos

Em `BuiltWorld` (ou arquivo novo `world/collision.ts`):

```ts
type SolidBox = { minX: number; maxX: number; minZ: number; maxZ: number };
type SolidCircle = { x: number; z: number; r: number };

interface WorldCollision {
  boxes: SolidBox[];
  circles: SolidCircle[];
}
```

Preenchido **no build do mundo**, a partir das mesmas constantes que já desenham a geometria — não por raycast/mesh a cada frame.

| Mundo | Sólidos |
|---|---|
| Cidade | 7 buildings (caixas), 4 walls (caixas), NPCs (círculos r≈0.4) |
| Dungeon | 2 side walls (caixas), portal de saída (círculo opcional) |
| Chão / plaza / grid | não colide |
| Portais | **não** colidem (precisa alcançar para [E]) |

Fonte dos números: o loop de `buildings` e `walls` em `CityWorld.ts` e as posições de `CITY_INTERACTABLES` / `makeNpcMarker`. Ideal extrair as tabelas de posição para um array único usado pelo mesh **e** pelo collider — evita mesh e colisão divergirem.

### Resolve do player

`PlayerRuntime` ganha o collision set no update (ou injetado por `CityGameSession`).

1. Intenção: WASD ou `moveTarget` (como hoje).
2. **Slide por eixo** (lazy e estável em greybox):
   - tenta mover em X, resolve; depois em Z, resolve;
   - ou tenta o vetor completo; se bloqueia, tenta só X; se bloqueia, só Z.
3. Resolve círculo vs AABB: se o círculo intersecta a caixa, empurra para o lado do eixo de penetração menor (ou simplesmente **rejeita o eixo** — mais previsível em WASD).
4. Mantém o clamp de `WorldBoundary` por último.
5. Click-to-move: se o alvo está dentro de sólido, **não** pathfind — anda até encostar e limpa `moveTarget` (ou desliza na face). Sem A* nesta fase.

Recomendação concreta: **rejeição por eixo** (tenta X, depois Z). Com speed 5.5 e dt de frame, não túnela; comportamento de “encostar na parede e escorregar” é o esperado em ARPG isométrico.

`radius` do player já existe (0.35). Usar o mesmo no collider.

### O que NÃO muda

- Domínio de combate, skills, save.
- Câmera, outline, VFX.
- Inimigos: `EnemyAI` continua sem collider (fase 2 opcional — chaser pode atravessar building na dungeon se a arena for aberta; nas arenas atuais o impacto é baixo).
- `teleportPlayer` de debug **ignora** colisão (smoke/bot dependem disso).

### Contratos de API

```ts
// CityGameSession
this.player.update(dt, axes.x, axes.z, world.boundary, world.collision);

// PlayerRuntime
update(dt, inputX, inputZ, bounds, collision?: WorldCollision): void
```

`collision` opcional → comportamento atual se ausente (testes/unit e worlds sem collider).

### Critérios de aceite (para a execução)

1. WASD não atravessa building da cidade nem wall da dungeon.
2. Encostar e andar paralelo à parede funciona (slide).
3. Click no chão atrás de prédio: player para na face ou desliza — não fica preso em loop de target.
4. NPC não deixa o player embutir no cilindro; [E] ainda funciona a 1.6 (range maior que o raio do NPC).
5. Portal continua alcançável.
6. Smoke: teleport + um assert simples (ex.: andar em direção ao building em `(0,12)` a partir de `(0,4)` e `playerZ` fica ~fora da caixa, não dentro).
7. `typecheck` + `smoke` PASS.

## [S3] Out of Scope

- Rapier3D / Bullet / qualquer lib de física.
- Pathfinding (A*), navmesh, steering de grupo.
- Colisão inimigo–mundo e inimigo–inimigo (fase 2).
- Colisão player–inimigo (push).
- Plataformas, slopes, degraus, Y.
- Trigger de zona (área de portal) — interação já é por distância.

## Tasks (quando for executar)

- [x] T1: Extrair tabelas de buildings/walls/NPCs + `WorldCollision` no build city/dungeon — acceptance: city e dungeon retornam boxes/circles coerentes com o mesh (covers: S2)
- [x] T2: `PlayerRuntime.update` com resolve por eixo + boundary — acceptance: WASD não entra em sólido; slide na parede (covers: S2)
- [x] T3: Wire `CityGameSession` + click-move para não perseguir alvo dentro de sólido — acceptance: click atrás de building para na face (covers: S2)
- [x] T4: Smoke (WASD vs building + typecheck) — acceptance: PASS (covers: S2)

## Riscos / tradeoffs

- **Tabela vs mesh**: se alguém mover um building só no mesh, colisão mente. Mitigar com uma fonte única de dados no build.
- **NPC sólido + range 1.6**: ok; se o NPC for muito grosso, o player pode “orbitar” feio — r 0.4 resolve.
- **Inimigos sem colisão**: chaser pode clipar em parede se a arena crescer; marcar como upgrade quando tiver labirinto de verdade.

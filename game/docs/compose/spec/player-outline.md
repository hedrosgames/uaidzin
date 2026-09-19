---
feature: player-outline
status: delivered
updated: 2026-09-11
branch: UAIDZIN
commits: 8f9d30c..WORKTREE
---

# Player Outline (visível atrás de obstáculos)

## Report

**What was built** — Dois passes de apresentação no player: (1) anel inverted hull com `depthTest: true` (body cobre o interior — sem glow constante); (2) ghost translúcido com `depthTest: false`, visível só quando raycast câmera→player acerta o `worldRoot`. Smoke valida `playerGhostVisible` livre=false / ocluído=true e grava screenshots dos dois estados.

**Verification** — `npm run typecheck` PASS · `npm run smoke` **44/44 PASS** · screenshots `player-outline-free.png` (corpo normal) e `player-outline-occlusion.png` (ghost no prédio).

**Journey log**
- Câmera isométrica alta (offset 8,10,12) oclui o player em buildings.
- v1 com `depthTest: false` no hull pinteava a silhueta inteira por cima do body — glow 24h. Fix: rim depth-tested + ghost só se ocluído.
- Trabalho concorrente de hub-ui reescreveu `GameApp`/`smoke` no meio da sessão.
- `hasPlayerOutline` só confere mount; `playerGhostVisible` é o sinal real de oclusão.

## [S1] Problem

O personagem é uma cápsula no `SceneRenderer` e some atrás de prédios, paredes e NPCs da cidade/dungeon. O jogador perde a referência do próprio personagem quando a câmera isométrica o oclui.

## [S2] Design

1. **Rim** — inverted hull (`BackSide`, expand ~0.035 no view space), `depthTest: true`, `depthWrite: false`, desenha antes do body. Quando livre: anel fino, sem preencher o corpo.
2. **Ghost** — mesma geometria, `MeshBasicMaterial` translúcido (`0x7ec8ff`, opacity 0.42), `depthTest: false`. `visible` ligado por raycast da câmera ao centro do player contra `worldRoot` (distância com folga 0.2).
3. Ambos filhos de `playerMesh` — transform/pulse/morte sincronizam.
4. `dispose()` libera materiais + geometria compartilhada.
5. `render()` single-pass; oclusão é CPU raycast, não post-process.

Contratos:

- Snapshot: `hasPlayerOutline`, `playerGhostVisible`.
- Nenhuma mudança em domínio, input, câmera ou `EffectManager`.

## [S3] Out of Scope

- Outline em inimigos/NPCs/itens.
- Post-process, stencil, EffectComposer.
- Troca do placeholder de cápsula por modelo skinned.

## Tasks

- [x] T1: Material de outline inverted hull + attach em `playerMesh` — acceptance: mesh existe, depthTest off, parentado, dispose ok (covers: S2)
- [x] T2: Debug API `hasPlayerOutline` no snapshot — acceptance: smoke lê `true` (covers: S2)
- [x] T3: Smoke Playwright com teleport atrás de building + screenshot de oclusão — acceptance: assert outline + png em `docs/compose/` (covers: S1, S2)
- [x] T4: `typecheck` + `smoke` limpos — acceptance: ambos PASS (covers: S2)

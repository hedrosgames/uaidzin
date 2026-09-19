---
feature: dungeon-visual-cleanup
status: delivered
updated: 2026-09-10
branch: UAIDZIN
commits: 979ee9f..HEAD
---

# Limpeza visual da dungeon + inimigos na cidade

## Report

**What was built** — Remoção dos discos coloridos de spawn da geometria da dungeon; anel de alcance e slash desativados no combate. `EnemyRuntimeView` esconde meshes órfãos e `hideAll()` roda ao entrar na cidade. Smoke observa todos os meshes do view (não só a lista do serviço).

**Verification** — `typecheck` PASS · `build` PASS · `smoke` **22/22** com `cidade sem inimigos visíveis`.

**Journey log**
- Discos de spawn eram o que “coloria” a dungeon — não VFX.
- `enemies.clear()` não escondea meshes; view ficava órfão na cidade.
- Assert de smoke baseado no serviço era vazio após `clear()`; `listAll()` do view destravou o regression test.

## [S1] Problem

Dungeon poluída com marcadores de spawn; meshes de inimigo apareciam na cidade após a morte.

## [S2] Design

Sem spawn markers no chão. Sem range ring e slash no combate. Só mobs (capsules) com cor de gameplay + números de dano/flash/pulse. `hideAll` + `sync` de órfãos ao trocar de mundo.

## [S3] Out of Scope

Redesign de arena, novos mobs, shaders.

## Tasks

- [x] T1: Remover spawn markers da dungeon
- [x] T2: Sync esconde meshes ausentes + hideAll na cidade
- [x] T3: Smoke com assert de todos os view meshes + screenshot

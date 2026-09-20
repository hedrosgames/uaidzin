---
feature: gdd-combat-juice
status: implemented
updated: 2026-09-10
branch: UAIDZIN
---

# Combat juice + skills do GDD

## Report

**What was built** — Loadout de skills (até 4) montado da árvore aprendida, com auto/manual, CD por slot e bônus de especialização. VFX placeholder por tipo (burst/bolt/zone). Juiciness: barras de HP nos mobs, pulse de level-up, camera punch em kill/dano, toast de nível.

**Verification** — código em `SkillLoadout`, `SkillController` e `EffectManager.spawnHpBar`.

**Journey log**
- Skill era stub único; GDD exige árvore + 8ª + spec.
- spawnHpBar não havia sido plugado no 1º wire.

## [S1] Problem

Sem skills do GDD no combate, sem VFX por skill, pouca juiciness.

## [S2] Design

`SkillLoadout` a partir de `SkillTreeService`. Auto: melhor slot pronto, parado. Manual tecla 1. VFX por árvore. HP bars DOM. Level-up pulse + camera punch.

## [S3] Out of Scope

Áudio, animações, livros dropáveis, balance fino, quests.

## Tasks

- [x] T1: SkillLoadout + SkillController multi-slot
- [x] T2: VFX de skill burst/bolt/zone
- [x] T3: HP bars + level-up + shake
- [ ] T4: Smoke + build

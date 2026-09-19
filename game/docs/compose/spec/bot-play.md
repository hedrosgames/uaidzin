---
feature: bot-play
status: delivered
updated: 2026-09-12
branch: UAIDZIN
commits: f546d42..working-tree
---

# Bot Play — 10x + autoteste longo

## Report

**What was built** — Botão 10× no HUD (`timeScale` no tick), toast de juice em learn/spend/level-up/dungeon, helpers de bot (`learnRandomSkill`, `spendRandomAttributes`, `getAliveEnemies`, `openInteractionById`) no `__UAIDZIN__`, e `scripts/bot-play.mjs` headed que escolhe classe aleatória, abre portal + mercador (UI placeholder), farmeia dungeons com 10× e distribui skills/atributos até o nível alvo.

**Verification** — `typecheck` PASS · `build` PASS · `smoke` **33/33** · `npm run bot -- --max-level 15 --timeout-min 5 --speed 10` PASS (lv 15 em 1.4 min, pageErrors 0, interactionsOpened 2). Review subagent ACCEPT (10/10 DoD). Fix pós-review: toast em tempo real (não escala com 10×), sem toast duplo no `enterDungeon`, clamp de `--speed` para 1|10.

**Journey log**
- `maxDelta` 0.1 × timeScale 10 → sim ok; UI timers não podem usar dt escalado (toast ficava 220ms).
- `enterWorld` já emite `dungeon:entered`; debug wrapper não deve re-toastar.
- Smoke “morte mantém mesh” é flake de timing (1/2 runs); passou no re-run.

## [S1] Problem

O greybox tem o loop cidade→dungeon e smoke curto, mas não havia como acelerar o tempo, nem rodar um bot visível que escolhe classe, compra skills, distribui atributos e farmeia até o nível 150, com juiciness e UI placeholder no ciclo.

## [S2] Design

### 1. Botão 10x (timeScale)

- `timeScale` em `GameApp` (1 ou 10). Default 1. Botão `#speed-toggle`.
- `tick` multiplica `deltaSeconds` por `timeScale` antes de `session.update`.
- API: `setTimeScale` / `getTimeScale` / snapshot `timeScale`.
- Toast usa dt **não escalado** (chrome de UI em tempo real).

### 2. Hooks de progressão

- Snapshot: `skillPoints`, `unspentPoints`, `timeScale`, `skillSlots`.
- `learnRandomSkill()`, `spendRandomAttributes()`, `getAliveEnemies()`, `openInteractionById`, `confirmInteraction`.

### 3. Juiciness

Toast `#ui-toast` + pulse no level-label em learn, spend, level-up e entrada de dungeon.

### 4. UI placeholder

Wire painel do Guarda do Portal + `enterDungeon`. Bot abre `npc-portal-guard` e `npc-merchant` pelo caminho real.

### 5. Bot Playwright headed

`scripts/bot-play.mjs` + `npm run bot`. Args: `--base`, `--max-level` (150), `--timeout-min`, `--speed` (1|10). Ciclo: clearSave → classe aleatória → 10x → interações → dungeon → teleport em inimigo → learn/attrs → RESULT → cidade → repete.

## [S3] Out of Scope

Quests narrativas, balance fino até 150, áudio/assets, multiplayer, CI headless de 150 níveis.

## Definition of Done

1. [x] Botão 10x visível; alternar muda o ritmo.
2. [x] `npm run bot -- --max-level 15 --timeout-min 5` completa nível ≥ 15 sem pageerror.
3. [x] Classe aleatória no Novo jogo.
4. [x] Skills aleatórias quando há pontos.
5. [x] Atributos aleatórios (unspent → 0).
6. [x] Entra dungeon, mata mobs, volta à cidade.
7. [x] Toast/pulse em learn, spend, level-up e entrada de dungeon.
8. [x] InteractionPanel em portal + 1 NPC.
9. [x] typecheck + build + smoke PASS.
10. [x] YAGNI; helpers só no debug API.

## Tasks

- [x] T1: timeScale + botão 10x + snapshot (covers: S2.1)
- [x] T2: learnRandomSkill + spendRandomAttributes + juiciness UI (covers: S2.2, S2.3)
- [x] T3: bot-play.mjs headed com ciclo completo (covers: S2.4, S2.5)
- [x] T4: smoke estendido + typecheck + build (covers: S2.1–S2.5)

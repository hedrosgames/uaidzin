---
feature: combat-feedback
status: delivered
updated: 2026-09-10
branch: UAIDZIN
commits: d34ece1..HEAD
---

# Combat Feedback (ataque e dano visíveis)

## Report

**What was built** — EffectManager de apresentação com números de dano DOM (inimigo/jogador/skill/KO), telegrafia de ataque (face + pulse + slash), flash de emissive no alvo, death scale-out, anel de alcance do ataque básico e skill-slot com cooldown. EnemyRuntimeView passa a consultar o EffectManager para não sobrescrever flash/morte (fix C1/C2 da review).

**Verification** — `npm run typecheck` PASS · `npm run build` PASS · `npm run smoke` **21/21 PASS** incluindo `números de dano gerados` e `morte mantém mesh visível (scale-out)` com `{alive:false, visible:true, dying:true}`. Screenshot em `docs/compose/combat-feedback.png`.

**Journey log**
- Eventos `combat:hit` existiam sem VFX — farm “parecia” sem combate.
- Review flagou C1/C2: `EnemyRuntimeView.sync` sobrescrevia emissive/visible no mesmo frame.
- Smoke só com `fxCount` não pega flash/morte; assert de `visible/dying` no mesh pegou o regression.

## [S1] Problem

O combate calcula dano e emite eventos, mas o jogador não via ataques nem dano (sem números, telegrafia, flash ou dissolve de morte).

## [S2] Design

Apresentação apenas. Domínio de combate intacto.

1. Número flutuante DOM por hit (enemy / player / skill / kill=KO).
2. Ataque: face o alvo, pulse do player, slash player→alvo.
3. Flash vermelho no inimigo (~120ms) — pula overwrite do sync enquanto ativo.
4. Morte: scale→0 (~220ms) **antes** de `visible=false`.
5. Anel de alcance quando há alvo no range do básico.
6. Skill slot esmaece em cooldown.

`EffectManager.isFlashing` / `isDying` são a fonte de verdade para o view.

## [S3] Out of Scope

Áudio, shaders, partículas físicas, animações skeletais, i-frames, target selection.

## Tasks

- [x] T1: EffectManager + overlay DOM + CSS
- [x] T2: Wire hit/skill/player damage/death
- [x] T3: Indicador de alcance + pulse
- [x] T4: Smoke Playwright (21/21, inclui assert de death visibility)
- [x] T5: typecheck + build + commit

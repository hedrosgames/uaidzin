---
feature: hub-ui
status: delivered
updated: 2026-09-10
branch: UAIDZIN
commits: 
---

# Hub UI — login, HUD WYD e painéis

## Report

**What was built** — O hub abre em login (admin/admin) → seleção de personagem (criar com classe + nome, ou entrar com o save) → cidade 3D. A tela Continuar/Novo jogo e o debug HUD padrão saíram do fluxo. O HUD do hub tem frame WYD no topo-esquerdo (face da classe, nome, nível, HP, MP, XP), skill bar inferior-central com teclas 1–4, cooldown e click, HP em world space sobre o jogador (verde ≥40%, vermelho &lt;40%) e tutorial só com C/K/I. MP mínimo: `50 + level*8 + INT`, custo 8 por cast, regen 4/s. Painéis C/K/I na paleta Salão/Brasa.

**Verification** — `npm run typecheck` (PASS). `npm run smoke` Playwright: 44/44 (login/seleção/entrada, frame, MP, HP world bar, help-bar, painéis C/K/I, skill cast, F1 debug, save). Review apontou XP de sessão no frame — corrigido para `progressionXp`.

**Journey log**
- `CityGameSession.ts` foi sobrescrito por engano durante um edit; restaurado de `HEAD` e reaplicado.
- `classId` default `"TK"` enganava o fluxo “já existe personagem”; flag `hadSave` resolve.
- `_strip-comments.mjs` quebra `/// <reference types="vite/client" />`; `vite-env.d.ts` restaurado à mão.
- Worktree não usado (pedido do usuário) por causa das dezenas de mudanças sujas em `game/`.
- `SessionHud.xp` era dual (sessão dungeon vs progressão); frame usa `progressionXp`.

## [S1] Problem

A interface do hub estava em greybox: tela Continuar/Novo jogo bloqueava o fluxo login → seleção → cidade, debug HUD ocupava o canto, HP vivia só numa barra inferior genérica, sem MP, skills sem UX de disponibilidade e tutorial com teclas obsoletas.

## [S2] Design

### Fluxo de boot

1. **Login** — overlay no jogo (admin/admin). Entrar habilita com os dois campos.
2. **Seleção de personagem** — com save: card + nome + Entrar; sem save: grid de classe + nome + Criar e entrar.
3. **Cidade** — sem painel Continuar/Novo jogo. `N` não abre painel. Troca de classe fica no painel Skills (K).

### HUD do hub

- Frame topo-esquerdo: retrato `/faces/face-*.png`, `Lv`, nome, HP, MP, XP.
- Skills inferior-central: até 4 slots, tecla, nome, cooldown, ready glow, click casta.
- HP world space do jogador id `player`, regra 40%.
- Debug HUD default off (F1 alterna).
- Help-bar: `C` personagem · `K` skills · `I` inventário.

### MP mínimo

- `CharacterModel`: `mp`, `maxMp`, `SKILL_MP_COST = 8`.
- `maxMp = 50 + level * 8 + INT`.
- Regen `4/s`. Cast sem MP não roda.

## [S3] Out of Scope

- Google login / backend.
- AES-GCM do protótipo HTML.
- Custo de MP variável por skill.
- Rebalance de combate.
- Mobile HUD.

## Tasks

- [x] T1: Boot login + seleção; remover start panel e debug HUD default
- [x] T2: CharacterModel + SkillController com MP mínimo
- [x] T3: Frame WYD topo-esquerdo + XP bar
- [x] T4: Skill bar inferior-central com CD e click/teclas 1–4
- [x] T5: HP world bar do jogador
- [x] T6: Help-bar só C/K/I + restilo dos painéis
- [x] T7: Smoke atualizado — typecheck e smoke verdes

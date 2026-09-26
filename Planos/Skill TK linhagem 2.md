# Skill TK — linhagem 2 (Controle) — implementação

## Comportamento

- Árvore `controle` (`TK_CONTROLE` em `tk.ts`): 8 skills.
- Depende da **barra 10** do plano linhagem 1 para teste ponta a ponta no wire; VFX/dispatch já podem existir no código.
- Mapa VFX: `tk_ctrl_shield`→`muralha`, `resistance`→`postura`, `taunt`→`provocacao`, `imunity`→`escudo-sagrado`, `parry`→`guarda`, `sustain`→`bencao`, `fear`→`rugido`, `divine_armor`→`bastiao` (aprendizado passiva, não cast normal).
- Skills `self` frontais: direção = alvo − origem, senão `(sin facing, 0, cos facing)` (`EffectManager.directionFor`).
- Resistance: `postura` com duração curta (~3 s) no cast; buff HP 14 s separado.
- Imunity: `desc` menciona redução vs arquétipo `ranged` (regra atual de `magicResist`).
- Divine Armor: passiva 8ª; opcional VFX `bastiao` ao comprar nível 1 (`playPassiveLearnVfx`).

| Pos | Skill | Id | Barra | VFX |
|---:|---|---|---|---|
| 1 | Shield | `tk_ctrl_shield` | sim | muralha |
| 2 | Resistance | `tk_ctrl_resistance` | sim | postura |
| 3 | Taunt | `tk_ctrl_taunt` | sim | provocacao |
| 4 | Imunity | `tk_ctrl_imunity` | sim | escudo-sagrado |
| 5 | Parry | `tk_ctrl_parry` | sim | guarda |
| 6 | Sustain | `tk_ctrl_sustain` | sim | bencao |
| 7 | Fear | `tk_ctrl_fear` | sim | rugido |
| 8 | Divine Armor | `tk_ctrl_divine_armor` | não | bastiao no learn |

## Passos

### Já no código (pular se presente)

1. `EffectManager.directionFor` nos cases `muralha`, `escudo-sagrado`, `guarda`.
2. `SkillVfxCatalog`: entradas controle; sem `tk_ctrl_1..8`.
3. `CityGameSession.playPassiveLearnVfx` + mapa `divine_armor`→`bastiao`.
4. `tk.ts`: 8× `desc` pt-BR; duração postura via `VFX_BALANCE.skillBuffRingSeconds` (≈3 s).
5. `scripts/check-tk-dispatch.mjs controle` (`npm run tk:dispatch:qa`).

### Pendente

6. `scripts/check-tk-controle.mjs`: Playwright (molde `check-tk-fisica.mjs`) — comprar 8, 7 na barra, cast por tecla/clique, taunt/stun/cura/buffs, 8ª exclusiva, reload.
7. Ajuste fino opcional: `ringMaxRadius` provocacao / ondas rugido vs raios mecânicos (só se reprovar visual).
8. Inventários: `skills.md`, `classes.md`, `vfx.md`, `VFX-KIT-FIREBURST.md` — ids e mapa controle.

## Testar

- [ ] Shield/Imunity/Parry: VFX à frente da `facing` em 4 direções.
- [ ] Taunt: inimigos perseguem 5 s; dano em área.
- [ ] Fear: stun 1,6 s no raio.
- [ ] Sustain: cura 10 % HP máx; auto ≤62 % HP.
- [ ] Divine Armor: −12 % dano recebido; bloqueia 8ª das outras árvores.
- [ ] `node scripts/check-tk-dispatch.mjs controle` verde.
- [ ] `node scripts/check-tk-controllers.mjs muralha postura provocacao escudo-sagrado guarda bencao rugido bastiao` verde.
- [ ] `cd game && npm run typecheck && npm run vfx:runtime:qa && npm run smoke`.

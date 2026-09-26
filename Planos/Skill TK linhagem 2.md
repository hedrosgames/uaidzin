# Skill TK — linhagem 2 (Controle) — implementação

## Comportamento

- Árvore `controle` (`TK_CONTROLE` em `tk.ts`): 8 skills.
- Pré-requisito de UX: barra 10 do plano linhagem 1 para montar as 7 ativas no wire.
- Mapa VFX: `tk_ctrl_shield`→`muralha`, `tk_ctrl_resistance`→`postura`, `tk_ctrl_taunt`→`provocacao`, `tk_ctrl_imunity`→`escudo-sagrado`, `tk_ctrl_parry`→`guarda`, `tk_ctrl_sustain`→`bencao`, `tk_ctrl_fear`→`rugido`; `tk_ctrl_divine_armor`→`bastiao` só no aprendizado (passiva).
- Skills `self` frontais: direção = alvo − origem; sem alvo válido, `(sin facing, 0, cos facing)`.
- Resistance: anel `postura` ~3 s no cast; buff `maxHp` 14 s no `BuffService`.
- Imunity: `desc` cita redução vs inimigos `archetype === "ranged"`.
- Divine Armor: passiva 8ª; `eighthTree = "controle"`; não entra na barra.

| Pos | Skill | Id | Barra | VFX |
|---:|---|---|---|---|
| 1 | Shield | `tk_ctrl_shield` | sim | muralha |
| 2 | Resistance | `tk_ctrl_resistance` | sim | postura |
| 3 | Taunt | `tk_ctrl_taunt` | sim | provocacao |
| 4 | Imunity | `tk_ctrl_imunity` | sim | escudo-sagrado |
| 5 | Parry | `tk_ctrl_parry` | sim | guarda |
| 6 | Sustain | `tk_ctrl_sustain` | sim | bencao |
| 7 | Fear | `tk_ctrl_fear` | sim | rugido |
| 8 | Divine Armor | `tk_ctrl_divine_armor` | não | bastiao (learn) |

## Passos

### A — Direção no despacho

1. `EffectManager.ts`: método privado `directionFor(input, target)` — vetor no plano XZ; fallback `facing` quando `target ≈ origin`.
2. Cases `muralha`, `escudo-sagrado`, `guarda`: passar `directionFor` em vez de `target − origin` cru.

### B — Mapa VFX

3. `SkillVfxCatalog.ts`: entradas da tabela acima; remover chaves mortas `tk_ctrl_1` … `tk_ctrl_8`.
4. `case "postura"`: argumento de duração curta (provisório **3 s**) via `VFX_BALANCE.skillBuffRingSeconds` ou literal no dispatch.

### C — Descrições e wire

5. `skill-types.ts`: `desc?` em `SkillInput` / `SkillDef`; `defineSkill` copia `desc`.
6. `tk.ts`: `desc` pt-BR nas 8 controle (textos abaixo).
7. `WireGameBridge.buildWireSkillCatalog`: expor `desc` e `passive`; fallback `desc ?? name`.
8. `03-wire-paineis-cidade.html`: tooltip/Mestre mostram `desc`; passiva: linha “Passiva · não vai para a barra”; ocultar MP/CD na passiva.

**Textos `desc`:**

- Shield: “Ergue a guarda: defesa +32 % por 12 s.”
- Resistance: “Raízes de aço: HP máximo +25 % por 14 s e cura 12 % do HP máximo ao usar. Nível aumenta a cura.”
- Taunt: “Batida no escudo: dano leve em área e todos os inimigos num raio de 5 m vêm atrás de você por 5 s.”
- Imunity: “Vidro consagrado: reduz em 35 % o dano de ataques à distância por 12 s.”
- Parry: “Ricochete: 18 % de chance de aparar qualquer ataque por 10 s.”
- Sustain: “Brasa vital: recupera 10 % do HP máximo. Nível aumenta a cura.”
- Fear: “Sombra do elmo: dano em área e todos num raio de 3,8 m ficam atordoados por 1,6 s. Nível aumenta o dano.”
- Divine Armor: “Couraça solar. Passiva: todo dano recebido cai 12 %. Só uma 8ª skill por personagem. Não entra na barra.”

### D — Passiva capstone

9. `CityGameSession`: `playPassiveLearnVfx(skill)` após aprender com sucesso — se `kind === "passive"`, nível 1 e perfil com `dedicatedVfx`, `dispatchSkillVfx` com origem no jogador.
10. Mapa inclui `tk_ctrl_divine_armor: "bastiao"` para o perfil de aprendizado (cast normal de passiva continua genérico).

### E — QA

11. `game/scripts/check-tk-dispatch.mjs`: simula `dispatchSkillVfx` para as 8 em 5 direções; exige `desc`; `npm run tk:dispatch:qa` em `package.json`.
12. `game/scripts/check-tk-controle.mjs`: Playwright (molde `check-tk-fisica.mjs`) — comprar 8, 7 na barra, casts, taunt/stun/cura/buffs, 8ª exclusiva, reload.

### F — Docs (ao fechar)

13. `nongame/docs/inventarios/skills.md`, `classes.md`, `vfx.md`, `VFX-KIT-FIREBURST.md`: ids controle e mapa VFX.

## Testar

- [ ] Shield/Imunity/Parry: muralha/escudo/guarda à frente da `facing` (4 direções).
- [ ] Taunt: aggro 5 s; dano em raio 5 m.
- [ ] Fear: `stunTimer` 1,6 s.
- [ ] Sustain: cura 10 % HP máx; auto com HP ≤ 62 %.
- [ ] Divine Armor: `damageReduction` 0,12; Bastião uma vez ao comprar; bloqueia 8ª fisica/magia.
- [ ] `node scripts/check-tk-dispatch.mjs controle` verde.
- [ ] `node scripts/check-tk-controllers.mjs muralha postura provocacao escudo-sagrado guarda bencao rugido bastiao` verde.
- [ ] `cd game && npm run typecheck && npm run vfx:runtime:qa && npm run smoke`.

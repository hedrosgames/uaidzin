# Skill TK — linhagem 2 (Controle) — implementação

Executar passos **1 → 15** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Skill TK linhagem 1.md` passos **1–20** (barra 10 + wire + `desc` em `skill-types.ts`) para teste completo no painel K.
- Passos **1–10** deste plano (VFX + textos) podem rodar antes da barra 10; passos **13–15** (Playwright + fechamento) dependem da linhagem 1.
- Depois de `Planos/Refatoracao 5.md` (skill sem nível), `6.md` (`tryLearnSkill` na sessão) e `8.md` (UI em `game/src/ui/wire/skills.ts`, sem `GamePanels`).
- `directionFor` fica em `EffectManager`. Se `Planos/Refatoracao 9.md` já rodou, não recriar campos `tk*` — o `TkVfxRegistry` resolve o controller.

## Comportamento

- Ficha: `game/src/data/classes/skills/tk.ts` → `TK_CONTROLE`.
- Skill aprendida uma vez. Sem “Melhorar”, sem `levelScale`. Cura e dano abaixo são o valor base da ficha; sem compensar bônus de nível (Pendências).
- Mapa VFX (`game/src/presentation/effects/skill/SkillVfxCatalog.ts`):

| Id | VFX | Momento |
|---|---|---|
| `tk_ctrl_shield` | `muralha` | cast |
| `tk_ctrl_resistance` | `postura` | cast (~3 s visual) |
| `tk_ctrl_taunt` | `provocacao` | cast |
| `tk_ctrl_imunity` | `escudo-sagrado` | cast |
| `tk_ctrl_parry` | `guarda` | cast |
| `tk_ctrl_sustain` | `bencao` | cast |
| `tk_ctrl_fear` | `rugido` | cast |
| `tk_ctrl_divine_armor` | `bastiao` | só ao aprender (passiva) |

- Buffs frontais (`self`): direção = `alvo − origem` no XZ; se inválida, `(sin facing, 0, cos facing)` — mesma convenção de `SkillCasting.inFront`.
- Resistance: buff `maxHp` **14 s**; anel `postura` **~3 s** no cast (`VFX_BALANCE.skillBuffRingSeconds` ou constante no dispatch).
- Imunity — `desc` honesta: reduz dano de inimigos com `archetype === "ranged"`.
- Divine Armor: passiva 8ª; `eighthTree = "controle"`; não entra na barra.
- Aprender: `markDirty("skills", "deferred")` (e `skillLoadout` se a linhagem 1 equipar). Debug só em `import.meta.env.DEV`.

## Passos

### A — Direção no despacho

1. `game/src/presentation/effects/EffectManager.ts` — método privado `directionFor(input, target): Vector3`.
2. Mesmo arquivo — cases `muralha`, `escudo-sagrado`, `guarda`: usar `directionFor` no lugar de `target.sub(origin)` direto.

### B — Mapa VFX

3. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — entradas da tabela acima; **remover** chaves `tk_ctrl_1` … `tk_ctrl_8`.
4. `game/src/presentation/effects/EffectManager.ts` — `case "postura"`: passar duração visual **3 s** (provisório).
5. `game/src/data/balance/vfx.ts` — constante `skillBuffRingSeconds` (= 3) se centralizar duração.

### C — Textos (controle)

6. `game/src/data/classes/skills/tk.ts` — `desc` pt-BR nas 8 de `TK_CONTROLE` (se passo 15 da linhagem 1 já fez `skill-types`, só preencher strings).
7. `game/src/ui/WireGameBridge.ts` — `desc` e `passive` no catálogo da `WireApi` (igual linhagem 1); sem `level` nem `upCost`.
8. `game/src/ui/wire/skills.ts` — tooltip/Mestre para as 8 controle. Rótulos Comprar / Aprendida.

Textos para `tk.ts`:

- Shield — “Ergue a guarda: defesa +32 % por 12 s.”
- Resistance — “Raízes de aço: HP máximo +25 % por 14 s e cura 12 % do HP máximo ao usar.”
- Taunt — “Batida no escudo: dano leve em área e todos os inimigos num raio de 5 m vêm atrás de você por 5 s.”
- Imunity — “Vidro consagrado: reduz em 35 % o dano de ataques à distância por 12 s.”
- Parry — “Ricochete: 18 % de chance de aparar qualquer ataque por 10 s.”
- Sustain — “Brasa vital: recupera 10 % do HP máximo.”
- Fear — “Sombra do elmo: dano em área e todos num raio de 3,8 m ficam atordoados por 1,6 s.”
- Divine Armor — “Couraça solar. Passiva: todo dano recebido cai 12 %. Só uma 8ª skill por personagem. Não entra na barra.”

### D — VFX ao aprender passiva

9. `game/src/app/CityGameSession.ts` — `play passiveLearnVfx(skill)`: se passiva recém-aprendida e o perfil tem `dedicatedVfx`, chamar `effects.dispatchSkillVfx` com origem no jogador.
10. `game/src/app/CityGameSession.ts` — chamar `play passiveLearnVfx` no sucesso de `tryLearnSkill` (e no helper de learn da linhagem 1, se existir).

### E — QA Node

11. `game/scripts/check-tk-dispatch.mjs` — adicionar árvore `controle` (8 skills, 5 direções, `desc` obrigatório, controller certo).
12. `cd game && node scripts/check-tk-controllers.mjs muralha postura provocacao escudo-sagrado guarda bencao rugido bastiao`.

### F — QA navegador

13. `game/scripts/check-tk-controle.mjs` (novo) — Playwright: TK, comprar as 8 uma vez, 7 ativas na barra, casts, taunt 5 s, stun 1,6 s, cura, 8ª exclusiva, reload. Sem “Nível x / 10”.

### G — Fechamento

14. `cd game && npm run typecheck && npm run vfx:runtime:qa && npm run smoke`.
15. `cd game && node scripts/check-tk-dispatch.mjs controle`.

## Testar

- [ ] Shield / Imunity / Parry: VFX à frente da facing (4 direções).
- [ ] Taunt: aggro 5 s; dano em raio 5 m.
- [ ] Fear: `stunTimer` 1,6 s.
- [ ] Sustain: cura 10 % HP máx; auto com HP ≤ 62 %.
- [ ] Divine Armor: `damageReduction` 0,12; Bastião uma vez ao comprar; bloqueia 8ª física/magia.
- [ ] Segunda compra bloqueada; UI sem “Melhorar”.
- [ ] Passos 12–15 verdes.

## Pendências

- Rebalanceamento de cura e dano base (Resistance, Sustain, Fear) fica com o dono. Não somar o antigo bônus de nível.

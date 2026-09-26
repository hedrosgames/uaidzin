# Skill TK — linhagem 1 (Física) — implementação

## Comportamento

- Árvore `fisica` (`TK_FISICA` em `game/src/data/classes/skills/tk.ts`): 8 skills, ids canônicos do código.
- Barra **10** posições (`SKILL_BALANCE.barSize`); teclas **1–9** e **0**; slot vazio permitido; passivas **não** entram na barra.
- Ao equipar: `auto: false` (manual até o jogador ligar).
- Save: `skillLoadout.slots[].index` opcional; sem bump de `SAVE_VERSION`.
- Compra/melhoria: 1 ponto + `(posiçãoNaÁrvore + 1) × 28` ouro por nível; teto nível 10; 8ª exclusiva (`eighthTree`).
- UI: nomes EN do `name`; `desc` pt-BR na ficha; wire espelha save (sem `bar[]` mock).
- Force Wave: VFX `golpe` na origem + impacto `quebra` no alvo se distância > raio do arco.
- Earthquake: hit 360° (aoe); VFX `avalanche` (cone) — manter divergência.
- Mapa VFX (ativas): `tk_fis_force_wave`→`golpe`, `tk_fis_atk_descuidado`→`descuidado`, `tk_fis_death_stab`→`investida`, `tk_fis_fury`→`furia`, `tk_fis_earthquake`→`avalanche`, `tk_fis_fire_burst`→`chain`.

| Pos | Skill | Id | Barra | VFX |
|---:|---|---|---|---|
| 1 | Force Wave | `tk_fis_force_wave` | sim | golpe + quebra no alvo |
| 2 | Atk Descuidado | `tk_fis_atk_descuidado` | sim | furia (paleta descuidado) |
| 3 | Mestre Dual | `tk_fis_mestre_dual` | não (passiva) | genérico passiva |
| 4 | Death Stab | `tk_fis_death_stab` | sim | investida (alvo mais distante em line) |
| 5 | Fury | `tk_fis_fury` | sim | furia (paleta padrão) |
| 6 | Increase Critical | `tk_fis_increase_critical` | não (passiva) | genérico passiva |
| 7 | Earthquake | `tk_fis_earthquake` | sim | avalanche |
| 8 | Fire Burst | `tk_fis_fire_burst` | sim | chain / FireBurst |

## Passos

### F1 — Barra 10 (domínio)

1. `data/balance/skills.ts`: `barSize: 10`.
2. `SkillLoadout.ts`: array fixo 10; `assign(skillId, index?)`, `clearSlot`, `toggleAuto`; `refresh()` só revalida (sem auto-preencher); `auto: false` ao equipar; `snapshot`/`applySaved` com `index`; remover `slice(0, 4)`.
3. `SkillController.ts`: 10 `slotStates`; `manualSlot`/`slotLabels` com vazios.
4. `CityGameSession`: após aprender nível 1 ativa, `assign` na primeira vaga; helper único pós-`learn` (refresh, assign, `playPassiveLearnVfx`); debug equip liga `auto` na posição.
5. `DebugApi`: `skillSlots` = posições ocupadas, não tamanho fixo.

### F2 — Teclas

6. `PlayerController.ts`: `consumeSkillSlotPressed()` → índice 0–9 ou −1 (Digit1–9, Digit0, numpad).
7. `CityGameSession.skillSlotPressed`: usar índice 0–9.

### F3 — Save posição

8. `SaveTypes` + `migrations.asLoadoutSlots`: campo `index?`.
9. `SkillLoadout.applySaved`: sem `index`, preenche em sequência.

### F4 — Wire barra e painel K

10. `WireGameBridge`: `barSnapshot`, `equipSkill`, `unequipBar`, `toggleAuto`; catálogo com `barSize`, `desc`, `passive`, `levelCap`; remover `upCost` morto.
11. `WireUi.applyBarState`: cooldown/ready/auto nos anéis (sem innerHTML por frame desnecessário).
12. `visual/telas/03-wire-paineis-cidade.html`: barra e K a partir da bridge; árvores TK reais (`SHOP_TREES`); remover mocks HT; livros ocultos.
13. `GameApp.renderHud`: chama `applyBarState`.
14. `GamePanels`: `learn` → `tryLearnSkill` (ouro + save).

### F5 — Descrições

15. `tk.ts`: campo `desc` nas 8 físicas (textos pt-BR abaixo).
16. Wire: passiva mostra “Passiva · não vai para a barra”; esconde MP/CD onde couber.

**Textos `desc` (colar em `tk.ts`):**

- Force Wave: “Onda de força que atinge um inimigo à frente a média distância. Dano físico da arma. Nível aumenta o dano.”
- Atk Descuidado: “Abre a guarda: ataque +28 % e defesa −18 % por 12 s. Não acumula com ele mesmo.”
- Mestre Dual: “Passiva. Com duas armas (machados ou espadas duplos) o ataque sobe 22 %. Não entra na barra.”
- Death Stab: “Estocada que atravessa até 3 inimigos à frente, ignorando parte da defesa. Nível aumenta o dano.”
- Fury: “Fúria de combate: velocidade de ataque +32 % por 10 s.”
- Increase Critical: “Passiva. Chance de crítico +12 % em golpes e skills. Não entra na barra.”
- Earthquake: “Terremoto: dano de terra em todos os inimigos num raio de 3,6 m. Nível aumenta o dano.”
- Fire Burst: “Correntes de fogo explodem num raio de 4,4 m. Só uma 8ª skill por personagem: comprar esta bloqueia as 8ª de Defensivo e Mágico.”

### F6 — Mestre: comprar e melhorar

17. Wire `canBuySkill`: `level < levelCap`; rótulos Comprar / Melhorar / Máximo.
18. `economy.ts`: remover `upCost` não usado.

### F7 — VFX mapa e ciclo de vida

19. `SkillVfxCatalog.ts`: mapa física; remover chaves mortas `tk_fis_1..7`; `tk_fis_death_stab`→`investida`, `tk_fis_atk_descuidado`→`descuidado`.
20. `SkillVfxTypes`: união inclui `descuidado`.
21. `EffectManager`: interface/lista única para `update`/`clear`/`dispose`/`getSkillVfxState` dos controllers TK; instância `tkDescuidado` + `case "descuidado"`.
22. `scripts/check-tk-fisica.mjs`: Playwright fluxo completo (comprar 8, barra, teclas, casts, buffs, 8ª, reload).

### S1 — Force Wave

23. `case "golpe"`: se alvo longe, chamar impacto `quebra` no alvo.

### S2 — Atk Descuidado

24. `FuriaVfxConfig.palette` opcional; texturas/shader/luz consomem paleta; instância descuidado bronze/cinza.

### S3–S6 — Passivas e Fury

25. Só validar `desc` e regras de barra (S3, S6 passivas; S5 Fury instância padrão).

### S4 — Death Stab

26. `case "investida"`: fim da trilha = alvo mais distante em `input.hits` quando line.

### S7–S8 — Earthquake e Fire Burst

27. Só `desc`; Fire Burst sem alterar VFX.

### Docs (opcional ao fechar)

28. `nongame/docs/inventarios/skills.md`, `classes.md`, `vfx.md`, `save-load.md`: alinhar ids/nomes/barra 10.

## Testar

- [ ] Barra 10 persiste posição vazia e índice após reload.
- [ ] Tecla `0` dispara slot 10.
- [ ] K e Mestre mostram árvore TK; arrastar equipa via save.
- [ ] Melhorar 1→10 debita ouro/pontos; nível 10 bloqueia.
- [ ] `node scripts/check-tk-dispatch.mjs fisica` verde.
- [ ] `node scripts/check-tk-fisica.mjs` verde (se Playwright disponível).
- [ ] Force Wave: arco + impacto no alvo distante.
- [ ] Atk Descuidado / Fury: buffs corretos; paletas distintas.
- [ ] Death Stab: até 3 alvos; trilha no mais distante.
- [ ] Fire Burst trava outras 8ª.
- [ ] `cd game && npm run typecheck && npm run smoke`.

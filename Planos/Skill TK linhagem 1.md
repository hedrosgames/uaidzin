# Skill TK — linhagem 1 (Física) — implementação

Executar passos **1 → 30** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Comportamento

- Ficha: `game/src/data/classes/skills/tk.ts` → array `TK_FISICA` (8 skills; ids abaixo).
- Barra: **10** slots (`SKILL_BALANCE.barSize`); teclas **1–9** e **0**; posição vazia permitida; passivas **fora** da barra.
- Equipar skill: `auto: false` até o jogador alternar no wire.
- Save: `skillLoadout.slots[].index` opcional; **não** alterar `SAVE_VERSION`.
- Economia skill: **1** ponto + `(índiceNaÁrvore + 1) × 28` ouro por nível; teto nível **10**; oitava skill trava `eighthTree = "fisica"`.
- UI: `name` em EN; `desc` pt-BR na ficha; wire **lê** save (sem array `bar[]` mock).
- Force Wave: VFX `golpe` + impacto `quebra` no alvo se distância origem→alvo > raio do arco.
- Earthquake: dano **360°** (mecânica); VFX `avalanche` (cone) — **não** alinhar mecânica ao cone.

| Pos | Skill | Id | Barra | VFX dedicado |
|---:|---|---|---|---|
| 1 | Force Wave | `tk_fis_force_wave` | sim | `golpe` + `quebra` no alvo |
| 2 | Atk Descuidado | `tk_fis_atk_descuidado` | sim | `descuidado` (paleta sobre `furia`) |
| 3 | Mestre Dual | `tk_fis_mestre_dual` | não | genérico passiva |
| 4 | Death Stab | `tk_fis_death_stab` | sim | `investida` |
| 5 | Fury | `tk_fis_fury` | sim | `furia` (paleta padrão) |
| 6 | Increase Critical | `tk_fis_increase_critical` | não | genérico passiva |
| 7 | Earthquake | `tk_fis_earthquake` | sim | `avalanche` |
| 8 | Fire Burst | `tk_fis_fire_burst` | sim | `chain` / FireBurst |

## Passos

### A — Barra (domínio)

1. `game/src/data/balance/skills.ts` — `barSize: 10`.
2. `game/src/domain/combat/SkillLoadout.ts` — 10 posições fixas; `assign(skillId, index?)`, `clearSlot(index)`, `toggleAuto(index)`; `refresh()` só revalida slots ocupados (sem auto-preencher); `auto: false` em novo equip; `snapshot`/`applySaved` com `index`; remover limite `slice(0, 4)`.
3. `game/src/domain/combat/SkillController.ts` — `slotStates()` com 10 entradas; `manualSlot` / `slotLabels` tratam vazio.
4. `game/src/app/CityGameSession.ts` — helper pós-`skillTree.learn`: `refresh`, `assign` na 1ª vaga se skill ativa nível 1, `playPassiveLearnVfx` se passiva; caminhos debug/bot ligam `auto` na posição equipada.
5. `game/src/debug/DebugApi.ts` — contador `skillSlots` = slots **ocupados**.

### B — Teclado

6. `game/src/gameplay/PlayerController.ts` — `consumeSkillSlotPressed(): number` (0–9 ou −1); Digit1–9, Digit0 e numpad.
7. `game/src/app/CityGameSession.ts` — `skillSlotPressed()` consome índice 0–9.

### C — Persistência

8. `game/src/persistence/SaveTypes.ts` — `SkillLoadoutSlotSave.index?: number`.
9. `game/src/persistence/migrations.ts` — `asLoadoutSlots` copia `index`; `SkillLoadout.applySaved` preenche em sequência se `index` ausente.

### D — Wire (barra + painel K)

10. `game/src/ui/WireGameBridge.ts` — `barSnapshot()`, `equipSkill`, `unequipBar`, `toggleAuto`; catálogo com `barSize`, `desc`, `passive`, `levelCap`; remover `upCost` morto.
11. `game/src/ui/WireUi.ts` — `applyBarState(hudSkills)` repassa cooldown/ready/auto aos anéis.
12. `visual/telas/03-wire-paineis-cidade.html` — barra e painel K alimentados pela bridge; árvores TK via mesma origem do Mestre; remover mocks HT; bloco de livros oculto.
13. `game/src/app/GameApp.ts` — `renderHud` chama `wireUi.applyBarState`.
14. `game/src/ui/GamePanels.ts` — ação aprender chama `tryLearnSkill` (ouro + save).

### E — Campo `desc` (física)

15. `game/src/data/classes/skill-types.ts` — `desc?: string` em `SkillInput` e `SkillDef`; `defineSkill` copia.
16. `game/src/data/classes/skills/tk.ts` — `desc` pt-BR nas 8 de `TK_FISICA` (textos abaixo).
17. `game/src/ui/WireGameBridge.ts` — `desc: sk.desc ?? sk.name`; flag `passive`.
18. `visual/telas/03-wire-paineis-cidade.html` — tooltip/Mestre usam `desc`; passiva: linha “Passiva · não vai para a barra”; ocultar MP/CD na passiva.

Textos para `tk.ts`:

- Force Wave — “Onda de força que atinge um inimigo à frente a média distância. Dano físico da arma. Nível aumenta o dano.”
- Atk Descuidado — “Abre a guarda: ataque +28 % e defesa −18 % por 12 s. Não acumula com ele mesmo.”
- Mestre Dual — “Passiva. Com duas armas (machados ou espadas duplos) o ataque sobe 22 %. Não entra na barra.”
- Death Stab — “Estocada que atravessa até 3 inimigos à frente, ignorando parte da defesa. Nível aumenta o dano.”
- Fury — “Fúria de combate: velocidade de ataque +32 % por 10 s.”
- Increase Critical — “Passiva. Chance de crítico +12 % em golpes e skills. Não entra na barra.”
- Earthquake — “Terremoto: dano de terra em todos os inimigos num raio de 3,6 m. Nível aumenta o dano.”
- Fire Burst — “Correntes de fogo explodem num raio de 4,4 m. Só uma 8ª skill por personagem: comprar esta bloqueia as 8ª de Defensivo e Mágico.”

### F — Mestre (nível 2–10)

19. `visual/telas/03-wire-paineis-cidade.html` — `canBuySkill`: permitir enquanto `level < levelCap`; rótulos Comprar / Melhorar / Máximo.
20. `game/src/data/balance/economy.ts` — remover `SKILL_TRAINING.upCost` não usado e referências na bridge/wire.

### G — VFX mapa e ciclo de vida

21. `game/src/presentation/effects/skill/SkillVfxCatalog.ts` — mapa ids física; remover `tk_fis_1`…`tk_fis_7`; ligar `tk_fis_death_stab`→`investida`, `tk_fis_atk_descuidado`→`descuidado`.
22. `game/src/presentation/effects/skill/SkillVfxTypes.ts` — incluir `"descuidado"` em `DedicatedSkillVfx`.
23. `game/src/presentation/effects/EffectManager.ts` — array/lista única para `update`, `clear`, `dispose`, `getSkillVfxState` dos controllers TK; instância `tkDescuidado`; `case "descuidado"` chama `castFuria` na paleta descuidado.

### H — Ajustes por skill

24. `game/src/presentation/effects/EffectManager.ts` — `case "golpe"`: se alvo além do raio do arco, disparar impacto `quebra` no alvo.
25. `game/src/presentation/effects/tkSkills/furia/` — `FuriaVfxConfig.palette` opcional; texturas/shader/luz leem paleta; padrão = Fury atual; paleta descuidado bronze/cinza na instância do passo 23.
26. `game/src/presentation/effects/EffectManager.ts` — `case "investida"`: fim da trilha = inimigo **mais distante** em `input.hits` (skills `line`).
27. `game/src/data/classes/skills/tk.ts` — conferir `desc` das passivas Fury/Earthquake/Fire Burst (passos 16–18); **não** alterar VFX de Fire Burst.

### I — QA

28. `game/scripts/check-tk-dispatch.mjs` (novo) — argumento `fisica`; simula `dispatchSkillVfx` por skill ativa; exige `desc`; 5 direções; sem NaN.
29. `game/package.json` — script `"tk:dispatch:qa": "node scripts/check-tk-dispatch.mjs"`.
30. `game/scripts/check-tk-fisica.mjs` (novo, molde `check-c6-c20.mjs`) — Playwright: admin, comprar 8, barra, teclas, casts, buffs, 8ª exclusiva, reload.

## Testar

- [ ] Barra 10: posição vazia e índice persistem após reload.
- [ ] Tecla `0` casta slot índice 9.
- [ ] K/Mestre: árvore TK; drag equipa via save.
- [ ] Melhorar 1→10 cobra ouro/pontos; nível 10 bloqueia.
- [ ] Force Wave: arco + impacto no alvo distante.
- [ ] Atk Descuidado e Fury: buffs corretos; VFX cores distintas.
- [ ] Death Stab: até 3 alvos; trilha no mais distante.
- [ ] Fire Burst: `eighthTree = "fisica"` bloqueia outras 8ª.
- [ ] `cd game && node scripts/check-tk-dispatch.mjs fisica` verde.
- [ ] `cd game && node scripts/check-tk-fisica.mjs` verde (com Playwright).
- [ ] `cd game && npm run typecheck && npm run smoke`.

# Loop principal 1→40 — implementação

Executar passos **1 → 55** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

Fecha o loop jogável: conta zerada → TK com machado → D1 com cogumelos → nível 35 → vela grátis no cemitério → atributos e skills que valem o gasto. Depois fecha visual, otimização e as travas do `AGENTS.md` que o código não cumpre.

## Pré-requisitos

- `Planos/Refatoracao 2.md` (save com `markDirty(section, kind)` / `checkpoint`), `4.md` (HudModel por diff), `5.md` (inventário `{ ok, rejected }`, drop recusado perdido), `6.md` (`DungeonFlow`, `RewardService`, `CombatOrchestrator`), `8.md` (wire em `game/src/ui/wire/`, `GamePanels` fora), `9.md` (`TkVfxRegistry`), `11.md` (mundo novo não força `frustumCulled = false`).
- Já pronto e não mexer: `Planos/Skill TK linhagem 1.md` a `3.md`, `Planos/Dungeon 2.md` passos 1–13 (mundo do cemitério, `caveira_*`, blocos d2-b1..b2-b4).
- Os passos **1 → 31** bloqueiam QA de jogo. **32 → 35** são conta/save e podem rodar depois de **1**. **36 → 44** são visuais e só precisam de **1 → 31** verdes. **45 → 51** são otimização. **52 → 55** é QA.
- `Planos/Dungeon 1.md` e `Planos/Dungeon 2.md` ficam substituídos por este plano nos pontos de saída de run, vela e cogumelos.

## Comportamento

- **Personagem novo nasce com 1 machado equipado.** `machado_leve` no inventário zerado e já no slot `weapon`. Continua 5/5/5/5, 0 ouro, skills zeradas, `skillPoints: 0`. A regra "sem equip" do `AGENTS.md` muda para "1 arma de entrada, zero armadura".
- **Dungeon só entra com arma no slot `weapon`.** Sem arma, o portal recusa com mensagem própria e não abre a run. Atributo do jogador conta como armadura para este gate.
- **D1 tem cogumelos.** 3 zonas, 1 boss por zona, `cogumelo_minion` / `cogumelo_minion_2` / `cogumelo_minion_3` e `cogumelo_boss` / `cogumelo_boss_2` / `cogumelo_boss_3`.
- **Correr a run inteira é obrigatório.** Sem `portal-exit` em nenhum world de dungeon. Saída só por morte ou timeout de 600 s. Timer **não** pausa com painel de UI aberto.
- **Timer é único por run e atravessa zona.** `Zona N / 3` no HUD do `dungeon-1`.
- **Vela do cemitério é gratuita.** `entry_vela` a `0` ouro no Ferreiro, consumida na entrada da D2 (1×). Falta de vela → mensagem que cita "Vela". Compra/venda da vela não dá ouro (preço 0).
- **Item de XP é consumível,** não drop de chão: uso manual concede XP e é evento crítico. Valor `(provisório)` — ver Pendências.
- **Subir de nível deixa mais forte sozinho.** Os pontos por nível vão para o atributo primário da classe automaticamente. O painel Person continua permitindo realocar.
- **Pontos de aprendizagem viram passiva de quarta árvore.** `book_hp` (Vida), `book_gold` (Ouro), `book_xp` (Experiência), `book_cd` (Cooldown) entram em `trees` e passam a ser compráveis no Mestre de Habilidades. `specPoints` continua sendo o bônus de cooldown por especialização; são coisas separadas.
- **`admin/admin` só existe em dev.** Build de produção não cria conta padrão nem expõe `resetAdminAccount`.
- **Nome de personagem é único entre slots da conta e entre contas.**
- **Morte grava na hora.** Retorno por morte é `markDirty("character", "critical")`, não `deferred`.
- **Cena tem IBL.** `scene.environment` com `RoomEnvironment` + `PMREMGenerator`; arma e metal leaving de quase preto.
- **Sombra de inimigo acompanha movimento.** `shadowMap.autoUpdate` continua `false`; `needsUpdate` sobe quando jogador **ou** inimigo muda de posição acima de epsilon.
- **Tier baixo tem anti-aliasing.** `samples` mínimo 2, sem depender só de MSAA do render target.
- **Equipar armadura/cabeça/acessório muda o mesh do jogador.**
- **`equipBest` preenche os dois anéis.**
- **Gameplay em timestep fixo 1/60**, igual ao VFX. Resultado de combate idêntico a 30 e 144 fps.

### Pontos de balance tocados (todos provisórios)

| Item | Valor | Fonte |
|---|---|---|
| XP acumulado L1→L40 | 14.612 | `game/src/data/balance/progression.ts` `xpToLevel` |
| XP por abate na D1 | `fixed` 24 · `ranged` 30 · `chaser` 36 | `xpPerKill` × bônus D1 de `RewardService.grantKillXp` |
| XP da caixa | 100 | `Planos/Dungeon 2.md:14` |
| Vida do cogumelo minion | 40 | igual ao arquétipo `fixed` atual |
| Vida do cogumelo boss | 220 | igual a `boss_mortal` atual |
| Respawn cogumelo | minion 5 s · boss 60 s | `Planos/Dungeon 2.md:15,47` pede 60/90 para caveira |
| Atributo primário por nível | 5 pontos | `attributesPerLevel` atual |
| Bônus da passiva `book_xp` | +20 % XP por abate | **novo (provisório)** |
| Bônus da passiva `book_gold` | +20 % ouro por abate | **novo (provisório)** |
| Bônus da passiva `book_hp` | +10 % HP máximo | **novo (provisório)** |
| Bônus da passiva `book_cd` | +10 % de redução de cooldown | **novo (provisório)** |
| Limites do mundo D1 | 36×108, três zonas 36×36 | `Planos/Dungeon 1.md:12` |

## Passos

### A — Persona e início

1. `game/src/app/session/SessionSnapshot.ts` — em `applyBootCharacter`, semear `machado_leve` via `createFromCatalog` no `inventory.items` zerado e marcar `markDirty("inventory", "critical")` junto do `markDirty("character", "critical")` já existente.
2. `game/src/app/session/types.ts` — adicionar `"no_weapon"` em `DungeonEnterReason`.
3. `game/src/app/session/DungeonFlow.ts` — em `dungeonEntryGate`, ler `this.deps.equipment.equipped.weapon` depois do check de nível e devolver `no_weapon`; consumir `entryItemId` só passa depois dessa checagem.
4. `game/src/ui/wire/portal.ts` — `dungeonEnterMessage` do motivo `no_weapon` em pt-BR citando slot `weapon`; cartão da dungeon mostra o slot de arma vazio quando bloqueada por isso.

### B — Dungeon 1

5. `game/src/data/monsters/monsters.json` — seis entradas novas: `cogumelo_minion`, `cogumelo_minion_2`, `cogumelo_minion_3`, `cogumelo_boss`, `cogumelo_boss_2`, `cogumelo_boss_3`, com `name` pt-BR, `maxHp` da tabela, `respawnSeconds` da tabela, `xpReward`, `archetype` e `modelUrl` sob `/models/enemies/`.
6. `game/src/data/dungeons/dungeons.json` — `dungeon-1`: `monsterId` nos seis spawns existentes, `"isBoss": true` nos três bosses, `minLevel: 1` e `maxLevel: 40` mantidos, `durationSeconds: 600` mantido.
7. `game/src/world/WorldManager.ts` — adicionar `"dungeon-1"` em `WorldId` e no mapa de construtores.
8. `game/src/world/Dungeon1WorldBuilder.ts` — arquivo novo: chão, paredes e três zonas de 36×36 em 36×108, spawn do jogador em `(0, 2)`, divisórias entre zonas, `frustumCulled` no padrão, coliders registrados em `world.collision`, nenhum `portal-exit`.
9. `game/src/app/session/DungeonFlow.ts` — `tryEnterDungeon` escolhe o world pelo `def.worldId` com `dungeon-1` no lugar do `dungeonId === "dungeon-2" ? ... : "dungeon-test"` atual; iniciar run em `dungeon-1` reseta o estado de zona.
10. `game/src/world/CityWorld.ts` — remover a criação e o registro de `portal-exit` de `buildTestDungeonWorld` e de `buildDungeon2World`.
11. `game/src/app/GameApp.ts` — `uiBlocked` passado a `CityGameSession.update` deixa de incluir `this.isUiOpen()`; só `!this.entered` bloqueia o tick da run.
12. `game/src/ui/HudModel.ts` — `arenaHint` = `Zona N / 3` por limites de Z quando `world.id === "dungeon-1"`, `Bloco N / 4` mantido para `dungeon-2`.
13. `game/src/ui/HudBarsView.ts` — escrever o nó de `arenaHint` só quando o texto mudar.

### C — Vela e Dungeon 2

14. `game/src/data/items/items.json` — `entry_vela`: `slot: "entry"`, `sellValue: 0`, ícone `/assets/icons/items/seal.svg`.
15. `game/src/data/balance/shops.json` — `entry_vela` a `0` na lista do Ferreiro.
16. `game/src/data/dungeons/dungeons.json` — `dungeon-2.entryItemId: "entry_vela"`.
17. `game/src/app/session/types.ts` — `dungeonEnterMessage` com texto próprio quando o item faltante é `entry_vela`, citando "Vela".
18. `game/src/app/session/DungeonFlow.ts` — manter o `consumeMaterial` + `markDirty("inventory", "critical")` já existente para `entry_vela`.

### D — Progressão e XP

19. `game/src/data/items/item-catalog.ts` — adicionar `"xp"` em `ItemCatalogKind` e `xpReward: number` em `ItemDef`.
20. `game/src/data/items/items.json` — `caixa_sabedoria`: `kind: "xp"`, `slot: "misc"`, `xpReward: 100`, `sellValue` baixo, ícone `/assets/icons/items/caixa.svg`.
21. `game/public/assets/icons/items/caixa.svg` — ícone do consumível, estilo da paleta C do `AGENTS.md`, sem emoji.
22. `game/src/app/CityGameSession.ts` — `tryUseConsumable`: ramo `kind === "xp"` concede `item.xpReward` em `progression.grantXp`, chama `markDirty("character", "critical")` e a skill passiva `book_xp`.
23. `game/src/domain/progression/ProgressionService.ts` — no laço de level up, somar `attributesPerLevel` direto em `state.attributes[CLASSES[state.classId].primary]` em vez de acumular em `unspentAttributePoints`; `recomputeCombatStats()` continua no fim do laço.
24. `game/src/ui/HudBarsView.ts` — renderizar `unspentPoints` como contador ao lado do nível, sem cache de texto.
25. `game/src/ui/wire/person.ts` — manter o botão `+` e o `Resetar`; o `Resetar` reverte para 5/5/5/5 e reacomoda no primário da classe.

### E — Pontos de aprendizagem

26. `game/src/data/classes/class-definitions.ts` — `BOOK_SKILLS` entra em `trees` de cada classe como `"livro"`; remover o export órfão; manter `name` pt-BR e `kind: "passive"`.
27. `game/src/data/balance/skills.ts` — `bookBonus` com os quatro multiplicadores da tabela de balance, por `skillId`.
28. `game/src/domain/combat/SkillController.ts` — `learnedPassives` varre `["controle", "magia", "fisica", "livro"]`; `buildCombatMods` recebe os multiplicadores de XP, ouro e HP.
29. `game/src/app/session/RewardService.ts` — `grantKillXp` e `EconomyService.rollLoot` aplicam `mods.xpMul` e `mods.goldMul`; `ProgressionService.recomputeCombatStats` aplica `mods.hpMul` no `maxHp`.
30. `game/src/domain/combat/SkillLoadout.ts` — `cooldownMultiplier` soma a redução de `book_cd` ao `specializationCooldownPenalty` já existente, respeitando o teto por árvore.
31. `game/src/ui/wire/skillmaster.ts` — quarta coluna de grade para a árvore `livro`; `learnSkill` da árvore já cobra `pointsCost: 1` pelo caminho existente.

### F — Conta e save

32. `game/src/persistence/bootEntry.ts` — `bootstrap()` só cria `admin/admin` sob `import.meta.env.DEV`; em produção, conta inexistente devolve `ok: false` com `error` de login inválido; `resetAdminAccount` sai de `window.UaidzinSave` fora de DEV.
33. `game/src/app/session/DungeonFlow.ts` — `leaveDungeonWithFade("death")` passa a `markDirty("character", "critical")`.
34. `game/src/persistence/SaveVault.ts` — `reserveSlot` recusa `name` já usado em outro slot da conta; `nameInUse(name, exceptSlot)` faz a checagem cruzando `listAccountIds()` e os `slots` de cada conta.
35. `game/public/boot/02-selecao-personagem.html` — mostrar o erro de nome duplicado devolvido por `reserveSlot`; manter a regex `^[A-Za-zÀ-ÖØ-öø-ÿ]{3,12}$` do `isValidCharName`.

### G — Visual

36. `game/src/presentation/rendering/SceneRenderer.ts` — `PMREMGenerator` + `RoomEnvironment` em `scene.environment` no boot; `dispose()` do env map gerado; `outputColorSpace` setado explicitamente.
37. `game/src/presentation/rendering/SceneRenderer.ts` — método `requestShadowUpdate()` público; `followKeyLight` deixa de ser o único gatilho de `shadowMap.needsUpdate`.
38. `game/src/presentation/enemies/EnemyRuntimeView.ts` — em `sync`, chamar `requestShadowUpdate()` quando algum inimigo vivo mudou de posição acima de `0.01`.
39. `game/src/presentation/rendering/GraphicsQuality.ts` — tier `baixo` com `samples: 2`; adicionar `SMAA`/`FXAA` como `ShaderPass` do composer quando `samples === 0`.
40. `game/src/presentation/rendering/SceneRenderer.ts` — `dispose()` chama `this.playerView.dispose()`.
41. `game/src/data/monsters/monsters.json` — `modelUrl` para `fixed`, `chaser`, `ranged`, `boss_mortal` e `lobo_selvagem`.
42. `game/src/presentation/enemies/EnemyRuntimeView.ts` — quando o monstro não tem `modelUrl`, tocar um conjunto de clips de fallback (`idle_2h`, `run`, `attack_swipe`, `death`) em vez de `ctrl.actions` vazio.
43. `game/src/presentation/player/PlayerView.ts` — `setEquipment(equipped, classId)` monta e remove os meshes de `head`, `armor`, `ring1`, `ring2`, `neck` e `ear`; chamar de `CityGameSession.refreshWeaponSetFromGear` junto do `setWeaponSet`.
44. `game/src/ui/WireApi.ts` — `equipBest` escolher `ring1` e `ring2` por `defId` de cada dedo, nunca por `slot === "ring"`.

### H — Otimização

45. `game/src/app/session/CombatOrchestrator.ts` — `SummonFoe[]` em campo reutilizável, escrito in-place no lugar do `this.deps.enemies.enemies.map(...)` por frame.
46. `game/src/presentation/effects/EffectManager.ts` — damage numbers usam `scratchVec` e cache de transform como o HP bar já faz; `toFixed` e `String` só quando o valor muda.
47. `game/src/presentation/enemies/EnemyRuntimeView.ts` — `aliveIds` reutilizado com `.clear()` no lugar de `new Set()` por sync; `destroyEnemy` no `Map` quando o `modelUrl` do protótipo não muda mais.
48. `game/src/app/GameLoop.ts` — timestep fixo de 1/60 com acumulador e no máximo 4 passos por frame; o `delta` bruto alimenta só o `timeScale` e a interpolação de câmera.
49. `game/src/world/CemeteryProps.ts` — remover `mesh.frustumCulled = false` dos props do cemitério, alinhando com `CityProps`.
50. `game/vite.config.ts` — `manualChunks` para `three.quarks`; remover os 30 HTML de lab de VFX de `rollupOptions.input`, deixando só `main`.
51. `game/scripts/optimize-glb.mjs` — script novo: reexporta `.glb` acima de 2 MB com `gltf-transform draco`; `npm run build` não depende dele.

### I — QA

52. `game/scripts/check-loop-principal.mjs` — script novo, molde `check-dungeon-2.mjs`: asserta machado no seed, `no_weapon` no gate, seis `cogumelo_*` em `monsters.json` com `modelId` nos spawns da D1, `dungeon-1` em `WorldId`, ausência de `portal-exit` nos três worlds, `entry_vela` a `0` e ligado na D2, `caixa_sabedoria` com `kind: "xp"`, `bookBonus` para os quatro `book_*`, auto-alocação no primário, `samples >= 2` no tier baixo e `scene.environment` no boot.
53. `cd game && npm run typecheck && npm run build && npm run smoke`.
54. `cd game && node scripts/check-dungeon-2.mjs` — regressão da D2 depois dos passos 10 e 16.
55. `cd game && node scripts/check-loop-principal.mjs`.

## Testar

- [ ] `registerAccount` + `login` cria conta com `level 1`, `xp 0`, `gold 0`, `attributes 5/5/5/5`, `items: [machado_leve]`, `equipped.weapon` = machado, `skillPoints: 0`.
- [ ] Personagem novo abre a D1 sem recusa; abrir de novo com o machado removido do slot devolve `no_weapon` e a run não começa.
- [ ] D1 carrega o world `dungeon-1` com 36×108 e três zonas; HUD mostra `Zona N / 3`.
- [ ] Os seis spawns da D1 instanciam `cogumelo_*` e nenhum cai no render de cápsula.
- [ ] Nenhum dos três worlds de dungeon registra `portal-exit`; não há como sair da run com loot antes dos 600 s.
- [ ] Abrir inventário, Person e Mestre dentro da D1 não congela o timer.
- [ ] Timer chega a `00:00`, dispara `expired` e volta para a cidade com XP, ouro e loot intactos.
- [ ] Entrar na D2 sem vela recusa com mensagem citando "Vela"; comprar a vela no Ferreiro sai por `0` ouro e a entrada consome 1.
- [ ] Usar `caixa_sabedoria` na bolsa soma XP, o número sobe no HUD e recarregar a página mantém o XP.
- [ ] Subir de nível aumenta ATK e HP sem abrir o painel Person; o `Resetar` devolve o primário ao valor coerente.
- [ ] Comprar `book_xp` no Mestre aumenta o XP por abate; `book_cd` soma ao cooldown das skills da barra.
- [ ] `resetAdminAccount` não existe em `window.UaidzinSave` no build; `admin/admin` não é criado no boot de produção.
- [ ] Nome repetido no mesmo slot ou em outra conta é recusado com mensagem no `02-selecao-personagem.html`.
- [ ] Morrer com XP e ouro na bolsa e fechar a aba no fade: o próximo login mantém os valores.
- [ ] Lâmpada e metal da arma recebem reflexo do ambiente; nenhum item metálico fica preto.
- [ ] Inimigo andando com o jogador parado projeta sombra que se move.
- [ ] Tier baixo não fica serrilhado; `npm run typecheck` verde.
- [ ] Equipar `armadura_leve` e `capacete` mostra a malha no TK; `equipBest` com dois anéis de dedos diferentes preenche `ring1` e `ring2`.
- [ ] Rodar a mesma entrada de combate a 30 e 144 fps dá o mesmo número de dano e o mesmo consumo de MP.
- [ ] Cemitério para de desenhar o mausoléu quando o jogador vira as costas.
- [ ] `dist/` não contém os 30 HTML de lab de VFX; `three.quarks` sai em chunk próprio.
- [ ] Passos 52 → 55 verdes.

## Pendências

- Números de balance marcados **(provisório)** na tabela: XP da caixa, os quatro `bookBonus` e as vidas/respawn dos cogumelos. Ajustar depois de medir uma run real de 600 s na D1.
- Passo 23 assume auto-alocação no atributo primário. A alternativa é ponto passivo por nível em `recomputeCombatStats` sem mexer em `unspentAttributePoints`; a escolha muda a tela de distribuição do Person e é do dono.
- Passo 41: os cinco `.glb` dos monstros restantes não existem no disco. Depende de arte; até lá o fallback do passo 42 segura o movimento.
- Passo 43: as malhas de armadura, capacete e acessórios não existem. Sem elas o número do equipamento continua correto e o mesh não muda.
- Passo 39: tier baixo com `samples: 2` custa GPU. Medir em máquina fraca antes de aceitar o custo.
- Passo 48: timestep fixo muda o balance sutil de dano por segundo. Rodar `npm run cycle-balance` depois do passo.
- Passo 32: confirmar se `admin/admin` continua disponível no dev local. Hoje `bootstrap()` roda em qualquer build.
- `game/src/persistence/migrations.ts` devolve `null` para `saveVersion` abaixo de `SAVE_VERSION`. Todo bump de versão até o lançamento perde o save local do dev.
- `nongame/docs/inventarios/skills.md:23` afirma barra de 4 slots; `SKILL_BALANCE.barSize` é 10. Corrigir junto do passo 31.
- `nongame/docs/inventarios/vfx.md:120` marca "morte com clip GLB" como falta; `caveira_normal` e `caveira_especial` já tocam. Corrigir junto do passo 42.
- `VFX_BALANCE.deathSeconds` é config morta: os oito call sites de `playDeath` passam valor explícito. Ajustar junto do passo 42.

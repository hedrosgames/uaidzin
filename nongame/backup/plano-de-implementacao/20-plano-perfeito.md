# 20 — Plano Perfeito

Auditoria: 2026-09-19 · 12 auditores + 1 crítico adversarial + verificação manual do orquestrador.
Baseline medido: `typecheck` verde · `vite build` verde (748 KB) · 75 arquivos TS · 8.943 linhas.

Este documento substitui o otimismo de `32-auditoria-e-cobertura.md`. Tudo aqui tem
`arquivo:linha` e foi verificado no código. Onde é decisão, está marcado como decisão.

---

## 0. O estado real do jogo (leia isto primeiro)

### O pior bug: **equipamento não funciona**

Em um RPG de farm, o loop é loot → equipar → ficar mais forte. Esse loop está quebrado.

- `ProgressionService.ts:113` atribui **absoluto**: `character.attack = attackFromFor(a.FOR)`
- `EquipmentService.ts:52` aplica **incremental**: `character.attack += item.attackBonus + refine`

Toda subida de nível chama `recomputeCombatStats()` (`ProgressionService.ts:44`), e todo
`spendAttribute` também (`:56`). Resultado: **equipar espada +6 → subir de nível → o bônus some.**

Pior, em dois sentidos:

1. Ao desequipar, `removeBonus` (`EquipmentService.ts:58`) subtrai um bônus que já não
   existe → ataque e defesa ficam **abaixo do base**, acumulando a cada ciclo.
2. Em **todo load**: `applySavePayload` chama `restoreEquipped` (`CityGameSession.ts:448`,
   aplica os bônus) e logo depois `recomputeCombatStats` (`:454`, apaga).
   **Equipamento nunca funciona depois de um reload.**

### Três portas para a dungeon, três regras diferentes

| Caminho | Quem usa | Valida evolução? | Valida nível? | Consome item de entrada? |
|---|---|---|---|---|
| `confirmInteraction` (`CityGameSession.ts:1002-1009`) | **o jogador** — `portal-city-decor` (`definitions.ts:90`) | não | sim | **não** |
| `tryEnterDungeon` (`:289-306`) | painel do guarda (`npc-portal-guard`) | sim | sim | sim |
| `enterDungeon()` (`GameApp.ts:307`) | `bot-play.mjs` | não | não | não |

Consequências:

- O portal principal da cidade — apesar do id `portal-city-decor` — é uma **entrada
  totalmente desprotegida**. As regras de entrada existem, mas não estão no fluxo do jogador.
- `pickDungeonForLevel` (`:284-287`) retorna `list[0]`, a **dungeon elegível mais fraca**,
  e as faixas se sobrepõem (`dungeons-mortal.ts:60-61`: D1=1‑40, D2=35‑90).
  **O jogador nunca escolhe a dungeon.**
- Pelo painel do guarda, D4–D8 são inalcançáveis: exigem `entry_d4..d8`, e
  `ItemFactory.createMaterial` (`:49`) só cria `"Ori"` e `"Lac"`. Nenhum drop, loja ou
  receita cria esses itens.
- **Nenhum teste pega nada disso**: `bot-play.mjs` usa o terceiro caminho, que não valida nada.

> **Correção de uma conclusão anterior desta auditoria.** A primeira leitura afirmou que
> evoluir *brica permanentemente* o personagem. Não é verdade: o gate de evolução só
> existe em `tryEnterDungeon` (painel do guarda). Pelo portal da cidade, um personagem
> evoluído continua entrando em dungeon. O que de fato acontece é que o painel do guarda
> passa a **recusar em silêncio** (`GameApp.ts:316-319` não trata `reason: "evolution"`).

### Save: cinco caminhos de perda de dados

- **Save ilegível vira save em branco.** `loadCharacter` (`SaveVault.ts:365-396`) engole a
  exceção e devolve `null`. `GameApp.ts:717` lê `null` como "não existe save" → cria
  personagem novo → `CityGameSession.ts:420` grava por cima. E `writeProfileBlob`
  (`SaveStore.ts:132-137`) rotaciona o blob atual para `:prev` **a cada escrita** — então
  duas escritas zeram os 4 candidatos de recuperação. **Perda total, silenciosa.**
- **Fechar a aba na dungeon perde a run.** O autosave de 30 s só roda em `CITY`
  (`GameApp.ts:175`), e `pagehide` (`:180`) chama `void persistSave(true)` sem `await` —
  a cadeia passa por PBKDF2/AES-GCM assíncrono (`CryptoCodec.ts:308-333`) e a página morre antes.
- **Race entre save de personagem e cofre.** `depositGoldToVault` (`:167-168`) dispara
  `void persistSave(true)` e `void persistAccountVault()` sem sequenciar; ambos fazem
  `loadAccount` + `writeAccount` no mesmo blob. Quem escreve por último vence. Em
  `moveItemToVault` (`:191-192`) o item já saiu do inventário — se o write do cofre for
  clobbado, **o item deixa de existir**.
- **`progress` é destruído em toda gravação.** `CityGameSession.ts:362` grava
  `progress: emptyProgress()`. Não é campo vazio — é apagar ativamente
  `dungeonsUnlocked`/`dungeonClears`/`quests` que a migração recuperou.
- **`loadSlot` troca o `profileId` antes de saber se o load deu certo**
  (`GameApp.ts:422-426`). Se falhar, o próximo autosave grava o personagem antigo
  **por cima do slot novo**.
- **UID de item colide após reload.** `ItemModel.ts:16` — `let uidSeq = 1` reinicia e nada
  o restaura. Todo o inventário endereça itens **por uid**.

### As três doenças estruturais

**D1 — A UI real está fora do build.** `visual/telas/03-wire-paineis-cidade.html`
(3.963 linhas) é buscado por `fetch` em runtime (`WireUi.ts:117`), parseado com `DOMParser`,
CSS escopado por `replaceAll`. Não passa por `tsc`, não entra no bundle. E contém **regra
de negócio**: custo de skill `goldCost: (i+1)*250` (l.1503), `canAffordSkill()` (l.1550),
catálogo de loja com preços (l.3021-3042). A economia do jogo mora num arquivo de design.

**D2 — Documentação com evidência fabricada.** 6 das 7 specs em `game/docs/compose/spec/`
marcam `status: delivered` citando "smoke PASS 21/21, 44/44…". **`npm run smoke` nunca
existiu.** As specs citam SHAs de commit inexistentes (o histórico tem 1 commit, `f3c5fd9`).
`README.md:26` promete `smoke` e descreve `visual/` como "Diagramas do GDD" — é o
código-fonte da UI; apagá-la degrada o jogo em silêncio.

**D3 — Combate mente para o jogador.** Erro de ataque é **invisível** nos dois sentidos
(`CityGameSession.ts:703`, `:778`): quando `rollHitSimple()` falha, nada acontece.
Encostar numa parede **desliga o combate** (`PlayerRuntime.ts:107` mantém `isMoving = true`,
e `AttackController.ts:19`/`SkillController.ts:28` retornam `null` em movimento).
Digitar num campo de texto move o personagem e dispara skills (`PlayerController.ts:11`,
sem checar `event.target`).

---

## A. O que "qualidade" significa neste jogo

1. **Loop fechado** — loot → equipar → mais forte **funciona**. Progressão até o teto sem
   trava dura. Toda recusa do jogo tem feedback visível.
2. **Save confiável** — nenhum caminho perde progresso. Save corrompido avisa e **não
   sobrescreve**. UIDs estáveis. Escritas concorrentes sequenciadas.
3. **Combate legível** — acerto, **erro**, morte e level-up são visíveis. O jogador nunca
   vê "nada aconteceu". Combate não morre por encostar em parede.
4. **UI sem atrito** — o que a UI anuncia, funciona. Zero atalho documentado e morto.
5. **Dados em `data/`** — nenhum número de balanceamento fora de `src/data/balance/`.
   Zero regra de negócio em `src/ui/` ou no HTML.
6. **Verificável** — `typecheck && smoke && build` verdes, headless, sem servidor manual, < 3 min.
7. **Doc honesta** — nenhum documento afirma o que o código não faz.

---

## B. Mapa alvo da estrutura

### Deve existir (`game/src/`)

| Pasta | Responsabilidade | Regra dura |
|---|---|---|
| `core/` | EventBus, GameState, GameClock, erros | Zero Three.js. Zero DOM. |
| `domain/` | **Todas** as regras de jogo | Zero Three.js/DOM, **zero `Math.random()` direto** |
| `data/` | Balanceamento e definições de conteúdo | Só constantes e funções puras |
| `persistence/` | Save, migração, cifra | Único dono de I/O de save; escritas sequenciadas |
| `gameplay/` | Runtime do player | Sem regra de dano/economia |
| `presentation/` | Three.js | Só desenha. Não decide. |
| `ui/` | Binding DOM ↔ domínio | **Só lê e chama.** Zero cálculo. |
| `world/` | Mundos, colisão, limites | — |
| `app/` | Composição e orquestração | Fino. |

### Não deve existir — **decidido**

- `public/data/game-config.json` + `tools/config-editor.html` — **deletar** (DEC-4).
  1.699 linhas que ninguém lê e já divergiram do `combat.ts` vivo.
- `src/ui/GamePanels.ts` — **deletar** (DEC-3). Remove 233 linhas, 21 branches duplicados
  em `GameApp` e 5 violações de regra de negócio.
- `scripts/_strip-comments.mjs` — **deletar**. Destrutivo, aponta para caminho morto
  (`C:/FelipeProjects/...`), e já apagou os comentários de 74 dos 75 arquivos.
- `public/faces/*` — 8 PNGs byte-idênticos a `public/boot/assets/*`.
- Eventos declarados e nunca emitidos em `GameEventMap.ts` (4 de 19).

---

## C. Backlog priorizado

### [P0] T1 · Smoke test de verdade

- **Arquivo(s):** `game/scripts/smoke.mjs` (novo), `game/package.json`
- **O que fazer:**
  - Playwright **headless**, sobe `vite preview` sozinho, derruba no fim, sem servidor manual.
  - Pula o boot com `__UAIDZIN_SKIP_BOOT__` (padrão de `bot-play.mjs:56`).
  - Asserts na ordem do loop real: boot → `mode === "CITY"`; classe aplicada;
    dungeon **pelo caminho do jogador** → `mode === "DUNGEON"`, `enemiesAlive > 0`;
    combate → `kills > 0` e `fxCount > 0`; save → reload → `gold`/`level` persistem;
    volta à cidade → `enemiesAlive === 0`, `fxCount === 0`, `timerPhase` resetado.
  - Exit ≠ 0 nomeando o assert que falhou. Zero `pageerror` tolerado.
- **Como fazer:** a superfície já existe — `getSnapshot()` (`GameApp.ts:243`) expõe
  `mode, kills, fxCount, enemiesAlive, timerPhase, gold, level, invUsed`.
  **Não instrumentar nada novo.** Estilo `ok()`/`fail()` de `save-harness.mjs`.
- **Aceite:** `npm run smoke` sai 0 em < 90 s sem servidor manual; quebrar um gate de
  propósito faz o smoke falhar.
- **Esforço:** M · **Modelo:** médio · **Dep:** —

> **Pedra angular. Fazer primeiro, sozinho.** Todo item seguinte é validado por ele.

### [P0] T2 · Equipamento volta a funcionar

- **Arquivo(s):** `src/domain/progression/ProgressionService.ts:110-118`,
  `src/domain/items/EquipmentService.ts:50-62`, `src/domain/character/CharacterModel.ts`
- **O que fazer:**
  - Separar **stat base** (derivado de atributos) de **bônus de equipamento**.
    `recomputeCombatStats` recalcula a base; o total passa a ser `base + bônus`.
  - Eliminar o `+=`/`-=` de `applyBonus`/`removeBonus`: o serviço de equipamento deve
    **declarar** o bônus total atual, não acumular incrementos.
  - `applySavePayload` (`CityGameSession.ts:445-458`) deixa de depender da ordem
    `restoreEquipped` → `recomputeCombatStats`.
- **Como fazer:** `CharacterModel` ganha `baseAttack`/`baseDefense` e getters
  `attack`/`defense` que somam o bônus vigente. Menor diff que reescrever os dois serviços.
- **Aceite:** smoke equipa item com `attackBonus > 0`, sobe de nível, recarrega a página,
  e o ataque continua somando o bônus. Desequipar volta exatamente ao base.
- **Esforço:** M · **Modelo:** forte · **Dep:** T1

### [P0] T3 · Uma porta só para a dungeon

- **Arquivo(s):** `src/app/CityGameSession.ts:1002-1009`, `:284-306`, `src/app/GameApp.ts:307`
- **O que fazer:**
  - `confirmInteraction` (portal da cidade) passa a chamar `tryEnterDungeon` — hoje entra
    direto, sem validar evolução nem consumir item de entrada.
  - `enterDungeon()` do debug API passa a usar o mesmo caminho (ou é removido —
    o smoke usará o caminho do jogador).
  - Resultado: **um** ponto de validação, exercitado pelo teste.
- **Aceite:** smoke prova que as três entradas aplicam a mesma regra; grep por
  `enterWorld("dungeon-test")` fora de `tryEnterDungeon` volta vazio.
- **Esforço:** M · **Modelo:** médio · **Dep:** T1

### [P0] T4 · Destravar D4–D8 e deixar o jogador escolher

- **Arquivo(s):** `src/data/dungeons/dungeons-mortal.ts:19`, `src/app/CityGameSession.ts:284-287`
- **O que fazer (DEC-1 = remover o requisito de item):**
  - Remover `entryItemId` das dungeons 4–8 — os itens `entry_d*` não existem em lugar nenhum.
  - Remover `portalEntryCounts()` (`:308-313`), que conta itens inexistentes.
  - `pickDungeonForLevel` retorna `list[0]` (a **mais fraca** elegível) e não há UI de
    escolha. Expor a lista elegível e deixar o jogador escolher pelo painel do guarda.
- **Aceite:** smoke leva um personagem a nível 160 e entra na D4 pelo painel; a lista
  mostra todas as elegíveis.
- **Esforço:** M · **Modelo:** médio · **Dep:** T3

### [P0] T5 · Evolução honesta

- **Arquivo(s):** `src/domain/progression/ProgressionService.ts:60-78`, `src/app/GameApp.ts:311-321`
- **O que fazer (DEC-2 = bloquear com aviso honesto):**
  - `canEvolve()` passa a exigir que exista conteúdo para a evolução de destino.
    Enquanto só houver `DUNGEONS_MORTAL`, evoluir fica **bloqueado com mensagem explícita**
    ("Conteúdo de Arch ainda não disponível"), em vez de levar a um beco sem saída.
  - Tratar **todos** os `reason` de `tryEnterDungeon` (`missing`, `evolution`, `level`,
    `entry`). Hoje `"evolution"` e `"missing"` falham **sem nenhum toast**.
  - Tipar `reason` como união literal e usar `assertNever` no `default`, para que um
    `reason` novo sem tratamento **quebre o `tsc`**.
- **Aceite:** o botão de evoluir explica por que está bloqueado; nenhum caminho de recusa
  fica mudo; adicionar um `reason` sem tratar falha o typecheck.
- **Esforço:** S · **Modelo:** fraco · **Dep:** T3

### [P0] T6 · Save não pode perder dados

Subdividir — são caminhos independentes, mas **todos em `persistence/` + `CityGameSession`**,
então **serializar entre si**.

- **T6a — Save ilegível não sobrescreve.** `SaveVault.ts:365-396` deve distinguir
  "não existe" de "falha ao decifrar". No segundo caso: avisar e **não gravar**.
  `SaveStore.ts:132-137` não deve rotacionar `:prev` quando a escrita vem de um load falho.
- **T6b — Não perder a run.** Autosave (`GameApp.ts:174-178`) e `pagehide`/`visibilitychange`
  (`:180-189`) só agem em `CITY`. Permitir em `DUNGEON`. Guardar e limpar o handle do
  `setInterval` (vaza hoje).
- **T6c — Sequenciar escritas.** `depositGoldToVault`/`withdraw`/`moveItemToVault`/
  `moveItemFromVault` (`CityGameSession.ts:167-204`) disparam dois `void` concorrentes que
  reescrevem o mesmo blob. Sequenciar (`await`) ou unificar numa escrita só.
- **T6d — Parar de destruir `progress`.** `CityGameSession.ts:362` grava
  `progress: emptyProgress()`. Persistir o valor real.
- **T6e — `loadSlot` só troca `profileId` após sucesso.** `GameApp.ts:422-426`.
- **T6f — UID estável.** `ItemModel.ts:16`: derivar `uidSeq` do maior uid encontrado em
  inventário + cofre durante `applySavePayload`. Não precisa de campo novo no save.
- **Aceite:** teste que (a) corrompe o blob e verifica que o original sobrevive;
  (b) ganha nível na dungeon, recarrega sem voltar à cidade, e o nível persiste;
  (c) deposita ouro e recarrega — ouro no cofre e fora do inventário;
  (d) dropa item, salva, recarrega, dropa outro — zero uid duplicado.
- **Esforço:** L (total) · **Modelo:** médio · **Dep:** T1

### [P0] T7 · Build não degrada em silêncio

- **Arquivo(s):** `game/vite.config.ts:56`
- **O que fazer:** `if (!fs.existsSync(wireRoot)) return;` faz o build **passar** e enviar
  um jogo cuja UI inteira cai no fallback. Trocar por erro explícito.
  Com DEC-3 (remover o fallback), sem `visual/` o jogo **não tem UI** — falhar é obrigatório.
- **Aceite:** renomear `visual/` → `npm run build` falha nomeando o diretório.
- **Esforço:** S · **Modelo:** fraco · **Dep:** —

### [P0] T8 · Documentação honesta

- **Arquivo(s):** `README.md` (raiz), `game/README.md`, `game/docs/compose/spec/*.md`
- **O que fazer:**
  - Raiz: `npm run smoke` só depois que T1 existir. Corrigir a descrição de `visual/` —
    é **fonte da UI**, não "diagramas".
  - Specs: remover as evidências de smoke fabricadas e os SHAs inexistentes; rebaixar
    `delivered` ao status real.
  - `game/README.md`: corrigir a tabela de controles (ver T11).
- **Como fazer:** um doc por subagente, em paralelo. **Não inventar feature na doc.**
- **Aceite:** todo comando citado existe em `package.json`; todo `delivered` tem evidência real.
- **Esforço:** M · **Modelo:** fraco · **Dep:** T1, T11

### [P1] T9 · Combate para de mentir

- **Arquivo(s):** `src/gameplay/PlayerRuntime.ts:107`, `src/app/CityGameSession.ts:703`, `:778`,
  `src/gameplay/PlayerController.ts:11-13`, `src/data/balance/combat.ts:2`
- **O que fazer:**
  - **Parede desliga o combate:** `isMoving = moved || inputX !== 0 || ...` fica `true`
    com W contra a parede, e ataque/skill retornam `null` em movimento. Usar o movimento
    efetivo (`moved`), não a intenção.
  - **Erro invisível:** emitir `combat:miss` (declarado e nunca emitido) e mostrar "MISS",
    nos dois sentidos.
  - **Input sem filtro:** `onKeyDown` não checa `event.target` — digitar num campo move o
    personagem e dispara skills.
  - `COMBAT_BALANCE.hitChance = 0.95` é **dado morto** (`rollHitSimple` lê `dodgeChance`). Remover um.
- **Aceite:** com `dodgeChance = 1.0` todo ataque mostra "MISS"; segurar W contra parede
  não interrompe o ataque automático; digitar no chat/campo não move o personagem.
- **Esforço:** M · **Modelo:** médio · **Dep:** T1

### [P1] T10 · Skills disparam o que o jogador pediu

- **Arquivo(s):** `src/domain/combat/SkillController.ts:31-37`, `src/domain/combat/SkillLoadout.ts:86-100`
- **O que fazer:**
  - Slot manual em cooldown cai em `bestReadyAuto()` → apertar `3` lança a skill 1.
    Se o slot pedido não está pronto, **não lançar nada**.
  - `SkillLoadout.ts:86` injeta `trees.fisica[0]` quando nada foi aprendido: personagem
    nível 1 com 0 pontos já tem skill de dano ativa. Remover o fallback.
  - `:100` — slot novo entra com `cd: 0`, e `refresh()` roda a cada level-up
    (`CityGameSession.ts:640`): dá para zerar cooldown de propósito. Preservar o cooldown.
- **Esforço:** M · **Modelo:** médio · **Dep:** T1

### [P1] T11 · Atalhos: honrar ou remover

- **Arquivo(s):** `src/app/GameApp.ts:682-689`, `game/index.html`, `game/README.md`
- **O que fazer:** `bindPanels()` faz `if (this.wireUi) return;` **antes** de testar
  `KeyC/K/I`, e `start()` sempre monta WireUi → os três estão mortos em jogo normal.
  `KeyB` e `KeyN` nunca foram implementados, mas estão na help-bar e no README.
  Ligar os cinco na WireUi, ou remover da UI e da doc. Sem meio-termo.
- **Aceite:** todo atalho anunciado abre o painel; smoke verifica.
- **Esforço:** S · **Modelo:** fraco · **Dep:** DEC-3 aplicado

### [P1] T12 · Morte e HUD

- **Arquivo(s):** `src/app/CityGameSession.ts:761-794`, `:477-488`, `:648`
- **O que fazer:**
  - Morte múltipla no mesmo frame: o loop continua após o jogador morrer, reexecutando
    `playDeath()` e reemitindo `character:death` por inimigo (`:786`). Sair do loop na morte.
  - HUD congela nos 2,6 s de RESULT (`:477-486` retorna antes de `pushHud`).
  - Level-up sobrescreve o toast de loot (`:648`): você nunca vê o que dropou ao subir de nível.
- **Esforço:** S · **Modelo:** fraco · **Dep:** T1

### [P1] T13 · Boss deixa de ser fazenda infinita

- **Arquivo(s):** `src/domain/enemies/EnemyService.ts:65`, `src/domain/economy/EconomyService.ts:21-22`
- **O que fazer:** boss respawna em 30 s e **sempre** dropa equipamento
  (`dropRoll < chance || isBoss`), sempre nível 1. Em 600 s de dungeon dá ~20 bosses com
  item garantido. Ajustar respawn e a garantia de drop; mover ambos para `data/balance`.
- **Esforço:** S · **Modelo:** fraco · **Dep:** T1, T15

### [P1] T14 · Regra de negócio sai do HTML

- **Arquivo(s):** `visual/telas/03-wire-paineis-cidade.html:1503,1550,1825,3021-3042`,
  `src/domain/economy/EconomyService.ts`, `src/data/balance/economy.ts`
- **O que fazer:** custo de skill, `canAffordSkill()` e catálogo de loja com preços vivem
  no HTML. Mover para `domain/` + `data/balance/`; o HTML passa a chamar API tipada.
- **Como fazer:** um painel por vez (loja, mestre de skills). **Não reescrever a UI.**
- **Aceite:** mudar preço em `data/balance/economy.ts` muda na loja; grep de preço no HTML vazio.
- **Esforço:** L · **Modelo:** forte · **Dep:** T1

### [P1] T15 · Balanceamento para `data/`

- **Arquivo(s):** `EconomyService.ts:29-30`, `ItemFactory.ts:34,42-43`, `SkillLoadout.ts:16,63`,
  `CharacterModel.ts:9`, `PlayerRuntime.ts:21`, `EnemyAI.ts:27-28,47-48`,
  `EnemyModel.ts:63,85`, `AccountVaultService.ts:12`, `BagLockService.ts:1`,
  `ProgressionService.ts:105-108`, `EnemyService.ts:65`
- **O que fazer:** mover cada número para `data/balance/`. **Sem mudar valor** — refactor
  puro, smoke continua verde.
- **Aceite:** grep por literal de balanceamento em `src/domain` volta vazio.
- **Esforço:** M · **Modelo:** fraco (3 lotes por pasta) · **Dep:** T1

### [P1] T16 · Determinismo no domínio

- **Arquivo(s):** `EconomyService.ts:20,29,30`, `ItemFactory.ts:19,29,33`, `EnemyService.ts:20`
- **O que fazer:** `Math.random()` direto no domínio impede teste e replay.
  Injetar a fonte de aleatoriedade (`rollHitSimple` já aceita `random` como parâmetro — seguir esse padrão).
- **Aceite:** com seed fixa, dois runs produzem o mesmo loot.
- **Esforço:** M · **Modelo:** médio · **Dep:** T15

### [P1] T17 · Podar o EventBus

- **Arquivo(s):** `src/core/events/GameEventMap.ts`
- **O que fazer:** 19 eventos, **5 com ouvinte**, 4 nunca emitidos (`player:moved`,
  `combat:miss`, `progression:reset`, `dungeon:timer-updated`). Remover os mortos;
  manter `combat:miss` se T9 for feito.
- **Aceite:** todo evento tem ≥ 1 emissor e ≥ 1 ouvinte.
- **Esforço:** S · **Modelo:** fraco · **Dep:** T9

### [P1] T18 · Reset, boss e drops conforme GDD

- **Arquivo(s):** `ProgressionService.ts:85-100`, `dungeons-mortal.ts`, `EconomyService.ts:29-30`
- GDD 03/05: reset deve zerar **habilidades e pontos de skill do ciclo** — `reset()` não
  toca em `SkillTreeService`.
- GDD 07: o boss deve ficar na arena — hoje é `chaser` sem `leashRadius` e persegue pela
  dungeon inteira.
- GDD 13: Ori em D1–D4, Lac em D5–D8/bosses — hoje é 18% global, 75/25, igual em todo inimigo.
- **Esforço:** M · **Modelo:** médio · **Dep:** T15

### [P2] T19 · Dungeons deixam de ser clones

`dungeons-mortal.ts:3-68` — as 8 são geradas por `makeDungeon()` com **layout, spawns e
duração idênticos** do nível 1 ao 400. Escalar inimigos e variar arenas por faixa.
**Esforço:** L · **Dep:** T4

### [P2] T20 · Classes diferenciam gameplay

`class-definitions.ts:16` — `primary` nunca é lido. `attackRange`/`attackInterval` são
globais do player, não da classe nem da arma (GDD 03/06 pede por arma). As 4 classes jogam igual.
**Esforço:** L · **Modelo:** forte · **Dep:** T15

### [P3] T21 · Higiene

- Deletar `scripts/_strip-comments.mjs`, `public/data/game-config.json`,
  `tools/config-editor.html` (DEC-4), `src/ui/GamePanels.ts` (DEC-3).
- `PlayerView.ts:283-299` — 5 `console.info("[weapons]…")`; `GameApp.ts:882` — cheat de timer.
- `public/faces/*` — 8 PNGs duplicados.
- `GameApp.ts:238` — `window.__UAIDZIN__` sem guard de build.
- `GameApp.ts:826-829` — o tick engole o erro e mata o jogo em silêncio.
- Listeners globais nunca removidos (`GameApp.ts:180,185,436,456,544`).
- `EnemyModel` não guarda `isBoss` → `grantKillXp` faz `enemyId.includes("boss")` (`:621`).
- `hp`/`mp` salvos como `max` e nunca lidos (`CityGameSession.ts:337-338`).
- `skills.levels` no payload é **referência viva** (`:346`), não cópia — muta durante o
  debounce de 300 ms e o `await` da cifra.
- Chunk de 748 KB acima do limite de 650 KB.
- `GameMode` declara 8 estados; 3 (`LOADING`, `PREPARATION`, `PAUSED`) nunca são usados.
- **Esforço:** S cada · **Modelo:** fraco · **Dep:** T1

### [P3] T22 · God objects — só depois do smoke

`CityGameSession.ts` (1.126 linhas, 21 serviços) e `GameApp.ts` (886, 21 refs de DOM +
200 linhas de API de debug) somam 23% do código.
**Extração de menor risco:** tirar `exposeDebugApi` (`:238-433`) para `src/debug/DebugApi.ts` —
mecânico, isolado, torna a superfície do smoke explícita e desligável em produção.
**Não fazer big-bang refactor.** Sem smoke verde é aposta cega.
**Esforço:** M · **Dep:** T1

---

## D. Ordem de execução

```
T1 (smoke)  ←── sozinho, primeiro, porta 5173 livre
  │
  ├─ T2 (equipamento)        ← o bug que mais importa
  ├─ T3 → T4 → T5            ← serializar: todos em CityGameSession/GameApp
  ├─ T6a..T6f                ← serializar entre si (persistence)
  ├─ T7 (vite.config)        ‖ pode rodar junto com qualquer um
  └─ T8 (docs)               ← por último no P0, depende de T11
```

### Pode paralelizar (arquivos disjuntos)

- T7 (`vite.config.ts`) ‖ qualquer outro
- T15 em 3 lotes: `domain/economy+items` ‖ `domain/combat+character` ‖ `domain/enemies+progression`
- T8: um doc por subagente
- T21: itens de deleção são independentes entre si

### NÃO paralelizar

- **T3, T4, T5, T9, T12, T13, T18** — todos tocam `CityGameSession.ts`.
- **T5, T11, T22** — todos tocam `GameApp.ts`.
- **T6a–T6f** — todos tocam `persistence/` + `applySavePayload`.
- Nada junto com T1.

---

## E. Definição de pronto

```bash
cd game
npm run typecheck   # zero erro
npm run smoke       # exit 0, headless, sem servidor manual
npm run build       # sem warning de chunk
```

- [ ] Equipar item aumenta o dano — e continua aumentando depois de subir de nível e recarregar.
- [ ] Uma única porta valida a entrada na dungeon; o jogador escolhe qual.
- [ ] Nível 1 → teto sem trava dura; evoluir explica por que está bloqueado.
- [ ] Errar um ataque é visível; encostar na parede não desliga o combate.
- [ ] Fechar a aba no meio da dungeon não perde a run.
- [ ] Save corrompido avisa e não sobrescreve.
- [ ] Todo atalho anunciado funciona.
- [ ] `grep` de preço/custo no HTML de UI volta vazio.
- [ ] Nenhum doc afirma o que o código não faz.

---

## F. Decisões — **tomadas em 2026-09-19**

| # | Decisão | Escolha |
|---|---|---|
| DEC-1 | Dungeons 4–8 | **Remover o requisito de item.** Gatear só por nível. |
| DEC-2 | Evolução sem conteúdo | **Bloquear `evolve()` com aviso honesto** até haver conteúdo de Arch/Cele. |
| DEC-3 | UI de fallback | **Remover `GamePanels.ts`.** Com T7 falhando alto, perdeu a razão de existir. |
| DEC-4 | `game-config.json` | **Deletar** junto com `tools/config-editor.html`. |

---

## G. Como delegar (regras para subagentes)

- Uma tarefa = um arquivo sempre que possível. Se tocar 2+, listar todos.
- Passar: caminho exato, bullets do item, **critério de aceite**, comando de verificação.
- Proibido: criar abstração não pedida, adicionar dependência, mexer fora do escopo,
  "melhorar de passagem".
- Após cada entrega: `npm run typecheck` + `npm run smoke` + **ler o diff**.
  Não aceitar relatório sem diff conferido.
- Commit pequeno por tarefa, escopo no título.
- **Decisão 19 continua valendo: sem backend, multiplayer ou ads.** Hoje é respeitada
  (zero `fetch` externo, `WebSocket` ou analytics).

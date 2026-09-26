# Plano — Refatoração

**Status:** plano de arquitetura; o runtime ainda não foi alterado por este documento.

**Repositório:** `Planos/Refatoracao.md` · Escopo: `game/src/` (`app`, `core`, `domain`, `ui`, `presentation`, `persistence`), `game/public/boot/` (contrato boot↔jogo), `visual/telas/` (migração para `game/src/ui/`), `game/scripts/` (portões de teste).

**Origem:** revisão de código feita em 26/09/2026 sobre a `main` (commit `8723479`), registrada nas issues **#9–#21** (performance), **#22–#30** (condições de corrida), **#31–#44** (lógica) e **#45–#50** (eventos, null/NaN, input). Este plano não repete as issues — ele agrupa as causas estruturais por trás delas e diz o que muda no código para que cada grupo deixe de existir. A matriz da seção 10 liga **todas as 42 issues** a uma fase (ou declara que a issue é correção pontual/decisão de produto e não refatoração).

Documento de arquitetura. **Não contém código** — dita organização, contratos e restrições. Execução segue o painel de tarefas (task por fase) e as regras duras do `AGENTS.md`. Segurança está fora do foco deste plano (pedido do Felipe); onde uma correção de segurança cai naturalmente numa fase, ela aparece como carona, nunca como objetivo.

---

## 1. Resumo executivo

| Fase | Nome | O que muda | Issues que fecha | Tamanho |
|---|---|---|---|---|
| F0 | Rede de testes no domínio | Vitest em `game/`, testes de caracterização de `domain/` e `persistence/`, portões no painel | destrava todas; fecha nenhuma sozinha | M |
| F1 | Persistência com um dono | `SaveCoordinator` (dirty flag + checkpoints), `normalizeSavePayload` único, carga em três estados, storage único boot↔jogo | #16 #22 #23 #24 #28 #29 #30 #39 #48 (+#49 carona) | G |
| F2 | Eventos, erros e HUD | Um canal (bus tipado), isolamento de handlers, política de erro do tick, `HudModel` com diff, `GameApp` só composição | #13 #17 #45 | M |
| F3 | Input com contexto | `InputService` com ações nomeadas, contexto (`typing`, modificador, modo, UI aberta), gate de debug | #43 (parte input) #46 #47 | P |
| F4 | Fatiar `CityGameSession` | `DungeonFlow`, `InteractionController`, `CombatOrchestrator`, `VaultTransfer`, `RewardService`; sessão vira raiz de composição | #14 #19 #27 #44 (+#34 carona) | G |
| F5 | Wire UI como módulo do runtime | Script do wire em TS dentro de `game/src/ui/`, `WireApi` tipada injetada, fim de `window.__UAIDZIN*`, fim dos painéis legados e dos dados demo | #31 #35 #43 (parte painel) | G |
| F6 | Itens e economia com invariantes | UID único, transferências atômicas com resultado, `EquipmentService` dono do conjunto de arma e dos bônus, `ShopService` dono do estoque, ouro guardado | #32 #33 #36 #38 #40 #41 #50 (+#42 carona) | M |
| F7 | VFX por registro | Lista de ciclo de vida (A3 do plano de revisão) → registro preguiçoso, update só de ativos, luzes compartilhadas, texturas parametrizadas | #9 #12 | M |
| F8 | Views com ciclo de vida explícito | Carga assíncrona cancelável (geração/token) em `EnemyRuntimeView` e `WeaponRig`, sync por diff, oclusão com lista de occluders, um renderer nos cards do boot | #10 #15 #21 #25 #26 | M |

Caronas (correções pontuais que entram na task da fase por tocarem os mesmos arquivos): #17, #34, #42 (metade), #44, #47, #49. Fora do plano por serem pontuais ou decisão de produto (seção 10 detalha): #11, #18, #20, #37.

Tamanho: **P** ≈ 1 task, **M** ≈ 2–4 tasks, **G** ≈ 5–8 tasks, cada task fechável com `typecheck` + testes verdes e jogo jogável.

---

## 2. Diagnóstico — estado atual verificado no código (2026-09-26)

Cada foco abaixo lista a evidência e as issues que nascem dele. Foi isso que definiu as fases: refatorar o foco elimina a classe de bug, não só a instância.

### 2.1 `CityGameSession` concentra todos os casos de uso

- `game/src/app/CityGameSession.ts`: **1.848 linhas, 88 métodos**. Troca de mundo e fade (`enterWorld`, `withWorldFade`, `leaveDungeonWithFade`), combate (`updateCombat`), loot/XP/level-up, interação (`updateNearby`, `handleInteractKey`, `tryInteract`, `openNpcService`), cofre (`depositGoldToVault`, `moveItemToVault`), quests, compositor, montagem do payload de save (`persistSave`, L447–507), HUD por frame (`pushHud`) e toasts.
- Estado compartilhado por métodos que não se conhecem: `worldFadeBusy`, `panelOpen`, `moveLock`, `pendingSkillSlot`, `deathReturnTimer`, `resultHold`.
- Issues: #14, #19, #27, #33, #36, #44, #45 (cadeia via `bus.emit` dentro do `update`), #46.

### 2.2 Persistência sem dono

- `persistSave` é chamado **12 vezes dentro da sessão** (por abate, skill, equip, quest, entrada na cidade…) e `persistSave`/`saveVault.*` aparecem em mais **6 arquivos** fora dela (`GameApp` 9 ocorrências, `DebugApi` 23, `WireGameBridge` 6, `BootFlow` 5, `SaveService` 5, `GamePanels` 2). A política de "quando salvar" é emergente.
- Validação do save triplicada e divergente: `migrations.ts` (`normalizeBase`, L144–213), `applySavePayload` (`CityGameSession.ts:569–614`) e `applyBootCharacter` (`:526–566`) normalizam campos diferentes de formas diferentes. `normalizeTreeMap` (`SaveTypes.ts:181–188`) existe e só o resumo de slot usa (#48). Atributos base: 5 no boot/migração, 10 em `PROGRESSION_BALANCE`/`resetToNewGame` (#39).
- Carga em dois estados (`loadSave(): Promise<boolean>`, `:509`) — "erro ao ler" e "não existe" são a mesma coisa, e o chamador em `GameApp.start` (`.catch(() => false)`, L619) recria e grava por cima (#30).
- Dois módulos de storage para o mesmo IndexedDB: boot `save-store.js` (v1) e runtime `SaveStore` (v2) (#28). `SaveVault` mantém `flushChain`, retry e debounce que sobrevivem a logout/wipe (#23); `beforeunload → dispose()` remove os listeners de save antes de dispararem (#24).
- Issues: #16, #22, #23, #24, #28, #29, #30, #39, #48.

### 2.3 Wire UI fora do runtime, ligada por globais

- `vite.config.ts:7` serve e publica a UI a partir de `../visual/telas` (`wireRoot`), e o build **falha** sem a pasta (`:240`) — enquanto `AGENTS.md` e `nongame/docs/project/README.md` declaram `visual/telas/` como espelho legado fora do fluxo. O documento e o código discordam; o código é quem está errado, porque coloca 4.465 linhas de script sem tipos, com dados de demonstração e fallbacks locais, no caminho de produção.
- Contrato por `window`: `__UAIDZIN_WIRE__` (55 referências), `__UAIDZIN_ECONOMY__` (14), `__UAIDZIN__` (6, instalado só por `installDebugApi`, `DebugApi.ts:76–79`), mais `__UAIDZIN_TK_*__` (23) e `__UAIDZIN_SKILL_VFX__`/`__UAIDZIN_FIRE_BURST__`. `gameApi()` é consultado 18 vezes no HTML, cada vez com um ramo local de fallback.
- Segundo conjunto de painéis (`GamePanels.ts`, 253 linhas) com regras próprias (aprende skill sem ouro, troca classe).
- `WireGameBridge.ts` (170 linhas) já é uma ponte parcialmente tipada — é a semente da fase 5.
- Issues: #31, #35, #43 (painel legado), #13 (parte wire), #46 (o `E` atravessa a UI).

### 2.4 Dois canais de evento, nenhum robusto

- Sessão → app por **bus** (26 `bus.emit`) **e** por **callbacks de construtor** (`onModeChange`, `onHud`, `onResult`, `onDismissUi`, `CityGameSession.ts:192–201`). `GameApp` re-emite `game:state-changed` a partir do `GameStateStore.subscribe` (`GameApp.ts:264–268`).
- `EventBus.emit` (`core/events/EventBus.ts:20–26`) e `GameStateStore.notify` (`:37–41`) chamam handlers sem isolamento; `GameApp.tick` (`:759–787`) trata qualquer exceção como fatal (`loop.stop()`); `game:error` não tem assinante; não há `error`/`unhandledrejection`.
- `onHud` cria um objeto novo por frame que vira `innerHTML` (`renderSkillBar`, `renderDropLog`) e forced layout (#13).
- `GameApp` (835 linhas) mistura composição com 16 lookups de DOM (settings, toasts, skill bar, drop log, save status, weapon strip) e 5 listeners de `keydown`.
- Issues: #13, #17, #45.

### 2.5 Input espalhado

- 6 listeners de `keydown` no runtime + 3 no wire: `PlayerController` guarda `e.code` cru num `Set` (`gameplay/PlayerController.ts:11–16`), `GameApp` tem `onKeyPanels`, `onKeyEscape`, `onKeyDebugToggle`, `onKeyDebugTimer`, `onKeyDebugProgression` — cada um decide sozinho (ou esquece) alvo editável, modificador, `repeat`, modo do jogo e "UI aberta". F5 é sequestrado sem gate de build (#43); `E` interage com a Wire UI aberta (#46); roda do mouse com passo fixo por evento (#47).
- `AGENTS.md` fixa "Painéis C/K/I: mesmos atalhos na cidade **e** na dungeon"; `onKeyPanels` hoje retorna em `DUNGEON` (`GameApp.ts:129–130`). A regra já está decidida; o código não a segue.
- Issues: #43 (parte), #46, #47.

### 2.6 Itens e economia sem invariantes

- `nextItemUid` (`domain/items/ItemModel.ts`) é contador por carregamento de página → colisão via cofre da conta (#38). `InventoryService.add`/`AccountVaultService.add` descartam excedente e devolvem `true` (#41). `EquipmentService.equip` faz `add` da peça antiga antes do `remove` da nova (#36). Refino somado em dois lugares (#32). Conjunto de arma não deriva do equipamento (#33). Loja não é dona do estoque e tem preço 0 no catálogo (#40). Ouro é `number` cru; o setter zera não-finito (#50).
- `SkillTreeService` guarda a instância num módulo (`boundForReset`, `SkillTreeService.ts:20–37`) — singleton escondido, hostil a teste.
- Issues: #32, #33, #36, #38, #40, #41, #50, #42 (metade).

### 2.7 VFX: 23 controllers copiados

- `EffectManager.ts` (806 linhas): 23 campos `tk*`, enumerados em cinco laços de ciclo de vida (`clear`, `getSkillVfxState` ×2, `update`, `dispose`) e um `switch` de despacho; tudo instanciado no boot e atualizado por frame (#12). `tkSkills/`: 92 arquivos, ~27 mil linhas, 23 `*Textures.ts` com o mesmo `drawRadialGlow`. `PointLight` criada e removida por cast (#9).
- A revisão dos planos TK (achado **A3**) já prescreve a lista de ciclo de vida como F7 do plano da linhagem 1; esta fase começa por ela.
- Issues: #9, #12.

### 2.8 Views com carga assíncrona sem cancelamento

- `EnemyRuntimeView.createEnemyRepresentation` e `WeaponRig.equip`/`PlayerView.setWeaponSet` disparam `loadAsync` sem token de geração: a ordem de conclusão decide o que fica na tela (#25, #26). `sync` faz 4 traversals e reescreve emissive por inimigo por frame (#15). Raycast de oclusão contra `worldRoot` inteira (#10). Tela de seleção cria um `WebGLRenderer` + rAF por card (#21).
- Issues: #10, #15, #21, #25, #26.

### 2.9 Zero testes automatizados no domínio

- `game/package.json` não tem script `test`; não há `*.test.ts`. O que existe são harnesses Playwright (`smoke`, `test:save`, `bot`) que exigem navegador (indisponível em parte dos ambientes — achado **A6** da revisão) e ~40 scripts `check-*.mjs` em Node, quase todos de VFX/dispatch.
- `domain/` é TypeScript puro sem Three.js: o lugar mais barato do projeto para testar, e onde moram dois terços das issues de lógica.

---

## 3. Princípios (herdados dos planos TK, da revisão e do `AGENTS.md`)

1. **Uma informação com um dono.** Cada regra abaixo ganha um módulo dono e os demais chamam; nenhuma regra fica duplicada "por compatibilidade".
2. **UI é projeção do save/runtime.** Nenhum estado de jogo vive só na UI (fim de `bagItems` locais, dados demo e fallbacks do wire).
3. **Strangler, não big bang.** Cada fase extrai um pedaço, redireciona os chamadores e apaga o caminho antigo na mesma fase. O jogo fica jogável ao fim de cada task; `typecheck` verde sempre.
4. **Nenhum framework novo.** Sem gerenciador de estado, sem ECS, sem React. A única dependência nova é o runner de testes (F0).
5. **Testes antes de mover.** Fases que mexem em regra de jogo (F1, F4, F6) começam com teste de caracterização do comportamento atual; o teste muda junto com a regra, com a issue citada no nome do caso.
6. **Ids como contrato.** Ids de skill, item, dungeon, mundo e evento não mudam neste plano.
7. **Sem comentários no código, pt-BR na prosa, task por fase** (regras duras, seção 7).

---

## 4. Fases

Cada fase traz: objetivo, escopo, desenho (contratos, sem código), tasks do painel, issues fechadas, caronas (correções pontuais que entram na mesma task por tocarem os mesmos arquivos), definição de pronto e riscos.

### F0 — Rede de testes no domínio

**Objetivo.** Poder mover código de `domain/` e `persistence/` com prova de não-regressão em Node, sem navegador.

**Escopo.** `game/package.json` (script `test`, devDependency), `game/src/**/*.test.ts` ao lado do módulo testado, `game/scripts/` (portão).

**Desenho.**
- Runner: **Vitest** (usa a config do Vite já presente; roda TS sem etapa de build). Alternativa sem dependência: `node --test` com `--experimental-strip-types` — só se o Felipe vetar dependência nova (decisão **DR4**).
- Testes de **caracterização** primeiro (descrevem o que o código faz hoje, inclusive o errado, com o número da issue no nome do caso e `todo`/`fails` onde o comportamento é o bug). Quando a fase correspondente corrigir, o caso vira verde e perde a marca.
- Alvos iniciais, em ordem de valor: `migrateSave` + `normalizeBase` (#39, #48), `SkillLoadout`/`SkillTreeService` (#42, #48), `InventoryService`/`AccountVaultService`/`EquipmentService` (#36, #38, #41), `RefinementService`/`CompositionService` (#32), `ShopService` (#40), `ProgressionService` (#39, #44), `BuffService`, `EnemyService`/`EnemyAI` (#34), transferências bolsa↔cofre da sessão extraídas na F4 (#50).
- `SkillTreeService.boundForReset` sai (a sessão chama `resetSkills` na instância que já tem) para os testes não vazarem estado entre casos.
- Portão: `npm test` entra no portão 1 (Node) de todos os planos, ao lado de `typecheck`.

**Tasks.** T0.1 runner + primeiro teste (`migrateSave`) · T0.2 caracterização de skills e progressão · T0.3 caracterização de itens/economia · T0.4 `boundForReset` removido + portão documentado nos planos ativos.

**Issues fechadas.** Nenhuma diretamente. **Destrava** F1, F4, F6 e dá o critério de pronto de #32, #36, #38, #39, #41, #42, #44, #48, #50.

**Pronto quando.** `npm test` roda em Node em menos de 10 s, cobre os módulos listados, e cada issue citada acima tem pelo menos um caso nomeado.

**Riscos.** Baixo. Único cuidado: não testar `presentation/` (Three.js) em Node — fica para os harnesses Playwright.

### F1 — Persistência com um dono

**Objetivo.** Um único lugar decide **quando** salvar, **o que** é um save válido e **como** boot e jogo compartilham o storage.

**Escopo.** `game/src/persistence/` (`SaveVault`, `SaveStore`, `SaveService`, `SaveTypes`, `migrations`), `game/src/app/` (`CityGameSession.persistSave`/`loadSave`/`applySavePayload`/`applyBootCharacter`, `GameApp` timers e listeners de saída, `BootFlow`), `game/public/boot/assets/save-store.js`, `nongame/docs/inventarios/save-load.md` (contrato).

**Desenho.**
- **`SaveCoordinator`** (novo, em `persistence/`): recebe `markDirty(reason)` dos casos de uso e é o único que chama `saveVault.saveCharacter`/`saveAccountVault`. Política explícita e única: debounce curto para eventos frequentes (abate, drop, XP), **checkpoint imediato** em fronteiras (entrar/sair de dungeon, morte, compra/venda, cofre, aprender skill, logout) e em `visibilitychange`→hidden/`pagehide`. Serializa perfil **e** cofre na mesma fila (fim do `vaultPersistChain` separado). As 12 chamadas da sessão e as espalhadas por `GameApp`, `WireGameBridge`, `DebugApi` e `GamePanels` viram `markDirty`/`checkpoint`.
- **Snapshot síncrono de saída**: o coordenador mantém o último payload já serializado; em `pagehide` grava esse snapshot de forma síncrona no `localStorage` e reconcilia com IDB no próximo boot. `dispose()` não remove listeners de save (#24).
- **`normalizeSavePayload(raw): SavePayload`** (em `SaveTypes`/`migrations`): única função de normalização, usada por `migrateSave`, `importProfile`, `applySavePayload` e pelo payload de boot. Cobre árvores de especialização (`normalizeTreeMap`), níveis de skill, atributos com o valor base único (decisão **DR3**), `classId ∈ CLASSES`, ouro finito com cap. `applySavePayload` e `applyBootCharacter` passam a **só copiar** um payload já normalizado — a normalização deixa de existir neles.
- **Carga em três estados**: `loadSave(): { kind: "found", payload } | { kind: "absent" } | { kind: "error", error }`. Só `absent` cria personagem; `error` mostra a mensagem, não grava nada e oferece tentar de novo (#30). `saveUnreadable` deixa de ser flag solta da sessão.
- **Blob da conta com um escritor**: toda escrita no blob (slots × cofre) passa por uma operação `updateAccount(fn)` serializada dentro do `SaveVault`, com leitura e escrita na mesma transação IDB; `saveAccountVault` e `syncSlotSummary` viram chamadas dessa operação (#22).
- **Ciclo de vida do `SaveVault`**: `logout()`/`wipe()` cancelam timers, esvaziam `flushChain` e invalidam a chave de sessão antes de qualquer retry; retry com limite e backoff, nunca loop (#23).
- **Storage único boot↔jogo**: `save-store.js` do boot passa a ser gerado a partir do módulo do runtime (ou o boot importa o bundle do runtime), com **uma** versão de IDB, um esquema e as mesmas operações de excluir slot (#28). Contrato registrado em `save-load.md`.
- **Aba dupla**: `navigator.locks` (com fallback `BroadcastChannel`) por `profileId`; segunda aba do mesmo personagem entra em modo somente leitura com aviso (#29; comportamento por **DR5**).
- `SaveStore` reutiliza a conexão IDB (uma por origem, reaberta só em `versionchange`/erro) — parte de #16.
- Carona: validação do payload de boot (`character` com `classId`, `level`, `attrs`, `spec` normalizados pela mesma função) — cobre a metade "sem validar" de #49; a checagem de `origin`/`source` do `postMessage` são duas linhas que entram na mesma task, sem virar objetivo.

**Tasks.** T1.1 `normalizeSavePayload` + `loadSave` em três estados (testes F0 viram verdes: #30, #39, #48) · T1.2 `SaveCoordinator` e migração dos chamadores (sessão, `GameApp`, bridge, debug) · T1.3 snapshot de saída + listeners fora do `dispose` (#24) · T1.4 `updateAccount` serializado + ciclo de vida do `SaveVault` (#22, #23) · T1.5 storage único boot↔jogo (#28) · T1.6 lock de aba (#29) · T1.7 conexão IDB reutilizada + inventário `save-load.md` atualizado (#16).

**Issues fechadas.** #16, #22, #23, #24, #28, #29, #30, #39, #48. **Carona:** #49.

**Pronto quando.** `npm run test:save` e `npm test` verdes; grep de `persistSave(`/`saveVault.` fora de `persistence/` e do coordenador retorna zero; fechar a aba durante uma dungeon preserva o último abate (verificação manual, lab admin/admin); excluir slot no boot apaga perfil no IDB; segunda aba do mesmo personagem recebe o aviso.

**Riscos.** Médio-alto: é a fase que toca dados do jogador. Mitigação: T1.1 antes de tudo, `SAVE_VERSION` só sobe se o esquema mudar (T1.5), backup do storage no wipe tool antes de rodar `test:save`.

### F2 — Eventos, erros e HUD

**Objetivo.** Um canal de comunicação sessão→app, falha de um assinante nunca derruba o frame, e o DOM só muda quando o dado muda.

**Escopo.** `game/src/core/events/`, `core/state/GameStateStore.ts`, `core/errors/`, `app/GameApp.ts`, `app/GameLoop.ts`, `app/CityGameSession.ts` (callbacks do construtor), `ui/` (renderização do HUD).

**Desenho.**
- **Um canal**: os quatro callbacks do construtor da sessão viram eventos do bus tipado (`session:mode`, `session:hud`, `session:result`, `ui:dismiss`) ou, no caso do HUD, um **`HudModel`** observável (abaixo). `GameStateStore` deixa de re-emitir no bus: quem quer modo assina o store; quem quer evento assina o bus. Fim do `game:state-changed` duplo.
- **Isolamento**: `EventBus.emit` e `GameStateStore.notify` chamam cada handler dentro de `try/catch` e encaminham a exceção ao `ErrorReporter` com nome do evento; o laço continua. Handlers podem ser registrados com `{ once }`; `on` devolve `unsubscribe` (já devolve) e a sessão guarda os seus para `dispose`.
- **Política de erro do tick**: `GameApp.tick` reporta e **continua**; contador de frames consecutivos com falha — ao passar o limite (constante em `core/errors`, valor por **DR6**), pede `checkpoint` ao `SaveCoordinator`, para o loop e mostra o toast com ação "tentar continuar". `window.error`/`unhandledrejection` → `ErrorReporter`. `game:error` ganha assinante (toast + HUD de debug) ou é removido do mapa de eventos.
- **`HudModel` com diff**: a sessão escreve num modelo plano (hp, mp, xp, timer, skills[], dropLog[], weaponSet); a view compara com o último estado pintado e toca só os nós alterados (texto, `width`, classes). Skill bar e drop log deixam de ser `innerHTML` por frame; `hideAllHpBars`/`spawnHpBar` do `EffectManager` seguem o mesmo princípio (só atualizam quando a posição projetada muda além de 0,5 px). Cobre a nota **A11** da revisão.
- **`GameApp` só compõe**: settings (`SettingsPanel`), toasts (`ToastView`), save status, weapon strip e skill bar saem para `ui/` como classes com `mount`/`dispose`; `GameApp` fica com bootstrap, loop, bindings e `dispose` simétrico (todo `addEventListener` tem `removeEventListener`). Sliders de volume chamam só `applyAudio` — `saveSettings` e `setShadowsEnabled` só no botão Salvar (#17).

**Tasks.** T2.1 isolamento em bus/store + política do tick + handlers globais (#45) · T2.2 callbacks do construtor → bus/`HudModel` · T2.3 `HudModel` com diff e views do HUD extraídas (#13) · T2.4 `SettingsPanel` extraído com `applyAudio` separado (#17) · T2.5 `dispose` simétrico.

**Issues fechadas.** #13, #17, #45. Fecha também o modo de falha "tela preta" de `withWorldFade` descrito em #45 em conjunto com F4.

**Pronto quando.** Lançar uma exceção forçada num handler de `ui:open-panel` (via debug) não para o jogo e aparece no reporter; `npm run smoke` verde; contagem de nós DOM alterados por frame parado = 0 (checar com Performance panel; critério manual do Felipe).

**Riscos.** Baixo-médio. O `HudModel` muda a assinatura de `onHud` usada pelo bot (`scripts/bot-play.mjs`) — ajustar o bot na mesma task.

### F3 — Input com contexto

**Objetivo.** Gameplay lê **ações**, nunca `KeyE`; um único lugar sabe se o jogador está digitando, se há modificador, em que modo o jogo está e se há UI aberta.

**Escopo.** `game/src/gameplay/PlayerController.ts` (vira `InputService` + `MoveIntent`), `app/GameApp.ts` (5 listeners de `keydown`, `bindWheelZoom`), `app/CityGameSession.ts` (`handleInteractKey`, `skillSlotPressed`), `debug/`.

**Desenho.**
- **`InputService`**: único par `keydown`/`keyup` (+ `blur`, `visibilitychange`), mapa `código → ação` (`move.*`, `interact`, `skill.1–4`, `panel.person/skills/inv/vault`, `ui.dismiss`, `debug.*`), estado por ação (`pressed` de borda, `held`), e um **contexto** consultado antes de aceitar a tecla: alvo editável (`INPUT`/`TEXTAREA`/`contenteditable`), modificador (`ctrl`/`meta`/`alt`), `repeat`, modo do jogo (`CITY`/`DUNGEON`/`DEAD`/`RESULT`), `uiOpen` (fornecido pela Wire UI/`GameApp`).
- Ações de painel respeitam a regra do `AGENTS.md`: **C/K/I com os mesmos atalhos na cidade e na dungeon**; a exceção atual em `onKeyPanels` cai.
- `interact` só é entregue à sessão quando `!uiOpen && !panelOpen && mode ∈ {CITY, DUNGEON}` (#46); `skill.n` só em `DUNGEON`.
- Ações `debug.*` só existem quando `import.meta.env.DEV || __UAIDZIN_DEBUG__` (mesmo gate de `installDebugApi`); F5 volta a ser do navegador (#43, parte input).
- Roda: `deltaY` normalizado por `deltaMode` e acumulado; passo só ao passar um limiar (ou zoom contínuo com alvo suavizado no `GameCamera.follow`); `ctrlKey`/`metaKey` deixam o evento para o navegador; listener removido em `dispose` (#47).
- Wire UI continua com seus próprios `keydown` para diálogos de confirmação (captura + `stopPropagation`), mas passa a chamar `InputService.setUiOpen(bool)` ao abrir/fechar — F5 troca isso pela `WireApi`.

**Tasks.** T3.1 `InputService` + migração de `PlayerController` e `onKeyPanels`/`onKeyEscape` (#46) · T3.2 ações de debug com gate (#43 parte) · T3.3 roda normalizada (#47).

**Issues fechadas.** #46, #47, #43 (metade dos atalhos; a metade do painel legado é F5).

**Pronto quando.** Digitar `e`, `w`, `1` no campo de ouro do cofre não move, não interage, não casta; `Ctrl+C` na cidade não abre painel; C/K/I abrem na dungeon; trackpad percorre o zoom em ≥ 10 eventos; `npm run bot` revisado (se injetar teclas, mapear para ações) e verde.

**Riscos.** Baixo. Verificar se `bot-play.mjs` injeta teclas ou chama a API de debug — se injeta, mapear para as ações.

### F4 — Fatiar `CityGameSession`

**Objetivo.** A sessão vira raiz de composição (constrói e liga os casos de uso) e cada caso de uso tem um arquivo, um estado e testes.

**Escopo.** `game/src/app/CityGameSession.ts` → `game/src/app/session/` (novos módulos abaixo), `domain/enemies/EnemyAI.ts` (carona), `domain/progression/ProgressionService.ts` (carona).

**Desenho.** Cortes pelos agrupamentos que já existem nos métodos:
- **`DungeonFlow`** — máquina de estados explícita: `city → entering → dungeon → leaving(reason) → city`, com `enterDungeon(def)`, `leaveDungeon(reason)`, `onDeath()`. Dona de `worldFadeBusy`, `deathReturnTimer`, `resultHold`. Reentrância resolvida por estado, não por flag: chamada em estado errado é ignorada e reportada (#27). O item de entrada é consumido **depois** que `enterWorld` teve sucesso; falha em `swap()` faz `fadeOut` e reporta (fecha o modo "tela preta" de #45). Emite `dungeon:entered/completed` e pede `checkpoint`.
- **`InteractionController`** — `nearby`, `pendingInteract`, `panelOpen`, clique/raycast, `tryInteract`, `openNpcService`; recebe ações do `InputService` (F3) e o `uiOpen`. Único emissor de `ui:open-panel`.
- **`CombatOrchestrator`** — `updateCombat`, ataque básico, cast de skill, DoT, hit-stop, morte de inimigo. Índice `Map<id, EnemyModel>` mantido pelo `EnemyService` (fim do `findById` linear), `frameMods` calculados uma vez por frame e compartilhados, sem `Vector3`/`Set` temporários no laço (#19). DoT com **cadência fixa** (tick a cada N ms acumulados, dano = taxa × Δt acumulado) e um número de dano por tick, não por frame (#14).
- **`RewardService`** — XP, ouro, drops e level-up por abate/quest, chamando `ProgressionService` e `EconomyService`; único ponto que emite `character:level-up`. Carona: `addXp` satura no nível máximo (xp = 0 ou = `xpToNext`, por **DR7**) (#44).
- **`VaultTransfer`** — `depositGold`, `withdrawGold`, `moveItemToVault`, `moveItemFromVault`; recebe os serviços de F6 e devolve resultado (`{ ok, moved, reason }`). Ouro validado na borda (junto com F6 para #50).
- **`SessionSaveBridge`** — monta o payload a partir dos serviços (o antigo corpo de `persistSave`), chamado só pelo `SaveCoordinator` (F1).
- A sessão mantém: construção, `update(dt)` que chama os módulos na ordem certa, `dispose`. Meta: `CityGameSession.ts` abaixo de 400 linhas.
- Carona (mesmos arquivos, teste em F0): `EnemyAI` com raio de aggro e leash lidos do `monsters.json` e colisão com o `world.collision` do mundo atual (#34) — é correção de gameplay, entra porque o `CombatOrchestrator` é quem passa o mundo para a IA.

**Tasks.** T4.1 `DungeonFlow` (#27) · T4.2 `InteractionController` (com F3) · T4.3 `CombatOrchestrator` (#14, #19) · T4.4 `RewardService` (#44) · T4.5 `VaultTransfer` + `SessionSaveBridge` · T4.6 `EnemyAI` aggro/leash/colisão (#34, carona) · T4.7 limpeza: sessão < 400 linhas, `DebugApi` apontando para os módulos.

**Issues fechadas.** #14, #19, #27, #44. **Carona:** #34.

**Pronto quando.** `npm test` cobre `DungeonFlow` (transições inválidas ignoradas), `RewardService` (xp no cap) e DoT (dano independente de dt); `npm run bot` completa uma dungeon; `wc -l CityGameSession.ts` < 400.

**Riscos.** Médio: é a fase com mais movimentação. Fazer um módulo por task, com a sessão delegando e o método antigo apagado na mesma task (nada de dois caminhos vivos).

### F5 — Wire UI como módulo do runtime

**Objetivo.** A UI que o jogador vê vive em `game/src/ui/`, é TypeScript, recebe uma API tipada na montagem e não tem dados de demonstração nem fallback local. Um conjunto de painéis, não dois.

**Escopo.** `visual/telas/03-wire-paineis-cidade.html` (script → `game/src/ui/wire/*.ts`; HTML/CSS → template em `game/src/ui/wire/` ou `game/public/wire/`), `game/src/ui/WireUi.ts`, `WireGameBridge.ts` (vira `WireApi`), `GamePanels.ts` (removido, **DR1**), `DebugApi.ts` (perde a ponte de gameplay), `vite.config.ts` (`wireUiPlugin` some), `AGENTS.md`/`README.md` do projeto (o texto passa a bater com o código).

**Desenho.**
- **`WireApi`** (interface em `ui/wire/WireApi.ts`): tudo que o wire precisa — `getView()`, `getCatalog()`, `learnSkill`, `equip`, `unequip`, `useItem`, `discard`, `buy`, `sell`, `vault.*`, `compose`, `quests.*`, `portal.*`, `subscribe(onChanged)`. Implementada pela sessão/casos de uso de F4 (o `WireGameBridge` atual é o rascunho). Instalada por **injeção** em `WireUi.mount(host, api)`; `window.__UAIDZIN_WIRE__`/`__UAIDZIN_ECONOMY__`/`__UAIDZIN__` deixam de existir no caminho de produção (o `DebugApi` pode continuar expondo a mesma `WireApi` em dev, para o bot).
- **Script em TS**: o `<script>` de 4 mil linhas é migrado para módulos por painel (`person`, `skills`, `inventory`, `vault`, `shop`, `composer`, `quest`, `portal`, `sage`) que só **pintam** a partir do `getView()`/`getCatalog()` e chamam a `WireApi` nas ações. `bagItems`, `equipped`, `vaultItems`, `playerGold`, `skillPoints` locais **somem**; `paintX` é chamado pelo `subscribe` com diff (A11). Lixeira, "Equipar melhor" e "Organizar" viram operações da `WireApi` (#35).
- **Fim do fallback**: sem `WireApi` a UI não monta e o jogo mostra erro — nunca finge sucesso (#31).
- **Painéis legados** (`GamePanels.ts`) removidos; `InteractionPanel` permanece só como prompt de portal até o wire cobri-lo (#43, parte painel). Isso reverte a decisão **D11** da revisão dos planos TK — registrada como **DR1**.
- HTML/CSS: manter o markup e o CSS atuais (a arte já foi validada pelo Felipe), só movidos para dentro de `game/`; nenhuma mudança visual nesta fase. Travas de UI do `AGENTS.md` continuam valendo.
- `uiOpen` para o `InputService` (F3) vem do `WireUi` diretamente.

**Tasks.** T5.1 `WireApi` tipada + injeção (mantendo o HTML atual funcionando por um adaptador temporário que preenche `window.__UAIDZIN_WIRE__` a partir da `WireApi`) (#31) · T5.2–T5.5 migração por painel para TS, apagando o ramo local de cada um (#35) · T5.6 remoção de `GamePanels`, globais, `wireUiPlugin` e dados demo; docs atualizados (#43 parte) · T5.7 `smoke` cobrindo abrir cada painel em build de produção (`vite build` + `preview`).

**Issues fechadas.** #31, #35, #43 (metade do painel legado).

**Pronto quando.** `npm run build && npm run preview`: comprar poção, aprender skill, depositar ouro e descartar item refletem no save após recarregar; grep de `__UAIDZIN` em `game/src` só encontra `DebugApi`; `visual/telas/` não é mais lido pelo `vite.config.ts`.

**Riscos.** Alto em volume, baixo em incerteza: a migração é mecânica, mas longa. Fazer por painel, com o adaptador temporário garantindo que os painéis ainda não migrados continuem funcionando. O Felipe valida cada painel migrado (regra de UI do `AGENTS.md`).

### F6 — Itens e economia com invariantes

**Objetivo.** Item, pilha, equipamento, loja e ouro têm regras num lugar só, com resultado explícito para o chamador e sem estados impossíveis.

**Escopo.** `game/src/domain/items/` (`ItemModel`, `ItemFactory`, `EquipmentService`, `RefinementService`, `CompositionService`), `domain/inventory/InventoryService.ts`, `domain/account/AccountVaultService.ts`, `domain/economy/` (`ShopService`, `EconomyService`), `domain/combat/SkillLoadout.ts` (carona), `data/items/item-catalog` (preço 0), `data/balance/economy.ts`.

**Desenho.**
- **UID**: `nextItemUid` passa a gerar `crypto.randomUUID()` (ou `${profileId}-${contador persistido}`); migração em `normalizeSavePayload` (F1) re-atribui uid duplicado ao carregar (#38). `ItemFactory` continua o único ponto de criação (`createFromCatalog`, `createDrop`); `CompositionService` e `DebugApi` passam por ele.
- **Transferências com resultado**: `add`, `remove`, `moveTo(other)`, `equip`, `unequip`, `swap` devolvem `{ ok, moved, remainder, reason }`; excedente **nunca** é descartado em silêncio — ou cabe inteiro, ou a operação recusa com `reason` (#41). `equip` calcula capacidade **antes** de mutar (troca neutra em slots sempre passa) (#36). Compra na loja só debita ouro depois que o `add` confirmou (`ShopService` usa o resultado).
- **`EquipmentService` dono do que deriva do equipamento**: `weaponSet` calculado a partir da arma equipada (`WeaponSetCatalog`), `attack/defense bonus` calculado num único `recalcEquipBonus` que já inclui refino (fim da soma dupla; composição passa a usar a mesma tabela) (#32, #33). `PlayerView.setWeaponSet` só reage ao evento `equipment:changed`; a strip do HUD vira indicador, não comando.
- **`ShopService` dono do estoque**: estoque por loja em memória de sessão (ou persistido — **DR2**), decrementa na compra, e a UI só mostra contagem se o estoque for real; `price` ausente/0 é erro de catálogo detectado por teste de dados (#40).
- **Ouro guardado**: helper `Gold.add/sub(current, delta)` que exige finito e devolve o novo valor com cap; setters de `InventoryService.gold` e `AccountVaultService.gold` recusam não-finito (mantêm o valor, reportam em dev) (#50).
- Carona: `SkillLoadout` recalcula `cooldown` por slot quando `spendSpec` muda a árvore (evento `skills:changed`), sem esperar `refresh()` — a metade "cooldown derivado só no refresh" de #42; a metade "clearSlot desfeito pelo autopreenchimento" é da **F1 do plano Skill TK linhagem 1** e não é repetida aqui.

**Tasks.** T6.1 uid + migração (#38) · T6.2 transferências com resultado (#36, #41) · T6.3 `EquipmentService` dono de bônus e conjunto de arma (#32, #33) · T6.4 `ShopService` estoque + teste de catálogo (#40) · T6.5 ouro guardado (#50) · T6.6 cooldown reativo (#42 carona).

**Issues fechadas.** #32, #33, #36, #38, #40, #41, #50. **Carona:** #42 (metade).

**Pronto quando.** Testes de F0 para cada issue verdes; um item movido bolsa→cofre→outro personagem→bolsa mantém uid único; comprar com bolsa cheia não debita; equipar com 40/40 troca a peça; refino +3 mostra +3/+3.

**Riscos.** Baixo-médio; regras de balance envolvidas (**DR2**, valores de refino/composição) — marcar provisório e citar fonte, conforme `AGENTS.md`.

### F7 — VFX por registro

**Objetivo.** Adicionar um VFX custa um arquivo e uma linha de registro; o `EffectManager` não conhece os 23 nomes; só quem está ativo é atualizado; luz e textura são compartilhadas.

**Escopo.** `game/src/presentation/effects/EffectManager.ts`, `effects/tkSkills/**`, `effects/vfxKit/`, `effects/skill/SkillVfxRuntime.ts`, `scripts/check-tk-controllers.mjs`, `scripts/check-tk-dispatch.mjs`.

**Desenho.**
- **Passo 1 = A3 da revisão** (já prescrito como F7 do plano Skill TK linhagem 1): interface estrutural `SkillVfxController { update, clear, dispose, getActiveCastCount, getParticleCount }` e uma lista `controllers` montada no construtor; os cinco laços iteram a lista. O `switch` de despacho por nome fica.
- **Passo 2 — registro preguiçoso**: `Map<vfxName, () => SkillVfxController>` (fábricas); a instância nasce no primeiro cast (ou em pré-aquecimento explícito ao entrar na dungeon, para não gerar hitch no primeiro uso), e o atlas de fogo 512² é gerado **uma vez** e compartilhado (#12). `update` só percorre controllers com `getActiveCastCount() > 0` (lista `active` mantida por eventos de início/fim de cast).
- **Luz compartilhada**: pool de `PointLight` criado no boot da cena (N fixo, `visible = false`), cedido ao cast por `acquire/release` — nenhuma luz é adicionada/removida da cena por cast, então nenhum shader recompila (#9).
- **Texturas parametrizadas**: os 23 `*Textures.ts` viram chamadas a `vfxKit/createGlowTexture(params)`/`createRingTexture(params)` com cache por parâmetros; paleta por instância (achado **A12**) preservada.
- `check-tk-controllers.mjs` passa a validar o registro (todo nome do `switch` existe no `Map`, toda fábrica devolve um controller que cumpre a interface).

**Tasks.** T7.1 lista de ciclo de vida (= plano TK 1, F7; se já executado, pular) · T7.2 registro preguiçoso + lista de ativos (#12) · T7.3 pool de luzes (#9) · T7.4 texturas parametrizadas · T7.5 portões atualizados.

**Issues fechadas.** #9, #12.

**Pronto quando.** Boot da cidade sem nenhum controller instanciado (contagem via `getSkillVfxState`); primeiro cast de cada skill sem hitch > 16 ms após pré-aquecimento; `check-tk-controllers.mjs`/`check-tk-dispatch.mjs` verdes; `npm run vfx:runtime:qa` na máquina do Felipe.

**Riscos.** Médio: 27 mil linhas tocadas mecanicamente. Fazer T7.4 por árvore (física, controle, magia) com validação visual entre elas.

### F8 — Views com ciclo de vida explícito

**Objetivo.** Nenhuma carga assíncrona aplica resultado em estado que já mudou; `sync` de view só toca o que mudou; recursos de tela são compartilhados.

**Escopo.** `game/src/presentation/enemies/EnemyRuntimeView.ts`, `presentation/player/{PlayerView,WeaponRig}.ts`, `presentation/rendering/SceneRenderer.ts` (oclusão), `game/public/boot/02-selecao-personagem.html` (cards).

**Desenho.**
- **Token de geração**: cada `equip`/`createEnemyRepresentation` incrementa uma geração por alvo; ao resolver o `loadAsync`, só aplica se a geração ainda é a corrente, senão descarta e dispõe o que carregou (#25, #26). Respawn reinicia o estado do controller de animação (`isDying`, timers, mixer) — um método `resetForRespawn` chamado pelo `EnemyService` via evento.
- **Sync por diff**: `EnemyRuntimeView.sync` recebe só inimigos alterados (posição/hp/estado) ou compara com o último estado por id; emissive de dano é escrito apenas na transição; mixers de inimigos ocultos são pausados; placeholder transparente removido da cena quando o modelo chega (#15).
- **Oclusão**: `SceneRenderer` mantém uma lista de occluders fixos (props com `userData.occluder`) montada no `switchTo` do `WorldManager`; o raycast por frame usa só ela (#10).
- **Cards do boot**: um único `WebGLRenderer` com `setScissor` por card (ou um card ativo por vez com snapshot estático dos demais); rAF único; `dispose` ao sair da tela (#21).

**Tasks.** T8.1 geração/cancelamento em `WeaponRig` e `EnemyRuntimeView` + `resetForRespawn` (#25, #26) · T8.2 `sync` por diff e mixers pausados (#15) · T8.3 lista de occluders (#10) · T8.4 renderer único nos cards (#21).

**Issues fechadas.** #10, #15, #21, #25, #26.

**Pronto quando.** Trocar de arma 10 vezes seguidas termina com a arma do último set; matar e esperar respawn não deixa inimigo invisível/encolhido; frame time da dungeon-test com 18 inimigos cai (medir antes/depois com o Performance panel; número provisório); tela de seleção com 8 cards usa um contexto WebGL.

**Riscos.** Baixo-médio. A tela de seleção é JS do boot (sem tipos): manter a task pequena e validada por `smoke`.

---

## 5. Ordem de execução e dependências

```
F0 ──► F1 ──► F2 ──► F3 ──► F4 ──► F5
 │                            ▲
 ├──────────► F6 ─────────────┘   (F6 pode correr em paralelo a F2–F4; F5 precisa dos resultados de F6 na WireApi)
 ├──────────► F7                  (independente; começa pela F7 do plano Skill TK 1)
 └──────────► F8                  (independente)
```

- **F0 primeiro, sempre.** Nenhuma fase de domínio começa sem o teste de caracterização do que vai mover.
- **F1 antes de F4**: tirar as 12 chamadas de `persistSave` da sessão antes de fatiá-la evita mover a política de save para cinco módulos.
- **F2 antes de F3 e F4**: `InteractionController` e `DungeonFlow` já nascem falando por bus isolado.
- **F5 por último entre as grandes**: a `WireApi` deve expor os casos de uso de F4 e os resultados de F6 — fazer antes obrigaria a refazer a interface.
- **F7 e F8 em paralelo** a qualquer momento após F0; não tocam domínio.
- Dentro de cada fase, a ordem das tasks é a listada; cada task termina com o caminho antigo apagado.

---

## 6. Relação com os planos existentes

| Plano / achado | Relação |
|---|---|
| Skill TK linhagem 1 — **F1** (`afterSkillLearned` único, A1) | Compatível: `afterSkillLearned` passa a viver no `RewardService`/serviço de skills da F4 e a pedir `markDirty` ao `SaveCoordinator` (F1). A metade "autopreenchimento desfaz `clearSlot`" de #42 é resolvida **lá**, não aqui. |
| Skill TK linhagem 1 — **F3** (bridge chama métodos da sessão que persistem, A2) | Absorvido pela `WireApi` (F5) + `SaveCoordinator` (F1): a persistência sai dos métodos e vai para o coordenador. |
| Skill TK linhagem 1 — **F6** (`GamePanels` via `tryLearnSkill`, A4; decisão **D11**) | Substituído: F5 remove `GamePanels` (**DR1**). Enquanto F5 não roda, a correção do plano TK continua válida. |
| Skill TK linhagem 1 — **F7** (lista de ciclo de vida, A3) | É o passo 1 da F7 deste plano. Quem executar primeiro leva; o outro pula. |
| Revisão — **A11** (diff antes de pintar) | Generalizado no `HudModel` (F2) e no `subscribe` do wire (F5). |
| Revisão — **A6** (portões Node × navegador) | Mantido: portão 1 (Node) ganha `npm test`; portão 2 (navegador) inalterado. |
| Dungeon 2 — YAGNI "stock decrementando na loja é decisão separada" | Respeitado: F6 só decrementa se **DR2** disser sim; caso contrário a UI para de exibir contagem falsa (a issue #40 é sobre a mentira, não sobre a regra). |
| Dungeon 2 — "dungeon não tem saída" | `DungeonFlow` (F4) nasce com `leaveDungeon(reason ∈ {timer, death, exit})` e `exit` só existe onde há `portal-exit` (D1). |

---

## 7. Restrições de código (regras duras — herdam do `AGENTS.md`)

1. **Zero comentários** em qualquer arquivo tocado (TS/JS/CSS/HTML). Exceção única: `/// <reference types="vite/client" />`. Rodar `game/scripts/_strip-comments.mjs` se necessário antes de fechar.
2. `npm run typecheck` **e** `npm test` obrigatórios verdes ao fim de cada task.
3. Sem `console.log` de debug, sem arquivos temporários, sem CSS/JS morto, sem emoji em UI — e, neste plano, **sem caminho antigo vivo** ao fechar a task (grep do símbolo removido deve dar zero).
4. UI não mente: nenhum estado de jogo em variável da UI; tudo vem da `WireApi`/save.
5. Ids de skill, item, dungeon, mundo e evento não mudam. Novo evento entra no `GameEventMap` com payload tipado.
6. Balance envolvido (atributos base, refino, estoque, saturação de XP) marcado **provisório** com fonte, até o Felipe fechar as decisões da seção 9.
7. Painéis C/K/I com os mesmos atalhos na cidade e na dungeon (F3 corrige a exceção atual).
8. Nenhuma dependência nova além do runner de testes (F0), e essa só em `devDependencies`.
9. Task registrada no painel **antes** de tocar código; `done` só com resultado testado; falhou → `block`.
10. Nada é commitado sem pedido explícito do Felipe.

---

## 8. YAGNI — explicitamente **fora** deste plano

| Não fazer | Por quê |
|---|---|
| Gerenciador de estado (Redux/Zustand/signals) ou ECS | O bus tipado + `HudModel` + serviços de domínio resolvem os problemas listados; framework novo é custo sem issue por trás |
| Reescrever a UI em React/Svelte | O markup e o CSS atuais já foram validados; o problema é o script e o contrato, não a tecnologia |
| Backend / sincronização remota de save | Fora do produto hoje; F1 deixa o `SaveCoordinator` como único ponto se isso vier |
| Registry de **despacho** de VFX por dados (DSL de partículas) | O `switch` por nome é explícito e barato; o que dói é o ciclo de vida, e isso F7 resolve |
| Pipeline de assets (compressão de PNG, conversão FBX→GLB, minificação do three no boot) | É a issue #20: tarefa de build/conteúdo, não de estrutura de código |
| Rebalancear render (MSAA, bloom, shadow map) e conteúdo de mundo (PointLights, `frustumCulled`) | Issues #11 e #18: ajustes de configuração/conteúdo com validação visual do Felipe; não dependem de refatoração |
| Efeito dos níveis 2–10 de passivas/buffs/invocações | Issue #37: decisão de design de skills (plano TK), não refatoração |
| i18n, acessibilidade além do que o `InputService` já dá | Sem pedido |
| Mudar `SAVE_VERSION` "por precaução" | Só se o esquema mudar de fato (T1.5) |

---

## 9. Decisões para o Felipe

| ID | Pergunta | Padrão assumido se não houver resposta | Fase |
|---|---|---|---|
| DR1 | Remover os painéis legados (`GamePanels`) ao fim da F5? Reverte a **D11** da revisão dos planos TK. | **Sim** — um conjunto de painéis; até lá, D11 continua valendo | F5 |
| DR2 | Estoque da loja: passa a decrementar (e persistir por sessão? por save?) ou a UI só para de mostrar contagem? | **Só para de mostrar contagem** (YAGNI do plano Dungeon 2); decrementar é decisão de economia | F6 |
| DR3 | Atributos base do personagem novo: 5 (boot/`AGENTS.md`) ou 10 (`PROGRESSION_BALANCE`)? Afeta `refundAllAttributes`. | **5**, porque o `AGENTS.md` já fixa "5/5/5/5" — a constante do balance é corrigida, não o boot | F1 |
| DR4 | Runner de testes: Vitest (dependência nova em `devDependencies`) ou `node --test` sem dependência? | **Vitest** | F0 |
| DR5 | Segunda aba com o mesmo personagem: bloquear (somente leitura com aviso) ou permitir com último-escreve-vence? | **Bloquear** | F1 |
| DR6 | Política de erro do tick: quantos frames consecutivos com falha antes de parar e pedir F5? | **5** (provisório) | F2 |
| DR7 | XP no nível máximo: zera, congela em `xpToNext` (barra cheia) ou continua e vira algo (moeda de prestígio)? | **Congela em `xpToNext`** (barra cheia, sem crescer no save) | F4 |
| DR8 | Zoom: passos discretos (limiar acumulado) ou contínuo suavizado? | **Contínuo suavizado** com clamp | F3 |

---

## 10. Matriz de rastreabilidade — todas as issues

**Tipo:** *estrutural* = a refatoração da fase elimina a causa; *carona* = correção pontual incluída na task da fase por tocar os mesmos arquivos; *pontual* = correção independente, fora deste plano; *decisão* = depende de decisão de produto/design.

| Issue | Título curto | Fase | Tipo | Observação |
|---|---|---|---|---|
| #9 | PointLight por cast recompila shaders | F7 | estrutural | pool de luzes |
| #10 | Raycast de oclusão contra `worldRoot` inteira | F8 | estrutural | lista de occluders |
| #11 | MSAA duplicado, bloom em DPR 2, shadow map 2048 por frame | — | pontual | configuração de render; validação visual do Felipe |
| #12 | 25 controllers de VFX no boot e por frame | F7 | estrutural | registro preguiçoso + ativos |
| #13 | HUD/DOM reescrito todo frame | F2 (+F5) | estrutural | `HudModel` com diff; wire com diff |
| #14 | DoT: número de dano por frame e dano dependente de dt | F4 | estrutural | cadência fixa no `CombatOrchestrator` |
| #15 | `EnemyRuntimeView.sync`: traversals, emissive, mixers ocultos | F8 | estrutural | sync por diff |
| #16 | Save completo a cada abate; `openDb` por operação | F1 | estrutural | debounce/checkpoint; conexão reutilizada |
| #17 | Sliders de volume → `setShadowsEnabled` | F2 | carona | `SettingsPanel` extraído |
| #18 | Mundo: `frustumCulled=false`, shaders procedurais, 14 PointLights, textura 2× | — | pontual | conteúdo/cena |
| #19 | Alocações e recomputações por frame no combate | F4 | estrutural | `frameMods` único, índice por id |
| #20 | Assets: GLB extra, loads sequenciais, PNGs pesados, three não minificado | — | pontual | pipeline de assets/build |
| #21 | Tela de seleção: um `WebGLRenderer` por card | F8 | estrutural | renderer único |
| #22 | Read-modify-write concorrente do blob da conta | F1 | estrutural | `updateAccount` serializado |
| #23 | `flush()` em loop; timers sobrevivem a logout/wipe | F1 | estrutural | ciclo de vida do `SaveVault` |
| #24 | Save de saída nunca roda (`beforeunload → dispose`) | F1 | estrutural | snapshot síncrono; listeners fora do `dispose` |
| #25 | `setWeaponSet` concorrente | F8 | estrutural | token de geração |
| #26 | Modelo de inimigo aplicado após morte; respawn sem reset | F8 | estrutural | token + `resetForRespawn` |
| #27 | Transições de mundo reentrantes | F4 | estrutural | `DungeonFlow` com estados |
| #28 | Boot (IDB v1) × jogo (IDB v2) no mesmo storage | F1 | estrutural | storage único |
| #29 | Múltiplas abas em último-escreve-vence | F1 | estrutural | lock por perfil (**DR5**) |
| #30 | Falha de leitura vira "sem save" e sobrescreve | F1 | estrutural | carga em três estados |
| #31 | Wire só conecta via `__UAIDZIN__` em DEV | F5 | estrutural | `WireApi` injetada |
| #32 | Refino contado duas vezes | F6 | estrutural | `recalcEquipBonus` único |
| #33 | Conjunto de arma desacoplado do equipamento | F6 | estrutural | `EquipmentService` dono |
| #34 | IA sem aggro/leash/colisão | F4 | carona | `EnemyAI` recebe mundo do `CombatOrchestrator` |
| #35 | Lixeira/Equipar melhor/Organizar só locais | F5 | estrutural | operações da `WireApi` |
| #36 | Troca de peça com bolsa cheia falha | F6 | estrutural | capacidade antes de mutar |
| #37 | Níveis 2–10 de passivas sem efeito | — | decisão | design de skills (planos TK) |
| #38 | UIDs de item colidem | F6 (+F1) | estrutural | uid único + migração |
| #39 | Atributos base 5 × 10 | F1 | estrutural | `normalizeSavePayload` + **DR3** |
| #40 | Estoque não decrementa; preço 0 | F6 | estrutural/decisão | `ShopService` dono; **DR2**; teste de catálogo |
| #41 | `add` descarta excedente e devolve `true` | F6 | estrutural | resultado explícito |
| #42 | `clearSlot` desfeito pelo `refresh`; cooldown só no `refresh` | plano TK 1 (F1) + F6 | carona | metade lá, metade aqui |
| #43 | Atalhos de debug sem gate; painel legado burla regras | F3 + F5 | estrutural | gate no `InputService`; `GamePanels` removido |
| #44 | XP sem limite no nível máximo | F4 | carona | `RewardService` + **DR7** |
| #45 | Exceção em um frame congela o jogo; handlers sem isolamento | F2 (+F4) | estrutural | isolamento + política do tick; `DungeonFlow` com `catch` |
| #46 | Teclado sem filtro de alvo/modificador; `E` atravessa a UI | F3 | estrutural | `InputService` com contexto |
| #47 | Zoom por roda ignora `deltaMode` | F3 | carona | roda normalizada (**DR8**) |
| #48 | `specialization` parcial vira NaN | F1 | estrutural | `normalizeSavePayload` |
| #49 | `postMessage` sem `origin`/validação | F1 | carona | validação do payload; segurança fora do foco |
| #50 | Ouro não-finito zera bolsa e corrompe cofre | F6 (+F4) | estrutural | ouro guardado; `VaultTransfer` valida |

**Totais:** 42 issues — 32 estruturais, 6 caronas (#17, #34, #42, #44, #47, #49), 3 pontuais (#11, #18, #20) e 1 decisão (#37); #40 e #42 têm parte que depende de decisão/outro plano. Ao fim das nove fases, ficam abertas por natureza: #11, #18, #20 (conteúdo/build) e #37 (design).

---

## 11. Verificação (definição de pronto do plano)

Automático (portão 1, Node, em toda task):
- `cd game && npm run typecheck` limpo.
- `npm test` verde; cada issue estrutural da seção 10 tem um caso nomeado que falhava antes da fase e passa depois.
- `node scripts/check-tk-controllers.mjs` e `check-tk-dispatch.mjs <árvore>` verdes após F7.
- Greps de fechamento por fase: `persistSave(` fora do coordenador = 0 (F1); `addEventListener("keydown"` fora do `InputService` e dos diálogos do wire = 0 (F3); `__UAIDZIN` em `game/src` só em `debug/` (F5); `tk[A-Z]\w+\.` em `EffectManager.ts` = 0 (F7); `wc -l CityGameSession.ts` < 400 (F4).

Navegador (portão 2, máquina do Felipe):
- `npm run smoke`, `npm run test:save`, `npm run bot` sem regressão ao fim de cada fase.
- `npm run build && npm run preview`: painéis operam sobre o save (F5).
- `npm run vfx:runtime:qa` e validação visual após F7 e F8.

Manual (lab admin/admin), ao fim do plano:
1. Fechar a aba no meio de uma dungeon e reabrir: último abate e ouro presentes.
2. Duas abas com o mesmo personagem: a segunda avisa e não grava.
3. Digitar no campo de ouro do cofre com WASD/E/1: nada acontece no mundo.
4. Forçar exceção num painel (debug): toast de erro, jogo continua.
5. Trocar de arma repetidamente, matar e esperar respawn: modelo e animação corretos.
6. Comprar com bolsa cheia, equipar com 40/40, refinar +3, mover item ao cofre e voltar: resultados corretos e uids únicos.
7. Comparar frame time da dungeon-test antes/depois (Performance panel) — número registrado no fechamento da task, provisório.

O Felipe valida UI/HUD/comportamento visível antes de qualquer fase ser tratada como fechada.

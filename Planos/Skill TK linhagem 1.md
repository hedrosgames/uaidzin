# Skill TK — linhagem 1 (Física · Físico ofensivo)

**Status:** plano de implementação; fundação F1–F7 **pendente** no runtime (barra ainda 4 slots). Etapas 1 das linhagens 2 e 3 **já executadas** (PR #8, merge em 26/09/2026).

**Repositório:** `Planos/Skill TK linhagem 1.md` na `main`.

Plano de implementação. Só arquitetura e regra de organização; **não contém código**. Quem executar segue este documento passo a passo, uma etapa por task no painel, e o Felipe valida cada skill antes da próxima.

---

## 0. Decisões fechadas com o Felipe (26/09/2026)

| # | Pergunta | Resposta |
|---|---|---|
| 1 | O que é “linhagem 1” do TK | Árvore **Física** (`treeOrder[0]` do TK = `fisica`, rótulo “Físico ofensivo”) |
| 2 | Conjunto canônico das 8 | **Código atual** (`game/src/data/classes/skills/tk.ts` → `TK_FISICA`): Force Wave · Atk Descuidado · Mestre Dual · Death Stab · Fury · Increase Critical · Earthquake · Fire Burst |
| 3 | Barra de skills | Expansão do runtime de **4 → 10** slots (regra do grill) entra **neste plano** como fundação |

Consequência da decisão 2: os nomes “Golpe · Corte · Investida · Machado · Quebra · Fúria · Avalanche · Colosso” do inventário (`skills.md`, `classes.md`) e do `VFX-KIT-FIREBURST.md` viram **aliases históricos**. Os IDs do código são o contrato; os controllers de VFX em `tkSkills/` continuam com o nome da pasta e são **reaproveitados** pelo mapa `TK_DEDICATED_VFX_BY_SKILL_ID`.

Referência criativa: `game/vfx/skills-vfx-brief.md` (Atelier X7) traz um conceito autoral por **id atual** (ex.: `tk_fis_force_wave` · “Gume de pressão”: slash na origem → percurso → impacto no alvo). É estudo de lab, não runtime; sustenta as escolhas de VFX das seções 5 e 6 (o impacto no alvo do Force Wave, S1, vem daí).

Continuações: `Planos/Skill TK linhagem 2.md` (Controle) e `Planos/Skill TK linhagem 3.md` (Magia) dependem de F1–F4 e F6 deste plano só para o teste ponta a ponta com barra de 10 e para o “Melhorar”; a etapa 2 do plano 3 reutiliza o padrão de paleta por instância introduzido em S2.

Estado (rev. 26/09/2026): as etapas 1 das linhagens 2 e 3 foram executadas antes deste plano. Já existem no código: `SkillDef.desc` com bridge e wire exibindo descrição e a linha de passiva (F5, estrutura), `EffectManager.directionFor`, `playPassiveLearnVfx` na sessão, `game/scripts/check-tk-dispatch.mjs` e o mapa de VFX sem as chaves mortas de `ctrl`/`mag`. Revisão de arquitetura: `Planos/Revisão de arquitetura — linhagens 1, 2 e 3.md`.

---

## 1. Regras que este plano obedece

Fonte: `AGENTS.md` e `nongame/docs/project/DECISOES-DESIGN.md` (grill).

- Prosa, UI e commits em **pt-BR** com acento correto.
- **Zero comentário** em código (TS/JS/CSS/HTML). `npm run typecheck` verde antes de fechar qualquer etapa.
- **Não inventar balance.** Todo número deste plano vem de `tk.ts`, `SKILL_BALANCE` ou `SKILL_TRAINING` e é **provisório** até o Felipe ajustar jogando.
- **UI não mente:** classe, skills, barra, ouro e pontos saem do save. Wire nunca guarda estado de jogo próprio.
- Painéis **C/K/I** com os mesmos atalhos na cidade e na dungeon. Sábio não abre build. Compra de skill no **Mestre de Skills** (NPC `npc-skill-master`, painel `skillmaster`); K é consulta e montagem da barra.
- Sem emoji, sem tutorial na UI, botões retangulares, paleta Salão/Brasa.
- Cada etapa vira task no painel; `done` só com teste executado; Felipe valida o que é visível.
- Não commitar sem pedido explícito.

---

## 2. Diagnóstico — estado atual da linhagem

### 2.1 O que já existe e é reaproveitado

| Peça | Onde | Estado |
|---|---|---|
| Definição das 8 skills (kind, shape, dano, buff, passiva, MP, CD, alcance) | `game/src/data/classes/skills/tk.ts` → `TK_FISICA` via `defineSkill` | Completa; números provisórios |
| Tipos e padrões de skill | `game/src/data/classes/skill-types.ts` (`SkillDef`, `SkillInput`, `defineSkill`) | Completo, com `desc` (rev.) |
| Balance de tier (MP/CD/mult/alcance), teto de nível 10, 8ª exclusiva, spec | `game/src/data/balance/skills.ts` (`SKILL_BALANCE`) | Completo |
| Custo de compra (1 ponto + ouro por tier) | `game/src/data/balance/economy.ts` (`SKILL_TRAINING`) | Completo; `upCost` está morto (ninguém usa) |
| Compra: pontos, pré-requisito (anterior ≥ 1), teto, 8ª exclusiva | `game/src/domain/skills/SkillTreeService.ts` | Completo |
| Débito de ouro + save ao comprar | `CityGameSession.tryLearnSkill` | Completo |
| Cast: mana, cooldown, auto/manual, alvo, dano, buff, status | `SkillController.ts` · `SkillCasting.ts` · `CombatMods.ts` · `BuffService.ts` | Completo para os 3 kinds usados aqui (`damage`, `buff`, `passive`) |
| Passivas fora da barra | `SkillLoadout` ignora `kind === "passive"`; `learnedPassives` alimenta `buildCombatMods` | Completo |
| Catálogo VFX 96 perfis + mapa id → VFX dedicado | `presentation/effects/skill/SkillVfxCatalog.ts` | Completo; mapa da física incompleto (ver 2.2) |
| Despacho de VFX por skill | `EffectManager.dispatchSkillVfx` (switch por `dedicatedVfx`, fallback `SkillVfxDirector`) | Completo |
| Controllers dedicados prontos (malha 3D + Quarks + lab + QA) | `presentation/effects/tkSkills/{golpe,corte,investida,machado,quebra,furia,avalanche}` + `fireBurst/` | Prontos (X12 técnico; X10/X11 Fire Burst validado pelo Felipe) |
| Save de níveis, 8ª árvore, pontos, loadout, buffs | `persistence/SaveTypes.ts` (`SavePayload.skills`, `skillLoadout`, `buffs`) | Completo; loadout sem posição |
| Mestre de Skills pinta árvores reais e compra via `learnSkill` | `visual/telas/03-wire-paineis-cidade.html` (`paintSkillMaster`, `tryBuySkill`) + `ui/WireGameBridge.ts` | Completo para nível 1 |
| QA de controllers e catálogo | `game/scripts/check-tk-controllers.mjs`, `check-tk-*.mjs`, `check-skill-vfx.mjs`, `check-fire-chain.mjs` | Prontos |

### 2.2 Lacunas que este plano fecha

| ID | Lacuna | Evidência |
|---|---|---|
| G1 | Runtime tem **4 slots** e teclas **1–4**; grill exige **10** | `SkillLoadout` (`slice(0, 4)`, `>= 4`, `slots[3]`), `PlayerController` (4 métodos `consumeSkill*Pressed`), `CityGameSession.skillSlotPressed` |
| G2 | A barra **visível** é a do wire (`#skillHud`, 10 anéis) e é **mock local** (`bar[]`, `bar[0] = "caca-1"`), desconectada do `SkillLoadout`; sem cooldown real | `GameApp.enterGame` esconde `#skill-bar` quando há wire; wire `equipSkill/unequipBar/paintBar` só mexem em array local |
| G3 | Painel **K** (`p-skills`) pinta árvores **mock de HT** (`armadilha/marca/caca/special`, 12 slots, `SKILL_DEFS`) — arrasto para a barra usa ids falsos | `paintTrees`, HTML `data-tree="armadilha"` etc. |
| G4 | VFX: `tk_fis_death_stab` e `tk_fis_atk_descuidado` caem no **genérico**; `investida`, `corte`, `machado`, `quebra` estão **órfãos**; chaves legadas `tk_fis_1..7` no mapa nunca casam (as de `ctrl`/`mag` já foram removidas, rev.) | `TK_DEDICATED_VFX_BY_SKILL_ID` |
| G5 | Force Wave acerta a 6,5 m mas o VFX `golpe` é um arco **na origem**; nada acontece no alvo | `dispatchSkillVfx` case `"golpe"` |
| G6 | Descrição da skill na UI é o **próprio nome** quando a ficha não tem `desc` — estrutura pronta (rev.); faltam os 8 textos da física | `WireGameBridge.buildWireSkillCatalog` |
| G7 | **Melhorar** skill (nível 2–10) não tem caminho na UI do Mestre (`canBuySkill` bloqueia `level > 0`), mas o tooltip mostra “x / 10” | wire `canBuySkill`, `renderTip` |
| G8 | `auto` nasce **ligado** ao equipar; grill diz **manual até o jogador ligar** | `SkillLoadout.assign` (`auto: true`) |
| G9 | Docs desatualizados: `skills.md`/`classes.md`/`VFX-KIT` usam nomes antigos; `AGENTS.md` diz que `visual/telas/` não é fonte, mas `WireUi` **busca** `/wire/03-wire-paineis-cidade.html` de lá (`vite.config.ts` → `wireUiPlugin`) | inspeção |

### 2.3 Fora do escopo (registrado, não executar aqui)

| Item | Motivo |
|---|---|
| Pontos por nível **1** (código) × **2** (grill) | Afeta todas as classes; decisão separada (afeta o custo total da linhagem — ver 6.2) |
| Livros (`BOOK_SKILLS`) na UI | Sem caminho de aprendizado definido; bloco `special` do K fica oculto |
| HUD de buffs ativos | Feature nova; nenhuma das 8 depende dela para funcionar |
| Aura que **segue** o jogador pela duração do buff | Fúria/Descuidado usam ativação curta (2 s) no ponto de cast; suficiente para validar |
| Forma `cone` em `SkillShape` | Earthquake fica círculo (mecânica) com VFX em cone (ver S7) |
| Ícones finais por skill | Continuam placeholder (`assets/skills/caca-N.svg`); campo `icon` só quando existir arte |
| Registry de **despacho** no `EffectManager` | O `switch` por `dedicatedVfx` continua explícito; o que entra em F7 é só a lista de ciclo de vida (rev., achado A3), porque S2 cria a 24ª instância |
| Refazer as outras 16 skills do TK ou outras classes | Escopo é a linhagem 1 |

---

## 3. Arquitetura de organização

### 3.1 Princípio: uma informação, um dono

| Informação | Dono único | Quem só lê |
|---|---|---|
| Ficha da skill (id, nome, tipo, forma, números, buff, passiva, **descrição**) | `data/classes/skills/tk.ts` via `defineSkill` | bridge, wire, catálogo VFX, controller de cast |
| Tamanho da barra | `SKILL_BALANCE.barSize` (novo, valor **10**) | `SkillLoadout`, `SkillController`, `PlayerController`, bridge, wire, save |
| Preço de compra/melhoria | `SKILL_TRAINING` (`pointsCost`, `goldCost(index)`) | `tryLearnSkill` (cobra), bridge (exibe), wire (exibe) |
| Regra de aprendizado (pré-requisito, teto, 8ª) | `SkillTreeService` | wire (só espelha `can/dim/locked`) |
| Estado da barra (posição, skill, auto) | `SkillLoadout.slots` (posicional, 10) → save `skillLoadout.slots[].index` | wire `#skillHud` (projeção), HUD runtime `#skill-bar` (fallback sem wire) |
| Skill → VFX dedicado | `TK_DEDICATED_VFX_BY_SKILL_ID` em `SkillVfxCatalog.ts` | `EffectManager.dispatchSkillVfx` |
| Visual de cada VFX | Controller da pasta (`GolpeVfx.ts`, `FuriaVfx.ts`…) com `DEFAULT_*_CONFIG` | `EffectManager` (instancia, chama `cast*`, `update`, `clear`, `dispose`) |

Regra dura: **wire não tem estado de jogo**. Todo `bar[]`, `skillPoints`, `playerGold` locais do wire são cache de pintura recarregado por `syncFromGame`; qualquer ação (equipar, tirar, comprar, auto) vai para a bridge e volta por `syncFromGame`.

### 3.2 Fluxo ponta a ponta (após o plano)

```
Mestre de Skills (wire)            K (wire)                       Teclado / auto
  dblclick "Comprar/Melhorar"        arrastar para #skillHud         1..9,0 · clique no anel
        │                                  │                               │
        ▼                                  ▼                               ▼
 bridge.learnSkill(tree,i)      bridge.equipSkill(id,index)      PlayerController.consumeSkillSlotPressed()
        │                       bridge.unequipBar(index)                     │
        ▼                       bridge.toggleAuto(index)                     ▼
 CityGameSession.tryLearnSkill        │                          CityGameSession.skillSlotPressed()
   SkillTreeService.learn             ▼                                      │
   inventory.gold -= custo      SkillLoadout.assign/clearSlot/toggleAuto      ▼
   SkillLoadout.assign (1ª vez)       │                          SkillController.tick(manualIndex | auto)
   persistSave                        ▼                            spendMp · resolveSkill · buffs.add
        │                        persistSave                       loadout.use(slot)
        └──────────────► wire.syncFromGame() ◄──────────────┐              │
                          (pinta K, Mestre, barra)          │              ▼
                                                            │   CityGameSession monta SkillVfxRequest
 GameApp.renderHud ── wireUi.applyBarState(hud.skills) ─────┘   EffectManager.dispatchSkillVfx
   (só cooldown/ready/auto, sem innerHTML)                        └─ switch dedicatedVfx → controller.cast*
                                                                  └─ fallback SkillVfxDirector.play
```

### 3.3 Camadas e o que cada uma pode tocar neste plano

| Camada | Arquivos permitidos | Proibido |
|---|---|---|
| Dados | `data/classes/skills/tk.ts` (só `desc` e, se o Felipe pedir, números) · `data/classes/skill-types.ts` (campo `desc`) · `data/balance/skills.ts` (`barSize`) · `data/balance/economy.ts` (limpar `upCost` ou usá-lo) | Criar arquivo novo de dados; mexer em `fm.ts`/`bm.ts`/`ht.ts` |
| Domínio | `domain/combat/SkillLoadout.ts` · `domain/combat/SkillController.ts` (leitura null-safe dos slots) | `SkillCasting.ts`, `CombatMods.ts`, `BuffService.ts`, `SkillTreeService.ts` (nada muda de regra) |
| Gameplay | `gameplay/PlayerController.ts` (teclas 1–9,0) | Movimento, clique, interação |
| Sessão | `app/CityGameSession.ts` (`skillSlotPressed`, `tryLearnSkill` equipar na 1ª compra, alvo do VFX de linha) · `app/GameApp.ts` (chamar `applyBarState`) | Loop de combate, dungeon, save além do necessário |
| Apresentação | `effects/skill/SkillVfxCatalog.ts` (mapa) · `effects/skill/SkillVfxTypes.ts` (união `DedicatedSkillVfx`) · `effects/EffectManager.ts` (2 cases + 1 instância) · `effects/tkSkills/furia/*` (paleta opcional) | Criar pasta nova de VFX; editar `golpe/investida/avalanche/fireBurst` além de bug |
| UI | `ui/WireGameBridge.ts` (4 funções novas) · `ui/WireUi.ts` (`applyBarState`) · `ui/GamePanels.ts` (só compilar com slot nulo) · `visual/telas/03-wire-paineis-cidade.html` (barra real, K real, Melhorar) | Novo painel; CSS além do necessário; texto de tutorial |
| Persistência | `persistence/SaveTypes.ts` (`index?` no slot) · `persistence/migrations.ts` (carregar `index`) | Bump de `SAVE_VERSION`; migração nova |
| Scripts | `game/scripts/check-tk-fisica.mjs` (novo, Playwright) | Alterar QAs existentes além de nomes |
| Docs | `nongame/docs/inventarios/skills.md`, `classes.md`, `vfx.md`, `save-load.md` · `nongame/docs/project/VFX-KIT-FIREBURST.md` · `AGENTS.md` (nota sobre `/wire`) | Recriar planos apagados |

### 3.4 Restrição YAGNI (o que **não** construir mesmo parecendo útil)

1. **Sem campo de preço por skill.** A fórmula `(index + 1) × 28` ouro + 1 ponto cobre as 8. Só se o Felipe pedir preço fora da fórmula entra `price` opcional em `SkillInput`.
2. **Sem sistema de ícones.** Placeholder atual permanece.
3. **Sem controller novo.** Atk Descuidado reutiliza `FuriaVfxController` com paleta; Death Stab reutiliza `investida`; Force Wave reutiliza `golpe` + `quebra`.
4. **Sem registry de despacho.** Dois `case` a mais no switch existente; o ciclo de vida (update/clear/dispose/contagem) passa a iterar uma lista única (F7, rev.).
5. **Sem HUD de buff, sem aura persistente, sem forma cone, sem migração de save, sem UI de livros.**
6. **Sem reescrever o wire.** Só trocar a fonte do `bar[]` e das árvores do K pela bridge, remover mocks e ligar cooldown.
7. **Sem tocar em Fire Burst** (validado) além de descrição e teste.
8. **Sem alterar números** de dano/MP/CD/buff a não ser por pedido explícito, e aí marcado provisório.

---

## 4. Fundação (pré-requisito comum às 8)

Cada F é uma task. Ordem obrigatória: F1 → F2 → F4 → F3 → F5 → F6 → F7 (F3 depende do save com posição; tabela completa na seção 7). Só depois começa S1.

### F1 — Barra posicional de 10 no domínio

**Objetivo:** `SkillLoadout` passa a ser uma barra de tamanho fixo `SKILL_BALANCE.barSize` (10), com posições vazias possíveis, e vira o **único** dono do estado da barra.

Arquitetura:

- `SKILL_BALANCE.barSize = 10` (constante única; nenhum outro `4`/`10` literal no código de barra).
- `SkillLoadout.slots` passa a ser um array de tamanho `barSize` onde cada posição é um `LoadoutSlot` **ou vazio**. A posição é o número da tecla (0 → “1”, …, 9 → “0”).
- `assign(skillId, index?)`: sem `index` usa a primeira posição vazia; com `index` coloca/substitui ali; se a skill já estava em outra posição, **move** (não duplica). Recusa passiva e skill não aprendida. Retorna sucesso.
- `clearSlot(index)`: esvazia a posição (não compacta).
- `toggleAuto(index)`: inverte `auto` da posição.
- `refresh()`: **revalida** o que está na barra (remove skill que deixou de estar aprendida, atualiza `level` e `cooldown` com spec) e **não preenche** posições vazias sozinho. O preenchimento automático atual (candidatos por score) é removido; ele impedia o jogador de tirar uma skill da barra.
- Conveniência mantida: ao comprar o **nível 1** de uma skill ativa, a sessão chama `assign(skillId)` uma única vez (primeira posição vazia). Nas melhorias (nível ≥ 2) não mexe na barra.
- (rev., achado A1) Um único ponto na sessão, `afterSkillLearned(tree, index)`, faz `refresh`, o `assign` do nível 1 e `playPassiveLearnVfx`; **todos** os chamadores de `skillTree.learn` passam por ele: `tryLearnSkill`, `debugLearnRandomSkill`, `DebugApi.learnFirstSkill` e a ação `learn` de `GamePanels` (que em F6 passa a usar `tryLearnSkill`). O caminho de debug liga `auto` na posição equipada (D10), senão o bot (`scripts/bot-play.mjs`) deixa de castar skills sem nenhum teste acusar.
- `snapshot()` devolve a lista das posições ocupadas com `{ skillId, tree, auto, index }`. `applySaved` respeita `index`; se faltar (save antigo), ocupa em sequência.
- `auto` nasce **desligado** ao equipar (grill: manual até o jogador ligar). Decisão D1 abaixo; se o Felipe preferir ligado, é um literal só.
- `bestReadyAuto`, `tick`, `resetCooldowns`, `use` passam a ignorar posições vazias.
- `SkillController.slotStates()` devolve **10 entradas** (vazias incluídas) com `key` de exibição `1…9,0`; `manualSlot(index)` e `slotLabels()` tratam vazio.
- `GamePanels` (fallback sem wire) só ganha o tratamento de posição vazia para continuar compilando; sem redesenho.
- `debug/DebugApi.ts`: o campo `skillSlots` do snapshot passa a contar **posições ocupadas** (hoje é `slots.length`, que viraria sempre 10).

Restrição de código: dois arquivos de domínio (`SkillLoadout.ts`, `SkillController.ts`), um de balance, ajuste mínimo em `CityGameSession.tryLearnSkill` e `GamePanels`. Nenhuma API nova além de `index?` em `assign` e `index` no snapshot.

Teste: `typecheck`; harness de save (`npm run test:save`) continua verde; `npm run bot` continua registrando `skillSlots > 0` e casts de skill; teste unitário de mesa via `__UAIDZIN__` no console (assign em posição 7, clear, toggle, reload) documentado no `check-tk-fisica.mjs` (F7).

Aceite: dá para ter skill na posição 9 com as posições 2–8 vazias; tirar uma skill da barra **permanece** após ganhar nível; passiva nunca entra.

### F2 — Teclas 1–9 e 0

**Objetivo:** substituir os quatro métodos `consumeSkill*Pressed` por um único `consumeSkillSlotPressed()` que devolve o índice (0–9) ou −1.

Arquitetura:

- `PlayerController` mantém um mapa tecla → índice (`Digit1…Digit9` → 0–8, `Digit0` → 9; `Numpad` equivalentes) e um estado “estava pressionada” por tecla, para disparar uma vez por pressionamento como hoje.
- `CityGameSession.skillSlotPressed()` passa a: primeiro `pendingSkillSlot` (clique na barra), depois `consumeSkillSlotPressed()`.
- `forceSkillSlot(index)` inalterado; a barra do wire usa índice 0–9.
- Teclas não disparam com input/textarea focados (já tratado em `GameApp.onKeyPanels` para painéis; skills seguem o comportamento atual).

Restrição de código: um arquivo de gameplay e uma função da sessão. Menos código do que antes.

Teste: `typecheck`; smoke; manual: `0` casta a posição 10.

### F3 — Barra do wire e painel K como projeção do save

**Objetivo:** a barra visível (`#skillHud`) e o painel K mostram o que está no `SkillLoadout` e no `SkillTreeService`; toda ação vai pela bridge.

Arquitetura — bridge (`ui/WireGameBridge.ts`, dentro de `createWireGameApi`):

- `barSnapshot()` → 10 posições; cada uma `null` ou `{ index, skillId, wireId, auto }`. `wireId` é o id que o wire já usa (`${tree}-${idx}`), calculado aqui para o wire não precisar de mapa reverso.
- `equipSkill(skillId, index)` → `session.equipSkill(skillId, index)` + `onChanged`.
- `unequipBar(index)` → `session.clearSkillSlot(index)` + `onChanged`.
- `toggleAuto(index)` → `session.toggleSkillAuto(index)` + `onChanged`.
- (rev., achado A2) Os três métodos **já existem** em `CityGameSession` (L1327–1338) e são usados por `GamePanels`; eles passam a chamar `persistSave` e `equipSkill` ganha `index?` e retorno `boolean`. A bridge nunca toca `session.skillLoadout` diretamente.
- `pullSkillCatalog()` passa a incluir `barSize` e cada linha ganha `passive: boolean` e `desc` real (F5).

Arquitetura — wire (`visual/telas/03-wire-paineis-cidade.html`):

- Remover o estado mock: `bar[]` inicial, `bar[0] = "caca-1"`, `bar[1] = "marca-1"`, classes mock `.half/.full`.
- `paintBar()` lê `barSnapshot()`; quando não há jogo (`gameApi()` nulo), pinta 10 anéis vazios.
- `equipSkill(id, index)` e `unequipBar(index)` chamam a bridge e depois `syncFromGame()`; nada de mutação local.
- Arrastar do K para a barra, arrastar entre anéis, arrastar para fora (tirar) e duplo clique no K → mesmas funções.
- Botão direito no anel → `toggleAuto(index)`. O anel mostra um marcador discreto de auto (classe CSS existente ou nova mínima, sem emoji). Tooltip da barra mostra “Auto: ligado/desligado”.
- Nova função exposta em `window.__UAIDZIN_WIRE__`: `paintBarState(list)` que recebe as 10 entradas de `SessionHud.skills` e só ajusta **classes e altura da máscara de cooldown** do anel (nunca `innerHTML`). `GameApp.renderHud` chama `wireUi.applyBarState(hud.skills)` quando há wire. (rev., A11) Como `renderHud` roda por frame, o wire guarda o último estado pintado por posição e só toca o DOM quando `cdRatio`, `ready` ou `auto` mudaram.
- Painel K: os quatro blocos fixos (`armadilha/marca/caca/special`) são substituídos por blocos gerados a partir de `SHOP_TREES` (mesma origem do Mestre), **8 slots** por árvore, capstone na 8ª, mesma pintura `paintTrees`. Bloco de livros oculto. `SKILL_DEFS` mock de HT fica só como fallback quando não há jogo (o arquivo também abre sozinho em `visual/telas/`).
- Cabeçalho do K: “8ª árvore” lê `eighthTree` do save (via catálogo) e “Pontos de skill” lê `skillPoints`.

Arquitetura — `WireUi.ts`: um método `applyBarState(list)` que repassa para `__UAIDZIN_WIRE__.paintBarState` se existir.

Restrição de código: nenhuma tela nova; reaproveitar `paintTrees`, `paintSkillMaster`, `renderTip`, `syncFromGame`. CSS só para o marcador de auto e para a máscara de cooldown do anel se a classe ainda não existir.

Teste: Playwright (`check-tk-fisica.mjs`, F7): abrir K, arrastar skill para a posição 5, recarregar, posição 5 mantida; anel mostra cooldown após cast; botão direito alterna auto e persiste.

Aceite (Felipe): a barra que aparece é a **única** barra e obedece ao save; K mostra as árvores do TK, não as da HT.

### F4 — Save com posição

**Objetivo:** persistir a posição na barra sem bump de versão.

Arquitetura:

- `SkillLoadoutSlotSave` ganha `index?: number` (opcional, aditivo).
- `migrations.asLoadoutSlots` copia `index` quando existir; `SkillLoadout.applySaved` trata ausência (sequencial).
- `SAVE_VERSION` **não** muda. Saves antigos carregam com skills em sequência.
- Doc: linha do loadout em `nongame/docs/inventarios/save-load.md`.

Restrição de código: dois arquivos de persistência, um tipo, uma linha de doc.

Teste: `npm run test:save`; carregar save antigo do lab (admin/admin) e conferir barra.

### F5 — Descrição na ficha da skill

**Estado (rev.):** estrutura **pronta** na execução das linhagens 2 e 3 (`desc` em `SkillDef`/`SkillInput`/`defineSkill`, bridge com `desc` e `passive`, tooltip e Mestre com “Passiva · não vai para a barra”). Resta só colar os 8 textos da seção 5 em `tk.ts`; `node scripts/check-tk-dispatch.mjs fisica` acusa os que faltam.

**Objetivo:** cada skill exibe texto pt-BR na UI vindo da ficha, não do nome.

Arquitetura:

- `SkillInput.desc?` → `SkillDef.desc?` (copiado em `defineSkill`).
- `WireGameBridge.buildWireSkillCatalog`: `desc = sk.desc ?? sk.name`; linha ganha `passive: sk.kind === "passive"`.
- Wire: `renderTip` e `showSmDetail` já exibem `desc`; para passiva, acrescentar a linha fixa “Passiva · não vai para a barra” e ocultar MP/CD.
- As 8 descrições ficam na seção 5 deste plano (texto pronto para colar em `tk.ts`).

Restrição de código: um campo, uma cópia, uma linha na bridge, dois `if` no wire.

Teste: hover em cada uma das 8 no Mestre e no K mostra o texto; acentos corretos (checagem visual do Felipe).

### F6 — Comprar e melhorar no Mestre de Skills

**Objetivo:** o caminho de nível 2–10 existe na UI, com o mesmo custo de compra (provisório), e o K deixa de mostrar “x / 10” sem ter como subir.

Arquitetura:

- Wire `canBuySkill`: permite quando `level < 10` (teto de `SKILL_BALANCE.skillLevelCap`, exposto no catálogo como `levelCap`); rótulo do detalhe: “Comprar” quando `level = 0`, “Melhorar” quando `1 ≤ level < 10`, “Máximo” quando 10.
- Pré-requisito e 8ª continuam sendo julgados pelo `SkillTreeService` (`tryLearnSkill` → `canLearn`); o wire só espelha.
- (rev., achado A4) A ação `learn` do painel de fallback `GamePanels` (L59–64) hoje chama `skillTree.learn` direto — sem ouro e sem save. Passa a chamar `session.tryLearnSkill` (D11), fechando o único caminho que aprende de graça.
- Custo por nível: mesma fórmula (`pointsCost` 1 + `goldCost(index)`). `upCost` é código morto em quatro pontos (`SKILL_TRAINING.upCost`, campo `upCost` da linha em `WireGameBridge`, `skillUpCost` em `__UAIDZIN_ECONOMY__` no `WireUi` e a leitura no wire): **remover os quatro**; se o Felipe quiser melhoria mais cara que a compra, é aqui que volta (decisão D8).
- Efeito do nível hoje: +5 % de dano/cura por nível (`skillLevelDamageBonus`); buffs e passivas **não** escalam — registrar no tooltip como “Nível afeta dano” só onde vale (texto da seção 5).

Restrição de código: wire (`canBuySkill`, `showSmDetail`), bridge (`levelCap`, tirar `upCost`), `WireUi` (tirar `skillUpCost`), balance (tirar `upCost`).

Teste: comprar Force Wave 1 → 2 → 3 debita 28 de ouro e 1 ponto por nível; nível 10 bloqueia.

### F7 — Higiene do mapa de VFX e QA da linhagem

**Objetivo:** o mapa `TK_DEDICATED_VFX_BY_SKILL_ID` reflete só ids reais da física e existe um script de aceite da linhagem.

Arquitetura:

- Remover as chaves mortas `tk_fis_1 … tk_fis_7` (nunca casam com o catálogo, que é gerado dos ids atuais). As de `ctrl`/`mag` já foram removidas (rev.).
- (rev., achado A3) Lista de ciclo de vida no `EffectManager`: interface estrutural `TkSkillVfxController` (`update(dt, width?, height?)`, `clear`, `dispose`, `getActiveCastCount`, `getParticleCount` — assinatura que os 23 controllers já têm) e um array privado montado no construtor; `clear`, `getSkillVfxState` (duas somas), `update` e `dispose` iteram o array em vez das 115 chamadas nominais atuais. O `switch` de despacho não muda. Entra antes de S2, que cria a 24ª instância.
- Adicionar `tk_fis_death_stab: "investida"` (S4) e `tk_fis_atk_descuidado: "descuidado"` (S2). União `DedicatedSkillVfx` ganha `"descuidado"`.
- `check-skill-vfx.mjs` continua exigindo 96 perfis (nenhuma skill é criada ou removida).
- Novo `game/scripts/check-tk-fisica.mjs` (Playwright, molde `check-c6-c20.mjs`), usando só o que `window.__UAIDZIN__` já expõe (`debugAddLevels`, `wire.learnSkill`, `wire.pullSkillCatalog`, `session`, `persistSave`): sobe o preview, login admin/admin, TK, dá níveis, ajusta ouro pela `session.inventory`, compra as 8 pela bridge, confere barra 10 (6 ativas equipadas, 2 passivas ausentes), casta cada ativa por tecla e por clique, lê `session.effects.getSkillVfxState().active > 0` no frame do cast, confere `session.buffs.active` após Fury e Atk Descuidado, confere que a 8ª das outras árvores fica bloqueada, recarrega e confere barra e níveis. Sem screenshot obrigatório; DOM + estado. Nenhum método novo no `DebugApi` além do ajuste de `skillSlots` (F1).

Restrição de código: um arquivo de script novo; mapa e união.

Teste: portão Node — `typecheck`, `node scripts/check-tk-dispatch.mjs fisica` (as 8 com `desc`, cada ativa inicia o controller certo em 5 direções) e `node scripts/check-tk-controllers.mjs golpe investida quebra furia avalanche`; portão navegador — `node scripts/check-tk-fisica.mjs` e `npm run vfx:runtime:qa` (rev., achado A6).

---

## 5. As 8 skills, uma a uma

Formato de cada ficha: **Identidade** (contrato) · **Custo** · **Uso** · **Barra** · **VFX** · **UI** · **Delta** (o que falta) · **Restrição de código** · **Teste/aceite** · **Riscos e decisões**.

Convenções: `i` = posição na árvore (0–7). Ouro de compra = `(i + 1) × 28`. Pontos = 1 por nível. MP/CD de `tk.ts` ou `SKILL_BALANCE.tierMp/tierCd[i]`. Spec da árvore física reduz CD até 25 % em 40 pontos (`specFactor`). Todos os números são **provisórios**.

### S1 — Force Wave · `tk_fis_force_wave` · posição 1/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano · alvo único · físico · poder de arma (`kind damage`, `shape single`, `element physical`) |
| Números | Mult **1,25** · alcance **6,5** · MP **6** · CD **2,4 s** (`tk.ts`, `tierMp[0]`, `tierCd[0]`) |
| Pré-requisito | Nenhum (primeira da árvore) |
| Custo compra | 1 ponto + **28** ouro; cada nível seguinte igual (F6) |
| Barra | **Sim** (tecla da posição escolhida; auto opcional) |
| Auto | Só quando há inimigo vivo até 6,5 m (`autoUseful` → `selectSkillTargets`) |
| VFX | **`golpe`** (arco de lâmina na origem, ≤ 0,15 s, já ligado) **+ impacto no alvo via `quebra`** (estilhaços e faíscas no ponto do acerto) — decisão D2 |
| Descrição (pt-BR, para `desc`) | “Onda de força que atinge um inimigo à frente a média distância. Dano físico da arma. Nível aumenta o dano.” |

Delta: (1) em `EffectManager.dispatchSkillVfx`, no `case "golpe"`, quando a distância origem→alvo for maior que `DEFAULT_GOLPE_VFX_CONFIG.arcRadius`, chamar também o impacto do controller `quebra` no alvo; (2) `desc`. Nada de controller novo.

Restrição de código: uma condição e uma chamada no `EffectManager`; um campo em `tk.ts`.

Teste: inimigo a 6 m → `session.effects.getSkillVfxState().active ≥ 2` no frame do cast; número de dano no alvo; QA `check-tk-golpe.mjs` e `check-tk-quebra.mjs` continuam verdes.

Riscos: com dois controllers por cast, o teto de concorrência de cada um (`maxConcurrentCasts` 4/…) é independente — sem impacto. Se o Felipe reprovar o impacto duplo, cai só a chamada extra (S1 fica no arco).

### S2 — Atk Descuidado · `tk_fis_atk_descuidado` · posição 2/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · buff próprio (`kind buff`, `shape self`) |
| Efeito | Ataque **+28 %** e defesa **−18 %** por **12 s** (`buff tk_reckless_atk`, `extraBuff tk_reckless_def`) |
| Números | MP **8** · CD **3,2 s** (`tierMp[1]`, `tierCd[1]`) |
| Pré-requisito | Force Wave ≥ 1 |
| Custo compra | 1 ponto + **56** ouro |
| Barra | **Sim** |
| Auto | Só quando o buff `tk_reckless_atk` não está ativo (`autoUseful` para buff) |
| VFX | **`furia` com paleta “descuidado”**: segunda instância de `FuriaVfxController` criada com `palette` própria (tons bronze/cinza, brasa aberta) — sem pasta nova |
| Descrição | “Abre a guarda: ataque +28 % e defesa −18 % por 12 s. Não acumula com ele mesmo.” |

Delta: (1) `FuriaVfxConfig.palette` opcional (cores quente/média/profunda) consumido por `createFuriaTextures`, pelo anel em shader e pela `PointLight`; padrão = vermelho atual (Fury não muda); (2) `EffectManager`: instância `tkDescuidado` com a paleta e `case "descuidado"` → `castFuria(center)`; entra em `update/clear/dispose/getSkillVfxState` como as demais; (3) mapa e união (F7); (4) `desc`.

Restrição de código: pasta `furia` (config + texturas + 2 usos de cor), `EffectManager` (1 campo, 1 case, 4 linhas de ciclo), `SkillVfxTypes`, `SkillVfxCatalog`, `tk.ts`. Se a paleta atrasar, a skill funciona com o genérico `buff` do `SkillVfxDirector` — o fallback já existe.

Teste: após cast, `buffs.active` contém os dois ids com 12 s; `frameMods.attackMul ≈ 1,28` e `defenseMul ≈ 0,82`; dano recebido sobe; `check-tk-furia.mjs` continua verde (paleta padrão intacta); cast repetido não estende além do maior restante (regra de `BuffService.add`).

Riscos: cor final é validação do Felipe (D6). Buff de 12 s sem indicador na tela (fora do escopo, 2.3).

### S3 — Mestre Dual · `tk_fis_mestre_dual` · posição 3/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | **Passiva** (`kind passive`, `passive dual`) |
| Efeito | Ataque **+22 %** enquanto o conjunto de arma for `dual-axe` ou `dual-sword` (`weaponAny`; `applyPassive` verifica `weaponOk`) |
| Números | MP 0 · CD 0 |
| Pré-requisito | Atk Descuidado ≥ 1 |
| Custo compra | 1 ponto + **84** ouro |
| Barra | **Não** (filtro de passiva no `SkillLoadout`; `assign` recusa) |
| Auto | Não se aplica |
| VFX | Genérico de passiva do `SkillVfxDirector` (evento `equip`, pulso único ao ficar ativa via `syncPassives`) — sem VFX dedicado |
| Descrição | “Passiva. Com duas armas (machados ou espadas duplos) o ataque sobe 22 %. Não entra na barra.” |

Delta: só `desc` e o rótulo de passiva na UI (F5). Nível hoje **não** escala a passiva — registrar na ficha e no tooltip (“Nível: sem efeito por enquanto”).

Restrição de código: `tk.ts` (`desc`). Nada mais.

Teste: com `axe-shield` (padrão do TK) `frameMods.attackMul = 1,0`; com dois `machado_leve` (um equipado + um na bolsa → `refreshWeaponSetFromGear` → `dual-axe`) `attackMul = 1,22`; passiva ausente em `barSnapshot()`; tentativa de arrastar para a barra é recusada com feedback visual do wire.

Riscos: conjunto de arma ainda depende de itens do catálogo; se o teste não conseguir `dual-axe`, usar `__UAIDZIN__` para forçar o set (só QA).

### S4 — Death Stab · `tk_fis_death_stab` · posição 4/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano em **linha** · físico (`shape line`, `maxTargets 3`, `pierce 0,25`) |
| Números | Mult **1,55** · alcance **5,5** · até **3** alvos à frente (cone de `inFront`, dot > 0,35) · ignora **25 %** da defesa · MP **10** · CD **4,6 s** |
| Pré-requisito | Mestre Dual ≥ 1 |
| Custo compra | 1 ponto + **112** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo na linha frontal |
| VFX | **`investida`** (trilha reta de elos/vento da origem até o **alvo mais distante atingido**, poeira no fim) — órfão hoje, passa a ser desta skill |
| Descrição | “Estocada que atravessa até 3 inimigos à frente, ignorando parte da defesa. Nível aumenta o dano.” |

Delta: (1) mapa `tk_fis_death_stab: "investida"` (F7) — o `case "investida"` já existe; (2) alvo do VFX: hoje `request.target` é o alvo **mais próximo** (`resolved.aim`); no `case "investida"`, se `input.hits` tiver mais de um alvo, usar o mais distante da origem como fim da trilha (função local pequena no `EffectManager`, reaproveitável por qualquer skill de linha); (3) `desc`.

Restrição de código: `SkillVfxCatalog` (1 linha), `EffectManager` (escolha do alvo no case), `tk.ts`.

Teste: três inimigos alinhados → três números de dano; trilha termina no terceiro; um inimigo atrás do jogador **não** é atingido; `check-tk-investida.mjs` verde.

Riscos: nenhum de balance; a trilha reta pode “atravessar” obstáculos visuais — aceitável no greybox atual.

### S5 — Fury · `tk_fis_fury` · posição 5/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · buff próprio |
| Efeito | Velocidade de ataque **+32 %** por **10 s** (`buff tk_fury`, `stat attackSpeed`) |
| Números | MP **10** · CD **5,2 s** |
| Pré-requisito | Death Stab ≥ 1 |
| Custo compra | 1 ponto + **140** ouro |
| Barra | **Sim** |
| Auto | Só quando `tk_fury` não está ativo |
| VFX | **`furia`** (já ligado): ativação 0,1 s, aura 2 s, fade 0,5 s no ponto do cast |
| Descrição | “Fúria de combate: velocidade de ataque +32 % por 10 s.” |

Delta: só `desc`. Verificar que a instância padrão da Fúria **não** herda a paleta de S2.

Restrição de código: `tk.ts`.

Teste: intervalo do ataque básico cai (`speedMul` em `CityGameSession` ≈ 1,32); `check-tk-furia.mjs` verde; aura aparece no jogador parado.

Riscos: aura de 2 s para buff de 10 s (D7). Se o Felipe quiser a aura durante o buff inteiro, é feature nova (seguir o jogador) — fora deste plano.

### S6 — Increase Critical · `tk_fis_increase_critical` · posição 6/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | **Passiva** (`passive crit`) |
| Efeito | Chance de crítico **+12 %** em ataque básico e skills (`critChance`; crítico = ×1,5 `critMultiplier`) |
| Números | MP 0 · CD 0 |
| Pré-requisito | Fury ≥ 1 |
| Custo compra | 1 ponto + **168** ouro |
| Barra | **Não** |
| VFX | Genérico de passiva (evento `proc` no catálogo, mas o `SkillVfxDirector` só pulsa uma vez ao sincronizar; não existe VFX por crítico e não será criado aqui) |
| Descrição | “Passiva. Chance de crítico +12 % em golpes e skills. Não entra na barra.” |

Delta: `desc`. Nível não escala (registrar).

Restrição de código: `tk.ts`.

Teste: `frameMods.critChance = 0,12` com a passiva; amostra de 200 ataques via `__UAIDZIN__` com proporção de críticos compatível (tolerância larga); ausente em `barSnapshot()`.

Riscos: nenhum.

### S7 — Earthquake · `tk_fis_earthquake` · posição 7/8

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano em **área** · terra · poder de arma (`shape aoe`, `element earth`, `power weapon`) |
| Números | Mult **1,7** · raio **3,6** ao redor do jogador · MP **12** · CD **7 s** |
| Pré-requisito | Increase Critical ≥ 1 |
| Custo compra | 1 ponto + **196** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo dentro do raio |
| VFX | **`avalanche`** (já ligado): onda frontal em cone com detritos, apontada para o alvo mais próximo |
| Descrição | “Terremoto: dano de terra em todos os inimigos num raio de 3,6 m. Nível aumenta o dano.” |

Delta: `desc`. Registrar a **divergência** mecânica × visual: a mecânica é círculo completo (acerta atrás), o VFX é cone à frente. Decisão D3 do Felipe: (a) manter (custo zero), (b) trocar o VFX por um impacto radial existente (`quebra`/`machado` no centro) — ainda sem código novo, (c) forma cone — fora do escopo.

Restrição de código: `tk.ts`. Se D3 = (b): uma troca de valor no mapa.

Teste: inimigos na frente e atrás dentro de 3,6 m recebem dano; sem inimigo, cast não consome MP (`resolveSkill` devolve nulo → `regenMp` devolve o custo); `check-tk-avalanche.mjs` verde.

Riscos: leitura visual enganosa até D3.

### S8 — Fire Burst · `tk_fis_fire_burst` · posição 8/8 (8ª exclusiva)

| Campo | Valor (fonte) |
|---|---|
| Tipo | Ativa · dano em **área** · fogo · poder de arma |
| Números | Mult **2,6** · raio **4,4** · MP **18** · CD **12 s** |
| Pré-requisito | Earthquake ≥ 1 **e** nenhuma 8ª de outra árvore comprada (`eighthTree`); ao comprar, trava `eighthTree = "fisica"` |
| Custo compra | 1 ponto + **224** ouro |
| Barra | **Sim** |
| Auto | Só com inimigo dentro do raio |
| VFX | **`chain` → `FireBurstVfxController`** (FireBurstUAID, validado pelo Felipe em 24/09/2026): cinco correntes em 0,20 s, explosão no contato |
| Descrição | “Correntes de fogo explodem num raio de 4,4 m. Só uma 8ª skill por personagem: comprar esta bloqueia as 8ª de Defensivo e Mágico.” |

Delta: `desc`. Nenhuma alteração no VFX. Manter o caso especial de morte mais curta (`fireBurstDeathDuration` 0,5 s em `CityGameSession`) como está.

Restrição de código: `tk.ts`.

Teste: comprar Fire Burst → `eighthTree = "fisica"`; `canLearn("controle", 7)` e `canLearn("magia", 7)` falsos; Mestre mostra as duas outras 8ª como `locked`; `check-fire-chain.mjs` verde; reset de skills (`resetSkills`) libera a escolha.

Riscos: nenhum; é a skill mais madura da linhagem.

---

## 6. Tabelas de referência da linhagem

### 6.1 Resumo

| Pos. | Skill | Id | Tipo | Barra | Compra (pontos + ouro) | MP / CD | VFX | Delta |
|---:|---|---|---|---|---|---|---|---|
| 1 | Force Wave | `tk_fis_force_wave` | Ativa · dano único | Sim | 1 + 28 | 6 / 2,4 s | `golpe` + impacto `quebra` | impacto no alvo, desc |
| 2 | Atk Descuidado | `tk_fis_atk_descuidado` | Ativa · buff | Sim | 1 + 56 | 8 / 3,2 s | `furia` paleta descuidado | paleta, instância, mapa, desc |
| 3 | Mestre Dual | `tk_fis_mestre_dual` | Passiva | **Não** | 1 + 84 | — | genérico passiva | desc |
| 4 | Death Stab | `tk_fis_death_stab` | Ativa · dano linha | Sim | 1 + 112 | 10 / 4,6 s | `investida` | mapa, alvo distante, desc |
| 5 | Fury | `tk_fis_fury` | Ativa · buff | Sim | 1 + 140 | 10 / 5,2 s | `furia` | desc |
| 6 | Increase Critical | `tk_fis_increase_critical` | Passiva | **Não** | 1 + 168 | — | genérico passiva | desc |
| 7 | Earthquake | `tk_fis_earthquake` | Ativa · dano área | Sim | 1 + 196 | 12 / 7 s | `avalanche` | desc (+ D3) |
| 8 | Fire Burst | `tk_fis_fire_burst` | Ativa · dano área · 8ª | Sim | 1 + 224 | 18 / 12 s | `chain` FireBurstUAID | desc |

### 6.2 Custo total da linhagem (nível 1 em tudo)

**8 pontos** de skill e **1 008** de ouro. Com 1 ponto por nível (código), o jogador só completa a linhagem no nível **9**; com 2 por nível (grill), no nível **5**. Isso é o item “pontos por nível” de 2.3 — decisão fora deste plano, mas o Felipe precisa saber ao testar.

### 6.3 VFX físicos do TK após o plano

| Controller | Skill dona | Situação |
|---|---|---|
| `golpe` | Force Wave (arco) | ligado |
| `quebra` | Force Wave (impacto no alvo) | passa a ser usado |
| `furia` | Fury · Atk Descuidado (paleta) | ligado · nova instância |
| `investida` | Death Stab | passa a ser usado |
| `avalanche` | Earthquake | ligado |
| `fireBurst` (`chain`) | Fire Burst | ligado e validado |
| `corte` | — | **reserva** aqui; a linhagem 3 usa uma instância com paleta veneno (Poison Stab) |
| `machado` | — | **reserva** (alternativa de S7 em D3) |

Os controllers defensivos e sagrados (`provocacao`…`bastiao`, `bencao`…`tribunal`) são distribuídos nos planos das linhagens 2 e 3; `golpe` ganha uma segunda instância com paleta fogo na linhagem 3 (Fire Slash) sem alterar o Force Wave.

---

## 7. Ordem de execução e tasks

| Ordem | Task (painel) | Depende de | Fecha lacuna | Teste mínimo para `done` |
|---:|---|---|---|---|
| 1 | F1 Barra posicional 10 (domínio) | — | G1, G8 | typecheck · test:save · console |
| 2 | F2 Teclas 1–9,0 | F1 | G1 | typecheck · smoke · manual |
| 3 | F4 Save com `index` | F1 | G1 | test:save · save antigo carrega |
| 4 | F3 Barra e K como projeção | F1, F2, F4 | G2, G3 | Playwright barra/K · Felipe |
| 5 | F5 `desc` na ficha (só os 8 textos; estrutura pronta, rev.) | — | G6 | check-tk-dispatch fisica · hover nas 8 · Felipe (acentos) |
| 6 | F6 Comprar e melhorar | F5 | G7 | comprar 1→3 · teto 10 |
| 7 | F7 Mapa VFX + lista de ciclo de vida + `check-tk-fisica.mjs` | F3 | G4 | check-tk-dispatch fisica · script verde · vfx:runtime:qa |
| 8 | S1 Force Wave | F7 | G5 | script + Felipe |
| 9 | S2 Atk Descuidado | F7 | G4 | script + check-tk-furia + Felipe |
| 10 | S3 Mestre Dual | F5 | — | script |
| 11 | S4 Death Stab | F7 | G4 | script + check-tk-investida + Felipe |
| 12 | S5 Fury | F5 | — | script + Felipe |
| 13 | S6 Increase Critical | F5 | — | script |
| 14 | S7 Earthquake | F5 | — | script + Felipe (D3) |
| 15 | S8 Fire Burst | F5 | — | script + check-fire-chain |
| 16 | Docs (seção 9) | tudo | G9 | leitura cruzada |

Regra: uma skill por vez; a próxima só abre quando o Felipe validar a anterior. S3, S6 e S8 não têm validação visual nova e podem fechar em sequência.

---

## 8. Validação global (antes de dar a linhagem por pronta)

1. `npm run typecheck` e `npm run build` verdes; zero comentário no diff; sem `console.log`; sem arquivo temporário.
2. Portão Node (rev., A6): `node scripts/check-tk-dispatch.mjs fisica` verde. Portão navegador: `node scripts/check-tk-fisica.mjs` verde (fluxo completo: comprar 8, barra, teclas, casts, VFX, buffs, 8ª exclusiva, reload).
3. `node scripts/check-tk-controllers.mjs golpe investida quebra furia avalanche` e `node scripts/check-fire-chain.mjs` verdes.
4. `npm run vfx:runtime:qa` (96 perfis), `npm run smoke` e `npm run bot` (skills continuam sendo castadas, rev. A1) verdes.
5. `npm run test:save` verde; save antigo do lab abre com a barra em sequência.
6. Felipe: barra única de 10 obedecendo ao save; K com as árvores do TK; cada ativa com seu VFX; passivas fora da barra com texto claro; custos exibidos iguais aos cobrados; textos pt-BR.

---

## 9. Documentação a atualizar ao fechar

| Arquivo | Mudança |
|---|---|
| `nongame/docs/inventarios/skills.md` | Linhas do TK física: ids/nomes do código, efeito real, custo, status; gap 1 (barra 10 × 4) marcado como fechado; nota de alias dos nomes antigos |
| `nongame/docs/inventarios/classes.md` | Tabela de skills do TK física com os nomes do código |
| `nongame/docs/inventarios/vfx.md` | Tabela 6.3 (controller → skill dona; `corte`/`machado` em reserva) |
| `nongame/docs/inventarios/save-load.md` | `skillLoadout.slots[].index` |
| `nongame/docs/project/VFX-KIT-FIREBURST.md` | Tabela “7 skills restantes” com o alias id do código ao lado do nome antigo |
| `AGENTS.md` | Uma linha: o HTML do wire servido em `/wire/` vem de `visual/telas/` (`vite.config.ts`), portanto é fonte de runtime da UI do hub enquanto o `WireUi` buscar de lá |
| `nongame/docs/project/DECISOES-DESIGN.md` | Registrar as decisões D1–D9 conforme o Felipe responder |

---

## 10. Decisões em aberto para o Felipe

| ID | Pergunta | Padrão assumido no plano | Custo de mudar |
|---|---|---|---|
| D1 | `auto` nasce desligado ao equipar? | **Sim** (grill: manual até ligar) | 1 literal |
| D2 | Force Wave ganha impacto no alvo (via `quebra`)? | **Sim** | remover 1 chamada |
| D3 | Earthquake: manter VFX em cone (`avalanche`) com mecânica em círculo? | **Manter** (provisório) | trocar 1 valor no mapa para `quebra`/`machado` |
| D4 | Nomes em inglês na UI (Force Wave, Death Stab…) contra a regra pt-BR? | **Manter** (decisão 2); descrição em pt-BR compensa | renomear `name` em `tk.ts`, ids intactos |
| D5 | Pontos por nível: 1 (código) ou 2 (grill)? | **Fora do escopo**; documentado em 6.2 | 1 constante (`SKILL_BALANCE.skillPointsPerLevel`) aplicada **dentro** de `SkillTreeService.grantSkillPoints`; os três chamadores em `CityGameSession` (L898, L1640, L1676) não mudam (rev., A5) |
| D6 | Paleta do Atk Descuidado | bronze/cinza, brasa aberta | valores da paleta |
| D7 | Aura de buff dura 2 s ou o buff inteiro? | **2 s** | feature nova (seguir jogador) |
| D8 | Melhorar custa igual à compra? | **Sim** (fórmula única) | reintroduzir `upCost` |
| D9 | Bloco de livros oculto no K? | **Sim** | mostrar bloco quando livros tiverem regra |
| D10 | Caminho de debug/bot liga `auto` ao equipar, mesmo com D1 desligado para o jogador? (rev.) | **Sim** | 1 literal no caminho de debug |
| D11 | Painel de fallback `GamePanels` continua existindo depois de F3? (rev.) | **Sim**, compilando e cobrando pelo `tryLearnSkill` | remover o painel |

---

## 11. Glossário de caminhos

| Termo | Caminho |
|---|---|
| Ficha das skills TK | `game/src/data/classes/skills/tk.ts` |
| Tipos de skill | `game/src/data/classes/skill-types.ts` |
| Balance de skill | `game/src/data/balance/skills.ts` |
| Custo de compra | `game/src/data/balance/economy.ts` (`SKILL_TRAINING`) |
| Aprendizado | `game/src/domain/skills/SkillTreeService.ts` |
| Barra | `game/src/domain/combat/SkillLoadout.ts` |
| Cast | `game/src/domain/combat/SkillController.ts` · `SkillCasting.ts` · `CombatMods.ts` |
| Buffs | `game/src/domain/character/BuffService.ts` |
| Teclas | `game/src/gameplay/PlayerController.ts` |
| Sessão | `game/src/app/CityGameSession.ts` · `game/src/app/GameApp.ts` |
| Catálogo VFX e mapa | `game/src/presentation/effects/skill/SkillVfxCatalog.ts` · `SkillVfxTypes.ts` |
| Despacho VFX | `game/src/presentation/effects/EffectManager.ts` |
| Controllers físicos | `game/src/presentation/effects/tkSkills/{golpe,investida,corte,machado,quebra,furia,avalanche}/` · `fireBurst/` |
| Bridge UI | `game/src/ui/WireGameBridge.ts` · `WireUi.ts` |
| Wire (servido em `/wire/`) | `visual/telas/03-wire-paineis-cidade.html` |
| Save | `game/src/persistence/SaveTypes.ts` · `migrations.ts` |
| QA | `game/scripts/check-tk-dispatch.mjs fisica` (Node, existe) · `check-tk-*.mjs` · `check-skill-vfx.mjs` · `check-fire-chain.mjs` · `check-tk-fisica.mjs` (novo, navegador) |

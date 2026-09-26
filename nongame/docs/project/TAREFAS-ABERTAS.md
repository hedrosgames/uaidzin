# Tarefas em aberto — Finalização de sistemas

Espelho operacional do que falta **implementar**. Felipe acrescenta item a item; eu marco e movo para Feito quando testar.

Checklist de aceite (o “está pronto quando…”) fica em `CHECKLIST-CENAS.md`.  
Plano/ciclo: `PLAN-finalizacao-sistemas.md`.

**Regra:** item só sai daqui com teste e validação (visual, quando for o caso).

---

## Aberto

### Cena 1 — Login

_(vazio — L3/L4 em validação)_

### Cena 2 — Seleção de personagem

_(vazio — S2 em validação; S1/S3–S8 em Aguardando)_

### Cena 3 — Cidade

_(vazio — C1/C7/C17 cobertos por C1i/C7i/C17a/b em Aguardando)_

### Cena 4 — Dungeon

_(D13b bloqueado — sem assets de bioma; D13a em validação)_

### Cena 5 — Editor e métricas

_(E1 / E3 / E4b em validação; E2a/E2b/E3b bloqueados — ver Bloqueado)_

### Inventários de conteúdo (listar / auditar)

_(I4 em validação; demais I* já em Aguardando)_

### Transversal

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| X2 | Próxima cena / go de implementação | Felipe | ordem: L* / S* / C* / D* / E* ou o que ele mandar |

---

## Em implementação

_(vazio — X10/X11 em Aguardando validação do Felipe)_

---

## Bloqueado

| ID | Tarefa | Motivo |
|---|---|---|
| C8 | Árvores fora da cidade | Sem GLB de árvore no disco; placeholder de cones removido (borda só terreno, grill sem mundo externo) |
| C23 | NPCs → personagens reais | Sem GLB de NPC no disco; hub segue com cilindros |
| C24 | Cápsulas → monstros | Sem GLB de monstro no disco; arena segue com cápsula |
| D13b | D2–D8: luz + assets + LD | Sem pasta/`models/dungeons/` nem assets de bioma; depende arte pós-D13a — não inventar 7 dungeons |
| E2a | Editor fatia 1 (itens + lojas) | **Pulado / Bloqueado** — aguarda aprovação E1 (`docs/inventarios/editor-plano.md`); sem código de editor |
| E2b | Editor fatia 2 (dungeons/monstros/classes) | **Pulado / Bloqueado** — aguarda aprovação E1 + E2a; sem código de editor |
| E3b | Dashboard com ≥1 métrica real | **Bloqueado** — aguarda E3 aprovado + métrica real (`docs/inventarios/metricas-plano.md`) |

---

## Aguardando validação do Felipe

| ID | Tarefa | Nota |
|---|---|---|
| X10 | Fire Burst: cinco correntes 3D curvas e giratórias, em 0,20 s | **FireBurstUAID** validado pelo Felipe em 24/09/2026. Lab `/vfx/fire-burst.html`: cinco caminhos aleatórios, elos escuros, pontas metálicas e fogo Quarks em atlas animado; explosão compartilhada. 174 verificações, 11 direções, passos de 30/60/144 fps, integração TK, limpeza e memória estável; typecheck/build OK. Evidências em `game/vfx/evidence/fire-chain-*` |
| X11 | Fire Burst: base de corrente com elos 3D e explosão no inimigo | Validado com X10; malhas de elos e pontas em várias direções/alturas, sem billboard. Não altera dano, mana ou cooldown |
| X12 | VFX no padrão FireBurstUAID para as outras 7 skills físicas do TK | Controllers dedicados, sete labs standalone e sete scripts de QA criados. Vite e `EffectManager` integrados; typecheck global passa. QAs CDP aguardam execução central e validação visual do Felipe. Direção "Muralha de Terra" para a Avalanche aprovada (pedras/terra ótimas; refino do desenho vetorial pendente); backup v1 em `game/scripts/_tk-work/avalanche-v1` |
| X13 | VFX no padrão FireBurstUAID para as 8 skills de magia do TK | Onda 1: 8 agentes paralelos (Benção, Selo, Aura, Escudo Sagrado, Julgamento, Luz, Purificar, Tribunal), escopo isolado (pasta própria + lab + QA script). Integração central e QA CDP ficam com a sessão principal. Base: melhores visuais de hoje (Fúria aura, Quebra shards, Machado impacto, Corte blades, Avalanche onda, FireBurst chains) |
| X14 | VFX no padrão FireBurstUAID para as 8 skills de controle do TK | Onda 2: dispara quando a onda 1 (X13) terminar. Mesmo padrão e fluxo da X13 (Provocação, Postura, Rugido, Muralha, Âncora, Desafio, Guarda, Bastião) |
| X15 | Lab de modelos (dev only, fora da build) | `game/model-lab.html`: aba **Personagens** (4 classes em card 3D animado, troca de arma entre os 9 conjuntos, troca de animação em conjunto, card abre em tela cheia para ajustar o encaixe da arma por slider/arraste e gravar em `game/src/data/weapons/weapon-mounts.json` via rota dev) e aba **Monstros** (5 monstros do `monsters.json`, 6 clipes de mutant listados, sem GLB de malha no disco). `WeaponRig` e o jogo **não** consomem o arquivo ainda — ajuste é só dado gravado. Ajuste gravado por classe + conjunto + lado (as duas peças do conjunto têm ajuste próprio) e reaplicado ao recarregar; troca de arma vale para os 4 cards. QA: `npm run check:model-lab` (43 checks, preserva o arquivo real durante o teste) + typecheck; build gera o mesmo `dist` de antes |
| X9 | Prévia da arte 2D em cenário 3D | `/vfx/fire-burst-3d.html`: billboard técnico testado, **reprovado como solução do VFX 3D** pelo Felipe; preservado somente como estudo. Substituição real em X11 |
| X7 | Lab autoral: 96 skills × 3 propostas | `/vfx/vfx_lab.html`: 288 conceitos/receitas autorais, galeria com prévia, comparação sincronizada, sequência por árvore e escolhas locais/exportação JSON. Render/dispose das 288, persistência e fluxo de revisão testados; evidências em `game/vfx/evidence/`. Direção cartoon restrita aos efeitos do lab; criaturas são silhuetas de estudo. Sem integração destas propostas ao runtime; aprovação artística pendente |
| S2 | Painel direito com **status da classe** no create (padrão) e do **personagem salvo** depois | Bug status/create resolvido via **S1** (`normalizeSlots`) + **S5** (create 5/5/5/5 gold 0); aguarda Felipe |
| C1 | Definir + implementar **mestre de quests** | Coberto por **C1i** (+ **C1d**); UI + `q_mortal_kill_01`; aguarda Felipe |
| C7 | **Compositor**: criar fórmulas + implementar | Coberto por **C7i** (+ **C7d**); `compose_plus7_lac`; aguarda Felipe |
| C17 | Sistema de entrada **consumindo itens** | Coberto por **C17a** (valida) + **C17b** (debita); aguarda Felipe |
| E4b | Fluxo jogador **1→400** completo | `docs/inventarios/fluxo-mortal-1-400.md` — marcos/unlocks/save por faixa; TBDs explícitos; aguarda Felipe |
| E1 | Plano do editor | `docs/inventarios/editor-plano.md` — domínios/schema/export→runtime; E2 bloqueado |
| E3 | Plano planilha + dashboard | `docs/inventarios/metricas-plano.md` — métricas + fontes; E3b bloqueado |
| I4 | Listar **todos os inimigos** | `docs/inventarios/inimigos.md` — 3 arquétipos + boss flag; elite/GLB falta |
| C22 | Escudo na mão sem clipar | Offset/socket: `SHIELD_OFF_ARM` 0.16 + bias mão + lift; escudo menor 0.52; typecheck OK |
| C12 | Fonte central: shader ajustado | `FountainWater` v19 — fluxo/foam/fresnel mais limpos; typecheck OK |
| C13 | Chão: textura centro + geral | `CityGround` v2 — tom centro vs periferia + `makeCityPlazaMaterial` |
| C26 | Visual da área da fonte | Meio-fio ouro, plinto + anel sob a fonte, praça dedicada; amarra C12/C13 |
| D13a | D1: luz + assets + LD | Greybox campo: chão/path quente, cercas, anéis, rack/bulletin existentes; sem pasta dungeons; typecheck OK |
| X4 | Animações por arma (idle/run/attack) | Matriz shared: melee→`attack`, staff/arco→`cast`; idle/run sem variação (gap clips); typecheck OK |
| X5 | Fire Burst modular com `three.quarks` | Correntes Bézier + rastro + faíscas + impacto; lab `/vfx/fire-burst.html`; TK integrado; Playwright visual/cleanup OK; aguarda Felipe |
| X6 | VFX Audit, Rework e Quality Pass | 96 skills reais, 288 versões no Studio, 67 efeitos do pack local, catálogo runtime, fallback de 3 efeitos vazios/3 shapes e QA em 7 viewports; aguarda Felipe |
| C18 | Tela dungeon: **cards com info** + wire | Cards: nível, tempo, inimigos, entrada + ícone selo; wire `03-wire-paineis-cidade.html`; Playwright `check-c18-d5.mjs` |
| C10 | **Ferreiro**: lista de itens feita | Catálogo I9/I7 em `SHOP_CATALOG.blacksmith` (materiais + peças); wire pinta lista real; Playwright `check-c10-c14-c11.mjs` |
| C14 | **Mercador**: lista montada | Catálogo I9/I6: selos `entry_d4`–`entry_d8` + `mat_ori`/`mat_lac`; sem gear; preços provisórios; Playwright `check-c10-c14-c11.mjs` |
| C11 | **Todo item** do jogo com imagem/ícone | `ITEM_CATALOG` + SVG placeholder em `visual/telas/assets/items/`; sem ícone não entra na lista; Playwright `check-c10-c14-c11.mjs` |
| D5 | Shader x-ray **não** em monstros | Oclusão só obstáculo fixo (`occlusionIgnore` em enemies/chão); ghost só no jogador; Playwright `check-c18-d5.mjs` |
| D9 | Não poder **andar** atacando / tomando dano | `moveLock` na janela de attack/cast/hit (clip ×0.92, cap balance); WASD/click-to-move ignorados; typecheck OK |
| D4 | **Dungeon 1 mais fácil** | `d1Ease` hp×0.45 atk×0.4 def×0.5 + arenas leves; provisório grill; typecheck OK |
| D8 | Acentos/símbolos pt-BR em textos dungeon/UI | Mojibake em `GameApp.ts` corrigido (Opções, ilegível, …, —, ·); typecheck OK |
| D12 | Save dungeon amarra C2/C3 | `persistSave(true)` a cada `grantKillXp`; doc save-load alinhada; typecheck OK |
| C17b | Entrada **consome** item | `consumeMaterial` em `tryEnterDungeon` + save; bloqueia se faltar; typecheck OK |
| D6 | UI de drop: **canto inferior esquerdo**, lista tipo **log debugável** | `#drop-log` + `__UAIDZIN__.getDropLog()`; sem tela de resultado; typecheck OK |
| D7 | Level up: **mini fanfarra** + **HP e MP cheios** | `healFull` + pulse/anel/câmera + flash barras; save no up; typecheck OK |
| D2 | Morte: anim **na dungeon** → espera → teleporte cidade | Mixer atualiza no DEAD; timer = duração do clip; `clearDeath` antes da cidade; Playwright `check-d2-d3-x3b.mjs` |
| D3 | Animação de morte **repetível** | `playDeath` reseta action; `clearDeath` no `enterWorld`; 2 mortes = 2 poses; Playwright OK |
| X3b | Fade preto entrada/saída dungeon | `withWorldFade` / `leaveDungeonWithFade` + `#uaidzin-scene-fade`; Playwright OK |
| X3 | **Fade preto global** entre cenas | X3a login↔seleção + X3b cidade↔dungeon; mesmo overlay `#uaidzin-scene-fade` |
| D1 | Dungeon **não** abre **totalmente preta** | Causa: dungeon sem PointLight + albedo ~preto; fix: Ambient/Point/braziers + look fog/exposure em `enterWorld`; typecheck OK |
| C16 | Scroll do menu de dungeon no **padrão** do jogo | `.portal-scroll` scrollbar thin + iron/gold (webkit); typecheck OK |
| C19 | Toggle “não solicitar mais confirmação” + Settings restaura | Wire checkbox + `optSkipDungeonConfirm` em `uaidzin_settings`; Settings `#opt-skip-dungeon-confirm` |
| C17a | Entrada dungeon **valida** item (UI) | Gate `entry` em `dungeonEntryGate`; D4–D8 pedem `entry_d*`; C17b debita; toast “Entrada insuficiente” |
| C6 | Sábio **não** abre tela de equipamento junto | `openSage` só emite `sage`; `sage` em SOLO_PANELS (WireUi + wire); Playwright `check-c6-c20.mjs` |
| C20 | Revisar **todo o texto do Sábio** | SAGE_DOCS pt-BR revisado (sem “no futuro”/mock); papel tutorial+códice; Playwright `check-c6-c20.mjs` |
| C25 | **Colisão ao redor da fonte** | Caixa AABB + círculo circunscrito do footprint `fountain`; pad 0.08; Playwright `check-c25-c15.mjs` |
| C15 | Click à distância no NPC abre UI ao chegar perto | Fila `pendingInteract` + approach no raio; WASD/chão cancela; Playwright OK |
| C21 | **Colisão / click-to-move** — não anda no lugar | `PlayerRuntime`: desvio sticky; para se passo fraco; `isMoving` = deslocamento real; sim caixa/círculo + typecheck |
| S4 | Modal criar: caixa com PNG das classes → **3D idle** por classe | `renderClassPick` monta `mountCharPreview` nas 4 `.class-opt .art`; Playwright `check-s4-s7.mjs` |
| S7 | Idle do **TK** = mesma animação do **BM** na seleção | `IDLE_FROM.TK=BM` em `char-preview.mjs` (boot+visual); modelo TK + clip BM; 195 tracks overlap |
| S6 | **Fade in/out** tela preta ao trocar de cenas | Overlay `#uaidzin-scene-fade` no `BootFlow` + `#sceneFade` nos HTMLs; login↔seleção nos dois sentidos; `.stage.leaving` permanece só no painel |
| X3a | **Fade preto** login ↔ seleção (fatia de X3) | Mesmo overlay que S6; `createSceneFadeOverlay` / `releaseBootSceneFade` prontos p/ X3b |
| C3 | Atributos e infos de tela **espelham o save** | Wire `data-bind` + `CharacterUiBinder`/`setCharacter`; Playwright `check-c3-c4.mjs` |
| C4 | Classe correta na UI (TK ≠ **Huntress**) | Label Thegn Knight no C/K; mock Huntress removido do hub |
| S8 | Botão **Deslogar** no Settings da seleção | `#btnLogout` retângulo em boot/visual `02-selecao`; `logout()` limpa sessão+active; volta ao login; Playwright OK |
| C9 | Início **sem item equipado e sem dinheiro** | create/seed/applyBoot `gold:0`, equip `{}`, attrs 5/5/5/5; Playwright create→cidade |
| C2 | Char novo com **skills zeradas**; save acompanha evolução | trees/spec/loadout no SlotSummary+seed; learn persiste; reload mantém; Playwright OK |
| C5 | Wipe + telas alinhadas ao save | wipe `deleteDatabase`; SaveStore tolera IDB sem store; visual sem mock Bjorn; create→cidade = save |
| S3 | Nome **mín. 3 / máx. 12** letras (sem número/símbolo) habilita Criar | `maxlength=12` + `isValidCharName` em boot/visual `02-selecao`; Playwright: 2 bloqueia, 3 ok, 13 rejeita |
| S1 | **Bug status vazio** após excluir 2º e clicar no 1º | `normalizeSlots` do save-store preserva `trees`/`spec`/attrs; delete re-normaliza; Playwright delete 2º→click 1º status ok |
| S5 | Criar/excluir **salva na hora**; reload mantém | create `gold:0` attrs `5/5/5/5` skills 0; persist/deleteSlot; Playwright create 2 → delete → reload |
| L4 | Google **cria conta nova** (≠ admin); id `google:…`; repetir reutiliza | `loginGoogleSimulated` em save-store; `#btnGoogle` nos dois `01-login.html`; Playwright 1.4 |
| L3 | Login duplicado **recusado**; conta antiga intacta; senha antiga vale | `registerAccount` + UX erro; Playwright 1.10 |
| L2 | Registro manual: login + senha, **sem e-mail**; save zerado | `registerAccount` em save-store (boot + visual); submit Criar nos dois `01-login.html`; Playwright: criar → empty-state + vault 0; 1.8/1.9/1.11 |
| L1 | Botão **Criar conta** abaixo do Google; modo criar troca CTA **Entrar → Criar** | UI em `visual/telas/01-login.html` + `game/public/boot/01-login.html`; Playwright 1.6/1.7 ok; escudo só no Entrar (Criar = retângulo); lembrar login só userId |
| D10 | Decisão produto **F5** por cena (reload vs logout) | Regra fechada em `docs/inventarios/save-load.md` § D10 — aguarda validação |
| D11 | Documentar momentos de save e load | `docs/inventarios/save-load.md` — tabela F5 por cena; lacunas código×design anotadas (D12) |
| I5 | Inventário **assets do jogo** | `docs/inventarios/assets.md` — ~140 mídias; final vs placeholder/debug/falta |
| I10 | Listar **classes e progressão base** | `docs/inventarios/classes.md` — TK/FM/BM/HT; grill 5/5/5/5; conflitos boot/GDD/código anotados |
| I3 | Listar **todas as skills** | `docs/inventarios/skills.md` — 96 classe + 4 livros código (+4 GDD-gap); barra 10 / passivas fora |
| I1 | Listar **todas as animações** do jogo | `docs/inventarios/animacoes.md` — clip/GLB/uso/status; S7 seleção fechado; X4 matriz shared + gap idle/run |
| I6 | Listar **todos os itens** | `docs/inventarios/itens.md` — 17 ids nomeados + drop procedural + gaps; ícone obrigatório |
| I7 | Listar **todos os equipamentos** | `docs/inventarios/equipamentos.md` — 7 slots; arma livre / armadura por classe; refine 0–10; tiers TBD |
| I9 | Listar **todas as lojas / listas de NPC** | `docs/inventarios/lojas.md` — mercador 7 (selos+mats) + ferreiro 10; C10/C14 em validação |
| I13 | Listar **textos de UI / falas de NPC** | `docs/inventarios/textos-ui.md` — 18 tópicos Sábio + portal/shop/NPC; quests vazio |
| C7d | **Fórmulas** do compositor | `docs/inventarios/compositor-formulas.md` — +7 = Lac + 1M ouro; 50% falha; falha provisória |
| C1d | Spec mínima **mestre de quests** | `docs/inventarios/quests-spec.md` — UI lista/aceitar + `q_mortal_kill_01` |
| C7i | Compositor implementado | `compose_plus7_lac` + UI +7; 50% falha consome mat/ouro; typecheck + `check-c7i-c1i.mjs` |
| C1i | UI quests mínima | Aceitar/ver `q_mortal_kill_01`; kill N→done; save; typecheck + Playwright |
| I14 | Listar **modelos 3D do mundo** | `docs/inventarios/modelos-mundo.md` — props cidade final; árvores/NPC/inimigo/dungeon placeholder\|falta; gaps C8/C23/C24/D13 |
| I2 | Listar **todos os VFX** | `docs/inventarios/vfx.md` — combate/ambiente/level-up procedural; 0 asset arquivo; fanfarra sfx falta |
| I11 | Listar **áudios** (BGM/SFX) | `docs/inventarios/audios.md` — 0 mídia; sliders só placeholder; catálogo esperado + D7 |
| I12 | Listar **shaders e efeitos de cena** | `docs/inventarios/shaders.md` — fonte/chão/portal/x-ray/fade; C12/C13/D13 |
| I8 | Listar **todas as dungeons** | `docs/inventarios/dungeons.md` — D1–D8 faixas/entry/layouts; LD greybox; biomas plano → D13 |

---

## Feito

| ID | Tarefa | Nota |
|---|---|---|
| X10 | FireBurstUAID: cinco correntes 3D curvas, em 0,20 s | Validado pelo Felipe em 24/09/2026. Detalhe na seção Aguardando abaixo |
| X11 | FireBurstUAID: base de corrente 3D com explosão | Validado junto do X10 em 24/09/2026 |
| X8 | Fire Burst: arte 2D e animação transparente | Arte e animação aprovadas pelo Felipe em 24/09/2026. HTML, PNG, APNG e spritesheet em `visual/fire-burst-art/`; testes de alfa, reprodução e cleanup aprovados. Prévia 3D e cinco correntes são X9/X10 |
| X1 | Backlog 5 msgs do Felipe → checklist + tarefas | Feito — checklist + linhas em `TAREFAS-ABERTAS.md` |
| D11b | Doc save/load versionado no repo | Visível em `docs/inventarios/save-load.md` + `INDEX.md` (D11/D11b). Conteúdo produto ainda aguarda Felipe em D10/D11. |
| L5 | Boot conta única `admin` → seleção | Validação técnica Playwright: wipe limpa accounts; reload `01-login` / `/` → só `admin`; `admin`/`admin` → `02-selecao-personagem.html`. Sem mudança de código. |

---

---

## Template ao informar tarefa nova

```markdown
| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| <C><n> | descrever o comportamento esperado | Cena N | onde no código / dependência |
```

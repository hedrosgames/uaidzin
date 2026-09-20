# Tarefas em aberto — Finalização de sistemas

Espelho operacional do que falta **implementar**. Felipe acrescenta item a item; eu marco e movo para Feito quando testar.

Checklist de aceite (o “está pronto quando…”) fica em `CHECKLIST-CENAS.md`.  
Plano/ciclo: `PLAN-finalizacao-sistemas.md`.

**Regra:** item só sai daqui com teste e validação (visual, quando for o caso).

---

## Aberto

### Cena 1 — Login

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| L1 | Botão **Criar conta** abaixo do Google; modo criar troca CTA **Entrar → Criar** | Felipe | UI do protótipo `01-login.html` |
| L2 | Registro manual: login + senha, **sem e-mail**; save zerado | Felipe | conta nova = empty-state na seleção |
| L3 | Login duplicado **recusado** (não sobrescrever) | Felipe | `ensureAccount` hoje devolve conta existente — precisa de registro que falha |
| L4 | Google **cria conta nova** (não preencher `admin`) | Felipe | Hoje preenche admin/admin |
| L5 | Confirmar boot com **conta única** `admin` e admin → seleção | Felipe | Provável já ok; validar |

### Cena 2 — Seleção de personagem

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| S1 | **Bug status vazio** após excluir 2º personagem e clicar no 1º | Felipe | `renderInfo` quebra: `normalizeSlots` do `save-store` descarta `trees`/`spec`; attrs podem virar 5 genérico |
| S2 | Painel direito com **status da classe** no create (padrão) e do **personagem salvo** depois | Felipe | Create já monta `base` da classe; persist/load corrompe |
| S3 | Nome: **mín. 3 / máx. 12** para habilitar Criar | Felipe | Hoje `maxlength=16` e `length >= 2` |
| S4 | Modal criar: caixa com PNG das classes → **3D idle** por classe | Felipe | `mountCharPreview` já existe no roster; não está no modal |
| S5 | Criar/excluir **salva na hora** no status da conta, sem falha | Felipe | `persist()` + `saveData`/`normalizeSlots` precisam preservar o slot completo |
| S6 | **Fade in/out** tela preta ao trocar de cenas | Felipe | Login tem fade do painel; seleção/BootFlow trocam sem preto |
| S7 | Idle do **TK** = mesma animação do **BM** na tela de seleção | Felipe | Manter modelo/textura TK; clip de idle vindo do BM (`char-preview.mjs` usa `animations[0]` do GLB da classe) |
| S8 | Botão **Deslogar** no Settings da seleção | Felipe | `logout()` do save-store + volta ao login; moldura retângulo |

### Cena 3 — Cidade

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| C1 | Definir + implementar **mestre de quests** | Felipe | NPC morto hoje; precisa de UI mínima |
| C2 | Char novo com **skills zeradas**; save acompanha evolução | Felipe | Árvores/spec/loadout no create e no load |
| C3 | Atributos e infos de tela **espelham o save** | Felipe | HUD/painéis sem mock |
| C4 | Classe correta na UI (TK não pode aparecer **Huntress**) | Felipe | Bug de label/classId no hub |
| C5 | Tarefa de **apagar dados** + **alinhar telas ao save** | Felipe | wipe + caminho único create→cidade |
| C6 | Sábio **não** abre tela de equipamento junto | Felipe | Só a tela do Sábio |
| C7 | **Compositor**: criar fórmulas + implementar | Felipe | |
| C8 | Modelo novo para **árvores fora da cidade** + trocar | Felipe | substituir placeholder |
| C9 | Início **sem item equipado e sem dinheiro** | Felipe | create hoje `gold: 100` |
| C10 | **Ferreiro**: lista de itens feita | Felipe | |
| C11 | **Todo item** do jogo com imagem/ícone | Felipe | |
| C12 | **Fonte** central: shader ajustado | Felipe | |
| C13 | **Chão**: textura centro + geral | Felipe | |
| C14 | **Mercador**: lista montada | Felipe | |
| C15 | Click à distância no NPC abre UI ao chegar perto | Felipe | fila de interação |
| C16 | Scroll do menu de dungeon no **padrão** do jogo | Felipe | UI do Guarda |
| C17 | Sistema de entrada **consumindo itens** | Felipe | |
| C18 | Tela dungeon: **cards com info** + wireframe + implementação | Felipe | reutilizar espaço; menos ícone+título |
| C19 | Toggle “não solicitar mais confirmação” no visual + Settings para **restaurar** | Felipe | persistir escolha |
| C20 | Revisar **todo o texto do Sábio** | Felipe | acento/significado consistência; junto com C6 (UI só dele) |
| C21 | **Colisão / click-to-move** — personagem preso andando no lugar | Felipe | clicou, bateu em algo e fica “andando” sem sair; pathing/stuck handler |
| C22 | **Escudo na mão** — posição encaixe (hoje “come” um pedaço do personagem) | Felipe | offset/socket do equip na mão; vale em cidade/dungeon/seleção se o mesh aparecer |
| C23 | **NPCs → personagens** de verdade (trocar placeholder) | Felipe | mestre quests, sábio, ferreiro, mercador, guarda, compositor… |
| C24 | **Capsulas → monstros** (trocar placeholder no mundo/arena) | Felipe | mesh/GLB de monstro no lugar da cápsula debug |
| C25 | **Colisão ao redor da fonte** | Felipe | personagem não deve invadir base; colisor alinhado ao mesh |
| C26 | **Visual da área da fonte** — definir a melhor leitura | Felipe | plataforma/base/chão; amarra C12 shader + C13 textura |

### Cena 4 — Dungeon

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| D1 | Dungeon **não** pode abrir **totalmente preta** | Felipe | bug render/luz |
| D2 | Morte: animação **na dungeon**, espera teleporte, **fade** entrar/sair | Felipe | hoje anima na cidade |
| D3 | Animação de morte tem que **voltar a rodar** (nunca morrer de vez) | Felipe | mixer/state não reseta |
| D4 | **Dungeon 1 mais fácil** | Felipe | balance provisório se GDD não fechar |
| D5 | Shader x-ray **não** em monstros | Felipe | só jogador atrás de obstáculo |
| D6 | UI de drop: **canto inferior esquerdo**, lista tipo **log debugável** | Felipe | |
| D7 | Level up: **mini fanfarra** + **HP e MP cheios** | Felipe | |
| D8 | Corrigir **acentos/símbolos** dos textos em jogo | Felipe | revisão pt-BR |
| D9 | Não poder **andar** atacando / tomando dano | Felipe | input lock na janela certa |
| D10 | Avaliar **F5** por cena (desconectar vs recarregar) + risco de save | Felipe | decisão de produto |
| D11 | **Documentar** momentos de save e load | Felipe | doc no projeto |
| D12 | (reserva) amarrar save de dungeon com C2/C3 | Felipe | evolução não se perde |
| D13 | Dungeons: **iluminação** + **assets** + **level design** por dungeon | Felipe | 3 frentes; começar pela D1 |

### Cena 5 — Editor e métricas

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| E1 | **Planejar** editor: classes, itens, equipamentos, monstros, dungeons, lojas | Felipe | doc antes de código |
| E2 | Implementar editor em fases (após E1 aprovado) | Felipe | export no formato do runtime |
| E3 | **Planejar** planilha + dashboard de progressão | Felipe | métricas + fonte de dados |
| E4 | **Documentar e planejar o fluxo do jogador nível 1 → 400** | Felipe | Mortal 1–400 (GDD): marcos, unlocks (dungeon/skill/equip/reset), o que o save guarda em cada faixa |

### Inventários de conteúdo (listar / auditar)

Insumo para o editor (E1–E2), para balance (E4) e para saber o que falta produzir.

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| I1 | Listar **todas as animações** do jogo | Felipe | personagens/armas/NPC/monstros; fonte (GLB/clips) + onde é usada + status |
| I2 | Listar **todos os VFX** | Felipe | skills, ambiente, level up, morte, hit… + onde roda |
| I3 | Listar **todas as skills** | Felipe | 4 classes × árvores + 8ª + livros; id, nome, custo, efeito, status |
| I4 | Listar **todos os inimigos** | Felipe | comum/elite/boss; dungeon, HP/dano, drops, AI |
| I5 | Listar **todos os assets do jogo** | Felipe | inventário geral: models, textures, ícones, áudio, shaders, UI, anims, VFX — caminho + uso + se é placeholder |
| I6 | Listar **todos os itens** (comum/equip/consumível/entrada) | Felipe | id, raridade, ícone, onde dropa/vende, se tem imagem |
| I7 | Listar **todos os equipamentos** (slots × tiers) | Felipe | 7 slots, faixas, refine, req. de classe |
| I8 | Listar **todas as dungeons** | Felipe | D1–D8: nível, inimigos, tempo, item de entrada, LD status |
| I9 | Listar **todas as lojas / listas de NPC** | Felipe | ferreiro, mercador, outros; o que vendem vs inventário I6 |
| I10 | Listar **classes e progressão base** | Felipe | TK/FM/BM/HT: attrs base, árvores, anims por arma (liga X4) |
| I11 | Listar **áudios** (BGM/SFX) | Felipe | cidades, dungeon, UI, combate, level up (liga D7) |
| I12 | Listar **shaders e efeitos de cena** | Felipe | fonte, x-ray jogador, dungeon, fade… |
| I13 | Listar **textos de UI / falas de NPC** | Felipe | sábio, quests, shops… — cobre C20 + D8 (acentos) |
| I14 | Listar **modelos 3D do mundo** (cidade + fora) | Felipe | fonte, árvores, props, colisores — liga C8/C24–C26/D13 |

### Transversal

| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| X1 | Backlog 5 msgs do Felipe → checklist + tarefas | Felipe | feito |
| X2 | Próxima cena / go de implementação | Felipe | ordem: L* / S* / C* / D* / E* ou o que ele mandar |
| X3 | **Fade preto global** entre cenas | Felipe | S6 + D2/4.3 + cidade; overlay único no fluxo login→…→dungeon |
| X4 | **Animações dos personagens** de acordo com a **arma** em uso | Felipe | TK/FM/BM/HT + variações de arma; idle/run/attack coerentes |

---

## Em implementação

_(vazio)_

---

## Aguardando validação do Felipe

_(vazio)_

---

## Feito

_(vazio nesta fase — docs atualizados; código ainda não mexido nesta fase do plano)_

---

## Template ao informar tarefa nova

```markdown
| ID | Tarefa | Origem | Nota |
|---|---|---|---|
| <C><n> | descrever o comportamento esperado | Cena N | onde no código / dependência |
```

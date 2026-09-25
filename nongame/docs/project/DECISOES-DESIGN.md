# UAIDZIN — Decisões de design (grill)

Fonte: `GRILL-FORM.html` — respostas do Felipe (20/09/2026).  
**Prevalece sobre o GDD** em conflito. Stack e ordem de código **não** estão aqui (fica com o dev).  
Números não digitados entram como **provisórios** até Felipe ajustar jogando.

---

## CONTA e acesso

| Tópico | Regra |
|---|---|
| Contas locais | Uma conta por pessoa; login livre; várias contas no dispositivo |
| Slots | Até **4** personagens vivos por conta |
| Excluir personagem | Apaga o personagem e o que só ele usava (progresso, itens, ouro da bolsa). **Não toca** no baú nem nos outros personagens |
| Compartilhado | **Baú da conta** compartilhado (itens + ouro **do baú**) |
| Por personagem | Cada um tem **seus itens e seu ouro na bolsa**; só vira conta/baú se o jogador **depositar** |
| Lembrar login | Só o **nome do usuário** |

## PERSONAGEM

| Tópico | Regra |
|---|---|
| Nome | **3 a 12** letras; sem número nem símbolo |
| Nome global | **Não pode repetir** entre contas (registro de nomes locais no save) |
| Nasce com | **Nada**: 0 ouro, sem equip, skills zeradas |
| Trocar classe | **Sim**, com **item caro** (mercador ou compositor) |
| Trocar de personagem | Só na **seleção** (sair da cidade → seleção) |

## CLASSES

| Tópico | Regra |
|---|---|
| Identidade | Skill e **distribuição de atributos** definem o papel. Estilo base é o mesmo |
| Builds | **Livres**: FM física, TK mago etc. vale. Qualquer arma/armadura conforme regra de item |
| Atributos iniciais | **5 em tudo** (FOR/DES/CONS/INT) para **todas** as classes |
| Fórmulas | **Iguais** para todos na distribuição/calculo |
| Arma inicial | **Nenhuma** — começa zerado |
| Classe “melhor” no farm | Pode acontecer via skills; **não** é preocupação agora |

Conflito com GDD `05` (atributo principal por classe): **grill vence** — sem primário fixo; 5/5/5/5 e fórmula única.

## ATRIBUTOS

| Atributo | Efeito |
|---|---|
| FOR | **Só** ataque físico |
| DES | Esquiva, crítico, velocidade de ataque |
| CONS | **Só** HP |
| INT | Poder mágico e MP máximo |
| Por nível | **5** pontos livres |
| Acerto/esquiva | Fórmula base + atributo; **sem** i-frame manual |
| Reespec | **Grátis no sábio com limite** + **item ilimitado** |

## SKILLS

| Tópico | Regra |
|---|---|
| Barra | **10** skills equipáveis |
| Auto atk skills | Se autofarm/auto ativo: executam quando **CD e mana** permitirem; **ordem não importa** |
| Custo | **Toda** skill gasta **mana** e tem **cooldown** |
| 8ª skill (topo) | **Só 1** das 3 árvores (GDD) |
| Pontos | **2 por nível** |
| Especialização | O jogador distribui (mesmo ritmo dos pontos; fechar número de spec no balance se for diferente) |
| Reset e skills | **Em aberto** — default assumido: reset zera skills/pontos do ciclo (GDD) até Felipe fechar |
| Manual vs auto | **Manual** até o jogador ligar o auto; auto usa **só o que está na barra** |
| Passivas | Existem e **não** vão para a barra |

Conflito com protótipo/HUD que assume **4** skills: grill vence — **10 slots**.

## RESET e EVOLUÇÃO

| Tópico | Regra |
|---|---|
| Remove | Nível, atributos e skills do ciclo |
| Mantém | Equipamento, refine, inventário, evolução |
| Pontos por reset | **1.000** de atributo (design) |
| Custo | **Ouro + item** |
| Contagem | **Separada por evolução**; **zera ao evoluir** |
| Mortal → Arch | **Nível 400 + item de evolução** |
| Arch → Cele | **Mais punitivo** (mais ouro/itens) |
| Reset | Volta ao **nível 1 da evolução atual**; não cai de etapa |

## COMBATE

### Fire Burst — correção de direção em 24/09/2026

- A arte 2D em `visual/fire-burst-art/` foi aprovada como arte; **billboard do ataque inteiro não atende ao jogo 3D**, conforme correção posterior do Felipe.
- Pedido atualizado **X10**, sobre a base 3D **X11**: um disparo lança **cinco correntes simultâneas**, com curvas distintas e rotação pelo ar, todas chegando ao inimigo em **0,20 s**.
- Referência visual: **Fire Burst do Dark Lord de MU Online**, conforme imagens enviadas pelo Felipe. Elos metálicos escuros e volumétricos, ponta metálica em cada corrente, fogo natural entre os elos e explosão concentrada no contato. Pode usar `three.quarks` nas partículas, não um billboard do ataque inteiro.
- A trajetória e os elos existem no espaço 3D e funcionam em qualquer direção, inclusive com diferença de altura. A câmera não determina o caminho.
- O contato produz explosão breve; corrente e partículas desaparecem depois do ataque.
- O pedido posterior remove a espera pela validação isolada de X11: a entrega atual é a salva de cinco correntes. A mudança visual não multiplica aplicações de dano nem altera mana ou cooldown.

| Tópico | Regra |
|---|---|
| Ataque básico | Auto quando **parado**; **não** ataca andando |
| Movimento em combate | **Não** anda durante janela de **ataque** nem de **hit** (lock) |
| Autofarm | **Parado**; skills do que está equipado; jogador otimiza posição |
| Alvo básico | Mais próximo no alcance; **se clicou em outro alvo, vale o clique** |
| Área | Só inimigos; sem dano em si |
| X-ray obstáculo | **Só o jogador**; **só obstáculo fixo**; **não** atravessa monstro |
| Câmera | **Fixa ¾** |

## CIDADE

| Tópico | Regra |
|---|---|
| Hub de verdade | **Todos os NPCs** funcionando, mesmo com lista curta |
| **Sábio** | **Não** é build. É **tutorial do jogo + codex** (única UI com texto explicativo) |
| Ferreiro | Melhorar/refinar + catálogo |
| Mercador | Consumíveis, **itens de entrada** de dungeon, utilidades |
| Mestre de quests | Lista de missões com recompensa |
| NPC de longe | Clica → anda → **abre UI** ao chegar |
| Fora da cidade | **Não existe** mundo externo — **só cidade + dungeons** |

Impacto: build/skills **não** abrem no sábio (definir NPC/atalho — atalho K continua; painel de skill não é “tela do sábio”).  
Tarefa C8 (árvores fora da cidade) e arredores: **sem mundo aberto**; “fora” = só visual de borda/se não existir, remover placeholder.

## ECONOMIA

| Tópico | Regra |
|---|---|
| Ouro inicial | **0** |
| Modelo | **Misto**: bolsa **por personagem** + **cofre/baú da conta** |
| Baú | Compartilhado; ouro **do baú** é da conta |
| Bolsa | Ouro e itens **do char**; só conta/baú se **depositar** |
| Sumidouros | Refino, reset, compras |
| Vender NPC | Preço **baixo fixo por raridade** + poder **dissolver** |
| HUD | Ouro completo; teto de exibição alto |
| Materiais | Dropam e gastam em refino/compositor (ex.: Poeira de Lac) |

Conflito com GDD “ouro só no vault da conta”: grill vence — **bolsa por char + vault**.

## ITENS e EQUIP

| Tópico | Regra |
|---|---|
| Slots | **Como está hoje** na UI |
| Raridade | Comum → raro → épico → lendário (nomes no GDD) |
| Inventário | **Como está hoje** na UI |
| Invetário cheio | Drop **se perde** |
| Refino | +N com **chance**; falha **perde material**; **algumas falhas quebram** o item |
| Classe no equip | **Arma livre** (scaling); **armadura por classe** |
| Entrada de dungeon | Item **consome ao entrar** |
| Ícone | **Todo item** com ícone; sem ícone **não entra** na build |

## DUNGEONS

| Tópico | Regra |
|---|---|
| Tempo | **10:00** único, não pausa, não renova |
| Fim do tempo | Encerra e **volta à cidade** |
| Entrada | Guarda → lista → confirmação → **consome item** → entra |
| Toggle confirmação | Vale **todas** as dungeons; **Settings restaura** |
| Estrutura | **Cada dungeon é diferente**; formatos e tamanhos variados **valem** |
| Boss | Opcional em umas; obrigatório em outras |
| Boss morto | **Não** encerra o tempo |
| Faixa Mortal | **8 dungeons (D1–D8)** |
| D1 | **Muito fácil** — tutorial de farm |
| UI seleção | Dados de hoje **+ ícone do item de entrada** |
| F5 / sair na dungeon | Sai para a cidade com **último save** (ver SAVE) |

## INIMIGOS

| Tópico | Regra |
|---|---|
| AI | Spawn fixo · perseguidor (dist. mín.) · longo alcance |
| Elite | Mais HP/dano + visual diferente + drop melhor |
| Não podem | Atravessar parede; grudar sem colisão; **spawnar em cima de construção** |
| HP bar | Verde ≥ 40% / vermelho &lt; 40% |
| Escala | HP/dano/nível sobem com a faixa da dungeon |
| Drop | Item pela **tabela da dungeon**; ouro **pode ser zero** |

## FARM e LOOT

| Tópico | Regra |
|---|---|
| XP | Matar **+ quests**; quests que não são de up; **itens de quest** podem ser **caixas de XP** |
| Level up | **HP e MP cheios** + **mini fanfarra** + flash nas barras |
| Log de drop | Canto **inferior esquerdo**, lista tipo log |
| Resultado de dungeon | **Sem tela de resultado** — volta à cidade com o **log** |
| Autofarm vs manual | Eficiência **igual** |
| Unidade de farm | **1 sessão de 10 min** |
| Materiais | Dropam e valem refine/craft |

Conflito: `visual/TODO` “tela de resultado” → **cancelar** como tela cheia; log + cidade.

## MORTE

| Tópico | Regra |
|---|---|
| Fluxo | Anim de morte **na dungeon** → espera → **teleporte** cidade |
| Punição | **Nenhuma** além de sair da run |
| Item de entrada | **Já consumiu ao entrar**; morreu, perdeu a run |
| Ao voltar | HP/MP **cheios** |
| Animação | Roda **toda** vez |
| Morte em sequência | **Sem** punição extra |

## PROGRESSÃO Mortal 1–400

| Tópico | Regra |
|---|---|
| Marcos | **Nova dungeon** a cada faixa de nível |
| Primeira skill | Até **nível 5** |
| Sensação de força | **Continua**, sem marco obrigatório |
| UI dungeon | Faixa **min/max** de nível visível |
| Números | **Provisórios no jogo**; Felipe ajusta **jogando** |
| Explicar reset | Mestre de quests / sábio **antes do 400** (codex/tutorial do sábio) |

## UI e FEEDBACK

| Tópico | Regra |
|---|---|
| Tutorial na UI | **Proibido**, exceto **sábio** (única exceção com texto explicativo) |
| pt-BR | Acentos **obrigatórios**; sem acento **reprova** |
| HP no hub | **Só frame da UI** (world bar não é obrigatória na cidade) |
| Painéis | UI existente; **mesmos atalhos abrem também na dungeon** |
| Áudio UI | Click **sutil** em toda UI |
| Level up | Mini fanfarra + flash nas barras |

World bar verde/vermelho 40% **permanece** para **inimigos** e, quando houver barra world do jogador em **dungeon**.

## CONTROLES

| Tópico | Regra |
|---|---|
| Movimento | **WASD + click-to-move** |
| Obstáculo | **Desvia** / caminho válido; **nunca** anda no lugar |
| Atalhos | **C / K / I** como hoje; outros painéis via NPC |
| Alvo | Auto + **clique sobrescreve** |

## COMPOSITOR e QUESTS

| Tópico | Regra |
|---|---|
| Compositor | Combinar itens/materiais → equip ou consumível melhor |
| Primeira fórmula | **Item +7** = **Poeira de Lac + 1.000.000 de ouro**; **50% de falha** |
| Falha | **Depende da composição** (cada receita define o que falha faz) |
| Quests iniciais | Matar N · completar dungeon · coletar item |
| Recompensa | XP + ouro; **item raro** em quest de marco; itens de quest podem ser **caixa de XP** |
| Repetição | **Diárias repetem**; história **não** |

## SAVE (ótica do jogador)

| Tópico | Regra |
|---|---|
| Sempre lembra | Conta, personagens, nível/atributos/skills, equip, inventário, ouro, dungeons liberadas, quests |
| Posição | Cidade: **spawn fixo** (não salva posição). Dungeon: **início** ao recarregar |
| Em run | **Persistir o que precisar na hora**: XP, ouro, item — a cada ganho relevante |
| Preferências | Persistem na conta/dispositivo (áudio, toggle confirmação, FPS…) |
| Apagar char | Tudo **dentro** do personagem; baú e outros chars **intactos** |
| Corrupção | Tenta **último bom backup**; senão personagem **seguro na cidade** com estado mínimo |

Relação F5: consequência prática = sair da dungeon e voltar à cidade com o **último save válido** (que pode incluir XP/ouro/item da run se já tinham sido gravados).

## FORA / NÃO

| Tópico | Regra |
|---|---|
| UAIDZIN não é | MMORPG online · hypercasual · roguelike puro |
| Multiplayer | **Zero** nesta versão |
| Monetização | **Nenhuma** nesta versão |
| Regra extra | Nada além do grill por ora |

---

## Em aberto (não resposto / precisa fechar)

| ID | Assunto | Default provisório |
|---|---|---|
| SKILL-5 | Reset zera skills? | Sim — GDD (remove skills do ciclo) |
| CLASSE-2 | Atributo principal | **Nenhum** — 5/5/5/5 + fórmula única |
| CLASSE-3 | Arma inicial | **Nenhuma** |
| ITEM-1 / ITEM-3 | Slots / tamanho inventário | **Como está hoje na UI** |
| DUNG-5 | Formato das dungeons | Cada uma diferente |
| CIDADE-2 | Onde abre skill/atributo se não é o sábio | Atalho **K** + NPC próprio se faltar |
| PROG-5 | Números finais | Provisórios até playtest |
| DUNG-D1 / D4 | Ease D1 (HP/dano) | **hp×0.45 · atk×0.4 · def×0.5** + arenas mais leves — provisório grill “D1 muito fácil”; GDD sem número (`dungeon.ts` `d1Ease`) |

---

## Impacto em tarefas já abertas

| O que muda | ID / doc |
|---|---|
| Save: bolsa por char + baú compartilhado (não só vault) | C2 C3 C9 · S5 · `22-saves-e-dados.md` |
| Nome global único | PERSON-2 · novo check no create (seleção) |
| Sábio = tutorial + codex (não build) | C6 C20 · UI de skills **fora** do sábio |
| Sem mundo fora da cidade | C8 · arredores/árvores |
| Barra 10 skills + passivas | HUD/skills · I3 |
| Sem tela de resultado de dungeon | `visual/TODO.md` · FARM-4 |
| D10 cards + ícone do item de entrada | C18 |
| Compositor: fórmula Lac + 1M + 50% fail | C7 |
| Refino: falha pode quebrar | I7 · ferreiro C10 |
| Armadura por classe / arma livre | I7 ITEM-6 |
| Acento reprovando build | D8 UI-1 I13 |
| Click alvo sobrescreve auto | COMBATE-4 |
| X-ray só obstáculo fixo + player | D5 |
| Save em run a cada XP/ouro/item | D11 D12 SAVE-2 |
| Reespec sábio limite + item ilimitado | definir item na loja ECON/COMP |
| Item evolução Mortal→Arch 400 | E4 fluxo 1–400 |
| Fórmula atributos iguais / sem primário | I10 · create base 5 |

---

## Próximo passo deste doc

1. Felipe: marcar em aberto o que quiser fechar agora (SKILL-5 principalmente).  
2. Dev: implementar G0/G1/G3 respeitando estas regras.  
3. Atualizar GDD `05`/`22`/`16` quando formos tocar nesses capítulos (ou deixar nota “grill 20/09 prevalece”).

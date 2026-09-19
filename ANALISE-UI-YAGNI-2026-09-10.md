# UAIDZIN — Review de UI e plano YAGNI

Data: 2026-09-10  
Branch: `UAIDZIN`  
Base revisada: `15c81e22c22adcda37f93b9edfd32b4ff981e838`

## Escopo

Revisão do estado atual do jogo e da documentação com foco em UI/UX, HUD, consistência visual, fluxo das telas e pequenas correções que aumentam a qualidade sem criar arquitetura desnecessária.

Foram cruzados principalmente `00-GDD-INDEX.md`, `16-interface-e-ux.md`, `18-arte-direcao-visual.md`, `20-fluxos-e-telas.md`, `31-estilo-de-escrita.md`, `32-auditoria-e-cobertura.md`, `visual/DECISOES-ESTILO.md`, `visual/TODO.md`, `AGENTS.md`, `plano de implementação/19-decisoes-confirmadas.md` e o código em `game/`.

A avaliação visual do jogo executável foi feita por inspeção do HTML/CSS/TypeScript versionado e dos protótipos standalone existentes. O repositório não expõe aqui uma sessão gráfica executável neste contexto, portanto não foi feita uma validação pixel-a-pixel em navegador.

## Estado atual resumido

O projeto está em uma posição melhor do que parece à primeira leitura. O último commit entregou uma mudança coerente de direção: HUD WYD no hub, frame de personagem, HP/MP/XP, skill bar, HP world space, painéis C/K/I e remoção de elementos de debug do fluxo padrão. O smoke reportado no próprio commit está em 44/44 e o typecheck passa.

O problema principal agora não é falta de sistemas. É falta de fechamento visual e de alinhamento entre três camadas que evoluíram em paralelo:

1. GDD e decisões de UX.
2. Protótipos visuais standalone.
3. Implementação real em `game/`.

A maior oportunidade é aproximar essas três camadas sem reabrir o design inteiro.

## 1. Três pontos de vista

### 1.1 Otimista — Tech Lead sênior

O projeto tem uma base técnica saudável para um protótipo de jogo web: Vite + TypeScript + Three.js, separação entre domínio e apresentação, `CityGameSession` como orquestração de gameplay, UI isolada em `src/ui`, save separado e smoke test Playwright. O código também já expõe uma API de debug útil para validação automática.

A última entrega resolveu problemas reais de produto, não apenas cosméticos: o HUD passou a representar melhor o personagem, MP entrou no modelo, skills ganharam uma barra própria, HP passou a existir em world space e os atalhos C/K/I ficaram mais coerentes.

Do ponto de vista técnico, não há motivo para criar um framework de UI, ECS, design system complexo ou nova camada de estado para continuar. O caminho mais eficiente é consolidar os componentes existentes e terminar as telas em cima deles.

Veredito otimista: **a arquitetura já é suficiente para chegar às próximas telas; o gargalo atual é acabamento e integração visual, não tecnologia.**

### 1.2 Realista — Producer sênior

O risco de produção é começar a construir telas novas antes de resolver a inconsistência entre o que está aprovado e o que realmente está no jogo.

Hoje existem decisões visuais aprovadas para login e seleção de personagem, mas o fluxo executável atual entra diretamente no jogo/cidade. O `start()` do `GameApp` carrega o save, inicia a sessão e chama `enterGame()`. O smoke da última entrega também valida explicitamente que o jogo abre direto na cidade e que não há login no jogo.

Isso não precisa virar uma grande reimplementação agora, mas precisa ser uma decisão explícita de produto. Caso contrário, cada nova tela será construída em cima de uma jornada diferente da documentada.

A segunda preocupação é escopo. O GDD já define o jogo inteiro, mas o protótipo não precisa de todas as telas finais ao mesmo tempo. A ordem correta é fechar a cadeia que o jogador usa repetidamente: **cidade → preparação → seleção de dungeon → dungeon → resultado → cidade**. Personagem, skills e inventário devem ser suficientemente bons para suportar esse loop, não projetos independentes de UI.

Veredito realista: **o próximo trabalho deve ser integração e fechamento das telas críticas, não expansão do número de telas.**

### 1.3 Pessimista — alguém que odeia o projeto

Se eu quisesse encontrar problemas, encontraria vários:

- O projeto diz que a identidade visual está fechada, mas a implementação ainda parece um HUD funcional com decoração, não a interface final da identidade nórdica de salão.
- A tela de personagem e o inventário ainda usam muitos textos e controles genéricos em vez de iconografia final.
- O skill HUD ainda não entrega a promessa de ícones PNG/SVG legíveis a 32px; a implementação de painéis mostra slots com nível/texto, e a barra de skills usa nome e estado, não uma linguagem visual de skills fechada.
- A especificação pede ouro visível no canto superior direito, mas o frame atual concentra HP/MP/XP no canto superior esquerdo e o `index.html` não possui um elemento de ouro dedicado no HUD.
- A especificação pede mini-log de loot recente; não há um componente claro correspondente no HUD atual.
- O inventário confirmado tem 40 slots, enquanto `GamePanels` renderiza 20 células de mochila.
- A documentação diz que o HUD de dungeon é uma regra travada, mas o código atual ainda deixa timer, farm stats e resultado como elementos que só aparecem quando o fluxo de dungeon os ativa; não existe ainda uma tela final de dungeon comparável aos protótipos de login/seleção.
- O fluxo documentado de login/seleção e o fluxo executável atual não são o mesmo produto.
- `GamePanels` concentra personagem, skills e inventário em uma implementação genérica única. Isso é bom para velocidade, mas, se crescer sem cuidado, pode virar uma tela de RPG improvisada em vez da identidade visual aprovada.

Veredito pessimista: **se novas telas forem adicionadas sem uma rodada de consolidação agora, o projeto corre o risco de terminar com gameplay bom e uma UI visualmente inconsistente, com três linguagens diferentes: protótipo, HUD atual e painéis antigos.**

## 2. Conclusão entre as três análises

As três leituras chegam ao mesmo ponto por caminhos diferentes:

**Não é hora de refazer a UI. É hora de consolidá-la.**

O Tech Lead diz que a base técnica suporta isso.  
O Producer diz que o risco é sequência e integração.  
O pessimista mostra onde a inconsistência já está aparecendo.

Portanto, o plano YAGNI abaixo prioriza correções pequenas, visíveis e reversíveis.

## 3. Auditoria visual por tela/estado

### Login — protótipo standalone

Status visual: **APROVADO como referência**.

O protótipo segue a identidade C Salão/Brasa, usa CTA escudo somente no Entrar, Google em botão retangular, tipografia separada por função e ausência de flavor de mockup. A decisão visual está documentada como aprovada.

Problema de produto: o login existe como protótipo, mas não participa do fluxo atual do jogo.

Correção YAGNI: **não redesenhar**. Primeiro decidir se o login continua como primeira tela real. Se continuar, integrar o protótipo; se não continuar, marcar formalmente a decisão e parar de tratá-lo como fluxo obrigatório.

### Seleção de personagem — protótipo standalone

Status visual: **APROVADO como referência**.

O salão, fogueira, 16:9, personagens oficiais, zoom central, criar/excluir e Entrar estão alinhados às decisões visuais.

Problema de produto: a seleção standalone e o jogo real não estão claramente conectados. O `GameApp.start()` atual leva o jogador para a cidade sem reproduzir esse fluxo.

Correção YAGNI: **integrar o fluxo já aprovado**, sem criar uma segunda seleção diferente dentro do jogo.

### Cidade — HUD atual

Status visual: **FUNCIONAL / EM CONSOLIDAÇÃO**.

Pontos fortes:

- frame de personagem no topo esquerdo;
- face da classe;
- nome e nível;
- HP, MP e XP;
- skill bar central inferior;
- HP world space do personagem;
- paleta C;
- tipografia coerente com a direção;
- botões retangulares em vez de escudo espalhado;
- debug HUD desligado por padrão.

Pontos a corrigir:

1. O frame atual usa uma borda lateral dourada e gradientes, enquanto a regra visual fala em moldura A de ferro com cantos dourados. Falta aproximação visual da moldura aprovada.
2. Ouro não está claramente presente como elemento persistente no canto superior direito.
3. O HUD não possui ainda mini-log de loot recente.
4. Skill HUD ainda depende de texto/nome e não possui os ícones finais PNG/SVG de 32px.
5. O botão de velocidade 1×/10× aparece no HUD real depois da entrada. Isso é ferramenta de protótipo, não parte da fantasia principal, e deve ficar tratado como controle de teste, não como elemento de composição visual.
6. O help-bar está correto conceitualmente com C/K/I, mas não deve competir visualmente com o gameplay.

Correção YAGNI: primeiro fechar frame, ouro e skill icons. Mini-log pode entrar junto da primeira implementação real de loot.

### Painel Personagem

Status visual: **FUNCIONAL / ABAIXO DO PADRÃO FINAL**.

`GamePanels` apresenta nome, classe, evolução, nível, EXP, HP, MP, ataque, defesa, ouro e atributos. A hierarquia é útil e rápida para protótipo.

Problemas:

- o painel ainda parece um painel de dados genérico;
- não usa claramente a moldura A completa;
- atributos usam texto + botão `+`, sem tratamento visual final;
- não há espaço visual claro para identidade da classe/personagem;
- Reset e Evoluir aparecem juntos, exigindo uma hierarquia de ação mais clara quando essas ações forem realmente desbloqueadas.

Correção YAGNI: manter a estrutura de dados, trocar somente composição visual, hierarquia e ornamentos. Não criar sistema de cards novo agora.

### Painel Skills

Status visual: **FUNCIONAL / PRIMEIRO ROUND**.

O painel já possui classe, árvores, pontos, especialização e skills. O sistema de interação está funcional.

Problemas:

- os slots de skill são essencialmente caixas de informação;
- não há iconografia final;
- a visualização da árvore é mais próxima de tabela do que de painel de RPG;
- a regra de ícone 32px ainda não está atendida;
- a linguagem visual das skills não conversa plenamente com a barra de skills do HUD.

Correção YAGNI: criar um único componente visual de `skill-slot` reutilizável no HUD e no painel. O dado e a lógica existentes permanecem.

### Painel Inventário / Equipamento

Status visual: **FUNCIONAL / PRINCIPAL ALERTA DE CONSISTÊNCIA**.

Há paperdoll, equipamentos, mochila, raridade, equipar, vender e refinar. A estrutura é suficiente para protótipo.

Problema objetivo: o GDD confirma 40 slots de inventário, mas `GamePanels` renderiza 20 células de mochila. Isso precisa ser corrigido ou explicitamente tratado como protótipo parcial.

Outros problemas:

- slots ainda dependem muito de texto;
- falta iconografia de item;
- raridade existe por classe CSS, mas ainda precisa de leitura visual mais forte;
- o paperdoll é funcional, porém não tem a presença visual esperada para uma tela de RPG.

Correção YAGNI: renderizar os 40 slots e melhorar a moldura/glow de raridade. Não criar drag-and-drop, tooltip complexo ou sistema de comparação agora.

### Dungeon HUD

Status: **REGRA DEFINIDA, IMPLEMENTAÇÃO INCOMPLETA VISUALMENTE**.

O GDD trava timer 10:00 no topo central, skills no centro inferior, ouro no canto superior direito, mini-log, HP world space e aviso de inventário.

O código já possui elementos para timer, farm stats, toast, skill bar, player frame e world HP, mas ainda não há fechamento visual equivalente ao padrão aprovado.

Correções YAGNI prioritárias:

- timer central com tratamento de estado normal/urgente;
- ouro persistente no canto superior direito;
- skill slots com ícone real;
- HP world space do player e inimigos;
- aviso de inventário a 80% e 100%;
- mini-log de loot curto;
- manter a tela limpa, sem adicionar barras ou painéis novos que não estejam no GDD.

### Morte

Status: **FUNCIONAL / SIMPLES**.

O overlay atual comunica derrota e retorno a Aurelion. Isso está próximo da regra do GDD.

Correção YAGNI: apenas garantir moldura/tipografia e botão de retorno quando a tela passar de texto automático para interação real. Não adicionar estatísticas ou punições.

### Resultado de dungeon

Status: **ABERTO**.

A documentação exige XP, Ouro e itens. O código possui `result-overlay`, mas ainda não existe uma tela visual final equivalente às referências.

Correção YAGNI: criar uma única tela modal com três blocos de resultado e CTA de retorno. Não criar histórico de runs, ranking ou estatísticas avançadas.

## 4. Inconsistências que merecem correção antes de expandir

| Prioridade | Problema | Ação |
|---|---|---|
| P0 | Fluxo documentado login/seleção ≠ fluxo executável atual | Decidir e alinhar |
| P0 | Inventário confirmado 40 vs UI renderiza 20 | Corrigir para 40 |
| P1 | HUD sem ouro persistente no canto direito | Adicionar |
| P1 | Skill icons finais ainda ausentes | Criar componente reutilizável |
| P1 | Dungeon HUD ainda não fechada visualmente | Consolidar |
| P1 | Resultado de dungeon ainda não fechado | Criar tela simples |
| P2 | Frame não reproduz completamente moldura A | Refinar CSS |
| P2 | Mini-log de loot ausente | Adicionar junto do loot |
| P2 | Painéis C/K/I ainda com aparência de protótipo | Refinar composição |

## 5. Plano YAGNI recomendado

### Fase 1 — alinhar o que já existe

1. Definir oficialmente se login e seleção fazem parte do runtime atual.
2. Se fizerem, integrar os protótipos existentes em vez de recriar.
3. Corrigir inventário para 40 slots.
4. Remover ou isolar visualmente o controle 1×/10× do HUD de produção.
5. Ajustar o frame para a moldura A sem alterar sua estrutura de dados.

### Fase 2 — fechar a linguagem de skills

1. Criar um formato único de skill slot.
2. Usar PNG/SVG real.
3. Garantir leitura a 32px.
4. Reutilizar o mesmo componente no HUD e no painel K.
5. Manter cooldown em anel no HUD.

### Fase 3 — fechar o loop dungeon

1. Ouro no canto superior direito.
2. Timer central.
3. HP world space de player e inimigos.
4. Aviso de inventário 80/100.
5. Mini-log de loot curto.
6. Tela de resultado.
7. Morte com CTA de retorno.

### Fase 4 — polir sem expandir escopo

1. Molduras e divisórias da identidade A.
2. Raridade dos itens com leitura visual consistente.
3. Hierarquia de ações dos painéis.
4. Revisão de espaçamento e escala em 1600×900.
5. Smoke test das interações.
6. Typecheck.

## 6. O que NÃO fazer agora

- Não criar novo framework de UI.
- Não criar design system externo ao CSS atual.
- Não refazer o GDD.
- Não criar cards definitivos de classe antes de fechar as telas compostas prioritárias.
- Não implementar drag-and-drop de inventário.
- Não criar tooltip complexo.
- Não criar animações longas.
- Não criar mobile HUD agora.
- Não adicionar novas moedas, recursos ou sistemas de progressão.
- Não transformar o controle 10× em feature de produto.
- Não refazer o HUD inteiro só porque a moldura ainda não está perfeita.

## 7. Critério de pronto para próximas telas

Uma nova tela de UI só deve ser considerada pronta quando:

- usa a paleta C;
- usa moldura A por padrão;
- usa botão retangular, salvo a exceção explícita do escudo;
- não contém emoji;
- usa iconografia PNG/SVG quando houver ícone;
- não contém texto de mockup;
- funciona em 1600×900 sem quebrar a composição;
- não cria um segundo padrão visual para uma função já existente;
- não inventa regra de gameplay ausente no GDD;
- passa typecheck e smoke quando houver mudança de código.

## 8. Recomendação final

A próxima tela mais importante não é a mais bonita. É a próxima tela que fecha o loop de jogo.

Prioridade recomendada:

**Seleção de dungeon → Dungeon HUD final → Resultado → retorno à cidade → refinamento de Personagem/Skills/Inventário.**

A implementação atual já tem material suficiente para isso. O maior ganho agora vem de consistência e integração, não de mais arquitetura.

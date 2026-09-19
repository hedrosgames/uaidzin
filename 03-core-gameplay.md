# UAIDZIN

## Core Gameplay

## Loop Principal

**Cidade → Preparação → Dungeon → Farm → Retorno → Evolução ou Reset → Nova Dungeon**

A cidade é o ponto central da experiência. O jogador prepara o personagem e seleciona uma dungeon através da interface.

Ao entrar na dungeon, começa imediatamente um contador de 10 minutos. Durante esse período, o jogador realiza o farm e decide quando e onde mover o personagem.

Quando o contador chega a zero, a dungeon termina e o personagem retorna para a cidade. Se o personagem morrer antes do fim do tempo, também retorna para a cidade.

## Cidade

A cidade é um espaço 3D explorável e funciona como hub permanente do personagem.

É nela que ficam concentrados os sistemas de preparação, progressão e gerenciamento.

A entrada nas dungeons é realizada através da interface de seleção disponível na cidade.

## Dungeon

As dungeons são áreas fechadas e independentes.

Cada dungeon funciona como um diorama 3D composto por uma sequência de arenas conectadas. A estrutura é criada manualmente e não utiliza geração procedural.

O jogador entra em uma dungeon específica e permanece nela por até 10 minutos. O tempo não é renovado entre arenas.

## Estrutura da Arena

O jogador possui liberdade de movimento dentro dos limites do cenário.

Não existe sistema de escolha de caminhos, salas aleatórias ou decisões de rota. O jogador atravessa uma sequência previamente definida de espaços de combate.

Cada espaço funciona como uma arena de farm.

## Inimigos e Spawns

Os inimigos podem aparecer em ondas ou reaparecer em pontos determinados da arena.

Nem todo inimigo precisa perseguir o jogador. Alguns monstros permanecem próximos ao ponto de spawn, fazendo com que o jogador se desloque até eles para farmar.

Outros inimigos podem perseguir o jogador. Alguns também podem atacar à distância. A composição de cada dungeon define as situações de farm que o jogador encontra.

## Ataque Básico

O ataque básico é sempre automático e depende da arma equipada.

O jogador não possui um botão para iniciar ou interromper manualmente o ataque básico.

O personagem não realiza o ataque básico enquanto está se movimentando. O jogador precisa parar em uma posição adequada para permitir que o ataque aconteça.

## Habilidades

As habilidades fazem parte da build do personagem.

Por padrão, podem funcionar automaticamente. O jogador pode desligar a automação e utilizá-las manualmente.

O ataque básico permanece automático nos dois casos.

## Posicionamento

O movimento tem duas funções principais: deslocar o personagem entre pontos de spawn e encontrar posições eficientes para atacar ou lidar com inimigos que perseguem ou atacam à distância.

O jogador pode permanecer parado quando a situação permitir. O jogo não exige movimento constante.

A habilidade do jogador está em escolher posições eficientes e decidir quando vale a pena se reposicionar.

## Autofarm

O personagem consegue continuar combatendo sem controle constante do jogador.

O autofarm não inclui movimentação autônoma. O personagem permanece no local em que foi deixado até que o jogador mova o personagem.

O controle manual funciona como uma camada de otimização sobre o autofarm.

## Sobrevivência

O jogador pode ser derrotado dentro da dungeon.

Ao morrer, o personagem retorna para a cidade. Os recursos já obtidos não são perdidos.

## Tempo

Cada entrada em uma dungeon inicia um contador de 10 minutos.

Quando o contador chega a zero, a atividade termina imediatamente e o personagem retorna para a cidade.

O objetivo é aproveitar o tempo disponível para produzir o máximo de progresso possível, sem transformar a dungeon em uma corrida baseada em pontuação.

## Loot

Os itens obtidos dos inimigos não ficam no chão.

O loot é enviado diretamente para o inventário quando existe espaço disponível.

Se o inventário estiver cheio, o item que seria obtido é perdido e o jogador recebe uma mensagem informando que o inventário está cheio.

## Bosses

Dungeons podem possuir bosses. A presença de bosses não é obrigatória em todas as dungeons.

Quando utilizados, devem funcionar como encontros de maior dificuldade dentro da estrutura de farm.

## Progressão Dentro da Dungeon

A dungeon não possui progressão roguelike. A progressão principal pertence ao personagem permanente.

A função da dungeon é transformar tempo de jogo em recursos de progressão.

## Reset

O reset é uma camada de progressão permanente baseada em ciclos.

Ao resetar, o personagem retorna ao nível 1 da evolução atual e perde a progressão de atributos e habilidades do ciclo.

Cada reset concede, como valor inicial de design, 1.000 pontos de atributo adicionais para distribuição.

Equipamentos, refinamentos, inventário e demais patrimônios permanentes não são perdidos.

Mortal, Arch e Cele possuem progressões de reset independentes. Mortal reseta e continua Mortal. Arch reseta e continua Arch. Cele reseta e continua Cele.

Resets acumulados em Mortal não são carregados para Arch. Resets acumulados em Arch não são carregados para Cele.

## Fluxo Completo

### 1. Cidade

O jogador acessa a cidade com seu personagem.

### 2. Preparação

O jogador verifica equipamentos, skills, atributos, inventário e build.

### 3. Seleção

O jogador escolhe uma dungeon através da interface.

### 4. Entrada

O personagem entra na dungeon e o contador de 10 minutos começa.

### 5. Farm

O jogador controla o posicionamento, desloca-se entre spawns quando necessário e deixa o personagem realizar os ataques automaticamente.

### 6. Loot e Experiência

Inimigos derrotados fornecem experiência, equipamentos, Ouro e outros recursos.

### 7. Fim da Dungeon

Quando o contador chega a zero, o personagem retorna para a cidade. Se morrer antes disso, também retorna.

Os recursos já conquistados permanecem com o personagem.

### 8. Evolução e Progressão

Na cidade, o jogador utiliza os recursos obtidos para melhorar o personagem, equipamentos, skills e build.

Quando aplicável, pode realizar um reset e iniciar um novo ciclo.

### 9. Nova Expedição

O jogador escolhe outra dungeon e inicia um novo ciclo de farm.

## Princípio Fundamental

A dungeon é a máquina de farm.

A cidade é o espaço onde o jogador transforma o resultado do farm em crescimento permanente.

O combate combina automação com controle de posicionamento.

O ciclo central é:

**Entrar → Encontrar spawns → Farmar → Obter recursos → Ficar mais forte → Farmar melhor → Evoluir → Resetar → Recomeçar mais forte.**
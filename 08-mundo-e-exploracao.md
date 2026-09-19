# UAIDZIN

## Mundo e Exploração

## Estrutura do Mundo

UAIDZIN possui uma cidade central e várias dungeons.

Não existe um mundo aberto contínuo.

A cidade funciona como o hub permanente do personagem. As dungeons são áreas fechadas destinadas ao combate e ao farm.

## Cidade

A cidade é explorável em 3D.

O jogador pode caminhar pelo espaço e acessar seus sistemas e NPCs.

A cidade concentra os elementos de progressão e preparação do personagem.

NPCs ficam concentrados na cidade.

## Dungeons

As dungeons são instâncias fechadas e independentes.

Cada dungeon possui identidade visual, inimigos, dificuldade e recompensas próprias.

Ao entrar em uma dungeon, começa um contador de 10 minutos. Quando o tempo termina, o personagem retorna para a cidade.

## Biomas

Cada dungeon possui um bioma próprio.

A variedade de biomas ajuda a diferenciar as áreas e cria uma progressão visual junto da progressão de dificuldade.

## Progressão de Áreas

As dungeons são desbloqueadas progressivamente.

O jogador começa com acesso limitado e libera novas áreas conforme avança na progressão do personagem.

Os inimigos possuem níveis definidos por dungeon.

Não existe escalonamento dinâmico dos inimigos de acordo com o nível do jogador.

## Estrutura das Dungeons

Cada dungeon é composta por uma sequência de arenas conectadas.

A estrutura é pré-definida.

Não existe geração procedural de salas nem escolha de caminho pelo jogador.

A exploração dentro da dungeon existe principalmente para levar o personagem de uma arena de farm para outra.

## Farm

O principal propósito das dungeons é permitir que o jogador faça farm.

Inimigos podem surgir em ondas ou reaparecer em pontos específicos do cenário.

A densidade, a frequência de respawn e a composição dos inimigos fazem parte do balanceamento individual de cada dungeon.

## Quests

O jogo possui quests.

As quests fazem parte da camada de progressão e conteúdo, mas não substituem o loop principal de farm.

A estrutura e os tipos de quests serão definidos posteriormente.

## Eventos

O jogo pode possuir eventos.

Eventos podem modificar temporariamente a atividade da cidade, das dungeons ou das recompensas.

A estrutura exata dos eventos ainda será definida.

## Princípio de Exploração

A exploração existe para dar contexto espacial ao RPG e criar variedade entre as áreas de farm.

A cidade oferece um espaço permanente e explorável. As dungeons oferecem espaços fechados e objetivos claros.

O jogo não busca criar uma experiência de exploração de mundo aberto.

## Proposta de Design

### Quests

- Tipos no lançamento: falar com NPC, derrotar N inimigos em uma dungeon, obter item, completar uma entrada de dungeon.
- Quests não bloqueiam o acesso às dungeons principais.
- Recompensa padrão: Ouro, experiência e, às vezes, item de entrada ou material.
- Limite de quests ativas: 8.
- Quests diárias opcionais entram na segunda etapa de conteúdo.

### Eventos

- Eventos são opcionais e não alteram o save de forma permanente.
- Exemplos iniciais: bônus de Ouro em uma dungeon por tempo limitado, spawn extra de inimigos, loja com estoque rotativo.
- No lançamento, zero ou um evento piloto. O sistema existe no design, não precisa estar no protótipo.

## Pendências

- Lista de quests do lançamento.
- Diálogo e ritmo de entrega das quests.
- Calendário de eventos.
- Recompensas balanceadas por faixa de nível.

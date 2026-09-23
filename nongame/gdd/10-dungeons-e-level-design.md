# UAIDZIN

## Dungeons e Level Design

## Estrutura

Cada dungeon é uma área fechada, pré-definida e composta por uma sequência de arenas conectadas.

A dungeon funciona como um espaço de farm e possui um limite de 10 minutos por entrada.

## Dungeons Iniciais

O lançamento inicial terá **8 dungeons**.

As 8 dungeons devem, em conjunto, sustentar a progressão do personagem do nível 1 ao nível 400 dentro da etapa Mortal.

As dungeons são feitas para serem repetidas. O jogador não precisa avançar para uma dungeon nova a cada entrada. A repetição faz parte do modelo de farm e permite escolher a atividade mais adequada para o personagem e o objetivo atual.

## Limites de Nível

Cada dungeon possui um intervalo de nível para entrada:

- Nível mínimo.
- Nível máximo.

O jogador só pode entrar quando seu nível estiver dentro do intervalo definido para aquela dungeon.

Os valores específicos de cada dungeon ainda serão definidos.

## Itens de Entrada

Algumas dungeons exigem itens específicos para permitir a entrada.

Esses itens podem ser comprados na cidade ou obtidos como drop durante o farm.

O item de entrada faz parte da economia e da preparação da expedição.

A lista de dungeons que exigem itens e os respectivos requisitos ainda serão definidos.

## Biomas

Cada dungeon possui um bioma próprio.

O bioma deve diferenciar visualmente e tematicamente cada área, além de permitir diferentes composições de inimigos e situações de farm.

## Arenas

As arenas são espaços de combate dentro da dungeon.

O jogador pode se movimentar livremente dentro dos limites da arena.

Não existe escolha de caminho entre arenas.

A estrutura é composta por espaços conectados previamente definidos pelo level design.

## Design Pré-Definido

A estrutura das dungeons é criada manualmente.

Não existe geração procedural como regra do sistema.

## Farm

O level design deve favorecer combate contínuo, leitura espacial e posicionamento.

Pontos de surgimento e respawn dos inimigos fazem parte do design de cada arena.

Nem todos os inimigos precisam perseguir o jogador. A distribuição dos spawns deve criar situações em que o jogador se desloca entre pontos de farm e escolhe posições eficientes.

## Progressão

As dungeons possuem dificuldade fixa e intervalos de nível definidos.

O objetivo é criar uma progressão clara entre as 8 dungeons e permitir que elas continuem relevantes como atividades repetíveis de farm.

## Duração

Cada entrada inicia um contador de 10 minutos.

Quando o contador chega a zero, a dungeon termina e o personagem retorna para a cidade.

O balanceamento deve considerar quanto de experiência, Ouro, equipamentos e outros recursos o jogador consegue produzir nesse intervalo.

## Bosses

Bosses podem ser inseridos em determinadas dungeons para criar encontros de maior dificuldade.

## Greybox

O primeiro desenvolvimento deve priorizar o greybox das arenas, a escala do personagem, a navegação, o posicionamento, a densidade de inimigos e o fluxo entre arenas antes da produção visual final.

## Proposta de Design

Valores para o protótipo e para a primeira passagem de conteúdo das 8 dungeons.

### Dungeon de referência do protótipo

- Nome provisório: Dungeon de Teste.
- Bioma: greybox neutro, sem direção de arte final.
- Faixa de nível: 1 a 20.
- Arenas: 3 arenas conectadas em sequência.
- Tamanho de cada arena: o suficiente para 3 a 5 spawns visíveis ao mesmo tempo.
- Transição: zona de contato simples entre arenas, sem loading e sem cutscene.
- Item de entrada: nenhum.
- Boss: opcional na última arena.

### Faixas das 8 dungeons de Mortal

Proposta de degraus para sustentar o nível 1 a 400. Os valores podem mudar no balanceamento.

| Dungeon | Nível mín. | Nível máx. | Papel no farm |
|---|---:|---:|---|
| D1 | 1 | 40 | Introdução e primeiro equipamento |
| D2 | 35 | 90 | Consolidação de build inicial |
| D3 | 80 | 150 | Primeiro salto de Ouro e refinamento |
| D4 | 140 | 220 | Pressão de posicionamento |
| D5 | 200 | 280 | Mix de perseguidores e longo alcance |
| D6 | 260 | 330 | Densidade alta de spawns |
| D7 | 310 | 370 | Preparação para o fim de Mortal |
| D8 | 350 | 400 | Farm de topo de etapa |

As dungeons continuam repetíveis fora do degrau de subida. O nível máximo bloqueia a entrada para evitar farm trivial fora da faixa.

### Itens de entrada

- D1 a D3: sem item de entrada.
- D4 a D6: item comprado na cidade ou obtido como drop.
- D7 e D8: item de entrada com custo maior, como sumidouro de Ouro.

### Transição entre arenas

- O jogador atravessa uma porta ou corredor curto.
- O contador de 10 minutos não é pausado nem renovado.
- Não existe escolha de caminho.

## Pendências

- Nome definitivo das 8 dungeons.
- Bioma de cada dungeon.
- Confirmar as faixas de nível da tabela.
- Quantidade final de arenas de cada dungeon.
- Tamanho de arte final de cada arena.
- Localização definitiva dos bosses.
- Recompensas específicas por dungeon.
- Lista exata de itens de entrada e preços.
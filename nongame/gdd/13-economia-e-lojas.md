# UAIDZIN

## Economia e Lojas

## Economia

A economia existe para transformar o resultado do farm em progressão.

O jogador obtém recursos através das dungeons e utiliza esses recursos na cidade para melhorar o personagem.

## Moeda Principal

**Ouro** é a moeda principal do jogo.

Ouro é obtido principalmente através do farm e da venda de itens obtidos nas dungeons.

Ele funciona como um dos principais recursos para sustentar a progressão do personagem.

## Refinamento

O refinamento de equipamentos possui custo em Ouro.

Além do Ouro, determinadas etapas utilizam materiais específicos, como:

- Poeira de Ori.
- Poeira de Lac.

A lista completa de materiais, suas funções e seus custos ainda será definida.

## Reset

O reset possui custo.

Para realizar um reset, o jogador deverá possuir Ouro e os itens ou materiais exigidos pelo sistema.

Os custos de reset devem funcionar como um dos principais sumidouros da economia e limitar a frequência dos resets conforme o balanceamento desejado.

## Lojas

A cidade possui lojas e NPCs responsáveis por sistemas de gerenciamento e progressão.

Entre as funções previstas estão:

- Venda de equipamentos e itens.
- Compra de itens, quando aplicável.
- Gerenciamento de recursos.
- Sistemas relacionados a refinamento e progressão.

A divisão exata das funções entre lojas e NPCs ainda será definida.

## Princípio

A economia não deve substituir o farm. O farm é a atividade que produz os recursos que movimentam a progressão.

Ouro e materiais devem criar decisões de uso dos recursos entre progressão, refinamento e resets.


## Proposta de Design

Economia de uma moeda principal, no espírito do Ouro de WYD, com sumidouros claros para reset e refine.

### Moeda

- **Ouro** é a única moeda do lançamento.
- Não existe moeda premium no jogo base.
- Gemas ou segunda moeda só se a monetização exigir, fora deste escopo.

### Fontes de Ouro

- Venda de equipamentos e itens.
- Drop direto de Ouro em monstros.
- Recompensa de quests.
- Bônus opcional de eventos.

### Sumidouros

- Refinamento.
- Reset.
- Itens de entrada de dungeon.
- Compra de livros de skill.
- Compra de materiais na loja.
- Redistribuição de atributos, skills e especialização.

### Refinamento

- Ouro + Poeira de Ori até +5.
- Ouro + Poeira de Lac de +6 a +10.
- Tabela de custo cresce a cada nível de refine.
- Ori cai em dungeons D1 a D4. Lac cai em D5 a D8 e em bosses.

### Reset

- 1º reset de Mortal: Ouro proporcional a várias entradas de dungeon da faixa atual + 1 Poeira de Lac.
- Resets seguintes em Mortal: custo cresce.
- Arch e Cele usam a mesma lógica com números maiores.
- O reset é sumidouro principal no fim de etapa, não no início.

### Lojas

- Mercador compra tudo que é vendável e vende itens de entrada e alguns materiais.
- Ferreiro vende Poeira de Ori básica.
- Livros de skill vendem no Mestre de Skills em quantidades limitadas ou por drop.
- Não existe leilão nem troca entre jogadores. O jogo é single-player.

## Pendências

- Tabelas numéricas de Ouro por monstro e por dungeon.
- Preço de cada item de entrada.
- Custo fechado de cada nível de refine.
- Custo fechado de reset por etapa e por repetição.
- Preço de venda por raridade.

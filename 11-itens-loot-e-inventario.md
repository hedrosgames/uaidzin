# UAIDZIN

## Itens, Loot e Inventário

## Equipamentos

O personagem possui equipamentos permanentes.

Slots definidos:

- Cabeça.
- Armadura.
- Arma.
- Anel 1.
- Anel 2.
- Colar.
- Brinco.

Os equipamentos permanecem com o personagem após os resets.

## Raridade

Os equipamentos possuem diferentes raridades.

A lista e a nomenclatura final das raridades ainda serão definidas.

A raridade deve influenciar o valor e o potencial do equipamento dentro da progressão.

## Atributos

Equipamentos podem possuir atributos próprios.

Esses atributos participam diretamente da construção de builds e da progressão de poder.

## Aprimoramento

Equipamentos podem ser aprimorados através de refinamento.

O sistema possui níveis como +1, +2 e progressões posteriores.

O refinamento é permanente e não é perdido quando o personagem realiza um reset.

Os custos de refinamento incluem Ouro e materiais específicos de aprimoramento.

## Loot

Inimigos derrotados podem fornecer equipamentos, experiência, Ouro e outros recursos.

Os equipamentos não caem fisicamente no chão para serem coletados.

Quando um item é obtido, ele é enviado diretamente para o inventário se existir espaço disponível.

Se o inventário estiver cheio, o item que seria obtido é perdido e o jogador recebe uma mensagem informando que o inventário está cheio.

O loot é uma das principais recompensas da atividade de farm.

## Inventário

O jogador possui inventário persistente para armazenar os itens obtidos durante as dungeons.

O inventário possui limite de espaço.

Quando o espaço fica insuficiente, o jogador precisa retornar à cidade para organizar o inventário, vender itens ou liberar espaço.

Os equipamentos podem ser vendidos.

## Venda de Itens

Equipamentos e outros itens definidos pelo sistema podem ser vendidos em lojas da cidade.

A venda transforma loot excedente em Ouro, a principal moeda da economia.


## Proposta de Design

Inspirado no farm de equipamentos de WYD, com inventário limitado que obriga retorno à cidade.

### Inventário

- 40 espaços de equipamento e item não empilhável.
- Materiais empilham até 999 por tipo.
- Ouro não ocupa espaço.
- Aviso visual a 80% de ocupação.
- Inventário cheio perde o item e informa o jogador.

### Raridades

| Raridade | Cor de referência | Papel |
|---|---|---|
| Comum | cinza | base do farm |
| Incomum | verde | um atributo simples |
| Raro | azul | um afixo forte |
| Épico | roxo | dois afixos |
| Lendário | dourado | drop raro ou marco de dungeon/boss |

### Atributos de equipamento

- Afixos possíveis: FOR, DES, CONS, INT, vida, dano de ataque, defesa, chance de acerto, chance de esquiva, velocidade de ataque, alcance, Ouro obtido, experiência obtida.
- Arma define o comportamento do ataque básico e o alcance base.
- Armadura e cabeça puxam mais defesa e vida.
- Acessórios puxam utilidade e atributos de personagem.

### Drop

- Drop vem do inimigo e vai direto ao inventário.
- Taxa base de equipamento por monstro: baixa. A densidade de 10 minutos compensa a taxa.
- Incomum e acima usam sorteio por raridade. Lendário quase só em boss ou marco.
- Materiais de refinamento caem de monstros comuns e de venda de equip.

### Refinamento

- Faixa de lançamento: +0 a +10.
- Sucesso diminui conforme o nível de refine.
- Falha no refinamento não destrói o item. Destruição por falha não entra no escopo atual.
- Custo: Ouro + Poeira de Ori em níveis baixos; Poeira de Lac a partir de +6.

### Valores de venda

- Venda por raridade e nível do item, com piso mínimo.
- Equipamento refinado vende por mais que a base, mas menos que o investimento total de refine. Evita exploit de refine só para vender.

## Pendências

- Tabela exata de drop por dungeon.
- Nomes finais das raridades.
- Chance exata de sucesso do refinamento por nível.
- Se falha de refine destrói item em níveis altos.
- Preços fechados de compra e venda.

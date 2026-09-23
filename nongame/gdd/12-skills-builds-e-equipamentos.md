# UAIDZIN

## Skills, Builds e Equipamentos

## Estrutura de Classes

Existem quatro classes de personagem.

A estrutura é inspirada no modelo de classes de WYD.

Cada classe possui três possibilidades principais de construção de personagem:

- **Controle:** build focada em controle e manipulação do combate.
- **Magia:** build focada em dano e recursos mágicos.
- **Física:** build focada em combate e dano físico.

A build correta deve potencializar o personagem. A escolha da árvore de skills, dos atributos, da arma e dos equipamentos deve funcionar em conjunto para criar uma construção eficiente.

## Árvores de Skills

Cada classe possui três árvores exclusivas de habilidades.

Cada árvore possui **8 skills**.

Além das três árvores exclusivas, cada classe possui uma **árvore comum**, composta por habilidades aprendidas através de livros.

A estrutura é inspirada diretamente no sistema de skills de WYD, adaptada para utilizar 8 skills por árvore em vez das 12 da referência.

Cada classe possui 3 árvores específicas, 8 skills em cada árvore específica e 1 árvore comum aprendida por livros.

## Regra da Oitava Skill

Dentro de cada uma das três árvores específicas da classe, o jogador pode comprar normalmente as primeiras 7 skills.

A **8ª skill** possui uma restrição de especialização. O jogador pode comprar a 8ª skill de apenas uma das três árvores.

Depois da escolha, as 8ª skills das outras duas árvores ficam indisponíveis para aquele personagem dentro da configuração atual.

Essa regra cria uma escolha real de especialização e impede que uma única build tenha acesso completo ao topo das três especializações ao mesmo tempo.

## Pontos de Especialização

Cada árvore possui seus próprios pontos de especialização.

Os pontos de especialização aumentam a efetividade das skills daquela árvore.

O sistema possui limite de pontos de especialização.

O jogador pode redistribuir esses pontos para alterar sua especialização e experimentar outras configurações de build.

A quantidade de pontos, os limites por árvore e a regra de redistribuição ainda serão definidos.

## Árvore Comum

A árvore comum contém skills obtidas através de livros.

Os livros funcionam como itens de aprendizado e fazem parte da progressão de habilidades do personagem.

A quantidade de skills da árvore comum e suas regras específicas ainda serão definidas.

## Automação

As skills podem funcionar automaticamente.

O jogador também pode desligar o uso automático e utilizar as skills manualmente.

O ataque básico continua sempre automático.

A automação permite que o personagem continue combatendo como parte do autofarm, enquanto o controle manual pode aumentar a eficiência.

## Builds

A build é formada pela combinação entre:

**Classe + Atributos + Árvore de Skills + Especialização + Arma + Equipamentos.**

A escolha correta dos sistemas deve potencializar o personagem e aumentar sua eficiência de farm.

O jogador pode alterar sua build através das formas de redistribuição permitidas pelos sistemas de atributos, skills e especialização.

## Equipamentos

Os equipamentos possuem raridade, atributos e níveis de aprimoramento.

Slots atuais:

- Cabeça.
- Armadura.
- Arma.
- Dois anéis.
- Colar.
- Brinco.

Equipamentos são patrimônio permanente e não são removidos durante o reset.


## Proposta de Design

Estrutura de classes e árvores inspirada em WYD, com quatro classes próprias. Os nomes de produção estão confirmados para o desenvolvimento.

### Classes

| Código | Nome de produção | Fantasia | Atributo principal |
|---|---|---|---|
| TK | Thegn Knight (Cavaleiro Thegn) | linha de frente, defesa e golpe pesado | FOR |
| FM | Frost Maiden (Donzela Glacial) | dano mágico à distância e controle | INT |
| BM | Beast Master (Mestre das Feras) | invocações e pressão de área | INT/CONS |
| HT | Huntress (Caçadora) | dano físico à distância e mobilidade | DES |

Cada classe mantém as três possibilidades Controle, Magia e Física, com peso diferente.

### Peso das builds por classe

| Classe | Controle | Magia | Física |
|---|---|---|---|
| TK | médio | baixo | alto |
| FM | alto | alto | baixo |
| BM | alto | médio | médio |
| HT | médio | baixo | alto |

### Árvores de skills

Cada classe possui três árvores específicas com 8 skills e uma árvore comum por livros.

#### TK

- Guarda: provocações leves, redução de dano, área de ameaça.
- Impacto: golpes de arma corpo a corpo, dano em cone.
- Ímpeto: avanço curto, quebra de postura, velocidade de ataque.

#### FM

- Véu: dano mágico direcionado, projéteis.
- Ruína: área no chão, dano em rajada.
- Domínio: silêncio curto, lentidão, escudo mágico.

#### BM

- Presas: dano físico de invocação e do próprio personagem.
- Matilha: aumenta quantidade e dano de invocados.
- Elo: cura leve, buffs de resistência, retorno de vida por dano.

#### HT

- Tiro: ataque à distância, crítico, perfuração.
- Trilha: armadilhas, lentidão, controle de spawn.
- Passo: velocidade, recuo, reposicionamento.

Valores de dano, cooldown e alcance ficam no balanceamento. A identidade de cada skill acima é regra de design.

### Árvore comum por livros

Skills de utilidade compradas/aprendidas com itens de livro:

- Vida máxima.
- Ouro obtido.
- Experiência obtida.
- Redução de cooldown.
- Chance de crítico.
- Alcance.
- Velocidade de ataque.
- Sorte de drop.

Cada skill de livro tem um nível máximo baixo, por exemplo 5.

### Regra de custo e requisitos

- Skill 1 da árvore: sem pré-requisito.
- Skills 2 a 8: exigem a skill anterior da mesma árvore no nível mínimo 1.
- Cada skill pode ser melhorada com pontos de skill até um teto, inicialmente 10.
- O nível 1 da skill 8 só pode ser comprado em uma árvore por personagem, conforme a regra já definida.

### Pontos de skill e especialização

- 1 ponto de skill por nível.
- Pontos de especialização são separados e por árvore.
- Limite inicial de especialização: 60 pontos no total, no máximo 40 na mesma árvore.
- Especialização aumenta efeito ou reduz cooldown das skills daquela árvore.
- Redistribuição de atributos e skills: permitida na cidade com custo em Ouro que cresce com o nível.
- Redistribuição de especialização: permitida na cidade, custo menor que skills.
- Livros não são perdidos no reset. As skills de livro permanecem.

### Automação

- Ataque básico: sempre automático, igual a Archero no princípio de não comandar cada golpe.
- Skills: automáticas por padrão. O jogador pode desligar por skill.
- Autofarm não anda. Continua sendo só combate no lugar.

## Pendências

- Confirmar nomes finais das quatro classes.
- Balancear valores de cada skill.
- Definir efeitos exatos das skills de livro.
- Fechar custos de redistribuição.
- Definir se especialização tem teto diferente por classe.

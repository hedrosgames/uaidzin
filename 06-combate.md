# UAIDZIN

## Combate

O combate é baseado em posicionamento, alcance e automação.

O jogador controla diretamente o movimento do personagem, mas não precisa comandar cada ataque.

A experiência busca reproduzir uma situação de farm inspirada em WYD. Muitos inimigos não perseguem o jogador. Eles possuem pontos ou áreas de spawn e permanecem nessas posições, fazendo com que o jogador se movimente para encontrar e aproveitar diferentes pontos de farm.

## Ataque Básico

O ataque básico é sempre automático e depende da arma equipada.

O personagem não ataca enquanto está em movimento. Por isso, o jogador precisa encontrar uma posição adequada, parar e permitir que o personagem ataque.

## Posicionamento e Farm

O movimento não existe apenas para esquivar.

Uma função importante é deslocar o personagem entre pontos de spawn e encontrar posições eficientes para atacar os inimigos disponíveis.

O jogador pode permanecer parado quando a composição da dungeon permitir.

O jogo não exige movimento constante.

A eficiência do posicionamento depende do comportamento dos inimigos, do alcance dos ataques, da distribuição dos spawns e da quantidade de inimigos que podem ser atingidos ou enfrentados simultaneamente.

## Comportamento dos Inimigos

Os inimigos podem utilizar diferentes comportamentos de posicionamento e perseguição.

### Inimigos de Spawn Fixo

Alguns inimigos nascem em locais determinados da dungeon e permanecem próximos ao seu ponto de origem.

Nesse caso, o jogador se desloca até o spawn, encontra uma posição eficiente e permanece atacando enquanto houver alvos.

### Inimigos que Perseguem

Algumas dungeons ou tipos de inimigo utilizam perseguição.

Nessas situações, o jogador pode permanecer parado se conseguir sustentar o combate.

Mesmo os inimigos que perseguem possuem uma distância mínima de aproximação. Eles não precisam ficar colados ao personagem.

### Inimigos de Longo Alcance

Alguns inimigos podem atacar à distância.

Eles criam pressão sobre o posicionamento e podem impedir que determinadas posições sejam completamente seguras.

A composição de cada dungeon pode combinar inimigos parados, perseguidores e inimigos de longo alcance.

## Habilidades

As habilidades pertencem à build do personagem.

Elas podem funcionar automaticamente ou ser utilizadas manualmente pelo jogador.

O ataque básico permanece automático independentemente da configuração das habilidades.

## Acerto e Esquiva

O combate utiliza chance de acerto e chance de esquiva.

O resultado do acerto não depende de uma esquiva manual do jogador.

O posicionamento continua sendo importante por causa do alcance, da distância, da concentração de inimigos e do comportamento dos ataques.

## Autofarm

O personagem consegue continuar combatendo sem controle constante do jogador.

O autofarm não movimenta o personagem. O deslocamento depende sempre do jogador.

## Morte

O personagem pode morrer dentro da dungeon.

Ao morrer, retorna à cidade. Os recursos já obtidos não são perdidos.

## Dano e Defesa

### Proposta de Design

Fórmulas e valores iniciais para o protótipo. O objetivo é validar sensação de posicionamento e farm, não balancear o jogo final.

### Fórmula de dano

- Dano bruto do personagem igual ao atributo de ataque da arma.
- Dano final igual ao dano bruto menos a defesa do alvo, com mínimo de 1.
- Ataques básicos da mesma arma usam o mesmo dano por golpe no protótipo.

### Acerto e esquiva

- Chance de acerto base de 95 por cento.
- Chance de esquiva base de 5 por cento.
- Esquiva é resolvida pela fórmula. Não existe i-frame manual.
- Distância e alcance continuam alterando se o golpe conecta.

### Velocidade e alcance

- Cada arma define um intervalo entre ataques básicos.
- O ataque básico só inicia com o personagem parado e o alvo dentro do alcance.
- Mover interrompe o ciclo atual de ataque e reinicia a cadência ao parar.

### Bosses

Dungeons podem possuir bosses com padrões e valores de combate próprios.

No protótipo, o boss usa os mesmos parâmetros de dano e defesa dos inimigos comuns, com mais vida e um ataque adicional.

## Princípio

A habilidade do jogador durante o combate está principalmente em escolher onde estar, quando parar para atacar, quais spawns farmar e, quando necessário, utilizar habilidades manualmente.

O objetivo não é exigir movimento constante. O objetivo é fazer o posicionamento produzir eficiência de farm.
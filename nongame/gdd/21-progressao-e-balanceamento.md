# UAIDZIN

## Progressão e Balanceamento

## Estrutura de Progressão

A progressão principal é permanente e baseada em farm.

O jogador utiliza experiência, equipamentos, atributos, skills, especialização e outros recursos para aumentar o poder do personagem.

## Níveis

Cada evolução possui sua própria faixa de nível:

- Mortal: nível 1 a 400.
- Arch: nível 1 a 400.
- Cele: nível 1 a 200.

Cada evolução possui seu próprio ciclo de reset.

## Atributos

O personagem possui FOR, DES, CONS e INT.

O jogador recebe 5 pontos de atributo por nível para distribuir.

Cada reset também concede, como valor inicial de design, 1.000 pontos de atributo adicionais.

## Skills e Especialização

Cada classe possui três árvores específicas com 8 skills cada, além de uma árvore comum aprendida por livros.

As primeiras 7 skills de cada árvore específica podem ser adquiridas. A 8ª skill é exclusiva de uma das três árvores escolhida pelo jogador.

Cada árvore possui pontos de especialização próprios, que aumentam a efetividade das skills daquela árvore.

Os pontos de especialização possuem limite e podem ser redistribuídos.

## Farm e Autofarm

O jogo possui uma estrutura de autofarm real.

O personagem consegue continuar combatendo sem controle constante do jogador, dentro das condições da dungeon.

O personagem não se movimenta sozinho. O deslocamento é sempre controlado pelo jogador.

O controle manual aumenta a eficiência do farm através de posicionamento, escolha de spawns, deslocamento entre pontos de farm e uso manual de habilidades.

O controle não substitui o autofarm. Ele funciona como uma camada de otimização sobre ele.

## Dungeons

O conjunto inicial possui 8 dungeons.

As dungeons devem sustentar a progressão do nível 1 ao 400 da etapa Mortal e continuar sendo atividades repetíveis de farm.

Cada dungeon possui nível mínimo de entrada, nível máximo de entrada, bioma próprio, dificuldade própria, recompensas próprias e estrutura de arenas definida manualmente.

Algumas dungeons exigem itens de entrada. Esses itens podem ser comprados ou obtidos através de drops.

## Unidade de Farm

Cada entrada em uma dungeon dura no máximo 10 minutos.

O balanceamento deve considerar a produção de experiência, Ouro, equipamentos e materiais durante esse intervalo.

A eficiência do personagem deve afetar a quantidade e a qualidade dos recursos obtidos.

## Reset

O reset é inspirado principalmente na lógica de progressão de MU.

O reset reinicia o nível, os atributos, as skills e o poder do ciclo atual. O personagem retorna ao nível 1 da evolução atual.

Como valor inicial de design, cada reset concede 1.000 pontos de atributo adicionais para a nova progressão.

O reset não remove equipamentos, refinamentos, inventário ou demais patrimônios permanentes.

Mortal, Arch e Cele possuem resets independentes. Resets acumulados em Mortal não são carregados para Arch, e resets acumulados em Arch não são carregados para Cele.

## Princípio de Balanceamento

O aumento de poder obtido por níveis, equipamentos, skills, especialização e resets deve melhorar a eficiência do farm sem eliminar completamente a relevância do posicionamento.

O jogador que controla manualmente seu personagem deve conseguir obter uma eficiência superior ao personagem deixado em autofarm, mas o jogo deve continuar produzindo progresso sem controle constante.

## Proposta de Design

Valores de partida para validar o loop de 10 minutos. Não são o balanceamento final.

### Unidade de farm

- Uma entrada de dungeon tem no máximo 10 minutos.
- O alvo de design é que um personagem eficiente produza o equivalente a cerca de 1 a 2 níveis de Mortal nos primeiros degraus e menos que isso no fim da etapa.
- A quantidade de Ouro por entrada deve cobrir melhorias pequenas em poucas execuções e melhorias grandes em várias execuções.

### Curva de XP de Mortal

- A curva é por degraus de dungeon, não exponencial contínua.
- Cada dungeon da tabela do capítulo de level design possui uma faixa de XP de monstro adequada ao nível dela.
- O protótipo pode usar XP flat por monstro dentro de cada faixa.

### Poder esperado

- O poder sobe com nível, atributos, equipamento e skills ao mesmo tempo.
- O personagem dentro da faixa da dungeon deve vencer com posicionamento razoável, sem precisar de gear de dungeon posterior.
- Pular degrau de dungeon deve ser possível com gear melhor, mas não deve ser o caminho padrão.

### Reset

- O valor de 1.000 pontos de atributo por reset vale para Mortal, Arch e Cele como baseline.
- Pontos extras além de 1.000 ficam para o balanceamento de etapas avançadas.
- Custo inicial de reset em Mortal: Ouro suficiente para representar várias entradas de dungeon, mais um material raro a partir do segundo reset.
- Frequência-alvo em Mortal: um reset a cada 8 a 12 horas de farm eficiente no fim da etapa.
- A fórmula de poder após o reset considera os 1.000 pontos e o equipamento mantido. O nível volta a 1.

### Autofarm e eficiência

- Autofarm produz progresso sem input constante.
- Controle manual deve superar o autofarm em eficiência por tempo, principalmente na escolha de spawns e no uso manual de skills.
- O jogo não deve punir quem deixa o personagem parado em um spawn eficiente.

## Pendências

- Confirmar a curva de XP por nível dentro de cada faixa.
- Definir o poder esperado por nível com equipamento médio da dungeon.
- Fechar drop e Ouro por dungeon com telemetria do protótipo.
- Ajustar pontos de reset além de 1.000 em Arch e Cele.
- Fechar o custo de reset por etapa.
- Medir a frequência real de reset com jogadores de teste.
- Definir a diferença de eficiência alvo entre autofarm e controle manual.
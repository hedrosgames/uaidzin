# UAIDZIN

## Controles e Câmera

## Controle do Personagem

O jogador controla diretamente o deslocamento do personagem durante as dungeons.

O foco do controle é o posicionamento dentro das arenas.

O personagem não possui movimentação autônoma. O autofarm mantém o combate funcionando, mas o deslocamento depende sempre do jogador.

## Movimento

O personagem pode se movimentar livremente dentro dos limites do cenário.

O sistema não utiliza caminhos pré-definidos.

O personagem não realiza o ataque básico enquanto está se movimentando.

## Ataque

O ataque básico é automático e não possui ativação manual.

As skills podem ser utilizadas automaticamente ou manualmente, conforme a configuração do jogador.

## Plataforma de Controle

O jogo será desenvolvido para navegador em desktop.

## Câmera

A câmera deve permitir que o jogador compreenda claramente o espaço da arena, os inimigos e o posicionamento do personagem.

## Proposta de Design

Valores iniciais para o protótipo em greybox. Devem ser validados com o jogo rodando e podem ser alterados sem reabrir o resto do GDD.

### Movimentação

- WASD move o personagem no plano da arena.
- Shift não altera a velocidade no protótipo.
- Não existe salto.

### Mouse

- Clique com o botão esquerdo move o personagem até o ponto clicado.
- O botão direito não possui função no combate.
- Não existe botão de ataque básico. O ataque é automático.
- Skills manuais usam teclas 1 a 4 ou clique nos ícones da HUD.

### Câmera

- Câmera fixa em perspectiva 3D com ângulo superior em três quartos.
- O jogador não rotaciona a câmera durante o combate.
- A câmera acompanha o personagem com deslocamento suave.
- Todas as arenas do protótipo usam a mesma distância e o mesmo ângulo.
- Rotação livre e enquadramento por arena ficam para depois da validação do loop.

### Comportamento em arenas

- Se a arena for maior que a tela, a câmera segue o personagem sem zoom automático.
- Não existe minimapa no protótipo.

## Decisões Pendentes

- Confirmar WASD e clique para mover no protótipo.
- Confirmar câmera fixa em três quartos.
- Definir se haverá opção de inverter o eixo ou zoom em acessibilidade.
- Avaliar rotação de câmera apenas depois do greybox.
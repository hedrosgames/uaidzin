# 03. Mundo 3D e Cidade

## Fase 2

Cidade **Aurelion** em greybox + câmera definitiva de protótipo.

## Câmera (confirmada)

- Perspectiva 3D com ângulo superior em três quartos.
- Fixa: o jogador **não** rotaciona.
- Segue o personagem com deslocamento suave.
- Mesma distância/ângulo em cidade e dungeons do protótipo.
- Sem zoom automático e sem minimapa no protótipo.

## Cidade Aurelion

Estrutura mínima:

- Praça central.
- Ponto do **Guarda do Portal** (seleção de dungeon).
- Pontos: Mercador, Ferreiro, Mestre de Skills, Sábio, Intendente, Mestre de Quests.
- Limites físicos claros.
- Sem loading interno.

Placeholders: cubos/cápsulas para prédios e NPCs.

## Movimento

- WASD no plano da arena/chão.
- Clique esquerdo: moveTo no ponto.
- Colisão simples com limites (caixa/plano). Rapier só se necessário.
- Sem salto. Sem movimentação autônoma.

## Transição cidade ↔ dungeon

Troca de mundo via `WorldManager`. Sem elevador/cutscene.

## Validação

Inicia na cidade, caminha, reconhece NPCs, interage (abre painel stub), entra em dungeon de teste vazia e volta.

## Saída

Hub jogável com câmera ¾ e movimento WASD/clique.

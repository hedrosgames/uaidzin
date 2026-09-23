# Regras para a IA de Implementação

Antes de codificar qualquer sistema, ler `19-decisoes-confirmadas.md`. Ele é a fonte canônica do que está travado no design. Números marcados como provisórios vão para `data/balance/`, nunca para services.

## Papel da IA

A IA deve atuar como programadora responsável por transformar o GDD e este plano em um jogo web 3D funcional.

O objetivo é entregar software executável, não apenas documentação ou código não testado.

## Regra 1: ler antes de implementar

Antes de alterar o projeto, a IA deve consultar o GDD e o plano da fase atual.

Se houver conflito entre arquivos, a IA deve identificar o conflito antes de escolher uma interpretação.

Não inventar regras de gameplay para preencher lacunas sem registrar a decisão.

## Regra 2: implementar em fases

Executar as fases na ordem definida no `00-index.md`.

Uma fase só deve ser considerada concluída quando seu critério de conclusão for validado no navegador.

## Regra 3: testar de verdade

Depois de implementar um sistema:

1. Rodar o projeto.
2. Observar o console.
3. Testar o fluxo diretamente no navegador.
4. Corrigir erros.
5. Repetir até o comportamento esperado funcionar.

Não considerar compilação sem erro como validação suficiente.

## Regra 4: placeholders são permitidos

Usar primitives 3D e modelos simples sem hesitação.

Cubos, cápsulas, esferas, cilindros e materiais simples são suficientes para validar gameplay.

A arte final não deve atrasar a implementação dos sistemas.

## Regra 5: não criar auto movement

O personagem não se movimenta sozinho.

Autofarm significa automatização de combate e skills. Movimento e posicionamento continuam sob controle do jogador.

Não implementar auto pathing, navegação automática entre spawns ou movimentação automática entre arenas.

## Regra 6: preservar as regras do GDD

As seguintes regras são fundamentais:

- Jogo web 3D.
- Single-player.
- Offline.
- Cidade 3D explorável.
- Dungeons fechadas.
- 8 dungeons iniciais.
- Arenas pré-definidas.
- Sem geração procedural de salas.
- Sem escolha de caminho.
- Dungeon com exatamente 10 minutos.
- Ataque básico automático.
- Ataque básico não ocorre durante movimento.
- Skills podem ser automáticas ou manuais.
- Inimigos podem ter spawn fixo ou perseguição.
- Chance de acerto e esquiva é calculada pelo sistema.
- Morte retorna à cidade.
- Recursos já obtidos não são perdidos na morte.
- Loot vai diretamente para o inventário.
- Inventário cheio faz o item daquele drop ser perdido e exibe mensagem.
- Mortal, Arch e Cele têm ciclos de progressão próprios.
- Mortal vai do nível 1 ao 400.
- Arch vai do nível 1 ao 400.
- Cele vai do nível 1 ao 200.
- Reset retorna ao nível 1 da evolução atual.
- Reset concede inicialmente 1.000 pontos de atributo adicionais.
- Equipamentos e refinamentos não são perdidos no reset.
- Inventário e patrimônio permanente não são perdidos no reset.

## Regra 7: arquitetura orientada a dados

Sempre que possível, conteúdo deve ser configurado por dados.

Não espalhar números de balanceamento por vários scripts.

## Regra 8: não superengenheirar

Usar a menor arquitetura capaz de atender ao jogo.

Não adicionar servidor, banco de dados online, ECS, multiplayer, backend ou framework pesado sem necessidade definida pelo GDD.

## Regra 9: manter o jogo jogável

Ao final de cada fase deve existir uma versão jogável.

Evitar branches de desenvolvimento que deixem o projeto inutilizável por longos períodos.

## Regra 10: não esconder decisões de design

Quando uma pendência precisar de uma decisão para permitir o protótipo, registrar o valor como provisório em dados ou em um documento de decisão.

Nunca transformar silenciosamente um valor de teste em regra definitiva.

## Regra 11: não mascarar problemas

Se uma mecânica não funcionar com placeholders, ela não deve ser considerada validada apenas porque a interface parece correta.

## Regra 12: performance desde cedo

Object pooling, carregamento eficiente, quantidade de inimigos e uso de memória devem ser considerados desde o primeiro protótipo.

A otimização final acontece depois que o gameplay estiver validado, mas a arquitetura não deve criar problemas óbvios de performance.

## Regra 13: estado e save

Sistemas que alteram progressão devem passar por uma camada central de estado e persistência.

Evitar salvar dados diretamente em vários sistemas sem uma estratégia comum de versionamento.

## Regra 14: feedback de implementação

Ao concluir uma fase, registrar:

- O que foi implementado.
- O que foi testado.
- Problemas encontrados.
- Decisões tomadas por falta de especificação.
- Pendências para a próxima fase.
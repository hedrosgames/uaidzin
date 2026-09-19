# 11. Conteúdo e Dados

## Fase 10

Tudo dirigido por dados.

## Dungeons

8 definições com ID, nome (placeholder), bioma (placeholder), faixa de nível (tabela do 19), arenas, spawns, inimigos, recompensas, item de entrada, boss.

Protótipo: Dungeon de Teste 1–20, 3 arenas.

## Inimigos

Stats + comportamento + drop table por ID.

## Itens

Equipamentos, materiais (Ori/Lac), livros, itens de entrada.

## Classes/skills

Data de árvores, custos, requisitos, efeitos stub, especialização.

## Balance

`data/balance/`: xp, gold, drop, refine, reset, combat.

Nada de mágica hardcoded em services.

## Expansão

Adicionar dungeon/inimigo/item = novo JSON, sem tocar no núcleo de combate.

## Validação

Criar D2 só alterando dados. Trocar drop de um monstro em JSON.

## Saída

8 dungeons Mortal em dados + Dungeon de Teste.

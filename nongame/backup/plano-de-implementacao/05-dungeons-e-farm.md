# 05. Dungeons e Farm

## Fase 4

Dungeon repetível de 10 minutos.

## Estrutura

- Áreas fechadas, arenas em sequência. **Sem procedural.**
- Protótipo: **Dungeon de Teste**, 3 arenas, níveis 1–20, sem item de entrada, boss opcional na última.
- Transição: corredor/porta simples. Timer **não** pausa nem renova.

## Entrada

Validar nível mín/máx e item de entrada quando houver.

## Timer

- 10:00 exatos ao entrar.
- Zero → resultado → cidade.
- UI mostra tempo restante.

## Spawns (data-driven)

Por spawn: posição, tipo de inimigo, comportamento, intervalo, quantidade.

## Farm / autofarm

- Movimento só do jogador.
- Autofarm = combate parado.
- Level design deve criar motivos para trocar de spawn.

## Boss

Suporte a boss em ponto definido. Placeholder: inimigo com mais vida + 1 ataque extra. Matar boss **não** encerra o timer.

## Validação

Entrar, timer corre, arenas, spawns, farm 10 min, retorno automático com resumo stub.

## Saída

Unidade de farm de 10 minutos funcional.

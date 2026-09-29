# Estado local do kit de ícones

## Construção do catálogo, interface e pipeline

- Estado: em andamento
- Início: 2026-09-28
- Escopo: extrair briefs das skills atuais; criar ícones vetoriais da interface; ligar skills do runtime a ícones por ID; otimizar PNGs com transparência; criar galeria e verificador.
- Estado atual: briefs de 100 skills/books gerados; 33 ícones vetoriais da interface criados; runtime das skills ligado por ID; pipeline com crop opcional de folha e saídas 64/128/256; galeria pronta.
- Validação: `npm run typecheck` falha em `src/domain/items/item-use.test.ts` por seis parênteses ausentes nas linhas 15–21; o arquivo está fora deste escopo e sendo editado em paralelo.

## Teste de folha de sprites

- Estado: em andamento
- Início: 2026-09-28
- Escopo: avaliar extração em lote a partir de folha; suportar retângulo `crop` por registro de source, gerar comparativo em 64/128/256 px.
- Critério: a arte recortada precisa manter silhueta clara e alpha; comparar visualmente os 16 primeiros itens com o padrão individual.

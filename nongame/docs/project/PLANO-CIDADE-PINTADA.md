# Plano de acabamento da cidade pintada

Data: 29/09/2026.
Branch de trabalho: `codex/visual-pintado-piloto`.
Estado: plano registrado a pedido de Felipe, antes de executar novas alterações.

## Objetivo

Concluir a migração da cidade para o estilo pintado aprovado, com materiais consistentes, vegetação integrada e custo adequado ao jogo no navegador. O chão foi aprovado como direção. A qualidade final da cidade ainda depende da revisão visual de Felipe.

Personagens e NPCs ficam para outra leva. Não alterar escala, animações, equipamentos, balanceamento ou saves nesta etapa.

## Estado atual

Já existem alterações locais para piso, praça, paredes, objetos, vegetação, fonte, braseiros e iluminação. Não é necessário reiniciar a migração.

- Piso e praça usam texturas pintadas WebP de 1024 × 1024.
- Pedra e madeira compartilham texturas de 512 × 512.
- A vegetação usa uma textura transparente de 512 × 256, com quatro triângulos por tufo e quantidade ajustada pela qualidade gráfica.
- Os materiais dos objetos foram simplificados; a água recebeu um tratamento próprio e mais leve.
- A iluminação distingue cidade e dungeons. Há limitação da frequência de atualização das sombras na cidade.
- A validação registrada não apontou erros de página, objetos ausentes ou falha na restauração da iluminação após cidade → cemitério → cidade.
- O typecheck passou na rodada anterior. Não há medição comparativa de FPS que permita afirmar ganho de desempenho.

Capturas atuais: `game/art/style-pilot/cidade-pintada-geral.png`, `cidade-pintada-praca.png` e `cidade-pintada-mercado.png`.

## Problemas ainda visíveis

1. A vegetação forma massas muito repetidas e densas. Alguns tufos parecem flutuar ou se apoiar diretamente no pavimento, deixando a transição do canteiro artificial.
2. Paredes, carroça e barracas ainda têm volumes arredondados e sombras que podem transmitir aspecto emborrachado. A textura pintada, sozinha, não resolve toda a leitura dos modelos.
3. O piso e a praça estão mais claros e uniformes que a referência. É preciso preservar a leitura dos caminhos sem deixar o ambiente lavado.
4. O exterior da muralha aparece como um plano lilás com bordas evidentes nos enquadramentos abertos.
5. A água tem boa separação de cor, mas os filetes brancos e as ondas precisam ser avaliados em movimento para evitar aparência de linhas rígidas.
6. A captura de teste exibe `dungeon-test` no HUD e um personagem sem leitura adequada. É necessário separar artefato do ambiente de captura de problema real do jogo, sem alterar a escala do personagem.

## Ordem de execução

### 1. Confirmar o ponto de partida

- Registrar e iniciar a tarefa no painel da sessão, quando disponível.
- Conferir o diff atual e preservar as alterações anteriores, inclusive as armaduras fora deste escopo.
- Consultar os inventários de modelos do mundo e shaders antes de editar os arquivos afetados.
- Usar a câmera normal do jogo como principal critério visual; enquadramentos ampliados servem para inspecionar detalhes.

Entrega: estado recuperado e referência de comparação definida, sem refazer o que já está aprovado.

### 2. Integrar vegetação e chão

- Reduzir a repetição visual e distribuir os tufos em grupos com tamanhos e espaçamentos variados.
- Corrigir contato com o solo e transição entre terra, grama e pedra.
- Reservar áreas de respiro e manter caminhos, acessos aos NPCs e praça legíveis.
- Ajustar contraste e saturação do verde para acompanhar os tons pintados do chão.
- Reutilizar a textura existente antes de considerar uma nova geração.

Arquivos principais: `CityLandscape.ts`, `CityGround.ts` e `GroundBake.ts`.

Entrega: canteiros naturais na câmera de jogo, sem aparência de tapete repetido ou plantas flutuantes.

### 3. Harmonizar objetos e muralhas

- Revisar pedra, madeira, tecido e metal lado a lado.
- Reduzir brilho e contraste pequeno que reforcem o aspecto plástico, mantendo diferença entre os materiais.
- Ajustar a escala de aplicação das texturas e evitar manchas esticadas ou detalhes excessivos.
- Preservar a silhueta e as texturas características das barracas. Não remodelar toda a cidade nesta etapa.

Arquivos principais: `CityPropMaterials.ts`, `CityPaintedMaterials.ts` e `CityWorld.ts`.

Entrega: paredes, barracas, carroça, baú e fonte com a mesma linguagem visual do piso.

### 4. Refinar iluminação, fonte e fogo

- Equilibrar luz e sombra para recuperar volume sem escurecer os caminhos ou estourar os tons claros.
- Resolver a borda visível do exterior com uma solução simples de cenário ou enquadramento compatível com a câmera normal.
- Avaliar água em movimento e suavizar filetes e ondas se estiverem rígidos demais.
- Conferir se o fogo mantém silhueta clara e movimento orgânico, sem custo desnecessário de luzes e transparências.
- Preservar o portal, que já foi avaliado positivamente.

Arquivos principais: `SceneRenderer.ts`, `CityScenery.ts`, `FountainWater.ts` e `Brazier.ts`.

Entrega: conjunto coerente em movimento, sem mudar a aparência das dungeons por acidente.

### 5. Validar e preparar a entrega

- Executar `npm run typecheck` e `git diff --check`.
- Fazer uma única rodada visual na cidade, com câmera normal e dois detalhes relevantes.
- Conferir carregamento de texturas, erros de shader, qualidade baixa/média e retorno do cemitério para a cidade.
- Investigar a captura com personagem sem leitura sem tocar em `fitStandingHeight`, `TARGET_HEIGHT` ou escala dos modelos.
- Conferir custo de renderização no mesmo enquadramento; só anunciar ganho de FPS se houver comparação confiável.
- Atualizar o manifesto do piloto, hoje ainda descrito como etapa exclusiva de chão.
- Entregar capturas reais e uma descrição curta das mudanças e limitações.

Entrega: implementação testada, pronta para validação visual de Felipe. Não marcar aprovação artística como concluída sem essa validação.

## Restrições de desempenho e escopo

- Preferir materiais e texturas compartilhados, instâncias e mapas pequenos.
- Evitar novos efeitos de pós-processamento, luzes com sombra e texturas grandes sem necessidade demonstrada.
- Não prometer resolução de silhuetas arredondadas apenas com shaders.
- Não expandir esta rodada para personagens, dungeons ou interface.
- Não gerar novas imagens antes de avaliar se os ajustes existentes bastam.
- Não fazer commit ou push sem pedido explícito.

## Critérios de aceite

- Chão, vegetação e objetos parecem pertencer ao mesmo estilo pintado.
- Caminhos e pontos de interação continuam claros na câmera normal.
- Vegetação assentada no terreno, sem padrões muito evidentes.
- Fonte e fogo convincentes em movimento, dentro da direção estilizada.
- Sem vazamento das configurações da cidade para as dungeons.
- Typecheck e verificação pontual de runtime aprovados; nenhum comentário ou log de debug novo no código.
- Capturas correspondem ao jogo executando, com limitações explicitadas.
- Felipe valida o resultado visual antes do encerramento artístico.

# Visual pintado e desempenho global

Data: 29/09/2026. Branch: `codex/visual-pintado-piloto`.

Pedido atual de Felipe amplia o plano da cidade para todo o runtime. As referências guiam materiais pintados, luz quente, sombras lilás, vegetação em grupos e leitura dos caminhos. A câmera fica mais inclinada para o chão. Felipe autorizou separadamente as correções de calibração do player e dos inimigos após confirmação das causas. A calibração continua única por carregamento; alturas previstas, atributos, recompensas e saves foram mantidos.

## Ponto recuperado

O outro agente criou `PLANO-CIDADE-PINTADA.md`, depois de integrar materiais da cidade. Há alterações locais em dez arquivos e `CityPaintedMaterials.ts`, além de texturas WebP e capturas. O plano ainda prevê acabamento da grama, objetos, exterior, água, fogo e validação. O manifesto do piloto descreve apenas chão e precisa refletir a entrega real.

Código atual supera os inventários antigos: D1 tem três zonas cercadas, dois portões animados e ilha; D2 tem cemitério próprio; D3–D8 utilizam o mundo compartilhado. `Planos/Dungeon 1.md` descreve outra versão do gameplay e não será executado como requisito deste pedido.

## Painel da sessão

As ferramentas `task create/start/done/block` não estão expostas nesta sessão e o comando local `task` não existe. Este registro mantém as tarefas e os testes sem inventar uma integração com o painel.

| Tarefa | Estado | Entrega/teste |
|---|---|---|
| V01 Recuperar plano e diff | Verificado | Histórico, inventários, plano anterior e diff local conferidos; baseline em `global-antes-*` |
| V02 Cidade e câmera | Testado; aceite visual pendente | Grama alta, objetos pintados, exterior harmonizado; câmera mais inclinada, zoom padrão 0,7 e far 90 |
| V03 Estilo em todas as dungeons | Testado; aceite visual pendente | Piso, madeira, pedra e vegetação nos três builders de D1–D8; água leve e identidade do cemitério |
| V04 Ampliar as três zonas da D1 | Testado; aceite visual pendente | 4× área física: 18×18 → 36×36, 18×18 → 36×36, 18×20 → 36×40. Spawns e portões conferidos |
| V05 Materiais de personagens/NPCs | Testado; aceite visual pendente | Acabamento compartilhado; sete NPCs com modelos existentes; nenhum cilindro permanente na cidade |
| V06 Desempenho e QA | Verificado tecnicamente | Typecheck, build, smoke e cinco regressões passaram; qualidades e transições sem erros de página/shader. GPU medida em cenas estáticas, sem FPS de combate |
| V07 Corrigir calibração do personagem | Testado | Removidas sobrescritas fixas que tornavam as classes minúsculas; pose nativa aplicada antes da medição Y; escala estável em cinco animações de quatro classes |
| V08 Corrigir adaptação de clipes de inimigos | Testado | Clipes externos preservam comprimentos dos ossos e escala; rotações continuam animadas |
| V09 Preservar escala de importação dos inimigos | Testado | Fator de encaixe multiplica a escala importada; bounds da pose em pé; lobo ~1,26 m, esqueletos ~1,63/2,05 m |
| V10 Reorientar direção artística após revisão | Aguarda Felipe | Capturas reais entregues para confronto com a referência; não considerar o resultado visual aprovado |
| V11 Completar acabamento do mundo compartilhado | Testado; aceite visual pendente | D3–D8 usam vegetação pintada e esqueletos existentes no lugar de cápsulas permanentes; atributos originais |
| V12 Tornar smoke compatível com carregamento visual | Testado | Smoke aguarda o fim do fade e observa eventos de MISS/morte; combate, save, cofre e retorno passaram |
| V13 Repintar atlas das quatro classes | Testado; aceite visual pendente | Quatro WebP 1024² (~1 MB total). Shader protege pele, cabelo, couro e tecido consultando o atlas original; pintura entra na máscara dourada |
| V14 Manter personagens coerentes na seleção | Testado; aceite visual pendente | Módulo real de seleção usa os mesmos atlas/acabamento; quatro previews renderizaram sem erros |
| V15 Acabamento da água na inspeção geral | Testado; aceite visual pendente | Ondas com contraste reduzido e dois senos leves; entrada real da D1 e captura das três zonas conferidas; build passou |
| V16 Medir custo de renderização e testar D3–D8 | Testado | Intel UHD/D3D11, três qualidades nos quatro mundos; D3–D8 entraram pelo fluxo real com selos de QA, spawns dentro dos limites e modelos carregados |
| V17 Suavizar a pintura das armaduras | Testado; aceite visual pendente | Peso máximo 0,45 de pintura nas regiões douradas; quatro classes e seleção renderizaram sem erros; typecheck e build passaram |
| V18 Harmonizar materiais das armas | Testado; aceite visual pendente | Nove conjuntos renderizaram com material compartilhado; escala estável, nenhum erro de página/shader; encaixes e animações preservados |
| V19 Definir arte das invocações BM | Aguarda definição de Felipe | Cinco cápsulas no SummonView; somente lobo possui GLB existente. Referências aprovadas não definem condor, urso, tigre ou dragão |
| V20 Corrigir rostos e deformação | Diagnóstico testado; acabamento facial parcial | Pesos, juntas e bind sem defeito encontrado nas quatro classes. Material protege pele e reduz metalização/tinta lilás. TK ainda tem detalhe facial suavizado no atlas original; repinturas que deslocaram UV foram rejeitadas |
| V21 Aplicar as doze armaduras | Testado; aceite visual pendente | Ouro, prata e adamant por peitoral salvo; 15 testes focados, troca sem alterar escala/rig e sem substituir material do ghost; galeria dos 12 renders e seleção real recuperando prata do save |
| V22 Unificar direção artística dos três cenários | Testado; aceite visual pendente | Meadow/earth separados, novas lâminas de grama 512², massas de vegetação no cemitério, iluminação revisada e caminhos claros; três qualidades e transições sem erro |
| V23 Validação visual coordenada | Testado; limite artístico registrado | Build/typecheck/smoke passaram; renders dos 12 conjuntos e três cenários; A/B de MSAA e FXAA medido localmente; preview salvo prata validado no iframe real; nove regressões de armadura/escala/clipes passaram |
| V24 Fechar acabamento dos personagens e cenários | Em execução | Recuperar definição dos rostos sem deslocar UV, harmonizar as três famílias de armadura e revisar luz/sombra contra referência |
| V25 Validar movimento e combate | Em execução | Medição com simulação ativa, inimigos, ataques e VFX; capturas finais e confronto artístico |
| V26 Consolidar alterações e fazer merge na main | Em execução | Pedido explícito de Felipe em 30/09; agente Sol 6.1 consolida trabalho atual, valida e faz merge local antes de continuar o acabamento visual |

Em 30/09 Felipe retomou a execução e delegou a direção visual ao agente principal, autorizando agentes Sol 6.1 para diagnóstico e código. O alvo desta rodada é cidade, cemitério, campo de treinamento e quatro personagens com três armaduras cada. Invocações não bloqueiam esta rodada. Não pedir aprovação intermediária para ajustes já autorizados.

## Execução e aceite

1. Capturar cidade, D1, D2 e mundo compartilhado com a câmera normal antes das mudanças e registrar draws/triângulos por qualidade.
2. Reutilizar texturas pintadas existentes; trocar microdetalhe procedural caro por mapas pequenos e padrões amplos. Preservar o portal aprovado.
3. Corrigir contato e distribuição da grama. Dividir instâncias em setores espaciais mantendo ajustes de qualidade em cada setor.
4. Harmonizar todos os mundos com luz quente/fria consistente, conservando a atmosfera do cemitério e sem novos pós-efeitos caros.
5. Aplicar ampliação da D1 após esclarecer a medida. Não multiplicar quantidade de monstros ou alterar atributos.
6. Medir custo no mesmo viewport; redução de draws/triângulos não constitui medição de FPS em máquina real.
7. Executar typecheck, smoke, verificações de portões, spawns, limites, shaders, transições e qualidades. Entregar capturas reais.

Conclusão técnica exige testes verdes. Aprovação visual depende de Felipe. O pedido de 30/09 autoriza commit e merge local na main; push não foi solicitado.

## Resultado da verificação

`npm run typecheck`, `npm run build`, `npm run smoke` e os cinco testes novos de calibração/clipes passaram. O build mantém aviso de chunk Three.js acima de 650 kB. QA Playwright cobriu quatro classes, sete NPCs, cidade → D1 → D2 → mundo compartilhado → cidade, três qualidades, spawns, zonas e portões. Detalhe de personagens e seleção possuem capturas próprias; `global-final-*` usa a câmera normal.

Uma bateria existente selecionada apresentou cinco falhas: expectativa do set padrão no teste de PlayerView, expectativa de descarte da geometria compartilhada no teste de EnemyRuntimeView e ausência de DOM nos três testes de DungeonFlow. Não se afirma que a suíte inteira está verde; esses testes não foram alterados nesta tarefa. A revisão manual do diff foi realizada; CodeRabbit CLI não está disponível.

Otimizações estruturais: grama com 4–6 triângulos por tufo, setores com culling, mapas de cor pequenos, remoção de micro-FBM/reflexão dos personagens, far 90, orçamento de luzes locais e atualização de sombras limitada. Modelos adicionados aos NPCs e ao mundo compartilhado também têm custo. A medição local abaixo isola renderização; o ganho líquido em combate contra a branch anterior não foi quantificado.

Atlas e prompts: `game/art/style-pilot/atlas-personagens.json`. Capturas intermediárias desta sessão foram preservadas fora do repo em `C:\Users\Felipe\AppData\Local\Temp\uaidzin-texture-review\intermediarios-visual-global`.

`fase1-zonas-ampliadas.png` é inspeção do layout completo com câmera de diagnóstico distante e sem névoa. Não representa o enquadramento normal do jogo, registrado em `global-final-dungeon-1.png`.

## Medição local de renderização

Chromium 153 headless, ANGLE Intel UHD/Direct3D11, viewport 1440×900, DPR 1. Temporizador `EXT_disjoint_timer_query_webgl2`, 60 quadros de aquecimento e 180 amostras por mundo/qualidade. Simulação congelada somente no navegador de QA; câmera normal e cenário conferido antes/depois. Código do jogo não ganhou modo de congelamento. Relatório completo: `game/art/style-pilot/desempenho-local.json`.

| Mundo | GPU mediana no médio | GPU p95 no médio |
|---|---|---|
| Cidade | 8,85 ms | 10,16 ms |
| D1 | 8,08 ms | 9,09 ms |
| Cemitério | 9,12 ms | 10,69 ms |
| Compartilhado D3–D8 | 8,58 ms | 9,80 ms |

Isso não equivale a FPS final: simulação, combate, resolução/DPR maiores e outras cargas da máquina mudam o resultado. O relatório também guarda intervalos entre quadros, incluindo picos, sem descartá-los. A primeira tentativa, com simulação ativa, retornou à cidade por morte no cemitério; foi substituída integralmente por esta medição com identidade de cenário verificada.

Comparação controlada no mesmo cenário e qualidade média, antes do último ajuste de pigmentos/armas: sombras limitadas versus atualização a cada quadro. Cidade: média de 95,4 versus 147 draws, GPU média 8,14 versus 9,20 ms. D1: 62 versus 66 draws, GPU média 8,81 versus 9,03 ms; diferença pequena, sem afirmar ganho significativo de FPS. Relatório: `game/art/style-pilot/sombras-comparacao.json`. Não é comparação com a branch antiga.

As seis entradas de D3–D8 foram verificadas separadamente com simulação normal e selos criados pela fábrica de itens em um perfil isolado de QA. Todos os spawns ficaram dentro do mundo compartilhado; representações permanentes carregaram os GLBs. `armas-pintadas.json` registra os nove conjuntos de armas e estabilidade de escala.

## Lacuna visual descoberta

`SummonView` ainda representa as cinco invocações do Beast Master por cápsulas. Existe GLB de lobo, mas não há modelos de condor, urso, tigre ou dragão no projeto. Essa lacuna não bloqueia o recorte atual de cidade, cemitério, campo e quatro classes. Não está resolvida pela troca dos materiais.

## Rodada de 30/09 — personagens e cenários

O agente principal conduziu decisões de arte, geração de texturas e inspeção dos renders. Agentes Sol 6.1 verificaram rigs, integração das armaduras e custo de MSAA. Os 12 atlas de origem em `game/art/armor-variants` foram preservados; cópias WebP 1024² estão em `public/textures/armor-painted`.

O shader consulta a textura original para preservar rosto, cabelo, tecido e couro. As variantes afetam a região dourada; a pele tem metalness zero e roughness 0,96. O dourado recebe contraste de pigmentos sem deslocar detalhes UV. Os três acabamentos são derivados de `armor_chest_{classe}_{variante}`, sem novos campos de save ou alteração de atributos. A seleção consulta o peitoral salvo.

Não foi encontrada dissolução geométrica da cabeça nos clipes amostrados. O rosto do TK já é suavizado no atlas do GLB. Uma tentativa de restauração gerada inventou detalhes em outras ilhas UV e foi rejeitada antes de integrar. O atlas prateado inteiro também produziu manchas faciais e foi rejeitado como fonte de pele. Essa limitação permanece explícita em V20; o visual não está declarado equivalente à referência.

Novas bases de meadow e earth usam pinceladas amplas separadas. A textura do mato agora tem lâminas abertas e base estreita, evitando a silhueta retangular dos tufos anteriores. O cemitério usa grupos maiores de vegetação e tons frios. As três zonas da D1 continuam retangulares e com 4× a área inicial. Prompts em `game/art/style-pilot/texturas-terreno-v2.json`.

MSAA 2 amostras foi rejeitado: nesta Intel UHD, GPU mediana foi de 8,69 para 16,37 ms na cidade e de 9,14 para 16,16 ms na D1. FXAA ficou em 10,18 ms na cidade e 9,75 ms na D1 em outro A/B, ante 7,98 e 8,72 ms sem FXAA. É custo de acabamento, não ganho de desempenho. FXAA entra no composer dos níveis médio/alto; baixo continua sem pós-processamento. Medição estática 1440×900/DPR1, 60 quadros de aquecimento e 120 amostras; não representa FPS de combate.

Inspeção posterior identificou dois triângulos desconectados no TK_Body, causando uma tira junto ao rosto. A limpeza compartilhada pelo runtime e pela seleção confere índices e posições antes de remover somente essas faces. Quatro testes com os GLBs reais passaram, preservando todos os atributos e transformações. O combate medido antes do merge é uma linha de base parcial: D1 teve deslocamento e golpes; D2 não confirmou deslocamento e nenhum cenário confirmou skill ativa. Repetir após integrar a main.

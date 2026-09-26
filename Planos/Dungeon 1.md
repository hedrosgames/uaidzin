# Dungeon 1 — plano de funcionamento completo

**Status:** plano de implementação; o runtime ainda não foi alterado por este documento.

**Repositório:** `Planos/Dungeon 1.md` na `main` · Revalidar assinaturas e paths no código antes de cada fase.

**Escopo revisado:** fluxo de Dungeon no jogo — dados, construção do mundo, colisão, combate e inimigos, inventário, save, HUD/interações e QA.

## 1. Objetivo

Entregar a Dungeon 1 como uma dungeon jogável, repetível e composta por **três zonas lineares**, cada uma com a mesma área da cidade (**36 × 36 unidades de jogo**). Dois portões físicos conectam as zonas e um terceiro portão, na Zona 3, protege o portal de saída. Cada boss concede a chave do portão seguinte — o Boss 3 concede a chave do portão de saída. Ao se aproximar do portão correto com sua chave no inventário, ele abre e consome exatamente uma chave; depois de abrir o portão final, o jogador usa o portal de saída atual.

Manter as regras existentes da D1:

- Dungeon `dungeon-1`, Mortal, níveis **1–40**.
- Sem item para entrar.
- Run de **600 segundos**, iniciada uma vez por entrada; passar de zona não reinicia o contador.
- Dungeon repetível; morte, saída voluntária ou fim do tempo retornam o jogador à cidade.
- XP, Ouro e itens obtidos continuam sendo salvos durante a run.
- Primeiro delivery pode usar geometria greybox/procedural. Arte final não é pré-requisito para testar o funcionamento.

## 2. Regras de produto fechadas

Este plano fixa as regras abaixo para não deixar decisões em aberto durante a implementação:

1. A D1 tem **três zonas lineares**, cada uma com área de 36 × 36.
2. Existem **três portões**: dois portões de progressão, um entre a Zona 1 e 2 e outro entre a Zona 2 e 3; e um portão de saída na Zona 3, entre o Boss 3 e o portal atual. O portal só pode ser alcançado depois que o terceiro portão abrir.
3. Existe **um boss residente em cada zona**. Cada boss concede a chave do **próximo** obstáculo: Boss 1 → passagem Zona 2; Boss 2 → passagem Zona 3; Boss 3 → loot de boss + chave do portão de saída (antes do portal).
4. “Sempre disponível” significa que cada boss está configurado desde o início da run e reaparece na própria zona após o cooldown atual de **180 segundos**, sem quest ou gatilho adicional de spawn. A progressão linear continua exigindo abrir o portão anterior para chegar fisicamente às Zonas 2 e 3. O valor vem de `DUNGEON_BALANCE.boss.respawnSeconds` e não será alterado neste plano.
5. Chaves são itens stackáveis do inventário normal e persistem como os demais itens. Chave não usada permanece após saída, morte ou reload; chave usada é removida. Se o jogador já possui a chave correta, o boss correspondente não gera cópias extras.
6. Todos os portões abrem automaticamente quando o jogador chega perto do portão correto com sua chave. Não há confirmação por E, janela modal nem consumo de chave errada. O portal final mantém a interação atual depois que o portão de saída abre.
7. Cada chave é concedida deterministicamente ao derrotar o boss correspondente, antes do save feito no fluxo da morte. Se o inventário não aceitar a chave, o jogador recebe aviso e poderá derrotar novamente o boss após seu respawn.
8. Chegar à Zona 3 ou derrotar o Boss 3 não encerra nem renova a sessão de farm de 600 segundos. Permanecem válidos o portal de saída, o retorno por morte e o retorno ao fim do timer.

Fluxo fechado:

```text
Cidade
  → Zona 1 + Boss 1
  → Chave do Portão 1
  → Portão 1 abre e consome a chave
  → Zona 2 + Boss 2
  → Chave do Portão 2
  → Portão 2 abre e consome a chave
  → Zona 3 + Boss final
  → Chave do Portão de Saída
  → Portão de Saída abre e consome a chave
  → Portal de saída / fim do tempo / morte
  → Cidade
```

A D1 tem três portões e três chaves correspondentes, uma por boss. Não há progresso de quest nem recompensa de conclusão nesta arquitetura.

### 2.1 Tabela boss → chave → portão

Os IDs de chave nomeiam o **destino** após o portão, não a zona do boss.

| Zona | Boss (spawn id) | Chave concedida | Portão que consome | Gate id |
|---|---|---|---|---|
| 1 | `d1-a1-f1` | `d1_key_zone_2` | progressão 1→2 | `d1-gate-1` |
| 2 | `d1-a2-f1` | `d1_key_zone_3` | progressão 2→3 | `d1-gate-2` |
| 3 | `d1-a3-boss` | `d1_key_exit` | saída (portal) | `d1-gate-exit` |

Chave **não consumida** de uma run anterior permanece no inventário e pode abrir o portão correspondente numa run nova, sem exigir novo kill — desde que o jogador ainda não tenha consumido essa unidade.

## 3. Arquitetura escolhida

A D1 usa os sistemas atuais do jogo e acrescenta apenas os contratos e estados necessários para as três zonas. A arquitetura tem uma única definição de conteúdo, um único world durante a run e uma única `DungeonRun` até o retorno à cidade.

### 3.1 Fonte de verdade e responsabilidades

| Camada | Responsabilidade definida |
|---|---|
| Dados | `dungeons.json` descreve as três zonas, os três portões, os bosses, spawns e IDs de chave. `dungeon-definitions.ts` tipa esses dados. Coordenadas e requisitos não são duplicados em código de sessão. |
| World | `Dungeon1WorldBuilder` consome os dados da D1 e monta **um** `BuiltWorld` `dungeon-1` de 36 × 108, com três módulos de 36 × 36. Ele cria chão, muralhas, gates, colisores e o interactable do portal de saída atual. Não controla inventário, timer nem recompensa. |
| Estado efêmero da run | `DungeonRun` continua dono do timer, XP e kills. Adiciona apenas o conjunto `openedGateIds`, limpo em `start()` e `reset()`. A zona atual é derivada da posição do jogador contra os limites definidos em `DungeonZoneDef`; não é salva nem mantida em uma segunda variável. |
| Regra de chave/portão | Um `DungeonGateService` pequeno e restrito à D1 valida zona de origem, chave exigida pela recompensa da zona, quantidade no inventário e estado do gate. Usa `InventoryService.countMaterial()` e `consumeMaterial()`, e registra a abertura em `DungeonRun`. Não acessa Three.js nem salva diretamente. |
| Apresentação do portão | Cada gate do `BuiltWorld` tem um handle simples com `open()` e `reset()`. O handle alterna o visual fechado/aberto e controla o collider dinâmico: remove a colisão ao abrir e a restaura no reset da próxima run. Sem animação/timer próprio. |
| Orquestração | `CityGameSession` inicia a run, calcula a zona pela posição, chama o serviço quando o jogador entra no raio de um gate, aplica a abertura no handle, escreve feedback e salva as mutações. A sessão é a única camada que coordena domínio, world, save e HUD. |
| Boss e inimigos | Cada `ArenaDef` da D1 pertence a um `zoneId`; `EnemyService` copia esse ID para `EnemyModel`. `grantKillXp()` continua sendo o ponto único de recompensa. `EnemyAI` e as consultas de alvo recebem a zona do jogador e não atravessam os limites de uma zona/gate fechado. |
| Persistência | A chave usa a forma atual de `ItemInstance` e a lista `inventory.items`; não existe save de gate nem retomada da run. Salvar imediatamente após conceder ou consumir item segue o contrato atual de save por kill. |
| UI | `GameApp` exibe zona e mensagens usando HUD/log/toast atuais. `WireUi` mantém a mochila e resolve o ícone existente na rota `/wire/assets/`. Nenhum novo painel/modal é criado para os gates. |

### 3.2 Contratos de dados

- `DungeonZoneDef` contém `id`, `label`, `centerX`, `centerZ`, `width`, `depth`, `bossSpawnId` e `keyRewardItemId`. As três zonas definem a chave que seus bosses concedem.
- `DungeonGateDef` contém `id`, `fromZoneId`, `toZoneId` (`null` somente no portão de saída) e posição/orientação. Cada gate usa o `keyRewardItemId` da zona de origem como chave exigida, evitando duplicar o mesmo ID em dois registros.
- `ArenaDef` ganha `zoneId` opcional. A D1 informa o valor em cada uma das suas três arenas; as demais dungeons continuam usando o contrato legado sem zonas/gates.
- `DungeonDef.zones` e `DungeonDef.gates` são opcionais para não exigir migração nem reescrita de D2–D8.
- Um único `CITY_WORLD_SIZE = 36` compartilhado define o lado da cidade e de cada módulo da D1. A largura total do mapa é 36; o comprimento total é 108.
- Bounds de zona, gates e spawns de inimigos ficam no JSON: centros `(0, 0)`, `(0, -36)`, `(0, -72)`; gates entre zonas em `z = -18` e `z = -54`; gate de saída em `z = -82`. O spawn do player `(0, 2)` e a âncora do portal `(0, -86)` são constantes únicas de `Dungeon1WorldBuilder`, sem duplicação em `CityGameSession`.

### 3.3 Ciclo de vida da run

1. `tryEnterDungeon("dungeon-1")` valida nível/faixa e seleciona `WorldId = "dungeon-1"`.
2. `enterWorld("dungeon-1")` inicia `DungeonRun` uma vez, instancia os três grupos de inimigos e fecha/resetta os três handles de portão.
3. Durante `update()`, `CityGameSession` calcula a zona pelo retângulo atual do jogador e verifica os gates próximos. Gate fechado só tenta abrir se o jogador está na `fromZoneId`.
4. `DungeonGateService` valida e consome a chave definida pela recompensa da zona de origem. Em sucesso, `DungeonRun` marca o ID do gate aberto, o handle troca o visual e remove a colisão imediatamente, e `CityGameSession` persiste o inventário e exibe o feedback.
5. Ao atravessar um dos dois gates de progressão, muda somente a zona derivada da posição e o rótulo do HUD. Não chama `enterWorld()`, não respawna inimigos e não reinicia timer/XP/kills. O gate de saída apenas revela o portal dentro da Zona 3.
6. Saída, morte e timeout usam os fluxos de retorno atuais. Ao iniciar outra run, reset explícito da instância cacheada fecha os três gates.

### 3.4 Método YAGNI aplicado

Implementar o menor caminho que atende exatamente o pedido:

- Fazer somente a variação D1 com três zonas, dois gates de progressão e um gate de saída; não construir um editor nem um framework universal de dungeons.
- Reutilizar `DungeonRun`, `InventoryService`, `SavePayload.inventory.items`, `WorldCollision`, HUD, log/toast, fade e portal de saída atuais.
- Criar apenas `Dungeon1WorldBuilder`, handles de gate para colisão/apresentação e um `DungeonGateService` restrito às regras de chave/abertura da D1. Não criar um sistema genérico de portas para NPCs/cidade.
- Manter `ArenaDef` e o carregamento legado de D2–D8. Campos de zona/gate opcionais não obrigam as outras dungeons a adotá-los.
- Não adicionar campos ao save, migração, persistência de posição, retomar run, progresso/achievement de dungeon, quest `dungeon_clear`, loja para chaves ou backend/multiplayer.
- Não implementar geração procedural aleatória de layout/salas, novos biomas, modelos finais, animações complexas, áudio, drops aleatórios de chave ou redesign global de boss.
- Não alterar balanceamento, duração, faixa de nível ou regras de saída existentes.
- Implementar e testar primeiro o fluxo completo do Portão 1; reutilizar o mesmo contrato no Portão 2 e no portão de saída. A saída usa `toZoneId: null` para revelar o portal, sem criar outro fluxo de regra.

## 4. Revisão do código existente

| Área | Estado encontrado | Consequência para a D1 |
|---|---|---|
| Dados da dungeon | `game/src/data/dungeons/dungeons.json` define D1 como 3 arenas pequenas (`halfSize` 9, 9 e 10), 6 spawns, um único boss na terceira arena, nível 1–40, sem item de entrada e 600 s. | Os dados não descrevem zonas de 36 × 36, gates ou bosses por zona. |
| Escala da cidade | `buildCityWorld()` em `game/src/world/CityWorld.ts` usa `size = 36`. | Reutilizar essa dimensão como fonte única para as zonas; evitar duplicar números independentes. |
| Mundo que a D1 usa | `CityGameSession.tryEnterDungeon()` envia a D2 a `dungeon-2`, mas todas as outras dungeons à world `dungeon-test`. `buildTestDungeonWorld()` é um corredor greybox de **28 × 78**, não o mundo da D1 em `dungeons.json`. | A D1 será construída por `Dungeon1WorldBuilder` e roteada para o world próprio `dungeon-1`. |
| Roteamento explícito | Hoje `tryEnterDungeon()` só trata `dungeon-2`; demais ids caem em `dungeon-test`. `enterWorld()` usa `WorldId` sem `"dungeon-1"`. `setWorldLook()` trata `dungeon-2` como visual “cidade”; o resto usa look “dungeon”. | Estender `WorldId`, `WorldManager`, o ternário de `tryEnterDungeon()` (`dungeon-1` \| `dungeon-2` \| `dungeon-test`) e incluir `dungeon-1` no look de cemitério/greybox alinhado à D2, se o builder reutilizar o mesmo kit. |
| Worlds e cache | `WorldManager` reconhece somente `city`, `dungeon-test` e `dungeon-2`, e mantém worlds em cache. | Adicionar o world da D1 e resetar os gates ao iniciar cada run; não deixar portões abertos após uma run anterior. |
| Run e timer | `DungeonRun` já controla fase, kills, XP e timer. `enterWorld()` inicia uma run quando entra em qualquer world não-cidade. | Fazer as três zonas no mesmo world e nunca chamar `enterWorld()` na troca de zona; isso preserva timer, XP e duração da run. |
| Bosses e respawn | `EnemyService` aplica multiplicadores a `isBoss` e usa o respawn de 180 s. A D1 atual marca como boss um spawn de arquétipo `fixed`, sem associar uma chave. | Definir explicitamente o boss de cada zona e sua recompensa. Reutilizar os multiplicadores e o cooldown existentes sem qualquer ajuste de balanceamento nesta entrega. |
| Recompensa de kill | As rotas de ataque básico, skill, dano contínuo, summon e reflect chamam `CityGameSession.grantKillXp()`. Esse método já salva a cada kill. | Entregar a chave nesse ponto comum, antes do `persistSave(true)`, para não perder a recompensa dependendo do tipo de golpe. O drop de chave precisa ser garantido, não um sorteio da economia. |
| IA inimiga | `EnemyAI` move perseguidores diretamente em direção ao jogador; não recebe colisores do mundo nem limite de zona. `EnemyService.spawnFromDungeon()` cria todos os spawns das arenas. | Restringir inimigos à zona de origem e impedir detecção/ataques através de um portão fechado. Caso contrário, inimigos podem atravessar a parede ou atingir o jogador de outra zona. |
| Itens e inventário | `InventoryService` empilha itens com `slot: "material"` e oferece `countMaterial()` / `consumeMaterial()`. `ItemFactory` já converte materiais e itens de entrada em instâncias empilháveis. | Cadastrar as chaves como itens empilháveis do tipo material e consumir pelo ID específico de cada portão. |
| Save | `SavePayload.inventory.items` salva instâncias de itens; `grantKillXp()` faz save imediato. O estado da run não é retomado após reload e o boot retorna à cidade. | A chave pode usar o save atual sem novo campo/migração, desde que sua forma continue compatível com `ItemInstance`. A abertura dos portões é estado temporário da run. Salvar imediatamente depois de consumir a chave. |
| Interação e colisão | O mundo oferece interações para NPCs e portais; colisores são listas estáticas de caixas/círculos. A interação padrão fica dentro de `INTERACT_RANGE` (1,6). | Adicionar estado dinâmico ao portão: collider enquanto fechado, remoção ao abrir e verificação automática por proximidade. Não basta desenhar uma porta ou marcar um mesh como interativo. |
| HUD/UI | `currentArenaLabel()` calcula arenas por coordenada. O HUD já mostra timer e log de drops no canto inferior esquerdo. | Mostrar `Zona 1 / 3`, `Zona 2 / 3` ou `Zona 3 / 3` e reutilizar o log/toast para chave obtida, chave usada e falta de chave. Sem tela de resultado cheia. |
| Inventário visual | `WireUi` monta a interface carregando `/wire/03-wire-paineis-cidade.html`; `vite.config.ts` serve e publica esse conteúdo e os SVGs. `GamePanels` é o fallback. | Conferir o item na interface realmente usada em runtime e disponibilizar ícone para a chave; não criar uma cópia de wire que o jogo não carrega. |
| Arte | Os inventários registram D1 como greybox e não existe kit de modelos em `game/public/models/dungeons/`. | Fazer primeiro o portão legível com geometria procedural/props existentes. Não bloquear a mecânica esperando arte final. |
| QA | Há `game/scripts/check-dungeon-2.mjs` e smoke geral, mas não há script dedicado às chaves e aos portões da D1. | Criar QA automatizado específico para o fluxo das três zonas e manter D2 como regressão. |

### Gaps adicionais identificados

- O evento `dungeon:completed` é emitido ao sair, morrer ou acabar o tempo; `progress.dungeonClears` existe no save, mas não é atualizado pelo runtime. O catálogo de quests declara `dungeon_clear` como tipo possível, sem tracking implementado. Este plano **não** deve contar morte, saída ou timeout como vitória nem inventar a regra de “completar” uma run.
- O contrato existente mantém o farm em sessões de 10 minutos e a morte/saída retorna à cidade. Regra fechada para a D1: matar o boss final não termina nem renova a run; o farm continua até saída voluntária, morte ou timeout.
- A atualização do timer atualmente depende de a UI não estar bloqueando a sessão. Este plano preserva essa regra; não altera pausa de menus enquanto implementa os portões.

## 5. Modelo de mundo e dados

### 5.1 Geometria greybox

Construir a D1 como **um único world conectado** de 36 × 108, dividido em três módulos iguais de 36 × 36. A disposição abaixo é a decisão final do greybox deste delivery, não uma proposta pendente:

| Zona | Centro | Limites Z | Boss (spawn e posição) | Inimigo comum (spawn e posição) | Gate após o boss |
|---|---:|---:|---|---|---|
| `d1-zone-1` | `(0, 0)` | `-18` a `18` | Boss 1 — `d1-a1-f1` em `(5, -5)` | `d1-a1-f2` em `(-5, -5)` | `d1-gate-1` em `(0, -18)`, destino Zona 2 |
| `d1-zone-2` | `(0, -36)` | `-54` a `-18` | Boss 2 — `d1-a2-f1` em `(5, -41)` | `d1-a2-r1` em `(-4, -43)` | `d1-gate-2` em `(0, -54)`, destino Zona 3 |
| `d1-zone-3` | `(0, -72)` | `-90` a `-54` | Boss final — `d1-a3-boss` em `(0, -74)` | `d1-a3-c1` em `(5, -70)` | `d1-gate-exit` em `(0, -82)`, destino portal |

- Preservar os seis spawns existentes da D1: marcar `d1-a1-f1` e `d1-a2-f1` com `"isBoss": true`, manter `d1-a3-boss` como boss e manter os outros três como inimigos comuns. Todos os bosses usam o arquétipo `fixed` já existente; não adicionar inimigos, modelos ou balanceamento novo.
- As coordenadas atuais em `dungeons.json` (arenas `halfSize` 9/9/10) **serão realinhadas** aos centros de zona da tabela acima; `halfSize` deixa de definir o layout jogável quando `zones`/`gates` existirem — o builder usa `DungeonZoneDef`, não o retângulo legado de arena.
- O player nasce em `(0, 2)`. Reaproveitar o portal de saída atual e posicioná-lo em `(0, -86)`, atrás do `d1-gate-exit`; sua interação atual continua sendo usada depois que o gate abre.
- Os três gates têm aberturas com 5,2 unidades de largura. `d1-gate-1` e `d1-gate-2` ficam nos limites entre zonas; `d1-gate-exit` fica dentro da Zona 3. Esses são os únicos vãos nas paredes internas.
- Cada fronteira entre zonas é uma parede contínua, exceto pela abertura do respectivo gate. Na Zona 3, uma parede em `z = -82` bloqueia o acesso ao portal de saída, exceto pelo `d1-gate-exit`. Não deixar passagem pelas laterais.
- As três zonas usam o mesmo chão greybox, muralhas e iluminação procedural reaproveitada de `buildDungeon2World()`; não recebem props exclusivos nem assets finais nesta entrega.
- O collider do portão fechado precisa bloquear WASD, click-to-move e qualquer movimento projetado. Ao abrir, o collider é desativado/removido para permitir a passagem.

### 5.2 Contrato de dados

Adicionar estruturas explícitas `DungeonZoneDef` e `DungeonGateDef` a `dungeon-definitions.ts` e campos opcionais correspondentes em `DungeonDef`, para manter compatibilidade com as outras dungeons.

- `DungeonZoneDef`: `id`, `label`, `centerX`, `centerZ`, `width`, `depth`, `bossSpawnId` e `keyRewardItemId` obrigatório.
- `DungeonGateDef`: `id`, `fromZoneId`, `toZoneId` (nulo somente no portão de saída) e posição/orientação. A chave exigida é derivada do `keyRewardItemId` da zona de origem; não repetir o ID no gate.
- Associar cada spawn D1 a um `zoneId`; o boss deve ser identificável sem depender apenas do índice da arena.
- Preservar `ArenaDef` para descrever grupos de combate. A D2 usa quatro blocos de combate dentro de uma única área; não redefinir toda arena do jogo como zona.
- Configurar três chaves distintas como recompensas das Zonas 1, 2 e 3, cada uma aceita somente pelo gate seguinte da sua zona. Usar os IDs fechados `d1_key_zone_2`, `d1_key_zone_3` e `d1_key_exit`.
- Manter `dungeonArenaScale()` e os números existentes. Qualquer ajuste de HP, ataque, defesa, respawn, XP ou loot deve ser outro pedido de balanceamento, com valores marcados como provisórios.

### 5.3 Contrato dos bosses e das chaves

- Garantir um boss residente e ativo em cada zona desde o começo da run; nenhum depende de quest ou gatilho de spawn. A progressão linear continua controlando o acesso físico às Zonas 2 e 3 por seus portões anteriores.
- Boss 1 concede `d1_key_zone_2`; Boss 2 concede `d1_key_zone_3`; Boss final concede loot normal de boss e `d1_key_exit`. Os três continuam elegíveis a XP/loot pelas regras atuais.
- A recompensa de chave é determinística. Um inimigo comum nunca concede chave.
- Para evitar duplicatas: conceder a chave somente se o jogador ainda não possui aquele ID e o portão correspondente ainda não foi aberto nesta run. O boss continua reaparecendo e fornecendo loot normal.
- Se não houver espaço no inventário, registrar mensagem no log. O boss permanece farmável e a chave poderá ser tentada novamente após o respawn e a liberação de espaço.
- Cadastrar nome, descrição, ícone `items/seal.svg` e slot `material` em `items.json`; o `item-catalog.ts` já carrega esse JSON automaticamente. Validar que o SVG e o tooltip aparecem no inventário de runtime.

## 6. Regras do portão e do fluxo

Cada portão tem somente dois estados: `fechado` e `aberto`. A abertura é síncrona e visualmente explícita; não há uma fase de animação/timer própria.

1. **Fechado sem a chave correta:** quando o jogador chega ao raio de interação, não consome nada, mantém a colisão e mostra uma mensagem curta indicando a chave exigida. A mensagem aparece uma vez até o jogador sair do raio e entrar novamente.
2. **Fechado com chave correta:** verificar o inventário, consumir exatamente uma unidade, marcar o gate como aberto na `DungeonRun`, remover imediatamente o collider, trocar o visual para aberto e persistir o inventário com `persistSave(true)`.
3. **Aberto:** permanece aberto pelo resto da run. Repassar pelo gatilho não consome item.
4. **Chave errada:** nunca abre o portão e não consome outra chave.
5. **Nova run:** os portões voltam a fechados, mesmo que `WorldManager` reutilize a instância em cache. Chaves ainda não usadas permanecem no inventário.

A checagem de proximidade acontece durante a atualização do jogo, não apenas quando se aperta E ou clica no mesh. Reutilizar o mesmo raio de interação do runtime (`INTERACT_RANGE = 1.6` em `CityGameSession.ts`) medido até o eixo do gate, salvo teste de UX que peça raio dedicado. A apresentação de portão aberto/fechado é suficiente; não adicionar cutscene, tween, animação temporizada ou nova dependência de VFX.

### Limites de zona e combate

- Cada spawn pertence a uma zona. Perseguidores, inimigos de longo alcance e boss não atravessam os limites dessa zona, inclusive quando o portão abre.
- Não permitir ataque básico, skill, DOT, summon ou seleção de alvo através de um portão fechado.
- A travessia pelos dois portões de progressão leva à próxima zona sem loading, sem teleportar o personagem e sem reiniciar `DungeonRun`. O gate de saída abre acesso ao portal e mantém o jogador na Zona 3.
- Inimigos de outras zonas não atacam o jogador a distância nem são elegíveis como alvo enquanto separados por um portão fechado.
- O portal de saída mantém a interação e o retorno atuais, mas só fica acessível depois que `d1-gate-exit` abre. Morte e timeout continuam retornando à cidade com HP/MP cheios.

## 7. Arquivos e ordem da implementação

### Fase A — Contratos e dados

- Criar `game/src/world/worldConstants.ts` com `CITY_WORLD_SIZE = 36`; usar a constante na cidade, D2 e D1 para manter a escala coerente.
- Estender `game/src/data/dungeons/dungeon-definitions.ts` com `DungeonZoneDef`, `DungeonGateDef`, `DungeonDef.zones?`, `DungeonDef.gates?` e `ArenaDef.zoneId?`.
- Atualizar somente a definição D1 em `game/src/data/dungeons/dungeons.json`: três zonas, três arenas vinculadas às zonas, um boss por zona, dois gates de progressão, um gate de saída e três IDs de chave.
- Cadastrar `d1_key_zone_2`, `d1_key_zone_3` e `d1_key_exit` apenas em `game/src/data/items/items.json` como materiais stackáveis com `items/seal.svg`; `item-catalog.ts` consome esse JSON automaticamente. Não criar um pipeline de ícones.
- Reutilizar `ItemFactory` e `ItemInstance` atuais. Não alterar `ItemModel` nem o formato/versionamento do save.

### Fase B — World conectado e apresentação dos gates

- Criar `game/src/world/Dungeon1WorldBuilder.ts`. Ele monta um único `BuiltWorld` `dungeon-1`, de 36 × 108, a partir das definições de zona, spawn e gate; inclui o portal de saída atual nas âncoras fixas `(0, -86)` e o spawn inicial em `(0, 2)`.
- Criar `game/src/world/DungeonGateView.ts`. Cada instância controla o visual fechado/aberto e seu `SolidBox` dinâmico, com `open()` e `reset()` síncronos; o world manager mantém a responsabilidade normal de limpeza das meshes.
- Expor os handles em `BuiltWorld` para a sessão. Não incluí-los em `tickables`, pois não há animação/timer; não colocar regra de inventário no builder nem no view.
- Atualizar `game/src/world/WorldManager.ts` para criar e cachear `dungeon-1`. O world cacheado é reutilizado, mas os três `DungeonGateView.reset()` rodam no início de cada run.
- Usar as muralhas e `WorldCollision` existentes; fechar todas as paredes internas, incluindo a parede que protege o portal, exceto pelos vãos dos gates.

### Fase C — Estado e regra do portão

- Atualizar `game/src/domain/dungeons/DungeonRun.ts` para manter apenas `openedGateIds` como estado novo, sempre resetado em `start()` e `reset()`.
- Criar `game/src/domain/dungeons/DungeonGateService.ts`, limitado aos contratos de gates da D1. Ele valida a zona de origem e a chave obtida por `keyRewardItemId`, confirma o gate fechado, consome exatamente uma unidade e registra o ID aberto. Não importa Three.js e não faz persistência.
- Em `game/src/app/CityGameSession.ts`, calcular a zona do jogador a partir dos limites de `DungeonZoneDef`; testar proximidade a cada atualização; chamar o serviço; aplicar `DungeonGateView.open()`; persistir o consumo com `persistSave(true)` e emitir feedback uma vez.
- No caminho de entrada, mapear `dungeon-1` para o world `dungeon-1` no mesmo ponto de `tryEnterDungeon()` que hoje escolhe `dungeon-2` vs `dungeon-test`. Ajustar `enterWorld()` / `WorldId` e `setWorldLook()` conforme a linha de revisão §4. Nenhuma passagem interna chama `enterWorld()` ao trocar de zona.

### Fase D — Bosses e limites de combate

- `EnemyService` propaga `ArenaDef.zoneId` para `EnemyInit` / `EnemyModel` (campo novo `zoneId: string`) ao instanciar os seis inimigos.
- `CityGameSession.grantKillXp()`: se `activeDungeonId === "dungeon-1"` e `enemy.isBoss`, resolver a zona cujo `bossSpawnId === enemy.id` (spawn id, não `monsterId`) e conceder `keyRewardItemId` antes do `persistSave(true)`, respeitando a regra de não duplicar (§5.3). A lógica cobre todos os tipos de morte porque esse método já é comum às rotas de ataque.
- `EnemyAI` restringe movimento ao retângulo da zona do inimigo. As consultas do ataque básico, skills, DOT e summons filtram alvos pela zona atual quando o gate correspondente está fechado.
- Manter o boss ativo/reaparecendo após 180 s; não mudar multiplicadores, XP, Ouro ou loot.

### Fase E — HUD, inventário e save

- Atualizar `currentArenaLabel()`: quando `world.id === "dungeon-1"`, usar limites de `DungeonZoneDef` e rótulos `Zona 1 / 3` … `Zona 3 / 3` (substituir os limiares `-12`/`-36` atuais, que só servem ao corredor `dungeon-test`).
- Usar `GameApp` e o log/toast existente para mensagens de chave obtida, chave usada, falta de chave e inventário cheio.
- `WireUi` mostra as chaves com nome, stack e ícone existente; `GamePanels` fallback mantém as mesmas chaves visíveis.
- Save imediato após a recompensa do boss (no `grantKillXp()` já existente) e após consumir chave no portão. Sem alteração em `SaveTypes`, versão ou migrations.
- Resetar os views e colliders dos três portões ao iniciar uma nova run; não salvar `openedGateIds`.

### Fase F — QA

- Criar `game/scripts/check-dungeon-1.mjs` no padrão de `check-dungeon-2.mjs`, cobrindo as três recompensas e os dois gates de progressão mais o gate de saída.
- Não adicionar script NPM: o padrão atual do QA D2 é execução direta com `node scripts/check-dungeon-2.mjs`.
- Rodar TypeScript, build, smoke e checks D1/D2; remover artefatos de teste e garantir diff sem comentários/logs de debug.

## 8. Critérios de aceite

### Espaço e acesso

- [ ] Entrar explicitamente em `dungeon-1` constrói o world D1, não `dungeon-test`.
- [ ] A D1 contém exatamente três zonas consecutivas; cada chão/zona mede 36 × 36, igual à cidade.
- [ ] O spawn inicial fica na Zona 1; não há caminho alternativo em volta das paredes/gates.
- [ ] Os dois portões de progressão e o portão de saída começam fechados em toda run nova.

### Boss, item e portão

- [ ] Existe um boss identificável e disponível em cada zona, com respawn conforme o valor configurado.
- [ ] Derrotar Boss 1 concede `d1_key_zone_2`; Boss 2 concede `d1_key_zone_3`; Boss 3 concede `d1_key_exit`; inimigo comum não concede nenhuma dessas chaves.
- [ ] A chave aparece com nome e ícone corretos na mochila e permanece salva após reload/retorno, se ainda não foi consumida.
- [ ] Sem a chave correta, chegar a qualquer um dos três portões não consome item, não permite atravessar e informa o requisito.
- [ ] Com a chave correta, aproximar-se de cada gate abre-o automaticamente e consome exatamente uma unidade; repetição do gatilho não cobra outra.
- [ ] O portal de saída só pode ser alcançado após derrotar o Boss 3, obter `d1_key_exit` e abrir o portão de saída.
- [ ] A colisão só deixa de bloquear quando o portão está fisicamente aberto.
- [ ] Inventário cheio não concede uma passagem invisível: o jogador recebe mensagem e pode tentar obter a chave novamente quando o boss reaparecer.

### Run e repetição

- [ ] O contador começa em 600 s e continua o mesmo nas transições entre zonas.
- [ ] Bosses não encerram nem renovam o timer.
- [ ] Timer, morte e saída voluntária preservam o fluxo existente de retorno à cidade e salvamento.
- [ ] A próxima run fecha novamente os três gates, mesmo com world em cache; nenhuma passagem lateral ou atravessamento de inimigo contorna a progressão.
- [ ] D2 continua com seu mundo 36 × 36, quatro blocos e portal de saída, sem regressão.

### Validação técnica e visual

- [ ] `npm run typecheck` passa.
- [ ] `npm run build` passa.
- [ ] `npm run smoke` passa.
- [ ] `check-dungeon-1.mjs` valida as três recompensas, consumo dos três gates, acesso ao portal de saída, saves, timer e reset de gates.
- [ ] `check-dungeon-2.mjs` continua passando como regressão.
- [ ] Felipe valida visualmente a escala das zonas, leitura do portão, feedback sem chave e abertura/consumo da chave.

## 9. Decisões fechadas para o delivery

- A D1 tem três zonas de 36 × 36 em um world conectado de 36 × 108, dois gates de progressão e um gate de saída.
- Há um boss por zona; cada um concede uma chave: Boss 1 abre a passagem à Zona 2, Boss 2 abre a passagem à Zona 3 e Boss 3 abre o acesso ao portal de saída.
- “Sempre disponível” usa o spawn da run e o respawn atual de 180 s. Multiplicadores e balanceamento não mudam.
- Chaves não usadas ficam no inventário persistente; cada gate consome uma unidade do ID correto, uma única vez.
- Os três gates abertos valem somente para a run corrente e resetam na próxima entrada. A run não é retomada após reload.
- Derrotar o boss final não encerra a run nem incrementa `dungeonClears`; quests, achievements e contagem de clear ficam fora do escopo.
- O runtime usa um serviço de gate D1 específico, um builder de world D1 e handles de apresentação dinâmicos. Não será criado um framework genérico de dungeons/portas.

Não há decisão de produto ou arquitetura pendente neste plano.

## 10. Fontes revisadas

- `game/src/data/dungeons/dungeon-definitions.ts`, `dungeons-mortal.ts` e `dungeons.json`
- `game/src/data/balance/dungeon.ts`
- `game/src/domain/dungeons/DungeonRun.ts`
- `game/src/world/CityWorld.ts`, `WorldManager.ts`, `WorldBoundary.ts`, `collision.ts` e `definitions.ts`
- `game/src/app/CityGameSession.ts` e `GameApp.ts`
- `game/src/domain/enemies/EnemyService.ts`, `EnemyModel.ts` e `EnemyAI.ts`
- `game/src/domain/inventory/InventoryService.ts`, `game/src/domain/items/ItemModel.ts` e `ItemFactory.ts`
- `game/src/data/items/items.json` e `item-catalog.ts`
- `game/src/persistence/SaveTypes.ts` e `migrations.ts`
- `game/src/ui/InteractionPanel.ts`, `WireUi.ts`, `WireGameBridge.ts` e `GamePanels.ts`
- `game/vite.config.ts`, `game/scripts/check-dungeon-2.mjs` e `game/scripts/smoke.mjs`
- Referências: `nongame/docs/inventarios/dungeons.md`, `inimigos.md`, `itens.md`, `modelos-mundo.md`, `save-load.md`; `nongame/docs/project/DECISOES-DESIGN.md` e GDD `10-dungeons-e-level-design.md`.

**Validação deste documento:** conferido contra o código em 2026-09-26 (`dungeons.json`, `CityGameSession`, `WorldManager`, `grantKillXp`). Antes de fechar cada fase de implementação: `cd game && npm run typecheck`, smoke e `node scripts/check-dungeon-2.mjs` como regressão.

# Dungeon 1 — plano de funcionamento completo

**Status:** plano de implementação; o runtime ainda não foi alterado por este documento.

**Repositório:** `Planos/Dungeon 1.md` na `main` · Revalidar assinaturas e paths no código antes de cada fase.

**Escopo revisado:** fluxo de Dungeon no jogo — dados, construção do mundo, colisão, combate e inimigos, inventário, save, HUD/interações e QA.

## 1. Objetivo

Entregar a Dungeon 1 como uma dungeon jogável, repetível e composta por **três zonas lineares**, cada uma com a mesma área da cidade (**36 × 36 unidades de jogo**). **Dois portões físicos** conectam Zona 1→2 e Zona 2→3. Cada boss das Zonas 1 e 2 concede a chave do portão seguinte. A **Zona 3** é o farm final: **sem portão**, **sem chave** e **sem portal de saída** no mapa.

Manter as regras existentes da D1:

- Dungeon `dungeon-1`, Mortal, níveis **1–40**.
- Sem item para entrar.
- Run de **600 segundos**, iniciada uma vez por entrada; passar de zona não reinicia o contador.
- Dungeon repetível; **morte** ou **fim do tempo** retornam o jogador à cidade.
- **Regra global (Felipe):** dungeon **não tem saída** — sem portal de saída, sem interactable `portal-exit`, sem retorno voluntário durante a run.
- XP, Ouro e itens obtidos continuam sendo salvos durante a run.
- Primeiro delivery pode usar geometria greybox/procedural. Arte final não é pré-requisito para testar o funcionamento.

## 2. Regras de produto fechadas

Este plano fixa as regras abaixo para não deixar decisões em aberto durante a implementação:

1. A D1 tem **três zonas lineares**, cada uma com área de 36 × 36.
2. Existem **dois portões de progressão** (Zona 1→2 e Zona 2→3). **Não** existe portão de saída, **não** existe terceira chave e **não** existe interactable `portal-exit` no world `dungeon-1`.
3. Existe **um minion e um boss** por zona (cogumelos §5.4). Boss das Zonas 1 e 2 concede chave do portão seguinte; Cogumelo Boss 3 concede **somente** loot/XP de boss — **nunca** chave.
4. “Sempre disponível” significa que cada boss está configurado desde o início da run e reaparece na própria zona após o cooldown atual de **180 segundos**, sem quest ou gatilho adicional de spawn. A progressão linear continua exigindo abrir o portão anterior para chegar fisicamente às Zonas 2 e 3. O valor vem de `DUNGEON_BALANCE.boss.respawnSeconds` e não será alterado neste plano.
5. Chaves são itens stackáveis do inventário normal e persistem como os demais itens. Chave não usada permanece após saída, morte ou reload; chave usada é removida. Se o jogador já possui a chave correta, o boss correspondente não gera cópias extras.
6. Os **dois** portões de progressão abrem automaticamente quando o jogador chega perto com a chave correta. Não há confirmação por E, janela modal nem consumo de chave errada.
7. Cada chave de progressão é concedida deterministicamente ao derrotar o boss da Zona 1 ou 2, antes do save feito no fluxo da morte. Se o inventário não aceitar a chave, o jogador recebe aviso e poderá derrotar novamente o boss após seu respawn.
8. Chegar à Zona 3 ou derrotar o Cogumelo Boss 3 não encerra nem renova a sessão de farm de 600 segundos. O retorno à cidade ocorre **apenas** por morte ou timeout.

Fluxo fechado:

```text
Cidade
  → Zona 1 + Boss 1
  → Chave (portão 1→2)
  → Portão 1 abre e consome a chave
  → Zona 2 + Boss 2
  → Chave (portão 2→3)
  → Portão 2 abre e consome a chave
  → Zona 3 + Boss final (farm até timer / morte)
  → fim do tempo ou morte
  → Cidade
```

A D1 usa **duas chaves** e **dois portões**. Não há progresso de quest nem recompensa de conclusão nesta arquitetura.

### 2.1 Tabela boss → chave → portão

Os IDs de chave nomeiam o **destino** após o portão, não a zona do boss.

| Zona | Boss (spawn id) | Chave concedida | Portão que consome | Gate id |
|---|---|---|---|---|
| 1 | `d1-a1-boss` (`cogumelo_boss`) | `d1_key_zone_2` | progressão 1→2 | `d1-gate-1` |
| 2 | `d1-a2-boss` (`cogumelo_boss_2`) | `d1_key_zone_3` | progressão 2→3 | `d1-gate-2` |
| 3 | `d1-a3-boss` (`cogumelo_boss_3`) | — | — | — |

Chave **não consumida** de uma run anterior permanece no inventário e pode abrir o portão correspondente numa run nova, sem exigir novo kill — desde que o jogador ainda não tenha consumido essa unidade.

## 3. Arquitetura escolhida

A D1 usa os sistemas atuais do jogo e acrescenta apenas os contratos e estados necessários para as três zonas. A arquitetura tem uma única definição de conteúdo, um único world durante a run e uma única `DungeonRun` até o retorno à cidade.

### 3.1 Fonte de verdade e responsabilidades

| Camada | Responsabilidade definida |
|---|---|
| Dados | `dungeons.json` descreve as três zonas, **dois** portões, os bosses, spawns e IDs de chave (somente Zonas 1–2). `dungeon-definitions.ts` tipa esses dados. Coordenadas e requisitos não são duplicados em código de sessão. |
| World | `Dungeon1WorldBuilder` consome os dados da D1 e monta **um** `BuiltWorld` `dungeon-1` de 36 × 108, com três módulos de 36 × 36. Ele cria chão, muralhas e gates de progressão. **Não** adiciona `portal-exit` nem interactable de saída. Não controla inventário, timer nem recompensa. |
| Estado efêmero da run | `DungeonRun` continua dono do timer, XP e kills. Adiciona apenas o conjunto `openedGateIds`, limpo em `start()` e `reset()`. A zona atual é derivada da posição do jogador contra os limites definidos em `DungeonZoneDef`; não é salva nem mantida em uma segunda variável. |
| Regra de chave/portão | Um `DungeonGateService` pequeno e restrito à D1 valida zona de origem, chave exigida pela recompensa da zona, quantidade no inventário e estado do gate. Usa `InventoryService.countMaterial()` e `consumeMaterial()`, e registra a abertura em `DungeonRun`. Não acessa Three.js nem salva diretamente. |
| Apresentação do portão | Cada gate do `BuiltWorld` tem um handle simples com `open()` e `reset()`. O handle alterna o visual fechado/aberto e controla o collider dinâmico: remove a colisão ao abrir e a restaura no reset da próxima run. Sem animação/timer próprio. |
| Orquestração | `CityGameSession` inicia a run, calcula a zona pela posição, chama o serviço quando o jogador entra no raio de um gate, aplica a abertura no handle, escreve feedback e salva as mutações. A sessão é a única camada que coordena domínio, world, save e HUD. |
| Boss e inimigos | Cada `ArenaDef` da D1 pertence a um `zoneId`; `EnemyService` copia esse ID para `EnemyModel`. `grantKillXp()` continua sendo o ponto único de recompensa. `EnemyAI` e as consultas de alvo recebem a zona do jogador e não atravessam os limites de uma zona/gate fechado. |
| Persistência | A chave usa a forma atual de `ItemInstance` e a lista `inventory.items`; não existe save de gate nem retomada da run. Salvar imediatamente após conceder ou consumir item segue o contrato atual de save por kill. |
| UI | `GameApp` exibe zona e mensagens usando HUD/log/toast atuais. `WireUi` mantém a mochila e resolve o ícone existente na rota `/wire/assets/`. Nenhum novo painel/modal é criado para os gates. |

### 3.2 Contratos de dados

- `DungeonZoneDef` contém `id`, `label`, `centerX`, `centerZ`, `width`, `depth`, `bossSpawnId` e `keyRewardItemId` **opcional** — preenchido nas Zonas 1 e 2; **omitido ou null na Zona 3**.
- `DungeonGateDef` contém `id`, `fromZoneId`, `toZoneId` (sempre a zona seguinte; **somente dois registros** na D1) e posição/orientação. A chave exigida é derivada do `keyRewardItemId` da zona de origem; não repetir o ID no gate.
- `ArenaDef` ganha `zoneId` opcional. A D1 informa o valor em cada uma das suas três arenas; as demais dungeons continuam usando o contrato legado sem zonas/gates.
- `DungeonDef.zones` e `DungeonDef.gates` são opcionais para não exigir migração nem reescrita de D2–D8.
- Um único `CITY_WORLD_SIZE = 36` compartilhado define o lado da cidade e de cada módulo da D1. A largura total do mapa é 36; o comprimento total é 108.
- Bounds de zona, gates e spawns de inimigos ficam no JSON: centros `(0, 0)`, `(0, -36)`, `(0, -72)`; gates entre zonas em `z = -18` e `z = -54`. Spawn do player `(0, 2)` é constante única de `Dungeon1WorldBuilder`, sem duplicação em `CityGameSession`. **Não** reservar âncora de portal de saída.

### 3.3 Ciclo de vida da run

1. `tryEnterDungeon("dungeon-1")` valida nível/faixa e seleciona `WorldId = "dungeon-1"`.
2. `enterWorld("dungeon-1")` inicia `DungeonRun` uma vez, instancia os três grupos de inimigos e fecha/resetta os **dois** handles de portão de progressão.
3. Durante `update()`, `CityGameSession` calcula a zona pelo retângulo atual do jogador e verifica os gates próximos. Gate fechado só tenta abrir se o jogador está na `fromZoneId`.
4. `DungeonGateService` valida e consome a chave definida pela recompensa da zona de origem. Em sucesso, `DungeonRun` marca o ID do gate aberto, o handle troca o visual e remove a colisão imediatamente, e `CityGameSession` persiste o inventário e exibe o feedback.
5. Ao atravessar um portão de progressão, muda somente a zona derivada da posição e o rótulo do HUD. Não chama `enterWorld()`, não respawna inimigos e não reinicia timer/XP/kills.
6. Saída por morte ou timeout usa os fluxos de retorno atuais. Ao iniciar outra run, reset explícito da instância cacheada fecha os dois gates.

### 3.4 Método YAGNI aplicado

Implementar o menor caminho que atende exatamente o pedido:

- Fazer somente a variação D1 com três zonas e **dois** gates de progressão; não construir editor nem framework universal de dungeons.
- Reutilizar `DungeonRun`, `InventoryService`, `SavePayload.inventory.items`, `WorldCollision`, HUD, log/toast, fade e fluxos de **morte/timeout** atuais. **Não** portar `portal-exit` de `buildTestDungeonWorld()` / D2 para a D1.
- Criar apenas `Dungeon1WorldBuilder`, handles de gate para colisão/apresentação e um `DungeonGateService` restrito às regras de chave/abertura da D1. Não criar um sistema genérico de portas para NPCs/cidade.
- Manter `ArenaDef` e o carregamento legado de D2–D8. Campos de zona/gate opcionais não obrigam as outras dungeons a adotá-los.
- Não adicionar campos ao save, migração, persistência de posição, retomar run, progresso/achievement de dungeon, quest `dungeon_clear`, loja para chaves ou backend/multiplayer.
- Não implementar geração procedural aleatória de layout/salas, novos biomas, modelos finais, animações complexas, áudio, drops aleatórios de chave ou redesign global de boss.
- Não alterar balanceamento, duração, faixa de nível ou regras de saída existentes nas **outras** dungeons (D2 mantém portal de saída no cemitério).
- Implementar e testar primeiro o fluxo completo do Portão 1; reutilizar o mesmo contrato no Portão 2.

## 4. Revisão do código existente

| Área | Estado encontrado | Consequência para a D1 |
|---|---|---|
| Dados da dungeon | `game/src/data/dungeons/dungeons.json` define D1 como 3 arenas pequenas (`halfSize` 9, 9 e 10), 6 spawns, um único boss na terceira arena, nível 1–40, sem item de entrada e 600 s. | Os dados não descrevem zonas de 36 × 36, gates ou bosses por zona. |
| Escala da cidade | `buildCityWorld()` em `game/src/world/CityWorld.ts` usa `size = 36`. | Reutilizar essa dimensão como fonte única para as zonas; evitar duplicar números independentes. |
| Mundo que a D1 usa | `CityGameSession.tryEnterDungeon()` envia a D2 a `dungeon-2`, mas todas as outras dungeons à world `dungeon-test`. `buildTestDungeonWorld()` é um corredor greybox de **28 × 78**, não o mundo da D1 em `dungeons.json`. | A D1 será construída por `Dungeon1WorldBuilder` e roteada para o world próprio `dungeon-1`. |
| Roteamento explícito | Hoje `tryEnterDungeon()` só trata `dungeon-2`; demais ids caem em `dungeon-test`. `enterWorld()` usa `WorldId` sem `"dungeon-1"`. `setWorldLook()` trata `dungeon-2` como visual “cidade”; o resto usa look “dungeon”. | Estender `WorldId`, `WorldManager`, o ternário de `tryEnterDungeon()` (`dungeon-1` \| `dungeon-2` \| `dungeon-test`) e incluir `dungeon-1` no look de cemitério/greybox alinhado à D2, se o builder reutilizar o mesmo kit. |
| Worlds e cache | `WorldManager` reconhece somente `city`, `dungeon-test` e `dungeon-2`, e mantém worlds em cache. | Adicionar o world da D1 e resetar os gates ao iniciar cada run; não deixar portões abertos após uma run anterior. |
| Run e timer | `DungeonRun` já controla fase, kills, XP e timer. `enterWorld()` inicia uma run quando entra em qualquer world não-cidade. | Fazer as três zonas no mesmo world e nunca chamar `enterWorld()` na troca de zona; isso preserva timer, XP e duração da run. |
| Saída voluntária | `portal-exit` em `buildTestDungeonWorld()` e D2 chama `finishDungeon("exit")`. | World D1 **não** registra `portal-exit`. Alinhar D2 (remover portal) no plano D2 — regra: **dungeon não tem saída**. |
| Inimigos D1 | Spawns usam arquétipos genéricos (`fixed`/`chaser`/`ranged`) sem `monsterId` de cogumelo. | **Seis** defs novas em `monsters.json` (minion + boss por zona); cada spawn D1 aponta `monsterId` explícito (§5.4). |
| Bosses e respawn | `EnemyService` aplica multiplicadores a `isBoss` e usa o respawn de 180 s. A D1 atual marca como boss um spawn de arquétipo `fixed`, sem associar uma chave. | Definir explicitamente o boss de cada zona e sua recompensa (chave só Z1/Z2). Reutilizar multiplicadores e cooldown sem ajuste de balance nesta entrega. |
| Recompensa de kill | As rotas de ataque básico, skill, dano contínuo, summon e reflect chamam `CityGameSession.grantKillXp()`. Esse método já salva a cada kill. | Entregar chave de progressão nesse ponto comum, antes do `persistSave(true)`, **somente** para bosses das Zonas 1 e 2. |
| IA inimiga | `EnemyAI` move perseguidores diretamente em direção ao jogador; não recebe colisores do mundo nem limite de zona. `EnemyService.spawnFromDungeon()` cria todos os spawns das arenas. | Restringir inimigos à zona de origem e impedir detecção/ataques através de um portão fechado. |
| Itens e inventário | `InventoryService` empilha itens com `slot: "material"` e oferece `countMaterial()` / `consumeMaterial()`. | Cadastrar **duas** chaves como materiais stackáveis (`d1_key_zone_2`, `d1_key_zone_3`). |
| Save | `SavePayload.inventory.items` salva instâncias de itens; `grantKillXp()` faz save imediato. O estado da run não é retomado após reload e o boot retorna à cidade. | A chave pode usar o save atual sem novo campo/migração. Abertura dos portões é estado temporário da run. |
| Interação e colisão | O mundo oferece interações para NPCs e portais; colisores são listas estáticas de caixas/círculos. A interação padrão fica dentro de `INTERACT_RANGE` (1,6). | Adicionar estado dinâmico ao portão: collider enquanto fechado, remoção ao abrir e verificação automática por proximidade. |
| HUD/UI | `currentArenaLabel()` calcula arenas por coordenada. O HUD já mostra timer e log de drops no canto inferior esquerdo. | Mostrar `Zona 1 / 3`, `Zona 2 / 3` ou `Zona 3 / 3` e reutilizar log/toast para chave obtida, chave usada e falta de chave. |
| Inventário visual | `WireUi` monta a interface carregando `/wire/03-wire-paineis-cidade.html`. | Conferir as duas chaves na UI de runtime com ícone `items/seal.svg`. |
| Arte | Os inventários registram D1 como greybox. | Portões legíveis com geometria procedural/props existentes. |
| QA | Há `game/scripts/check-dungeon-2.mjs` e smoke geral, mas não há script dedicado às chaves e aos portões da D1. | Criar QA automatizado específico para três zonas, duas chaves e dois gates. |

### Gaps adicionais identificados

- O evento `dungeon:completed` é emitido ao sair, morrer ou acabar o tempo; `progress.dungeonClears` existe no save, mas não é atualizado pelo runtime. Este plano **não** deve contar morte ou timeout como vitória nem inventar regra de “completar” uma run.
- Regra fechada para a D1: matar o boss final não termina nem renova a run; o farm na Zona 3 continua até **morte** ou **timeout** — não há portal de saída.
- A atualização do timer depende de a UI não estar bloqueando a sessão. Este plano preserva essa regra.

## 5. Modelo de mundo e dados

### 5.1 Geometria greybox

Construir a D1 como **um único world conectado** de 36 × 108, dividido em três módulos iguais de 36 × 36. A disposição abaixo é a decisão final do greybox deste delivery:

| Zona | Centro | Limites Z | Boss (spawn · monstro) | Minion (spawn · monstro) | Gate |
|---|---:|---:|---|---|---|
| `d1-zone-1` | `(0, 0)` | `-18` a `18` | `d1-a1-boss` · **Cogumelo Boss** (`cogumelo_boss`) | `d1-a1-minion` · **Cogumelo Minion** (`cogumelo_minion`) | `d1-gate-1` → Zona 2 |
| `d1-zone-2` | `(0, -36)` | `-54` a `-18` | `d1-a2-boss` · **Cogumelo Boss 2** (`cogumelo_boss_2`) | `d1-a2-minion` · **Cogumelo Minion 2** (`cogumelo_minion_2`) | `d1-gate-2` → Zona 3 |
| `d1-zone-3` | `(0, -72)` | `-90` a `-54` | `d1-a3-boss` · **Cogumelo Boss 3** (`cogumelo_boss_3`) | `d1-a3-minion` · **Cogumelo Minion 3** (`cogumelo_minion_3`) | **nenhum** |

- **Dois spawns por zona** (minion + boss), seis no total. Posições iniciais sugeridas: minion em `(-5, z)` e boss em `(5, z)` por zona (ajustar no JSON ao greybox).
- `"isBoss": true` somente nos três spawns `*-boss`. Minions nunca concedem chave.
- As coordenadas atuais em `dungeons.json` (arenas `halfSize` 9/9/10) **serão realinhadas** aos centros de zona da tabela acima.
- O player nasce em `(0, 2)`.
- Os **dois** gates têm aberturas com 5,2 unidades de largura nos limites entre zonas. Esses são os únicos vãos nas paredes internas.
- A Zona 3 fecha com muralha no limite sul (`z = -90`) **sem** vão de saída e **sem** portal interactable.
- As três zonas usam chão greybox, muralhas e iluminação procedural reaproveitada de `buildDungeon2World()` onde fizer sentido.
- O collider do portão fechado precisa bloquear WASD, click-to-move e qualquer movimento projetado. Ao abrir, o collider é desativado/removido.

### 5.2 Contrato de dados

- `DungeonZoneDef`: `keyRewardItemId` **obrigatório** nas Zonas 1–2; **ausente/null** na Zona 3.
- Configurar **duas** chaves: `d1_key_zone_2`, `d1_key_zone_3`. **Não** cadastrar `d1_key_exit`.
- Manter `dungeonArenaScale()` e números existentes. Balance extra é outro pedido.

### 5.3 Contrato dos bosses e das chaves

- Boss 1 concede `d1_key_zone_2`; Boss 2 concede `d1_key_zone_3`; Boss final **não** concede chave.
- A recompensa de chave é determinística. Inimigo comum nunca concede chave.
- Para evitar duplicatas: conceder chave somente se o jogador ainda não possui aquele ID e o portão correspondente ainda não foi aberto nesta run.
- Cadastrar as duas chaves em `items.json` como materiais stackáveis com `items/seal.svg`.

### 5.4 Inimigos (cogumelos) — fechado

Cadastrar em `game/src/data/monsters/monsters.json` e referenciar por `monsterId` em **todos** os spawns da D1 em `dungeons.json`. Nomes de exibição:

| `monsterId` | Nome (UI) | Zona | Papel |
|---|---|---|---|
| `cogumelo_minion` | Cogumelo Minion | 1 | minion |
| `cogumelo_boss` | Cogumelo Boss | 1 | boss (+ chave Z2) |
| `cogumelo_minion_2` | Cogumelo Minion 2 | 2 | minion |
| `cogumelo_boss_2` | Cogumelo Boss 2 | 2 | boss (+ chave Z3) |
| `cogumelo_minion_3` | Cogumelo Minion 3 | 3 | minion |
| `cogumelo_boss_3` | Cogumelo Boss 3 | 3 | boss final (sem chave) |

- Stats, arquétipo (`chaser`/`fixed`/etc.), XP, respawn e `modelUrl` seguem o pipeline atual de monstro — **provisório** até modelos 3D de cogumelo existirem (greybox/cor permitido no primeiro delivery).
- Não reutilizar `fixed`/`chaser`/`ranged` como identidade visual da D1; o jogador deve ver cogumelos por nome no HUD/log.

## 6. Regras do portão e do fluxo

Cada portão de progressão tem somente dois estados: `fechado` e `aberto`.

1. **Fechado sem a chave correta:** não consome nada, mantém colisão, mensagem curta com requisito (once por entrada no raio).
2. **Fechado com chave correta:** consumir uma unidade, marcar gate aberto, remover collider, visual aberto, `persistSave(true)`.
3. **Aberto:** permanece aberto pelo resto da run.
4. **Chave errada:** nunca abre e não consome outra chave.
5. **Nova run:** portões fechados de novo; chaves não usadas permanecem no inventário.

Proximidade: `INTERACT_RANGE = 1.6` em `CityGameSession.ts`, medido até o eixo do gate.

### Limites de zona e combate

- Inimigos não atravessam limites da zona; sem aggro/ataque através de portão fechado.
- Travessia 1→2 e 2→3 sem loading, sem teleporte, sem reiniciar `DungeonRun`.
- **Zona 3:** farm livre até timer/morte; **sem** interactable de saída no chão.

## 7. Arquivos e ordem da implementação

### Fase A — Contratos e dados

- Criar `game/src/world/worldConstants.ts` com `CITY_WORLD_SIZE = 36`.
- Estender `dungeon-definitions.ts` com `DungeonZoneDef`, `DungeonGateDef`, campos opcionais em `DungeonDef` e `ArenaDef.zoneId?`.
- Atualizar definição D1 em `dungeons.json`: três zonas, **dois** gates, **seis** spawns com `monsterId` cogumelo (§5.4), **duas** chaves.
- Cadastrar **seis** monstros cogumelo em `monsters.json`.
- Cadastrar só `d1_key_zone_2` e `d1_key_zone_3` em `items.json`.

### Fase B — World conectado e apresentação dos gates

- Criar `Dungeon1WorldBuilder.ts` (36 × 108, spawn `(0, 2)`, **sem** `portal-exit`).
- Criar `DungeonGateView.ts` (dois gates).
- Atualizar `WorldManager.ts` para `dungeon-1`; reset dos dois gates no início de cada run.

### Fase C — Estado e regra do portão

- `DungeonRun.openedGateIds`; `DungeonGateService`; integração em `CityGameSession` + roteamento `dungeon-1`.

### Fase D — Bosses e limites de combate

- `zoneId` em `EnemyModel`; chave em `grantKillXp()` **apenas** spawns `d1-a1-boss` e `d1-a2-boss` (cogumelo boss / boss 2); `EnemyAI` + filtros de alvo.

### Fase E — HUD, inventário e save

- `currentArenaLabel()` para D1; feedback de chaves; save nos pontos já descritos.

### Fase F — QA

- `game/scripts/check-dungeon-1.mjs`: duas chaves, dois gates, Zona 3 sem portal, saída por timeout/morte, regressão D2.

## 8. Critérios de aceite

### Espaço e acesso

- [ ] Entrar em `dungeon-1` constrói world D1, não `dungeon-test`.
- [ ] Três zonas 36 × 36; spawn na Zona 1; sem contorno das paredes.
- [ ] **Dois** portões de progressão fechados em toda run nova.
- [ ] **Nenhum** `portal-exit` no world D1.

### Boss, item e portão

- [ ] Boss por zona; respawn 180 s.
- [ ] Boss 1 → `d1_key_zone_2`; Boss 2 → `d1_key_zone_3`; Boss 3 → **sem** chave; comum → **sem** chave.
- [ ] Duas chaves na mochila com ícone; persistem se não consumidas.
- [ ] Gates 1 e 2: abertura automática + consumo único; sem chave → bloqueio + mensagem.
- [ ] Inventário cheio ao ganhar chave → mensagem; retry após respawn.

### Run e repetição

- [ ] Timer 600 s contínuo entre zonas.
- [ ] Retorno à cidade **somente** morte ou timeout (dungeon sem saída).
- [ ] Inimigos visíveis como cogumelo minion/boss (1/2/3) por zona; bosses Z1/Z2 concedem chaves.
- [ ] Próxima run reseta os dois gates.

### Validação técnica

- [ ] `npm run typecheck`, `build`, `smoke`.
- [ ] `check-dungeon-1.mjs` + `check-dungeon-2.mjs`.
- [ ] Felipe valida escala, portões, Zona 3 sem portal.

## 9. Decisões fechadas para o delivery

- Três zonas 36 × 36 em world 36 × 108; **dois** gates de progressão.
- **Dungeon não tem saída** (nenhuma zona, nenhum portal `portal-exit`).
- **Zona 3:** sem portão, sem chave — farm até morte ou fim dos 600 s.
- **Inimigos:** cogumelo minion/boss por zona; variantes 2 e 3 nas zonas 2 e 3 (§5.4).
- Boss 1 e 2 concedem chaves de progressão; Boss 3 só loot/XP de boss.
- Chaves persistentes; gates efêmeros por run.
- Sem `dungeonClears`, quests ou framework genérico de dungeons.

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

**Validação deste documento:** revisado em 2026-09-26; regra da Zona 3 fechada pelo Felipe (sem portal/chave). Antes de cada fase: `cd game && npm run typecheck`, smoke e `check-dungeon-2.mjs`.

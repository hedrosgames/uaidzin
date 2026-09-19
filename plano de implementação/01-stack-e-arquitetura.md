# 01. Stack e Arquitetura

## Objetivo

Este documento define as decisões técnicas definitivas para a implementação do UAIDZIN. A IA de programação deve seguir esta arquitetura e não criar uma arquitetura alternativa durante a produção.

O projeto será um jogo 3D para navegador, single-player e offline. O código deve ser modular, previsível e fácil de alterar. Regras de gameplay ficam fora da camada de renderização e conteúdo fica separado dos sistemas.

## Stack definitiva

### Runtime

- HTML5
- CSS3
- TypeScript
- Vite
- Three.js
- Rapier3D
- Howler.js
- GSAP

### Formatos

- GLB/GLTF é o formato de runtime dos modelos 3D.
- Texturas usam os formatos suportados diretamente pelo navegador e pela pipeline escolhida.
- JSON/TypeScript tipado é usado para dados de conteúdo e balanceamento.

### Persistência

- IndexedDB é a persistência principal.
- LocalStorage fica restrito a preferências pequenas e não críticas.

### Regra sobre bibliotecas

Uma biblioteca nova só pode ser adicionada quando resolve uma necessidade real do projeto. Não adicionar framework de gameplay, ECS, container de dependency injection ou state manager externo.

## Princípios arquiteturais

1. Gameplay não depende de Three.js.
2. UI não contém regra de negócio.
3. Dados de conteúdo não contêm comportamento executável.
4. Systems de gameplay não acessam DOM diretamente.
5. Renderers e Controllers visuais apenas representam estado e executam comandos de apresentação.
6. Comunicação entre domínios acontece por interfaces explícitas e eventos tipados.
7. Dependências apontam para dentro, nunca de forma circular.
8. O estado persistente usa modelos serializáveis, sem referências a objetos de runtime.
9. Um objeto Three.js nunca é salvo no save.
10. Valores de balanceamento ficam centralizados nos dados.

## Arquitetura em camadas

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Data / Persistence
```

### Presentation

Responsável por Three.js, câmera, animações, efeitos, áudio e DOM/UI.

### Application

Orquestra comandos e fluxos. Decide quando iniciar dungeon, encerrar dungeon, processar morte, carregar cidade e salvar.

### Domain

Contém as regras do jogo: personagem, combate, inimigos, skills, inventário, itens, economia, progressão, dungeon e loot.

### Data / Persistence

Contém definições estáticas de conteúdo e acesso ao save.

## Estrutura definitiva de código

```text
src/
  app/
    GameApp.ts
    GameCompositionRoot.ts
    GameLoop.ts
    GameBootstrap.ts

  core/
    events/
      EventBus.ts
      GameEventMap.ts
    state/
      GameState.ts
      GameStateStore.ts
      GameMode.ts
    time/
      GameClock.ts
      GameTimer.ts
    math/
      MathUtils.ts
      Random.ts
    errors/
      GameError.ts
      ErrorReporter.ts
    ids/
      IdGenerator.ts

  data/
    classes/
    skills/
    items/
    enemies/
    dungeons/
    balance/
    DataRegistry.ts
    DataLoader.ts
    DataValidator.ts

  domain/
    character/
      CharacterModel.ts
      CharacterService.ts
      AttributeService.ts
      CharacterStats.ts
    combat/
      CombatService.ts
      DamageCalculator.ts
      HitChanceCalculator.ts
      TargetingService.ts
      AttackController.ts
    enemies/
      EnemyModel.ts
      EnemyService.ts
      EnemyAI.ts
      EnemyFactory.ts
    skills/
      SkillService.ts
      SkillTreeService.ts
      SpecializationService.ts
    inventory/
      InventoryModel.ts
      InventoryService.ts
    items/
      ItemModel.ts
      ItemService.ts
      EquipmentService.ts
      RefinementService.ts
    loot/
      LootService.ts
      DropTableService.ts
    economy/
      EconomyService.ts
      ShopService.ts
    progression/
      ProgressionService.ts
      EvolutionService.ts
      ResetService.ts
      ExperienceService.ts
    dungeons/
      DungeonService.ts
      DungeonRun.ts
      ArenaService.ts
      SpawnService.ts
      DungeonRewardService.ts
    quests/
      QuestService.ts

  world/
    WorldManager.ts
    SceneManager.ts
    CityWorld.ts
    DungeonWorld.ts
    ArenaWorld.ts
    SpawnPoint.ts
    WorldBoundary.ts

  gameplay/
    PlayerController.ts
    PlayerRuntime.ts
    EnemyRuntime.ts
    ProjectileRuntime.ts
    CombatRuntime.ts

  presentation/
    rendering/
      Renderer.ts
      SceneRenderer.ts
      ModelLoader.ts
      AssetCache.ts
    camera/
      GameCamera.ts
      CameraController.ts
    animation/
      AnimationController.ts
    effects/
      EffectManager.ts
    audio/
      AudioManager.ts

  ui/
    UIManager.ts
    HUD.ts
    screens/
    components/
    notifications/

  persistence/
    SaveService.ts
    SaveRepository.ts
    SaveSerializer.ts
    SaveMigrations.ts
    SaveValidator.ts

  debug/
    DebugManager.ts
    DebugPanel.ts
    DebugCommands.ts

  main.ts
```

A árvore acima é a estrutura de referência. Um arquivo adicional só deve ser criado quando houver responsabilidade própria suficiente para justificar sua existência.

## Composição e dependências

`GameCompositionRoot` instancia todos os serviços e injeta suas dependências explicitamente.

Não usar singleton global para sistemas de gameplay.

Exemplo de direção de dependências:

```text
GameApp
  ├─ GameStateStore
  ├─ EventBus
  ├─ DataRegistry
  ├─ WorldManager
  ├─ CharacterService
  ├─ CombatService
  ├─ DungeonService
  ├─ LootService
  ├─ InventoryService
  ├─ ProgressionService
  ├─ EconomyService
  ├─ SkillService
  ├─ SaveService
  └─ UIManager
```

Os serviços recebem apenas as dependências necessárias. `CombatService` não recebe `UIManager`, `Scene`, `Mesh` ou `HTMLElement`.

## Comunicação entre sistemas

Há duas formas oficiais de comunicação.

### Chamada direta

Usada quando existe uma dependência de negócio clara e síncrona.

Exemplo:

```text
CombatService
  → DamageCalculator
  → HitChanceCalculator
  → CharacterService
```

### Event Bus

Usado para comunicar efeitos entre domínios sem acoplamento.

Eventos são tipados em `GameEventMap.ts`.

Eventos principais:

```text
game:ready
game:state-changed
character:created
character:stats-changed
character:level-up
character:death
character:respawned
combat:attack-started
combat:hit
combat:miss
combat:damage
combat:target-defeated
skill:used
skill:learned
skill:specialization-changed
inventory:item-added
inventory:item-lost-full
inventory:item-removed
equipment:changed
equipment:refined
economy:gold-changed
loot:generated
loot:collected
progression:evolution-changed
progression:reset
 dungeon:entered
dungeon:arena-entered
dungeon:timer-updated
dungeon:completed
dungeon:expired
dungeon:exited
save:started
save:completed
save:failed
notification:requested
```

Eventos carregam dados mínimos e serializáveis. Não enviar `Mesh`, `Object3D`, `HTMLElement` ou referências de sistemas dentro de eventos.

## Fluxo de comandos

A UI não altera diretamente os modelos.

```text
UI
 ↓
Application/Service
 ↓
Domain Model
 ↓
EventBus
 ↓
Presentation/UI
```

Exemplo de venda:

```text
ShopScreen
 → ShopService.sellItem(itemId)
 → InventoryService.removeItem(itemInstanceId)
 → EconomyService.addGold(value)
 → EventBus(inventory:item-removed)
 → EventBus(economy:gold-changed)
 → UI atualiza
```

## Estado do jogo

`GameStateStore` mantém somente estado de aplicação necessário para o fluxo atual.

O estado é dividido em:

```text
session
character
inventory
equipment
progression
economy
dungeon
settings
```

Estado visual como câmera, meshes, partículas e animações fica fora do save state.

## Máquina de estados

A aplicação usa:

```text
BOOT
CITY
PREPARATION
DUNGEON
RESULT
```

Estados auxiliares:

```text
LOADING
PAUSED
DEAD
```

`DEAD` é um estado transitório dentro do fluxo de dungeon. Depois da confirmação do processamento da morte, o jogador retorna à cidade.

O `GameStateStore` não cria nem destrói objetos Three.js. A mudança de estado notifica o `WorldManager`, que troca a representação do mundo.

## Responsabilidades dos principais sistemas

### GameApp

Coordena o ciclo de vida da aplicação e conecta os sistemas.

### WorldManager

Cria, ativa, desativa e descarrega mundos 3D. Não calcula dano, XP, loot ou economia.

### PlayerController

Lê input e produz intenção de movimento. Não decide atributos, dano ou loot.

### PlayerRuntime

Representa o personagem no mundo 3D e sincroniza transform, animação e estado de apresentação.

### CharacterService

É a autoridade sobre atributos e estado persistente do personagem.

### CombatService

Orquestra ataques, valida alvo, calcula acerto e dano e aplica resultados por meio dos serviços de domínio.

### AttackController

Controla o ciclo de ataque automático/manual no runtime, obedecendo as condições definidas pelo domínio.

### EnemyService

É a autoridade sobre entidades inimigas ativas e seus estados de gameplay.

### EnemyAI

Executa somente comportamento de movimento e intenção de ataque do inimigo. Não calcula loot nem modifica inventário.

### DungeonService

Controla entrada, sessão, timer, arenas, encerramento e resultado da dungeon.

### SpawnService

Controla waves, respawns e pontos fixos de spawn.

### LootService

Gera recompensas a partir das tabelas de drop e entrega o resultado ao inventário/economia/progressão.

### InventoryService

É a única autoridade para adicionar/remover itens do inventário. Também trata capacidade cheia.

### EquipmentService

Controla equipar, desequipar e validar slots.

### ProgressionService

Controla XP e level da evolução atual.

### EvolutionService

Controla Mortal, Arch e Cele e suas regras de entrada.

### ResetService

Executa reset, removendo somente o que a regra de reset determina e preservando o patrimônio definido pelo GDD.

### SkillService

Controla aprendizado, disponibilidade, uso e automação das skills.

### EconomyService

Controla Gold e demais recursos econômicos definidos pelo jogo.

### SaveService

É o único ponto de entrada para salvar/carregar estado persistente.

## Regra de autoridade

Cada dado importante possui um único dono:

| Dado | Autoridade |
|---|---|
| Level/XP | ProgressionService |
| Atributos | CharacterService |
| Skills | SkillService |
| Especialização | SpecializationService |
| Inventário | InventoryService |
| Equipamento | EquipmentService |
| Refinamento | RefinementService |
| Gold | EconomyService |
| Sessão de dungeon | DungeonService |
| Spawn | SpawnService |
| Recompensa | LootService |
| Save | SaveService |

Nenhum outro sistema deve editar diretamente esses dados.

## Conteúdo data-driven

`DataRegistry` carrega definições imutáveis para:

- classes
- árvores de skills
- skills
- itens
- inimigos
- dungeons
- arenas
- tabelas de drop
- balanceamento

Instâncias do jogo referenciam esses dados por IDs.

Exemplo:

```text
enemy: slime_01
item: sword_001
skill: tk_control_01
dungeon: dungeon_01
```

## Separação entre definição e instância

Um `ItemDefinition` descreve o tipo do item.

Um `ItemInstance` representa a cópia concreta guardada no inventário.

O mesmo princípio vale para inimigos, personagens e dungeons quando existir estado runtime.

## Runtime 3D

Three.js representa o mundo. As regras são independentes dele.

```text
EnemyModel
   ↓
EnemyRuntime
   ↓
Three.Object3D
```

O sentido inverso não deve existir. Um `Object3D` nunca deve ser usado como entidade de domínio.

## Loop principal

`GameLoop` executa:

```text
input
→ update domain
→ update runtime
→ update world
→ update presentation
→ render
```

Serviços de domínio não devem assumir uma taxa fixa de renderização. Cooldowns e timers usam `GameClock`.

## Update e tempo

Todos os sistemas que dependem de tempo recebem `deltaTime` pelo ciclo de aplicação ou consultam `GameClock`.

Nunca usar múltiplos `setInterval` independentes para regras de gameplay.

`setTimeout` e `setInterval` ficam restritos a UI ou operações não determinísticas quando apropriado.

## Erros

Erros de domínio devem ser previsíveis e tratáveis. Operações inválidas retornam resultado de falha ou lançam `GameError` tipado conforme a criticidade.

Falhas de save nunca devem sobrescrever silenciosamente um save válido.

Falhas de asset devem gerar log claro e usar placeholder visual quando possível durante desenvolvimento.

## Debug

`DebugCommands` deve permitir, apenas em desenvolvimento:

- mudar nível
- conceder Gold
- conceder item
- conceder XP
- equipar item
- aplicar refinamento
- aprender skill
- alterar especialização
- teleportar
- iniciar dungeon
- completar dungeon
- alterar timer
- spawnar inimigo
- matar inimigo
- matar jogador

A ferramenta de debug deve chamar os mesmos serviços usados pelo jogo normal. Nunca modificar estado diretamente por fora das autoridades definidas.

## O que não será usado

- Backend.
- Multiplayer.
- ECS obrigatório.
- Framework de UI de gameplay.
- Container de DI.
- Singleton global para domínio.
- Testes automatizados como requisito do projeto.

## Critério de conclusão arquitetural

A arquitetura está concluída quando a equipe consegue localizar cada regra em um único domínio, criar uma dungeon usando apenas dados, trocar a implementação visual sem alterar as regras de combate e salvar/carregar o estado sem serializar objetos de Three.js.

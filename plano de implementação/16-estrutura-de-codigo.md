# 16. Estrutura Completa de Código

## Objetivo

Definir os arquivos de código que a implementação deve criar, a responsabilidade de cada um e as relações entre eles. A IA deve usar esta estrutura como referência principal para organização do projeto.

## Árvore final

```text
src/
├── main.ts
│
├── app/
│   ├── GameApp.ts
│   ├── GameBootstrap.ts
│   ├── GameCompositionRoot.ts
│   ├── GameLoop.ts
│   └── GameCommands.ts
│
├── core/
│   ├── events/
│   │   ├── EventBus.ts
│   │   └── GameEventMap.ts
│   ├── state/
│   │   ├── GameMode.ts
│   │   ├── GameState.ts
│   │   └── GameStateStore.ts
│   ├── time/
│   │   ├── GameClock.ts
│   │   └── GameTimer.ts
│   ├── result/
│   │   ├── Result.ts
│   │   └── ResultCode.ts
│   ├── errors/
│   │   ├── GameError.ts
│   │   └── ErrorReporter.ts
│   ├── ids/
│   │   └── IdGenerator.ts
│   ├── math/
│   │   ├── MathUtils.ts
│   │   └── Random.ts
│   └── utils/
│       └── Disposable.ts
│
├── data/
│   ├── DataRegistry.ts
│   ├── DataLoader.ts
│   ├── DataValidator.ts
│   ├── classes/
│   │   └── ClassDefinition.ts
│   ├── skills/
│   │   ├── SkillDefinition.ts
│   │   ├── SkillTreeDefinition.ts
│   │   └── BookSkillDefinition.ts
│   ├── items/
│   │   ├── ItemDefinition.ts
│   │   ├── EquipmentDefinition.ts
│   │   └── RefinementDefinition.ts
│   ├── enemies/
│   │   ├── EnemyDefinition.ts
│   │   └── EnemyBehaviorDefinition.ts
│   ├── dungeons/
│   │   ├── DungeonDefinition.ts
│   │   ├── ArenaDefinition.ts
│   │   ├── SpawnDefinition.ts
│   │   └── DropTableDefinition.ts
│   └── balance/
│       ├── CombatBalance.ts
│       ├── ProgressionBalance.ts
│       └── EconomyBalance.ts
│
├── domain/
│   ├── character/
│   │   ├── CharacterModel.ts
│   │   ├── CharacterStats.ts
│   │   ├── CharacterService.ts
│   │   └── AttributeService.ts
│   ├── combat/
│   │   ├── AttackState.ts
│   │   ├── AttackController.ts
│   │   ├── CombatService.ts
│   │   ├── DamageCalculator.ts
│   │   ├── HitChanceCalculator.ts
│   │   └── TargetingService.ts
│   ├── enemies/
│   │   ├── EnemyModel.ts
│   │   ├── EnemyService.ts
│   │   ├── EnemyFactory.ts
│   │   ├── EnemyAI.ts
│   │   └── EnemyTargeting.ts
│   ├── skills/
│   │   ├── SkillService.ts
│   │   ├── SkillTreeService.ts
│   │   ├── SkillRuntime.ts
│   │   ├── SpecializationService.ts
│   │   └── SkillAutomationService.ts
│   ├── items/
│   │   ├── ItemModel.ts
│   │   ├── ItemFactory.ts
│   │   ├── EquipmentService.ts
│   │   ├── RefinementService.ts
│   │   └── EquipmentStatsService.ts
│   ├── inventory/
│   │   ├── InventoryModel.ts
│   │   └── InventoryService.ts
│   ├── loot/
│   │   ├── LootService.ts
│   │   ├── DropTableService.ts
│   │   └── RewardProcessor.ts
│   ├── economy/
│   │   ├── EconomyService.ts
│   │   └── ShopService.ts
│   ├── progression/
│   │   ├── ProgressionService.ts
│   │   ├── ExperienceService.ts
│   │   ├── EvolutionService.ts
│   │   └── ResetService.ts
│   ├── dungeons/
│   │   ├── DungeonService.ts
│   │   ├── DungeonRun.ts
│   │   ├── ArenaService.ts
│   │   ├── SpawnService.ts
│   │   └── DungeonRewardService.ts
│   └── quests/
│       ├── QuestModel.ts
│       └── QuestService.ts
│
├── gameplay/
│   ├── input/
│   │   ├── InputManager.ts
│   │   └── InputState.ts
│   ├── player/
│   │   ├── PlayerController.ts
│   │   └── PlayerRuntime.ts
│   ├── enemies/
│   │   └── EnemyRuntime.ts
│   ├── combat/
│   │   ├── CombatRuntime.ts
│   │   └── ProjectileRuntime.ts
│   └── interactions/
│       ├── InteractionDetector.ts
│       └── InteractionTarget.ts
│
├── world/
│   ├── WorldManager.ts
│   ├── SceneManager.ts
│   ├── WorldDefinition.ts
│   ├── CityWorld.ts
│   ├── DungeonWorld.ts
│   ├── ArenaWorld.ts
│   ├── SpawnPoint.ts
│   └── WorldBoundary.ts
│
├── presentation/
│   ├── rendering/
│   │   ├── Renderer.ts
│   │   ├── SceneRenderer.ts
│   │   ├── ModelLoader.ts
│   │   └── AssetCache.ts
│   ├── camera/
│   │   ├── GameCamera.ts
│   │   └── CameraController.ts
│   ├── animation/
│   │   └── AnimationController.ts
│   └── effects/
│       ├── EffectManager.ts
│       ├── ProjectilePool.ts
│       └── EnemyPool.ts
│
├── ui/
│   ├── UIManager.ts
│   ├── UIStateMapper.ts
│   ├── HUD.ts
│   ├── screens/
│   │   ├── CityScreen.ts
│   │   ├── CharacterScreen.ts
│   │   ├── InventoryScreen.ts
│   │   ├── EquipmentScreen.ts
│   │   ├── SkillScreen.ts
│   │   ├── ShopScreen.ts
│   │   ├── DungeonScreen.ts
│   │   └── ResultScreen.ts
│   ├── components/
│   │   ├── Button.ts
│   │   ├── ProgressBar.ts
│   │   ├── ItemSlot.ts
│   │   └── SkillSlot.ts
│   └── notifications/
│       └── NotificationService.ts
│
├── persistence/
│   ├── SaveService.ts
│   ├── SaveRepository.ts
│   ├── SaveSerializer.ts
│   ├── SaveValidator.ts
│   └── SaveMigrations.ts
│
├── audio/
│   ├── AudioManager.ts
│   └── AudioCatalog.ts
│
└── debug/
    ├── DebugManager.ts
    ├── DebugPanel.ts
    └── DebugCommands.ts
```

## Regras de dependência

A direção de dependência deve seguir estas regras:

```text
app
 ↓
world / gameplay / ui
 ↓
domain
 ↓
data / core
```

`persistence` também depende de `core` e dos tipos serializáveis de domínio, mas não de Presentation.

`presentation` pode adaptar objetos de domínio para o runtime 3D, mas o domínio não pode importar Presentation.

`ui` pode chamar Application/Domain Services por contratos públicos. UI nunca deve editar modelos diretamente.

## Contratos públicos

Cada domínio deve expor uma superfície pequena de métodos públicos. Implementação interna fica privada.

Exemplo:

```ts
interface InventoryService {
  getSnapshot(): InventorySnapshot;
  addItem(item: ItemInstance): AddItemResult;
  removeItem(instanceId: string): RemoveItemResult;
  canAddItem(item: ItemInstance): boolean;
}
```

Os demais sistemas dependem do contrato, não da estrutura interna.

## Modelos de estado

Modelos de domínio não devem conter referências de renderização.

Exemplo:

```ts
interface CharacterModel {
  id: string;
  classId: string;
  evolution: EvolutionId;
  level: number;
  experience: number;
  attributes: Attributes;
  learnedSkills: LearnedSkillState[];
  specialization: SpecializationState;
  equipment: EquipmentState;
  status: CharacterStatus;
}
```

## Runtime versus domínio

O padrão é sempre:

```text
Domain Model
    ↓
Runtime Adapter
    ↓
Three.js Object3D
```

Exemplo:

```text
EnemyModel
→ EnemyRuntime
→ Object3D
```

`EnemyRuntime` lê a posição e o estado do domínio e atualiza o objeto visual. Ele não inventa HP, dano ou regras de drop.

## Player

`PlayerController` recebe input e gera intenção de movimento.

`PlayerRuntime` aplica a movimentação ao personagem visual e atualiza câmera/animação.

`CharacterService` permanece como autoridade dos dados do personagem.

O personagem não possui navegação autônoma.

## Combate

```text
AttackController
    ↓
TargetingService
    ↓
CombatService
    ↓
DamageCalculator / HitChanceCalculator
    ↓
EnemyService / CharacterService
    ↓
EventBus
```

`CombatRuntime` recebe eventos de combate e produz efeitos visuais.

## Inimigos

`EnemyFactory` cria o modelo de domínio a partir de uma `EnemyDefinition`.

`EnemyAI` calcula intenção de movimento/ataque.

`EnemyService` aplica a mudança de estado.

`EnemyRuntime` representa visualmente o inimigo.

Comportamentos principais definidos pelos dados:

- estacionário
- perseguidor
- ranged

A IA nunca deve criar um sistema de navegação automática para o jogador.

## Dungeon

```text
DungeonService
 ├─ DungeonRun
 ├─ ArenaService
 └─ SpawnService
```

`DungeonService` controla o ciclo geral.

`DungeonRun` guarda o estado da execução atual.

`ArenaService` ativa/desativa arenas conforme a sequência fixa definida pelos dados.

`SpawnService` controla waves e respawns.

Não existe geração procedural nem escolha de caminho.

## Loot

```text
Enemy defeated
→ LootService
→ DropTableService
→ RewardProcessor
→ InventoryService / EconomyService / ProgressionService
```

O item não passa pelo mundo físico. O resultado é entregue diretamente ao inventário quando houver espaço.

## Save

```text
Domain state
→ SaveService
→ SaveSerializer
→ SaveValidator
→ SaveRepository
→ IndexedDB
```

No carregamento:

```text
IndexedDB
→ SaveRepository
→ SaveSerializer
→ SaveMigrations
→ SaveValidator
→ GameState
```

## UI

A UI consome snapshots e eventos.

Ela não conhece `Object3D` nem manipula regras internas.

Quando o jogador clica em uma ação:

```text
UI
→ Service
→ resultado
→ EventBus
→ UI atualiza
```

## Audio

`AudioManager` reage a eventos e estados. Sistemas de gameplay não chamam diretamente bibliotecas de áudio.

Exemplo:

```text
combat:hit
→ AudioManager
→ som de impacto
```

## Regra de criação de novos scripts

Antes de criar um novo arquivo, a IA deve responder:

1. Qual responsabilidade única este arquivo possui?
2. Qual sistema é dono dessa responsabilidade?
3. O código pode ser colocado em arquivo existente sem misturar responsabilidades?
4. O novo arquivo cria uma dependência circular?

Se a responsabilidade já pertence a outro módulo, alterar o módulo existente em vez de duplicar lógica.

## Critério de conclusão

A estrutura está corretamente implementada quando todos os sistemas principais podem ser lidos e modificados por domínio, sem um `GameManager` gigante e sem regras de gameplay escondidas em componentes visuais.

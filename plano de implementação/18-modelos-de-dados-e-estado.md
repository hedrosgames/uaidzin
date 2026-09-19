# 18. Modelos de Dados e Estado

## Objetivo

Definir os contratos de dados que unem gameplay, conteúdo e persistência. O código deve tratar definições de conteúdo e instâncias runtime como coisas diferentes.

## Regras

- IDs são strings estáveis e únicas.
- Dados de conteúdo são imutáveis durante a execução.
- Estado runtime é mutável apenas pelo serviço responsável.
- Estado persistente contém somente tipos serializáveis.
- Nenhum modelo de save contém `Object3D`, `Vector3`, `Mesh`, `Scene`, `Material`, `HTMLElement`, callback ou classe de runtime.
- O domínio não depende da representação 3D.

## Identificadores

Usar convenção:

```text
class:tk
skill:tk_control_01
item:sword_001
enemy:slime_001
dungeon:dungeon_001
arena:dungeon_001_arena_01
spawn:dungeon_001_arena_01_spawn_01
shop:city_general
quest:city_001
```

Dentro do código, armazenar somente a parte necessária do ID ou usar um tipo/namespace equivalente. IDs devem ser estáveis entre versões do jogo para não quebrar saves.

## Tipos primitivos de domínio

```ts
type Id = string;
type ClassId = string;
type SkillId = string;
type ItemId = string;
type ItemInstanceId = string;
type EnemyId = string;
type DungeonId = string;
type ArenaId = string;
type SpawnId = string;

type EvolutionId = 'mortal' | 'arch' | 'cele';

type EquipmentSlot =
  | 'head'
  | 'armor'
  | 'weapon'
  | 'ring_left'
  | 'ring_right'
  | 'necklace'
  | 'earring';
```

## Atributos

```ts
interface Attributes {
  str: number;
  dex: number;
  con: number;
  int: number;
}
```

Os efeitos concretos de cada atributo são resolvidos por `AttributeService` e `CharacterStats`.

## Estado do personagem

```ts
interface CharacterState {
  id: Id;
  classId: ClassId;
  evolution: EvolutionId;
  level: number;
  experience: number;
  attributes: Attributes;
  availableAttributePoints: number;
  learnedSkills: LearnedSkillState[];
  specialization: SpecializationState;
  equipment: EquipmentState;
  hp: number;
  maxHp: number;
  status: CharacterStatus;
}
```

### Estado de reset

```ts
interface ResetState {
  mortalResets: number;
  archResets: number;
  celeResets: number;
  availableResetAttributePoints: number;
}
```

A contagem de resets é separada por evolução. Os pontos adicionais concedidos por reset são armazenados separadamente dos pontos normais de nível.

## Skills

```ts
interface LearnedSkillState {
  skillId: SkillId;
  learned: boolean;
  level: number;
}

interface SkillTreeState {
  treeId: string;
  purchasedSkillIds: SkillId[];
  selectedEighthSkillId: SkillId | null;
}

interface SpecializationState {
  pointsByTreeId: Record<string, number>;
}
```

A disponibilidade das skills é calculada combinando classe, evolução, árvore, requisitos e estado de compra.

## Equipamento

```ts
interface EquipmentState {
  slots: Partial<Record<EquipmentSlot, ItemInstanceId>>;
}
```

O equipamento equipado aponta para uma instância de item no patrimônio do personagem.

Equipamento não é destruído por reset.

## Item Definition

```ts
interface ItemDefinition {
  id: ItemId;
  name: string;
  type: ItemType;
  stackable: boolean;
  maxStack: number;
  sellValue: number;
  rarity: ItemRarity;
}
```

## Item Instance

```ts
interface ItemInstance {
  instanceId: ItemInstanceId;
  definitionId: ItemId;
  quantity: number;
  refinementLevel?: number;
  rolledStats?: RolledItemStat[];
}
```

Itens únicos não devem compartilhar estado de instância.

## Inventário

```ts
interface InventoryState {
  capacity: number;
  items: ItemInstance[];
}
```

A capacidade é definida por dados/configuração. A regra de adição passa exclusivamente por `InventoryService`.

## Economia

```ts
interface EconomyState {
  gold: number;
  resources: Record<string, number>;
}
```

Gold não deve ser duplicado em personagem, inventário ou dungeon.

## Dungeon Definition

```ts
interface DungeonDefinition {
  id: DungeonId;
  biomeId: string;
  minLevel: number;
  maxLevel: number;
  entryRequirement?: EntryRequirement;
  arenaIds: ArenaId[];
  durationSeconds: 600;
  rewardTableId: string;
}
```

A duração de 600 segundos é regra fixa de arquitetura de runtime para o loop da dungeon.

## Dungeon Run

```ts
interface DungeonRunState {
  dungeonId: DungeonId;
  startedAt: number;
  elapsedSeconds: number;
  activeArenaIndex: number;
  status: DungeonRunStatus;
  rewardsGenerated: boolean;
}
```

A execução corrente nunca é confundida com a definição estática da dungeon.

## Arena

```ts
interface ArenaDefinition {
  id: ArenaId;
  size: { x: number; z: number };
  nextArenaId: ArenaId | null;
  spawnIds: SpawnId[];
  bossEnemyId?: EnemyId;
}
```

A sequência é determinística e definida pelos dados.

## Spawn

```ts
interface SpawnDefinition {
  id: SpawnId;
  enemyId: EnemyId;
  position: { x: number; y: number; z: number };
  behavior: 'stationary' | 'pursuer' | 'ranged';
  respawn: boolean;
  respawnSeconds?: number;
}
```

A posição do spawn é dado do mundo. O runtime converte para `THREE.Vector3` somente na camada de apresentação/world.

## Enemy State

```ts
interface EnemyState {
  instanceId: Id;
  definitionId: EnemyId;
  hp: number;
  position: SerializableVector3;
  status: EnemyStatus;
  targetId: Id | null;
}
```

## Combate

```ts
interface CombatSnapshot {
  attackerId: Id;
  targetId: Id;
  attackType: 'basic' | 'skill';
  hit: boolean;
  damage: number;
  critical: boolean;
}
```

O snapshot descreve o resultado. Efeitos visuais usam esse resultado, não executam novamente o cálculo.

## Progressão

```ts
interface ProgressionState {
  evolution: EvolutionId;
  level: number;
  experience: number;
  resets: ResetState;
}
```

Level e XP devem ter uma única representação persistente. `CharacterState.level` pode ser um espelho de leitura em runtime, mas o save deve usar uma fonte única por contrato escolhido na implementação final.

## Save State

```ts
interface SaveData {
  schemaVersion: number;
  savedAt: number;
  character: CharacterState;
  inventory: InventoryState;
  economy: EconomyState;
  progression: ProgressionState;
  settings: SettingsState;
  unlockedContent: UnlockedContentState;
}
```

O save não deve guardar uma dungeon em andamento como estado reproduzível obrigatório na primeira versão. Ao recarregar durante uma dungeon, usar a política definida em `10-save-e-persistencia.md`: tratar a sessão interrompida de forma determinística e segura, sem duplicar recompensa.

## Game State

`GameState` é o estado de aplicação, não necessariamente o mesmo objeto que é persistido.

```ts
interface GameState {
  mode: GameMode;
  session: SessionState;
  character: CharacterState;
  inventory: InventoryState;
  economy: EconomyState;
  progression: ProgressionState;
  dungeon: ActiveDungeonState | null;
  settings: SettingsState;
}
```

## Store

`GameStateStore` expõe leitura por snapshot e alteração controlada.

```ts
interface GameStateStore {
  getSnapshot(): Readonly<GameState>;
  patchDomain<K extends keyof GameState>(domain: K, value: GameState[K]): void;
  subscribe(listener: StateListener): () => void;
}
```

Serviços não devem usar `patchDomain` indiscriminadamente. Cada domínio continua sendo dono do seu próprio estado. O store serve para compor o estado de aplicação e notificar o fluxo.

## Resultados de operações

Operações que podem falhar usam resultado explícito.

```ts
type AddItemResult =
  | { success: true; itemInstanceId: ItemInstanceId }
  | { success: false; reason: 'inventory-full' | 'invalid-item' };
```

O mesmo padrão deve ser usado para compra, venda, equipar, refinamento, reset, evolução e entrada em dungeon.

## Estado temporário

Os seguintes dados não devem ser persistidos:

- referência de `Object3D`
- animação atual
- partículas
- câmera
- pointer lock
- mouse/teclado
- estado visual de UI
- pools de objetos
- listeners
- timers de apresentação

## Dados de balanceamento

Balanceamento deve ficar em arquivos separados:

```text
data/balance/
  combat.json
  progression.json
  economy.json
  enemies.json
  drops.json
```

O formato pode ser JSON ou TypeScript exportado, mas a primeira versão deve usar dados declarativos e centralizados.

## Regra contra números mágicos

Um número relacionado a gameplay não deve ficar enterrado em método de serviço.

Exemplo incorreto:

```ts
if (level >= 400) { ... }
```

Preferir definição central:

```ts
progressionBalance.maxLevel.mortal
```

Exceção: constantes estruturais da engine, como `DUNGEON_DURATION_SECONDS = 600`, podem existir em `core` quando representam uma regra fixa do sistema e não um parâmetro de balanceamento arbitrário.

## Critério de conclusão

Os modelos estão fechados quando qualquer sistema de gameplay consegue trabalhar apenas com interfaces e IDs, o save pode ser serializado sem objetos de runtime e o conteúdo pode ser alterado sem alterar os serviços de domínio.

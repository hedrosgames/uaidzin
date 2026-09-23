# 17. Comunicação entre Sistemas

## Objetivo

Definir exatamente como os scripts do UAIDZIN conversam. A implementação deve seguir estes contratos para manter o projeto desacoplado e fácil de manter.

## Regra geral

Um sistema deve conversar com outro por um destes mecanismos:

1. Chamada direta a uma interface/serviço quando o primeiro sistema precisa do resultado imediatamente.
2. Event Bus quando o efeito pode ser comunicado de forma desacoplada.
3. Snapshot/consulta de estado quando a UI ou apresentação precisa somente ler informação.

Não usar acesso direto ao estado interno de outro serviço.

## Direção de dependência

```text
UI / Input
    ↓
Application Commands
    ↓
Domain Services
    ↓
Domain Models
    ↓
Data
```

Eventos podem subir de qualquer domínio para consumidores desacoplados:

```text
Domain
  ↓
EventBus
  ├── UI
  ├── Audio
  ├── Presentation
  ├── Save
  └── Analytics/Debug futuro
```

## Event Bus

`EventBus` é um barramento simples, tipado e síncrono para eventos do runtime.

Não criar múltiplos event buses por sistema.

```ts
interface GameEventMap {
  'character:level-up': CharacterLevelUpEvent;
  'combat:hit': CombatHitEvent;
  'inventory:item-added': InventoryItemAddedEvent;
}

interface EventBus {
  on<K extends keyof GameEventMap>(event: K, handler: (payload: GameEventMap[K]) => void): () => void;
  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void;
}
```

Cada `on` retorna função de unsubscribe. Isso evita listeners persistentes após troca de mundo.

## Eventos nunca carregam objetos de runtime visual

Permitido:

```ts
{
  enemyId: 'enemy_123',
  damage: 25,
  critical: false
}
```

Não permitido:

```ts
{
  mesh: enemyMesh,
  scene: scene,
  domElement: element
}
```

## Fluxo de inicialização

```text
main.ts
→ GameBootstrap
→ GameCompositionRoot
→ DataLoader
→ SaveService.load()
→ GameStateStore.initialize()
→ WorldManager.initialize()
→ UIManager.initialize()
→ GameApp.start()
```

Se não houver save válido, `CharacterService.createNewCharacter()` cria o estado inicial.

## Fluxo de entrada na cidade

```text
GameApp
→ GameMode.CITY
→ WorldManager.loadCity()
→ CityWorld.create()
→ UIManager.showCity()
```

A cidade não cria o personagem de domínio. Ela apenas cria a representação visual e os pontos de interação.

## Movimento do jogador

```text
InputManager
→ PlayerController
→ movement intent
→ PlayerRuntime
→ World collision
```

`PlayerController` não altera inventário, atributos ou combate.

O movimento é sempre manual. Não implementar pathfinding do jogador.

## Ataque básico

```text
PlayerRuntime
→ AttackController.update()
→ TargetingService.findTarget()
→ CombatService.executeBasicAttack()
→ HitChanceCalculator
→ DamageCalculator
→ EnemyService.applyDamage()
```

O ataque básico não é disparado enquanto o personagem está em movimento.

A regra de arma e seus parâmetros vêm de `EquipmentService`/`ItemDefinition` e são consumidos pelo combate.

## Dano recebido

```text
CombatService
→ CharacterService.applyDamage()
→ character:damaged
```

Se HP chegar a zero:

```text
CharacterService
→ character:death
→ DungeonService.handlePlayerDeath()
→ SaveService.save()
→ WorldManager.returnToCity()
```

Os recursos obtidos antes da morte permanecem.

## Skills

```text
SkillAutomationService
        ↓
SkillService.canUse()
        ↓
CombatService / SkillRuntime
        ↓
EventBus('skill:used')
```

O modo automático é apenas uma política de uso. A regra de efeito da skill pertence ao domínio.

Quando auto-skill está desligado:

```text
UI/Input
→ GameCommand.useSkill(skillId)
→ SkillService.useSkill(skillId)
```

## Inimigos

```text
EnemyFactory
→ EnemyService.register()
→ EnemyAI.update()
→ EnemyService.updateState()
→ EnemyRuntime.sync()
```

`EnemyAI` nunca concede XP, loot ou Gold diretamente.

Quando um inimigo é derrotado:

```text
EnemyService
→ combat:target-defeated
→ LootService.generate()
→ RewardProcessor.process()
```

## Loot

O loot é resolvido em domínio, não no mundo 3D.

```text
EnemyService
→ LootService
→ DropTableService
→ RewardProcessor
```

O `RewardProcessor` classifica cada recompensa:

```text
Item → InventoryService
XP → ProgressionService
Gold → EconomyService
Material → InventoryService
```

### Inventário cheio

`InventoryService.addItem()` é a autoridade final.

Quando não há espaço:

```text
InventoryService
→ retorna AddItemResult.FULL
→ não adiciona o item
→ emite inventory:item-lost-full
→ NotificationService mostra mensagem
```

Não criar pickup físico para contornar essa regra.

## Inventário e equipamento

Equipar item:

```text
EquipmentScreen
→ EquipmentService.equip(instanceId)
→ InventoryService/EquipmentState
→ EquipmentStatsService.recalculate()
→ character:stats-changed
```

O sistema de equipamento não edita diretamente o estado privado do inventário.

## Refinamento

```text
EquipmentScreen
→ RefinementService.refine(instanceId)
→ EconomyService.spendGold()
→ InventoryService/Resource check
→ EquipmentStatsService.recalculate()
→ equipment:refined
```

Valores e regras de refinamento vêm de `RefinementDefinition`.

## XP e level

```text
RewardProcessor
→ ProgressionService.addExperience()
→ ExperienceService
→ CharacterService.setLevel()
→ character:level-up
```

O cálculo da curva de XP pertence exclusivamente a `ExperienceService`.

## Evolução

```text
EvolutionService.canEvolve()
→ EvolutionService.evolve()
→ CharacterService.setEvolution()
→ ProgressionService.resetLevelForEvolution()
→ progression:evolution-changed
```

As condições de evolução são dados/regras de domínio, não UI.

## Reset

```text
ResetScreen
→ ResetService.canReset()
→ ResetService.executeReset()
   ├─ ProgressionService.resetCurrentCycle()
   ├─ CharacterService.resetCurrentCycleAttributesAndSkills()
   └─ ResetService.grantAdditionalAttributePoints(1000)
→ progression:reset
→ SaveService.save()
```

Equipamento, refinamento, inventário e patrimônio são preservados conforme o GDD.

Os ciclos de Mortal, Arch e Cele permanecem independentes.

## Dungeon

Entrada:

```text
DungeonScreen
→ DungeonService.canEnter(dungeonId)
→ DungeonService.enter(dungeonId)
→ WorldManager.loadDungeon(dungeonId)
→ DungeonService.startRun()
```

Durante a execução:

```text
GameClock
→ DungeonRun.updateTimer()
→ dungeon:timer-updated
```

Quando chega a zero:

```text
DungeonRun
→ dungeon:expired
→ DungeonService.finishRun()
→ SaveService.save()
→ WorldManager.returnToCity()
```

A duração é exatamente 10 minutos a partir da entrada.

## Arenas e spawn

```text
DungeonService
→ ArenaService.activateArena()
→ SpawnService.activateSpawns()
```

O encadeamento das arenas vem do `DungeonDefinition`.

Não existe geração procedural.

`SpawnService` mantém apenas os pontos e regras declarados nos dados.

## Cidade e NPCs

NPCs são pontos de entrada para serviços.

Exemplo:

```text
NPC de loja
→ UIManager.openShop(shopId)
→ ShopService
```

O NPC visual não contém lógica econômica.

## UI e estado

A UI possui dois mecanismos de atualização:

1. Escuta eventos para mudanças pontuais.
2. Consulta snapshots dos serviços para renderização completa de telas.

Exemplo:

```text
InventoryScreen.open()
→ InventoryService.getSnapshot()
```

Depois:

```text
inventory:item-added
inventory:item-removed
→ InventoryScreen.refresh()
```

Não manter uma segunda cópia autoritativa do inventário na UI.

## Save

O save reage a eventos importantes e também pode receber uma chamada explícita no encerramento de uma operação crítica.

Eventos de save:

```text
item adquirido
item equipado
refinamento
level-up
evolução
reset
entrada na dungeon
saída da dungeon
morte
mudança de configuração
```

`SaveService` deve debouncear várias mudanças próximas para evitar escrita excessiva.

## WorldManager e domínio

`WorldManager` não é autoridade de gameplay.

Ele recebe comandos de aplicação:

```ts
loadCity(): Promise<void>
loadDungeon(dungeonId: string): Promise<void>
returnToCity(): Promise<void>
```

O domínio decide por que mudar de mundo. `WorldManager` decide como carregar a representação 3D.

## Audio e efeitos

`AudioManager` e `EffectManager` são consumidores de eventos.

Exemplo:

```text
combat:hit
→ EffectManager.playHit()
→ AudioManager.play('hit')
```

Os serviços de domínio não importam essas classes.

## Debug

`DebugCommands` chama os serviços oficiais.

Exemplo:

```text
DebugCommand.giveGold(1000)
→ EconomyService.addGold(1000)
```

Nunca fazer:

```text
GameState.economy.gold += 1000
```

## Fluxo completo principal

```text
CITY
 ↓
Preparação
 ↓
DungeonService.enter()
 ↓
DungeonWorld
 ↓
SpawnService
 ↓
Player movement
 ↓
AttackController
 ↓
CombatService
 ↓
Enemy defeated
 ↓
LootService
 ↓
Inventory/XP/Gold
 ↓
Progression
 ↓
10 minutos / morte
 ↓
Result
 ↓
Save
 ↓
CITY
```

## Critério de conclusão

Todos os fluxos principais devem ser implementados seguindo esses caminhos sem acesso direto ao estado interno de outro domínio, sem dependência de DOM/Three.js no domínio e sem duplicação de autoridade.

# Dungeon 2 — implementação

Executar passos **1 → 19** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- Depois de `Planos/Refatoracao 2.md` (`markDirty` / `checkpoint`), `5.md` (loja sem `qty`, `ShopService.sellItem`, inventário em `domain/inventory`, drop recusado perdido, stack **999**), `6.md` (`DungeonFlow`: vela consumida antes do fade, sem devolução; `RewardService`), `8.md` (wire em `game/src/ui/wire/`, sem `GamePanels`) e `11.md` (`CityWorld` já com culling do preset).

## Comportamento

- Entrada dungeon `dungeon-2`: consome **1×** item `entry_vela` (compra Mercador **1000** ouro). Estoque infinito: catálogo **sem** `qty`.
- Consumo da vela e falha de `enterWorld`: `checkpoint` crítico **antes** do fade; **sem devolução** (`DungeonFlow`, plano 6).
- Drop `caixa_sabedoria`: caveira especial **100%**; caveira normal **20%**.
- `caixa_sabedoria`: consumível; uso só nível **35–90**; `noSell`, `noVault`; lixeira permitida, com confirmação. Uso concede **100** XP e é evento **crítico** (`checkpoint`). No nível máximo o XP é descartado (issue #44: `addXp` não passa de `xpToNext`; UI “MAX”); a caixa é consumida mesmo assim.
- Respawn: `caveira_normal` **60 s**, `caveira_especial` **90 s**, mesmo ponto.
- World D2: **sem** interactable `portal-exit`; saída por morte ou timeout.
- Jogador nível **≥ 35** sem vela: bloquear entrada; mensagem menciona **“Vela”**. D1 continua pelo painel do portal (sem vela).
- Venda da vela (NPC ou bolsa) pede confirmação. `sellValue` **100** ≤ preço **1000**. Caixa não entra na venda nem no cofre.
- Drop que não cabe: perdido, aviso “Bolsa cheia: <item> perdido.”. Stack máximo **999**.
- Reload da página (o jogo não captura **F5**) mantém o save já gravado.

## Passos

### A — Itens

1. `game/src/data/items/items.json` — `entry_vela` (slot `entry`, ícone `assets/icons/items/vela.svg`, `sellValue` 100); `caixa_sabedoria` (consumível, `minLevel` 35, `maxLevel` 90, `noSell`, `noVault`, ícone `assets/icons/items/caixa_sabedoria.svg`).
2. `game/public/assets/icons/items/vela.svg` e `caixa_sabedoria.svg` — paleta C (Salão/Brasa).
3. `game/src/data/items/item-catalog.ts` — campos `minLevel`, `maxLevel`, `noSell`, `noVault` se ainda não existirem.
4. `game/src/data/balance/consumables.ts` — `caixa_sabedoria: { xp: 100 }` em `CONSUMABLE_BALANCE`.

### B — Entrada com vela

5. `game/src/data/dungeons/dungeons.json` — `dungeon-2.entryItemId = "entry_vela"`.
6. `game/src/data/balance/shops.json` — mercador: `{ "itemId": "entry_vela", "price": 1000 }` sem `qty`.
7. `game/src/app/session/DungeonFlow.ts` — `dungeonEnterMessage` usa o nome via `ITEM_CATALOG`; falta de item passa `entryItemId`. Nível ≥ 35 sem vela bloqueia e a mensagem cita “Vela”.
8. `game/src/ui/wire/portal.ts` — fallback de item de entrada `entry_vela` no portal, via `WireApi`.

### C — Drops por monstro

9. `game/src/data/monsters/monster-definitions.ts` — tipo `MonsterDropDef`; campo `drops?` em `MonsterDef`.
10. `game/src/data/monsters/monsters.json` — tabela de drops da caixa (normal 0,2; especial 1,0).
11. `game/src/domain/economy/EconomyService.ts` — `grantKillLoot(..., monsterId?)` rola `drops` do monstro.
12. `game/src/app/session/RewardService.ts` — `grantKillXp` repassa `enemy.monsterId`; excedente perdido com aviso; um `checkpoint` crítico no frame do abate.

### D — Respawn

13. `game/src/data/monsters/monsters.json` — tempos de respawn 60 s / 90 s nos arquétipos caveira.

### E — Remover saída física

14. `game/src/world/CityWorld.ts` — `buildDungeon2World()`: remover criação de `portal-exit`.
15. `game/scripts/check-dungeon-2.mjs` — remover asserts que exigem portal; assert de **ausência** de `portal-exit`.

### F — UI e regras de inventário

16. `game/src/ui/wire/inventory.ts` — caixa: ocultar “Guardar no baú” e a venda. Descarte pede confirmação.
17. `game/src/domain/economy/ShopService.ts` — `sellItem` recusa `noSell`. `game/src/app/session/VaultTransfer.ts` recusa `noVault`.
18. `game/src/app/CityGameSession.ts` — `tryUseConsumable` valida nível 35–90 para `caixa_sabedoria`; consome o item e chama `addXp(100)` (`ProgressionService` descarta no nível máximo). Um `checkpoint` crítico no uso (sem `persistSave`).

### G — Fechamento

19. `cd game && npm run typecheck && npm run smoke && node scripts/check-dungeon-2.mjs`.

## Testar

- [ ] Comprar vela (1000 ouro, sem quantidade na loja); entrar D2 consome 1; reload mantém o consumo.
- [ ] Sem vela: mensagem contém “Vela”.
- [ ] Drop da caixa; inventário cheio → “Bolsa cheia: <item> perdido.”.
- [ ] Mapa D2 sem `portal-exit`.
- [ ] Caixa: não vende, não vai ao baú; uso bloqueado fora 35–90; descarte pede confirmação.
- [ ] Uso dentro de 35–90: +100 XP e save crítico. No nível máximo a caixa some e o XP não passa de `xpToNext` (UI “MAX”).
- [ ] Venda da vela no NPC e na bolsa pede confirmação.
- [ ] Passo 19 verde.

## Pendências

- Nenhuma.

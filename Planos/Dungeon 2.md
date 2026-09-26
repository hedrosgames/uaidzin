# Dungeon 2 — implementação

Executar passos **1 → 20** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Comportamento

- Entrada dungeon `dungeon-2`: consome **1×** item `entry_vela` (compra Mercador **1000** ouro).
- Drop `caixa_sabedoria`: caveira especial **100%**; caveira normal **20%**.
- `caixa_sabedoria`: consumível; uso só nível **35–90**; `noSell`, `noVault`; lixeira permitida; efeito numérico em `game/src/data/balance/consumables.ts` (`CONSUMABLE_BALANCE`, provisório).
- Respawn: `caveira_normal` **60 s**, `caveira_especial` **90 s**, mesmo ponto.
- World D2: **sem** interactable `portal-exit`; saída por morte ou timeout.
- Jogador nível **≥ 35** sem vela: bloquear entrada; mensagem menciona **“Vela”**. D1 continua pelo painel do portal (sem vela).

## Passos

### A — Itens

1. `game/src/data/items/items.json` — `entry_vela` (slot `entry`, ícone `items/vela.svg`, preço venda 100); `caixa_sabedoria` (consumível, `minLevel` 35, `maxLevel` 90, `noSell`, `noVault`).
2. `visual/telas/assets/items/vela.svg` e `caixa_sabedoria.svg` — paleta C (Salão/Brasa).
3. `game/src/data/items/item-catalog.ts` — campos `minLevel`, `maxLevel`, `noSell`, `noVault` se ainda não existirem.
4. `game/src/data/balance/consumables.ts` — efeito de `caixa_sabedoria`.

### B — Entrada com vela

5. `game/src/data/dungeons/dungeons.json` — `dungeon-2.entryItemId = "entry_vela"`.
6. `game/src/data/shops/shops.json` — mercador: `{ "itemId": "entry_vela", "qty": 10, "price": 1000 }`.
7. `game/src/app/CityGameSession.ts` (ou módulo de mensagem de dungeon) — `dungeonEnterMessage` usa nome do item via `ITEM_CATALOG`; call sites passam `entryItemId` quando falha por falta de item.
8. `visual/telas/03-wire-paineis-cidade.html` — fallback de item de entrada `entry_vela` no UI do portal.

### C — Drops por monstro

9. `game/src/data/monsters/monster-definitions.ts` — tipo `MonsterDropDef`; campo `drops?` em `MonsterDef`.
10. `game/src/data/monsters/monsters.json` — tabela de drops da caixa (normal 0,2; especial 1,0).
11. `game/src/domain/economy/EconomyService.ts` — `grantKillLoot(..., monsterId?)` rola `drops` do monstro.
12. `game/src/app/CityGameSession.ts` — `grantKillXp` repassa `enemy.monsterId` para loot.

### D — Respawn

13. `game/src/data/monsters/monsters.json` — tempos de respawn 60 s / 90 s nos arquétipos caveira.

### E — Remover saída física

14. `game/src/world/CityWorld.ts` — `buildDungeon2World()`: remover criação de `portal-exit`.
15. `game/scripts/check-dungeon-2.mjs` — remover asserts que exigem portal; assert de **ausência** de `portal-exit`.

### F — UI e regras de inventário

16. `visual/telas/03-wire-paineis-cidade.html` — caixa: ocultar “Guardar no baú”; bloquear venda na UI.
17. `game/src/domain/items/InventoryService.ts` — `sell()` recusa itens com `noSell`.
18. `game/src/app/CityGameSession.ts` — `tryUseConsumable` valida nível 35–90 para `caixa_sabedoria`.

### G — Fechamento

19. `cd game && npm run typecheck && npm run smoke && node scripts/check-dungeon-2.mjs`.

## Testar

- [ ] Comprar vela (1000 ouro); entrar D2 consome 1; F5 mantém estado coerente.
- [ ] Sem vela: mensagem contém “Vela”.
- [ ] Drop da caixa; inventário cheio → item perdido (comportamento atual de loot).
- [ ] Mapa D2 sem `portal-exit`.
- [ ] Caixa: não vende, não vai ao baú; uso bloqueado fora 35–90.
- [ ] Passo 19 verde.

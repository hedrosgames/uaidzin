# Dungeon 2 — implementação

## Comportamento

- Entrada: consome 1× `entry_vela` (Mercador 1000 ouro).
- Caveira 2: drop garantido `caixa_sabedoria`; Caveira 1: 20%.
- Caixa: consumível, nível 35–90 para usar; sem venda; sem baú; lixeira ok. Efeito em `CONSUMABLE_BALANCE` (provisório).
- Respawn: `caveira_normal` 60 s, `caveira_especial` 90 s (mesmo ponto).
- Sem `portal-exit` no world D2; saída só morte ou timeout.
- Nível 35+ sem vela: bloqueio com mensagem citando “Vela”; D1 pelo painel do portal.

## Passos

### 1 — Itens e ícones

1. `items.json`: `entry_vela` (slot `entry`, ícone `items/vela.svg`, sell 100); `caixa_sabedoria` (consumível, minLevel 35, maxLevel 90, noSell, noVault).
2. `visual/telas/assets/items/vela.svg` e `caixa_sabedoria.svg` (paleta C).
3. `item-catalog.ts`: campos `minLevel`, `maxLevel`, `noSell`, `noVault` se necessário.
4. `consumables.ts`: entrada `caixa_sabedoria`.

### 2 — Vela e entrada

5. `dungeons.json`: `dungeon-2.entryItemId = "entry_vela"`.
6. `shops.json` merchant: `{ itemId: "entry_vela", qty: 10, price: 1000 }`.
7. `dungeonEnterMessage`: texto com nome do item (`ITEM_CATALOG`); call sites passam `entryItemId` quando `reason === "entry"`.
8. `visual/telas/03-wire-paineis-cidade.html`: fallback `entry_vela` no portal.

### 3 — Drops

9. `monster-definitions.ts`: `MonsterDropDef`, `drops?` em `MonsterDef`.
10. `monsters.json`: drops caixa (normal 0,2; especial 1,0).
11. `EconomyService.grantKillLoot(archetype, isBoss, monsterId?)`: rolar `drops`.
12. `CityGameSession.grantKillXp`: repassar `enemy.monsterId`.

### 4 — Respawn

13. Aplicar 60 s / 90 s em `monsters.json`.

### 5 — Sem saída

14. `CityWorld.buildDungeon2World`: remover `portal-exit`.
15. `game/scripts/check-dungeon-2.mjs`: remover asserts de portal; validar ausência.

### 6 — UI caixa

16. Wire: ocultar Guardar no baú para caixa; bloquear venda.
17. `InventoryService.sell`: recusar `noSell`.
18. `tryUseConsumable`: checar nível 35–90 para caixa.

### 7 — Fechamento

19. `npm run typecheck`; smoke; check D2.
20. Atualizar `nongame/docs/inventarios/` (itens, lojas, dungeons, inimigos) se a task pedir auditoria.

## Testar

- [ ] Comprar vela 1000; entrar D2 consome 1; reload mantém.
- [ ] Sem vela: mensagem com “Vela”.
- [ ] Drop caixa; inventário cheio → item perdido.
- [ ] Sem portal no mapa D2.
- [ ] Caixa: não vende, não vai pro baú; uso só 35–90.

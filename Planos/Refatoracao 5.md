# Refatoração 5 — itens, equipamento e ouro — implementação

Executar passos **1 → 16** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 1.md` passo **5** (`normalizeSavePayload` — uid estável na carga).
- `Planos/Refatoracao 2.md` passos **1 → 22** (transações de inventário/cofre).

## Comportamento

- `ItemInstance.uid` único e estável entre reload e cofre; colisão na normalização reatribui uid com mapa de remapeamento.
- `InventoryService.add` / transferências devolvem `{ ok, reason }`; excedente **não** retorna `true` silencioso.
- `EquipmentService.equip`: reservar slot livre **antes** de remover peça equipada (troca 1-para-1 com bolsa cheia).
- Bônus de equip e `weaponSet` derivados de **uma** função (`recalcEquipBonus` ou equivalente).
- Ouro: número finito; cap do balance; `NaN`/`Infinity` não zeram — mantêm último valor válido.
- Loja: estoque exibido só se decrementar de verdade; item com preço 0 no catálogo falha QA.

## Passos

### A — UID

1. `game/src/domain/items/ItemModel.ts` — gerador uid estável (ex.: incremento persistido em meta ou uuid); `adoptItemUidSeq` alinhado ao load.
2. `game/src/persistence/migrations.ts` — na normalização, detectar uid duplicado e remapear referências em inventário/cofre/equip.

### B — Inventário e equip

3. `game/src/domain/items/InventoryService.ts` — retorno `{ ok, reason }` em `add`, `remove`, `move`.
4. `game/src/domain/items/EquipmentService.ts` — `equip`: checar espaço para peça desequipada antes de mutar.
5. `game/src/domain/items/EquipmentService.ts` — `recalcWeaponSetFromGear` único; sessão deixa de recalcular em paralelo.
6. `game/src/domain/account/AccountVaultService.ts` — transferências com mesmo contrato `{ ok, reason }`.

### C — Ouro e loja

7. `game/src/domain/economy/InventoryGold.ts` (ou setter central) — clamp e finitude.
8. `game/src/domain/shops/ShopService.ts` (novo ou refatorar existente) — estoque por `itemId`; compra atômica.
9. `game/src/data/shops/shops.json` — nenhum item jogável com `price: 0` (provisório catálogo).

### D — SkillTree testável

10. `game/src/domain/skills/SkillTreeService.ts` — remover singleton `boundForReset`; instância owned pela sessão.

### E — QA

11. `game/src/domain/items/inventory.test.ts` (novo) — bolsa cheia + equip troca; add recusa excedente.
12. `game/scripts/check-c10-c14-c11.mjs` — ajustar se assert de inventário mudou.
13. `cd game && npm run test`.
14. `cd game && npm run typecheck && npm run smoke`.

## Testar

- [ ] Equip com bolsa 40/40 troca peça sem perder item.
- [ ] Cofre + inventário: uid preservado após reload.
- [ ] Passos 13–14 verdes.

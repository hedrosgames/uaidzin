# Refatoração 5 — itens, equipamento, ouro, loja e skills — implementação

Executar passos **1 → 25** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 1.md` passo **5** (`normalizeSavePayload`).
- `Planos/Refatoracao 2.md` passos **1 → 26** (transações de inventário/cofre e política de save).

## Comportamento

- `ItemInstance.uid` = `crypto.randomUUID()` (único na conta inteira, inclusive via cofre); normalização re-uida duplicata sem perder item.
- `InventoryService.add` / `AccountVaultService.add` / transferências devolvem `{ ok, added, rejected, reason }`; nunca `true` com excedente descartado. Limite **999** por stack.
- Compra que não cabe: recusada, sem cobrar. Drop que não cabe: parte que coube entra; resto **perdido** com aviso “Bolsa cheia: <item> perdido.”. Cofre: o que não cabe fica na origem.
- `EquipmentService.equip`: reservar espaço para a peça desequipada **antes** de mutar (troca 1-para-1 com bolsa cheia).
- Bônus de equip, refino e `weaponSet` derivados de **uma** função (`recalcEquipBonus`); refino soma **uma** vez; set de arma derivado do equipamento.
- Ouro: número finito, inteiro, `0 ≤ gold ≤` cap do balance; setter ignora `NaN`/`Infinity` (lança em DEV).
- Loja: estoque **infinito**; `qty` sai do catálogo e da UI; `sellValue ≤ price` para todo item vendido em loja; `machado_leve` preço **0**, `sellValue` **0**.
- Venda: `sellItem(uid, qty)` único no domínio, usado pelo NPC e pela bolsa; crítico.
- Skills **sem nível**: `canLearn`/`tryLearnSkill` recusam skill já aprendida; sem `skillLevelCap`/`skillLevelDamageBonus`; `levels[id]` vira conjunto de aprendidas.
- `SkillLoadout`: `clearSlot` persiste (sem autopreencher no `refresh`); cooldown por slot recalculado quando especialização muda.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #32 | total no domínio (tela de refino em `Refatoracao 7.md`) | passo 6 |
| #33 | total | passos 6–7 |
| #36 | total | passo 5 |
| #37 | total no domínio (Mestre em `Refatoracao 7.md`) | passos 14–16; critérios do Complemento de #37 |
| #38 | total | passos 1–2 |
| #40 | total no domínio (confirmação na UI em `Refatoracao 7.md`) | passos 10–13 |
| #41 | total | passos 3–4, 8 |
| #42 | total | passo 17 |
| #50 | parcial (setters); entrada do cofre em `Refatoracao 6.md` | passos 9, 4 |

## Passos

### A — UID

1. `game/src/domain/items/ItemModel.ts` — `createUid()` com `crypto.randomUUID()`; remover `uidSeq`/`adoptItemUidSeq`.
2. `game/src/persistence/migrations.ts` — `normalizeSavePayload` detecta uid duplicado em bolsa/equipados/cofre e re-uida.

### B — Inventário e equip

3. `game/src/domain/inventory/InventoryService.ts` — `add`, `remove`, `move` devolvem `{ ok, added, rejected, reason }`; setter `gold` finito.
4. `game/src/domain/account/AccountVaultService.ts` — mesmo contrato em `add`/transferências; `gold` finito.
5. `game/src/domain/items/EquipmentService.ts` — `equip`: checar espaço para peça desequipada antes de mutar.
6. `game/src/domain/items/EquipmentService.ts` — `recalcEquipBonus` único (refino uma vez, `weaponSet` e passivas `weaponAny` derivados); `RefinementService` só altera `item.refine`.
7. `game/src/app/CityGameSession.ts` — remover recálculo paralelo de set/bônus; chamar `recalcEquipBonus` após equip/desequip/refino/load.
8. `game/src/app/CityGameSession.ts` — tratar `rejected`: aviso no drop log e toast; compra recusada não cobra.

### C — Ouro, loja e venda

9. `game/src/data/balance/economy.ts` — `GOLD_CAP` (provisório, fonte `economy.ts`).
10. `game/src/data/balance/shops.json` — remover `qty`; `machado_leve` `price: 0`.
11. `game/src/data/items/items.json` — `machado_leve` `sellValue: 0`; conferir `sellValue ≤ price` nos itens de loja.
12. `game/src/domain/economy/ShopService.ts` — `buyFromShop` sem estoque; compra atômica (item entra → ouro sai); `sellItem(uid, qty)`.
13. `game/scripts/check-shop-catalog.mjs` (novo) — falha se `sellValue > price` em item de loja ou se `qty` voltar ao catálogo.

### D — Skills sem nível

14. `game/src/data/balance/skills.ts` — remover `skillLevelCap` e `skillLevelDamageBonus`.
15. `game/src/domain/skills/SkillTreeService.ts` — aprender uma vez; remover singleton `boundForReset` (instância da sessão).
16. `game/src/domain/combat/SkillController.ts` — dano/cura sem `levelScale`.
17. `game/src/domain/combat/SkillLoadout.ts` — `refresh()` não autopreenche slot limpo; cooldown recalculado em `spendSpec`; tolerar especialização não finita.

### E — QA

18. `game/src/domain/inventory/inventory.test.ts` (novo) — bolsa cheia + equip troca; add recusa excedente com `rejected`; stack 999.
19. `game/src/domain/economy/shop.test.ts` (novo) — compra sem estoque, compra que não cabe não cobra, venda nunca dá lucro.
20. `game/src/domain/items/equipment.test.ts` (novo) — refino +1 soma uma vez; set de arma segue a peça equipada.
21. `game/src/domain/skills/skill-tree.test.ts` (novo) — recompra recusada; loadout mantém slot limpo.
22. `game/scripts/check-c10-c14-c11.mjs` — ajustar asserts ao contrato `{ ok, ... }`.
23. `cd game && node scripts/check-shop-catalog.mjs`.
24. `cd game && npm run test && npm run test:save`.
25. `cd game && npm run typecheck && npm run smoke`.

## Testar

- [ ] Equip com bolsa 40/40 troca peça sem perder item.
- [ ] Cofre + inventário: uid preservado e único após reload com dois personagens.
- [ ] Loja não mostra estoque; `machado_leve` 0/0.
- [ ] Skill aprendida não pode ser comprada de novo.
- [ ] Passos 23–25 verdes.

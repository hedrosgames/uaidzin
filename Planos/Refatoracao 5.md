# Refatoração 5 — itens, equipamento, ouro, loja e skills — implementação

Executar passos **1 → 36** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Pré-requisitos

- `Planos/Refatoracao 1.md` passos **1–2** (Vitest) e **5** (`normalizeSavePayload`).
- `Planos/Refatoracao 2.md` passos **1 → 34** (política de save e fila única).

## Comportamento

- `ItemInstance.uid` = `crypto.randomUUID()` gerado por `nextItemUid()` (único na conta inteira, inclusive via cofre); normalização re-uida duplicata sem perder item; `add` em bolsa/cofre com uid já presente gera uid novo.
- Empilhável = flag `stackable` em `items.json`, lida por um helper único usado por bolsa e cofre. Limite **999** por stack.
- `InventoryService.add` / `AccountVaultService.add` devolvem `{ ok, added, rejected, reason }`; nunca `true` com excedente descartado. `remove` continua devolvendo o item.
- Compra que não cabe: recusada, sem cobrar. Drop que não cabe: parte que coube entra; resto **perdido** com aviso “Bolsa cheia: <item> perdido.”. Cofre ↔ bolsa: o que não cabe fica na origem.
- `EquipmentService.equip`: reservar espaço para a peça desequipada **antes** de mutar (troca 1-para-1 com bolsa cheia). `unequip` com bolsa cheia devolve `reason: "inventory_full"`.
- Bônus de equip, refino e `weaponSet` derivados de **uma** função (`EquipmentService.recalcEquipBonus`); refino soma **uma** vez, pela regra por slot de `ECONOMY_BALANCE.refine.bonusBySlot` (arma → ataque; defensivas → defesa); Compositor usa a mesma regra. Set de arma e passivas `weaponAny` vêm da arma equipada (campo `weaponSet` do item); bolsa não conta.
- Mapa arma → set (provisório, fonte `weapon-set-catalog.json`): `espada_curta` → `sword-shield`, `machado_leve` → `axe-shield`; sem arma equipada → `classDefault` da classe (TK `axe-shield`, FM `greatstaff`, BM `dual-gloves`, HT `dual-sword`). Sets “duas armas” sem item próprio por enquanto.
- Refino (provisório, fonte `economy.ts`): arma **+2 ataque** por nível (`weaponAttackMultiplier` 2); `head`, `armor`, `ring1`, `ring2`, `neck`, `ear` **+1 defesa** por nível.
- Strip de conjuntos do HUD só existe em `import.meta.env.DEV` (troca de set para teste de animação, sem efeito em dano).
- Ouro: número finito, inteiro, `0 ≤ gold ≤ ECONOMY_BALANCE.goldCap`; setter ignora `NaN`/`Infinity` e mantém o valor anterior (lança em DEV). Custos (refino, compositor, treino) e `goldPerKill` validados com `Number.isFinite`.
- Loja: estoque **infinito**; `qty` sai do catálogo, dos tipos e da UI; `sellValue ≤ price` para todo item vendido em loja; `machado_leve` preço **0**, `sellValue` **0**.
- Venda: `sellItem(uid, qty)` único no domínio (divide stack), usado pelo NPC e pela bolsa; crítico.
- Skills **sem nível**: `canLearn`/`tryLearnSkill` recusam skill já aprendida; sem `skillLevelCap`/`skillLevelDamageBonus`/`upCost`; save guarda conjunto de aprendidas.
- `SkillLoadout`: `clearSlot` persiste (sem autopreencher no `refresh`); skill ativa recém-aprendida entra na 1ª vaga livre; cooldown de slot lido sob demanda da especialização atual (sem cache que `spendSpec` precise invalidar).

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #32 | total no domínio (tooltip em `Refatoracao 7.md`) | passos 9–10, 31 |
| #33 | total | passos 11–14, 31, 35 |
| #36 | total | passo 8, 29 |
| #37 | total no domínio (Mestre em `Refatoracao 7.md`) | passos 21–27; critérios do Complemento de #37 |
| #38 | total | passos 1–3 |
| #40 | total no domínio (confirmação na UI em `Refatoracao 7.md`) | passos 16–20 |
| #41 | total | passos 4–7, 15, 29 |
| #42 | total | passo 28 |
| #50 | parcial (setters e custos); entrada do cofre em `Refatoracao 6.md` | passos 5–6, 16, 20 |

## Passos

### A — UID

1. `game/src/domain/items/ItemModel.ts` — `nextItemUid()` com `crypto.randomUUID()`; remover `uidSeq`/`adoptItemUidSeq`.
2. `game/src/app/CityGameSession.ts` — remover `adoptItemUidsFromState`.
3. `game/src/persistence/migrations.ts` — `normalizeSavePayload` detecta uid duplicado em bolsa/equipados/cofre e re-uida.

### B — Inventário, cofre e equip

4. `game/src/data/items/items.json` — flag `stackable` (hoje: `material` e `pocao_menor`); `game/src/data/items/item-catalog.ts` — helper `isStackable`.
5. `game/src/domain/inventory/InventoryService.ts` — `add` devolve `{ ok, added, rejected, reason }`; uid repetido → uid novo; setter `gold` finito que mantém o anterior.
6. `game/src/domain/account/AccountVaultService.ts` — mesmo contrato em `add`; `gold` finito.
7. `game/src/app/CityGameSession.ts` — `moveItemToVault`/`moveItemFromVault`: o que não coube fica na origem.
8. `game/src/domain/items/EquipmentService.ts` — `equip` checa espaço para peça desequipada antes de mutar; `unequip` com `reason`; consumidores de `add` em `EquipmentService` usam o contrato novo.
9. `game/src/data/balance/economy.ts` — `ECONOMY_BALANCE.refine.bonusBySlot` com os valores provisórios do Comportamento; `weaponSetByItem` e fallback `classDefault`.
10. `game/src/domain/items/EquipmentService.ts` — `recalcEquipBonus` público e único (refino uma vez por `bonusBySlot`, `weaponSet`, passivas `weaponAny`); `game/src/domain/items/RefinementService.ts` e `CompositionService.ts` só alteram `item.refine`.

### C — Set de arma pelo equipamento

11. `game/src/data/items/items.json` — campo `weaponSet` em cada arma (mapa no Comportamento); `game/src/domain/items/ItemModel.ts` — campo opcional em `ItemInstance`.
12. `game/src/domain/items/ItemFactory.ts` — `createEquipDrop` copia `weaponSet` do catálogo.
13. `game/src/app/CityGameSession.ts` — `refreshWeaponSetFromGear` lê só a arma equipada; `buildCombatMods` recebe o set do equipamento (não `playerView.getWeaponSet()`); remover recálculo paralelo de bônus.
14. `game/src/app/GameApp.ts` — strip de conjuntos só em `import.meta.env.DEV`.

### D — Drop

15. `game/src/domain/economy/EconomyService.ts` — `grantKillLoot` com recebimento parcial e item perdido nomeado; `game/src/app/CityGameSession.ts` — aviso “Bolsa cheia: <item> perdido.” no drop log.

### E — Ouro, loja e venda

16. `game/src/data/balance/economy.ts` — remover `ShopSlotDef.qty`; usar `ECONOMY_BALANCE.goldCap` como teto em setters e transferências.
17. `game/src/data/balance/shops.json` — remover `qty` (`machado_leve` já tem `price: 0`).
18. `game/src/data/items/items.json` — `machado_leve` `sellValue: 0`.
19. `game/src/domain/economy/ShopService.ts` — `buyFromShop` sem estoque e sem `no_stock`; compra atômica (item entra → ouro sai); `sellItem(uid, qty)` divide stack; substituir `InventoryService.sell` em `game/src/ui/GamePanels.ts` e `game/scripts/cycle-balance.mjs`.
20. `game/src/domain/items/CompositionService.ts`, `RefinementService.ts`, `game/src/domain/economy/EconomyService.ts`, `game/src/domain/skills/SkillTreeService.ts` — custo e ouro por abate com `Number.isFinite`.
21. `visual/telas/03-wire-paineis-cidade.html` — loja sem leitura de `slot.qty` e sem estoque exibido (fonte de produção até o plano 8).

### F — Skills sem nível

22. `game/src/data/balance/skills.ts` — remover `skillLevelCap` e `skillLevelDamageBonus`; `game/src/data/balance/economy.ts` — remover `SKILL_TRAINING.upCost`.
23. `game/src/domain/skills/SkillTreeService.ts` — aprender uma vez; remover singleton `boundForReset`/`resetBoundSkillCycle`; `game/src/domain/progression/ProgressionService.ts` recebe a instância da sessão.
24. `game/src/domain/combat/SkillCasting.ts` — dano/cura sem `levelScale`; `game/src/domain/combat/SkillController.ts` — sem `slot.level`; `autoScore` sem nível.
25. `game/src/persistence/SaveTypes.ts` e `game/src/persistence/migrations.ts` — `skills` guarda aprendidas (sem `level`); `summaryFromPayload` conta aprendidas; `remapLearnedSkills` sem comparação de nível.
26. `game/src/app/CityGameSession.ts` — remover passagem de `level` para `SkillCasting` e leituras de nível.
27. `game/src/ui/WireGameBridge.ts`, `game/src/ui/WireUi.ts`, `game/src/debug/DebugApi.ts`, `game/src/ui/GamePanels.ts` — sem `level`, `upCost`, `skillUpCost` e `Lv`.
28. `game/src/domain/combat/SkillLoadout.ts` — `refresh()` não autopreenche slot limpo; `assign` na 1ª vaga ao aprender skill ativa; cooldown lido sob demanda; tolerar especialização não finita.

### G — QA

29. `game/src/domain/inventory/inventory.test.ts` (novo) — bolsa cheia + equip troca; unequip com bolsa cheia; uid inexistente; slot vazio; add recusa excedente com `rejected`; stack 999; cofre cheio; 998+2 no cofre.
30. `game/src/domain/economy/shop.test.ts` (novo) — compra sem estoque, compra que não cabe não cobra, venda parcial de stack, venda nunca dá lucro, ouro `NaN` ignorado.
31. `game/src/domain/items/equipment.test.ts` (novo) — refino +1 soma uma vez pela regra do slot; compositor +7/+8/+9; set de arma segue a peça equipada; machado na bolsa não conta.
32. `game/src/domain/skills/skill-tree.test.ts` (novo) — recompra recusada; loadout mantém slot limpo; skill aprendida entra na 1ª vaga; cooldown muda após `spendSpec`.
33. `game/scripts/check-shop-catalog.mjs` (novo) — falha se `sellValue > price` em item de loja, se `qty` voltar, se `price` ou `goldCost` de `game/src/data/composer/compose-recipes.json` não for finito ≥ 0.
34. `game/scripts/smoke.mjs`, `check-c10-c14-c11.mjs` (loja lida de `shops.json`), `check-c7i-c1i.mjs`, `check-d4-d8-d12-c17b.mjs`, `check-s8-c9-c2-c5.mjs`, `cycle-balance.mjs`, `save-harness.mjs` — contrato `{ ok, ... }` de `add` e skills sem nível.
35. `cd game && node scripts/check-shop-catalog.mjs && npm run check:model-lab`.
36. `cd game && npm run test && npm run test:save && npm run typecheck && npm run smoke`.

## Testar

- [ ] Equip com bolsa 40/40 troca peça sem perder item.
- [ ] Cofre + inventário: uid preservado e único após reload com dois personagens.
- [ ] Loja não mostra estoque; `machado_leve` 0/0.
- [ ] Skill aprendida não pode ser comprada de novo; limpar slot da barra persiste após reload.
- [ ] Trocar a arma equipada troca o set; desequipar volta ao set sem arma.
- [ ] Passos 35–36 verdes.

## Pendências

- Conjuntos de animação definitivos (armas novas, “duas armas”) ficam para depois; o mapa provisório do Comportamento vale até lá.

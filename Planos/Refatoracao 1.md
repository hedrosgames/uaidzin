# Refatoração 1 — save normalizar e carregar — implementação

Executar passos **1 → 16** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Comportamento

- `SAVE_VERSION` permanece **3** neste plano (migração 3→4 fica no plano 2).
- Atributos base normalizados para **5/5/5/5** em todo caminho que grava personagem novo ou boot.
- `normalizeSavePayload(raw): SavePayload` é a **única** normalização (árvores, ouro finito, `classId ∈ CLASSES`, `normalizeTreeMap`, loadout, bags).
- `applySavePayload` e `applyBootCharacter` **só** aplicam payload já normalizado.

## Passos

### A — Vitest

1. `game/package.json` — `devDependencies` vitest; script `"test": "vitest run"`.
2. `game/vitest.config.ts` (novo) — ambiente node, alias `@/` se o projeto já usar.
3. `game/src/persistence/migrations.test.ts` (novo) — casos: migrate v1→v3, árvore parcial, ouro não finito rejeitado/capado, `classId` inválido.

### B — Normalização única

4. `game/src/persistence/SaveTypes.ts` — exportar tipo de resultado de carga (`LoadSaveResult`: `found` | `absent` | `error`).
5. `game/src/persistence/migrations.ts` — implementar `normalizeSavePayload`; `migrateSave` termina chamando normalização.
6. `game/src/persistence/migrations.ts` — usar `normalizeTreeMap` de `SaveTypes.ts` no resumo e no payload.
7. `game/src/data/balance/progression.ts` — `baseAttributes` **5** em cada stat (fonte de verdade com `AGENTS.md`).
8. `game/src/app/CityGameSession.ts` — `resetToNewGame` / boot interno: atributos **5/5/5/5** (alinhar trecho que ainda grava 10).
9. `game/src/app/CityGameSession.ts` — `applySavePayload`: remover normalização duplicada; receber payload normalizado.
10. `game/src/app/CityGameSession.ts` — `applyBootCharacter`: idem.

### C — Três estados de carga

11. `game/src/app/CityGameSession.ts` — `loadSave()` retorna `LoadSaveResult`; distinguir IO/decrypt falho de slot vazio.
12. `game/src/app/GameApp.ts` — startup: `absent` → fluxo novo; `error` → mensagem, **sem** `persistSave` automático; remover `.catch(() => false)` que mascara erro.

### D — QA

13. `cd game && npm run test` — verde.
14. `cd game && npm run test:save` — verde no formato **v3** atual.
15. `cd game && npm run typecheck`.
16. Teste manual lab **admin/admin**: apagar slot, criar TK, reload — attrs 5/5/5/5.

## Testar

- [ ] Passos 13–15 verdes.
- [ ] Personagem novo sempre 5/5/5/5.
- [ ] Save corrompido não sobrescreve slot com personagem vazio.

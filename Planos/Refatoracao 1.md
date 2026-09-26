# Refatoração 1 — save normalizar e carregar — implementação

Executar passos **1 → 17** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Comportamento

- `SAVE_VERSION` permanece **3** neste plano (formato v4 fica no plano 2).
- Atributos base **5/5/5/5** em uma constante única (`PROGRESSION_BALANCE.baseAttributes`), usada por criação, `applyBootCharacter`, defaults do save, `resetToNewGame` e `refundAllAttributes`.
- `normalizeSavePayload(raw): SavePayload` é a **única** normalização: árvores via `normalizeTreeMap` (chaves `controle`/`magia`/`fisica` sempre numéricas finitas), números finitos (`gold`, `xp`, `hp`, `mp`, pontos), `classId ∈ CLASSES`, loadout, bags.
- `normalizeBootCharacter(raw): BootCharacter | null` aplica as mesmas regras ao personagem vindo do boot.
- `applySavePayload` e `applyBootCharacter` **só** aplicam payload já normalizado.
- Carga: `found` | `absent` | `error`. Leitura/decrypt que falha é `error` (sem gravar); slot vazio é `absent`.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #30 | total | passos 11–13; critérios do Complemento de #30 |
| #39 | parcial (base 5); Reset/Evolução na Wire em `Refatoracao 7.md` | passos 7–8 |
| #48 | total | passos 5–6 e teste do passo 3; critérios do Complemento de #48 |
| #49 | parcial (validação do payload); origem em `Refatoracao 3.md` | passo 10 |

## Passos

### A — Vitest

1. `game/package.json` — `devDependencies` vitest; script `"test": "vitest run"`.
2. `game/vitest.config.ts` (novo) — ambiente node; `include: ["src/**/*.test.ts"]`.
3. `game/src/persistence/migrations.test.ts` (novo) — casos: árvore de especialização parcial (`{ fisica: 2 }`), ouro `NaN`/`Infinity`/negativo, `classId` inválido, `attrs` ausentes → 5/5/5/5, boot character com `gold`/`level` absurdos.

### B — Normalização única

4. `game/src/persistence/SaveTypes.ts` — exportar `LoadSaveResult` (`found` | `absent` | `error`).
5. `game/src/persistence/migrations.ts` — implementar `normalizeSavePayload` e `normalizeBootCharacter`; `migrateSave` termina chamando normalização.
6. `game/src/persistence/migrations.ts` — usar `normalizeTreeMap` de `SaveTypes.ts` no resumo e no payload.
7. `game/src/data/balance/progression.ts` — `baseAttributes` **5** em cada stat.
8. `game/src/app/CityGameSession.ts` — `resetToNewGame` e `applyBootCharacter` leem `PROGRESSION_BALANCE.baseAttributes` (remover literal `10`).
9. `game/src/app/CityGameSession.ts` — `applySavePayload`: remover normalização duplicada; receber payload normalizado.
10. `game/src/app/BootFlow.ts` — passar o personagem recebido por `normalizeBootCharacter` antes de `applyBootCharacter`; `null` → volta para a seleção.

### C — Três estados de carga

11. `game/src/app/CityGameSession.ts` — `loadSave()` retorna `LoadSaveResult`; IO/decrypt falho = `error`, slot vazio = `absent`.
12. `game/src/app/GameApp.ts` — startup: `absent` → fluxo novo; `error` → mensagem pt-BR e volta ao boot, **sem** `persistSave`; remover `.catch(() => false)` de `loadSave()`.
13. `game/scripts/save-harness.mjs` — cenário: leitura IDB falha 1× → nenhum perfil novo gravado.

### D — QA

14. `cd game && npm run test` — verde.
15. `cd game && npm run test:save` — verde no formato **v3** atual.
16. `cd game && npm run typecheck && npm run smoke`.
17. Teste manual lab **admin/admin**: apagar slot, criar TK, reload — attrs 5/5/5/5, 0 ouro.

## Testar

- [ ] Passos 14–16 verdes.
- [ ] Personagem novo sempre 5/5/5/5.
- [ ] Save corrompido ou leitura falha não sobrescreve slot com personagem vazio.
- [ ] Especialização parcial carrega sem cooldown `NaN` nem `specPoints` `NaN`.

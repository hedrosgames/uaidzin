# Refatoração 1 — save normalizar e carregar — implementação

Executar passos **1 → 22** na ordem. Cada linha = arquivo + entrega. Código em `game/` sem comentários.

## Comportamento

- `SAVE_VERSION` permanece **3** neste plano (formato v4 fica no plano 2).
- Atributos base **5/5/5/5** em uma constante única (`PROGRESSION_BALANCE.baseAttributes`), usada por criação, `applyBootCharacter`, defaults do save (`emptyAttrs`), `resetToNewGame` e `refundAllAttributes`. Atributo `0` no save continua `0` (sem `|| 5`).
- `normalizeSavePayload(raw): SavePayload` é a **única** função de normalização e é idempotente: árvores via `normalizeTreeMap` (chaves `controle`/`magia`/`fisica` sempre numéricas finitas), números finitos (`gold`, `xp`, `hp`, `mp`, pontos), `classId ∈ CLASSES`, loadout, bags. `migrateSave` e `applySavePayload` chamam a mesma função (defesa pedida em #48).
- `normalizeBootCharacter(raw): BootCharacter | null` valida `id`, `name` e `classId` do personagem vindo do boot; `attrs`, `gold` e `level` da mensagem são **ignorados** (personagem novo nasce do balance).
- Carga: `found` | `absent` | `error`. `absent` só quando IDB **e** `localStorage` responderam vazio; leitura, decrypt ou `onblocked` que falha é `error` (sem gravar).
- Tela de `error`: mensagem pt-BR com **Tentar de novo** (relê o save) e **Voltar** (boot); causa no `console.error`.
- Guardas de uso: cooldown de slot e `spendSpec` recusam valor não finito mesmo com payload já normalizado.

## Issues

| Issue | Cobertura | Fecha com |
|---|---|---|
| #30 | total | passos 11–17; critérios do Complemento de #30 |
| #39 | parcial (base 5 e refund); Reset/Evolução na Wire em `Refatoracao 7.md` | passos 7–9, 3 |
| #48 | total | passos 5–6, 18–19 e testes do passo 3 |
| #49 | parcial (validação do payload); origem e caminhos de skip em `Refatoracao 3.md` | passo 10 |

## Passos

### A — Vitest

1. `game/package.json` — `devDependencies` vitest; script `"test": "vitest run"`.
2. `game/vitest.config.ts` (novo) — ambiente node; `include: ["src/**/*.test.ts"]`.
3. `game/src/persistence/migrations.test.ts` (novo) — casos: árvore de especialização parcial (`{ fisica: 2 }`), ouro `NaN`/`Infinity`/negativo, `classId` inválido, `attrs` ausentes → 5/5/5/5, atributo `0` preservado, boot character com `gold`/`level`/`attrs` absurdos ignorados, `normalizeSavePayload(normalizeSavePayload(x))` igual a `normalizeSavePayload(x)`.

### B — Normalização única

4. `game/src/persistence/SaveTypes.ts` — exportar `LoadSaveResult` (`found` | `absent` | `error`); `emptyAttrs` lê `PROGRESSION_BALANCE.baseAttributes`.
5. `game/src/persistence/migrations.ts` — implementar `normalizeSavePayload` e `normalizeBootCharacter`; `migrateSave` termina chamando a normalização; remover `|| 5` dos atributos.
6. `game/src/persistence/migrations.ts` — usar `normalizeTreeMap` de `SaveTypes.ts` no resumo e no payload.
7. `game/src/data/balance/progression.ts` — `baseAttributes` **5** em cada stat.
8. `game/src/app/CityGameSession.ts` — `resetToNewGame` (literal `10`) e `applyBootCharacter` (literal `5`) leem `PROGRESSION_BALANCE.baseAttributes`; `applyBootCharacter` ignora `attrs`/`gold`/`level` da mensagem.
9. `game/src/app/CityGameSession.ts` — `applySavePayload` chama `normalizeSavePayload` e remove a normalização inline duplicada.
10. `game/src/app/BootFlow.ts` — `onMessage` passa o personagem por `normalizeBootCharacter` **antes** de `frame.remove()` e de devolver para `GameApp.start`; `null` → volta para a seleção.

### C — Três estados de carga

11. `game/src/persistence/SaveStore.ts` — `openDb`/`idbGet` rejeitam em erro (sem resolver `null`); `onblocked` com timeout (provisório 5 s) rejeita.
12. `game/src/persistence/SaveVault.ts` — `loadCharacter` devolve `found`/`absent`/`error`; `absent` só com IDB e `localStorage` vazios.
13. `game/src/app/CityGameSession.ts` — `loadSave()` retorna `LoadSaveResult` a partir do `SaveVault`.
14. `game/src/app/GameApp.ts` — startup: `absent` → fluxo novo; `error` → tela pt-BR com Tentar de novo / Voltar, **sem** `persistSave`; remover `.catch(() => false)` de `loadSave()`.
15. `game/scripts/save-harness.mjs` — cenário: leitura IDB falha 1× → nenhum perfil novo gravado; segunda leitura carrega o perfil.
16. `game/src/persistence/load-save.test.ts` (novo) — store falso que lança → `error`; IDB vazio e `localStorage` com perfil → `found`; ambos vazios → `absent`.
17. `game/src/domain/progression/progression.test.ts` (novo) — `refundAllAttributes` com 0, poucos e muitos pontos devolve para 5/5/5/5.

### D — Guardas de uso

18. `game/src/domain/combat/SkillController.ts` — gate de cooldown trata `!Number.isFinite(slot.cd)` como pronto (`cd = 0`).
19. `game/src/domain/skills/SkillTreeService.ts` — `spendSpec` recusa quando `specPoints` ou nível da árvore não é finito.

### E — QA

20. `cd game && npm run test && npm run test:save` — verde no formato **v3** atual.
21. `cd game && npm run typecheck && npm run smoke`.
22. Teste manual lab **admin/admin**: apagar slot, criar TK, reload — attrs 5/5/5/5, 0 ouro.

## Testar

- [ ] Passos 20–21 verdes.
- [ ] Personagem novo sempre 5/5/5/5, mesmo com `attrs` forjados no `postMessage`.
- [ ] Save corrompido ou leitura falha não sobrescreve slot com personagem vazio; Tentar de novo recarrega.
- [ ] Especialização parcial carrega sem cooldown `NaN` nem `specPoints` `NaN`.

## Pendências

- Nenhuma.
